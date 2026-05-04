export type SearchParams = {
  category: string;
  city: string;
  district: string;
  maxResults?: number;
};

export type LeadSource =
  | "google_maps"
  | "website_scrape"
  | "google_places"
  | "backend"
  | "manual";

export type LeadItem = {
  value: string;
  businessName: string;
  source: LeadSource;
  url?: string;
  address?: string;
};

export type Business = {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: number;
  userRatingCount?: number;
  location?: {
    lat?: number;
    lng?: number;
  };
};

export type SearchResult = {
  searchId?: string;
  status?: "processing" | "completed" | "failed";
  query: {
    category: string;
    city: string;
    district: string;
  };
  stats: {
    totalBusinesses: number;
    phonesFound: number;
    emailsFound: number;
    instagramsFound: number;
  };
  results: {
    phones: LeadItem[];
    emails: LeadItem[];
    instagrams: LeadItem[];
  };
  fromCache?: boolean;
};

export type SearchApiResponse = SearchResult & {
  success: boolean;
  message: string;
  businesses?: Business[] | unknown[];
};