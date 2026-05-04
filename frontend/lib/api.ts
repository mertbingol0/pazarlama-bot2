type SearchBusinessesParams = {
  category: string;
  city: string;
  district: string;
};

type SearchBusinessesResponse = {
  success: boolean;
  message: string;
  receivedData?: {
    category: string;
    city: string;
    district: string;
  };
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