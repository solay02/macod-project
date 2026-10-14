/**
 * Local Development Seed Script
 *
 * Seeds the local D1 database with:
 *   - Store record + matching store API key
 *   - 4 product categories
 *   - 6 products (mix of simple + variants, some featured) — real UUID ids
 *   - Product images served from the store's own R2 media domain (seed/ folder)
 *
 * Product ids are REAL UUIDs (crypto.randomUUID) — the same format production
 * queries generate — so MCP tools and API clients see one consistent id shape.
 *
 * Usage:
 *   node scripts/seed-local.mjs            # local D1 (.wrangler-shared)
 *   node scripts/seed-local.mjs --remote   # remote Cloudflare D1
 *
 * Reads STORE_API_KEY from $STORE_API_KEY, macod-astro/theme01/.dev.vars, or a
 * dev default (in that order).
 * Safe to run multiple times — uses INSERT OR REPLACE throughout.
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import path from "path";
import { getCloudEnv } from "./cloud-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const remote = process.argv.includes("--remote");
const { dbName } = getCloudEnv();

// ── 1. Resolve the store API key ────────────────────────────────────────────
// Precedence: $STORE_API_KEY env var → macod-astro/theme01/.dev.vars → dev default.
const devVarsPath = path.resolve(root, "../macod-astro/theme01/.dev.vars");
let rawKey = process.env.STORE_API_KEY;
if (rawKey) {
  console.log("[seed-local] Using STORE_API_KEY from environment");
} else {
  try {
    const content = readFileSync(devVarsPath, "utf8");
    const match = content.match(/^STORE_API_KEY=(.+)$/m);
    if (match) rawKey = match[1].trim();
  } catch { /* fall through to default */ }
}
if (!rawKey) {
  console.warn("[seed-local] STORE_API_KEY not found (env or macod-astro/theme01/.dev.vars). Using a dev default key.");
  console.warn("             Set STORE_API_KEY or create .dev.vars to use your own key.");
  rawKey = "macod-dev-store-key";
}

// ── 2. Compute SHA-256 hash (matches storeAuthMiddleware) ─────────────────────
const keyHash = createHash("sha256").update(rawKey).digest("hex");

const ts      = new Date().toISOString();
const storeId = "store-local-dev";
const keyId   = "key-local-dev";

// ── 3. Seed data ──────────────────────────────────────────────────────────────
// Real UUIDs — deterministic per run is unnecessary; readability comes from
// names/handles, ids match what production queries generate.
const uuid = () => crypto.randomUUID();

const categories = [
  { id: "cat-vests",    name: "سترات",      slug: "vests",      position: 1 },
  { id: "cat-tshirts",  name: "تيشيرتات",   slug: "t-shirts",   position: 2 },
  { id: "cat-jeans",    name: "جينز",       slug: "jeans",      position: 3 },
  { id: "cat-hoodies",  name: "هوديات",     slug: "hoodies",    position: 4 },
];

// 6 products across 2 categories. 3 featured. Images are the store's own
// media-domain objects (seed/ folder in R2) — no third-party placeholders.
const MEDIA = "https://media.macod.store/seed";

const products = [
  // ── cat-vests: سترات ──
  {
    id: uuid(), name: "سترة كاجوال سوداء", handle: "veste-noir-casual",
    description: "سترة سوداء أنيقة بتصميم عصري وقماش عالي الجودة. مثالية للإطلالات اليومية.",
    price: 249, compareAtPrice: 349, categoryId: "cat-vests",
    hasVariants: 1, inventory: 0, trackInventory: 0,
    storeFeatured: 1, tags: '["سترة","كاجوال"]',
    variantOptions: JSON.stringify([
      { name: "المقاس", values: [{ value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }] },
    ]),
    images: [`${MEDIA}/beige_crossbody_bag_option_1.webp`, `${MEDIA}/beige_crossbody_bag_option_2.webp`],
  },
  {
    id: uuid(), name: "سترة جينز كلاسيك", handle: "veste-jean-classic",
    description: "سترة جينز كلاسيكية بقصة مريحة ولون عصري. تناسب جميع الإطلالات.",
    price: 299, compareAtPrice: null, categoryId: "cat-vests",
    hasVariants: 0, inventory: 25, trackInventory: 1,
    storeFeatured: 0, tags: '["سترة","جينز"]',
    variantOptions: null,
    images: [`${MEDIA}/White-Insulated-Bottle.webp`],
  },
  // ── cat-tshirts: تيشيرتات ──
  {
    id: uuid(), name: "تيشيرت قطن أبيض", handle: "tshirt-blanc-coton",
    description: "تيشيرت قطن أبيض ناعم ومريح. قماش فاخر 100% قطن. مقاسات متعددة.",
    price: 99, compareAtPrice: 149, categoryId: "cat-tshirts",
    hasVariants: 1, inventory: 0, trackInventory: 0,
    storeFeatured: 1, tags: '["تيشيرت","قطن"]',
    variantOptions: JSON.stringify([
      { name: "المقاس", values: [{ value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }] },
    ]),
    images: [`${MEDIA}/watch_product_option_2.webp`, `${MEDIA}/watch_product_option_2%20(1).webp`],
  },
  {
    id: uuid(), name: "تيشيرت أوفر سايز", handle: "tshirt-oversize",
    description: "تيشيرت أوفر سايز عصري بتصميم أنيق وقماش عالي الجودة. الإطلالة الأكثر رواجاً.",
    price: 129, compareAtPrice: 179, categoryId: "cat-tshirts",
    hasVariants: 0, inventory: 40, trackInventory: 1,
    storeFeatured: 1, tags: '["تيشيرت","أوفر سايز"]',
    variantOptions: null,
    images: [`${MEDIA}/sleek-headphones.webp`],
  },
  // ── cat-jeans: جينز ──
  {
    id: uuid(), name: "جينز سليم فيت أزرق", handle: "jean-slim-bleu",
    description: "جينز سليم فيت بلون أزرق كلاسيكي. قماش مرن ومتين بقصة عصرية.",
    price: 199, compareAtPrice: 279, categoryId: "cat-jeans",
    hasVariants: 1, inventory: 0, trackInventory: 0,
    storeFeatured: 1, tags: '["جينز","سليم"]',
    variantOptions: JSON.stringify([
      { name: "المقاس", values: [{ value: "30" }, { value: "32" }, { value: "34" }, { value: "36" }] },
    ]),
    images: [`${MEDIA}/beige_crossbody_bag_option_1.webp`, `${MEDIA}/watch_product_option_2.webp`],
  },
  {
    id: uuid(), name: "جينز واسع كاجوال", handle: "jean-wide-casual",
    description: "جينز واسع بتصميم كاجوال عصري. مريح للارتداء اليومي.",
    price: 229, compareAtPrice: null, categoryId: "cat-jeans",
    hasVariants: 0, inventory: 18, trackInventory: 1,
    storeFeatured: 0, tags: '["جينز","كاجوال"]',
    variantOptions: null,
    images: [`${MEDIA}/White-Insulated-Bottle.webp`],
  },
  // ── cat-hoodies: هوديات ──
  {
    id: uuid(), name: "هودي أسود فاخر", handle: "hoodie-noir-premium",
    description: "هودي أسود فاخر بقماش سميك ودافئ. تصميم بسيط وأنيق يناسب الجميع.",
    price: 199, compareAtPrice: 299, categoryId: "cat-hoodies",
    hasVariants: 1, inventory: 0, trackInventory: 0,
    storeFeatured: 1, tags: '["هودي","أسود"]',
    variantOptions: JSON.stringify([
      { name: "المقاس", values: [{ value: "S" }, { value: "M" }, { value: "L" }, { value: "XL" }] },
    ]),
    images: [`${MEDIA}/sleek-headphones.webp`, `${MEDIA}/beige_crossbody_bag_option_2.webp`],
  },
  {
    id: uuid(), name: "هودي بيج كاجوال", handle: "hoodie-beige-casual",
    description: "هودي بيج بتصميم كاجوال مريح. مثالي للأجواء الباردة.",
    price: 219, compareAtPrice: null, categoryId: "cat-hoodies",
    hasVariants: 0, inventory: 22, trackInventory: 1,
    storeFeatured: 1, tags: '["هودي","بيج"]',
    variantOptions: null,
    images: [`${MEDIA}/watch_product_option_2.webp`],
  },
];

// Variants for products with hasVariants=1 — one variant per option image.
// product references resolved by index in the products array.
const variants = [
  // Product 0: سترة كاجوال سوداء (4 sizes)
  { productIndex: 0, optionIndex: 0, variations: { "المقاس": "S" }, price: 249, compareAtPrice: 349, inventory: 5,  isDefault: 0, imageIndex: 0 },
  { productIndex: 0, optionIndex: 1, variations: { "المقاس": "M" }, price: 249, compareAtPrice: 349, inventory: 8,  isDefault: 1, imageIndex: 0 },
  { productIndex: 0, optionIndex: 2, variations: { "المقاس": "L" }, price: 249, compareAtPrice: 349, inventory: 6,  isDefault: 0, imageIndex: 1 },
  { productIndex: 0, optionIndex: 3, variations: { "المقاس": "XL" }, price: 249, compareAtPrice: 349, inventory: 3,  isDefault: 0, imageIndex: 1 },
  // Product 2: تيشيرت قطن أبيض (4 sizes)
  { productIndex: 2, optionIndex: 0, variations: { "المقاس": "S" }, price: 99, compareAtPrice: 149, inventory: 10, isDefault: 0, imageIndex: 0 },
  { productIndex: 2, optionIndex: 1, variations: { "المقاس": "M" }, price: 99, compareAtPrice: 149, inventory: 15, isDefault: 1, imageIndex: 0 },
  { productIndex: 2, optionIndex: 2, variations: { "المقاس": "L" }, price: 99, compareAtPrice: 149, inventory: 12, isDefault: 0, imageIndex: 1 },
  { productIndex: 2, optionIndex: 3, variations: { "المقاس": "XL" }, price: 99, compareAtPrice: 149, inventory: 7,  isDefault: 0, imageIndex: 1 },
  // Product 4: جينز سليم فيت (4 sizes)
  { productIndex: 4, optionIndex: 0, variations: { "المقاس": "30" }, price: 199, compareAtPrice: 279, inventory: 4, isDefault: 0, imageIndex: 0 },
  { productIndex: 4, optionIndex: 1, variations: { "المقاس": "32" }, price: 199, compareAtPrice: 279, inventory: 6, isDefault: 1, imageIndex: 0 },
  { productIndex: 4, optionIndex: 2, variations: { "المقاس": "34" }, price: 199, compareAtPrice: 279, inventory: 5, isDefault: 0, imageIndex: 1 },
  { productIndex: 4, optionIndex: 3, variations: { "المقاس": "36" }, price: 199, compareAtPrice: 279, inventory: 2, isDefault: 0, imageIndex: 1 },
  // Product 6: هودي أسود فاخر (4 sizes)
  { productIndex: 6, optionIndex: 0, variations: { "المقاس": "S" }, price: 199, compareAtPrice: 299, inventory: 5,  isDefault: 0, imageIndex: 0 },
  { productIndex: 6, optionIndex: 1, variations: { "المقاس": "M" }, price: 199, compareAtPrice: 299, inventory: 9,  isDefault: 1, imageIndex: 0 },
  { productIndex: 6, optionIndex: 2, variations: { "المقاس": "L" }, price: 199, compareAtPrice: 299, inventory: 7,  isDefault: 0, imageIndex: 1 },
  { productIndex: 6, optionIndex: 3, variations: { "المقاس": "XL" }, price: 199, compareAtPrice: 299, inventory: 4,  isDefault: 0, imageIndex: 1 },
];

// Images resolved from product definitions; positions follow array order.
const images = products.flatMap((p) =>
  p.images.map((src, index) => ({
    id: uuid(),
    productId: p.id,
    src,
    position: index,
  })),
);
const imageIdByProductAndSrc = new Map(images.map((img) => [`${img.productId}:${img.src}`, img.id]));

// ── 4. Build all SQL statements ───────────────────────────────────────────────
const statements = [];

// Store + API key
statements.push(`INSERT OR REPLACE INTO stores (id, name, domain, theme_id, primary_color, accent_color, bg_color, font_family, lang, currency, currency_symbol, reviews_enabled, status, created_at, updated_at) VALUES ('${storeId}', 'ezzarostyle', NULL, 'theme01', '#1a1a1a', '#c9a227', '#fafafa', 'Cairo, sans-serif', 'ar', 'MAD', 'د.م.', 1, 'active', '${ts}', '${ts}')`);
statements.push(`INSERT OR REPLACE INTO store_api_keys (id, store_id, key_hash, name, created_at) VALUES ('${keyId}', '${storeId}', '${keyHash}', 'default', '${ts}')`);

// Categories
for (const c of categories) {
  statements.push(`INSERT OR REPLACE INTO product_categories (id, name, slug, description, parent_id, image_url, position, created_at, updated_at) VALUES ('${c.id}', '${c.name}', '${c.slug}', NULL, NULL, NULL, ${c.position}, '${ts}', '${ts}')`);
}

// Products
for (const p of products) {
  const desc    = p.description.replace(/'/g, "''");
  const name    = p.name.replace(/'/g, "''");
  const tags    = p.tags.replace(/'/g, "''");
  const varOpts = p.variantOptions ? `'${p.variantOptions.replace(/'/g, "''")}'` : "NULL";
  const compAt  = p.compareAtPrice !== null ? p.compareAtPrice : "NULL";
  statements.push(
    `INSERT OR REPLACE INTO products (id, name, description, handle, currency, price, compare_at_price, cost_price, has_variants, variant_options, sku, inventory, track_inventory, category_id, tags, visibility, status, show_in_store, store_featured, deleted_at, created_at, updated_at) VALUES ('${p.id}', '${name}', '${desc}', '${p.handle}', 'DZD', ${p.price}, ${compAt}, NULL, ${p.hasVariants}, ${varOpts}, NULL, ${p.inventory}, ${p.trackInventory}, '${p.categoryId}', '${tags}', 1, 'ACTIVE', 1, ${p.storeFeatured}, NULL, '${ts}', '${ts}')`
  );
}

// Variants — linked to their product's option image when one exists.
for (const v of variants) {
  const product = products[v.productIndex];
  const variations = JSON.stringify(v.variations).replace(/'/g, "''");
  const compAt = v.compareAtPrice !== null ? v.compareAtPrice : "NULL";
  const variantId = uuid();
  const variantSku = `${product.handle}-${v.optionIndex + 1}`;
  const imgId = imageIdByProductAndSrc.get(`${product.id}:${product.images[v.imageIndex]}`) ?? null;
  statements.push(
    `INSERT OR REPLACE INTO product_variants (id, product_id, variations, currency, price, compare_at_price, sku, inventory, is_default, active, position, image_id, created_at, updated_at) VALUES ('${variantId}', '${product.id}', '${variations}', 'DZD', ${v.price}, ${compAt}, '${variantSku}', ${v.inventory}, ${v.isDefault}, 1, ${v.optionIndex}, ${imgId !== null ? `'${imgId}'` : "NULL"}, '${ts}', '${ts}')`
  );
}

// Images
for (const img of images) {
  statements.push(
    `INSERT OR REPLACE INTO product_images (id, product_id, src, r2_key, src_sm, src_md, src_lg, alt_text, width, height, type, position, created_at, updated_at) VALUES ('${img.id}', '${img.productId}', '${img.src}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ${img.position}, '${ts}', '${ts}')`
  );
}

// ── 5. Execute ────────────────────────────────────────────────────────────────
function run(sql) {
  const target = remote ? "--remote -y" : "--local --persist-to ../.wrangler-shared";
  execSync(
    `npx wrangler d1 execute ${dbName} ${target} --command "${sql.replace(/"/g, '\\"')}"`,
    { cwd: root, stdio: "pipe" }
  );
}

let ok = 0;
for (const stmt of statements) {
  try {
    run(stmt);
    ok++;
  } catch (err) {
    console.error(`[seed-local] ✗ Failed: ${stmt.slice(0, 80)}...`);
    console.error("  " + (err.stderr?.toString().split("\n").pop() ?? err.message));
  }
}

console.log(`\n[seed-local] ✓ ${ok}/${statements.length} statements executed\n`);
console.log(`  store      : ${storeId} (متجر التطوير)`);
console.log(`  categories : ${categories.length}`);
console.log(`  products   : ${products.length} (${products.filter(p => p.storeFeatured).length} featured)`);
console.log(`  variants   : ${variants.length}`);
console.log(`  images     : ${images.length}`);
console.log(`\n  rawKey     : ${rawKey.slice(0, 24)}...`);
console.log(`\n  target     : ${remote ? `remote D1 (${dbName})` : "local D1 (.wrangler-shared)"}\n`);
