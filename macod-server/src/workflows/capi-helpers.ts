import {
  ConversionStage,
  MetaEventName,
  ConversionMode,
  ConversionDecision,
  resolveConversionForStage,
  getCapiWorkflowId,
} from "./conversion-model";

export * from "./conversion-model";

/**
 * Determines whether to trigger CodCapiWorkflow for a given status transition.
 * Call this after updateOrderStatus() resolves.
 */
export function shouldTriggerCapiConfirmed(newStatus: string): boolean {
  return newStatus === "confirmed";
}

export function shouldTriggerCapiPurchase(
  newStatus: string,
): boolean {
  return newStatus === "delivered";
}

export interface CapiDispatchConfig {
  enabled: boolean;
  accessToken: string;
  conversionEvent: ConversionMode;
  testMode: boolean;
  testEventCode: string | null;
}

export type CapiSkipReason =
  | "tracking-disabled"
  | "no-access-token"
  | "conversion-event-mismatch";

export type CapiDispatch =
  | { send: true; testEventCode: string | null }
  | { send: false; reason: CapiSkipReason; message: string };

/**
 * Single gate for every CAPI send: the store's tracking must be enabled, carry
 * an access token, and the merchant must have chosen `eventName` as the
 * conversion event for the given business stage.
 */
export function resolveCapiDispatch(
  config: CapiDispatchConfig | null | undefined,
  eventName: MetaEventName,
  stage?: ConversionStage,
): CapiDispatch {
  if (!config?.enabled) {
    return { send: false, reason: "tracking-disabled", message: "Tracking disabled in store settings" };
  }
  if (!config.accessToken) {
    return {
      send: false,
      reason: "no-access-token",
      message: "No CAPI access token — configure it in Settings → Tracking",
    };
  }

  if (stage) {
    const decision = resolveConversionForStage(config.conversionEvent, stage);
    if (!decision.shouldFire || decision.eventName !== eventName) {
      return {
        send: false,
        reason: "conversion-event-mismatch",
        message: decision.reason ?? `Conversion event is set to ${config.conversionEvent} — ${eventName} not sent at stage ${stage}`,
      };
    }
  } else {
    const allowed =
      (eventName === "Purchase" &&
        (config.conversionEvent === "Purchase" ||
          config.conversionEvent === "Purchase_Confirmed" ||
          config.conversionEvent === "Purchase_Delivered")) ||
      (eventName === "Lead" && config.conversionEvent === "Lead");

    if (!allowed) {
      return {
        send: false,
        reason: "conversion-event-mismatch",
        message: `Conversion event is set to ${config.conversionEvent} — ${eventName} not sent`,
      };
    }
  }

  return { send: true, testEventCode: config.testMode ? config.testEventCode : null };
}
