/**
 * Morocco Carrier Webhook Router
 *
 * Receives inbound webhook events from Moroccan carriers (Cathedis, Amana,
 * Sendit) and dispatches them to the order state machine.
 *
 * Mount: app.route("/webhooks", moroccoWebhookRouter)
 */

import { Hono } from "hono";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { getProvider } from "@/endpoints/delivery-companies/providers/registry";
import { shouldTriggerCapiPurchase } from "@/workflows/capi-helpers";
import { autoFlagCustomer } from "../../../../macod-shared/queries/anti-fraud";
import type { MoroccanCarrier, MoroccanCarrierStatusEvent } from "../../../../macod-shared/lib/morocco-carrier";
import { eq } from "drizzle-orm";
import { orders, deliveryCompanies } from "../../../../macod-shared/db/schema";

const MOROCCAN_CARRIER_CODES = ["cathedis", "amana", "smtp"];

export const moroccoWebhookRouter = new Hono<AppContext>();

moroccoWebhookRouter.post("/:carrier", async (c) => {
  const carrierCode = c.req.param("carrier");

  if (!MOROCCAN_CARRIER_CODES.includes(carrierCode)) {
    return c.json({ error: `Unknown carrier: ${carrierCode}` }, 404);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const db = getDb(c.env.DB);

  // Look up the delivery company to get the API token.
  const company = await db
    .select()
    .from(deliveryCompanies)
    .where(eq(deliveryCompanies.code, carrierCode))
    .get();

  if (!company) {
    return c.json({ error: `Carrier ${carrierCode} is not configured` }, 404);
  }

  // Get the provider adapter. Pass db so the SMTP carrier can send emails.
  let provider;
  try {
    provider = getProvider({
      code: company.code,
      apiToken: company.apiToken,
      apiUserGuid: company.apiUserGuid,
      apiEndpoint: company.apiEndpoint,
      notes: company.notes,
    }, db);
  } catch (err) {
    return c.json({ error: `Carrier ${carrierCode} has invalid credentials: ${(err as Error).message}` }, 500);
  }

  const moroccanProvider = provider as unknown as MoroccanCarrier;
  if (typeof moroccanProvider.translateWebhookEvent !== "function") {
    return c.json({ error: `Carrier ${carrierCode} does not implement MoroccanCarrier` }, 500);
  }

  const event: MoroccanCarrierStatusEvent = moroccanProvider.translateWebhookEvent(rawBody);

  if (!event.trackingNumber) {
    return c.json({ error: "Webhook payload missing tracking_number" }, 400);
  }

  // Find the order by tracking number.
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.trackingNumber, event.trackingNumber))
    .get();

  if (!order) {
    return c.json({ error: `No order found for tracking ${event.trackingNumber}` }, 404);
  }

  // Dispatch to the order state machine based on the translated status.
  try {
    switch (event.status) {
      case "LIVRÉ":
        await db.update(orders).set({
          status: "delivered",
        }).where(eq(orders.id, order.id));

        // Fire the CAPI Purchase workflow — the order was delivered and cash
        // collected. This is the single most important conversion event for
        // Moroccan COD media buyers: it tells Meta/TikTok to optimize for
        // real cash collected, not form submits.
        //
        // shouldTriggerCapiPurchase() checks the status is "delivered".
        // The workflow itself handles the rest: pixel config lookup, event
        // claiming (prevents duplicates), 7-day window check, and the actual
        // Meta CAPI POST. Failures are logged to capi_event_log, never
        // thrown — a CAPI failure can never block delivery confirmation.
        if (shouldTriggerCapiPurchase("delivered")) {
          try {
            await c.env.CAPI_WORKFLOW.create({
              params: {
                orderId: order.id,
                eventName: "Purchase",
                stage: "delivered",
                triggeredAt: Math.floor(Date.now() / 1000),
                triggerStatus: "delivered",
              },
            });
          } catch (err) {
            // Log but don't fail the webhook — the order IS delivered,
            // CAPI is best-effort. The workflow has its own retry logic.
            console.error(`[morocco-webhook] CAPI workflow trigger failed for ${event.trackingNumber}:`, err);
          }
        }
        break;

      case "RETOURNÉ":
        await db.update(orders).set({
          status: "returned",
        }).where(eq(orders.id, order.id));
        // Auto-flag the customer for chronic returns (anti-fraud).
        try {
          await autoFlagCustomer(db, order.phone, "chronic_returner");
        } catch (err) {
          console.error("[morocco-webhook] auto-flag failed:", err);
        }
        break;

      case "REFUSÉ":
        // Refused = customer rejected the parcel. Map to "returned" since
        // the parcel comes back. A follow-up feature will add a "refused"
        // status and a customer blacklist.
        await db.update(orders).set({
          status: "returned",
        }).where(eq(orders.id, order.id));
        // Auto-flag the customer for refusal (anti-fraud).
        try {
          await autoFlagCustomer(db, order.phone, "fake_number");
        } catch (err) {
          console.error("[morocco-webhook] auto-flag failed:", err);
        }
        break;

      case "EXPÉDIÉ":
        await db.update(orders).set({
          status: "dispatched",
        }).where(eq(orders.id, order.id));
        break;

      case "ANNULÉ":
        await db.update(orders).set({
          status: "cancelled",
        }).where(eq(orders.id, order.id));
        break;

      case "EN_ATTENTE":
      case "EN_COURS":
      default:
        break;
    }
  } catch (err) {
    console.error(`[morocco-webhook] failed to process ${event.status} for ${event.trackingNumber}:`, err);
    return c.json({ error: "Failed to process webhook" }, 500);
  }

  return c.json({
    received: true,
    tracking: event.trackingNumber,
    status: event.status,
    orderId: order.id,
  });
});

moroccoWebhookRouter.get("/:carrier", (c) => {
  const carrierCode = c.req.param("carrier");
  if (!MOROCCAN_CARRIER_CODES.includes(carrierCode)) {
    return c.json({ error: `Unknown carrier: ${carrierCode}` }, 404);
  }
  return c.json({ ok: true, carrier: carrierCode });
});
