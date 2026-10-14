/**
 * MoroccanCarrier — contract marker for Morocco-focused delivery providers.
 *
 * This is a documentation contract layered on top of the existing
 * `DeliveryProvider` interface (macod-server/src/endpoints/delivery-companies/
 * providers/types.ts). Every Moroccan adapter MUST implement DeliveryProvider;
 * this interface adds nothing at runtime — it exists to:
 *
 *   1. Document which carriers are Morocco-specific in the type system
 *   2. Encode the invariants MaCod relies on:
 *        - amount is always in MAD
 *        - territory is keyed by morocco_provinces.id (a slug)
 *        - labels are 100×150mm thermal (A6), not A4
 *        - status webhooks speak the LIVRÉ / RETOURNÉ / REFUSÉ vocabulary
 *
 * The shape mirrors the original MaCod blueprint's `MoroccanCarrier` interface,
 * but it composes with DeliveryProvider instead of replacing it, so the
 * dispatch engine, registry, and webhook router all stay generic.
 */

import type { DeliveryProvider } from "../../macod-server/src/endpoints/delivery-companies/providers/types";

/**
 * Status string vocabulary used by Moroccan carrier webhooks.
 * Cathedis, Amana, and Sendit all converge on this French/Arabic vocabulary.
 */
export type MoroccanCarrierStatus =
  | "LIVRÉ"          // Delivered — triggers Meta/TikTok CAPI Purchase
  | "RETOURNÉ"        // Returned — inventory reconciliation
  | "REFUSÉ"          // Refused — blacklist flag
  | "EN_ATTENTE"      // Pending
  | "EN_COURS"        // In transit
  | "EXPÉDIÉ"         // Dispatched
  | "ANNULÉ";         // Cancelled

export interface MoroccanCarrierStatusEvent {
  trackingNumber: string;
  status: MoroccanCarrierStatus;
  /** ISO timestamp of the event as reported by the carrier. */
  eventTime: string;
  /** Optional human-readable detail (e.g. "Livré à la réception"). */
  note?: string;
  /** Carrier-specific raw payload, kept for audit. */
  raw: unknown;
}

/**
 * Moroccan carrier contract. Composes DeliveryProvider (the runtime contract)
 * with the Morocco-specific invariants.
 */
export interface MoroccanCarrier extends DeliveryProvider {
  /** Currency this carrier prices in. Always "MAD" for Moroccan carriers. */
  readonly currency: "MAD";

  /**
   * Translate the carrier's raw webhook payload into the MaCod status
   * vocabulary. The webhook router (macod-server/src/endpoints/webhooks/)
   * calls this on every inbound event before dispatching to the order
   * state machine.
   */
  translateWebhookEvent(raw: unknown): MoroccanCarrierStatusEvent;
}
