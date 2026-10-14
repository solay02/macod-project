/**
 * Dynamic WhatsApp button — context-aware pre-fill.
 *
 * Grabs the current product name + price + shopper's typed city and builds
 * a pre-filled wa.me link. Shown as a floating button on product pages
 * and landing pages.
 *
 * The message is in Moroccan Darija:
 *   "السلام عليكم بغيت نسول على منتج [اسم المنتج] بـ [السعر] درهم، واش مازال متوفر؟"
 */

interface WhatsAppContext {
  productName?: string;
  price?: number;
  city?: string;
  storeName?: string;
}

/**
 * Build the pre-filled wa.me link.
 * Expects the merchant's WhatsApp number in E.164 (without +).
 */
export function buildDynamicWhatsAppUrl(
  merchantPhone: string,
  ctx: WhatsAppContext,
): string {
  const parts: string[] = ["السلام عليكم"];

  if (ctx.storeName) parts.push(`معاك ${ctx.storeName}`);

  if (ctx.productName) {
    parts.push(`بغيت نسول على منتج ${ctx.productName}`);
    if (ctx.price) parts.push(`بـ ${ctx.price} درهم`);
    parts.push("واش مازال متوفر؟");
  } else {
    parts.push("بغيت نسول على منتجاتكم");
  }

  if (ctx.city) parts.push(`التوصيل لـ ${ctx.city}`);

  const message = parts.join("، ");
  const phone = merchantPhone.replace(/\D/g, "").replace(/^0/, "212");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Self-initialising module: scans the page for elements with
 * [data-dynamic-whatsapp] and updates the href on click with the current
 * product context. This keeps the link fresh even if the shopper changed
 * the variant or city after page load.
 */
let bound = false;

export function initDynamicWhatsApp(): void {
  if (bound) return;
  bound = true;

  const buttons = document.querySelectorAll<HTMLAnchorElement>("[data-dynamic-whatsapp]");
  if (buttons.length === 0) return;

  const merchantPhone = buttons[0].dataset.dynamicWhatsapp ?? "";
  const storeName = buttons[0].dataset.storeName ?? "";

  function updateLinks(): void {
    const productName = document.querySelector<HTMLElement>("[data-product-name]")?.dataset.productName ?? "";
    const priceStr = document.querySelector<HTMLElement>("[data-product-price]")?.dataset.productPrice ?? "";
    const price = priceStr ? parseInt(priceStr, 10) : undefined;
    const city = (document.getElementById("f-morocco-city") as HTMLInputElement | null)?.value ?? "";

    const url = buildDynamicWhatsAppUrl(merchantPhone, { productName, price, city, storeName });
    buttons.forEach((btn) => { btn.href = url; });
  }

  // Update on load + on every change to the city input or variant selector
  updateLinks();
  document.getElementById("f-morocco-city")?.addEventListener("change", updateLinks);
  document.querySelectorAll("[data-variant-selector]").forEach((el) => {
    el.addEventListener("change", updateLinks);
  });

  // Re-update on click to catch the latest state
  buttons.forEach((btn) => btn.addEventListener("click", updateLinks));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDynamicWhatsApp);
  } else {
    initDynamicWhatsApp();
  }
}
