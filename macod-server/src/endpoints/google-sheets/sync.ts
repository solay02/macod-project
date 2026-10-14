/**
 * Google Sheets sync — pushes new orders to a Google Sheet in real-time.
 *
 * The admin configures a Google Sheets spreadsheet ID + OAuth refresh token
 * in the dashboard. When a new order is placed, this endpoint appends a row
 * with the order details to the configured sheet. The fulfillment team then
 * works directly from the Google Sheet instead of logging into MaCod.
 *
 * Endpoints:
 *   POST /api/google-sheets/sync-order    — push a single order (called by the store endpoint on order placement)
 *   POST /api/google-sheets/config        — save the sync config
 *   GET  /api/google-sheets/config        — read the current config
 *   POST /api/google-sheets/test          — test the connection by appending a test row
 *
 * Google Sheets API:
 *   - Auth: OAuth2 — exchange refresh_token for access_token
 *   - Append: POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}:append
 *   - Range: "Orders!A:Z" (appends after the last row with data)
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { storeGoogleSheetsConfig, orders, stores } from "../../../../macod-shared/db/schema";
import { eq } from "drizzle-orm";

export const googleSheetsSyncRouter = new Hono<AppContext>();

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * Exchange the stored refresh token for a fresh access token.
 * Google access tokens expire after 1 hour; the refresh token is long-lived.
 */
async function getAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth token refresh failed: ${err}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

/**
 * Append a row to the Google Sheet.
 * The row follows the column order the fulfillment team expects:
 *   Order ID | Date | Customer Name | Phone | City | Address | Product | Amount | Delivery Fee | Total | Status
 */
async function appendOrderRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  row: (string | number)[],
): Promise<void> {
  const range = `${sheetName}!A:K`;
  const url = `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets append failed: ${err}`);
  }
}

/**
 * Build the row array for an order.
 * Product details are omitted here — the fulfillment team sees them in the
 * dashboard. This row is the minimum the team needs to process the parcel.
 */
function buildOrderRow(order: typeof orders.$inferSelect): (string | number)[] {
  return [
    order.orderNumber,
    new Date(order.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Casablanca" }),
    order.customerName,
    order.phone,
    order.city ?? "",
    order.address ?? "",
    order.price,
    order.deliveryFee ?? 0,
    (order.price + (order.deliveryFee ?? 0)),
    order.status,
  ];
}

// ── Config CRUD ──────────────────────────────────────────────────────────────

const configSchema = z.object({
  spreadsheetId: z.string().min(10),
  sheetName: z.string().default("Orders"),
  refreshToken: z.string().min(10),
  enabled: z.boolean().default(true),
});

googleSheetsSyncRouter.post("/config", async (c) => {
  const body = await c.req.json();
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const store = await db.select().from(stores).limit(1).get();
  if (!store) return c.json({ error: "No store found" }, 404);

  const now = new Date().toISOString();
  await db.insert(storeGoogleSheetsConfig).values({
    storeId: store.id,
    spreadsheetId: parsed.data.spreadsheetId,
    sheetName: parsed.data.sheetName,
    refreshToken: parsed.data.refreshToken,
    enabled: parsed.data.enabled,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: storeGoogleSheetsConfig.storeId,
    set: {
      spreadsheetId: parsed.data.spreadsheetId,
      sheetName: parsed.data.sheetName,
      refreshToken: parsed.data.refreshToken,
      enabled: parsed.data.enabled,
      updatedAt: now,
    },
  });

  return c.json({ success: true });
});

googleSheetsSyncRouter.get("/config", async (c) => {
  const db = getDb(c.env.DB);
  const store = await db.select().from(stores).limit(1).get();
  if (!store) return c.json({ error: "No store found" }, 404);

  const config = await db.select().from(storeGoogleSheetsConfig).where(eq(storeGoogleSheetsConfig.storeId, store.id)).get();
  if (!config) return c.json({ enabled: false });

  return c.json({
    enabled: config.enabled,
    spreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName,
    lastSyncedAt: config.lastSyncedAt,
    // Don't expose the refresh token in the GET response
  });
});

// ── Sync a single order ───────────────────────────────────────────────────────

googleSheetsSyncRouter.post("/sync-order", async (c) => {
  const body = await c.req.json() as { orderId: string };
  if (!body.orderId) return c.json({ error: "orderId is required" }, 400);

  const db = getDb(c.env.DB);
  const store = await db.select().from(stores).limit(1).get();
  if (!store) return c.json({ error: "No store found" }, 404);

  const config = await db.select().from(storeGoogleSheetsConfig).where(eq(storeGoogleSheetsConfig.storeId, store.id)).get();
  if (!config || !config.enabled) {
    return c.json({ synced: false, reason: "not_configured" });
  }

  const order = await db.select().from(orders).where(eq(orders.id, body.orderId)).get();
  if (!order) return c.json({ error: "Order not found" }, 404);

  try {
    // Google OAuth client ID/secret come from env vars (set via wrangler secret)
    const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
    const clientSecret = c.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth client ID/secret not configured (set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET via wrangler secret)");
    }

    const accessToken = await getAccessToken(config.refreshToken, clientId, clientSecret);
    const row = buildOrderRow(order);
    await appendOrderRow(accessToken, config.spreadsheetId, config.sheetName, row);

    // Update lastSyncedAt
    await db.update(storeGoogleSheetsConfig)
      .set({ lastSyncedAt: new Date().toISOString() })
      .where(eq(storeGoogleSheetsConfig.storeId, store.id));

    return c.json({ synced: true, orderId: order.id });
  } catch (err) {
    console.error(`[google-sheets] sync failed for order ${body.orderId}:`, err);
    return c.json({
      synced: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }, 500);
  }
});

// ── Test the connection ─────────────────────────────────────────────────────

googleSheetsSyncRouter.post("/test", async (c) => {
  const db = getDb(c.env.DB);
  const store = await db.select().from(stores).limit(1).get();
  if (!store) return c.json({ error: "No store found" }, 404);

  const config = await db.select().from(storeGoogleSheetsConfig).where(eq(storeGoogleSheetsConfig.storeId, store.id)).get();
  if (!config) return c.json({ error: "No config found" }, 404);

  try {
    const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
    const clientSecret = c.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
    const accessToken = await getAccessToken(config.refreshToken, clientId, clientSecret);

    // Append a test row
    await appendOrderRow(accessToken, config.spreadsheetId, config.sheetName, [
      "TEST", new Date().toISOString(), "Test Row", "0000000000", "Test City",
      "Test Address", 0, 0, 0, "test",
    ]);

    return c.json({ success: true, message: "Test row appended successfully" });
  } catch (err) {
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }, 500);
  }
});
