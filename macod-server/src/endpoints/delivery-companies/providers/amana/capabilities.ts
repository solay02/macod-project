/**
 * Amana Provider Capabilities
 *
 * Amana (Barid Al-Maghrib) is Morocco's national postal carrier. Coverage
 * extends to every province (including rural Souss-Massa and Oriental),
 * making it the carrier of last resort for COD in remote regions.
 *
 * Confidence: MEDIUM — projected from public Amana documentation. Verify
 * against a live account before wiring into production dispatch.
 */

import type { ProviderCapabilities } from "../capabilities";

export const AMANA_CAPABILITIES: ProviderCapabilities = {
  canHomeDelivery: true,
  canStopDesk: true, // Amana post offices double as stop-desks

  autoValidates: false,
  canUpdateBeforeValidation: true,
  canUpdateAfterValidation: false,
  canDeleteBeforeValidation: true,
  canDeleteAfterValidation: false,

  canOpenPackage: false, // Registered mail is sealed
  canExchange: true,
  canPartialDelivery: false,
  supportsFragileFlag: true,

  canTrack: true,
  canAddRemarks: false, // Amana has no per-shipment remark API
  canGetRemarks: false,
  providesLabelOnCreate: true,
  labelUrlExpires: false,

  maxWeightKg: 20, // Colissimo limit
  maxBulkCreate: 100,
  maxBulkValidate: 100,

  supportedCurrencies: ["MAD"],

  territorySystem: "province_slug",
  requiresCustomerCreation: false,

  supportsWebhooks: false, // Amana tracking is pull-only (TBD)
  webhookRegistrationType: null,
};
