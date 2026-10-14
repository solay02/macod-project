/**
 * Drivers Queries
 *
 * Drivers are not linked to shipping profiles (those define customer pricing).
 * Driver pay is stored in `driver_compensations` — sparse: a missing row means
 * the store has not configured pay for this driver (assignment still works at
 * driverFee = 0).
 *
 * deleteDriver stays in macod-server because it raises ConflictError.
 */

import { eq, and, like, or, count, sql, desc, exists, inArray } from "drizzle-orm";
import { drivers, driverCompensations, orders } from "../db/schema";
import type { AppDb } from "../db/client";
import { safeLikeTerm } from "./search";

export interface DriverFilters {
  status?: "available" | "busy" | "inactive";
  vehicleType?: "motorcycle" | "car" | "van";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDriverData {
  firstName: string;
  lastName: string;
  phone: string;
  phone2?: string | null;
  vehicleType?: "motorcycle" | "car" | "van" | null;
  status: "available" | "busy" | "inactive";
  notes?: string | null;
}

export interface UpdateDriverData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phone2?: string | null;
  vehicleType?: "motorcycle" | "car" | "van" | null;
  notes?: string | null;
}

export async function getAllDrivers(db: AppDb, filters?: DriverFilters) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(drivers.status, filters.status));
  }

  if (filters?.vehicleType) {
    conditions.push(eq(drivers.vehicleType, filters.vehicleType));
  }

  if (filters?.search) {
    const term = `%${safeLikeTerm(filters.search)}%`;
    conditions.push(
      or(
        like(drivers.firstName, term),
        like(drivers.lastName, term),
        like(drivers.phone, term),
      ),
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const driverRows = await (conditions.length > 0
    ? db.select().from(drivers).where(and(...conditions)).limit(limit).offset(offset).all()
    : db.select().from(drivers).limit(limit).offset(offset).all());

  if (driverRows.length === 0) return [];

  const compRows = await db
    .select({ driverId: driverCompensations.driverId, c: count() })
    .from(driverCompensations)
    .where(inArray(driverCompensations.driverId, driverRows.map((d) => d.id)))
    .groupBy(driverCompensations.driverId)
    .all();

  const compCountMap = new Map(compRows.map((r) => [r.driverId, r.c]));

  return driverRows.map((d) => ({
    ...d,
    compensationWilayaCount: compCountMap.get(d.id) ?? 0,
  }));
}

/**
 * Driver cash reconciliation: compares the driver's denormalized pendingCash
 * counter against the authoritative sum of delivered-but-unsettled orders.
 * drift ≠ 0 means the ledger and reality disagree — damage from an old bug,
 * a manual D1 edit, or a mid-settlement failure. Surfaced so ops can see it.
 */
export async function getDriverCashReconciliation(db: AppDb, driverId: string) {
  const [driverRow, pendingRow] = await Promise.all([
    db
      .select({ pendingCash: drivers.pendingCash })
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .get(),
    db
      .select({
        total: sql<number>`coalesce(sum(${orders.codAmount}), 0)`,
        c: count(),
      })
      .from(orders)
      .where(
        and(
          eq(orders.driverId, driverId),
          eq(orders.status, "delivered"),
          sql`${orders.codPaymentId} IS NULL`,
        ),
      )
      .get(),
  ]);

  const pendingCash = Number(driverRow?.pendingCash ?? 0);
  const pendingOrdersTotal = Number(pendingRow?.total ?? 0);
  const pendingOrdersCount = Number(pendingRow?.c ?? 0);

  return {
    pendingCash,
    pendingOrdersTotal,
    pendingOrdersCount,
    drift: pendingCash - pendingOrdersTotal,
  };
}

export async function getDriverById(db: AppDb, driverId: string) {
  const driver = await db
    .select()
    .from(drivers)
    .where(eq(drivers.id, driverId))
    .get();

  if (!driver) return null;

  const compStats = await db
    .select({
      c: count(),
      totalFee: sql<number>`coalesce(sum(${driverCompensations.feePerDelivery}), 0)`,
    })
    .from(driverCompensations)
    .where(eq(driverCompensations.driverId, driverId))
    .get();

  const [recentOrders, cashReconciliation] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(eq(orders.driverId, driverId))
      .orderBy(desc(orders.updatedAt))
      .limit(10)
      .all(),
    getDriverCashReconciliation(db, driverId),
  ]);

  return {
    ...driver,
    compensationWilayaCount: compStats?.c ?? 0,
    recentOrders,
    cashReconciliation,
  };
}

export async function createDriver(db: AppDb, data: CreateDriverData) {
  // Check for duplicate phone number
  const existingDriver = await db
    .select({ id: drivers.id, phone: drivers.phone })
    .from(drivers)
    .where(eq(drivers.phone, data.phone))
    .get();

  if (existingDriver) {
    throw new Error(`Driver with phone "${data.phone}" already exists`);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(drivers).values({
    id,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    phone2: data.phone2 ?? null,
    vehicleType: data.vehicleType ?? null,
    status: data.status,
    totalDelivered: 0,
    totalEarnings: 0,
    pendingCash: 0,
    totalPaid: 0,
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return getDriverById(db, id);
}

export async function updateDriver(db: AppDb, driverId: string, data: UpdateDriverData) {
  const existing = await getDriverById(db, driverId);
  if (!existing) return null;

  // Check for duplicate phone if phone is being updated
  if (data.phone && data.phone !== existing.phone) {
    const duplicateDriver = await db
      .select({ id: drivers.id, phone: drivers.phone })
      .from(drivers)
      .where(eq(drivers.phone, data.phone))
      .get();

    if (duplicateDriver) {
      throw new Error(`Driver with phone "${data.phone}" already exists`);
    }
  }

  const now = new Date().toISOString();

  await db
    .update(drivers)
    .set({ ...data, updatedAt: now })
    .where(eq(drivers.id, driverId));

  return getDriverById(db, driverId);
}

export async function updateDriverStatus(
  db: AppDb,
  driverId: string,
  status: "available" | "busy" | "inactive",
) {
  const existing = await getDriverById(db, driverId);
  if (!existing) return null;

  await db
    .update(drivers)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(drivers.id, driverId));

  return getDriverById(db, driverId);
}

// ─── Compensations ────────────────────────────────────────────────────────────

export interface DriverCompensationRow {
  /** Null when the driver has no compensation row. */
  feePerDelivery: number | null;
}

/**
 * Return the driver's configured fee (null when no row exists).
 */
export async function getCompensationsForDriver(
  db: AppDb,
  driverId: string,
): Promise<DriverCompensationRow[]> {
  const row = await db
    .select({ feePerDelivery: driverCompensations.feePerDelivery })
    .from(driverCompensations)
    .where(eq(driverCompensations.driverId, driverId))
    .get();

  return row ? [row] : [];
}

export async function setCompensation(
  db: AppDb,
  driverId: string,
  feePerDelivery: number,
) {
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(driverCompensations)
    .where(eq(driverCompensations.driverId, driverId))
    .get();

  if (existing) {
    await db
      .update(driverCompensations)
      .set({ feePerDelivery, updatedAt: now })
      .where(eq(driverCompensations.id, existing.id));
  } else {
    await db.insert(driverCompensations).values({
      id: crypto.randomUUID(),
      driverId,
      feePerDelivery,
      createdAt: now,
      updatedAt: now,
    });
  }

  return db
    .select()
    .from(driverCompensations)
    .where(eq(driverCompensations.driverId, driverId))
    .get();
}

export async function deleteCompensation(
  db: AppDb,
  driverId: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: driverCompensations.id })
    .from(driverCompensations)
    .where(eq(driverCompensations.driverId, driverId))
    .get();

  if (!existing) return false;

  await db.delete(driverCompensations).where(eq(driverCompensations.id, existing.id));
  return true;
}
