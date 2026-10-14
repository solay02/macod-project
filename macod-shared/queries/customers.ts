/**
 * Customers Queries
 *
 * deleteCustomer stays in macod-server because it raises BusinessLogicError.
 */

import { eq, and, like, or, desc, exists, sql } from "drizzle-orm";
import {
  customers,
  orders,
  orderStatusHistory,
  customerGroups,
  customerGroupMembers,
  customerTags,
  customerTagAssignments,
} from "../db/schema";
import type { AppDb } from "../db/client";
import { safeLikeTerm } from "./search";

export interface CustomerFilters {
  groupId?: string;
  tagId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  phone2?: string;
  address?: string;
}

export interface UpdateCustomerData {
  name?: string;
  phone?: string;
  phone2?: string | null;
  address?: string | null;
}

export async function getAllCustomers(db: AppDb, filters?: CustomerFilters) {
  const conditions = [];

  if (filters?.search) {
    const term = `%${safeLikeTerm(filters.search)}%`;
    conditions.push(
      or(
        like(customers.name, term),
        like(customers.phone, term),
      ),
    );
  }

  if (filters?.groupId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(customerGroupMembers)
          .where(
            and(
              eq(customerGroupMembers.customerId, customers.id),
              eq(customerGroupMembers.groupId, filters.groupId),
            ),
          ),
      ),
    );
  }

  if (filters?.tagId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(customerTagAssignments)
          .where(
            and(
              eq(customerTagAssignments.customerId, customers.id),
              eq(customerTagAssignments.tagId, filters.tagId),
            ),
          ),
      ),
    );
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  if (conditions.length > 0) {
    return await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .all();
  }
  return await db.select().from(customers).limit(limit).offset(offset).all();
}

export async function getCustomerById(db: AppDb, customerId: string) {
  const customer = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .get();

  if (!customer) {
    return null;
  }

  const recentOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(10)
    .all();

  return {
    ...customer,
    recentOrders,
  };
}

export async function getCustomerByPhone(db: AppDb, phone: string) {
  return await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .get();
}

export async function createCustomer(db: AppDb, customerData: CreateCustomerData) {
  const now = new Date().toISOString();
  const customerId = crypto.randomUUID();

  const newCustomer = {
    id: customerId,
    name: customerData.name,
    phone: customerData.phone,
    phone2: customerData.phone2 || null,
    address: customerData.address || null,
    totalOrders: 0,
    totalSpent: 0,
    createdAt: now,
    lastOrderAt: null,
  };

  await db.insert(customers).values(newCustomer);

  return getCustomerById(db, customerId);
}

export async function updateCustomer(
  db: AppDb,
  customerId: string,
  updates: UpdateCustomerData,
) {
  const updateData: Record<string, unknown> = { ...updates };

  await db.update(customers).set(updateData).where(eq(customers.id, customerId));
  return getCustomerById(db, customerId);
}

export async function getOrdersByCustomerId(db: AppDb, customerId: string) {
  const customerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      price: orders.price,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .all();

  const ordersWithHistory = await Promise.all(
    customerOrders.map(async (order) => {
      const history = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, order.id))
        .all();

      return {
        ...order,
        statusHistory: history,
      };
    }),
  );

  return ordersWithHistory;
}

export async function getCustomerGroupMemberships(db: AppDb, customerId: string) {
  return await db
    .select({
      id: customerGroups.id,
      name: customerGroups.name,
      color: customerGroups.color,
      description: customerGroups.description,
      memberCount: customerGroups.memberCount,
      createdAt: customerGroups.createdAt,
      updatedAt: customerGroups.updatedAt,
      assignedAt: customerGroupMembers.assignedAt,
    })
    .from(customerGroupMembers)
    .innerJoin(customerGroups, eq(customerGroups.id, customerGroupMembers.groupId))
    .where(eq(customerGroupMembers.customerId, customerId))
    .all();
}

export async function getCustomerTagMemberships(db: AppDb, customerId: string) {
  return await db
    .select({
      id: customerTags.id,
      name: customerTags.name,
      color: customerTags.color,
      assignmentCount: customerTags.assignmentCount,
      createdAt: customerTags.createdAt,
      updatedAt: customerTags.updatedAt,
      assignedAt: customerTagAssignments.assignedAt,
    })
    .from(customerTagAssignments)
    .innerJoin(customerTags, eq(customerTags.id, customerTagAssignments.tagId))
    .where(eq(customerTagAssignments.customerId, customerId))
    .all();
}
