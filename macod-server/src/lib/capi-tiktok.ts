/**
 * TikTok Events API (CAPI) client.
 *
 * Sends conversion events to TikTok Ads — mirrors the Meta CAPI pattern.
 * Docs: https://business-api.tiktok.com/portal/docs
 *
 * Endpoint: POST https://business-api.tiktok.com/open_api/v1.3/event/track/
 * Auth: Access-Token header
 *
 * All PII is SHA-256 hashed (TikTok requirement, same as Meta).
 * Phones are normalised to the Moroccan country code 212.
 */

const TIKTOK_API_BASE = "https://business-api.tiktok.com";
const TIKTOK_API_VERSION = "v1.3";
const MA_COUNTRY_CODE = "212";

async function sha256hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.toLowerCase().replace(/\s+/g, ""));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalisePhone(raw: string): string {
  let p = raw.replace(/\D/g, "");
  p = p.replace(/^0+/, "");
  if (!p.startsWith(MA_COUNTRY_CODE)) p = MA_COUNTRY_CODE + p;
  return p;
}

export interface TiktokCapiPayload {
  eventName: string; // "CompletePayment" for Purchase, "SubmitForm" for Lead
  eventId: string;
  eventTime: number;
  eventSourceUrl?: string;
  userData: {
    phone: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    clientIpAddress?: string | null;
    clientUserAgent?: string | null;
    ttp?: string | null; // TikTok cookie ID (equivalent to Meta fbp)
    ttclid?: string | null; // TikTok click ID (equivalent to Meta fbc)
  };
  value?: number;
  currency?: string;
  contentIds?: string[];
  testEventCode?: string | null;
}

export interface TiktokCapiResult {
  success: boolean;
  error?: string;
}

/**
 * Maps MaCod event names to TikTok's event vocabulary.
 * Meta uses "Lead" / "Purchase"; TikTok uses "SubmitForm" / "CompletePayment".
 */
function mapEventName(metaEvent: "Lead" | "Purchase"): string {
  return metaEvent === "Purchase" ? "CompletePayment" : "SubmitForm";
}

export async function sendTiktokCapiEvent(
  pixelCode: string,
  accessToken: string,
  payload: TiktokCapiPayload,
): Promise<TiktokCapiResult> {
  const ud = payload.userData;

  const userData: Record<string, string> = {
    phone: await sha256hex(normalisePhone(ud.phone)),
  };
  if (ud.email) userData.email = await sha256hex(ud.email);
  if (ud.firstName) userData.first_name = await sha256hex(ud.firstName);
  if (ud.lastName) userData.last_name = await sha256hex(ud.lastName);
  if (ud.clientIpAddress) userData.ip = ud.clientIpAddress;
  if (ud.clientUserAgent) userData.user_agent = ud.clientUserAgent;
  if (ud.ttp) userData.ttp = ud.ttp;
  if (ud.ttclid) userData.ttclid = ud.ttclid;

  const eventData: Record<string, unknown> = {
    event: mapEventName(payload.eventName as "Lead" | "Purchase"),
    event_time: payload.eventTime,
    event_id: payload.eventId,
    action_source: "website",
    user_data: userData,
  };
  if (payload.eventSourceUrl) eventData.event_source_url = payload.eventSourceUrl;
  if (payload.value !== undefined) {
    eventData.value = payload.value;
    eventData.currency = payload.currency ?? "MAD";
    if (payload.contentIds?.length) eventData.contents = payload.contentIds.map((id) => ({ content_id: id }));
  }

  const body: Record<string, unknown> = {
    pixel_code: pixelCode,
    events: [eventData],
  };
  if (payload.testEventCode) body.test_event_code = payload.testEventCode;

  const url = `${TIKTOK_API_BASE}/open_api/${TIKTOK_API_VERSION}/event/track/`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`TikTok CAPI network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const json = (await res.json().catch(() => null)) as any;
  if (res.status >= 500) {
    throw new Error(`TikTok CAPI server error ${res.status}: ${json?.message ?? "no message"}`);
  }
  if (!res.ok) {
    return { success: false, error: json?.message ?? `HTTP ${res.status}` };
  }
  return { success: true };
}
