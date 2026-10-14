/**
 * Thermal label printing (A6 / 4×6) — MaCod.
 *
 * GET /api/orders/:id/label — returns HTML for a printable thermal label
 *   (100×150mm). Opens in a new window; the admin prints via the browser's
 *   print dialog (Ctrl+P) with a thermal printer set as default.
 *
 * GET /api/orders/bulk-labels?ids=id1,id2,id3 — returns a single HTML page
 *   with multiple labels for batch printing.
 *
 * Label layout:
 *   ┌─────────────────────────────┐
 *   │  [Store Name]                │
 *   │  Order #ORD-20261014-0042   │
 *   │  ───────────────────────────│
 *   │  Customer: Ahmed Benali      │
 *   │  Phone: 0661234567          │
 *   │  City: الدار البيضاء         │
 *   │  Address: 12 Rue Mohammed V  │
 *   │  ───────────────────────────│
 *   │  Product: Test Product       │
 *   │  ───────────────────────────│
 *   │  COD: 299 درهم               │
 *   │  ───────────────────────────│
 *   │  [Barcode: order number]     │
 *   └─────────────────────────────┘
 */

import { Hono } from "hono";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { orders } from "../../../../macod-shared/db/schema";
import { eq, inArray } from "drizzle-orm";

export const labelRouter = new Hono<AppContext>();

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildLabelHtml(order: typeof orders.$inferSelect): string {
  const total = order.price + (order.deliveryFee ?? 0);
  return `
    <div class="thermal-label">
      <div class="label-store">${escapeHtml(order.orderNumber)}</div>
      <hr/>
      <div class="label-row"><span class="label-key">الاسم</span><span class="label-val">${escapeHtml(order.customerName)}</span></div>
      <div class="label-row"><span class="label-key">الهاتف</span><span class="label-val">${escapeHtml(order.phone)}</span></div>
      <div class="label-row"><span class="label-key">المدينة</span><span class="label-val">${escapeHtml(order.city ?? "")}</span></div>
      <div class="label-row"><span class="label-key">العنوان</span><span class="label-val">${escapeHtml(order.address ?? "")}</span></div>
      <hr/>
      <div class="label-cod">CRBT: ${total} درهم</div>
      <div class="label-barcode">*${escapeHtml(order.orderNumber)}*</div>
    </div>
  `;
}

function buildPageHtml(labels: string[]): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>Shipping Labels</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  body { margin: 0; padding: 8px; font-family: 'Cairo', sans-serif; }
  .thermal-label {
    width: 100mm; height: 150mm; padding: 8px; box-sizing: border-box;
    page-break-after: always; display: flex; flex-direction: column; gap: 4px;
  }
  .label-store { font-size: 18px; font-weight: 900; text-align: center; }
  .label-row { display: flex; justify-content: space-between; font-size: 14px; }
  .label-key { font-weight: 700; color: #666; }
  .label-val { font-weight: 900; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 4px 0; }
  .label-cod { font-size: 22px; font-weight: 900; text-align: center; background: #f0f0f0; padding: 8px; border-radius: 8px; }
  .label-barcode { font-family: 'Courier New', monospace; font-size: 28px; text-align: center; letter-spacing: 2px; }
</style>
</head>
<body>
  ${labels.join("\n")}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

labelRouter.get("/orders/:id/label", async (c) => {
  const orderId = c.req.param("id");
  const db = getDb(c.env.DB);
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return c.json({ error: "Order not found" }, 404);

  return c.html(buildPageHtml([buildLabelHtml(order)]));
});

labelRouter.get("/bulk-labels", async (c) => {
  const ids = (c.req.query("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0) return c.json({ error: "No order IDs provided" }, 400);

  const db = getDb(c.env.DB);
  const result = await db.select().from(orders).where(inArray(orders.id, ids)).all();

  const labels = result.map(buildLabelHtml);
  return c.html(buildPageHtml(labels));
});
