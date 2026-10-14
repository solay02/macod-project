/**
 * Post-purchase upsell (MaCod).
 *
 * GET  /api/upsell/product/:productId — get active upsell offers for a product
 * POST /api/upsell/order/:orderId    — add the upsell to an existing order
 *
 * The upsell is shown on the thank-you page. One click adds the upsell
 * product to the same order without requiring the shopper to re-fill the form.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { productUpsells, products, orders, orderProducts } from "../../../../macod-shared/db/schema";
import { eq, and } from "drizzle-orm";

export const upsellRouter = new Hono<AppContext>();

// GET /api/upsell/product/:productId — active upsell offers for a product
upsellRouter.get("/product/:productId", async (c) => {
  const productId = c.req.param("productId");
  const db = getDb(c.env.DB);

  const upsells = await db
    .select({
      id: productUpsells.id,
      label: productUpsells.label,
      upsellPrice: productUpsells.upsellPrice,
      upsellProduct: {
        id: products.id,
        name: products.name,
        handle: products.handle,
        price: products.price,
      },
    })
    .from(productUpsells)
    .innerJoin(products, eq(productUpsells.upsellProductId, products.id))
    .where(and(eq(productUpsells.productId, productId), eq(productUpsells.active, true)))
    .orderBy(productUpsells.position)
    .all();

  return c.json({ data: upsells });
});

// POST /api/upsell/order/:orderId — add the upsell to an existing order
const addUpsellSchema = z.object({
  upsellProductId: z.string().min(1),
  upsellPrice: z.number().int().positive(),
});

upsellRouter.post("/order/:orderId", async (c) => {
  const orderId = c.req.param("orderId");
  const body = await c.req.json();
  const parsed = addUpsellSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return c.json({ error: "Order not found" }, 404);

  // Only allow upsell on pending/unconfirmed orders (not delivered/cancelled)
  if (["delivered", "cancelled", "returned"].includes(order.status)) {
    return c.json({ error: `Cannot add upsell to a ${order.status} order` }, 400);
  }

  // Add the upsell product to the order
  const upsellProduct = await db.select().from(products).where(eq(products.id, parsed.data.upsellProductId)).get();
  if (!upsellProduct) return c.json({ error: "Upsell product not found" }, 404);

  await db.insert(orderProducts).values({
    id: crypto.randomUUID(),
    orderId,
    productId: parsed.data.upsellProductId,
    productName: upsellProduct.name,
    quantity: 1,
    pricePerUnit: parsed.data.upsellPrice,
    lineTotal: parsed.data.upsellPrice,
    createdAt: new Date().toISOString(),
  });

  // Update the order total
  await db.update(orders).set({
    price: order.price + parsed.data.upsellPrice,
    codAmount: order.codAmount + parsed.data.upsellPrice,
  }).where(eq(orders.id, orderId));

  return c.json({
    success: true,
    orderId,
    addedProduct: upsellProduct.name,
    addedPrice: parsed.data.upsellPrice,
    newTotal: order.price + parsed.data.upsellPrice,
  });
});
