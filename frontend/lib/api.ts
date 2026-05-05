import type { SearchApiResponse, SearchParams } from "@/types/business";

const API_BASE_URL = "http://localhost:5000";

export async function searchBusinesses(
  params: SearchParams
): Promise<SearchApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: params.category,
      city: params.city,
      district: params.district,
      limit: params.limit,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Arama isteği başarısız oldu.");
  }

  return data;
}