import type { SearchResult } from "@/types/business";

export const mockSearchResult: SearchResult = {
  searchId: "srch_mock_001",
  status: "completed",
  query: {
    category: "guzellik",
    city: "İstanbul",
    district: "Kadıköy",
  },
  stats: {
    totalBusinesses: 6,
    phonesFound: 3,
    emailsFound: 2,
    instagramsFound: 3,
  },
  fromCache: false,
  results: {
    phones: [
      {
        value: "+905551234567",
        businessName: "Kadıköy Beauty Studio",
        source: "google_maps",
      },
      {
        value: "+905329876543",
        businessName: "Moda Hair Design",
        source: "google_maps",
      },
      {
        value: "+905441112233",
        businessName: "Nail Art Kadıköy",
        source: "google_places",
      },
    ],
    emails: [
      {
        value: "info@kadikoybeauty.com",
        businessName: "Kadıköy Beauty Studio",
        source: "website_scrape",
      },
      {
        value: "contact@modahair.com",
        businessName: "Moda Hair Design",
        source: "website_scrape",
      },
    ],
    instagrams: [
      {
        value: "kadikoybeautystudio",
        businessName: "Kadıköy Beauty Studio",
        source: "website_scrape",
        url: "https://instagram.com/kadikoybeautystudio",
      },
      {
        value: "modahairdesign",
        businessName: "Moda Hair Design",
        source: "website_scrape",
        url: "https://instagram.com/modahairdesign",
      },
      {
        value: "nailartkadikoy",
        businessName: "Nail Art Kadıköy",
        source: "website_scrape",
        url: "https://instagram.com/nailartkadikoy",
      },
    ],
  },
};