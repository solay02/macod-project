/**
 * Conversion optimization features:
 *   - Exit-intent popup with discount code
 *   - "X people viewing" counter
 *   - Free shipping progress bar (on product page)
 *   - Flash sale urgency banner
 *
 * Self-initialising on import.
 */

// ── Exit-intent popup ─────────────────────────────────────────────────────────

let exitPopupShown = false;
const EXIT_POPUP_KEY = "ezzaro_exit_popup_shown";

function initExitIntent(): void {
  if (sessionStorage.getItem(EXIT_POPUP_KEY)) return;

  const popup = document.getElementById("exit-intent-popup");
  if (!popup) return;

  // Show on mouseleave (desktop) or after 30s (mobile)
  let timeout: ReturnType<typeof setTimeout>;

  document.addEventListener("mouseleave", (e) => {
    if (e.clientY < 10 && !exitPopupShown) {
      showPopup();
    }
  });

  // Mobile fallback: show after 30 seconds
  timeout = setTimeout(() => {
    if (!exitPopupShown) showPopup();
  }, 30000);

  function showPopup(): void {
    if (exitPopupShown || !popup) return;
    exitPopupShown = true;
    sessionStorage.setItem(EXIT_POPUP_KEY, "1");

    popup.classList.remove("hidden");
    popup.classList.add("flex");

    // Auto-hide after 15s
    setTimeout(() => {
      if (!popup) return;
      popup.classList.add("hidden");
      popup.classList.remove("flex");
    }, 15000);
  }

  // Close on click outside or close button
  popup.addEventListener("click", (e) => {
    if (e.target === popup || (e.target as HTMLElement).dataset.closePopup !== undefined) {
      popup.classList.add("hidden");
      popup.classList.remove("flex");
    }
  });
}

// ── "X people viewing" counter ────────────────────────────────────────────────

function initViewingCounter(): void {
  const counter = document.getElementById("viewing-counter");
  if (!counter) return;

  const base = Math.floor(Math.random() * 15) + 8; // 8-22 people
  let current = base;

  function update() {
    current += Math.random() > 0.5 ? 1 : -1;
    current = Math.max(5, Math.min(35, current));
    if (counter) {
      counter.textContent = `${current} شخص يشاهدون هذا المنتج الآن`;
    }
  }

  counter.textContent = `${current} شخص يشاهدون هذا المنتج الآن`;
  setInterval(update, 8000 + Math.random() * 5000);
}

// ── Free shipping progress bar ───────────────────────────────────────────────

function initFreeShippingBar(): void {
  const bar = document.getElementById("free-shipping-progress");
  if (!bar) return;

  const threshold = parseInt(bar.dataset.threshold ?? "400", 10);
  const price = parseInt(bar.dataset.price ?? "0", 10);

  const fill = bar.querySelector<HTMLElement>(".fs-fill");
  const label = document.getElementById("fs-label");

  if (price >= threshold) {
    if (fill) fill.style.width = "100%";
    if (label) label.textContent = "توصيل مجاني مفعّل!";
  } else {
    const pct = Math.round((price / threshold) * 100);
    const remaining = threshold - price;
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `أضف ${remaining} د.م للحصول على توصيل مجاني`;
  }
}

// ── Flash sale urgency banner ────────────────────────────────────────────────

function initFlashBanner(): void {
  const banner = document.getElementById("flash-sale-banner");
  if (!banner) return;

  // Show/hide based on whether it's a discounted product
  const hasDiscount = banner.dataset.discounted === "true";
  if (!hasDiscount) {
    banner.style.display = "none";
    return;
  }

  // Countdown to end of day
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  function updateCountdown() {
    if (!banner) return;
    const remaining = endOfDay.getTime() - Date.now();
    if (remaining <= 0) {
      banner.style.display = "none";
      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const timeEl = banner.querySelector<HTMLElement>(".flash-time");
    if (timeEl) {
      timeEl.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// ── Init all ───────────────────────────────────────────────────────────────────

let initialized = false;

export function initConversionFeatures(): void {
  if (initialized) return;
  initialized = true;
  initExitIntent();
  initViewingCounter();
  initFreeShippingBar();
  initFlashBanner();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initConversionFeatures);
  } else {
    initConversionFeatures();
  }
}
