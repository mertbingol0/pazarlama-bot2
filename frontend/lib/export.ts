import type { SearchResult } from "@/types/business";

function escapeCsvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatPhoneForExcel(phone: string) {
  const cleanedPhone = phone.trim();

  return `="${cleanedPhone.replaceAll('"', '""')}"`;
}

export function downloadSearchResultsAsCsv(results: SearchResult) {
  const rows = [
    ["Type", "Value", "Business Name", "Source"],
    ...results.results.phones.map((item) => [
      "Phone",
      formatPhoneForExcel(item.value),
      item.businessName,
      item.source,
    ]),
    ...results.results.emails.map((item) => [
      "Email",
      item.value,
      item.businessName,
      item.source,
    ]),
    ...results.results.instagrams.map((item) => [
      "Instagram",
      item.value,
      item.businessName,
      item.source,
    ]),
  ];

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

    
  const utf8Bom = "\uFEFF";

  const blob = new Blob([utf8Bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `lead-results-${results.query.city}-${results.query.district}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}