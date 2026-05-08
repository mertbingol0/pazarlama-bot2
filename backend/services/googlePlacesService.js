const crypto = require("crypto");

const GOOGLE_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

const GOOGLE_MAX_PAGE_SIZE = 20;
const DEFAULT_LIMIT = 10;
const MAX_SAFE_RESULTS = Number(process.env.MAX_SAFE_RESULTS || 50);

const CATEGORY_KEYWORD_MAP = {
  güzellik: [
    "güzellik salonu",
    "kadın kuaförü",
    "erkek kuaförü",
    "berber",
    "lazer epilasyon",
    "epilasyon merkezi",
    "protez tırnak",
    "tırnak stüdyosu",
    "cilt bakım merkezi",
    "kalıcı makyaj",
    "kaş kirpik tasarım",
    "spa merkezi",
    "masaj salonu",
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

  "yiyecek & içecek": [
    "kafe",
    "pastane",
    "fırın",
    "dönerci",
    "kebapçı",
    "pideci",
    "tatlıcı",
    "kahvaltı salonu",
    "lokanta",
    "burgerci",
  ],

  spor: [
    "spor salonu",
    "fitness merkezi",
    "pilates salonu",
    "yoga stüdyosu",
    "crossfit salonu",
    "yüzme kursu",
    "dans kursu",
    "boks salonu",
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
    "kahvaltı salonu",
  ],

  otel: [
    "otel",
    "butik otel",
    "apart otel",
    "pansiyon",
    "hostel",
    "konukevi",
    "bungalov",
    "termal otel",
  ],

  veteriner: [
    "veteriner",
    "veteriner kliniği",
    "hayvan hastanesi",
    "pet shop",
    "pet kuaförü",
    "hayvan bakım merkezi",
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

function normalizeGoogleBusiness(
  place,
  { category, city, district, searchKeyword } = {}
) {
  return {
    id: place.id || place.name || crypto.randomUUID(),
    name: place.displayName?.text || "İsimsiz İşletme",
    address: place.formattedAddress || "",
    phone:
      place.nationalPhoneNumber ||
      place.internationalPhoneNumber ||
      "",
    website: place.websiteUri || "",
    googleMapsUrl: place.googleMapsUri || "",
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || null,
    location: place.location
      ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        }
      : null,
    status: "pending",
    source: "google_places",
    category: category || null,
    city: city || null,
    district: district || null,
    searchKeyword: searchKeyword || category || null,
  };
}

function normalizeLimit(limit) {
  if (limit === "all") {
    return MAX_SAFE_RESULTS;
  }

  const parsedLimit = Number(limit);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(parsedLimit, DEFAULT_LIMIT), MAX_SAFE_RESULTS);
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
  const textQuery = `${keyword} ${district} ${city} Türkiye`;

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
  city,
  district,
  limit = 10,
}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY .env içinde tanımlı değil.");
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
    const textQuery = `${keyword} ${district} ${city} Türkiye`;

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
      console.error(`"${keyword}" araması başarısız oldu:`, error.message);
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