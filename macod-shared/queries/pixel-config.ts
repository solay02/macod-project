import type { AppDb } from "../db/client";
import { storePixelConfig } from "../db/schema";
import { eq } from "drizzle-orm";

export type ConversionEvent = "Purchase" | "Purchase_Confirmed" | "Purchase_Delivered" | "Lead";

export async function getPixelConfig(db: AppDb, storeId?: string) {
  if (storeId) {
    return db
      .select()
      .from(storePixelConfig)
      .where(eq(storePixelConfig.storeId, storeId))
      .get();
  }
  return db
    .select()
    .from(storePixelConfig)
    .limit(1)
    .get();
}

export interface UpsertPixelConfigData {
  pixelId: string;
  adAccountName?: string | null;
  accessToken?: string;
  testEventCode?: string | null;
  conversionEvent?: ConversionEvent;
  testMode?: boolean;
  enabled?: boolean;
  /**
   * Master switch for per-landing-page pixels. Omitted keeps what is stored —
   * renaming an ad account must not silently return every landing page to the
   * store pixel.
   */
  perPageTrackingEnabled?: boolean;
  // ── Multi-platform CAPI (MaCod) ──────────────────────────────────────────
  tiktokPixelId?: string | null;
  tiktokAccessToken?: string | null;
  tiktokTestEventCode?: string | null;
  snapchatPixelId?: string | null;
  snapchatAccessToken?: string | null;
  snapchatTestEventCode?: string | null;
}

export async function upsertPixelConfig(
  db: AppDb,
  storeId: string,
  data: UpsertPixelConfigData,
) {
  const now = new Date().toISOString();
  const existing = await getPixelConfig(db, storeId);

  const accessToken = data.accessToken?.trim() || existing?.accessToken || "";
  const adAccountName =
    data.adAccountName === undefined
      ? existing?.adAccountName ?? null
      : data.adAccountName?.trim() || null;
  const testEventCode =
    data.testEventCode === undefined
      ? existing?.testEventCode ?? null
      : data.testEventCode?.trim() || null;

  if (existing) {
    return db
      .update(storePixelConfig)
      .set({
        pixelId: data.pixelId,
        adAccountName,
        accessToken,
        testEventCode,
        conversionEvent: data.conversionEvent ?? existing.conversionEvent,
        testMode: data.testMode ?? existing.testMode,
        enabled: data.enabled ?? true,
        perPageTrackingEnabled:
          data.perPageTrackingEnabled ?? existing.perPageTrackingEnabled,
        tiktokPixelId: data.tiktokPixelId ?? existing.tiktokPixelId ?? null,
        tiktokAccessToken: data.tiktokAccessToken ?? existing.tiktokAccessToken ?? null,
        tiktokTestEventCode: data.tiktokTestEventCode ?? existing.tiktokTestEventCode ?? null,
        snapchatPixelId: data.snapchatPixelId ?? existing.snapchatPixelId ?? null,
        snapchatAccessToken: data.snapchatAccessToken ?? existing.snapchatAccessToken ?? null,
        snapchatTestEventCode: data.snapchatTestEventCode ?? existing.snapchatTestEventCode ?? null,
        updatedAt: now,
      })
      .where(eq(storePixelConfig.storeId, storeId))
      .returning()
      .get();
  }

  const row = {
    id: crypto.randomUUID(),
    storeId,
    pixelId: data.pixelId,
    adAccountName,
    accessToken,
    testEventCode,
    conversionEvent: data.conversionEvent ?? "Purchase",
    testMode: data.testMode ?? false,
    enabled: data.enabled ?? true,
    perPageTrackingEnabled: data.perPageTrackingEnabled ?? false,
    tiktokPixelId: data.tiktokPixelId ?? null,
    tiktokAccessToken: data.tiktokAccessToken ?? null,
    tiktokTestEventCode: data.tiktokTestEventCode ?? null,
    snapchatPixelId: data.snapchatPixelId ?? null,
    snapchatAccessToken: data.snapchatAccessToken ?? null,
    snapchatTestEventCode: data.snapchatTestEventCode ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(storePixelConfig).values(row);
  return row;
}
