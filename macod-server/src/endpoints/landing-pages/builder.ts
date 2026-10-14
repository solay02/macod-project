/**
 * Landing Page Builder API — CRUD for blocks_json + page_template.
 *
 * GET  /api/landing-pages/:id/blocks   — read the current blocks + template
 * PUT  /api/landing-pages/:id/blocks   — save blocks + template
 *
 * The blocks are stored as JSON in landing_pages.blocks_json. The template
 * is stored in landing_pages.page_template. Both are read by the storefront
 * at render time — see src/pages/lp/[slug].astro.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { landingPages } from "../../../../macod-shared/db/schema";
import { eq } from "drizzle-orm";

export const lpBuilderRouter = new Hono<AppContext>();

const blocksSchema = z.object({
  blocks: z.array(z.object({
    type: z.string(),
    data: z.record(z.string(), z.unknown()),
  })),
  pageTemplate: z.enum(["full_width", "header_footer", "header_only", "footer_only", "bare"]).default("full_width"),
});

lpBuilderRouter.get("/:id/blocks", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);

  const lp = await db.select({
    id: landingPages.id,
    slug: landingPages.slug,
    name: landingPages.name,
    blocksJson: landingPages.blocksJson,
    pageTemplate: landingPages.pageTemplate,
    status: landingPages.status,
  }).from(landingPages).where(eq(landingPages.id, id)).get();

  if (!lp) return c.json({ error: "Landing page not found" }, 404);

  let blocks: unknown[] = [];
  if (lp.blocksJson) {
    try { blocks = JSON.parse(lp.blocksJson); } catch { blocks = []; }
  }

  return c.json({
    id: lp.id,
    slug: lp.slug,
    name: lp.name,
    blocks,
    pageTemplate: lp.pageTemplate,
    status: lp.status,
  });
});

lpBuilderRouter.put("/:id/blocks", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = blocksSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  const now = new Date().toISOString();

  const result = await db.update(landingPages).set({
    blocksJson: JSON.stringify(parsed.data.blocks),
    pageTemplate: parsed.data.pageTemplate,
    updatedAt: now,
  }).where(eq(landingPages.id, id)).returning({ id: landingPages.id }).get();

  if (!result) return c.json({ error: "Landing page not found" }, 404);

  return c.json({ success: true, id, blocksCount: parsed.data.blocks.length });
});
