/**
 * Amana adapter — skeleton unit tests.
 * See cathedis/adapter.test.ts for the same test surface rationale.
 */

import { describe, it, expect } from "vitest";
import { AmanaProvider, type AmanaWebhookPayload } from "./adapter";

describe("AmanaProvider (skeleton)", () => {
  const provider = new AmanaProvider("test-amana-token");

  it("exposes the amana code and MAD currency", () => {
    expect(provider.code).toBe("amana");
    expect(provider.currency).toBe("MAD");
  });

  it("rejects createShipment without provinceId", async () => {
    await expect(
      provider.createShipment({
        orderId: "ord_1",
        customerName: "Fatima",
        phone: "+212661234567",
        address: "12 Rue Hassan II",
        amount: 199,
        productDescription: "Product",
        stopDesk: false,
      }),
    ).rejects.toThrow(/provinceId is required/);
  });

  it("throws NotImplementedError when provinceId is present", async () => {
    await expect(
      provider.createShipment({
        orderId: "ord_1",
        customerName: "Fatima",
        phone: "+212661234567",
        address: "12 Rue Hassan II",
        amount: 199,
        productDescription: "Product",
        stopDesk: false,
        provinceId: "rabat",
      }),
    ).rejects.toThrow(/not yet wired/);
  });

  it("builds the label URL deterministically", () => {
    expect(provider.getLabelUrl("AMA-2026-001")).toBe(
      "https://api.amana.ma/api/v1/parcels/AMA-2026-001/label",
    );
  });

  describe("translateWebhookEvent", () => {
    it("maps Amana event codes to MaCod vocabulary", () => {
      const payload: AmanaWebhookPayload = {
        tracking_number: "AMA-1",
        event_code: "DLV",
        event_label: "Livré",
        timestamp: "2026-10-14T11:00:00Z",
        office: "Casablanca Maârif",
      };
      const event = provider.translateWebhookEvent(payload);
      expect(event.status).toBe("LIVRÉ");
      expect(event.note).toBe("Livré");
      expect(event.raw).toBe(payload);
    });

    it.each([
      ["DLV", "LIVRÉ"],
      ["RTN", "RETOURNÉ"],
      ["REF", "REFUSÉ"],
      ["PND", "EN_ATTENTE"],
      ["TRN", "EN_COURS"],
      ["PCH", "EXPÉDIÉ"],
      ["CNC", "ANNULÉ"],
    ])("maps %s → %s", (code, expected) => {
      const event = provider.translateWebhookEvent({
        tracking_number: "AMA-1",
        event_code: code,
        timestamp: "2026-10-14T11:00:00Z",
      });
      expect(event.status).toBe(expected);
    });

    it("falls back to EN_ATTENTE for unknown codes", () => {
      const event = provider.translateWebhookEvent({
        tracking_number: "AMA-1",
        event_code: "UNKNOWN",
        timestamp: "2026-10-14T11:00:00Z",
      });
      expect(event.status).toBe("EN_ATTENTE");
    });
  });
});
