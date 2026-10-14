/**
 * Call-center order confirmation flow (MaCod).
 *
 * Moroccan COD requires calling the customer before dispatch. This endpoint
 * provides the dashboard with:
 *   GET  /api/orders/call-center?status=pending  — list orders by call status
 *   POST /api/orders/:id/call-status              — update call status + notes
 *   POST /api/orders/:id/whatsapp                 — returns a wa.me link with pre-filled Darija message
 *   POST /api/orders/bulk-confirm                 — bulk confirm multiple orders
 *   POST /api/orders/bulk-cancel                  — bulk cancel multiple orders
 *
 * Call statuses: pending | confirmed | unreachable_1 | unreachable_2 |
 *                unreachable_3 | fake_number | cancelled
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { orders } from "../../../../macod-shared/db/schema";
import { eq, inArray, desc, and } from "drizzle-orm";

export const callCenterRouter = new Hono<AppContext>();

const CALL_STATUSES = [
  "pending", "confirmed", "unreachable_1", "unreachable_2",
  "unreachable_3", "fake_number", "cancelled",
] as const;

// GET /api/orders/call-center?status=pending&limit=50
callCenterRouter.get("/call-center", async (c) => {
  const db = getDb(c.env.DB);
  const status = c.req.query("status") as typeof CALL_STATUSES[number] | undefined;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);

  const conditions = [];
  if (status) conditions.push(eq(orders.callStatus, status));

  const result = await db
    .select()
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .all();

  return c.json({ data: result, count: result.length });
});

// POST /api/orders/:id/call-status
const callStatusSchema = z.object({
  callStatus: z.enum(CALL_STATUSES),
  callNotes: z.string().max(1000).optional(),
  calledBy: z.string().optional(),
});

callCenterRouter.post("/:id/call-status", async (c) => {
  const orderId = c.req.param("id");
  const body = await c.req.json();
  const parsed = callStatusSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  await db.update(orders).set({
    callStatus: parsed.data.callStatus,
    callNotes: parsed.data.callNotes ?? null,
    calledAt: new Date().toISOString(),
    calledBy: parsed.data.calledBy ?? null,
    // Sync the main order status when call status changes
    status: parsed.data.callStatus === "confirmed" ? "confirmed"
          : parsed.data.callStatus === "cancelled" ? "cancelled"
          : parsed.data.callStatus === "fake_number" ? "cancelled"
          : undefined,
  }).where(eq(orders.id, orderId));

  return c.json({ success: true, orderId, callStatus: parsed.data.callStatus });
});

// POST /api/orders/:id/whatsapp — returns pre-filled wa.me link
callCenterRouter.post("/:id/whatsapp", async (c) => {
  const orderId = c.req.param("id");
  const db = getDb(c.env.DB);
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return c.json({ error: "Order not found" }, 404);

  const total = order.price + (order.deliveryFee ?? 0);
  const message = `السلام عليكم ${order.customerName}، معاك متجر ماكود. بخصوص الطلب ديالك رقم #${order.orderNumber} بـ ${total} درهم، واش نأكدوا ليك الإرسال؟`;
  const waUrl = `https://wa.me/${order.phone.replace(/\D/g, "").replace(/^0/, "212")}?text=${encodeURIComponent(message)}`;

  return c.json({ whatsappUrl: waUrl, message });
});

// POST /api/orders/bulk-confirm
const bulkConfirmSchema = z.object({
  orderIds: z.array(z.string()).min(1).max(100),
});

callCenterRouter.post("/bulk-confirm", async (c) => {
  const body = await c.req.json();
  const parsed = bulkConfirmSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  const now = new Date().toISOString();
  await db.update(orders).set({
    callStatus: "confirmed",
    status: "confirmed",
    calledAt: now,
  }).where(inArray(orders.id, parsed.data.orderIds));

  return c.json({ success: true, count: parsed.data.orderIds.length });
});

// POST /api/orders/bulk-cancel
callCenterRouter.post("/bulk-cancel", async (c) => {
  const body = await c.req.json();
  const parsed = bulkConfirmSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  await db.update(orders).set({
    callStatus: "cancelled",
    status: "cancelled",
    calledAt: new Date().toISOString(),
  }).where(inArray(orders.id, parsed.data.orderIds));

  return c.json({ success: true, count: parsed.data.orderIds.length });
});
