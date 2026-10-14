/**
 * Morocco administrative divisions — the MaCod counterpart to the
 * Algeria wilayas/communes dataset.
 *
 * Morocco is organised into 12 regions, which are subdivided into 75
 * provinces and prefectures. For COD logistics we care about three
 * granularities:
 *
 *   - Region   (12 entries)    — top-level grouping used for reporting
 *   - Province (75 entries)    — the unit carriers price by (Cathedis, Amana)
 *   - Hub      (~20 entries)   — major commercial cities worth surfacing
 *                                 as a quick-pick dropdown on the storefront
 *
 * The `id` field is a stable kebab-case slug used as a primary key in the
 * eventual `morocco_provinces` / `morocco_cities` tables. The `region`
 * field is the parent region slug; the `hubCode` is the IATA-style 3-letter
 * code some carriers (Cathedis, DHL Maroc) use on their labels.
 *
 * Locale names: `nameFr` is the official French form (used by Barid Al-Maghrib
 * and most carriers); `nameAr` is the Arabic form (used on storefront UI and
 * shipping labels for end customers). `nameDarija` is an optional Moroccan
 * dialect form for friendly UI copy.
 *
 * Source: official Moroccan administrative division (decoupage administratif)
 * as of the 2015 regional reform. Hub codes follow IATA airport codes where
 * they exist, falling back to a synthetic 3-letter slug.
 */

export interface MoroccanRegion {
  id: string;
  nameFr: string;
  nameAr: string;
}

export interface MoroccanProvince {
  id: string;
  nameFr: string;
  nameAr: string;
  region: string;
  hubCode: string;
}

export interface MoroccanHub {
  id: string;
  nameFr: string;
  nameAr: string;
  nameDarija?: string;
  region: string;
  hubCode: string;
  /** Province id this hub falls under. */
  province: string;
}

export const MOROCCAN_REGIONS: readonly MoroccanRegion[] = [
  { id: "oriental",            nameFr: "Oriental",                  nameAr: "الشرق" },
  { id: "tanger-tetouan",      nameFr: "Tanger-Tétouan-Al Hoceïma",  nameAr: "طنجة-تطوان-الحسيمة" },
  { id: "fes-meknes",          nameFr: "Fès-Meknès",                nameAr: "فاس-مكناس" },
  { id: "raba-sale-kenitra",   nameFr: "Rabat-Salé-Kénitra",        nameAr: "الرباط-سلا-القنيطرة" },
  { id: "benni-mellal-khenifra", nameFr: "Béni Mellal-Khénifra",     nameAr: "بني ملال-خنيفرة" },
  { id: "casablanca-settat",   nameFr: "Casablanca-Settat",          nameAr: "الدار البيضاء-سطات" },
  { id: "marrakech-safi",      nameFr: "Marrakech-Safi",             nameAr: "مراكش-آسفي" },
  { id: "draa-tafilalet",      nameFr: "Drâa-Tafilalet",             nameAr: "درعة-تافيلالت" },
  { id: "souss-massa",         nameFr: "Souss-Massa",                nameAr: "سوس-ماسة" },
  { id: "guelmim-ouednoun",    nameFr: "Guelmim-Oued Noun",          nameAr: "كلميم-وادي نون" },
  { id: "laayoune-sakia",      nameFr: "Laâyoune-Sakia El Hamra",    nameAr: "العيون-الساقية الحمراء" },
  { id: "dakhla-oued-dahab",   nameFr: "Dakhla-Oued Ed-Dahab",       nameAr: "الداخلة-وادي الذهب" },
];

/**
 * 75 provinces and prefectures. `id` is a stable slug; carriers that
 * match by exact string (Cathedis) keep their own spelling table.
 */
export const MOROCCAN_PROVINCES: readonly MoroccanProvince[] = [
  // ── Oriental ────────────────────────────────────────────────────────────
  { id: "oujda-angad",      nameFr: "Oujda-Angad",         nameAr: "وجدة-أنجاد",            region: "oriental", hubCode: "OUD" },
  { id: "berkane",          nameFr: "Berkane",             nameAr: "بركان",                  region: "oriental", hubCode: "BKN" },
  { id: "taourirt",        nameFr: "Taourirt",             nameAr: "تاوريرت",                region: "oriental", hubCode: "TRT" },
  { id: "jerada",           nameFr: "Jerada",               nameAr: "جرادة",                  region: "oriental", hubCode: "JRD" },
  { id: "nador",            nameFr: "Nador",               nameAr: "الناظور",                region: "oriental", hubCode: "NDR" },
  { id: "driouch",          nameFr: "Driouch",             nameAr: "الدريوش",                region: "oriental", hubCode: "DCH" },
  { id: "figuig",           nameFr: "Figuig",               nameAr: "فكيك",                  region: "oriental", hubCode: "FGG" },
  { id: "guercif",          nameFr: "Guercif",              nameAr: "جرسيف",                  region: "oriental", hubCode: "GCF" },

  // ── Tanger-Tétouan-Al Hoceïma ───────────────────────────────────────────
  { id: "tanger-assilah",   nameFr: "Tanger-Assilah",      nameAr: "طنجة-أصيلة",             region: "tanger-tetouan", hubCode: "TNG" },
  { id: "mdiq-fnideq",      nameFr: "M'Diq-Fnideq",        nameAr: "المضيق-الفنيدق",         region: "tanger-tetouan", hubCode: "MDQ" },
  { id: "tetouan",          nameFr: "Tétouan",             nameAr: "تطوان",                  region: "tanger-tetouan", hubCode: "TTN" },
  { id: "larache",          nameFr: "Larache",             nameAr: "العرائش",                region: "tanger-tetouan", hubCode: "LCH" },
  { id: "chefchaouen",      nameFr: "Chefchaouen",         nameAr: "شفشاون",                 region: "tanger-tetouan", hubCode: "CHF" },
  { id: "ouezzane",         nameFr: "Ouezzane",            nameAr: "وزان",                   region: "tanger-tetouan", hubCode: "OZZ" },
  { id: "al-hoceima",       nameFr: "Al Hoceïma",          nameAr: "الحسيمة",                region: "tanger-tetouan", hubCode: "HOC" },

  // ── Fès-Meknès ──────────────────────────────────────────────────────────
  { id: "fes",              nameFr: "Fès",                 nameAr: "فاس",                    region: "fes-meknes", hubCode: "FEZ" },
  { id: "meknes",           nameFr: "Meknès",              nameAr: "مكناس",                  region: "fes-meknes", hubCode: "MKN" },
  { id: "hajeb",            nameFr: "El Hajeb",            nameAr: "الحاجب",                  region: "fes-meknes", hubCode: "HJB" },
  { id: "ifrane",           nameFr: "Ifrane",              nameAr: "إفران",                  region: "fes-meknes", hubCode: "IFR" },
  { id: "boulmane",         nameFr: "Boulemane",           nameAr: "بولمان",                 region: "fes-meknes", hubCode: "BLM" },
  { id: "taza",             nameFr: "Taza",                nameAr: "تازة",                   region: "fes-meknes", hubCode: "TAZ" },
  { id: "sefrou",           nameFr: "Sefrou",              nameAr: "صفرو",                   region: "fes-meknes", hubCode: "SEF" },
  { id: "moulay-yaacoub",   nameFr: "Moulay Yaâcoub",      nameAr: "مولاي يعقوب",            region: "fes-meknes", hubCode: "MYB" },

  // ── Rabat-Salé-Kénitra ──────────────────────────────────────────────────
  { id: "rabat",            nameFr: "Rabat",               nameAr: "الرباط",                 region: "raba-sale-kenitra", hubCode: "RBA" },
  { id: "sale",             nameFr: "Salé",                nameAr: "سلا",                   region: "raba-sale-kenitra", hubCode: "SLE" },
  { id: "skhirat-temara",   nameFr: "Skhirate-Témara",     nameAr: "الصخيرات-تمارة",         region: "raba-sale-kenitra", hubCode: "TEM" },
  { id: "kenitra",          nameFr: "Kénitra",             nameAr: "القنيطرة",               region: "raba-sale-kenitra", hubCode: "KNT" },
  { id: "sidi-kacem",       nameFr: "Sidi Kacem",          nameAr: "سيدي قاسم",              region: "raba-sale-kenitra", hubCode: "SKM" },
  { id: "sidi-slimane",     nameFr: "Sidi Slimane",        nameAr: "سيدي سليمان",            region: "raba-sale-kenitra", hubCode: "SSL" },
  { id: "khemisset",         nameFr: "Khémisset",           nameAr: "الخميسات",               region: "raba-sale-kenitra", hubCode: "KHM" },

  // ── Béni Mellal-Khénifra ────────────────────────────────────────────────
  { id: "beni-mellal",      nameFr: "Béni Mellal",         nameAr: "بني ملال",               region: "benni-mellal-khenifra", hubCode: "BML" },
  { id: "azilal",           nameFr: "Azilal",              nameAr: "أزيلال",                 region: "benni-mellal-khenifra", hubCode: "AZL" },
  { id: "fquih-ben-salah",  nameFr: "Fquih Ben Salah",     nameAr: "الفقيه بن صالح",          region: "benni-mellal-khenifra", hubCode: "FBS" },
  { id: "khenifra",         nameFr: "Khénifra",            nameAr: "خنيفرة",                 region: "benni-mellal-khenifra", hubCode: "KNF" },

  // ── Casablanca-Settat ───────────────────────────────────────────────────
  { id: "casablanca",       nameFr: "Casablanca",          nameAr: "الدار البيضاء",          region: "casablanca-settat", hubCode: "CAS" },
  { id: "mohammedia",       nameFr: "Mohammedia",          nameAr: "المحمدية",               region: "casablanca-settat", hubCode: "MOH" },
  { id: "nouaceur",         nameFr: "Nouaceur",            nameAr: "النواصر",                region: "casablanca-settat", hubCode: "NCE" },
  { id: "mediouna",         nameFr: "Médiouna",            nameAr: "المديونة",               region: "casablanca-settat", hubCode: "MDN" },
  { id: "benslimane",       nameFr: "Benslimane",          nameAr: "بن سليمان",              region: "casablanca-settat", hubCode: "BSL" },
  { id: "berrechid",        nameFr: "Berrechid",           nameAr: "برشيد",                  region: "casablanca-settat", hubCode: "BRD" },
  { id: "settat",           nameFr: "Settat",              nameAr: "سطات",                   region: "casablanca-settat", hubCode: "SET" },
  { id: "sidi-bennour",     nameFr: "Sidi Bennour",        nameAr: "سيدي بنور",              region: "casablanca-settat", hubCode: "SBN" },
  { id: "el-jadida",        nameFr: "El Jadida",           nameAr: "الجديدة",                region: "casablanca-settat", hubCode: "JDA" },

  // ── Marrakech-Safi ──────────────────────────────────────────────────────
  { id: "marrakech",        nameFr: "Marrakech",           nameAr: "مراكش",                  region: "marrakech-safi", hubCode: "RAK" },
  { id: "chichaoua",        nameFr: "Chichaoua",           nameAr: "شيشاوة",                 region: "marrakech-safi", hubCode: "CHI" },
  { id: "al-haouz",         nameFr: "Al Haouz",           nameAr: "الحوز",                  region: "marrakech-safi", hubCode: "AHZ" },
  { id: "rhamna",           nameFr: "Rehamna",             nameAr: "الرحامنة",               region: "marrakech-safi", hubCode: "RHM" },
  { id: "essaouira",        nameFr: "Essaouira",          nameAr: "الصويرة",                 region: "marrakech-safi", hubCode: "ESU" },
  { id: "safi",             nameFr: "Safi",                nameAr: "آسفي",                   region: "marrakech-safi", hubCode: "SAF" },
  { id: "youssoufia",       nameFr: "Youssoufia",          nameAr: "اليوسفية",               region: "marrakech-safi", hubCode: "YUS" },
  { id: "el-kelaat",        nameFr: "El Kelaâ des Sraghna", nameAr: "قلعة السراغنة",         region: "marrakech-safi", hubCode: "KSR" },

  // ── Drâa-Tafilalet ──────────────────────────────────────────────────────
  { id: "errachidia",       nameFr: "Errachidia",          nameAr: "الرشيدية",               region: "draa-tafilalet", hubCode: "ERC" },
  { id: "ouarzazate",        nameFr: "Ouarzazate",         nameAr: "ورزازات",                 region: "draa-tafilalet", hubCode: "ORZ" },
  { id: "tinghir",          nameFr: "Tinghir",            nameAr: "تنغير",                  region: "draa-tafilalet", hubCode: "TGH" },
  { id: "zagora",           nameFr: "Zagora",              nameAr: "زاكورة",                 region: "draa-tafilalet", hubCode: "ZAG" },
  { id: "midelt",           nameFr: "Midelt",             nameAr: "ميدلت",                  region: "draa-tafilalet", hubCode: "MID" },

  // ── Souss-Massa ─────────────────────────────────────────────────────────
  { id: "agadir",           nameFr: "Agadir-Ida Ou Tanane", nameAr: "أكادير-إدا وتنان",     region: "souss-massa", hubCode: "AGA" },
  { id: "inzegane",         nameFr: "Inezgane-Aït Melloul", nameAr: "إنزكان-آيت ملول",      region: "souss-massa", hubCode: "INZ" },
  { id: "chtouka",          nameFr: "Chtouka-Aït Baha",    nameAr: "شتوكة-آيت باها",        region: "souss-massa", hubCode: "CTA" },
  { id: "taroudant",        nameFr: "Taroudant",           nameAr: "تارودانت",               region: "souss-massa", hubCode: "TRD" },
  { id: "tiznit",           nameFr: "Tiznit",              nameAr: "تيزنيت",                 region: "souss-massa", hubCode: "TIZ" },
  { id: "tata",              nameFr: "Tata",                nameAr: "طاطا",                   region: "souss-massa", hubCode: "TAT" },

  // ── Guelmim-Oued Noun ───────────────────────────────────────────────────
  { id: "guelmim",          nameFr: "Guelmim",            nameAr: "كلميم",                  region: "guelmim-ouednoun", hubCode: "GLM" },
  { id: "assa-zag",         nameFr: "Assa-Zag",            nameAr: "آسا-الزاك",              region: "guelmim-ouednoun", hubCode: "ASZ" },
  { id: "tan-tan",          nameFr: "Tan-Tan",             nameAr: "طانطان",                 region: "guelmim-ouednoun", hubCode: "TTN2" },
  { id: "sidi-ifni",        nameFr: "Sidi Ifni",           nameAr: "سيدي إفني",              region: "guelmim-ouednoun", hubCode: "SIF" },

  // ── Laâyoune-Sakia El Hamra ─────────────────────────────────────────────
  { id: "laayoune",         nameFr: "Laâyoune",            nameAr: "العيون",                 region: "laayoune-sakia", hubCode: "LYN" },
  { id: "boujdour",         nameFr: "Boujdour",            nameAr: "بوجدور",                 region: "laayoune-sakia", hubCode: "BJD" },
  { id: "tarfaya",          nameFr: "Tarfaya",             nameAr: "طرفاية",                 region: "laayoune-sakia", hubCode: "TFY" },
  { id: "es-smara",         nameFr: "Es-Semara",           nameAr: "السمارة",                region: "laayoune-sakia", hubCode: "SMR" },

  // ── Dakhla-Oued Ed-Dahab ────────────────────────────────────────────────
  { id: "dakhla",           nameFr: "Dakhla",              nameAr: "الداخلة",                region: "dakhla-oued-dahab", hubCode: "DKH" },
  { id: "aousserd",         nameFr: "Aousserd",            nameAr: "أوسرد",                 region: "dakhla-oued-dahab", hubCode: "AUS" },
];

/**
 * Major commercial hubs surfaced as a quick-pick dropdown on the storefront
 * COD form. These are the ~20 cities that account for the bulk of COD
 * volume in Morocco — surfacing them shaves seconds off form-fill time and
 * cuts typos that would otherwise become failed deliveries.
 */
export const MOROCCAN_HUBS: readonly MoroccanHub[] = [
  { id: "casablanca",  nameFr: "Casablanca",  nameAr: "الدار البيضاء",  nameDarija: "كازا",    region: "casablanca-settat",  hubCode: "CAS", province: "casablanca" },
  { id: "rabat",       nameFr: "Rabat",       nameAr: "الرباط",         nameDarija: "الرباط",  region: "raba-sale-kenitra",  hubCode: "RBA", province: "rabat" },
  { id: "sale",        nameFr: "Salé",        nameAr: "سلا",            nameDarija: "سلا",     region: "raba-sale-kenitra",  hubCode: "SLE", province: "sale" },
  { id: "marrakech",   nameFr: "Marrakech",   nameAr: "مراكش",          nameDarija: "مراكش",   region: "marrakech-safi",     hubCode: "RAK", province: "marrakech" },
  { id: "fes",         nameFr: "Fès",         nameAr: "فاس",            nameDarija: "فاس",     region: "fes-meknes",         hubCode: "FEZ", province: "fes" },
  { id: "meknes",      nameFr: "Meknès",      nameAr: "مكناس",          nameDarija: "مكناس",   region: "fes-meknes",         hubCode: "MKN", province: "meknes" },
  { id: "tanger",      nameFr: "Tanger",      nameAr: "طنجة",           nameDarija: "طنجة",    region: "tanger-tetouan",     hubCode: "TNG", province: "tanger-assilah" },
  { id: "tetouan",     nameFr: "Tétouan",     nameAr: "تطوان",          nameDarija: "تطوان",   region: "tanger-tetouan",     hubCode: "TTN", province: "tetouan" },
  { id: "agadir",      nameFr: "Agadir",      nameAr: "أكادير",         nameDarija: "أكادير",  region: "souss-massa",        hubCode: "AGA", province: "agadir" },
  { id: "kenitra",     nameFr: "Kénitra",     nameAr: "القنيطرة",       nameDarija: "القنيطرة",region: "raba-sale-kenitra",  hubCode: "KNT", province: "kenitra" },
  { id: "oujda",       nameFr: "Oujda",       nameAr: "وجدة",           nameDarija: "وجدة",    region: "oriental",           hubCode: "OUD", province: "oujda-angad" },
  { id: "el-jadida",   nameFr: "El Jadida",   nameAr: "الجديدة",        nameDarija: "الجديدة", region: "casablanca-settat",  hubCode: "JDA", province: "el-jadida" },
  { id: "beni-mellal", nameFr: "Béni Mellal", nameAr: "بني ملال",       nameDarija: "بني ملال",region: "benni-mellal-khenifra",hubCode: "BML", province: "beni-mellal" },
  { id: "nador",       nameFr: "Nador",       nameAr: "الناظور",        nameDarija: "الناظور", region: "oriental",           hubCode: "NDR", province: "nador" },
  { id: "settat",      nameFr: "Settat",      nameAr: "سطات",           nameDarija: "سطات",    region: "casablanca-settat",  hubCode: "SET", province: "settat" },
  { id: "berrechid",   nameFr: "Berrechid",   nameAr: "برشيد",          nameDarija: "برشيد",   region: "casablanca-settat",  hubCode: "BRD", province: "berrechid" },
  { id: "safi",        nameFr: "Safi",        nameAr: "آسفي",           nameDarija: "آسفي",    region: "marrakech-safi",     hubCode: "SAF", province: "safi" },
  { id: "taroudant",   nameFr: "Taroudant",   nameAr: "تارودانت",       nameDarija: "تارودانت",region: "souss-massa",        hubCode: "TRD", province: "taroudant" },
  { id: "larache",     nameFr: "Larache",     nameAr: "العرائش",         nameDarija: "العرائش", region: "tanger-tetouan",     hubCode: "LCH", province: "larache" },
  { id: "khemisset",   nameFr: "Khémisset",   nameAr: "الخميسات",        nameDarija: "الخميسات",region: "raba-sale-kenitra",  hubCode: "KHM", province: "khemisset" },
];

// ── Lookups ───────────────────────────────────────────────────────────────

const REGION_BY_ID = new Map(MOROCCAN_REGIONS.map((r) => [r.id, r]));
const PROVINCE_BY_ID = new Map(MOROCCAN_PROVINCES.map((p) => [p.id, p]));
const HUB_BY_ID = new Map(MOROCCAN_HUBS.map((h) => [h.id, h]));

export function getMoroccanRegion(id: string): MoroccanRegion | undefined {
  return REGION_BY_ID.get(id);
}

export function getMoroccanProvince(id: string): MoroccanProvince | undefined {
  return PROVINCE_BY_ID.get(id);
}

export function getMoroccanHub(id: string): MoroccanHub | undefined {
  return HUB_BY_ID.get(id);
}

/** All provinces that belong to a region, in stable declaration order. */
export function getProvincesByRegion(regionId: string): MoroccanProvince[] {
  return MOROCCAN_PROVINCES.filter((p) => p.region === regionId);
}

/**
 * Find a province by its French or Arabic name (case-insensitive, trimmed).
 * Used by the storefront COD form when a customer types a city name rather
 * than picking from the dropdown.
 */
export function findMoroccanProvinceByName(name: string): MoroccanProvince | undefined {
  const needle = name.trim().toLowerCase();
  return MOROCCAN_PROVINCES.find(
    (p) => p.nameFr.toLowerCase() === needle || p.nameAr === name.trim(),
  );
}
