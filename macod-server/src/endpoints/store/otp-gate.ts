/**
 * Order-creation OTP gate
 *
 * The Algeria-specific OTP-via-dzverify integration was removed along with the
 * other Algeria-specific code. This gate is now a pass-through — orders always
 * proceed without a verification token. The signature is preserved so callers
 * (storefront order creation) don't need to change.
 */

import type { Context } from "hono";
import type { AppContext } from "@/types";
import type { AppDb } from "@/db";
import type { StoreOrderInput } from "./validation";

export async function assertOtpVerification(
  _c: Context<AppContext>,
  _db: AppDb,
  _data: Pick<StoreOrderInput, "phone" | "otpToken">,
): Promise<void> {
  // Pass-through: always allow. The dzverify-backed OTP integration was removed.
  return;
}
