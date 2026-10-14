// ╔══════════════════════════════════════════════════════════════════════╗
// ║  CUSTOMIZE HERE (Custom mode) — DEFAULT_CONFIG only                  ║
// ║  Edit DEFAULT_CONFIG to change fallback colors/font/meta when the    ║
// ║  API is unreachable. All other code in this file is core engine.     ║
// ╚══════════════════════════════════════════════════════════════════════╝
/**
 * Per-request store data helpers.
 * Call once per page — pass the returned config to StoreLayout to avoid
 * duplicate API fetches.
 */
import { fetchStoreConfig } from "@/core/api/client";
import { resolveContent } from "@/theme/content";
import type { StoreConfig } from "@/core/api/types";
import type { StoreFrontContent } from "@/theme/content";

export const DEFAULT_CONFIG: StoreConfig = {
  id: "",
  name: "ezzarostyle",
  domain: null,
  logoUrl: null,
  themeId: "theme01",
  primaryColor: "#1a1a1a",
  accentColor: "#c9a227",
  bgColor: "#fafafa",
  fontFamily: "Cairo, sans-serif",
  fontUrl: null,
  lang: "ar",
  currency: "MAD",
  currencySymbol: "د.م.",
  contentJson: null,
  metaTitle: "ezzarostyle — متجر الأزياء العصرية",
  metaDescription: "اكتشف أحدث صيحات الموضة: سترات، تيشيرتات، جينز، وهوديات بجودة عالية وأسعار مناسبة. الدفع عند الاستلام والتوصيل لجميع مدن المغرب.",
  ogImage: null,
  announcementBar: "توصيل مجاني للطلبات فوق 400 د.م · الدفع عند الاستلام",
  reviewsEnabled: true,
  cartEnabled: false,
  freeShippingThreshold: 400,
  otpEnabled: false,
  turnstileEnabled: false,
  turnstileSiteKey: null,
  status: "active",
  pixelId: null,
  conversionEvent: null,
  pages: [],
  legalContact: null,
  whatsapp: null,
};

export interface StoreContext {
  config: StoreConfig;
  content: StoreFrontContent;
  isRTL: boolean;
}

export async function getStoreContext(): Promise<StoreContext> {
  const config = (await fetchStoreConfig()) ?? DEFAULT_CONFIG;
  const content = resolveContent(config.lang, config.contentJson);
  const isRTL = config.lang === "ar";
  return { config, content, isRTL };
}
