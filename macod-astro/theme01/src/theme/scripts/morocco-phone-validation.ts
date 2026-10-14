/**
 * Moroccan phone validation — client-side pre-submit check.
 *
 * Runs on every checkout form (product page, landing page, cart checkout).
 * When the shopper types or pastes a phone number, this normalizes it via
 * normalizeMoroccanPhone() and shows the formMoroccoPhoneInvalid error
 * message before the form is submitted, so the shopper gets immediate
 * feedback without a server round-trip.
 *
 * The normalization is the same one the server runs (macod-shared/lib/
 * morocco-phone.ts), so what the shopper sees as "valid" here is exactly
 * what the server will accept.
 *
 * This module self-initialises on import (same pattern as product.ts,
 * cart-ui.ts, turnstile-field.ts — ClientRouter was removed and
 * astro:page-load never fires).
 */

// ── Inline Moroccan phone normalizer ────────────────────────────────────────
// Mirrors macod-shared/lib/morocco-phone.ts. Duplicated here (not imported)
// because this runs in the browser bundle and macod-shared is server-only
// (imports drizzle-orm). The two must stay in sync — if you change one,
// change the other.

const MOROCCAN_COUNTRY_CODE = "212";
const MOROCCAN_MOBILE_PREFIX = /^[67]/;

function clean(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export function normalizeMoroccanPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let phone = clean(raw.trim());
  if (phone.length < 6 || phone.length > 20) return null;

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  }

  if (phone.startsWith("+")) {
    return /^\+\d{7,15}$/.test(phone) ? phone : null;
  }

  if (phone.startsWith(MOROCCAN_COUNTRY_CODE)) {
    const rest = phone.slice(MOROCCAN_COUNTRY_CODE.length);
    return MOROCCAN_MOBILE_PREFIX.test(rest) ? `+${phone}` : null;
  }

  const local = phone.startsWith("0") ? phone.slice(1) : phone;
  if (local.length === 9 && MOROCCAN_MOBILE_PREFIX.test(local)) {
    return `+${MOROCCAN_COUNTRY_CODE}${local}`;
  }

  return null;
}

export function toLocalMoroccanMobile(raw: string): string | null {
  const e164 = normalizeMoroccanPhone(raw);
  if (!e164 || !e164.startsWith("+212")) return null;
  const local = e164.slice(4);
  return /^[67]\d{8}$/.test(local) ? `0${local}` : null;
}

// ── DOM wiring ──────────────────────────────────────────────────────────────

let bound = false;

export function initMoroccoPhoneValidation(): void {
  if (bound) return;
  bound = true;

  const phoneInput = document.getElementById("f-phone") as HTMLInputElement | null;
  if (!phoneInput) return;

  // Find or create the error message element right below the phone input.
  let errorEl = phoneInput.parentElement?.querySelector<HTMLParagraphElement>(".phone-error-msg");
  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.className = "phone-error-msg text-[0.75rem] text-red-500 font-bold mt-2 ps-1 hidden";
    phoneInput.parentElement?.appendChild(errorEl);
  }

  // The invalid-phone message comes from the content pack, rendered as a
  // data attribute on the phone input by the layout. This keeps the string
  // in the language pack (no hardcoding) while making it available to this
  // script without a separate fetch.
  const invalidMsg = phoneInput.dataset.moroccoPhoneInvalid
    || "Invalid Moroccan phone number — must start with 06 or 07";

  function check(): void {
    if (!phoneInput || !errorEl) return;
    const value = phoneInput.value.trim();
    if (!value) {
      // Empty is handled by the browser's required attribute — don't double-show.
      errorEl.classList.add("hidden");
      phoneInput.classList.remove("error");
      return;
    }
    const normalized = toLocalMoroccanMobile(value);
    if (normalized) {
      // Valid — normalize the input to the canonical local form silently.
      // Only update if different, to avoid jumping the cursor while typing.
      if (phoneInput.value !== normalized) {
        const start = phoneInput.selectionStart;
        const end = phoneInput.selectionEnd;
        phoneInput.value = normalized;
        if (start !== null && end !== null) {
          phoneInput.setSelectionRange(start, end);
        }
      }
      errorEl.classList.add("hidden");
      phoneInput.classList.remove("error");
    } else {
      errorEl.textContent = invalidMsg;
      errorEl.classList.remove("hidden");
      phoneInput.classList.add("error");
    }
  }

  // Check on blur (not on every keystroke — that would be naggy).
  phoneInput.addEventListener("blur", check);

  // Also check on submit — block the form if invalid.
  const form = phoneInput.closest("form");
  form?.addEventListener("submit", (e) => {
    if (!phoneInput || !errorEl) return;
    const value = phoneInput.value.trim();
    if (value && !toLocalMoroccanMobile(value)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      errorEl.textContent = invalidMsg;
      errorEl.classList.remove("hidden");
      phoneInput.classList.add("error");
      phoneInput.focus();
    }
  }, { capture: true });
}

// Auto-init on import.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMoroccoPhoneValidation);
  } else {
    initMoroccoPhoneValidation();
  }
}
