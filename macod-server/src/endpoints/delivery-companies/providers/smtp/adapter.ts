/**
 * SMTP Carrier — sends order details via email instead of calling a carrier API.
 *
 * MaCod Phase 2 replacement for Sendit. For merchants who fulfill orders
 * manually (no Cathedis/Amana API account), the SMTP carrier emails the
 * order details to the fulfillment team's address. The team then processes
 * the parcel through whatever courier they use.
 *
 * How it works:
 *   createShipment() → sends an HTML email with the order details to the
 *     merchant's fulfillment email address. Returns a locally-generated
 *     tracking number (SMTP-{timestamp}-{orderId}) so the order row has
 *     something to track. No label URL — the email IS the notification.
 *   validateShipment() → no-op (always returns true). There's no carrier
 *     API to validate against; the email was already sent on create.
 *   getStopDesks() → returns empty (SMTP has no stop-desk network).
 *   getTrackingInfo() → returns empty (no carrier tracking — the merchant
 *     updates the order status manually when they ship/deliver).
 *
 * The webhook translator maps email delivery events (bounce/complaint) to
 * the MaCod vocabulary so the webhook router can flag failed notifications.
 *
 * Configuration: the fulfillment email address is stored in
 * delivery_companies.api_endpoint (e.g., "fulfillment@mystore.ma"). The
 * email subject + body template live in this adapter.
 */

import type {
  DeliveryProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  UpdateShipmentInput,
  TrackingEvent,
  StopDesk,
} from "../types";
import type { MoroccanCarrier, MoroccanCarrierStatusEvent } from "../../../../../../macod-shared/lib/morocco-carrier";
import { sendTransactionalEmail } from "../../../../../../macod-shared/lib/transactional-email";
import type { AppDb } from "../../../../../../macod-shared/db/client";

/**
 * SMTP webhook payload — email delivery events from the email provider
 * (Sendili). These tell us whether the order notification email reached
 * the fulfillment team.
 */
export interface SmtpWebhookPayload {
  /** The message_id returned by sendTransactionalEmail(). */
  message_id: string;
  /** Email event type: "delivered" | "bounced" | "complained" | "opened". */
  event: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Recipient address. */
  recipient?: string;
  /** Bounce reason if event=bounced. */
  reason?: string;
}

const SMTP_STATUS_MAP: Record<string, MoroccanCarrierStatusEvent["status"]> = {
  delivered: "LIVRÉ",       // email delivered = order notification reached the team
  bounced: "REFUSÉ",        // email bounced = notification failed
  complained: "REFUSÉ",
  opened: "EN_COURS",       // email opened = team is processing
};

export class SmtpProvider implements MoroccanCarrier {
  readonly code = "smtp";
  readonly currency = "MAD" as const;

  private readonly fulfillmentEmail: string;
  private readonly db: AppDb | null;

  /**
   * @param fulfillmentEmail The address to send order notifications to.
   *        Stored in delivery_companies.api_endpoint when the carrier code
   *        is "smtp". Required.
   * @param db The D1 database handle — needed by sendTransactionalEmail()
   *        to look up the store's email config. Null in test contexts where
   *        the email send is mocked.
   */
  constructor(fulfillmentEmail: string, db: AppDb | null = null) {
    if (!fulfillmentEmail || !fulfillmentEmail.includes("@")) {
      throw new Error("SMTP carrier: a valid fulfillment email address is required (stored in api_endpoint)");
    }
    this.fulfillmentEmail = fulfillmentEmail;
    this.db = db;
  }

  // ─── DeliveryProvider interface ────────────────────────────────────────────

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    if (!input.provinceId) {
      throw new Error("SMTP carrier: provinceId is required (Morocco province slug or city name)");
    }

    // Generate a local tracking number — there's no carrier API to assign one.
    const timestamp = Date.now().toString(36).toUpperCase();
    const orderSuffix = input.orderId.slice(0, 8).toUpperCase();
    const trackingNumber = `SMTP-${timestamp}-${orderSuffix}`;

    // Build the notification email.
    const subject = `طلب جديد #${input.orderId} — ${input.customerName} — ${input.amount} درهم`;
    const html = this.buildOrderEmailHtml(input, trackingNumber);
    const text = this.buildOrderEmailText(input, trackingNumber);

    // Send via the existing transactional email path.
    if (this.db) {
      const outcome = await sendTransactionalEmail(this.db, {
        to: this.fulfillmentEmail,
        subject,
        html,
        text,
        idempotencyKey: `order-${input.orderId}`,
      });

      if (!outcome.sent && outcome.error) {
        throw new Error(`SMTP carrier: failed to send order notification email (${outcome.error})`);
      }
    }

    return {
      trackingNumber,
      labelUrl: undefined, // no carrier label — the email IS the notification
      rawResponse: {
        carrier: "smtp",
        trackingNumber,
        sentTo: this.fulfillmentEmail,
        orderId: input.orderId,
      },
    };
  }

  async validateShipment(_trackingNumber: string): Promise<boolean> {
    // No-op: the email was already sent on create. There's no carrier API
    // to "validate" against. Returns true so the dispatch flow completes.
    return true;
  }

  async getStopDesks(): Promise<StopDesk[]> {
    // SMTP has no stop-desk network — the fulfillment team handles delivery.
    return [];
  }

  async updateShipment(_trackingNumber: string, _input: UpdateShipmentInput): Promise<boolean> {
    // No-op: the email was already sent. Updates to the order after dispatch
    // are handled by the dashboard, not by re-emailing the carrier.
    return true;
  }

  async deleteShipment(_trackingNumber: string): Promise<boolean> {
    // No-op: can't unsend an email. The merchant cancels the order from
    // the dashboard, which updates the order status.
    return true;
  }

  async addRemark(trackingNumber: string, content: string): Promise<boolean> {
    // Send a follow-up email with the remark.
    if (this.db) {
      await sendTransactionalEmail(this.db, {
        to: this.fulfillmentEmail,
        subject: `ملاحظة على الطلب ${trackingNumber}`,
        html: `<p>${content}</p>`,
        text: content,
      });
    }
    return true;
  }

  async getTrackingInfo(_trackingNumber: string): Promise<TrackingEvent[]> {
    // No carrier tracking — the merchant updates the order status manually.
    return [];
  }

  getLabelUrl(_trackingNumber: string): string | undefined {
    // No label — the email IS the notification.
    return undefined;
  }

  // ─── MoroccanCarrier interface ──────────────────────────────────────────────

  translateWebhookEvent(raw: unknown): MoroccanCarrierStatusEvent {
    const payload = raw as SmtpWebhookPayload;
    const status = SMTP_STATUS_MAP[payload.event] ?? "EN_ATTENTE";
    return {
      trackingNumber: payload.message_id,
      status,
      eventTime: payload.timestamp,
      note: payload.reason ?? payload.event,
      raw,
    };
  }

  // ─── Email template builders ────────────────────────────────────────────────

  private buildOrderEmailHtml(input: CreateShipmentInput, trackingNumber: string): string {
    const rows = [
      ["رقم الطلب", input.orderId],
      ["رقم التتبع", trackingNumber],
      ["الاسم", input.customerName],
      ["الهاتف", input.phone],
      ["المدينة", input.province ?? input.provinceId ?? ""],
      ["العنوان", input.address ?? "—"],
      ["المبلغ", `${input.amount} درهم`],
      ["المنتج", input.productDescription],
      ["نوع التوصيل", input.stopDesk ? "مكتب" : "منزل"],
    ];

    const rowsHtml = rows
      .map(([label, value]) => `<tr><td style="padding:8px 16px;border-bottom:1px solid #eee;font-weight:bold">${label}</td><td style="padding:8px 16px;border-bottom:1px solid #eee">${value}</td></tr>`)
      .join("");

    return `
      <div style="font-family:Cairo,sans-serif;max-width:600px;margin:0 auto;direction:rtl">
        <h2 style="background:#7c3aed;color:white;padding:16px;border-radius:12px 12px 0 0;margin:0">طلب جديد للمعالجة</h2>
        <table style="width:100%;border-collapse:collapse">
          ${rowsHtml}
        </table>
        <p style="padding:16px;color:#666;font-size:14px">يرجى معالجة هذا الطلب في أقرب وقت ممكن. تم إنشاء هذا البريد تلقائياً بواسطة MaCod.</p>
      </div>
    `;
  }

  private buildOrderEmailText(input: CreateShipmentInput, trackingNumber: string): string {
    return [
      `طلب جديد للمعالجة`,
      ``,
      `رقم الطلب: ${input.orderId}`,
      `رقم التتبع: ${trackingNumber}`,
      `الاسم: ${input.customerName}`,
      `الهاتف: ${input.phone}`,
      `المدينة: ${input.province ?? input.provinceId ?? ""}`,
      `العنوان: ${input.address ?? "—"}`,
      `المبلغ: ${input.amount} درهم`,
      `المنتج: ${input.productDescription}`,
      `نوع التوصيل: ${input.stopDesk ? "مكتب" : "منزل"}`,
      ``,
      `يرجى معالجة هذا الطلب في أقرب وقت ممكن.`,
    ].join("\n");
  }
}
