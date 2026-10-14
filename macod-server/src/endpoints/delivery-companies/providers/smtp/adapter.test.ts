/**
 * SMTP carrier adapter — unit tests.
 *
 * The SMTP carrier doesn't make HTTP calls (it uses the existing email
 * infrastructure), so these tests don't mock fetch. They verify:
 *   - The carrier generates a tracking number with the SMTP- prefix
 *   - The carrier rejects missing provinceId
 *   - validateShipment / deleteShipment / getStopDesks are no-ops
 *   - getLabelUrl returns undefined (no carrier label)
 *   - translateWebhookEvent maps email delivery events correctly
 *   - The constructor rejects invalid email addresses
 */

import { describe, it, expect } from "vitest";
import { SmtpProvider } from "./adapter";
import type { SmtpWebhookPayload } from "./adapter";

const FULFILLMENT_EMAIL = "fulfillment@mystore.ma";

describe("SmtpProvider", () => {
  describe("constructor", () => {
    it("accepts a valid email address", () => {
      const provider = new SmtpProvider(FULFILLMENT_EMAIL, null);
      expect(provider.code).toBe("smtp");
      expect(provider.currency).toBe("MAD");
    });

    it("rejects an empty email address", () => {
      expect(() => new SmtpProvider("", null)).toThrow(/valid fulfillment email/);
    });

    it("rejects a non-email string", () => {
      expect(() => new SmtpProvider("not-an-email", null)).toThrow(/valid fulfillment email/);
    });
  });

  describe("createShipment", () => {
    const provider = new SmtpProvider(FULFILLMENT_EMAIL, null);

    it("rejects input missing provinceId", async () => {
      await expect(
        provider.createShipment({
          orderId: "ord_1",
          customerName: "Ahmed",
          phone: "+212661234567",
          address: "12 Rue Mohammed V",
          amount: 199,
          productDescription: "Test product",
          stopDesk: false,
        }),
      ).rejects.toThrow(/provinceId is required/);
    });

    it("generates a tracking number with the SMTP- prefix", async () => {
      const result = await provider.createShipment({
        orderId: "ord_test123",
        customerName: "Ahmed",
        phone: "+212661234567",
        address: "12 Rue Mohammed V",
        amount: 199,
        productDescription: "Test product",
        stopDesk: false,
        provinceId: "casablanca",
      });

      expect(result.trackingNumber).toMatch(/^SMTP-/);
      expect(result.trackingNumber).toContain("ORD_TEST"); // contains the order ID suffix
      expect(result.labelUrl).toBeUndefined();
      expect(result.rawResponse).toMatchObject({
        carrier: "smtp",
        sentTo: FULFILLMENT_EMAIL,
        orderId: "ord_test123",
      });
    });

    it("returns a unique tracking number per call", async () => {
      const input = {
        orderId: "ord_unique",
        customerName: "Ahmed",
        phone: "+212661234567",
        address: "12 Rue Mohammed V",
        amount: 199,
        productDescription: "Test product",
        stopDesk: false,
        provinceId: "casablanca",
      };

      const result1 = await provider.createShipment(input);
      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));
      const result2 = await provider.createShipment(input);

      expect(result1.trackingNumber).not.toBe(result2.trackingNumber);
    });
  });

  describe("no-op methods", () => {
    const provider = new SmtpProvider(FULFILLMENT_EMAIL, null);

    it("validateShipment always returns true", async () => {
      expect(await provider.validateShipment("SMTP-1")).toBe(true);
    });

    it("deleteShipment always returns true", async () => {
      expect(await provider.deleteShipment("SMTP-1")).toBe(true);
    });

    it("updateShipment always returns true", async () => {
      expect(await provider.updateShipment("SMTP-1", {})).toBe(true);
    });

    it("getStopDesks returns an empty array", async () => {
      const desks = await provider.getStopDesks();
      expect(desks).toEqual([]);
    });

    it("getTrackingInfo returns an empty array", async () => {
      const events = await provider.getTrackingInfo("SMTP-1");
      expect(events).toEqual([]);
    });

    it("getLabelUrl returns undefined", () => {
      expect(provider.getLabelUrl("SMTP-1")).toBeUndefined();
    });
  });

  describe("translateWebhookEvent", () => {
    const provider = new SmtpProvider(FULFILLMENT_EMAIL, null);

    it("maps 'delivered' to LIVRÉ (email reached the fulfillment team)", () => {
      const payload: SmtpWebhookPayload = {
        message_id: "SMTP-1",
        event: "delivered",
        timestamp: "2026-10-14T10:00:00Z",
        recipient: FULFILLMENT_EMAIL,
      };
      const event = provider.translateWebhookEvent(payload);
      expect(event.status).toBe("LIVRÉ");
      expect(event.trackingNumber).toBe("SMTP-1");
      expect(event.note).toBe("delivered");
    });

    it("maps 'bounced' to REFUSÉ (email failed to deliver)", () => {
      const payload: SmtpWebhookPayload = {
        message_id: "SMTP-2",
        event: "bounced",
        timestamp: "2026-10-14T11:00:00Z",
        reason: "Mailbox full",
      };
      const event = provider.translateWebhookEvent(payload);
      expect(event.status).toBe("REFUSÉ");
      expect(event.note).toBe("Mailbox full");
    });

    it("maps 'opened' to EN_COURS (team is processing)", () => {
      const event = provider.translateWebhookEvent({
        message_id: "SMTP-3",
        event: "opened",
        timestamp: "2026-10-14T12:00:00Z",
      });
      expect(event.status).toBe("EN_COURS");
    });

    it("maps 'complained' to REFUSÉ", () => {
      const event = provider.translateWebhookEvent({
        message_id: "SMTP-4",
        event: "complained",
        timestamp: "2026-10-14T13:00:00Z",
      });
      expect(event.status).toBe("REFUSÉ");
    });

    it("falls back to EN_ATTENTE for unknown events", () => {
      const event = provider.translateWebhookEvent({
        message_id: "SMTP-5",
        event: "deferred",
        timestamp: "2026-10-14T14:00:00Z",
      });
      expect(event.status).toBe("EN_ATTENTE");
    });

    it("preserves the raw payload for audit", () => {
      const payload: SmtpWebhookPayload = {
        message_id: "SMTP-6",
        event: "delivered",
        timestamp: "2026-10-14T15:00:00Z",
      };
      const event = provider.translateWebhookEvent(payload);
      expect(event.raw).toBe(payload);
    });
  });
});
