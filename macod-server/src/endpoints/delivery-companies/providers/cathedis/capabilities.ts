/**
 * Cathedis Provider Capabilities
 *
 * Projected from Cathedis' public API documentation. Confidence: MEDIUM — the
 * capability matrix is the most stable part of a carrier contract, but every
 * value here must be verified against a live account before the adapter is
 * wired into production dispatch.
 *
 * Source of truth for the "what Cathedis can do" answer behind the dispatch
 * engine. If a value here is wrong, either a feature is silently hidden from
 * merchants (false negative) or the dispatch UI will offer an action the
 * carrier rejects (false positive, fails at runtime).
 */

import type { ProviderCapabilities } from "../capabilities";

export const CATHEDIS_CAPABILITIES: ProviderCapabilities = {
  // ─── Delivery Types ───────────────────────────────────────────────────
  canHomeDelivery: true,
  canStopDesk: true,

  // ─── Lifecycle ────────────────────────────────────────────────────────
  autoValidates: false, // Cathedis has a separate validate step
  canUpdateBeforeValidation: true,
  canUpdateAfterValidation: false,
  canDeleteBeforeValidation: true,
  canDeleteAfterValidation: false,

  // ─── Package Options ──────────────────────────────────────────────────
  canOpenPackage: true, // COD box-opening is standard in Morocco
  canExchange: true,
  canPartialDelivery: false, // TBD — verify
  supportsFragileFlag: true,

  // ─── Tracking & Communication ─────────────────────────────────────────
  canTrack: true,
  canAddRemarks: true,
  canGetRemarks: false, // TBD
  providesLabelOnCreate: true, // Cathedis returns label_url in create response
  labelUrlExpires: false, // Permanent URL behind auth

  // ─── Limits ───────────────────────────────────────────────────────────
  maxWeightKg: 30, // TBD — verify against live docs
  maxBulkCreate: 50, // TBD — verify
  maxBulkValidate: 50,

  supportedCurrencies: ["MAD"],

  // ─── Territory ────────────────────────────────────────────────────────
  territorySystem: "province_slug", // keys off morocco_provinces.id
  requiresCustomerCreation: false,

  // ─── Webhooks ─────────────────────────────────────────────────────────
  supportsWebhooks: true, // Cathedis pushes LIVRÉ/RETOURNÉ/REFUSÉ events
  webhookRegistrationType: "manual", // Configure webhook URL in Cathedis dashboard
};
