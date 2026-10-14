/**
 * Post-purchase upsell — fetches the upsell offer for the product the shopper
 * just ordered and renders a 1-click "Add" card on the thank-you page.
 *
 * The offer card shows: product image, name, discounted price (with strikethrough
 * original price), and a button that calls /api/upsell/order/:orderId to add
 * the upsell to the existing order.
 *
 * Self-initialising on import.
 */

interface UpsellOffer {
  id: string;
  label: string | null;
  upsellPrice: number;
  upsellProduct: {
    id: string;
    name: string;
    handle: string;
    price: number;
  };
}

async function fetchUpsell(productId: string): Promise<UpsellOffer[]> {
  try {
    const res = await fetch(`/api/upsell/product/${productId}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { data: UpsellOffer[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function addUpsellToOrder(orderId: string, offer: UpsellOffer): Promise<boolean> {
  try {
    const res = await fetch(`/api/upsell/order/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upsellProductId: offer.upsellProduct.id,
        upsellPrice: offer.upsellPrice,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function renderUpsell(): Promise<void> {
  const container = document.getElementById("upsell-container");
  if (!container) return;

  const orderId = container.dataset.orderId;
  const productId = container.dataset.productId;
  if (!orderId || !productId) return;

  const offers = await fetchUpsell(productId);
  if (offers.length === 0) {
    container.innerHTML = "";
    return;
  }

  const offer = offers[0]; // Show the first (highest priority) offer
  const hasDiscount = offer.upsellProduct.price > offer.upsellPrice;
  const savings = hasDiscount ? offer.upsellProduct.price - offer.upsellPrice : 0;

  container.innerHTML = `
    <div class="rounded-2xl border-2 border-purple-200 overflow-hidden" style="background: color-mix(in srgb, var(--clr-primary) 3%, white)">
      <div class="p-4">
        <div class="text-center mb-3">
          <span class="inline-block bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-black">
            عرض خاص قبل ما تخرج
          </span>
        </div>
        <h3 class="font-black text-lg text-center mb-2">${escapeHtml(offer.upsellProduct.name)}</h3>
        ${offer.label ? `<p class="text-sm text-center text-gray-600 mb-3">${escapeHtml(offer.label)}</p>` : ""}
        <div class="flex items-center justify-center gap-3 mb-4">
          ${hasDiscount ? `<span class="text-xl line-through opacity-40">${offer.upsellProduct.price} درهم</span>` : ""}
          <span class="text-3xl font-black text-purple-600">${offer.upsellPrice} درهم</span>
        </div>
        ${hasDiscount ? `<div class="text-center text-sm text-green-600 font-bold mb-3">وفّر ${savings} درهم</div>` : ""}
        <button
          id="upsell-add-btn"
          class="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-[0.98]"
          style="background: var(--clr-primary); box-shadow: var(--shadow-primary)"
        >
          أضف للطلب
        </button>
      </div>
    </div>
  `;

  const btn = document.getElementById("upsell-add-btn");
  btn?.addEventListener("click", async () => {
    btn.textContent = "جاري الإضافة...";
    btn.setAttribute("disabled", "true");
    const success = await addUpsellToOrder(orderId, offer);
    if (success) {
      container.innerHTML = `
        <div class="rounded-2xl border-2 border-green-200 p-6 text-center bg-green-50">
          <div class="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center bg-green-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3 class="font-black text-lg">تمت الإضافة!</h3>
          <p class="text-sm text-gray-600 mt-1">${escapeHtml(offer.upsellProduct.name)} أُضيف لطلبك</p>
        </div>
      `;
    } else {
      btn.textContent = "أضف للطلب";
      btn.removeAttribute("disabled");
      btn.style.background = "#dc2626";
      btn.textContent = "فشل — حاول مرة أخرى";
    }
  });
}

let initialized = false;

export function initUpsell(): void {
  if (initialized) return;
  initialized = true;
  void renderUpsell();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUpsell);
  } else {
    initUpsell();
  }
}
