/**
 * Snapchat Conversions API client.
 *
 * Sends conversion events to Snapchat Ads — mirrors the Meta CAPI pattern.
 * Docs: https://marketingapi.snapchat.com/docs/
 *
 * Endpoint: POST https://tr.snapchat.com/api/v1/pixels/{pixelId}/events
 * Auth: Bearer token
 *
 * All PII is SHA-256 hashed (Snapchat requirement, same as Meta).
 * Phones are normalised to the Moroccan country code 212.
 */

const SNAPCHAT_API_BASE = "https://tr.snapchat.com/api/v1";
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

export interface SnapchatCapiPayload {
  eventName: string; // "PURCHASE" for Purchase, "SIGN_UP" for Lead
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
    scid?: string | null; // Snapchat cookie ID (equivalent to Meta fbp)
    clic_id?: string | null; // Snapchat click ID (equivalent to Meta fbc)
  };
  value?: number;
  currency?: string;
  contentIds?: string[];
  testEventCode?: string | null;
}

export interface SnapchatCapiResult {
  success: boolean;
  error?: string;
}

/**
 * Maps MaCod event names to Snapchat's event vocabulary.
 * Meta uses "Lead" / "Purchase"; Snapchat uses "SIGN_UP" / "PURCHASE".
 */
function mapEventName(metaEvent: "Lead" | "Purchase"): string {
  return metaEvent === "Purchase" ? "PURCHASE" : "SIGN_UP";
}

export async function sendSnapchatCapiEvent(
  pixelId: string,
  accessToken: string,
  payload: SnapchatCapiPayload,
): Promise<SnapchatCapiResult> {
  const ud = payload.userData;

  const hashedUserData: Record<string, string> = {
    ph: await sha256hex(normalisePhone(ud.phone)),
  };
  if (ud.email) hashedUserData.em = await sha256hex(ud.email);
  if (ud.firstName) hashedUserData.fn = await sha256hex(ud.firstName);
  if (ud.lastName) hashedUserData.ln = await sha256hex(ud.lastName);

  const userData: Record<string, unknown> = { ...hashedUserData };
  if (ud.clientIpAddress) userData.client_ip_address = ud.clientIpAddress;
  if (ud.clientUserAgent) userData.client_user_agent = ud.clientUserAgent;
  if (ud.scid) userData.scid = ud.scid;
  if (ud.clic_id) userData.clic_id = ud.clic_id;

  const eventData: Record<string, unknown> = {
    event_name: mapEventName(payload.eventName as "Lead" | "Purchase"),
    event_time: payload.eventTime,
    event_id: payload.eventId,
    action_source: "WEB",
    user_data: userData,
  };
  if (payload.eventSourceUrl) eventData.event_source_url = payload.eventSourceUrl;
  if (payload.value !== undefined) {
    eventData.custom_data = {
      currency: payload.currency ?? "MAD",
      value: payload.value,
      ...(payload.contentIds?.length ? { content_ids: payload.contentIds, content_type: "PRODUCT" } : {}),
    };
  }

  const body: Record<string, unknown> = { data: [eventData] };
  if (payload.testEventCode) body.test_event_code = payload.testEventCode;

  const url = `${SNAPCHAT_API_BASE}/pixels/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Snapchat CAPI network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const json = (await res.json().catch(() => null)) as any;
  if (res.status >= 500) {
    throw new Error(`Snapchat CAPI server error ${res.status}: ${json?.message ?? "no message"}`);
  }
  if (!res.ok) {
    return { success: false, error: json?.message ?? `HTTP ${res.status}` };
  }
  return { success: true };
}
