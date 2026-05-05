import type {
  LeadStatus,
  SearchApiResponse,
  SearchParams,
} from "@/types/business";

export const API_BASE_URL = "http://localhost:5000";

type BackendErrorResponse = {
  message?: string;
};

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const bodyPreview = (await response.text()).trim().slice(0, 120);

    throw new Error(
      `Backend returned ${contentType || "unknown content"} instead of JSON (${response.status} ${response.statusText}). URL: ${response.url}. ${bodyPreview}`
    );
  }

  return response.json() as Promise<T>;
}

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

  const data = await readJsonResponse<SearchApiResponse & BackendErrorResponse>(
    response
  );

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Arama isteği başarısız oldu.");
  }

  return data;
}

export async function updateBusinessStatus(
  businessId: string | number,
  status: LeadStatus
) {
  const response = await fetch(`${API_BASE_URL}/api/businesses/${businessId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
    }),
  });

  const data = await readJsonResponse<
    BackendErrorResponse & {
      success: boolean;
    }
  >(response);

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Firma durumu guncellenirken hata olustu.");
  }

  return data;
}
