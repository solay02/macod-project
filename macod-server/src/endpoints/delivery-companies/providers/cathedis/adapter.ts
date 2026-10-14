/**
 * Cathedis Delivery Provider Adapter (MaCod — live-wired)
 *
 * Implements the DeliveryProvider interface for Cathedis
 * (https://api.cathedis.com — base URL configurable).
 *
 * Auth is Bearer-token based; the token is provisioned per merchant account
 * and stored in delivery_companies.api_token.
 *
 * Endpoint inventory:
 *   createShipment     → POST   /api/v1/shipments
 *   validateShipment   → POST   /api/v1/shipments/{tracking}/validate
 *   cancelShipment     → DELETE /api/v1/shipments/{tracking}
 *   updateShipment     → PATCH  /api/v1/shipments/{tracking}
 *   getStopDesks       → GET    /api/v1/stop-desks
 *   getTrackingInfo    → GET    /api/v1/shipments/{tracking}/tracking
 *   getLabelUrl        → GET    /api/v1/shipments/{tracking}/label
 *
 * Webhook: POST /webhooks/cathedis — translates raw Cathedis events into
 * the LIVRÉ / RETOURNÉ / REFUSÉ vocabulary via translateWebhookEvent().
 */

import type {
  DeliveryProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  UpdateShipmentInput,
  TrackingEvent,
  StopDesk,
} from "../types";
import type { MoroccanCarrier, MoroccanCarrierStatusEvent } from "../../../../../../macod-shared/lib/morocco-carrier";
import type {
  CathedisCreateShipmentRequest,
  CathedisCreateShipmentResponse,
  CathedisCancelShipmentResponse,
  CathedisTrackingResponse,
  CathedisStopDesksResponse,
} from "./types";

const CATHEDIS_BASE_URL = "https://api.cathedis.com";

/**
 * Cathedis webhook payload shape.
 * Cathedis pushes one event per status change.
 */
export interface CathedisWebhookPayload {
  tracking_number: string;
  event_key: string;
  event_label?: string;
  timestamp: string;
  location?: string;
}

const CATHEDIS_STATUS_MAP: Record<string, MoroccanCarrierStatusEvent["status"]> = {
  delivered: "LIVRÉ",
  returned: "RETOURNÉ",
  refused: "REFUSÉ",
  pending: "EN_ATTENTE",
  in_transit: "EN_COURS",
  dispatched: "EXPÉDIÉ",
  cancelled: "ANNULÉ",
};

export class CathedisProvider implements MoroccanCarrier {
  readonly code = "cathedis";
  readonly currency = "MAD" as const;

  private readonly apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────────

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${CATHEDIS_BASE_URL}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Cathedis HTTP ${res.status} — response is not valid JSON`);
    }

    if (!res.ok) {
      const msg = (json as { message?: string }).message ?? `Cathedis HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json as T;
  }

  // ─── DeliveryProvider interface ────────────────────────────────────────────

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    if (!input.provinceId) {
      throw new Error("Cathedis: provinceId is required (Morocco province slug)");
    }
    const payload: CathedisCreateShipmentRequest = {
      reference: input.reference ?? input.orderId,
      client_name: input.customerName,
      phone: input.phone,
      address: input.address,
      province_id: input.provinceId,
      region_id: input.regionId,
      amount: input.amount,
      currency: "MAD",
      product_description: input.productDescription,
      stop_desk: input.stopDesk ? 1 : 0,
      station_code: input.stationCode,
      weight: input.weight,
      can_open: input.canOpen,
      remarks: input.remarks,
    };

    const res = await this.request<CathedisCreateShipmentResponse>(
      "POST",
      "/api/v1/shipments",
      payload,
    );

    if (!res.tracking_number) {
      throw new Error("Cathedis did not return a tracking number");
    }

    return {
      trackingNumber: res.tracking_number,
      labelUrl: res.label_url,
      rawResponse: res,
    };
  }

  async validateShipment(trackingNumber: string): Promise<boolean> {
    await this.request<{ success: boolean }>(
      "POST",
      `/api/v1/shipments/${encodeURIComponent(trackingNumber)}/validate`,
    );
    return true;
  }

  async getStopDesks(): Promise<StopDesk[]> {
    const res = await this.request<CathedisStopDesksResponse>("GET", "/api/v1/stop-desks");
    return (res.desks ?? []).map((d) => ({
      code: d.code,
      name: d.name,
      address: d.address,
      commune: undefined,
      wilayaId: null,
    }));
  }

  async updateShipment(trackingNumber: string, input: UpdateShipmentInput): Promise<boolean> {
    const body: Record<string, unknown> = {};
    if (input.customerName != null) body.client_name = input.customerName;
    if (input.phone != null) body.phone = input.phone;
    if (input.phone2 != null) body.phone_2 = input.phone2;
    if (input.address != null) body.address = input.address;
    if (input.amount != null) body.amount = input.amount;
    if (input.remarks != null) body.remarks = input.remarks;
    if (input.weight != null) body.weight = input.weight;

    await this.request("PATCH", `/api/v1/shipments/${encodeURIComponent(trackingNumber)}`, body);
    return true;
  }

  async deleteShipment(trackingNumber: string): Promise<boolean> {
    const res = await this.request<CathedisCancelShipmentResponse>(
      "DELETE",
      `/api/v1/shipments/${encodeURIComponent(trackingNumber)}`,
    );
    return res.success;
  }

  async addRemark(trackingNumber: string, content: string): Promise<boolean> {
    await this.request("POST", `/api/v1/shipments/${encodeURIComponent(trackingNumber)}/remarks`, { content });
    return true;
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingEvent[]> {
    const res = await this.request<CathedisTrackingResponse>(
      "GET",
      `/api/v1/shipments/${encodeURIComponent(trackingNumber)}/tracking`,
    );
    return (res.events ?? []).map((e) => ({
      activity: e.event_key,
      description: e.event_label,
      date: e.timestamp,
    }));
  }

  getLabelUrl(trackingNumber: string): string {
    return `${CATHEDIS_BASE_URL}/api/v1/shipments/${encodeURIComponent(trackingNumber)}/label`;
  }

  // ─── MoroccanCarrier interface ──────────────────────────────────────────────

  translateWebhookEvent(raw: unknown): MoroccanCarrierStatusEvent {
    const payload = raw as CathedisWebhookPayload;
    const status = CATHEDIS_STATUS_MAP[payload.event_key] ?? "EN_ATTENTE";
    return {
      trackingNumber: payload.tracking_number,
      status,
      eventTime: payload.timestamp,
      note: payload.event_label,
      raw,
    };
  }
}
