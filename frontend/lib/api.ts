import type { LeadItem } from "@/types/business";

type SearchBusinessesParams = {
  category: string;
  city: string;
  district: string;
};

type SearchBusinessesResponse = {
  success: boolean;
  message: string;
  query: {
    category: string;
    city: string;
    district: string;
    searchQuery?: string;
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
  businesses?: any[];
};

const API_BASE_URL = "http://localhost:5000";

export async function searchBusinesses(
  params: SearchBusinessesParams
): Promise<SearchBusinessesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Arama isteği başarısız oldu.");
  }

  return data;
}