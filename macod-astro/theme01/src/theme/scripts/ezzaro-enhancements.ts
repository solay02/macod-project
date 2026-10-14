/**
 * ezzarostyle theme enhancements — visual polish + UX + trust + performance.
 *
 * Features implemented:
 *   1. Product image zoom on hover (desktop)
 *   3. Color/size swatches enhancement (CSS-only — already rendered by VariantSelector)
 *   4. Skeleton loaders (CSS classes)
 *   5. Smooth scroll animations (IntersectionObserver fade-in-up)
 *   6. Size guide modal toggle
 *   7. Sticky add-to-cart bar with live price
 *   9. Filter + sort on collection page
 *   10. Wishlist (heart toggle + localStorage)
 *   11. Stock countdown bar
 *   12. Recent orders ticker
 *   13. Trust badges already in ProductDetailContent (CSS)
 *   14. Product description tabs
 *   15. Image blur-up lazy loading
 *
 * Self-initialising on import.
 */

// ── 1. Image zoom on hover ─────────────────────────────────────────────────────

function initImageZoom(): void {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  const slides = gallery.querySelectorAll<HTMLElement>(".gallery-slide");
  slides.forEach((slide) => {
    const img = slide.querySelector("img");
    if (!img) return;

    slide.addEventListener("mousemove", (e) => {
      const rect = slide.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
      img.style.transform = "scale(2)";
    });

    slide.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1)";
      img.style.transformOrigin = "center";
    });
  });
}

// ── 5. Smooth scroll animations ───────────────────────────────────────────────

function initScrollAnimations(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("ez-animate-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );

  document.querySelectorAll<HTMLElement>(
    "section h2, .product-card, .best-sellers-section, .new-arrivals-section, .features-section, [data-animate]"
  ).forEach((el) => {
    el.classList.add("ez-animate-pending");
    observer.observe(el);
  });
}

// ── 6. Size guide modal ───────────────────────────────────────────────────────

function initSizeGuide(): void {
  const triggers = document.querySelectorAll<HTMLElement>("[data-size-guide-trigger]");
  if (triggers.length === 0) return;

  const modal = document.getElementById("size-guide-modal");
  if (!modal) return;

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal || (e.target as HTMLElement).dataset.closeModal !== undefined) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  });
}

// ── 7. Sticky bar with live price ─────────────────────────────────────────────

function initStickyPriceBar(): void {
  const stickyBar = document.getElementById("product-sticky-cta");
  if (!stickyBar) return;

  const priceDisplay = stickyBar.querySelector<HTMLElement>("[data-sticky-price]");
  if (!priceDisplay) return;

  // Watch for price changes (variant selection updates #price-display-mobile)
  const mobilePrice = document.getElementById("price-display-mobile");
  const desktopPrice = document.getElementById("price-display-desktop");

  const updateStickyPrice = () => {
    const source = mobilePrice || desktopPrice;
    if (source) {
      priceDisplay.innerHTML = source.innerHTML;
    }
  };

  // Use a MutationObserver to watch for price changes
  const observer = new MutationObserver(updateStickyPrice);
  if (mobilePrice) observer.observe(mobilePrice, { childList: true, characterData: true, subtree: true });
  if (desktopPrice) observer.observe(desktopPrice, { childList: true, characterData: true, subtree: true });

  updateStickyPrice();
}

// ── 9. Filter + sort on collection page ───────────────────────────────────────

function initCollectionFilters(): void {
  const sortSelect = document.getElementById("sort-select") as HTMLSelectElement | null;
  const grid = document.querySelector<HTMLElement>(".products-grid");
  if (!sortSelect || !grid) return;

  sortSelect.addEventListener("change", () => {
    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".product-card"));
    const sortBy = sortSelect.value;

    cards.sort((a, b) => {
      if (sortBy === "price-asc") {
        return parseFloat(a.dataset.price ?? "0") - parseFloat(b.dataset.price ?? "0");
      }
      if (sortBy === "price-desc") {
        return parseFloat(b.dataset.price ?? "0") - parseFloat(a.dataset.price ?? "0");
      }
      return 0; // "featured" — keep original order
    });

    cards.forEach((card) => grid.appendChild(card));
  });
}

// ── 10. Wishlist ───────────────────────────────────────────────────────────────

const WISHLIST_KEY = "ezzaro_wishlist";

function getWishlist(): string[] {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]"); } catch { return []; }
}

function toggleWishlist(productId: string): void {
  const list = getWishlist();
  const idx = list.indexOf(productId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(productId);
  }
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  updateWishlistUI();
}

function updateWishlistUI(): void {
  const list = getWishlist();
  document.querySelectorAll<HTMLElement>("[data-wishlist-id]").forEach((btn) => {
    const id = btn.dataset.wishlistId ?? "";
    const isWished = list.includes(id);
    btn.classList.toggle("is-wished", isWished);
    const icon = btn.querySelector("svg");
    if (icon) {
      icon.style.fill = isWished ? "var(--clr-accent)" : "none";
      icon.style.stroke = isWished ? "var(--clr-accent)" : "currentColor";
    }
  });

  // Update wishlist count badge
  const countBadge = document.getElementById("wishlist-count");
  if (countBadge) {
    countBadge.textContent = String(list.length);
    countBadge.classList.toggle("hidden", list.length === 0);
  }
}

function initWishlist(): void {
  document.querySelectorAll<HTMLElement>("[data-wishlist-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(btn.dataset.wishlistId ?? "");
    });
  });
  updateWishlistUI();
}

// ── 11. Stock countdown bar ───────────────────────────────────────────────────

function initStockBar(): void {
  const bar = document.getElementById("stock-progress-bar");
  const barFill = document.getElementById("stock-progress-fill");
  if (!bar || !barFill) return;

  const inventory = parseInt(bar.dataset.inventory ?? "0", 10);
  const initial = parseInt(bar.dataset.initialStock ?? "100", 10);

  if (inventory > 0 && initial > 0) {
    const soldPct = Math.round(((initial - inventory) / initial) * 100);
    barFill.style.width = `${soldPct}%`;
  }
}

// ── 12. Recent orders ticker ───────────────────────────────────────────────────

const TICKER_NAMES = ["أحمد", "يوسف", "سارة", "محمد", "فاطمة", "خالد", "نورا", "عمر"];
const TICKER_CITIES = ["الدار البيضاء", "الرباط", "مراكش", "فاس", "طنجة", "أكادير", "مكناس", "وجدة"];

function initOrdersTicker(): void {
  const ticker = document.getElementById("orders-ticker");
  if (!ticker) return;

  let visible = false;
  let timeout: ReturnType<typeof setTimeout>;

  function showTicker() {
    if (visible || !ticker) return;
    visible = true;

    const name = TICKER_NAMES[Math.floor(Math.random() * TICKER_NAMES.length)];
    const city = TICKER_CITIES[Math.floor(Math.random() * TICKER_CITIES.length)];
    const minutes = Math.floor(Math.random() * 10) + 1;

    const productNameEl = document.querySelector<HTMLElement>("[data-product-name]");
    const productName = productNameEl?.dataset.productName ?? "منتج";

    ticker.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        <span class="text-xs font-bold">${name} من ${city} اشترى ${productName} قبل ${minutes} دقيقة</span>
      </div>
    `;
    ticker.classList.remove("translate-y-[150%]", "opacity-0");
    ticker.classList.add("translate-y-0", "opacity-100");

    timeout = setTimeout(() => {
      ticker.classList.add("translate-y-[150%]", "opacity-0");
      ticker.classList.remove("translate-y-0", "opacity-100");
      visible = false;
      timeout = setTimeout(showTicker, Math.random() * 20000 + 15000); // 15-35s
    }, 5000);
  }

  // First show after 8 seconds
  timeout = setTimeout(showTicker, 8000);
}

// ── 14. Product description tabs ───────────────────────────────────────────────

function initDescriptionTabs(): void {
  const tabButtons = document.querySelectorAll<HTMLElement>("[data-tab]");
  if (tabButtons.length === 0) return;

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      // Deactivate all
      tabButtons.forEach((b) => {
        b.classList.remove("ez-tab-active");
        b.classList.add("ez-tab-inactive");
      });
      document.querySelectorAll<HTMLElement>("[data-tab-content]").forEach((panel) => {
        panel.classList.add("hidden");
      });

      // Activate clicked
      btn.classList.add("ez-tab-active");
      btn.classList.remove("ez-tab-inactive");
      const panel = document.querySelector(`[data-tab-content="${target}"]`);
      panel?.classList.remove("hidden");
    });
  });
}

// ── 15. Image blur-up lazy loading ─────────────────────────────────────────────

function initBlurUp(): void {
  const images = document.querySelectorAll<HTMLImageElement>("img[data-blur-up]");
  images.forEach((img) => {
    if (img.complete) {
      img.classList.add("ez-img-loaded");
    } else {
      img.addEventListener("load", () => img.classList.add("ez-img-loaded"));
    }
  });
}

// ── Init all ───────────────────────────────────────────────────────────────────

let initialized = false;

export function initEzzaroEnhancements(): void {
  if (initialized) return;
  initialized = true;

  initImageZoom();
  initScrollAnimations();
  initSizeGuide();
  initStickyPriceBar();
  initCollectionFilters();
  initWishlist();
  initStockBar();
  initOrdersTicker();
  initDescriptionTabs();
  initBlurUp();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEzzaroEnhancements);
  } else {
    initEzzaroEnhancements();
  }
}
