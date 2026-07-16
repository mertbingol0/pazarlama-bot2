const crypto = require("crypto");

const GOOGLE_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_SAFE_RESULTS = 50;
const GOOGLE_MAX_PAGE_SIZE = 20;

function getMaxSafeResults() {
  const parsedValue = Number(process.env.MAX_SAFE_RESULTS);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return DEFAULT_MAX_SAFE_RESULTS;
  }

  return parsedValue;
}

const CATEGORY_KEYWORD_MAP = {
  guzellik: [
    "güzellik salonu",
    "kadın kuaförü",
    "erkek kuaförü",
    "berber",
    "lazer epilasyon merkezi",
    "epilasyon merkezi",
    "protez tırnak",
    "tırnak stüdyosu",
    "cilt bakım merkezi",
    "kalıcı makyaj",
    "kaş kirpik tasarım",
    "spa merkezi",
    "masaj salonu",
  ],
  dugun_organizasyon: [
    "düğün organizasyon",
    "düğün organizasyon firması",
    "organizasyon şirketi",
    "event organizasyon",
    "nişan organizasyon",
    "kına organizasyon",
    "söz nişan organizasyon",
    "düğün planlama",
    "wedding planner",
    "davet organizasyon",
  ],
  fotografcilik: [
    "fotoğrafçı",
    "fotoğraf stüdyosu",
    "düğün fotoğrafçısı",
    "nişan fotoğrafçısı",
    "doğum fotoğrafçısı",
    "ürün fotoğrafçısı",
    "stüdyo fotoğrafçısı",
    "profesyonel fotoğrafçı",
    "video çekim",
    "düğün video çekimi",
  ],

  güzellik: [
    "güzellik salonu",
    "kadın kuaförü",
    "erkek kuaförü",
    "berber",
    "lazer epilasyon merkezi",
    "epilasyon merkezi",
    "protez tırnak",
    "tırnak stüdyosu",
    "cilt bakım merkezi",
    "kalıcı makyaj",
    "kaş kirpik tasarım",
    "spa merkezi",
    "masaj salonu",
  ],

  saglik: [
    "diş kliniği",
    "eczane",
    "özel hastane",
    "tıp merkezi",
    "poliklinik",
    "fizyoterapi merkezi",
    "psikolog",
    "diyetisyen",
    "göz kliniği",
    "dermatoloji kliniği",
  ],

  sağlık: [
    "diş kliniği",
    "eczane",
    "özel hastane",
    "tıp merkezi",
    "poliklinik",
    "fizyoterapi merkezi",
    "psikolog",
    "diyetisyen",
    "göz kliniği",
    "dermatoloji kliniği",
  ],

  yiyecek_icecek: [
    "kafe",
    "cafe",
    "pastane",
    "fırın",
    "dönerci",
    "kebapçı",
    "pideci",
    "tatlıcı",
    "kahvaltı salonu",
    "lokanta",
    "burgerci",
    "kahveci",
  ],

  "yiyecek & içecek": [
    "kafe",
    "cafe",
    "pastane",
    "fırın",
    "dönerci",
    "kebapçı",
    "pideci",
    "tatlıcı",
    "kahvaltı salonu",
    "lokanta",
    "burgerci",
    "kahveci",
  ],

  spor: [
    "spor salonu",
    "fitness merkezi",
    "pilates salonu",
    "pilates stüdyosu",
    "yoga stüdyosu",
    "crossfit salonu",
    "yüzme kursu",
    "dans kursu",
    "boks salonu",
    "kick boks salonu",
  ],

  egitim: [
    "anaokulu",
    "kreş",
    "özel okul",
    "dil kursu",
    "sürücü kursu",
    "etüt merkezi",
    "dershane",
    "müzik kursu",
    "resim kursu",
    "yazılım kursu",
  ],

  eğitim: [
    "anaokulu",
    "kreş",
    "özel okul",
    "dil kursu",
    "sürücü kursu",
    "etüt merkezi",
    "dershane",
    "müzik kursu",
    "resim kursu",
    "yazılım kursu",
  ],

  restoran: [
    "restoran",
    "lokanta",
    "dönerci",
    "kebapçı",
    "pideci",
    "lahmacuncu",
    "burgerci",
    "pizza restoranı",
    "balık restoranı",
    "steakhouse",
    "sushi restoranı",
    "vegan restoran",
  ],

  otel: [
    "otel",
    "hotel",
    "butik otel",
    "apart otel",
    "pansiyon",
    "hostel",
    "konukevi",
    "suit otel",
    "rezidans otel",
    "termal otel",
    "bungalov",
  ],

  veteriner: [
    "veteriner",
    "veteriner kliniği",
    "hayvan hastanesi",
    "pet klinik",
    "hayvan kliniği",
    "veteriner polikliniği",
    "acil veteriner",
    "kedi köpek veterineri",
    "pet shop",
    "pet kuaförü",
    "pet otel",
  ],

  // 1. Doğa, Macera & Aksiyon
  macera_adrenalin: [
    "rafting",
    "zipline",
    "bungee jumping",
    "macera parkı",
    "yüksek ip parkuru",
    "adrenalin parkı",
  ],
  atv_buggy_offroad: [
    "atv safari",
    "buggy turu",
    "jeep safari",
    "off-road",
    "atv kiralama",
    "safari turu",
  ],
  doga_outdoor: [
    "trekking turu",
    "doğa yürüyüşü",
    "kanyon turu",
    "mağara turu",
    "şelale turu",
    "doğa turu",
  ],
  kamp_karavan_glamping: [
    "kamp alanı",
    "çadır kampı",
    "karavan kampı",
    "glamping",
    "bungalov",
    "doğa konaklama",
  ],
  kis_sporlari: [
    "kayak merkezi",
    "kayak okulu",
    "snowboard eğitimi",
    "kayak ekipman kiralama",
    "kızak pisti",
  ],
  hava_ucus_deneyimleri: [
    "balon turu",
    "yamaç paraşütü",
    "paraşüt atlayışı",
    "helikopter turu",
    "gyrocopter turu",
  ],
  paintball_airsoft_lazer_tag: [
    "paintball",
    "paintball sahası",
    "airsoft",
    "lazer tag",
  ],

  // 2. Deniz & Su Aktiviteleri
  su_sporlari: [
    "su sporları merkezi",
    "kano turu",
    "sup kiralama",
    "sörf okulu",
    "jet ski kiralama",
    "wakeboard",
  ],
  dalis_sualti: [
    "dalış merkezi",
    "tüplü dalış",
    "dalış okulu",
    "şnorkel turu",
    "serbest dalış eğitimi",
  ],
  tekne_yat_deneyimleri: [
    "tekne turu",
    "yat kiralama",
    "tekne kiralama",
    "koy turu",
    "gulet turu",
  ],
  balikcilik: [
    "balık avı turu",
    "tekne balıkçılığı",
    "olta balıkçılığı",
    "balıkçılık turu",
  ],

  // 3. Seyahat, Kültür & Sürüş
  sehir_kesif_turlari: [
    "şehir turu",
    "yürüyüş turu",
    "rehberli tur",
    "tur operatörü",
    "gezi turu",
  ],
  kultur_tarih_arkeoloji: [
    "müze",
    "antik kent",
    "tarihi tur",
    "kültür turu",
    "ören yeri",
  ],
  yerel_otantik_deneyimler: [
    "köy kahvaltısı",
    "yöresel ürünler",
    "yerel deneyim turu",
    "el yapımı üretim atölyesi",
  ],
  bisiklet_deneyimleri: [
    "bisiklet turu",
    "bisiklet kiralama",
    "dağ bisikleti turu",
  ],
  motor_surus_deneyimleri: [
    "motosiklet turu",
    "motosiklet kiralama",
    "spor araç kiralama",
    "sürüş deneyimi",
  ],
  go_kart_yaris: [
    "go kart",
    "karting pisti",
    "yarış simülasyonu",
    "yarış pisti",
  ],
  binicilik: [
    "at binme",
    "binicilik kulübü",
    "at çiftliği",
    "at safari",
  ],

  // 4. Gastronomi (Yeme & İçme)
  gastronomi_lezzet_turlari: [
    "gastronomi turu",
    "yemek turu",
    "lezzet turu",
    "sokak lezzetleri turu",
  ],
  yemek_atolyeleri: [
    "yemek atölyesi",
    "yemek kursu",
    "mutfak atölyesi",
    "aşçılık kursu",
  ],
  cikolata_pasta_tatli_atolyeleri: [
    "çikolata atölyesi",
    "pasta atölyesi",
    "pasta kursu",
    "tatlı atölyesi",
    "kurabiye atölyesi",
  ],
  kahve_cay_deneyimleri: [
    "barista atölyesi",
    "barista eğitimi",
    "kahve atölyesi",
    "kahve tadımı",
    "çay tadımı",
  ],
  bag_tadim_deneyimleri: [
    "bağ turu",
    "şarap tadımı",
    "şarap evi",
    "üzüm bağı",
    "bağ evi",
  ],

  // 5. Sanat, Zanaat & Hobi Atölyeleri
  seramik_comlek_atolyeleri: [
    "seramik atölyesi",
    "çömlek atölyesi",
    "seramik kursu",
    "çömlek kursu",
  ],
  resim_gorsel_sanatlar: [
    "resim atölyesi",
    "resim kursu",
    "çizim atölyesi",
    "sanat atölyesi",
  ],
  heykel_uc_boyutlu_tasarim: [
    "heykel atölyesi",
    "heykel kursu",
    "3d tasarım atölyesi",
  ],
  taki_aksesuar_tasarimi: [
    "takı atölyesi",
    "takı tasarım kursu",
    "gümüş takı atölyesi",
  ],
  mum_sabun_dogal_urun_atolyeleri: [
    "mum atölyesi",
    "kokulu mum yapımı",
    "sabun atölyesi",
    "doğal ürün atölyesi",
  ],
  el_sanatlari: [
    "el sanatları atölyesi",
    "örgü atölyesi",
    "nakış kursu",
    "hobi atölyesi",
  ],
  ahsap_tasarim_isleme: [
    "ahşap atölyesi",
    "ahşap oyma atölyesi",
    "marangoz atölyesi",
    "ahşap tasarım",
  ],
  cam_sanati: [
    "cam atölyesi",
    "cam üfleme atölyesi",
    "vitray atölyesi",
    "cam boyama",
  ],
  moda_tekstil_tasarim: [
    "dikiş kursu",
    "moda tasarım kursu",
    "tekstil atölyesi",
    "terzilik kursu",
  ],
  fotograf_deneyimleri: [
    "fotoğrafçılık kursu",
    "fotoğraf turu",
    "fotoğraf atölyesi",
  ],

  // 6. Eğlence, Sahne & Dijital
  dans_deneyimleri: [
    "dans kursu",
    "dans okulu",
    "salsa kursu",
    "tango kursu",
    "bale okulu",
  ],
  muzik_atolyeleri: [
    "müzik kursu",
    "müzik okulu",
    "gitar kursu",
    "piyano kursu",
    "vokal eğitimi",
  ],
  dj_muzik_produksiyon: [
    "dj kursu",
    "dj akademi",
    "müzik prodüksiyon kursu",
    "kayıt stüdyosu",
  ],
  konser_canli_muzik: [
    "konser salonu",
    "canlı müzik mekanı",
    "performans sahnesi",
  ],
  tiyatro_sahne_sanatlari: [
    "tiyatro",
    "tiyatro sahnesi",
    "sahne sanatları merkezi",
    "tiyatro kursu",
    "opera",
  ],
  standup_komedi: [
    "stand up",
    "komedi kulübü",
    "gösteri merkezi",
  ],
  festival_senlikler: [
    "festival alanı",
    "etkinlik alanı",
    "fuar alanı",
    "etkinlik organizasyonu",
  ],
  gece_hayati_eglence: [
    "gece kulübü",
    "eğlence mekanı",
    "beach club",
    "bar",
  ],
  escape_room_bulmaca: [
    "escape room",
    "kaçış oyunu",
    "kaçış evi",
  ],
  vr_dijital_deneyimler: [
    "vr deneyim merkezi",
    "sanal gerçeklik merkezi",
    "vr oyun salonu",
  ],
  gaming_espor: [
    "e-spor merkezi",
    "oyun salonu",
    "internet kafe",
    "playstation kafe",
  ],
  bowling_salon_eglenceleri: [
    "bowling salonu",
    "bilardo salonu",
    "oyun merkezi",
  ],

  // 7. Sağlık, İyi Yaşam & Kişisel Gelişim
  spor_fitness: [
    "spor salonu",
    "fitness merkezi",
    "kişisel antrenör",
    "crossfit salonu",
    "açık hava spor alanı",
  ],
  yoga_pilates_wellness: [
    "yoga stüdyosu",
    "pilates stüdyosu",
    "wellness merkezi",
    "yoga kampı",
  ],
  meditasyon_nefes: [
    "meditasyon merkezi",
    "nefes koçluğu",
    "mindfulness atölyesi",
  ],
  kisisel_gelisim_farkindalik: [
    "kişisel gelişim merkezi",
    "yaşam koçluğu",
    "koçluk merkezi",
    "farkındalık atölyesi",
  ],
  egitim_beceri_atolyeleri: [
    "eğitim merkezi",
    "kurs merkezi",
    "beceri atölyesi",
    "uygulamalı eğitim",
  ],
  dil_kultur_bulusmalari: [
    "dil kursu",
    "konuşma kulübü",
    "dil okulu",
  ],
  astroloji_spirituel: [
    "astroloji danışmanlığı",
    "astrolog",
    "spiritüel merkez",
  ],

  // 8. Çocuk, Aile & Özel Konseptler
  cocuk_atolyeleri: [
    "çocuk atölyesi",
    "çocuk sanat atölyesi",
    "çocuk mutfak atölyesi",
    "çocuk aktivite merkezi",
  ],
  cocuk_eglence_oyun: [
    "çocuk oyun alanı",
    "çocuk eğlence merkezi",
    "oyun merkezi",
    "trambolin park",
  ],
  aile_aktiviteleri: [
    "aile eğlence merkezi",
    "aktivite merkezi",
    "aile aktivite parkı",
  ],
  bilim_teknoloji_robotik: [
    "robotik kodlama kursu",
    "kodlama kursu",
    "bilim merkezi",
    "maker atölyesi",
  ],
  uzay_astronomi: [
    "gözlemevi",
    "planetaryum",
    "astronomi merkezi",
  ],
  ciftlik_hayvan_deneyimleri: [
    "çiftlik",
    "çiftlik kafe",
    "hayvanat bahçesi",
    "at çiftliği",
  ],
  ekolojik_yasam_tarim: [
    "organik çiftlik",
    "ekolojik çiftlik",
    "permakültür çiftliği",
    "hobi bahçesi",
  ],
  romantik_cift_deneyimleri: [
    "romantik restoran",
    "romantik organizasyon",
    "çiftlere özel aktivite",
  ],
  dogum_gunu_kutlama: [
    "doğum günü organizasyonu",
    "parti evi",
    "kutlama organizasyonu",
  ],
  grup_arkadas_aktiviteleri: [
    "eğlence merkezi",
    "grup aktiviteleri",
    "aktivite merkezi",
  ],
  kurumsal_takim_aktiviteleri: [
    "team building",
    "kurumsal etkinlik firması",
    "kurumsal organizasyon",
  ],
  luks_premium_deneyimler: [
    "vip transfer",
    "lüks araç kiralama",
    "özel tur",
    "lüks yat kiralama",
  ],
  gizli_surpriz_deneyimler: [
    "sürpriz organizasyon",
    "evlilik teklifi organizasyonu",
    "sürpriz kutlama",
  ],
};

function normalizeCategoryKey(category = "") {
  return String(category).trim().toLocaleLowerCase("tr-TR");
}

function getCategoryKeywords(category) {
  const key = normalizeCategoryKey(category);

  return CATEGORY_KEYWORD_MAP[key] || [category];
}

function buildSearchQuery({ keyword, city, district }) {
  return [keyword, district, city, "Türkiye"]
    .filter((value) => value && String(value).trim())
    .join(" ");
}

// Google addressComponents'ten Türkiye için il (administrative_area_level_1)
// ve ilçe (administrative_area_level_2 / sublocality) ayrıştırır.
function parseTurkishLocation(addressComponents = []) {
  let city = null;
  let district = null;

  for (const component of addressComponents) {
    const types = component.types || [];
    const value = component.longText || component.shortText || null;

    if (types.includes("administrative_area_level_1")) city = value;
    if (types.includes("administrative_area_level_2")) district = value;
  }

  if (!district) {
    for (const component of addressComponents) {
      const types = component.types || [];
      if (types.includes("sublocality_level_1") || types.includes("locality")) {
        district = component.longText || component.shortText || null;
        break;
      }
    }
  }

  return { city, district };
}

function normalizeGoogleBusiness(
  place,
  { category, city, district, searchKeyword } = {}
) {
  const parsedLocation = parseTurkishLocation(place.addressComponents);

  return {
    id: place.id || place.name || crypto.randomUUID(),
    name: place.displayName?.text || "İsimsiz İşletme",
    address: place.formattedAddress || "",
    googleCity: parsedLocation.city,
    googleDistrict: parsedLocation.district,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
    website: place.websiteUri || "",
    googleMapsUrl: place.googleMapsUri || "",
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || null,

    lat: place.location?.latitude || null,
    lng: place.location?.longitude || null,

    location: place.location
      ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        }
      : null,

    status: "pending",
    whatsappStatus: "not_sent",
    templateSentAt: null,
    lastIncomingAt: null,
    lastMessageText: null,
    lastWhatsappMessageId: null,

    source: "google_places",
    category: category || null,
    city: city || null,
    district: district || null,
    searchKeyword: searchKeyword || category || null,
  };
}

function normalizeLimit(limit) {
  const maxSafeResults = getMaxSafeResults();

  if (limit === "all") {
    return maxSafeResults;
  }

  const parsedLimit = Number(limit);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(parsedLimit, DEFAULT_LIMIT), maxSafeResults);
}

function getBusinessUniqueKey(business) {
  if (business.id) {
    return `id:${business.id}`;
  }

  if (business.googleMapsUrl) {
    return `maps:${business.googleMapsUrl}`;
  }

  if (business.phone) {
    return `phone:${business.phone.replace(/\D/g, "")}`;
  }

  return `name-address:${business.name}-${business.address}`
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeUniqueBusinesses(existingBusinesses, newBusinesses) {
  const businessMap = new Map();

  [...existingBusinesses, ...newBusinesses].forEach((business) => {
    const key = getBusinessUniqueKey(business);

    if (!businessMap.has(key)) {
      businessMap.set(key, business);
    }
  });

  return Array.from(businessMap.values());
}

async function searchGooglePlacesByKeyword({
  apiKey,
  keyword,
  category,
  city,
  district,
  pageSize,
}) {
  const textQuery = buildSearchQuery({
    keyword,
    city,
    district,
  });

  const response = await fetch(GOOGLE_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.rating",
        "places.userRatingCount",
        "places.location",
        "places.addressComponents",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "tr",
      regionCode: "TR",
      pageSize,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Google Places API error:", {
      keyword,
      textQuery,
      error: data,
    });

    throw new Error(
      data.error?.message || "Google Places API isteği başarısız oldu."
    );
  }

  return (data.places || []).map((place) =>
    normalizeGoogleBusiness(place, {
      category,
      city,
      district,
      searchKeyword: keyword,
    })
  );
}

async function searchBusinessesWithGoogle({
  category,
  city = "",
  district = "",
  limit = 10,
}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY .env içinde tanımlı değil.");
  }

  if (!category) {
    throw new Error("Kategori bilgisi zorunludur.");
  }

  const safeLimit = normalizeLimit(limit);
  const keywords = getCategoryKeywords(category);

  const perKeywordLimit = Math.min(
    GOOGLE_MAX_PAGE_SIZE,
    Math.max(2, Math.ceil(safeLimit / keywords.length) + 1)
  );

  let businesses = [];
  const searchedQueries = [];
  let successfulRequests = 0;
  const requestErrors = [];

  for (const keyword of keywords) {
    const textQuery = buildSearchQuery({
      keyword,
      city,
      district,
    });

    console.log("Google Places alt kategori araması:", textQuery);

    searchedQueries.push(textQuery);

    try {
      const keywordBusinesses = await searchGooglePlacesByKeyword({
        apiKey,
        keyword,
        category,
        city,
        district,
        pageSize: perKeywordLimit,
      });

      successfulRequests += 1;
      businesses = mergeUniqueBusinesses(businesses, keywordBusinesses);
    } catch (error) {
  requestErrors.push(error);
  console.error(`"${keyword}" araması başarısız oldu:`, {
    name: error.name,
    message: error.message,
    cause: error.cause?.message,
    stack: error.stack,
  });
}
  }

  // Hiçbir istek başarılı olmadıysa (ör. kota/izin hatası) bunu "0 sonuç"
  // gibi ele alma; hata fırlat ki çağıran taraf kayıtlı sonuçlara (cache)
  // düşebilsin ve mevcut veriler boş listeyle ezilmesin.
  if (successfulRequests === 0 && requestErrors.length > 0) {
    throw new Error(
      requestErrors[0].message || "Google Places API isteği başarısız oldu."
    );
  }

  const limitedBusinesses = businesses.slice(0, safeLimit);

  return {
    provider: "google_places",
    query: {
      category,
      city,
      district,
      limit: safeLimit,
      keywords,
      searchedQueries,
    },
    businesses: limitedBusinesses,
  };
}

// Tek bir işletmeyi adı + il + ilçe ile Google'da arar, en iyi eşleşmeyi döndürür.
async function lookupBusinessOnGoogle({ name, city = "", district = "" }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("Google Places API anahtarı tanımlı değil.");
  }

  const keyword = String(name || "").trim();
  if (!keyword) {
    return null;
  }

  const results = await searchGooglePlacesByKeyword({
    apiKey,
    keyword,
    category: null,
    city,
    district,
    pageSize: 3,
  });

  return results[0] || null;
}

module.exports = {
  searchBusinessesWithGoogle,
  lookupBusinessOnGoogle,
};