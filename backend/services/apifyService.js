async function searchBusinessesWithApify({ category, city, district }) {
  const token = process.env.APIFY_TOKEN;
  const actorId = process.env.APIFY_ACTOR_ID;

  if (!token) {
    throw new Error("APIFY_TOKEN .env içinde tanımlı değil.");
  }

  if (!actorId) {
    throw new Error("APIFY_ACTOR_ID .env içinde tanımlı değil.");
  }

  const input = {
    language: "tr",
    locationQuery: `${district}, ${city}, Türkiye`,
    maxCrawledPlacesPerSearch: 5,
    maximumLeadsEnrichmentRecords: 0,
    scrapeContacts: false,
    scrapeDirectories: false,
    scrapeImageAuthors: false,
    scrapePlaceDetailPage: false,
    scrapeReviewsPersonalData: false,
    scrapeSocialMediaProfiles: {
      facebooks: false,
      instagrams: false,
      tiktoks: false,
      twitters: false,
      youtubes: false,
    },
    scrapeTableReservationProvider: false,
    searchStringsArray: [category],
    skipClosedPlaces: false,
    verifyLeadsEnrichmentEmails: false,
  };

  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Apify API error:", JSON.stringify(data, null, 2));
    throw new Error(data.error?.message || "Apify isteği başarısız oldu.");
  }

  return data.map((item, index) => ({
    id: item.placeId || item.cid || String(index),
    name: item.title || item.name || "İsim bulunamadı",
    address: item.address || item.street || "Adres bulunamadı",
    phone: item.phone || item.phoneNumber || null,
    website: item.website || item.websiteUrl || null,
    googleMapsUrl: item.url || item.googleUrl || item.googleMapsUrl || null,
    rating: item.totalScore || item.rating || null,
    userRatingCount: item.reviewsCount || item.reviews || 0,
    location:
      item.location || item.lat || item.lng
        ? {
            latitude: item.location?.lat || item.lat || null,
            longitude: item.location?.lng || item.lng || null,
          }
        : null,
  }));
}

module.exports = {
  searchBusinessesWithApify,
};