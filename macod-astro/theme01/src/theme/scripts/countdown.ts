/**
 * Countdown — updates all [data-countdown-end] elements every second.
 *
 * Self-initialising on import (same pattern as cart-ui.ts, product.ts —
 * ClientRouter was removed and astro:page-load never fires).
 *
 * Supports two formats:
 *   "dh:ms" → days:hours:minutes:seconds (default)
 *   "h:ms"  → hours:minutes:seconds
 *
 * When the countdown reaches zero, the element shows "00:00:00:00" and
 * adds the "countdown-expired" class so CSS can style the expired state.
 */

function updateCountdowns(): void {
  const elements = document.querySelectorAll<HTMLElement>("[data-countdown-end]");
  if (elements.length === 0) return;

  const now = Date.now();

  elements.forEach((el) => {
    const endStr = el.dataset.countdownEnd;
    if (!endStr) return;

    const end = new Date(endStr).getTime();
    if (isNaN(end)) return;

    const remaining = end - now;
    const format = el.dataset.countdownFormat ?? "dh:ms";

    if (remaining <= 0) {
      el.textContent = format === "h:ms" ? "00:00:00" : "00:00:00:00";
      el.classList.add("countdown-expired");
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    if (format === "h:ms") {
      el.textContent = `${pad(hours + days * 24)}:${pad(minutes)}:${pad(seconds)}`;
    } else {
      el.textContent = `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
  });
}

let interval: ReturnType<typeof setInterval> | null = null;

export function initCountdowns(): void {
  if (interval) return; // already running
  updateCountdowns();
  interval = setInterval(updateCountdowns, 1000);
}

// Auto-init on import.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCountdowns);
  } else {
    initCountdowns();
  }
}
