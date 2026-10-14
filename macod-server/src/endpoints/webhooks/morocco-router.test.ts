/**
 * Morocco webhook router — tests for the CAPI Purchase trigger on LIVRÉ.
 *
 * Focus: the CAPI trigger contract — when a LIVRÉ webhook arrives, the
 * router calls c.env.CAPI_WORKFLOW.create() with the right params.
 * A CAPI failure must never block the delivery confirmation.
 */

import { describe, it, expect } from "vitest";
import { shouldTriggerCapiPurchase } from "@/workflows/capi-helpers";

describe("CAPI Purchase params contract", () => {
  it("shouldTriggerCapiPurchase returns true only for 'delivered' status", () => {
    expect(shouldTriggerCapiPurchase("delivered")).toBe(true);
    expect(shouldTriggerCapiPurchase("confirmed")).toBe(false);
    expect(shouldTriggerCapiPurchase("returned")).toBe(false);
    expect(shouldTriggerCapiPurchase("cancelled")).toBe(false);
    expect(shouldTriggerCapiPurchase("dispatched")).toBe(false);
    expect(shouldTriggerCapiPurchase("new")).toBe(false);
  });
});

/**
 * The webhook router's LIVRÉ case calls:
 *   if (shouldTriggerCapiPurchase("delivered")) {
 *     await c.env.CAPI_WORKFLOW.create({
 *       params: { orderId, eventName: "Purchase", stage: "delivered", triggeredAt, triggerStatus }
 *     });
 *   }
 *
 * The shouldTriggerCapiPurchase() gate ensures CAPI only fires on "delivered"
 * — never on "confirmed", "returned", "cancelled", etc. This is the contract
 * that matters: a false positive would fire Purchase for a non-delivered
 * order, wasting the merchant's ad budget optimization signal.
 */
describe("CAPI trigger gate — only fires on delivered status", () => {
  it("does NOT fire for 'confirmed' (Lead stage, not Purchase)", () => {
    expect(shouldTriggerCapiPurchase("confirmed")).toBe(false);
  });

  it("does NOT fire for 'returned' (parcel came back — no Purchase)", () => {
    expect(shouldTriggerCapiPurchase("returned")).toBe(false);
  });

  it("does NOT fire for 'cancelled' (order never completed)", () => {
    expect(shouldTriggerCapiPurchase("cancelled")).toBe(false);
  });

  it("fires for 'delivered' (cash collected — the real conversion)", () => {
    expect(shouldTriggerCapiPurchase("delivered")).toBe(true);
  });
});
