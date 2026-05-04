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
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Kategori</label>
        <select
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="">Kategori seç</option>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">İl</label>
        <select
          value={city}
          onChange={(event) => {
            onCityChange(event.target.value);
            onDistrictChange("");
          }}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="">İl seç</option>
          {locations.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">İlçe</label>
        <select
          value={district}
          onChange={(event) => onDistrictChange(event.target.value)}
          disabled={!city}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">İlçe seç</option>
          {selectedCity?.districts.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={onSearch}
        disabled={isLoading}
        className="h-12 rounded-xl bg-indigo-600 px-8 text-white shadow-md transition hover:bg-indigo-700"
      >
        {isLoading ? "Aranıyor..." : "Ara"}
      </Button>
    </div>
  );
}