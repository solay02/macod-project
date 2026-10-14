/**
 * Amana (Barid Al-Maghrib) Delivery Provider Adapter (MaCod Phase 2 skeleton)
 *
 * Implements the DeliveryProvider interface for Amana — Morocco's national
 * postal carrier. Amana is the cheapest option for COD to remote provinces
 * and the only carrier that reaches every commune.
 *
 * ⚠️ SKELETON ONLY — HTTP calls throw NotImplementedError until a live
 * Amana API account is provisioned. The types and capability matrix are
 * the contract; wiring is a fill-in-the-blank exercise mirroring NoestProvider.
 *
 * Endpoint inventory (projected):
 *   createShipment     → POST /api/v1/parcels
 *   validateShipment   → POST /api/v1/parcels/{tracking}/validate
 *   cancelShipment     → DELETE /api/v1/parcels/{tracking}
 *   updateShipment     → PATCH /api/v1/parcels/{tracking}
 *   getStopDesks       → GET  /api/v1/post-offices
 *   getTrackingInfo    → GET  /api/v1/parcels/{tracking}/tracking
 *   getLabelUrl        → GET  /api/v1/parcels/{tracking}/label
 *
 * Webhook: Amana tracking is pull-only (TBD — confirm whether Amana supports
 * webhook registration before production use).
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
  AmanaCreateShipmentRequest,
  AmanaCreateShipmentResponse,
  AmanaTrackingResponse,
  AmanaStopDesk,
} from "./types";

const AMANA_BASE_URL = "https://api.amana.ma";

/**
 * Amana webhook payload shape (projected — Amana may not push webhooks;
 * the tracking may need to be polled. Verify before relying on this.)
 */
export interface AmanaWebhookPayload {
  tracking_number: string;
  event_code: string; // "PCH" | "DLV" | "RTN" | "REF" | ...
  event_label?: string;
  timestamp: string;
  office?: string;
}

const AMANA_STATUS_MAP: Record<string, MoroccanCarrierStatusEvent["status"]> = {
  DLV: "LIVRÉ",
  RTN: "RETOURNÉ",
  REF: "REFUSÉ",
  PND: "EN_ATTENTE",
  TRN: "EN_COURS",
  PCH: "EXPÉDIÉ",
  CNC: "ANNULÉ",
};

export class AmanaProvider implements MoroccanCarrier {
  readonly code = "amana";
  readonly currency = "MAD" as const;

  private readonly apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    if (!input.provinceId) {
      throw new Error("Amana: provinceId is required (Morocco province slug)");
    }
    const payload: AmanaCreateShipmentRequest = {
      reference: input.reference ?? input.orderId,
      client_name: input.customerName,
      phone: input.phone,
      address: input.address,
      province_id: input.provinceId,
      amount: input.amount,
      currency: "MAD",
      product_description: input.productDescription,
      delivery_mode: input.stopDesk ? "stop_desk" : "home",
      station_code: input.stationCode,
      weight: input.weight,
      can_open: input.canOpen,
      remarks: input.remarks,
    };
    void payload; // TODO: POST /api/v1/parcels → AmanaCreateShipmentResponse
    throw new Error("AmanaProvider.createShipment: not yet wired — see MaCod Phase 2 skeleton");
  }

  async validateShipment(trackingNumber: string): Promise<boolean> {
    void trackingNumber;
    throw new Error("AmanaProvider.validateShipment: not yet wired — see MaCod Phase 2 skeleton");
  }

  async getStopDesks(): Promise<StopDesk[]> {
    // TODO: GET /api/v1/post-offices → AmanaStopDesk[]
    throw new Error("AmanaProvider.getStopDesks: not yet wired — see MaCod Phase 2 skeleton");
  }

  async updateShipment(trackingNumber: string, input: UpdateShipmentInput): Promise<boolean> {
    void trackingNumber; void input;
    throw new Error("AmanaProvider.updateShipment: not yet wired — see MaCod Phase 2 skeleton");
  }

  async deleteShipment(trackingNumber: string): Promise<boolean> {
    void trackingNumber;
    throw new Error("AmanaProvider.deleteShipment: not yet wired — see MaCod Phase 2 skeleton");
  }

  async addRemark(trackingNumber: string, content: string): Promise<boolean> {
    void trackingNumber; void content;
    throw new Error("AmanaProvider.addRemark: not yet wired — see MaCod Phase 2 skeleton");
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingEvent[]> {
    void trackingNumber;
    throw new Error("AmanaProvider.getTrackingInfo: not yet wired — see MaCod Phase 2 skeleton");
  }

  getLabelUrl(trackingNumber: string): string {
    return `${AMANA_BASE_URL}/api/v1/parcels/${encodeURIComponent(trackingNumber)}/label`;
  }

  translateWebhookEvent(raw: unknown): MoroccanCarrierStatusEvent {
    const payload = raw as AmanaWebhookPayload;
    const status = AMANA_STATUS_MAP[payload.event_code] ?? "EN_ATTENTE";
    return {
      trackingNumber: payload.tracking_number,
      status,
      eventTime: payload.timestamp,
      note: payload.event_label,
      raw,
    };
  }
}
