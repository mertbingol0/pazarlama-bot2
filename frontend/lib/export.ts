import type { SearchResult } from "@/types/business";

type CsvBusinessRow = {
  businessName: string;
  phone: string;
  email: string;
  instagram: string;
  address: string;
};

function escapeCsvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatPhoneForExcel(phone: string) {
  const cleanedPhone = phone.trim();

  if (!cleanedPhone) {
    return "";
  }

  return `="${cleanedPhone.replaceAll('"', '""')}"`;
}

function appendValue(currentValue: string, newValue: string) {
  if (!newValue) {
    return currentValue;
  }

  if (!currentValue) {
    return newValue;
  }

  return `${currentValue}, ${newValue}`;
}

export function downloadSearchResultsAsCsv(results: SearchResult) {
  const rowsByBusiness = new Map<string, CsvBusinessRow>();

  const getBusinessRow = (businessName: string, address?: string) => {
    const key = `${businessName}-${address || ""}`;

    const existingRow = rowsByBusiness.get(key);

    if (existingRow) {
      return existingRow;
    }

    const newRow: CsvBusinessRow = {
      businessName,
      phone: "",
      email: "",
      instagram: "",
      address: address || "",
    };

    rowsByBusiness.set(key, newRow);

    return newRow;
  };

  results.results.phones.forEach((item) => {
    const row = getBusinessRow(item.businessName, item.address);

    row.phone = appendValue(row.phone, item.value);

    if (item.address && !row.address) {
      row.address = item.address;
    }
  });

  results.results.emails.forEach((item) => {
    const row = getBusinessRow(item.businessName, item.address);

    row.email = appendValue(row.email, item.value);

    if (item.address && !row.address) {
      row.address = item.address;
    }
  });

  results.results.instagrams.forEach((item) => {
    const row = getBusinessRow(item.businessName, item.address);

    row.instagram = appendValue(row.instagram, item.url || item.value);

    if (item.address && !row.address) {
      row.address = item.address;
    }
  });

  const rows = [
    ["Business Name", "Phone", "Email", "Instagram", "Address"],
    ...Array.from(rowsByBusiness.values()).map((row) => [
      row.businessName,
      formatPhoneForExcel(row.phone),
      row.email,
      row.instagram,
      row.address,
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