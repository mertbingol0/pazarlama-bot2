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

function normalizeGoogleBusiness(
  place,
  { category, city, district, searchKeyword } = {}
) {
  return {
    id: place.id || place.name || crypto.randomUUID(),
    name: place.displayName?.text || "İsimsiz İşletme",
    address: place.formattedAddress || "",
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

      businesses = mergeUniqueBusinesses(businesses, keywordBusinesses);
    } catch (error) {
  console.error(`"${keyword}" araması başarısız oldu:`, {
    name: error.name,
    message: error.message,
    cause: error.cause?.message,
    stack: error.stack,
  });
}
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

module.exports = {
  searchBusinessesWithGoogle,
};