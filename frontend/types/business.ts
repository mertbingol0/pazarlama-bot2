export type SearchParams = {
  category: string;
  city: string;
  district: string;
  maxResults?: number;
};

export type LeadSource = string;

export type LeadItem = {
  value: string;
  businessName: string;
  source: LeadSource;
  url?: string;
};

export type SearchResult = {
  searchId: string;
  status: "processing" | "completed" | "failed";
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