/**
 * Moroccan phone normalization — re-exports from morocco-phone.ts.
 *
 * @deprecated Use morocco-phone.test.ts directly. This file exists so the
 *             existing import path keeps resolving. The test cases now cover
 *             Moroccan phone shapes (06/07 prefix, +212 country code).
 */

import { describe, it, expect } from "vitest";
import { normalizeMoroccanPhone, toLocalMoroccanMobile } from "./morocco-phone";

describe("normalizeMoroccanPhone (via phone.ts re-export)", () => {
  it("normalizes local Moroccan mobile shapes to +212 E.164", () => {
    expect(normalizeMoroccanPhone("0661234567")).toBe("+212661234567");
    expect(normalizeMoroccanPhone("0771234567")).toBe("+212771234567");
  });

  it("completes already-country-coded forms", () => {
    expect(normalizeMoroccanPhone("+212661234567")).toBe("+212661234567");
    expect(normalizeMoroccanPhone("212661234567")).toBe("+212661234567");
  });

  it("returns null for invalid inputs", () => {
    expect(normalizeMoroccanPhone("abc")).toBeNull();
    expect(normalizeMoroccanPhone("0522123456")).toBeNull(); // landline
    expect(normalizeMoroccanPhone("")).toBeNull();
  });
});

describe("toLocalMoroccanMobile (via phone.ts re-export)", () => {
  it("returns canonical local form", () => {
    expect(toLocalMoroccanMobile("0661234567")).toBe("0661234567");
    expect(toLocalMoroccanMobile("+212661234567")).toBe("0661234567");
  });

  it("returns null for non-Moroccan numbers", () => {
    expect(toLocalMoroccanMobile("+33612345678")).toBeNull();
    expect(toLocalMoroccanMobile("12345")).toBeNull();
  });
});
