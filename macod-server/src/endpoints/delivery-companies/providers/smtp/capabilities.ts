/**
 * SMTP Carrier Capabilities
 *
 * The SMTP carrier is a "manual dispatch" carrier — it emails order details
 * to the fulfillment team instead of calling a carrier API. This changes
 * the capability matrix significantly:
 *   - No stop-desk network (the team handles delivery)
 *   - No tracking (merchant updates status manually)
 *   - No label generation (the email IS the notification)
 *   - No real validation step (email is sent on create)
 *   - No webhooks from a carrier (but email delivery events map to statuses)
 */

import type { ProviderCapabilities } from "../capabilities";

export const SMTP_CAPABILITIES: ProviderCapabilities = {
  canHomeDelivery: true,
  canStopDesk: false, // no stop-desk network — team handles all deliveries

  autoValidates: true, // email is sent on create; no separate validate step
  canUpdateBeforeValidation: true,
  canUpdateAfterValidation: true, // updates are no-ops (merchant edits from dashboard)
  canDeleteBeforeValidation: true,
  canDeleteAfterValidation: true, // delete is a no-op (can't unsend email)

  canOpenPackage: true, // the team decides this, not the carrier
  canExchange: true,
  canPartialDelivery: false,
  supportsFragileFlag: false, // irrelevant — no carrier packaging

  canTrack: false, // no carrier tracking — merchant updates manually
  canAddRemarks: true, // sends a follow-up email
  canGetRemarks: false,
  providesLabelOnCreate: false, // no label — the email IS the notification
  labelUrlExpires: false,

  maxWeightKg: null, // no limit — the team chooses the courier
  maxBulkCreate: 1, // one email per order
  maxBulkValidate: 1,

  supportedCurrencies: ["MAD"],

  territorySystem: "province_slug",
  requiresCustomerCreation: false,

  supportsWebhooks: true, // email delivery events (bounce/complaint) map to statuses
  webhookRegistrationType: "api", // email provider pushes delivery events
};
