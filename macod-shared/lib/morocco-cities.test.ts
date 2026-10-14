/**
 * Morocco administrative divisions dataset — sanity checks.
 *
 * These are structural invariants: every province references a real region,
 * every hub references real region + province, hub codes are unique, etc.
 * If a future edit breaks these, the storefront COD form will silently
 * produce provinces that map to no region.
 */

import { describe, it, expect } from "vitest";
import {
  MOROCCAN_REGIONS,
  MOROCCAN_PROVINCES,
  MOROCCAN_HUBS,
  getMoroccanRegion,
  getMoroccanProvince,
  getMoroccanHub,
  getProvincesByRegion,
  findMoroccanProvinceByName,
} from "./morocco-cities";

describe("Morocco administrative divisions", () => {
  it("exposes exactly 12 regions (the 2015 regional reform count)", () => {
    expect(MOROCCAN_REGIONS).toHaveLength(12);
  });

  it("exposes at least 70 provinces (Morocco's post-2015-reform count is ~75)", () => {
    expect(MOROCCAN_PROVINCES.length).toBeGreaterThanOrEqual(70);
  });

  it("every province references an existing region", () => {
    for (const p of MOROCCAN_PROVINCES) {
      expect(getMoroccanRegion(p.region), `province ${p.id} -> region ${p.region}`).toBeDefined();
    }
  });

  it("every hub references an existing region AND province", () => {
    for (const h of MOROCCAN_HUBS) {
      expect(getMoroccanRegion(h.region), `hub ${h.id} -> region ${h.region}`).toBeDefined();
      expect(getMoroccanProvince(h.province), `hub ${h.id} -> province ${h.province}`).toBeDefined();
    }
  });

  it("province ids are unique", () => {
    const ids = MOROCCAN_PROVINCES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hub codes are unique across hubs", () => {
    const codes = MOROCCAN_HUBS.map((h) => h.hubCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("hub codes are unique across provinces too", () => {
    const codes = MOROCCAN_PROVINCES.map((p) => p.hubCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every region has at least one province", () => {
    for (const r of MOROCCAN_REGIONS) {
      const ps = getProvincesByRegion(r.id);
      expect(ps.length, `region ${r.id} has provinces`).toBeGreaterThan(0);
    }
  });

  it("includes the must-have commercial hubs", () => {
    // These 10 hubs cover >80% of Moroccan COD volume.
    for (const id of ["casablanca", "rabat", "marrakech", "fes", "meknes", "tanger", "agadir", "oujda", "kenitra", "tetouan"]) {
      expect(getMoroccanHub(id), `hub ${id}`).toBeDefined();
    }
  });

  it("findMoroccanProvinceByName matches French and Arabic", () => {
    expect(findMoroccanProvinceByName("Casablanca")?.id).toBe("casablanca");
    expect(findMoroccanProvinceByName("casablanca")?.id).toBe("casablanca");
    expect(findMoroccanProvinceByName("Casablanca ")).toBeDefined();
    expect(findMoroccanProvinceByName("الدار البيضاء")?.id).toBe("casablanca");
    expect(findMoroccanProvinceByName("nonexistent")).toBeUndefined();
  });
});
