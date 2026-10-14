/**
 * Delivery Companies Route Handlers
 *
 * HTTP handlers for delivery company CRUD operations.
 */

import { Context } from "hono";
import type { AppContext } from "@/types";
import { getDb } from "@/db";
import { eq, and, lt, sql, desc, count } from "drizzle-orm";
import { companyStopDesks, webhookEvents, orders } from "@/db/schema";
import * as queries from "./queries";
import * as validation from "./validation";
import { getProvider } from "./providers/registry";
import { NotFoundError, ValidationError, BusinessLogicError, ConflictError, ExternalApiError } from "@/lib/errors/classes";
import { ERROR_CODES } from "../../../../macod-shared/errors/codes";

/**
 * GET /delivery-companies
 * List all delivery companies with optional filters.
 */
export async function listDeliveryCompanies(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const filters = (c.req as any).valid?.("query") ?? {
    active: c.req.query("active"),
    search: c.req.query("search"),
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  };
  const parsed = validation.deliveryCompanyFiltersSchema.parse(filters);
  const data = await queries.getAllDeliveryCompanies(db, parsed);
  return c.json({ success: true, data, count: data.length }, 200);
}

/**
 * GET /delivery-companies/:id
 * Get a single delivery company by ID.
 */
export async function getDeliveryCompany(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };
  const company = await queries.getDeliveryCompanyById(db, id);
  
  if (!company) {
    throw new NotFoundError("Delivery company", id);
  }
  
  return c.json({ success: true, data: company }, 200);
}

/**
 * POST /delivery-companies
 * Create a new delivery company.
 */
export async function createDeliveryCompany(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const body = (c.req as any).valid?.("json") ?? await c.req.json();
  const parsed = validation.createDeliveryCompanySchema.parse(body);

  // Ensure code is unique
  const existing = await queries.getDeliveryCompanyByCode(db, parsed.code);
  if (existing) {
    throw new ConflictError(
      `A delivery company with code "${parsed.code}" already exists`,
      ERROR_CODES.DUPLICATE_ENTITY,
      { code: parsed.code, existingCompanyId: existing.id }
    );
  }

  // Derive a safe auto-validate default when the caller didn't specify one.
  // Default to true everywhere — carrier-specific overrides removed along with
  // the Algerian carriers.
  const autoValidate = parsed.autoValidate ?? true;

  const company = await queries.createDeliveryCompany(db, { ...parsed, autoValidate });
  if (!company) {
    throw new BusinessLogicError("Failed to create delivery company", ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
  console.info(`[delivery-companies] created company=${company.id} code=${parsed.code} autoValidate=${autoValidate}`);
  return c.json({ success: true, data: company }, 201);
}

/**
 * PATCH /delivery-companies/:id
 * Update a delivery company.
 */
export async function updateDeliveryCompany(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };
  const body = (c.req as any).valid?.("json") ?? await c.req.json();
  const parsed = validation.updateDeliveryCompanySchema.parse(body);

  // If code is being changed, verify it's not taken by another company
  if (parsed.code) {
    const existing = await queries.getDeliveryCompanyByCode(db, parsed.code);
    if (existing && existing.id !== id) {
      throw new ConflictError(
        `A delivery company with code "${parsed.code}" already exists`,
        ERROR_CODES.DUPLICATE_ENTITY,
        { code: parsed.code, existingCompanyId: existing.id }
      );
    }
  }

  const company = await queries.updateDeliveryCompany(db, id, parsed);
  
  if (!company) {
    throw new NotFoundError("Delivery company", id);
  }

  console.info(`[delivery-companies] updated company=${id}`);
  return c.json({ success: true, data: company }, 200);
}

/**
 * POST /delivery-companies/:id/sync-stop-desks
 * Fetch stop desks from the carrier API and upsert into company_stop_desks.
 * The `active` flag is NEVER overwritten — preserves admin's manual deactivations.
 */
export async function syncCompanyStopDesks(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };

  const company = await queries.getDeliveryCompanyRaw(db, id);
  if (!company) throw new NotFoundError("Delivery company", id);

  if (!company.apiToken) {
    throw new ValidationError(
      `${company.name} is not connected — add API credentials first`,
      ERROR_CODES.MISSING_API_CREDENTIALS,
      { companyId: id }
    );
  }

  let provider;
  try {
    provider = getProvider(company);
  } catch (err) {
    throw new BusinessLogicError(
      err instanceof Error ? err.message : "Provider not available",
      ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      { companyId: id, code: company.code }
    );
  }

  if (typeof provider.getStopDesks !== "function") {
    throw new BusinessLogicError(
      `The ${company.code} provider does not support stop desks`,
      ERROR_CODES.OPERATION_NOT_SUPPORTED,
      { provider: company.code }
    );
  }

  try {
    const desks = await provider.getStopDesks();
    const now = new Date().toISOString();

    // ── Upsert via D1 batch ──────────────────────────────────────────────────
    // Every desk becomes one `INSERT ... ON CONFLICT DO UPDATE` statement.
    // D1's native batch() groups them into a single round-trip per chunk,
    // so a 1,359-desk sync goes from ~10s → ~1s.
    //
    // Why not db.transaction()? D1 does not support Drizzle's transaction API
    // (see feedback_d1_no_transactions memory). batch() is the D1-native
    // atomic alternative and is fully supported.
    //
    // `active` is intentionally NOT in the `set` clause so admin toggles
    // survive re-syncs. On a brand-new row we default active=true; on an
    // existing row we leave the admin-chosen value alone.
    const upsertStatements = desks.map((desk) =>
      db
        .insert(companyStopDesks)
        .values({
          id: crypto.randomUUID(),
          companyId: id,
          code: desk.code,
          name: desk.name,
          commune: desk.commune ?? null,
          address: desk.address ?? null,
          phones: desk.phones ? JSON.stringify(desk.phones) : null,
          active: true,
          syncedAt: now,
        })
        .onConflictDoUpdate({
          target: [companyStopDesks.companyId, companyStopDesks.code],
          set: {
            name: sql`excluded.name`,
            commune: sql`excluded.commune`,
            address: sql`excluded.address`,
            phones: sql`excluded.phones`,
            syncedAt: sql`excluded.synced_at`,
          },
        })
    );

    const BATCH_SIZE = 50;
    for (let i = 0; i < upsertStatements.length; i += BATCH_SIZE) {
      const chunk = upsertStatements.slice(i, i + BATCH_SIZE);
      // Drizzle's batch() requires a non-empty tuple; skip the call if empty
      // (unreachable given the outer guard, but keeps TS happy).
      if (chunk.length > 0) {
        await db.batch(chunk as [typeof chunk[0], ...typeof chunk]);
      }
    }

    // ── Stale-desk cleanup ──────────────────────────────────────────────────
    // Rows whose syncedAt is older than this run's `now` correspond to desks
    // the carrier no longer lists (either the desk was removed or its
    // `has_stop_desk` flag flipped to 0). Hard-delete them: the admin's
    // `active` toggle was for a row that no longer represents a real desk.
    //
    // Edge case accepted: a transient API hiccup that omits a desk would
    // cause one false removal, re-appearing on the next sync with active=true
    // (admin toggle lost for that desk). Simpler than a soft-flag column
    // and matches the mental model "the sync list IS the source of truth".
    const removedResult = await db
      .delete(companyStopDesks)
      .where(
        and(
          eq(companyStopDesks.companyId, id),
          lt(companyStopDesks.syncedAt, now),
        ),
      )
      .returning({ code: companyStopDesks.code });

    const removedCount = removedResult.length;

    console.info(
      `[sync-stop-desks] company=${id} code=${company.code} total=${desks.length} removed=${removedCount}`,
    );
    return c.json({
      success: true,
      data: { total: desks.length, removed: removedCount, syncedAt: now },
    }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch stop desks from provider API";
    console.error(`[sync-stop-desks] failed company=${id}:`, msg);
    throw new ExternalApiError(company.name, msg, { companyId: id, code: company.code });
  }
}

/**
 * POST /delivery-companies/:id/test-connection
 * Verify the company's stored credentials against its carrier API.
 * A negative check outcome (invalid token, API access disabled) is a
 * successful execution — HTTP 200 with ok:false — not an error.
 * Transport failures (timeout, carrier down) surface as 502.
 */
export async function testCompanyConnection(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };

  const company = await queries.getDeliveryCompanyRaw(db, id);
  if (!company) throw new NotFoundError("Delivery company", id);

  if (!company.apiToken) {
    throw new ValidationError(
      `${company.name} is not connected — add API credentials first`,
      ERROR_CODES.MISSING_API_CREDENTIALS,
      { companyId: id }
    );
  }

  let provider;
  try {
    provider = getProvider(company);
  } catch (err) {
    throw new BusinessLogicError(
      err instanceof Error ? err.message : "Provider not available",
      ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      { companyId: id, code: company.code }
    );
  }

  if (typeof provider.verifyConnection !== "function") {
    throw new BusinessLogicError(
      `The ${company.code} provider does not support connection testing`,
      ERROR_CODES.OPERATION_NOT_SUPPORTED,
      { provider: company.code }
    );
  }

  const startMs = Date.now();
  let result;
  try {
    result = await provider.verifyConnection();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection check failed";
    console.error(`[test-connection] failed company=${id}:`, msg);
    throw new ExternalApiError(company.name, msg, { companyId: id, code: company.code });
  }

  console.info(
    `[test-connection] company=${id} code=${company.code} ok=${result.ok} (${Date.now() - startMs}ms)`,
  );
  return c.json({
    success: true,
    data: {
      companyId: id,
      companyName: company.name,
      companyCode: company.code,
      ...result,
    },
  }, 200);
}

/**
 * POST /delivery-companies/:id/reconcile-orders
 *
 * Pull-based drift repair was EcoTrack-only. Removed along with the Algerian
 * carriers — carriers now push status via webhooks.
 */
export async function reconcileCompanyOrders(c: Context<AppContext>) {
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };
  throw new BusinessLogicError(
    `Reconciliation is not supported — carriers push status via webhooks.`,
    ERROR_CODES.OPERATION_NOT_SUPPORTED,
    { companyId: id }
  );
}

/**
 * GET /delivery-companies/:id/stop-desks
 * Read stop desks from company_stop_desks DB table.
 * Supports ?activeOnly=true filter.
 * No live API call — admin must sync first via POST .../sync-stop-desks.
 */
export async function fetchCompanyStopDesks(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };
  const query = (c.req as any).valid?.("query") ?? {
    activeOnly: c.req.query("activeOnly") ?? "true",
  };

  const company = await queries.getDeliveryCompanyById(db, id);
  if (!company) throw new NotFoundError("Delivery company", id);

  const activeOnly = query.activeOnly !== "false"; // default true

  const conditions = [eq(companyStopDesks.companyId, id)];

  if (activeOnly) {
    conditions.push(eq(companyStopDesks.active, true));
  }

  const rows = await db
    .select()
    .from(companyStopDesks)
    .where(and(...conditions))
    .orderBy(companyStopDesks.name)
    .all();

  const desks = rows.map((r) => ({
    ...r,
    phones: r.phones ? JSON.parse(r.phones) as string[] : [],
  }));

  return c.json({
    success: true,
    data: {
      stopDesks: desks,
      total: desks.length,
      company: { id: company.id, name: company.name, code: company.code },
    },
  }, 200);
}

/**
 * PATCH /delivery-companies/:id/stop-desks/:code/toggle
 * Toggle the `active` flag on a single stop desk.
 * Admin can deactivate stop desks that their account can't service.
 * This toggle survives re-syncs.
 */
export async function toggleCompanyStopDesk(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const params = (c.req as any).valid?.("param") ?? { id: c.req.param("id")!, code: c.req.param("code")! };
  const companyId = params.id;
  const code = params.code;

  const existing = await db
    .select({ id: companyStopDesks.id, active: companyStopDesks.active })
    .from(companyStopDesks)
    .where(
      and(
        eq(companyStopDesks.companyId, companyId),
        eq(companyStopDesks.code, code),
      )
    )
    .get();

  if (!existing) {
    throw new NotFoundError("Stop desk", `${companyId}/${code}`);
  }

  const newActive = !existing.active;
  await db
    .update(companyStopDesks)
    .set({ active: newActive })
    .where(eq(companyStopDesks.id, existing.id));

  return c.json({ success: true, data: { code, active: newActive } }, 200);
}

/**
 * DELETE /delivery-companies/:id
 * Delete a delivery company.
 */
export async function deleteDeliveryCompany(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };

  const existing = await queries.getDeliveryCompanyById(db, id);
  
  if (!existing) {
    throw new NotFoundError("Delivery company", id);
  }

  try {
    await queries.deleteDeliveryCompany(db, id);
  } catch (err) {
    throw new BusinessLogicError(
      err instanceof Error ? err.message : "Cannot delete company",
      ERROR_CODES.COMPANY_INACTIVE,
      { companyId: id }
    );
  }

  console.info(`[delivery-companies] deleted company=${id}`);
  return c.json({ success: true }, 200);
}

/**
 * POST /delivery-companies/:id/sync-geo
 *
 * Removed along with the Algerian carriers — geo name sync was Yalidine-only.
 */
export async function syncGeoNames(c: Context<AppContext>) {
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };
  throw new BusinessLogicError(
    `Geo name sync is not supported — carrier-specific geo mapping was removed along with the Algerian carriers.`,
    ERROR_CODES.OPERATION_NOT_SUPPORTED,
    { companyId: id }
  );
}

/**
 * GET /delivery-companies/:id/webhook/events
 *
 * Reads the company's inbound webhook event log — every delivery from every
 * webhook-capable carrier lands in webhook_events with its processing
 * outcome. Carrier-agnostic (provider column distinguishes Yalidine vs ZR).
 * Newest first; orderNumber joined for display; rawPayload excluded.
 */
export async function listWebhookEvents(c: Context<AppContext>) {
  const db = getDb(c.env.DB);
  const { id } = (c.req as any).valid?.("param") ?? { id: c.req.param("id")! };
  const query = (c.req as any).valid?.("query") ?? {
    limit: 25,
    offset: 0,
    result: c.req.query("result"),
  };

  const company = await queries.getDeliveryCompanyById(db, id);
  if (!company) throw new NotFoundError("Delivery company", id);

  const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);

  const conditions = [eq(webhookEvents.companyId, id)];
  if (query.result) {
    conditions.push(eq(webhookEvents.result, String(query.result)));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: webhookEvents.id,
        provider: webhookEvents.provider,
        eventId: webhookEvents.eventId,
        tracking: webhookEvents.tracking,
        eventType: webhookEvents.eventType,
        result: webhookEvents.result,
        newStatus: webhookEvents.newStatus,
        reason: webhookEvents.reason,
        errorMsg: webhookEvents.errorMsg,
        orderId: webhookEvents.orderId,
        orderNumber: orders.orderNumber,
        processedAt: webhookEvents.processedAt,
        createdAt: webhookEvents.createdAt,
      })
      .from(webhookEvents)
      .leftJoin(orders, eq(webhookEvents.orderId, orders.id))
      .where(where)
      .orderBy(desc(webhookEvents.createdAt), desc(webhookEvents.id))
      .limit(limit)
      .offset(offset)
      .all(),
    db
      .select({ total: count() })
      .from(webhookEvents)
      .where(where)
      .get(),
  ]);

  return c.json(
    {
      success: true,
      data: {
        events: rows,
        total: Number(countRow?.total ?? 0),
      },
    },
    200,
  );
}
