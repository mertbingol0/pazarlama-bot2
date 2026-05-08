import type {
  Business,
  LeadStatus,
  SearchApiResponse,
  SearchParams,
} from "@/types/business";

export const API_BASE_URL = "http://localhost:5000";

type BackendErrorResponse = {
  message?: string;
  error?: string;
};

type StatusUpdateResponse = BackendErrorResponse & {
  success: boolean;
};

type BusinessesByStatusResponse = BackendErrorResponse & {
  success: boolean;
  status: LeadStatus;
  count: number;
  businesses: Business[];
};

type WhatsAppTestMessageResponse = BackendErrorResponse & {
  success: boolean;
};

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const bodyPreview = (await response.text()).trim().slice(0, 120);

    throw new Error(
      `Backend returned ${
        contentType || "unknown content"
      } instead of JSON (${response.status} ${response.statusText}). URL: ${
        response.url
      }. ${bodyPreview}`
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

  const data = await readJsonResponse<
    SearchApiResponse & BackendErrorResponse
  >(response);

  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || "Arama isteği başarısız oldu.");
  }

  return data;
}

export async function updateBusinessStatus(
  businessId: string | number,
  status: LeadStatus
): Promise<StatusUpdateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    }
  );

  const data = await readJsonResponse<StatusUpdateResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Firma durumu güncellenirken hata oluştu."
    );
  }

  return data;
}

export async function getBusinessesByStatus(
  status: LeadStatus
): Promise<BusinessesByStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/status/${status}`
  );

  const data = await readJsonResponse<BusinessesByStatusResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Duruma göre firmalar getirilemedi."
    );
  }

  return data;
}

export type SendWhatsAppTestMessageParams = {
  to: string;
  message: string;
};

export async function sendWhatsAppTestMessage({
  to,
  message,
}: SendWhatsAppTestMessageParams): Promise<WhatsAppTestMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp/send-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      message,
    }),
  });

  const data = await readJsonResponse<WhatsAppTestMessageResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "WhatsApp mesajı gönderilemedi."
    );
  }

  return data;
}