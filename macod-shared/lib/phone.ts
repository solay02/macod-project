/**
 * Moroccan phone normalization — the single definition for MaCod.
 *
 * This module re-exports the Morocco-specific phone normalizers. The original
 * Algerian phone module was removed when the platform was rebranded to MaCod;
 * all callers now use the Moroccan phone shapes.
 *
 * Two shapes exist (same convention as the original Algerian module):
 *
 *   E.164 ("+212661234567")  — what the WhatsApp Cloud API requires, and what
 *                              a `wa.me` link is built from.
 *   local  ("0661234567")    — what orders store and what customers are
 *                              deduplicated on.
 *
 * Moroccan mobile prefixes: 06 and 07 (mobile only). International: +2126… or +2127…
 *
 * Accepted inputs:
 *   "0661234567"   "6 61-234 567"   "066 123 4567 "    → "+212661234567"
 *   "+212661234567"  "212661234567"  "00212661234567"  → "+212661234567"
 *   Other countries pass through when already "+CC…" shaped.
 *
 * @deprecated import from morocco-phone.ts directly; this re-export exists
 *             so existing import paths (`./phone` or `../../lib/phone`) keep
 *             resolving without a mass rename of every importer.
 */

export { normalizeMoroccanPhone as normalizeAlgerianPhone } from "./morocco-phone";
export { toLocalMoroccanMobile as toLocalAlgerianMobile } from "./morocco-phone";
export { normalizeMoroccanPhone, toLocalMoroccanMobile } from "./morocco-phone";
