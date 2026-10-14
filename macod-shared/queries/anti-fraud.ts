/**
 * Anti-fraud: duplicate phone detection + customer blacklist.
 *
 * Two checks exposed:
 *   isPhoneBlacklisted(db, phone) — returns the blacklist row if the phone is flagged
 *   isDuplicateOrder(db, phone, productId) — returns true if the same phone ordered
 *     the same product within the last hour (competitor spam pattern)
 *
 * Both use the canonical local form "0661234567" (from toLocalMoroccanMobile).
 */

import type { AppDb } from "../db/client";
import { customerBlacklist, orders, orderProducts } from "../db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

/** Check if a phone is in the customer blacklist. Returns the row if flagged. */
export async function isPhoneBlacklisted(
  db: AppDb,
  phone: string,
): Promise<typeof customerBlacklist.$inferSelect | null> {
  const row = await db
    .select()
    .from(customerBlacklist)
    .where(eq(customerBlacklist.phone, phone))
    .get();
  return row ?? null;
}

/**
 * Check if the same phone ordered the same product within the last hour.
 * Returns the count of matching orders (0 = no duplicate, 1+ = duplicate).
 *
 * This catches the competitor spam pattern: someone places test orders with
 * the same phone on the same product to burn the merchant's ad budget.
 *
 * Product association is through orderProducts (the orders table itself
 * has a productId column but it's the "original" product; orderProducts
 * is the authoritative source for multi-line carts).
 */
export async function countDuplicateOrders(
  db: AppDb,
  phone: string,
  productId: string,
  windowMinutes = 60,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Find orders from this phone in the time window, then check if any have
  // the given product in orderProducts.
  const recentOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.phone, phone),
        gte(orders.createdAt, since),
      ),
    )
    .all();

  if (recentOrders.length === 0) return 0;

  const orderIds = recentOrders.map((o) => o.id);
  const productOrders = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderProducts)
    .where(
      and(
        inArray(orderProducts.orderId, orderIds),
        eq(orderProducts.productId, productId),
      ),
    )
    .get();

  return productOrders?.count ?? 0;
}

/**
 * Auto-flag a customer for blacklist when they accumulate too many returns.
 * Called from the webhook router when RETOURNÉ/REFUSÉ events arrive.
 */
export async function autoFlagCustomer(
  db: AppDb,
  phone: string,
  reason: string,
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await isPhoneBlacklisted(db, phone);

  if (existing) {
    // Increment the return count.
    await db
      .update(customerBlacklist)
      .set({
        returnCount: existing.returnCount + 1,
        updatedAt: now,
      })
      .where(eq(customerBlacklist.phone, phone));
    return;
  }

  // New entry.
  await db.insert(customerBlacklist).values({
    id: crypto.randomUUID(),
    phone,
    reason,
    autoFlagged: true,
    returnCount: 1,
    createdAt: now,
    updatedAt: now,
  });
}
