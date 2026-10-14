/**
 * Shipping Profiles Queries
 *
 * Profiles define what the CUSTOMER pays. They are referenced only by
 * products (products.shippingProfileId). Drivers and delivery companies
 * have no relationship to these profiles.
 *
 * updateProfile and setProfileRules stay in macod-server — they raise
 * BusinessLogicError / ValidationError.
 */

import { eq, and } from "drizzle-orm";
import {
  shippingProfiles,
  shippingRules,
  shippingRuleCommunes,
  products,
} from "../db/schema";
import type { AppDb } from "../db/client";

export interface CreateProfileData {
  name: string;
  isDefault?: boolean;
  notes?: string | null;
}

export interface CommuneOverrideData {
  homeEnabled?: boolean | null;
  stopDeskEnabled?: boolean | null;
  homePrice?: number | null;
  stopDeskPrice?: number | null;
}

export interface ShippingRule {
  id: string;
  profileId: string;
  homePrice: number;
  stopDeskPrice: number;
  homeEnabled: boolean;
  stopDeskEnabled: boolean;
  createdAt: string;
}

export interface ShippingProfile {
  id: string;
  name: string;
  isDefault: boolean;
  notes: string | null;
  ruleCount: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingProfileWithRules extends Omit<ShippingProfile, "ruleCount"> {
  rules: ShippingRule[];
}

export interface CommuneWithOverride {
  homeEnabled: boolean | null;
  stopDeskEnabled: boolean | null;
  homePrice: number | null;
  stopDeskPrice: number | null;
  effectiveHomeEnabled: boolean;
  effectiveStopDeskEnabled: boolean;
  effectiveHomePrice: number;
  effectiveStopDeskPrice: number;
  hasOverride: boolean;
}

export function newProfileId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function now() {
  return new Date().toISOString();
}

export async function getAllProfiles(db: AppDb): Promise<ShippingProfile[]> {
  const profiles = await db.select().from(shippingProfiles).all();
  const results = await Promise.all(
    profiles.map(async (p) => {
      const [rules, productRows] = await Promise.all([
        db
          .select({ id: shippingRules.id })
          .from(shippingRules)
          .where(eq(shippingRules.profileId, p.id))
          .all(),
        db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.shippingProfileId, p.id))
          .all(),
      ]);
      return {
        id: p.id,
        name: p.name,
        isDefault: Boolean(p.isDefault),
        notes: p.notes,
        ruleCount: rules.length,
        productCount: productRows.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    }),
  );
  return results;
}

export async function getProfileById(
  db: AppDb,
  id: string,
): Promise<ShippingProfileWithRules | null> {
  const profile = await db
    .select()
    .from(shippingProfiles)
    .where(eq(shippingProfiles.id, id))
    .get();

  if (!profile) return null;

  const [rules, productRows] = await Promise.all([
    db
      .select({
        id: shippingRules.id,
        profileId: shippingRules.profileId,
        homePrice: shippingRules.homePrice,
        stopDeskPrice: shippingRules.stopDeskPrice,
        homeEnabled: shippingRules.homeEnabled,
        stopDeskEnabled: shippingRules.stopDeskEnabled,
        createdAt: shippingRules.createdAt,
      })
      .from(shippingRules)
      .where(eq(shippingRules.profileId, id))
      .all(),
    db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.shippingProfileId, id))
      .all(),
  ]);

  return {
    id: profile.id,
    name: profile.name,
    isDefault: Boolean(profile.isDefault),
    notes: profile.notes,
    productCount: productRows.length,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    rules: rules.map((r) => ({
      id: r.id,
      profileId: r.profileId,
      homePrice: r.homePrice,
      stopDeskPrice: r.stopDeskPrice,
      homeEnabled: Boolean(r.homeEnabled ?? true),
      stopDeskEnabled: Boolean(r.stopDeskEnabled ?? false),
      createdAt: r.createdAt,
    })),
  };
}

export async function getDefaultProfileRules(db: AppDb): Promise<ShippingRule[]> {
  const defaultProfile = await db
    .select()
    .from(shippingProfiles)
    .where(eq(shippingProfiles.isDefault, true))
    .get();

  if (!defaultProfile) return [];

  const rules = await db
    .select({
      id: shippingRules.id,
      profileId: shippingRules.profileId,
      homePrice: shippingRules.homePrice,
      stopDeskPrice: shippingRules.stopDeskPrice,
      homeEnabled: shippingRules.homeEnabled,
      stopDeskEnabled: shippingRules.stopDeskEnabled,
      createdAt: shippingRules.createdAt,
    })
    .from(shippingRules)
    .where(eq(shippingRules.profileId, defaultProfile.id))
    .all();

  return rules.map((r) => ({
    id: r.id,
    profileId: r.profileId,
    homePrice: r.homePrice,
    stopDeskPrice: r.stopDeskPrice,
    homeEnabled: Boolean(r.homeEnabled ?? true),
    stopDeskEnabled: Boolean(r.stopDeskEnabled ?? false),
    createdAt: r.createdAt,
  }));
}

export async function createProfile(
  db: AppDb,
  data: CreateProfileData,
): Promise<ShippingProfileWithRules> {
  const id = newProfileId();
  const ts = now();

  if (data.isDefault) {
    await db.update(shippingProfiles).set({ isDefault: false }).run();
  }

  await db
    .insert(shippingProfiles)
    .values({
      id,
      name: data.name,
      isDefault: data.isDefault ?? false,
      notes: data.notes ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  return {
    id,
    name: data.name,
    isDefault: data.isDefault ?? false,
    notes: data.notes ?? null,
    productCount: 0,
    rules: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function deleteProfile(db: AppDb, id: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(shippingProfiles)
    .where(eq(shippingProfiles.id, id))
    .get();

  if (!existing) return false;

  await db.delete(shippingProfiles).where(eq(shippingProfiles.id, id)).run();
  return true;
}

// ─── Rule Override Queries ───────────────────────────────────────────────────

/**
 * Look up a profile's rule. Returns the first rule for the profile.
 */
export async function getRuleForProfile(
  db: AppDb,
  profileId: string,
) {
  return db
    .select()
    .from(shippingRules)
    .where(eq(shippingRules.profileId, profileId))
    .get();
}

/**
 * Return the rule's override row, if any. Now that overrides are per-rule (no
 * commune dimension), this is a single row lookup.
 */
export async function getCommunesWithOverrides(
  db: AppDb,
  ruleId: string,
  wilayaRule: {
    homeEnabled: boolean;
    stopDeskEnabled: boolean;
    homePrice: number;
    stopDeskPrice: number;
  },
): Promise<CommuneWithOverride[]> {
  const override = await db
    .select()
    .from(shippingRuleCommunes)
    .where(eq(shippingRuleCommunes.ruleId, ruleId))
    .get();

  if (!override) return [];

  const homeEnabled = override.homeEnabled ?? null;
  const stopDeskEnabled = override.stopDeskEnabled ?? null;
  const homePrice = override.homePrice ?? null;
  const stopDeskPrice = override.stopDeskPrice ?? null;

  return [{
    homeEnabled,
    stopDeskEnabled,
    homePrice,
    stopDeskPrice,
    effectiveHomeEnabled: homeEnabled ?? wilayaRule.homeEnabled,
    effectiveStopDeskEnabled: stopDeskEnabled ?? wilayaRule.stopDeskEnabled,
    effectiveHomePrice: homePrice ?? wilayaRule.homePrice,
    effectiveStopDeskPrice: stopDeskPrice ?? wilayaRule.stopDeskPrice,
    hasOverride: true,
  }];
}

export async function setCommuneOverride(
  db: AppDb,
  ruleId: string,
  data: CommuneOverrideData,
): Promise<void> {
  const homeEnabled = data.homeEnabled ?? null;
  const stopDeskEnabled = data.stopDeskEnabled ?? null;
  const homePrice = data.homePrice ?? null;
  const stopDeskPrice = data.stopDeskPrice ?? null;

  if (
    homeEnabled === null &&
    stopDeskEnabled === null &&
    homePrice === null &&
    stopDeskPrice === null
  ) {
    await db
      .delete(shippingRuleCommunes)
      .where(eq(shippingRuleCommunes.ruleId, ruleId))
      .run();
    return;
  }

  const existing = await db
    .select({ id: shippingRuleCommunes.id })
    .from(shippingRuleCommunes)
    .where(eq(shippingRuleCommunes.ruleId, ruleId))
    .get();

  if (existing) {
    await db
      .update(shippingRuleCommunes)
      .set({ homeEnabled, stopDeskEnabled, homePrice, stopDeskPrice })
      .where(eq(shippingRuleCommunes.id, existing.id))
      .run();
  } else {
    await db
      .insert(shippingRuleCommunes)
      .values({
        id: newProfileId(),
        ruleId,
        homeEnabled,
        stopDeskEnabled,
        homePrice,
        stopDeskPrice,
      })
      .run();
  }
}

export async function deleteCommuneOverride(
  db: AppDb,
  ruleId: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: shippingRuleCommunes.id })
    .from(shippingRuleCommunes)
    .where(eq(shippingRuleCommunes.ruleId, ruleId))
    .get();

  if (!existing) return false;

  await db
    .delete(shippingRuleCommunes)
    .where(eq(shippingRuleCommunes.id, existing.id))
    .run();

  return true;
}
