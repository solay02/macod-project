/**
 * Amana (Barid Al-Maghrib) API — Request / Response Types
 * Base URL: https://api.amana.ma (TBD — verify against live docs)
 * Auth: Basic auth (client_id + client_secret) OR Bearer token — TBD
 *
 * Amana is Morocco's national postal service and the cheapest carrier for
 * stop-desk deliveries to remote provinces. The API supports both REST/JSON
 * and a legacy SOAP/XML interface; this adapter targets the REST surface.
 *
 * MaCod Phase 2 skeleton — shapes projected from public Amana documentation
 * and must be verified against a live account before production use.
 */

// ─── Create Shipment ─────────────────────────────────────────────────────────

export interface AmanaCreateShipmentRequest {
  reference: string;
  client_name: string;
  phone: string;
  phone_2?: string;
  address: string;
  /** morocco_provinces.id slug. Amana's internal city list maps onto ours. */
  province_id: string;
  /** COD amount in MAD (whole dirhams). */
  amount: number;
  currency: "MAD";
  product_description: string;
  /** "home" | "stop_desk" */
  delivery_mode: "home" | "stop_desk";
  station_code?: string;
  weight?: number;
  can_open?: boolean;
  remarks?: string;
  /** Amana-specific: registered-mail category (LR/Colissimo/etc.). */
  service_code?: string;
}

export interface AmanaCreateShipmentResponse {
  tracking_number: string;
  label_url?: string;
  status: string;
  /** Amana-internal barcode for the registered-mail subsystem. */
  barcode?: string;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export interface AmanaCancelShipmentResponse {
  success: boolean;
  message?: string;
}

// ─── Tracking ────────────────────────────────────────────────────────────────

export interface AmanaTrackingEvent {
  event_code: string;       // "PCH" (dispatched), "DLV" (delivered), "RTN", "REF"
  event_label: string;      // French label
  timestamp: string;
  office?: string;          // Post office location
}

export interface AmanaTrackingResponse {
  tracking_number: string;
  current_status: string;
  events: AmanaTrackingEvent[];
}

// ─── Stop Desks (post offices) ──────────────────────────────────────────────

export interface AmanaStopDesk {
  code: string;
  name: string;
  address: string;
  province_id: string;
  /** Amana-specific: postal code (Barid Al-Maghrib uses 5-digit codes). */
  postal_code?: string;
}
