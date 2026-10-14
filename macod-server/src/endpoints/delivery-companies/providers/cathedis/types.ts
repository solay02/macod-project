/**
 * Cathedis API — Request / Response Types
 * Base URL: https://api.cathedis.com (TBD — verify against live docs)
 * Auth: Bearer token in `Authorization` header
 *
 * Cathedis is the standard automated parcel generation + tracking platform in
 * Morocco. The API is REST/JSON. The shapes below are projected from public
 * Cathedis documentation and must be verified against a live account before
 * the adapter is wired into production dispatch.
 *
 * MaCod Phase 2 skeleton — these types are the contract the adapter targets
 * but the adapter methods currently throw NotImplementedError until the
 * account is provisioned and the endpoint URLs are confirmed.
 */

// ─── Create Shipment ─────────────────────────────────────────────────────────

export interface CathedisCreateShipmentRequest {
  /** Order reference shown on the label. */
  reference: string;
  /** Customer full name. */
  client_name: string;
  /** Customer phone (E.164 or local Moroccan form). */
  phone: string;
  /** Optional second phone. */
  phone_2?: string;
  /** Street-level address. */
  address: string;
  /** morocco_provinces.id slug (e.g. "casablanca"). */
  province_id: string;
  /** Optional region slug — derived server-side when omitted. */
  region_id?: string;
  /** COD amount in MAD (whole dirhams). */
  amount: number;
  /** Currency — always "MAD" for Cathedis. */
  currency: "MAD";
  /** Product description printed on the label. */
  product_description: string;
  /** 0 = home delivery, 1 = stop-desk. */
  stop_desk: 0 | 1;
  /** Stop-desk station code (required when stop_desk=1). */
  station_code?: string;
  /** Parcel weight in kg. */
  weight?: number;
  /** Whether the customer may open the parcel before paying. */
  can_open?: boolean;
  /** Optional merchant remarks. */
  remarks?: string;
}

export interface CathedisCreateShipmentResponse {
  /** Cathedis tracking number (e.g. "CATH-2026-00123456"). */
  tracking_number: string;
  /** URL of the printable label PDF (100×150mm thermal). */
  label_url?: string;
  /** Status as reported by Cathedis ("pending" on creation). */
  status: string;
}

// ─── Cancel Shipment ──────────────────────────────────────────────────────────

export interface CathedisCancelShipmentResponse {
  success: boolean;
  message?: string;
}

// ─── Tracking ────────────────────────────────────────────────────────────────

export interface CathedisTrackingEvent {
  /** Cathedis event key (e.g. "delivered", "returned", "refused"). */
  event_key: string;
  /** Human-readable French label (e.g. "Livré à la réception"). */
  event_label: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Optional city where the event occurred. */
  location?: string;
}

export interface CathedisTrackingResponse {
  tracking_number: string;
  current_status: string;
  events: CathedisTrackingEvent[];
}

// ─── Stop Desks ──────────────────────────────────────────────────────────────

export interface CathedisStopDesk {
  code: string;
  name: string;
  address: string;
  /** morocco_provinces.id slug. */
  province_id: string;
  phones?: string[];
}

export interface CathedisStopDesksResponse {
  desks: CathedisStopDesk[];
}
