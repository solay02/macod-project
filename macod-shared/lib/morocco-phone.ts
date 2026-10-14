/**
 * Moroccan phone normalization — the MaCod counterpart to `phone.ts`.
 *
 * Two shapes, same convention as the Algerian module:
 *
 *   E.164 ("+212661234567")  — what the WhatsApp Cloud API requires, and what
 *                              a `wa.me` link is built from.
 *   local  ("0661234567")    — what orders store and what customers are
 *                              deduplicated on.
 *
 * Moroccan mobile prefixes: 06 and 07 (mobile only — Morocco has no landline
 * prefixes that start with 0[67]). International form: +2126… or +2127…
 *
 * Accepted inputs (Moroccan mobile):
 *   "0661234567"   "6 61-234 567"   "066 123 4567 "    → "+212661234567"
 *   "+212661234567"  "212661234567"  "00212661234567"  → "+212661234567"
 *   Other countries pass through when already "+CC…" shaped.
 */

const MOROCCAN_COUNTRY_CODE = "212";
const MOROCCAN_MOBILE_PREFIX = /^[67]/;

/** Strip visual separators — the WhatsApp Cloud API rejects spaces and dashes. */
function clean(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export function normalizeMoroccanPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let phone = clean(raw.trim());
  if (phone.length < 6 || phone.length > 20) return null;

  // International dialing prefix "00" (e.g. "00212661234567") — treat as "+".
  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  }

  // Already international: keep the + form. E.164 allows 7–15 digits after +.
  if (phone.startsWith("+")) {
    return /^\+\d{7,15}$/.test(phone) ? phone : null;
  }

  // "212…" without the + — complete it.
  if (phone.startsWith(MOROCCAN_COUNTRY_CODE)) {
    const rest = phone.slice(MOROCCAN_COUNTRY_CODE.length);
    return MOROCCAN_MOBILE_PREFIX.test(rest) ? `+${phone}` : null;
  }

  // Local form: 0-prefixed or bare Moroccan mobile.
  const local = phone.startsWith("0") ? phone.slice(1) : phone;
  if (local.length === 9 && MOROCCAN_MOBILE_PREFIX.test(local)) {
    return `+${MOROCCAN_COUNTRY_CODE}${local}`;
  }

  return null;
}

/**
 * Canonical local form of a Moroccan mobile: "0661234567".
 * Returns null for anything that is not a Moroccan mobile (foreign +CC,
 * landlines like 05…, too-short/long inputs). This is the format orders store
 * and customers are deduplicated on.
 */
export function toLocalMoroccanMobile(raw: string): string | null {
  const e164 = normalizeMoroccanPhone(raw);
  if (!e164 || !e164.startsWith("+212")) return null;
  const local = e164.slice(4); // strip "+212"
  return /^[67]\d{8}$/.test(local) ? `0${local}` : null;
}
