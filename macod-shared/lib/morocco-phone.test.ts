/**
 * Moroccan phone normalization.
 *
 * Mirrors the Algerian phone.test.ts structure: OTP send path, storefront
 * order schema, and the WhatsApp widget's number all depend on the same
 * answers, so the tests belong beside the definition.
 */

import { describe, it, expect } from "vitest";
import { normalizeMoroccanPhone, toLocalMoroccanMobile } from "./morocco-phone";

describe("normalizeMoroccanPhone", () => {
  it("normalizes every local Moroccan mobile shape to +212 E.164", () => {
    expect(normalizeMoroccanPhone("0661234567")).toBe("+212661234567");
    expect(normalizeMoroccanPhone("661234567")).toBe("+212661234567");
    expect(normalizeMoroccanPhone("077 123-4567")).toBe("+212771234567");
    expect(normalizeMoroccanPhone(" 0612345678 ")).toBe("+212612345678");
    expect(normalizeMoroccanPhone("06 61 23 45 67")).toBe("+212661234567");
  });

  it("completes already-country-coded forms", () => {
    expect(normalizeMoroccanPhone("+212661234567")).toBe("+212661234567");
    expect(normalizeMoroccanPhone("212661234567")).toBe("+212661234567");
    expect(normalizeMoroccanPhone("00212661234567")).toBe("+212661234567");
  });

  it("passes other countries through in +CC form", () => {
    expect(normalizeMoroccanPhone("+213551234567")).toBe("+213551234567"); // Algeria
    expect(normalizeMoroccanPhone("+33612345678")).toBe("+33612345678");   // France
    expect(normalizeMoroccanPhone("+971501234567")).toBe("+971501234567"); // UAE
  });

  it("returns null for garbage, landlines, and wrong lengths", () => {
    expect(normalizeMoroccanPhone("abc")).toBeNull();
    expect(normalizeMoroccanPhone("0522123456")).toBeNull(); // Moroccan landline (05 prefix)
    expect(normalizeMoroccanPhone("1234")).toBeNull();
    expect(normalizeMoroccanPhone("")).toBeNull();
    expect(normalizeMoroccanPhone("+21266123456712345")).toBeNull(); // too long after +CC
    expect(normalizeMoroccanPhone("0661234567x")).toBeNull();
    expect(normalizeMoroccanPhone("+abc12345")).toBeNull();
  });

  it("rejects non-Moroccan mobiles given without a + prefix", () => {
    expect(normalizeMoroccanPhone("33612345678")).toBeNull(); // French number, no +
  });
});

describe("toLocalMoroccanMobile", () => {
  it.each([
    ["0661234567", "0661234567"],
    ["066 12 34 567", "0661234567"],
    ["+212661234567", "0661234567"],
    ["212661234567", "0661234567"],
    ["00212661234567", "0661234567"],
    ["0771234567", "0771234567"],
    ["0612345678", "0612345678"],
  ])("normalizes %s → %s", (input, expected) => {
    expect(toLocalMoroccanMobile(input)).toBe(expected);
  });

  it.each([
    "12345",            // garbage
    "06612345",         // too short
    "06612345678",      // too long
    "0522123456",       // landline (05 prefix)
    "0812345678",       // invalid prefix
    "+33123456789",     // foreign number
    "0000000000",       // zeros
    "+213551234567",    // Algerian number
  ])("rejects %s", (input) => {
    expect(toLocalMoroccanMobile(input)).toBeNull();
  });
});
