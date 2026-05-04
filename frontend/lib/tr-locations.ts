import { getCities, getDistrictsByCityCode } from "turkey-neighbourhoods";

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("İ", "i")
    .replaceAll(" ", "-")
    .replaceAll("'", "")
    .replaceAll(".", "");
}

export const locations = getCities().map((city) => ({
  label: city.name,
  value: toSlug(city.name),
  districts: getDistrictsByCityCode(city.code).map((district) => ({
    label: district,
    value: toSlug(district),
  })),
}));