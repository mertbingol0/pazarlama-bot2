import type {
  Business,
  LeadStatus,
  SearchApiResponse,
  SearchParams,
  WhatsAppStatus,
  WhatsAppStatusFilter,
} from "@/types/business";
import { loadAuth } from "@/lib/auth-storage";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

type BusinessesByWhatsAppStatusResponse = BackendErrorResponse & {
  success: boolean;
  whatsappStatus: WhatsAppStatusFilter;
  count: number;
  businesses: Business[];
};

type WhatsAppStatusUpdateResponse = BackendErrorResponse & {
  success: boolean;
  business: Business;
};

type SendWhatsAppTemplateResponse = BackendErrorResponse & {
  success: boolean;
  sentCount: number;
  skippedCount?: number;
  failedCount: number;
  results: unknown[];
};

type SendWhatsAppMessageResponse = BackendErrorResponse & {
  success: boolean;
  result?: unknown;
  business?: Business;
};

type WhatsAppTestMessageResponse = BackendErrorResponse & {
  success: boolean;
  message?: string;
  result?: {
    requestAccepted?: boolean;
    to?: string;
    messageId?: string | null;
    messageStatus?: string;
    raw?: unknown;
  };
};

export type UserRole = "admin" | "personnel";
export type Team = "saha_pazarlama" | "reklam_pazarlama" | "cagri_merkezi";

export type LoginUser = {
  id: number;
  username: string;
  role: UserRole;
  fullName?: string | null;
  team?: Team | null;
};

export type PanelUser = LoginUser & {
  isActive?: boolean;
  createdAt?: string | null;
  lastLoginAt?: string | null;
};

type LoginResponse = BackendErrorResponse & {
  success: boolean;
  token: string;
  user: LoginUser;
};

// Birim (team) etiketleri — UI'da gösterim için.
export const TEAM_LABELS: Record<Team, string> = {
  saha_pazarlama: "Saha Pazarlama",
  reklam_pazarlama: "Reklam Pazarlama",
  cagri_merkezi: "Çağrı Merkezi",
};

export const TEAM_OPTIONS: { value: Team; label: string }[] = (
  Object.keys(TEAM_LABELS) as Team[]
).map((value) => ({ value, label: TEAM_LABELS[value] }));

export async function loginUser({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await readJsonResponse<LoginResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Giriş yapılırken bir hata oluştu."
    );
  }

  return data;
}

// localStorage'daki JWT'yi Authorization başlığına ekler.
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const auth = loadAuth();
  return {
    ...(extra || {}),
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
}

export type MeResponse = BackendErrorResponse & {
  success: boolean;
  user: PanelUser;
};

// Geçerli token'a karşılık gelen güncel kullanıcı.
export async function getMe(): Promise<PanelUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: authHeaders(),
  });

  const data = await readJsonResponse<MeResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(data.message || data.error || "Oturum doğrulanamadı.");
  }

  return data.user;
}

export type CreateUserInput = {
  username: string;
  password: string;
  fullName?: string;
  role: UserRole;
  team?: Team | null;
};

type CreateUserResponse = BackendErrorResponse & {
  success: boolean;
  user: PanelUser;
};

// Admin: yeni kullanıcı oluşturur.
export async function createUser(
  input: CreateUserInput
): Promise<PanelUser> {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

  const data = await readJsonResponse<CreateUserResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Kullanıcı oluşturulurken bir hata oluştu."
    );
  }

  return data.user;
}

type UsersResponse = BackendErrorResponse & {
  success: boolean;
  count: number;
  users: PanelUser[];
};

// Admin: kullanıcı listesi.
export async function getUsers(): Promise<PanelUser[]> {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    headers: authHeaders(),
  });

  const data = await readJsonResponse<UsersResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Kullanıcılar getirilirken bir hata oluştu."
    );
  }

  return data.users;
}

// ===========================================================================
// CRM: işletme görüşmesi (kanal/sonuç/personel) + notlar.
// ===========================================================================
export type InteractionChannel = "whatsapp" | "call" | "face_to_face";
export type InteractionOutcome =
  | "to_meet"
  | "record_taken"
  | "follow_up"
  | "rejected";

// UI'da gösterilen kanal seçenekleri.
export const CHANNEL_OPTIONS: { value: InteractionChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "call", label: "Telefon" },
  { value: "face_to_face", label: "Yüz yüze" },
];

// UI'da gösterilen görüşme sonucu seçenekleri.
export const OUTCOME_OPTIONS: { value: InteractionOutcome; label: string }[] = [
  { value: "to_meet", label: "Yüz yüze görüşülecek" },
  { value: "record_taken", label: "Kayıt alındı" },
  { value: "follow_up", label: "Daha sonra görüşülecek" },
  { value: "rejected", label: "Reddedildi" },
];

export const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  CHANNEL_OPTIONS.map((o) => [o.value, o.label])
);
export const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.value, o.label])
);

export type BusinessInteraction = {
  id: number;
  businessId: number;
  userId: number | null;
  userFullName: string | null;
  userUsername: string | null;
  team: Team | null;
  channel: InteractionChannel | null;
  outcome: string | null;
  note: string | null;
  meetingAt: string | null;
  updatedAt: string | null;
};

export type BusinessNote = {
  id: number;
  businessId: number;
  userId: number | null;
  userFullName: string | null;
  userUsername: string | null;
  team: Team | null;
  note: string;
  createdAt: string;
};

export type BusinessCrm = {
  interaction: BusinessInteraction | null;
  notes: BusinessNote[];
};

export type AssignableUser = {
  id: number;
  username: string;
  fullName: string | null;
  role: UserRole;
  team: Team | null;
};

// Admin dashboard
export type OutcomeCounts = {
  record_taken: number;
  to_meet: number;
  follow_up: number;
  rejected: number;
  other: number;
  total: number;
};

export type DashboardTeamRow = OutcomeCounts & { team: string };
export type DashboardPersonnelRow = OutcomeCounts & {
  userId: number | null;
  fullName: string | null;
  username: string | null;
  team: Team | null;
};

export type ChannelCounts = {
  whatsapp: number;
  call: number;
  face_to_face: number;
  other: number;
  total: number;
};

export type ActivityItem = {
  type: "interaction" | "note";
  businessId: number | null;
  businessName: string | null;
  userName: string | null;
  team: Team | null;
  outcome: string | null;
  channel: InteractionChannel | null;
  note: string | null;
  at: string;
};

export type DashboardStats = {
  range: { window?: string; from?: string; to?: string };
  outcomes: OutcomeCounts;
  channels: ChannelCounts;
  totalContacted: number;
  totalNotes: number;
  recentActivity: ActivityItem[];
  byTeam: DashboardTeamRow[];
  byPersonnel: DashboardPersonnelRow[];
};

export async function getDashboardStats(
  filters: { from?: string; to?: string } = {}
): Promise<DashboardStats> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();

  const response = await fetch(
    `${API_BASE_URL}/api/dashboard/stats${query ? `?${query}` : ""}`,
    { headers: authHeaders() }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; stats: DashboardStats }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Dashboard verileri getirilemedi.");
  }
  return data.stats;
}

export type ManualBusinessInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  category?: string;
  website?: string;
  socials?: string;
  channel?: InteractionChannel | "";
  outcome?: string;
  assignedUserId?: number | null;
  note?: string;
};

export type LookedUpBusiness = {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  socials: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  city: string | null;
  district: string | null;
};

// Ad + il + ilçe ile Google Maps'te işletme araştır.
export async function lookupBusiness(input: {
  name: string;
  city?: string;
  district?: string;
}): Promise<LookedUpBusiness | null> {
  const response = await fetch(`${API_BASE_URL}/api/businesses/lookup`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse<
    BackendErrorResponse & {
      success: boolean;
      business: LookedUpBusiness | null;
    }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Google Maps araması başarısız oldu.");
  }
  return data.business;
}

// Personel: sahadan manuel işletme ekler (bilgiler + görüşme + not).
export async function createManualBusiness(
  input: ManualBusinessInput
): Promise<{ businessId: number }> {
  const response = await fetch(`${API_BASE_URL}/api/businesses/manual`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; businessId: number }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "İşletme eklenemedi.");
  }
  return { businessId: data.businessId };
}

// Durum Takip: mevcut kullanıcının kendi istatistikleri.
export async function getMyStats(
  filters: { from?: string; to?: string } = {}
): Promise<DashboardStats> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/me/stats${query ? `?${query}` : ""}`,
    { headers: authHeaders() }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; stats: DashboardStats }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "İstatistikler getirilemedi.");
  }
  return data.stats;
}

// Durum Takip: mevcut kullanıcının kendi işletmeleri.
export async function getMyContacted(
  filters: ContactedFilters = {}
): Promise<ContactedBusiness[]> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q && filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.all) params.set("all", "1");
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/me/contacted${query ? `?${query}` : ""}`,
    { headers: authHeaders() }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; businesses: ContactedBusiness[] }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "İşletmeler getirilemedi.");
  }
  return data.businesses;
}

export async function getAssignableUsers(): Promise<AssignableUser[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/assignable`, {
    headers: authHeaders(),
  });
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; users: AssignableUser[] }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Kullanıcılar getirilemedi.");
  }
  return data.users;
}

export async function getBusinessCrmBatch(
  ids: Array<number | string>
): Promise<Record<string, BusinessCrm>> {
  if (ids.length === 0) return {};
  const response = await fetch(`${API_BASE_URL}/api/businesses/crm-batch`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ids }),
  });
  const data = await readJsonResponse<
    BackendErrorResponse & {
      success: boolean;
      crm: Record<string, BusinessCrm>;
    }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Görüşme verileri getirilemedi.");
  }
  return data.crm;
}

export async function saveBusinessInteraction(
  businessId: number | string,
  input: {
    channel?: InteractionChannel | null;
    outcome?: string | null;
    assignedUserId?: number | null;
  }
): Promise<BusinessInteraction> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/interaction`,
    {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(input),
    }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; interaction: BusinessInteraction }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Görüşme kaydedilemedi.");
  }
  return data.interaction;
}

// Görüşme sonucu renk tonu (kart sol şeridi + rozet için).
export type OutcomeTone = "green" | "red" | "orange" | "yellow" | "gray";

export const OUTCOME_TONE: Record<string, OutcomeTone> = {
  record_taken: "green", // Kayıt alındı (olumlu)
  rejected: "red", // Reddedildi (olumsuz)
  to_meet: "orange", // Yüz yüze görüşülecek
  follow_up: "yellow", // Daha sonra görüşülecek
};

export type ContactedBusiness = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  socials: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  category: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  activityAt?: string | null;
  interaction: BusinessInteraction | null;
  notes: BusinessNote[];
};

export type ContactedFilters = {
  from?: string;
  to?: string;
  q?: string;
  all?: boolean;
};

export async function getContactedBusinesses(
  filters: ContactedFilters = {}
): Promise<ContactedBusiness[]> {
  const params = new URLSearchParams();
  if (filters.all) params.set("all", "1");
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q && filters.q.trim()) params.set("q", filters.q.trim());
  const query = params.toString();

  const response = await fetch(
    `${API_BASE_URL}/api/businesses/contacted${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(),
    }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; businesses: ContactedBusiness[] }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "İletişime geçilen işletmeler getirilemedi.");
  }
  return data.businesses;
}

export async function addBusinessNote(
  businessId: number | string,
  note: string
): Promise<BusinessNote> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/notes`,
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ note }),
    }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; note: BusinessNote }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Not eklenemedi.");
  }
  return data.note;
}

// Bir işletmenin tüm notlarını (tüm kullanıcıların) en güncel haliyle getir.
export async function getBusinessNotes(
  businessId: number | string
): Promise<BusinessNote[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/notes`,
    {
      headers: authHeaders(),
    }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; notes: BusinessNote[] }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Notlar getirilemedi.");
  }
  return data.notes;
}

export async function updateBusinessNote(
  businessId: number | string,
  noteId: number | string,
  note: string
): Promise<BusinessNote> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/notes/${noteId}`,
    {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ note }),
    }
  );
  const data = await readJsonResponse<
    BackendErrorResponse & { success: boolean; note: BusinessNote }
  >(response);
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Not düzenlenemedi.");
  }
  return data.note;
}

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
      mode: params.mode || "local",
    }),
  });

  const data = await readJsonResponse<
    SearchApiResponse & BackendErrorResponse
  >(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Arama isteği başarısız oldu."
    );
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
  mode?: "template" | "text";
  templateName?: string;
  languageCode?: string;
};

export async function sendWhatsAppTestMessage({
  to,
  message,
  mode = "text",
  templateName,
  languageCode,
}: SendWhatsAppTestMessageParams): Promise<WhatsAppTestMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp/send-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      message,
      mode,
      templateName,
      languageCode,
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

export async function getBusinessesByWhatsAppStatus(
  whatsappStatus: WhatsAppStatusFilter
): Promise<BusinessesByWhatsAppStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses?whatsappStatus=${whatsappStatus}`
  );

  const data = await readJsonResponse<BusinessesByWhatsAppStatusResponse>(
    response
  );

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        data.error ||
        "WhatsApp durumuna göre firmalar getirilemedi."
    );
  }

  return data;
}

export async function updateBusinessWhatsAppStatus(
  businessId: string | number,
  whatsappStatus: WhatsAppStatus
): Promise<WhatsAppStatusUpdateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/whatsapp-status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        whatsappStatus,
      }),
    }
  );

  const data = await readJsonResponse<WhatsAppStatusUpdateResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        data.error ||
        "WhatsApp durumu güncellenirken hata oluştu."
    );
  }

  return data;
}

export async function sendWhatsAppTemplate({
  businessIds,
  templateName,
  languageCode = "tr",
}: {
  businessIds: Array<string | number>;
  templateName: string;
  languageCode?: string;
}): Promise<SendWhatsAppTemplateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp/send-template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessIds,
      templateName,
      languageCode,
    }),
  });

  const data = await readJsonResponse<SendWhatsAppTemplateResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "WhatsApp template gönderilemedi."
    );
  }

  return data;
}

export async function sendWhatsAppMessage({
  businessId,
  message,
}: {
  businessId: string | number;
  message: string;
}): Promise<SendWhatsAppMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessId,
      message,
    }),
  });

  const data = await readJsonResponse<SendWhatsAppMessageResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "WhatsApp manuel mesaj gönderilemedi."
    );
  }

  return data;
}

export type LiveSupportLead = {
  id: number;
  phone: string;
  buttonText?: string | null;
  status?: string | null;
  note?: string | null;
  messageId?: string | null;
  createdAt?: string | null;
};

type LiveSupportLeadsResponse = BackendErrorResponse & {
  success: boolean;
  count: number;
  leads: LiveSupportLead[];
};

type UpdateLiveSupportLeadNoteResponse = BackendErrorResponse & {
  success: boolean;
  lead: LiveSupportLead;
};

export async function getLiveSupportLeads(): Promise<LiveSupportLeadsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/live-support-leads`);

  const data = await readJsonResponse<LiveSupportLeadsResponse>(response);

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Canlı destek kayıtları getirilemedi."
    );
  }

  return data;
}

export async function updateLiveSupportLeadNote(
  leadId: string | number,
  note: string
): Promise<UpdateLiveSupportLeadNoteResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/live-support-leads/${leadId}/note`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        note,
      }),
    }
  );

  const data = await readJsonResponse<UpdateLiveSupportLeadNoteResponse>(
    response
  );

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || data.error || "Canlı destek notu kaydedilemedi."
    );
  }

  return data;
}
