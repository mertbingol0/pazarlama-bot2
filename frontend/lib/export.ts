import type { SearchResult } from "@/types/business";

export function downloadSearchResultsAsCsv(results: SearchResult) {
  const rows = [
    ["Type", "Value", "Business Name", "Source"],
    ...results.results.phones.map((item) => [
      "Phone",
      item.value,
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
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `lead-results-${results.query.city}-${results.query.district}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}