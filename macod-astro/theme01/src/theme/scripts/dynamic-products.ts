/**
 * Dynamic Products — fetches products from the API and renders them into
 * [data-block="dynamic_products"] containers left by BlockRenderer.
 *
 * BlockRenderer renders a placeholder div with data attributes:
 *   <div data-block="dynamic_products" data-source="featured" data-limit="4" />
 *
 * This script:
 *   1. Finds all such containers
 *   2. Fetches products from /store/products?source=featured&limit=4
 *   3. Renders a responsive grid of product cards into each container
 *
 * Self-initialising on import (same pattern as countdown.ts, cart-ui.ts).
 */

interface StoreProduct {
  id: string;
  name: string;
  handle: string;
  price: number;
  compareAtPrice?: number | null;
  images?: Array<{ src: string; altText?: string | null }>;
  hasVariants?: boolean;
  inventory?: number;
  trackInventory?: boolean;
}

async function fetchProducts(source: string, limit: number): Promise<StoreProduct[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (source === "featured") params.set("featured", "true");
    const res = await fetch(`/store/products?${params}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { data: StoreProduct[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

function renderProductCard(product: StoreProduct, currencySymbol: string): string {
  const image = product.images?.[0]?.src ?? "";
  const alt = product.images?.[0]?.altText ?? product.name;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

  return `
    <a href="/products/${product.handle}" class="block rounded-2xl overflow-hidden border" style="border-color: var(--clr-border); background: var(--clr-surface)">
      ${image ? `<img src="${image}" alt="${escapeHtml(alt)}" class="w-full aspect-square object-cover" loading="lazy" />` : ""}
      <div class="p-3">
        <div class="font-bold text-sm line-clamp-2" style="color: var(--clr-text)">${escapeHtml(product.name)}</div>
        <div class="flex items-center gap-2 mt-1">
          <span class="font-black" style="color: var(--clr-primary)">${product.price} ${currencySymbol}</span>
          ${hasDiscount ? `<span class="text-xs line-through opacity-50">${product.compareAtPrice} ${currencySymbol}</span>` : ""}
        </div>
      </div>
    </a>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function renderDynamicProducts(): Promise<void> {
  const containers = document.querySelectorAll<HTMLElement>('[data-block="dynamic_products"]');
  if (containers.length === 0) return;

  const currencySymbol = document.querySelector<HTMLElement>("#page-data")?.dataset.cur ?? "درهم";

  for (const container of containers) {
    const source = container.dataset.source ?? "featured";
    const limit = parseInt(container.dataset.limit ?? "4", 10);
    const columns = parseInt(container.dataset.columns ?? "4", 10);

    const products = await fetchProducts(source, limit);
    if (products.length === 0) {
      container.innerHTML = "";
      continue;
    }

    const grid = document.createElement("div");
    grid.className = "grid gap-3 p-4";
    grid.style.gridTemplateColumns = `repeat(${Math.min(columns, products.length)}, 1fr)`;
    grid.innerHTML = products.map((p) => renderProductCard(p, currencySymbol)).join("");

    container.innerHTML = "";
    container.appendChild(grid);
  }
}

let initialized = false;

export function initDynamicProducts(): void {
  if (initialized) return;
  initialized = true;
  void renderDynamicProducts();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDynamicProducts);
  } else {
    initDynamicProducts();
  }
}
