async function searchPlaces({ category, city, district }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY .env içinde tanımlı değil.");
  }

  const textQuery = `${category} ${district} ${city}`;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "tr",
        regionCode: "TR",
        pageSize: 10,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Google Places API error:", data);
    throw new Error("Google Places API isteği başarısız oldu.");
  }

  const places = data.places || [];

  return places.map((place) => ({
    id: place.id,
    name: place.displayName?.text || "İsim bulunamadı",
    address: place.formattedAddress || "Adres bulunamadı",
    phone:
      place.nationalPhoneNumber ||
      place.internationalPhoneNumber ||
      null,
    website: place.websiteUri || null,
    googleMapsUrl: place.googleMapsUri || null,
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || 0,
    location: place.location
      ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        }
      : null,
  }));
}

module.exports = {
  searchPlaces,
};