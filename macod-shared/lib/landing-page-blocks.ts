/**
 * Landing page block schema — the JSON shape stored in D1 and rendered by
 * the Astro BlockRenderer.
 *
 * A landing page is an ordered array of blocks. Each block has a type and
 * a data payload. The renderer switches on type and renders the matching
 * Astro component.
 *
 * MaCod supports 35+ block types covering every section a Moroccan COD
 * landing page needs: product display, social proof, urgency, offers,
 * comparison, layouts, and raw HTML.
 *
 * Page templates control the page chrome (full-width, with/without header
 * and footer) and are separate from blocks.
 */

// ─── Page templates ──────────────────────────────────────────────────────────

export type PageTemplate =
  | "full_width"           // no header, no footer, no padding — pure landing page
  | "header_footer"        // standard storefront chrome (header + footer + content)
  | "header_only"          // header but no footer (common for checkout-focused LPs)
  | "footer_only"          // footer but no header
  | "bare";                // completely bare — just the blocks, no chrome at all

// ─── Block union ──────────────────────────────────────────────────────────────

export type PageBlock =
  | { type: "dynamic_products"; data: DynamicProductsData }
  | { type: "product_reviews"; data: ProductReviewsData }
  | { type: "categories_list"; data: CategoriesListData }
  | { type: "express_checkout"; data: ExpressCheckoutData }
  | { type: "product_image"; data: ProductImageData }
  | { type: "product_variant"; data: ProductVariantData }
  | { type: "icons_box"; data: IconsBoxData }
  | { type: "html_editor"; data: HtmlEditorData }
  | { type: "title"; data: TitleData }
  | { type: "list"; data: ListData }
  | { type: "images_list"; data: ImagesListData }
  | { type: "image"; data: ImageData }
  | { type: "youtube"; data: YoutubeData }
  | { type: "columns"; data: ColumnsData }
  | { type: "container"; data: ContainerData }
  | { type: "spacer"; data: SpacerData }
  | { type: "header"; data: HeaderData }
  | { type: "footer"; data: FooterData }
  | { type: "link_button"; data: LinkButtonData }
  | { type: "custom_code"; data: CustomCodeData }
  | { type: "countdown"; data: CountdownData }
  | { type: "product_button"; data: ProductButtonData }
  | { type: "product_button_timer"; data: ProductButtonTimerData }
  | { type: "text_2_columns"; data: Text2ColumnsData }
  | { type: "text_3_columns"; data: Text3ColumnsData }
  | { type: "button_2_columns"; data: Button2ColumnsData }
  | { type: "button_3_columns"; data: Button3ColumnsData }
  | { type: "offer_timer"; data: OfferTimerData }
  | { type: "social_media"; data: SocialMediaData }
  | { type: "faq"; data: FaqData }
  | { type: "problem_solution"; data: ProblemSolutionData }
  | { type: "benefits"; data: BenefitsData }
  | { type: "before_after"; data: BeforeAfterData }
  | { type: "product_comparison"; data: ProductComparisonData }
  | { type: "trust"; data: TrustData }
  | { type: "hero"; data: HeroData }
  | { type: "urgency"; data: UrgencyData }
  | { type: "pricing_packs"; data: PricingPacksData }
  | { type: "features"; data: FeaturesData }
  | { type: "cod_form"; data: CodFormData }
  | { type: "reviews"; data: ReviewsData };

// ─── Block data interfaces ───────────────────────────────────────────────────

/** Dynamic products — auto-pulls featured/new products from the catalog */
export interface DynamicProductsData {
  /** "featured" | "new" | "best_sellers" | "category" */
  source: string;
  categoryId?: string;
  limit?: number;
  layout?: "grid" | "carousel";
  columns?: number; // 2, 3, or 4
}

/** Product reviews — displays customer reviews for a specific product */
export interface ProductReviewsData {
  productId: string;
  limit?: number;
  showRating?: boolean;
  showImage?: boolean;
}

/** Categories list — horizontal scroll of product categories */
export interface CategoriesListData {
  title?: string;
  layout?: "grid" | "carousel" | "list";
  columns?: number;
}

/** Express checkout — sticky 1-click COD form */
export interface ExpressCheckoutData {
  buttonText?: string;
  showQuantity?: boolean;
  showCity?: boolean;
  shippingNotice?: string;
}

/** Single product image */
export interface ProductImageData {
  src: string;
  alt?: string;
  productId?: string;
  /** "contain" | "cover" — how the image fits its container */
  fit?: string;
  maxWidth?: number;
  borderRadius?: number;
}

/** Product variant selector — color/size picker */
export interface ProductVariantData {
  productId: string;
  label?: string;
  showPrice?: boolean;
}

/** Icons box — row of icons with titles (trust badges, shipping features) */
export interface IconsBoxData {
  items: Array<{
    icon: string;  // heroicons name or emoji
    title: string;
    desc?: string;
  }>;
  columns?: number;
}

/** HTML editor — raw HTML the merchant pastes directly */
export interface HtmlEditorData {
  html: string;
}

/** Title — heading text with level */
export interface TitleData {
  text: string;
  level?: 1 | 2 | 3 | 4;
  align?: "left" | "center" | "right";
  color?: string;
}

/** List — bullet or numbered list */
export interface ListData {
  items: string[];
  ordered?: boolean;
  style?: "disc" | "decimal" | "none";
}

/** Images list — gallery of multiple images */
export interface ImagesListData {
  images: Array<{ src: string; alt?: string }>;
  columns?: number;
  gap?: number;
  layout?: "grid" | "masonry";
}

/** Single image */
export interface ImageData {
  src: string;
  alt?: string;
  maxWidth?: number;
  borderRadius?: number;
  link?: string;
}

/** YouTube embed */
export interface YoutubeData {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  mute?: boolean;
  maxWidth?: number;
}

/** Columns — multi-column layout container */
export interface ColumnsData {
  /** Each column is itself an array of blocks */
  columns: PageBlock[][];
  gap?: number;
  /** Column width ratios, e.g. [1, 1] or [2, 1] */
  ratios?: number[];
}

/** Container — wraps blocks with padding/background options */
export interface ContainerData {
  blocks: PageBlock[];
  padding?: number;
  background?: string;
  maxWidth?: number;
  borderRadius?: number;
}

/** Spacer — vertical whitespace */
export interface SpacerData {
  height: number; // pixels
}

/** Header — page navigation bar */
export interface HeaderData {
  logo?: string;
  links?: Array<{ label: string; url: string }>;
  showCart?: boolean;
}

/** Footer — page footer */
export interface FooterData {
  text?: string;
  links?: Array<{ label: string; url: string }>;
  showPaymentIcons?: boolean;
}

/** Link button — clickable button that links to a URL */
export interface LinkButtonData {
  text: string;
  url: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  openNewTab?: boolean;
}

/** Custom code — raw HTML/CSS/JS injected into the page */
export interface CustomCodeData {
  html: string;
  /** Where to inject: "body" (default) | "head" */
  position?: "body" | "head";
}

/** Countdown — urgency timer */
export interface CountdownData {
  endDate: string; // ISO date
  label?: string;
  /** "dh:ms" (days:hours:minutes:seconds) | "h:ms" */
  format?: string;
  color?: string;
  backgroundColor?: string;
}

/** Product + button — product card with an order button */
export interface ProductButtonData {
  productId: string;
  buttonText?: string;
  showPrice?: boolean;
  showImage?: boolean;
  layout?: "horizontal" | "vertical";
}

/** Product + button + timer — product card with order button and countdown */
export interface ProductButtonTimerData {
  productId: string;
  buttonText?: string;
  endDate: string;
  timerLabel?: string;
  showPrice?: boolean;
}

/** Text 2 columns — two text blocks side by side */
export interface Text2ColumnsData {
  leftTitle?: string;
  leftText: string;
  rightTitle?: string;
  rightText: string;
  gap?: number;
}

/** Text 3 columns — three text blocks side by side */
export interface Text3ColumnsData {
  col1Title?: string;
  col1Text: string;
  col2Title?: string;
  col2Text: string;
  col3Title?: string;
  col3Text: string;
  gap?: number;
}

/** Button 2 columns — two buttons side by side */
export interface Button2ColumnsData {
  left: { text: string; url: string; variant?: string };
  right: { text: string; url: string; variant?: string };
  gap?: number;
}

/** Button 3 columns — three buttons side by side */
export interface Button3ColumnsData {
  col1: { text: string; url: string; variant?: string };
  col2: { text: string; url: string; variant?: string };
  col3: { text: string; url: string; variant?: string };
  gap?: number;
}

/** Offer + timer — promotional offer with countdown */
export interface OfferTimerData {
  title: string;
  description?: string;
  endDate: string;
  originalPrice?: number;
  offerPrice: number;
  buttonText?: string;
  buttonUrl?: string;
}

/** Social media — social proof icons/links */
export interface SocialMediaData {
  title?: string;
  platforms: Array<{
    platform: "facebook" | "instagram" | "tiktok" | "youtube" | "whatsapp";
    url: string;
    followers?: string;
  }>;
}

/** FAQ — accordion of questions */
export interface FaqData {
  title?: string;
  questions: Array<{ q: string; a: string }>;
}

/** Problem / Solution — pain point + how the product solves it */
export interface ProblemSolutionData {
  problemTitle?: string;
  problem: string;
  problemImage?: string;
  solutionTitle?: string;
  solution: string;
  solutionImage?: string;
}

/** Benefits — list of product benefits with icons */
export interface BenefitsData {
  title?: string;
  benefits: Array<{
    icon?: string;
    title: string;
    desc?: string;
  }>;
  columns?: number;
}

/** Before / After — comparison images */
export interface BeforeAfterData {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

/** Product comparison — side-by-side comparison of this product vs competitors */
export interface ProductComparisonData {
  title?: string;
  features: string[];
  ourProduct: { name: string; values: string[] };
  competitors: Array<{ name: string; values: string[] }>;
}

/** Trust — trust badges and guarantees */
export interface TrustData {
  badges: string[];
  title?: string;
}

// ─── Legacy blocks (kept for backwards compat) ──────────────────────────────

export interface HeroData {
  title: string;
  subtitle?: string;
  images: string[];
  videoUrl?: string;
}

export interface UrgencyData {
  stockLeft: number;
  endDate: string;
  message?: string;
}

export interface PricingPacksData {
  packs: Array<{
    qty: number;
    price: number;
    badge?: string;
    compareAtPrice?: number;
  }>;
}

export interface FeaturesData {
  items: Array<{ icon: string; title: string; desc: string }>;
}

export interface CodFormData {
  buttonText?: string;
  shippingNotice?: string;
}

export interface ReviewsData {
  reviews: Array<{
    author: string;
    city: string;
    text: string;
    image?: string;
    rating: number;
  }>;
}

// ─── Page config (blocks + template) ─────────────────────────────────────────

export interface LandingPageConfig {
  template: PageTemplate;
  blocks: PageBlock[];
  /** Global spacing settings */
  imageGap?: number;
  sidePadding?: number;
  contentMaxWidth?: number;
}

// ─── Block type metadata (for the dashboard editor) ───────────────────────────

export interface BlockTypeMeta {
  type: PageBlock["type"];
  label: string;
  labelAr?: string;
  category: "product" | "social" | "layout" | "urgency" | "content" | "media";
  icon?: string;
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
  // Product
  { type: "dynamic_products", label: "Dynamic Products", labelAr: "منتجات ديناميكية", category: "product" },
  { type: "product_reviews", label: "Product Reviews", labelAr: "تقييمات المنتج", category: "product" },
  { type: "product_image", label: "Product Image", labelAr: "صورة المنتج", category: "product" },
  { type: "product_variant", label: "Product Variant", labelAr: "خيارات المنتج", category: "product" },
  { type: "product_button", label: "Product + Button", labelAr: "منتج + زر", category: "product" },
  { type: "product_button_timer", label: "Product + Button + Timer", labelAr: "منتج + زر + مؤقت", category: "product" },
  { type: "express_checkout", label: "Express Checkout", labelAr: "دفع سريع", category: "product" },
  { type: "pricing_packs", label: "Pricing Packs", labelAr: "باقات الأسعار", category: "product" },
  { type: "product_comparison", label: "Product Comparison", labelAr: "مقارنة المنتجات", category: "product" },

  // Social
  { type: "product_reviews", label: "Product Reviews", labelAr: "تقييمات", category: "social" },
  { type: "reviews", label: "Reviews", labelAr: "آراء العملاء", category: "social" },
  { type: "social_media", label: "Social Media", labelAr: "وسائل التواصل", category: "social" },
  { type: "trust", label: "Trust Badges", labelAr: "شارات الثقة", category: "social" },
  { type: "faq", label: "FAQ", labelAr: "الأسئلة الشائعة", category: "social" },

  // Urgency
  { type: "countdown", label: "Countdown", labelAr: "عد تنازلي", category: "urgency" },
  { type: "offer_timer", label: "Offer + Timer", labelAr: "عرض + مؤقت", category: "urgency" },
  { type: "urgency", label: "Urgency", labelAr: "إلحاح", category: "urgency" },

  // Layout
  { type: "columns", label: "Columns", labelAr: "أعمدة", category: "layout" },
  { type: "container", label: "Container", labelAr: "حاوية", category: "layout" },
  { type: "spacer", label: "Spacer", labelAr: "فراغ", category: "layout" },
  { type: "header", label: "Header", labelAr: "ترويسة", category: "layout" },
  { type: "footer", label: "Footer", labelAr: "تذييل", category: "layout" },
  { type: "text_2_columns", label: "Text 2 Columns", labelAr: "نص عمودين", category: "layout" },
  { type: "text_3_columns", label: "Text 3 Columns", labelAr: "نص 3 أعمدة", category: "layout" },
  { type: "button_2_columns", label: "Button 2 Columns", labelAr: "زرين", category: "layout" },
  { type: "button_3_columns", label: "Button 3 Columns", labelAr: "3 أزرار", category: "layout" },

  // Content
  { type: "title", label: "Title", labelAr: "عنوان", category: "content" },
  { type: "list", label: "List", labelAr: "قائمة", category: "content" },
  { type: "html_editor", label: "HTML Editor", labelAr: "محرر HTML", category: "content" },
  { type: "custom_code", label: "Custom Code", labelAr: "كود مخصص", category: "content" },
  { type: "link_button", label: "Link Button", labelAr: "زر رابط", category: "content" },
  { type: "categories_list", label: "Categories List", labelAr: "قائمة الفئات", category: "content" },
  { type: "benefits", label: "Benefits", labelAr: "الفوائد", category: "content" },
  { type: "problem_solution", label: "Problem / Solution", labelAr: "مشكلة / حل", category: "content" },
  { type: "before_after", label: "Before / After", labelAr: "قبل / بعد", category: "content" },

  // Media
  { type: "image", label: "Image", labelAr: "صورة", category: "media" },
  { type: "images_list", label: "Images List", labelAr: "معرض صور", category: "media" },
  { type: "youtube", label: "YouTube", labelAr: "يوتيوب", category: "media" },
  { type: "icons_box", label: "Icons Box", labelAr: "صناديق أيقونات", category: "media" },
  { type: "hero", label: "Hero", labelAr: "هيرو", category: "media" },
  { type: "features", label: "Features", labelAr: "مميزات", category: "media" },
];

export const PAGE_TEMPLATES: Array<{ value: PageTemplate; label: string; labelAr: string; description: string }> = [
  {
    value: "full_width",
    label: "Full Width",
    labelAr: "عرض كامل",
    description: "No header, no footer — pure landing page for ads",
  },
  {
    value: "header_footer",
    label: "Header + Footer",
    labelAr: "ترويسة + تذييل",
    description: "Standard storefront chrome with navigation and footer",
  },
  {
    value: "header_only",
    label: "Header Only",
    labelAr: "ترويسة فقط",
    description: "Header navigation but no footer — common for checkout-focused pages",
  },
  {
    value: "footer_only",
    label: "Footer Only",
    labelAr: "تذييل فقط",
    description: "Footer but no header — minimal chrome",
  },
  {
    value: "bare",
    label: "Bare",
    labelAr: "بدون إطار",
    description: "Completely bare — just the blocks, no chrome at all",
  },
];
