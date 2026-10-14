/**
 * Manual order status endpoint — lets the admin mark an order as delivered.
 *
 * This triggers the CAPI Purchase workflow the same way a carrier LIVRÉ
 * webhook would, but from the dashboard. Use case: the admin tracks the
 * order on the carrier's own admin page (Cathedis/Amana website), sees it
 * was delivered, and clicks "Mark as Delivered" here to fire CAPI.
 *
 * Also supports marking as returned/refused/cancelled for manual status
 * corrections without a carrier webhook.
 *
 * POST /api/orders/:id/mark-delivered
 * POST /api/orders/:id/mark-returned
 * POST /api/orders/:id/mark-refused
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { orders } from "../../../../macod-shared/db/schema";
import { eq } from "drizzle-orm";
import { shouldTriggerCapiPurchase } from "@/workflows/capi-helpers";

export const manualStatusRouter = new Hono<AppContext>();

interface MarkResult {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  capiTriggered: boolean;
  capiError?: string;
}

/**
 * Core: set the order status and optionally trigger CAPI.
 * Shared by all the mark-* endpoints.
 */
async function markOrderStatus(
  c: { env: AppContext["Bindings"] },
  orderId: string,
  newStatus: "delivered" | "returned" | "cancelled",
  triggerCapi: boolean,
): Promise<MarkResult> {
  const db = getDb(c.env.DB);

  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  const previousStatus = order.status;

  await db.update(orders).set({ status: newStatus }).where(eq(orders.id, orderId));

  let capiTriggered = false;
  let capiError: string | undefined;

  if (triggerCapi && shouldTriggerCapiPurchase(newStatus)) {
    try {
      await c.env.CAPI_WORKFLOW.create({
        params: {
          orderId: order.id,
          eventName: "Purchase",
          stage: "delivered",
          triggeredAt: Math.floor(Date.now() / 1000),
          triggerStatus: newStatus,
        },
      });
      capiTriggered = true;
    } catch (err) {
      capiError = err instanceof Error ? err.message : String(err);
      console.error(`[manual-status] CAPI trigger failed for ${orderId}:`, err);
    }
  }

  return {
    orderId: order.id,
    previousStatus,
    newStatus,
    capiTriggered,
    capiError,
  };
}

manualStatusRouter.post("/orders/:id/mark-delivered", async (c) => {
  const orderId = c.req.param("id");
  try {
    const result = await markOrderStatus(c, orderId, "delivered", true);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Unknown error" }, 404);
  }
});

manualStatusRouter.post("/orders/:id/mark-returned", async (c) => {
  const orderId = c.req.param("id");
  try {
    const result = await markOrderStatus(c, orderId, "returned", false);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Unknown error" }, 404);
  }
});

manualStatusRouter.post("/orders/:id/mark-refused", async (c) => {
  const orderId = c.req.param("id");
  try {
    const result = await markOrderStatus(c, orderId, "returned", false);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Unknown error" }, 404);
  }
});

manualStatusRouter.post("/orders/:id/mark-cancelled", async (c) => {
  const orderId = c.req.param("id");
  try {
    const result = await markOrderStatus(c, orderId, "cancelled", false);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Unknown error" }, 404);
  }
});
