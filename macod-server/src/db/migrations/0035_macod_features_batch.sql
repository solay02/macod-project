-- MaCod features batch: anti-fraud, custom code, landing page builder,
-- order confirmation flow, analytics, upsell, thermal labels.
--
-- All additive. No existing tables are modified except where columns are added.
-- Rollback: DROP TABLE the new tables; ALTER TABLE ... DROP COLUMN for additions.

-- ── Feature 1: Anti-fraud ─────────────────────────────────────────────────────
-- Customer blacklist: chronic returners / fake numbers flagged across all stores.
CREATE TABLE IF NOT EXISTS customer_blacklist (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,           -- canonical local form "0661234567"
  reason TEXT NOT NULL,                  -- "fake_number" | "chronic_returner" | "spam" | "manual"
  notes TEXT,
  auto_flagged INTEGER NOT NULL DEFAULT 0, -- 1 = auto-flagged by fraud detection, 0 = manual
  return_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_phone ON customer_blacklist(phone);

-- ── Feature 3: Custom code injection ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_custom_code (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  custom_head TEXT,                       -- injected before </head> (Meta/Pinterest verification, base pixels, CSS)
  custom_body_open TEXT,                   -- injected after <body> (GTM noscript, Hotjar)
  custom_footer TEXT,                      -- injected before </body> (chat widgets, custom JS)
  updated_at TEXT NOT NULL
);

-- ── Feature 5: Order confirmation flow ───────────────────────────────────────
-- Extended order statuses for the call-center flow.
-- These are stored on the orders table directly via ALTER TABLE.
ALTER TABLE orders ADD COLUMN call_status TEXT;
-- Values: "pending" | "confirmed" | "unreachable_1" | "unreachable_2" | "unreachable_3" | "fake_number" | "cancelled"
ALTER TABLE orders ADD COLUMN call_notes TEXT;
ALTER TABLE orders ADD COLUMN called_at TEXT;
ALTER TABLE orders ADD COLUMN called_by TEXT;

-- ── Feature 7: Post-purchase upsell ───────────────────────────────────────────
-- Upsell offer attached to a product: "add X for 99 DH instead of 180 DH"
CREATE TABLE IF NOT EXISTS product_upsells (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  upsell_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  upsell_price INTEGER NOT NULL,           -- discounted price in MAD (whole dirhams)
  label TEXT,                              -- "قبل ما تخرج! خذ هذا المنتج بـ 99 درهم"
  active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_upsells_product ON product_upsells(product_id);

-- ── Feature 4: Landing page builder ───────────────────────────────────────────
-- JSON array of blocks + page template (full_width, header_footer, etc.)
-- Stored as a single JSON column because blocks are read/written as a unit
-- and the storefront renders them all in one pass.
ALTER TABLE landing_pages ADD COLUMN blocks_json TEXT;
ALTER TABLE landing_pages ADD COLUMN page_template TEXT DEFAULT 'full_width';
