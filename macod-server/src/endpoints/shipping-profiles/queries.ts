/**
 * Shipping Profiles DB Queries
 *
 * Pure reads + simple writes live in macod-shared.
 * updateProfile and setProfileRules stay here — they raise
 * BusinessLogicError / ValidationError (server-only error classes).
 */

import { eq } from "drizzle-orm";
import type { AppDb } from "@/db";
import { shippingProfiles, shippingRules } from "@/db/schema";
import type { UpdateProfileInput, BulkRulesInput } from "./validation";
import { BusinessLogicError, ValidationError } from "@/lib/errors/classes";
import { ERROR_CODES } from "../../../../macod-shared/errors/codes";
import {
  getProfileById,
  newProfileId,
} from "../../../../macod-shared/queries/shipping-profiles";

export {
  getAllProfiles,
  getProfileById,
  getDefaultProfileRules,
  createProfile,
  deleteProfile,
  getRuleForProfile,
  getCommunesWithOverrides,
  setCommuneOverride,
  deleteCommuneOverride,
} from "../../../../macod-shared/queries/shipping-profiles";

export type {
  ShippingRule,
  ShippingProfile,
  ShippingProfileWithRules,
  CommuneWithOverride,
} from "../../../../macod-shared/queries/shipping-profiles";

import type { ShippingProfileWithRules } from "../../../../macod-shared/queries/shipping-profiles";

function now() {
  return new Date().toISOString();
}

export async function updateProfile(
  db: AppDb,
  id: string,
  data: UpdateProfileInput,
): Promise<ShippingProfileWithRules | null> {
  const existing = await db
    .select()
    .from(shippingProfiles)
    .where(eq(shippingProfiles.id, id))
    .get();

  if (!existing) return null;

  // Reject unsetting isDefault on the only default profile — system must always
  // have exactly one default so order fee resolution has a fallback.
  if (data.isDefault === false && existing.isDefault) {
    const otherDefaults = await db
      .select({ id: shippingProfiles.id })
      .from(shippingProfiles)
      .where(eq(shippingProfiles.isDefault, true))
      .all();
    if (otherDefaults.length <= 1) {
      throw new BusinessLogicError(
        "Cannot unset the last default shipping profile",
        ERROR_CODES.DEFAULT_PROFILE_REQUIRED,
        { profileId: id, profileName: existing.name },
      );
    }
  }

  if (data.isDefault) {
    await db.update(shippingProfiles).set({ isDefault: false }).run();
  }

  await db
    .update(shippingProfiles)
    .set({
      name: data.name ?? existing.name,
      isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updatedAt: now(),
    })
    .where(eq(shippingProfiles.id, id))
    .run();

  return getProfileById(db, id);
}

/** Replace all rules for a profile. Deletes existing rules (and their overrides via CASCADE), then inserts new ones. */
export async function setProfileRules(
  db: AppDb,
  profileId: string,
  data: BulkRulesInput,
): Promise<ShippingProfileWithRules | null> {
  const existing = await db
    .select()
    .from(shippingProfiles)
    .where(eq(shippingProfiles.id, profileId))
    .get();

  if (!existing) return null;

  await db.delete(shippingRules).where(eq(shippingRules.profileId, profileId)).run();

  const ts = now();
  for (const rule of data.rules) {
    await db
      .insert(shippingRules)
      .values({
        id: newProfileId(),
        profileId,
        homePrice: rule.homePrice,
        stopDeskPrice: rule.stopDeskPrice,
        homeEnabled: rule.homeEnabled ?? true,
        stopDeskEnabled: rule.stopDeskEnabled ?? false,
        createdAt: ts,
      })
      .run();
  }

  await db
    .update(shippingProfiles)
    .set({ updatedAt: now() })
    .where(eq(shippingProfiles.id, profileId))
    .run();

  return getProfileById(db, profileId);
}
