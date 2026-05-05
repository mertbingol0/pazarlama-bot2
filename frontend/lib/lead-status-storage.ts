import type { LeadItem, LeadStatus } from "@/types/business";

export type StoredLeadType = "phone" | "email" | "instagram";

export type StoredLeadItem = LeadItem & {
  status: LeadStatus;
  type: StoredLeadType;
  updatedAt: string;
};

const STORAGE_KEY = "jefedes-lead-statuses";

export function getLeadKey(item: LeadItem) {
  return item.id || item.businessId || `${item.businessName}-${item.value}`;
}

export function getStoredLeads(): StoredLeadItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawData = localStorage.getItem(STORAGE_KEY);

  if (!rawData) {
    return [];
  }

  try {
    return JSON.parse(rawData) as StoredLeadItem[];
  } catch {
    return [];
  }
}

export function saveLeadStatus(
  item: LeadItem,
  type: StoredLeadType,
  status: LeadStatus
) {
  if (typeof window === "undefined") {
    return;
  }

  const currentLeads = getStoredLeads();
  const itemKey = getLeadKey(item);

  const filteredLeads = currentLeads.filter(
    (lead) => getLeadKey(lead) !== itemKey
  );

  if (status === "pending") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLeads));
    return;
  }

  const updatedLead: StoredLeadItem = {
    ...item,
    status,
    type,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([updatedLead, ...filteredLeads])
  );
}

export function getStoredLeadsByStatus(status: LeadStatus) {
  return getStoredLeads().filter((lead) => lead.status === status);
}