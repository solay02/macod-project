/**
 * Delivery Provider Registry
 *
 * Returns the correct DeliveryProvider adapter for a given company.
 * Add new adapters here as new companies are onboarded.
 *
 * Supported (MaCod — Morocco only):
 *   cathedis | amana | smtp
 *
 * The Algerian carriers (yalidine, zr_express, noest, ecotrack) and the
 * Sendit carrier were removed. SMTP replaces Sendit for merchants who
 * fulfill orders manually — it emails order details to the fulfillment
 * team instead of calling a carrier API.
 */

import type { DeliveryProvider } from "./types";
import { CathedisProvider } from "./cathedis/adapter";
import { AmanaProvider } from "./amana/adapter";
import { SmtpProvider } from "./smtp/adapter";

export interface ProviderCompany {
  code: string;
  apiToken: string | null;
  apiUserGuid: string | null;
  apiEndpoint: string | null;
  /** Optional JSON string for provider-specific config. */
  notes?: string | null;
}

/**
 * Get the provider adapter for a delivery company.
 * Throws if the code is unsupported or required credentials are missing.
 */
export function getProvider(company: ProviderCompany, db?: unknown): DeliveryProvider {
  switch (company.code) {
    case "cathedis": {
      if (!company.apiToken) throw new Error("Cathedis: api_token is required");
      return new CathedisProvider(company.apiToken);
    }

    case "amana": {
      if (!company.apiToken) throw new Error("Amana: api_token is required");
      return new AmanaProvider(company.apiToken);
    }

    case "smtp": {
      // SMTP carrier uses api_endpoint to store the fulfillment email address.
      if (!company.apiEndpoint) throw new Error("SMTP carrier: api_endpoint (fulfillment email) is required");
      return new SmtpProvider(company.apiEndpoint, db as never);
    }

    default:
      throw new Error(`No provider adapter for company code: "${company.code}"`);
  }
}
