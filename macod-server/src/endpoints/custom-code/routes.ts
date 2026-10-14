/**
 * Custom code injection — Head/Body/Footer script management.
 *
 * GET /api/custom-code         — read the current custom code config
 * PUT /api/custom-code         — save custom code (head, body open, footer)
 * DELETE /api/custom-code      — clear all custom code
 *
 * The storefront renders these via <Fragment set:html={...} /> in
 * StoreLayout.astro. This endpoint is the admin CRUD surface.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { storeCustomCode, stores } from "../../../../macod-shared/db/schema";
import { eq } from "drizzle-orm";

export const customCodeRouter = new Hono<AppContext>();

const customCodeSchema = z.object({
  customHead: z.string().max(50000).nullable().optional(),
  customBodyOpen: z.string().max(50000).nullable().optional(),
  customFooter: z.string().max(50000).nullable().optional(),
});

customCodeRouter.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const store = await db.select().from(stores).limit(1).get();
  if (!store) return c.json({ error: "No store found" }, 404);

  const row = await db.select().from(storeCustomCode).where(eq(storeCustomCode.storeId, store.id)).get();
  return c.json({
    customHead: row?.customHead ?? null,
    customBodyOpen: row?.customBodyOpen ?? null,
    customFooter: row?.customFooter ?? null,
  });
});

customCodeRouter.put("/", async (c) => {
  const body = await c.req.json();
  const parsed = customCodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const store = await db.select().from(stores).limit(1).get();
  if (!store) return c.json({ error: "No store found" }, 404);

  const now = new Date().toISOString();
  await db.insert(storeCustomCode).values({
    storeId: store.id,
    customHead: parsed.data.customHead ?? null,
    customBodyOpen: parsed.data.customBodyOpen ?? null,
    customFooter: parsed.data.customFooter ?? null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: storeCustomCode.storeId,
    set: {
      customHead: parsed.data.customHead ?? null,
      customBodyOpen: parsed.data.customBodyOpen ?? null,
      customFooter: parsed.data.customFooter ?? null,
      updatedAt: now,
    },
  });

  return c.json({ success: true });
});

customCodeRouter.delete("/", async (c) => {
  const db = getDb(c.env.DB);
  const store = await db.select().from(stores).limit(1).get();
  if (!store) return c.json({ error: "No store found" }, 404);

  await db.delete(storeCustomCode).where(eq(storeCustomCode.storeId, store.id));
  return c.json({ success: true });
});
