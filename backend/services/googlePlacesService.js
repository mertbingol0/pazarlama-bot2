const crypto = require("crypto");

const GOOGLE_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

function normalizeGoogleBusiness(place, { category, city, district } = {}) {
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
  };
}

function normalizeLimit(limit) {
  if (limit === "all") return 20;

  const parsedLimit = Number(limit);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return 10;
  }

  return Math.min(parsedLimit, 20);
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
  const textQuery = `${category} ${district} ${city} Türkiye`;

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
      pageSize: safeLimit,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Google Places API error:", data);

    throw new Error(
      data.error?.message || "Google Places API isteği başarısız oldu."
    );
  }

  const businesses = (data.places || []).map((place) =>
    normalizeGoogleBusiness(place, { category, city, district })
  );

  return {
    provider: "google_places",
    query: {
      category,
      city,
      district,
      textQuery,
      limit: safeLimit,
    },
    businesses,
  };
}

module.exports = {
  searchBusinessesWithGoogle,
};