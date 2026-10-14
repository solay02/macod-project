/**
 * Analytics / CPD (Cost Per Delivery) dashboard.
 *
 * GET /api/analytics/cpd?from=2026-01-01&to=2026-12-31
 *   Returns delivery rate, CAPI events fired, revenue collected, returns.
 *
 * GET /api/analytics/by-product?from=...&to=...
 *   Delivery rate broken down by product.
 *
 * GET /api/analytics/by-landing-page?from=...&to=...
 *   Delivery rate broken down by landing page.
 *
 * GET /api/analytics/capi-status
 *   CAPI events fired vs pending vs failed.
 */

import { Hono } from "hono";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { orders, capiEventLog, orderProducts, products, landingPages } from "../../../../macod-shared/db/schema";
import { eq, and, gte, lte, sql, count, sum, desc } from "drizzle-orm";

export const analyticsRouter = new Hono<AppContext>();

function parseDateRange(c: { req: { query: (k: string) => string | undefined } }) {
  const from = c.req.query("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = c.req.query("to") ?? new Date().toISOString().slice(0, 10);
  return { from: from + "T00:00:00Z", to: to + "T23:59:59Z" };
}

// GET /api/analytics/cpd
analyticsRouter.get("/cpd", async (c) => {
  const db = getDb(c.env.DB);
  const { from, to } = parseDateRange(c);

  const totals = await db
    .select({
      totalOrders: count(),
      delivered: sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`,
      returned: sql<number>`sum(case when ${orders.status} = 'returned' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${orders.status} = 'cancelled' then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${orders.status} in ('new', 'confirmed', 'dispatched', 'out_for_delivery') then 1 else 0 end)`,
      revenue: sql<number>`sum(case when ${orders.status} = 'delivered' then ${orders.price} + ${orders.deliveryFee} else 0 end)`,
      returnsValue: sql<number>`sum(case when ${orders.status} = 'returned' then ${orders.price} + ${orders.deliveryFee} else 0 end)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
    .get();

  const totalOrders = totals?.totalOrders ?? 0;
  const delivered = totals?.delivered ?? 0;
  const deliveryRate = totalOrders > 0 ? (delivered / totalOrders) * 100 : 0;

  return c.json({
    period: { from, to },
    totalOrders,
    delivered,
    returned: totals?.returned ?? 0,
    cancelled: totals?.cancelled ?? 0,
    pending: totals?.pending ?? 0,
    deliveryRate: Math.round(deliveryRate * 100) / 100,
    revenueCollected: totals?.revenue ?? 0,
    returnsValue: totals?.returnsValue ?? 0,
    currency: "MAD",
  });
});

// GET /api/analytics/by-product
analyticsRouter.get("/by-product", async (c) => {
  const db = getDb(c.env.DB);
  const { from, to } = parseDateRange(c);

  const result = await db
    .select({
      productId: orderProducts.productId,
      productName: products.name,
      totalOrders: count(),
      delivered: sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`,
      returned: sql<number>`sum(case when ${orders.status} = 'returned' then 1 else 0 end)`,
      revenue: sql<number>`sum(case when ${orders.status} = 'delivered' then ${orders.price} else 0 end)`,
    })
    .from(orderProducts)
    .innerJoin(orders, eq(orderProducts.orderId, orders.id))
    .innerJoin(products, eq(orderProducts.productId, products.id))
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
    .groupBy(orderProducts.productId, products.name)
    .orderBy(desc(count()))
    .limit(50)
    .all();

  return c.json({ data: result });
});

// GET /api/analytics/by-landing-page
analyticsRouter.get("/by-landing-page", async (c) => {
  const db = getDb(c.env.DB);
  const { from, to } = parseDateRange(c);

  const result = await db
    .select({
      landingPageId: orders.landingPageId,
      slug: landingPages.slug,
      totalOrders: count(),
      delivered: sql<number>`sum(case when ${orders.status} = 'delivered' then 1 else 0 end)`,
      returned: sql<number>`sum(case when ${orders.status} = 'returned' then 1 else 0 end)`,
      revenue: sql<number>`sum(case when ${orders.status} = 'delivered' then ${orders.price} else 0 end)`,
    })
    .from(orders)
    .leftJoin(landingPages, eq(orders.landingPageId, landingPages.id))
    .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
    .groupBy(orders.landingPageId, landingPages.slug)
    .orderBy(desc(count()))
    .limit(50)
    .all();

  return c.json({ data: result });
});

// GET /api/analytics/capi-status
analyticsRouter.get("/capi-status", async (c) => {
  const db = getDb(c.env.DB);
  const { from, to } = parseDateRange(c);

  const result = await db
    .select({
      status: capiEventLog.status,
      count: count(),
    })
    .from(capiEventLog)
    .where(and(gte(capiEventLog.sentAt, from), lte(capiEventLog.sentAt, to)))
    .groupBy(capiEventLog.status)
    .all();

  return c.json({ data: result });
});
