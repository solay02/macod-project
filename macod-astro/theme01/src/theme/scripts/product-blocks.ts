/**
 * Product block hydration — fetches data for product_reviews, product_variant,
 * and express_checkout blocks left as placeholders by BlockRenderer.
 *
 * Self-initialising on import.
 */

interface StoreProduct {
  id: string;
  name: string;
  handle: string;
  price: number;
  compareAtPrice?: number | null;
  images?: Array<{ src: string; altText?: string | null }>;
  hasVariants?: boolean;
  variants?: Array<{ id: string; label?: string; price: number; isDefault?: boolean }>;
  inventory?: number;
  trackInventory?: boolean;
}

async function fetchProduct(productId: string): Promise<StoreProduct | null> {
  try {
    const res = await fetch(`/store/products/${productId}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data: StoreProduct };
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ── Product reviews block ─────────────────────────────────────────────────────

async function hydrateProductReviews(): Promise<void> {
  const containers = document.querySelectorAll<HTMLElement>('[data-block="product_reviews"]');
  for (const container of containers) {
    const productId = container.dataset.productId;
    if (!productId) continue;
    // Fetch reviews from the public review API
    try {
      const res = await fetch(`/api/product-reviews/${productId}`);
      const json = (await res.json()) as { data?: Array<{ author: string; rating: number; text: string; createdAt: string }> };
      const reviews = json.data ?? [];
      if (reviews.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">لا توجد تقييمات بعد</p>';
        continue;
      }
      container.innerHTML = `
        <div class="grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))">
          ${reviews.map((r) => `
            <div class="border rounded-xl p-3">
              <div class="font-bold">${escapeHtml(r.author)}</div>
              <div class="text-yellow-500">${[1,2,3,4,5].map((s) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="${s <= r.rating ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join("")}</div>
              <p class="text-sm mt-1">${escapeHtml(r.text)}</p>
            </div>
          `).join("")}
        </div>
      `;
    } catch {
      container.innerHTML = '';
    }
  }
}

// ── Product variant block ─────────────────────────────────────────────────────

async function hydrateProductVariant(): Promise<void> {
  const containers = document.querySelectorAll<HTMLElement>('[data-block="product_variant"]');
  for (const container of containers) {
    const productId = container.dataset.productId;
    if (!productId) continue;
    const product = await fetchProduct(productId);
    if (!product?.variants?.length) {
      container.innerHTML = '';
      continue;
    }
    container.innerHTML = `
      <div class="space-y-2">
        <div class="font-bold">${product.variants.length} خيارات متاحة</div>
        <div class="flex flex-wrap gap-2">
          ${product.variants.map((v, i) => `
            <button
              data-variant-id="${v.id}"
              class="variant-option px-3 py-2 rounded-xl border-2 ${i === 0 ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}"
            >
              ${escapeHtml(v.label ?? v.id)}
              <span class="text-sm font-bold ms-1">${v.price} درهم</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
    // Wire variant selection
    container.querySelectorAll<HTMLElement>(".variant-option").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".variant-option").forEach((b) => {
          b.classList.remove("border-purple-600", "bg-purple-50");
          b.classList.add("border-gray-200");
        });
        btn.classList.add("border-purple-600", "bg-purple-50");
        btn.classList.remove("border-gray-200");
        // Set the selected variant on the page data bridge
        const input = document.getElementById("variant-id-input") as HTMLInputElement | null;
        if (input) input.value = btn.dataset.variantId ?? "";
      });
    });
  }
}

// ── Express checkout block ────────────────────────────────────────────────────

async function hydrateExpressCheckout(): Promise<void> {
  const containers = document.querySelectorAll<HTMLElement>('[data-block="express_checkout"]');
  for (const container of containers) {
    const buttonText = container.dataset.buttonText ?? "تأكيد الطلب";
    const productId = document.querySelector<HTMLElement>("#page-data")?.dataset.productId ?? "";
    if (!productId) continue;

    const product = await fetchProduct(productId);
    if (!product) continue;

    const price = product.price;
    container.innerHTML = `
      <div class="rounded-2xl border p-6 max-w-md mx-auto">
        <div class="text-center mb-4">
          <div class="text-3xl font-black text-purple-600">${price} درهم</div>
          ${product.compareAtPrice ? `<div class="text-lg line-through opacity-50">${product.compareAtPrice} درهم</div>` : ""}
        </div>
        <form id="express-checkout-form" class="space-y-3">
          <input type="text" name="customerName" required placeholder="الاسم الكامل *" class="w-full p-3 border rounded-xl" />
          <input type="tel" name="phone" required placeholder="رقم الهاتف (06xxxxxxxx) *" class="w-full p-3 border rounded-xl" />
          <input type="text" name="provinceId" required placeholder="المدينة *" class="w-full p-3 border rounded-xl" />
          <input type="hidden" name="productId" value="${productId}" />
          <input type="hidden" name="productName" value="${escapeHtml(product.name)}" />
          <input type="hidden" name="pricePerUnit" value="${price}" />
          <input type="hidden" name="quantity" value="1" />
          <button type="submit" class="w-full p-4 bg-purple-600 text-white rounded-xl font-black text-lg">
            ${escapeHtml(buttonText)}
          </button>
        </form>
      </div>
    `;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Init ───────────────────────────────────────────────────────────────────────

let initialized = false;

export function initProductBlocks(): void {
  if (initialized) return;
  initialized = true;
  void hydrateProductReviews();
  void hydrateProductVariant();
  void hydrateExpressCheckout();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProductBlocks);
  } else {
    initProductBlocks();
  }
}
