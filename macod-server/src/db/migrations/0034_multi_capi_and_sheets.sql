-- TikTok + Snapchat CAPI config + Google Sheets sync config.
-- (MaCod Phase: multi-platform CAPI + Google Sheets sync)
--
-- Adds TikTok and Snapchat pixel/token columns to store_pixel_config so the
-- CAPI workflow can fire Purchase events to all three platforms (Meta, TikTok,
-- Snapchat) when an order is delivered. Also adds a Google Sheets config table
-- for real-time order sync.
--
-- All columns are nullable — a store that hasn't configured TikTok/Snapchat
-- just gets NULL, and the CAPI workflow skips that platform silently.
-- Rollback: ALTER TABLE store_pixel_config DROP COLUMN tiktok_pixel_id; etc.

-- ── TikTok + Snapchat columns on store_pixel_config ─────────────────────────
ALTER TABLE store_pixel_config ADD COLUMN tiktok_pixel_id TEXT;
ALTER TABLE store_pixel_config ADD COLUMN tiktok_access_token TEXT;
ALTER TABLE store_pixel_config ADD COLUMN tiktok_test_event_code TEXT;

ALTER TABLE store_pixel_config ADD COLUMN snapchat_pixel_id TEXT;
ALTER TABLE store_pixel_config ADD COLUMN snapchat_access_token TEXT;
ALTER TABLE store_pixel_config ADD COLUMN snapchat_test_event_code TEXT;

-- ── Google Sheets sync config ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_google_sheets_config (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  -- The Google Sheets spreadsheet ID (from the URL: /d/<id>/edit)
  spreadsheet_id TEXT NOT NULL,
  -- The sheet/tab name (default: "Orders")
  sheet_name TEXT NOT NULL DEFAULT 'Orders',
  -- OAuth2 refresh token for the Google Sheets API (stored encrypted in production)
  refresh_token TEXT NOT NULL,
  -- Whether sync is enabled
  enabled INTEGER NOT NULL DEFAULT 1,
  -- Last sync timestamp (for retry/dedup)
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
