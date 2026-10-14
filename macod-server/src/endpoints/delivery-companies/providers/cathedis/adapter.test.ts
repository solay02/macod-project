/**
 * Cathedis adapter — unit tests for the live-wired adapter.
 *
 * Uses a mocked global.fetch to intercept HTTP calls and assert that the
 * adapter sends the right payloads to the right endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CathedisProvider } from "./adapter";
import type { CathedisWebhookPayload } from "./adapter";

const TOKEN = "test-cathedis-token";

// Helper: create a mock Response
function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("CathedisProvider (live-wired)", () => {
  let provider: CathedisProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    provider = new CathedisProvider(TOKEN);
  });

  describe("identity", () => {
    it("exposes the cathedis code and MAD currency", () => {
      expect(provider.code).toBe("cathedis");
      expect(provider.currency).toBe("MAD");
    });
  });

  describe("createShipment", () => {
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

    it("POSTs to /api/v1/shipments and returns the tracking number", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          tracking_number: "CATH-2026-00123456",
          label_url: "https://api.cathedis.com/labels/CATH-2026-00123456.pdf",
          status: "pending",
        }),
      );

      const result = await provider.createShipment({
        orderId: "ord_1",
        customerName: "Ahmed",
        phone: "+212661234567",
        address: "12 Rue Mohammed V",
        amount: 199,
        productDescription: "Test product",
        stopDesk: false,
        provinceId: "casablanca",
        regionId: "casablanca-settat",
      });

      expect(result.trackingNumber).toBe("CATH-2026-00123456");
      expect(result.labelUrl).toContain("CATH-2026-00123456");

      // Verify the fetch call
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.cathedis.com/api/v1/shipments");
      expect(opts.method).toBe("POST");
      expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
      const body = JSON.parse(opts.body);
      expect(body.province_id).toBe("casablanca");
      expect(body.currency).toBe("MAD");
      expect(body.amount).toBe(199);
    });

    it("throws when Cathedis returns no tracking number", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ status: "error" }));

      await expect(
        provider.createShipment({
          orderId: "ord_1",
          customerName: "Ahmed",
          phone: "+212661234567",
          address: "12 Rue Mohammed V",
          amount: 199,
          productDescription: "Test product",
          stopDesk: false,
          provinceId: "casablanca",
        }),
      ).rejects.toThrow(/did not return a tracking number/);
    });
  });

  describe("validateShipment", () => {
    it("POSTs to /api/v1/shipments/{tracking}/validate", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ success: true }));
      const result = await provider.validateShipment("CATH-1");
      expect(result).toBe(true);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/v1/shipments/CATH-1/validate");
      expect(opts.method).toBe("POST");
    });
  });

  describe("deleteShipment", () => {
    it("DELETEs /api/v1/shipments/{tracking}", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ success: true }));
      const result = await provider.deleteShipment("CATH-1");
      expect(result).toBe(true);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/v1/shipments/CATH-1");
      expect(opts.method).toBe("DELETE");
    });
  });

  describe("getStopDesks", () => {
    it("GETs /api/v1/stop-desks and maps the response", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          desks: [
            { code: "CAS-01", name: "Maârif", address: "Rue 12, Maârif", province_id: "casablanca" },
            { code: "RBA-01", name: "Agdal", address: "Av. de France", province_id: "rabat" },
          ],
        }),
      );
      const desks = await provider.getStopDesks();
      expect(desks).toHaveLength(2);
      expect(desks[0].code).toBe("CAS-01");
      expect(desks[0].name).toBe("Maârif");
    });
  });

  describe("getTrackingInfo", () => {
    it("GETs tracking events and maps them", async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          tracking_number: "CATH-1",
          current_status: "delivered",
          events: [
            { event_key: "dispatched", event_label: "Colis expédié", timestamp: "2026-10-14T08:00:00Z" },
            { event_key: "delivered", event_label: "Livré à la réception", timestamp: "2026-10-14T14:00:00Z" },
          ],
        }),
      );
      const events = await provider.getTrackingInfo("CATH-1");
      expect(events).toHaveLength(2);
      expect(events[0].activity).toBe("dispatched");
      expect(events[1].description).toBe("Livré à la réception");
    });
  });

  describe("getLabelUrl", () => {
    it("builds a deterministic label URL from the tracking number", () => {
      const url = provider.getLabelUrl("CATH-2026-00123456");
      expect(url).toBe("https://api.cathedis.com/api/v1/shipments/CATH-2026-00123456/label");
    });

    it("URL-encodes the tracking number", () => {
      const url = provider.getLabelUrl("CATH 2026/001");
      expect(url).toContain("CATH%202026%2F001");
    });
  });

  describe("translateWebhookEvent", () => {
    it("maps 'delivered' to LIVRÉ", () => {
      const payload: CathedisWebhookPayload = {
        tracking_number: "CATH-1",
        event_key: "delivered",
        event_label: "Livré à la réception",
        timestamp: "2026-10-14T10:00:00Z",
      };
      const event = provider.translateWebhookEvent(payload);
      expect(event.trackingNumber).toBe("CATH-1");
      expect(event.status).toBe("LIVRÉ");
      expect(event.note).toBe("Livré à la réception");
      expect(event.eventTime).toBe("2026-10-14T10:00:00Z");
    });

    it.each([
      ["returned", "RETOURNÉ"],
      ["refused", "REFUSÉ"],
      ["pending", "EN_ATTENTE"],
      ["in_transit", "EN_COURS"],
      ["dispatched", "EXPÉDIÉ"],
      ["cancelled", "ANNULÉ"],
    ])("maps %s → %s", (key, expected) => {
      const event = provider.translateWebhookEvent({
        tracking_number: "CATH-1",
        event_key: key,
        timestamp: "2026-10-14T10:00:00Z",
      });
      expect(event.status).toBe(expected);
    });

    it("falls back to EN_ATTENTE for unknown event keys", () => {
      const event = provider.translateWebhookEvent({
        tracking_number: "CATH-1",
        event_key: "unknown_future_status",
        timestamp: "2026-10-14T10:00:00Z",
      });
      expect(event.status).toBe("EN_ATTENTE");
    });

    it("preserves the raw payload for audit", () => {
      const payload: CathedisWebhookPayload = {
        tracking_number: "CATH-1",
        event_key: "delivered",
        timestamp: "2026-10-14T10:00:00Z",
      };
      const event = provider.translateWebhookEvent(payload);
      expect(event.raw).toBe(payload);
    });
  });
});
