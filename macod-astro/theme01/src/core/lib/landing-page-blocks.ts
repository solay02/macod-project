/**
 * Landing page block types — re-exported from macod-shared.
 *
 * The theme can't import from macod-shared directly (it imports drizzle-orm
 * which isn't available in the browser bundle). This file re-exports only
 * the type definitions, which are erased at compile time.
 */

export type {
  PageBlock,
  PageTemplate,
  LandingPageConfig,
  BlockTypeMeta,
  DynamicProductsData,
  ProductReviewsData,
  CategoriesListData,
  ExpressCheckoutData,
  ProductImageData,
  ProductVariantData,
  IconsBoxData,
  HtmlEditorData,
  TitleData,
  ListData,
  ImagesListData,
  ImageData,
  YoutubeData,
  ColumnsData,
  ContainerData,
  SpacerData,
  HeaderData,
  FooterData,
  LinkButtonData,
  CustomCodeData,
  CountdownData,
  ProductButtonData,
  ProductButtonTimerData,
  Text2ColumnsData,
  Text3ColumnsData,
  Button2ColumnsData,
  Button3ColumnsData,
  OfferTimerData,
  SocialMediaData,
  FaqData,
  ProblemSolutionData,
  BenefitsData,
  BeforeAfterData,
  ProductComparisonData,
  TrustData,
  HeroData,
  UrgencyData,
  PricingPacksData,
  FeaturesData,
  CodFormData,
  ReviewsData,
} from "../../../../../macod-shared/lib/landing-page-blocks";

export { BLOCK_TYPES, PAGE_TEMPLATES } from "../../../../../macod-shared/lib/landing-page-blocks";
