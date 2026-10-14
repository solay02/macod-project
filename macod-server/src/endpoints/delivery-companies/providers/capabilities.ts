/**
 * Provider Capabilities Registry
 *
 * Central registry for all delivery provider capabilities.
 * Capabilities are extracted from test data and API documentation.
 *
 * MaCod — Morocco only. The Algerian carriers were removed.
 */

import { CATHEDIS_CAPABILITIES } from "./cathedis/capabilities";
import { AMANA_CAPABILITIES } from "./amana/capabilities";
import { SMTP_CAPABILITIES } from "./smtp/capabilities";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProviderCapabilities {
  canHomeDelivery: boolean;
  canStopDesk: boolean;
  autoValidates: boolean;
  canUpdateBeforeValidation: boolean;
  canUpdateAfterValidation: boolean;
  canDeleteBeforeValidation: boolean;
  canDeleteAfterValidation: boolean;
  canOpenPackage: boolean;
  canExchange: boolean;
  canPartialDelivery: boolean;
  supportsFragileFlag: boolean;
  canTrack: boolean;
  canAddRemarks: boolean;
  canGetRemarks: boolean;
  providesLabelOnCreate: boolean;
  labelUrlExpires: boolean;
  maxWeightKg: number | null;
  maxBulkCreate: number;
  maxBulkValidate: number;
  supportedCurrencies: string[];
  territorySystem: "wilaya_id" | "wilaya_name" | "uuid" | "province_slug";
  requiresCustomerCreation: boolean;
  supportsWebhooks: boolean;
  webhookRegistrationType: "api" | "manual" | null;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const CAPABILITY_REGISTRY: Record<string, ProviderCapabilities> = {
  cathedis: CATHEDIS_CAPABILITIES,
  amana: AMANA_CAPABILITIES,
  smtp: SMTP_CAPABILITIES,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getProviderCapabilities(code: string): ProviderCapabilities | null {
  return CAPABILITY_REGISTRY[code] ?? null;
}

export function hasCapability(
  code: string,
  capability: keyof ProviderCapabilities
): boolean {
  const caps = getProviderCapabilities(code);
  if (!caps) return false;
  const value = caps[capability];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

export function getProvidersByCapability(
  capability: keyof ProviderCapabilities,
  value: boolean | string | number = true
): string[] {
  return Object.entries(CAPABILITY_REGISTRY)
    .filter(([_, caps]) => {
      const capValue = caps[capability];
      if (typeof value === "boolean") return capValue === value;
      if (typeof value === "string") {
        if (Array.isArray(capValue)) return capValue.includes(value);
        return capValue === value;
      }
      if (typeof value === "number") {
        return typeof capValue === "number" && capValue >= value;
      }
      return false;
    })
    .map(([code]) => code);
}

export function compareProviders(
  codes: string[],
  capabilities?: Array<keyof ProviderCapabilities>
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  const capsToCompare = capabilities || Object.keys(CATHEDIS_CAPABILITIES) as Array<keyof ProviderCapabilities>;
  for (const code of codes) {
    const caps = getProviderCapabilities(code);
    if (!caps) continue;
    result[code] = {};
    for (const cap of capsToCompare) {
      result[code][cap] = caps[cap];
    }
  }
  return result;
}

export function validateAdapterCapabilities(
  adapter: { code: string; updateShipment?: unknown; deleteShipment?: unknown; addRemark?: unknown; getRemarks?: unknown; getTrackingInfo?: unknown },
  capabilities: ProviderCapabilities
): void {
  if (capabilities.canAddRemarks && !adapter.addRemark) {
    throw new Error(`${adapter.code}: canAddRemarks=true but addRemark() method not implemented`);
  }
  if (capabilities.canGetRemarks && !adapter.getRemarks) {
    throw new Error(`${adapter.code}: canGetRemarks=true but getRemarks() method not implemented`);
  }
  if (capabilities.canTrack && !adapter.getTrackingInfo) {
    throw new Error(`${adapter.code}: canTrack=true but getTrackingInfo() method not implemented`);
  }
  if ((capabilities.canUpdateBeforeValidation || capabilities.canUpdateAfterValidation) && !adapter.updateShipment) {
    throw new Error(`${adapter.code}: canUpdate*=true but updateShipment() method not implemented`);
  }
  if ((capabilities.canDeleteBeforeValidation || capabilities.canDeleteAfterValidation) && !adapter.deleteShipment) {
    throw new Error(`${adapter.code}: canDelete*=true but deleteShipment() method not implemented`);
  }
}
