import { categories } from "@/lib/categories";
import { locations } from "@/lib/tr-locations";
import { Button } from "@/components/ui/button";

type SearchFormProps = {
  category: string;
  city: string;
  district: string;
  isLoading: boolean;
  onCategoryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onSearch: () => void;
};

export function SearchForm({
  category,
  city,
  district,
  isLoading,
  onCategoryChange,
  onCityChange,
  onDistrictChange,
  onSearch,
}: SearchFormProps) {
  const selectedCity = locations.find((item) => item.value === city);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <select
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
        className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        <option value="">Kategori seç</option>
        {categories.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <select
        value={city}
        onChange={(event) => {
          onCityChange(event.target.value);
          onDistrictChange("");
        }}
        className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        <option value="">İl seç</option>
        {locations.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <select
        value={district}
        onChange={(event) => onDistrictChange(event.target.value)}
        disabled={!city}
        className="h-11 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <option value="">İlçe seç</option>
        {selectedCity?.districts.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <Button onClick={onSearch} disabled={isLoading}>
        {isLoading ? "Aranıyor..." : "Ara"}
      </Button>
    </div>
  );
}