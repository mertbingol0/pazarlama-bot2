import type { LeadItem, SearchResult } from "@/types/business";
import type { StoredLeadType } from "@/lib/lead-status-storage";
import {
  OUTCOME_LABELS,
  CHANNEL_LABELS,
  TEAM_LABELS,
  type ContactedBusiness,
  type Team,
} from "@/lib/api";

function escapeCsvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

// Telefon/uzun sayıların Excel'de bilimsel gösterime düşmemesi için.
function formatTextForExcel(value: string) {
  const cleaned = String(value || "").trim();

  if (!cleaned) {
    return "";
  }

  return `="${cleaned.replaceAll('"', '""')}"`;
}

function buildCsvBlob(rows: string[][]) {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          if (String(cell).startsWith('="')) {
            return cell;
          }

          return escapeCsvCell(String(cell));
        })
        .join(";")
    )
    .join("\r\n");

  const utf8Bom = "﻿";

  return new Blob([utf8Bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

function slugForFile(value?: string) {
  return (
    String(value || "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9çğıöşü-]/gi, "") || "sonuc"
  );
}

/**
 * Tüm arama sonuçlarının birleşik CSV'si: API'den gelen tüm veriler
 * (işletme adı, telefon, e-posta, sosyal medya, adres, website, puan,
 * kaynak, Google Maps linki) tek satırda işlenir.
 */
export function downloadSearchResultsAsCsv(results: SearchResult) {
  const businesses = results.businesses || [];

  const header = [
    "İşletme Adı",
    "Telefon",
    "E-posta",
    "Sosyal Medya",
    "Adres",
    "Website",
    "Puan",
    "Değerlendirme Sayısı",
    "Kaynak",
    "Google Maps",
  ];

  const rows = [
    header,
    ...businesses.map((business) => [
      business.name || "",
      formatTextForExcel(business.phone || ""),
      business.email || "",
      business.socials || business.instagram || "",
      business.address || "",
      business.website || "",
      business.rating != null ? String(business.rating) : "",
      business.userRatingCount != null ? String(business.userRatingCount) : "",
      business.source || "",
      business.googleMapsUrl || "",
    ]),
  ];

  const fileName = `tum-sonuclar-${slugForFile(results.query.city)}-${slugForFile(
    results.query.district
  )}.csv`;

  triggerDownload(buildCsvBlob(rows), fileName);
}

const LIST_LABELS: Record<StoredLeadType, string> = {
  phone: "telefonlar",
  email: "mailler",
  instagram: "sosyal-medya",
};

const LIST_VALUE_HEADERS: Record<StoredLeadType, string> = {
  phone: "Telefon",
  email: "E-posta",
  instagram: "Sosyal Medya / Link",
};

/**
 * Tek bir listenin (telefon / mail / sosyal) CSV'sini indirir.
 */
export function downloadLeadListAsCsv(
  items: LeadItem[],
  type: StoredLeadType,
  results: SearchResult,
  fileSlug?: string
) {
  const header = [
    "İşletme Adı",
    LIST_VALUE_HEADERS[type],
    "Adres",
    "Website",
    "Kaynak",
  ];

  const rows = [
    header,
    ...items.map((item) => [
      item.businessName || "",
      type === "phone"
        ? formatTextForExcel(item.value || "")
        : item.value || "",
      item.address || "",
      item.website || "",
      item.source || "",
    ]),
  ];

  const listSlug = fileSlug || LIST_LABELS[type];

  const fileName = `${listSlug}-${slugForFile(results.query.city)}-${slugForFile(
    results.query.district
  )}.csv`;

  triggerDownload(buildCsvBlob(rows), fileName);
}

// İletişime geçilen işletmeler: görüşme sonucuna göre kategorize edilmiş, her
// şeyiyle (işletme bilgisi + görüşme + notlar) CSV.
const CONTACTED_OUTCOME_ORDER: Record<string, number> = {
  record_taken: 0,
  to_meet: 1,
  follow_up: 2,
  rejected: 3,
};

function outcomeRank(outcome?: string | null) {
  if (outcome && outcome in CONTACTED_OUTCOME_ORDER) {
    return CONTACTED_OUTCOME_ORDER[outcome];
  }
  return 99;
}

function formatCsvDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function downloadContactedBusinessesAsCsv(
  businesses: ContactedBusiness[],
  fileSuffix = "gorunum"
) {
  const header = [
    "Görüşme Sonucu",
    "İşletme Adı",
    "Telefon",
    "E-posta",
    "Sektör",
    "İl",
    "İlçe",
    "Adres",
    "Web Sitesi",
    "Sosyal Medya",
    "İletişim Kanalı",
    "İletişime Geçen Personel",
    "Birim",
    "Görüşme/Aktivite Tarihi",
    "Not Sayısı",
    "Notlar",
  ];

  // Kategoriye göre (sonuç sırası), sonra tarihe göre sırala.
  const sorted = [...businesses].sort((a, b) => {
    const ra = outcomeRank(a.interaction?.outcome);
    const rb = outcomeRank(b.interaction?.outcome);
    if (ra !== rb) return ra - rb;
    return String(b.activityAt || "").localeCompare(String(a.activityAt || ""));
  });

  const rows = [
    header,
    ...sorted.map((b) => {
      const i = b.interaction;
      const outcomeLabel =
        i?.outcome && OUTCOME_LABELS[i.outcome]
          ? OUTCOME_LABELS[i.outcome]
          : "Belirtilmemiş";
      const channelLabel =
        i?.channel && CHANNEL_LABELS[i.channel] ? CHANNEL_LABELS[i.channel] : "";
      const teamLabel = i?.team ? TEAM_LABELS[i.team as Team] || i.team : "";
      const notesText = (b.notes || [])
        .map(
          (n) =>
            `${n.note} (${n.userFullName || n.userUsername || "?"}, ${formatCsvDateTime(
              n.createdAt
            )})`
        )
        .join(" || ");

      return [
        outcomeLabel,
        b.name || "",
        formatTextForExcel(b.phone || ""),
        b.email || "",
        b.category || "",
        b.city || "",
        b.district || "",
        b.address || "",
        b.website || "",
        b.socials || "",
        channelLabel,
        i?.userFullName || i?.userUsername || "",
        teamLabel,
        formatCsvDateTime(b.activityAt || i?.updatedAt),
        String((b.notes || []).length),
        notesText,
      ];
    }),
  ];

  triggerDownload(
    buildCsvBlob(rows),
    `iletisim-gecilen-isletmeler-${slugForFile(fileSuffix)}.csv`
  );
}
