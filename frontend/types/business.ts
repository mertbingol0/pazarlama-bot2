export type LeadStatus = "approved" | "pending" | "rejected";

export type LeadStatusFilter = "all" | LeadStatus;

export type WhatsAppStatus =
  | "not_sent"
  | "template_sent"
  | "replied"
  | "follow_up"
  | "not_interested";

export type WhatsAppStatusFilter =
  | "all"
  | Exclude<WhatsAppStatus, "waiting_reply">;

export type SearchLimit = "10" | "50" | "100" | "250" | "500" | "all";

export type SearchParams = {
  category: string;
  city: string;
  district: string;
  limit?: SearchLimit;
  maxResults?: number;
};

export type LeadSource =
  | "google_maps"
  | "website_scrape"
  | "google_places"
  | "backend"
  | "manual"
  | string;

export type LeadItem = {
  id?: string | number;
  businessId?: string | number;
  value: string;
  businessName: string;
  source: LeadSource;
  url?: string;
  address?: string;
  website?: string;
  status?: LeadStatus;
  whatsappStatus?: WhatsAppStatus;

  lat?: number | null;
  lng?: number | null;

  templateSentAt?: string | null;
  lastIncomingAt?: string | null;
  lastMessageText?: string | null;
  lastWhatsappMessageId?: string | null;
};

export type Business = {
  id?: string | number;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: number;
  userRatingCount?: number;
  status?: LeadStatus;
  whatsappStatus?: WhatsAppStatus;

  lat?: number | null;
  lng?: number | null;

  templateSentAt?: string | null;
  lastIncomingAt?: string | null;
  lastMessageText?: string | null;
  lastWhatsappMessageId?: string | null;

  location?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
};

export type SearchResult = {
  searchId?: string;
  status?: "processing" | "completed" | "failed";
  query: {
    category: string;
    city: string;
    district: string;
    limit?: SearchLimit;
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
  businesses?: Business[];
  fromCache?: boolean;
};

export type SearchApiResponse = SearchResult & {
  success: boolean;
  message: string;
};
