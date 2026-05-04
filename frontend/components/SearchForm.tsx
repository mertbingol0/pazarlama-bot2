import { SearchableSelect } from "@/components/SearchableSelect";
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
      <SearchableSelect
        label="Kategori"
        placeholder="Kategori seç"
        searchPlaceholder="Kategori ara..."
        emptyMessage="Kategori bulunamadı."
        value={category}
        options={categories}
        onChange={onCategoryChange}
      />

      <SearchableSelect
        label="İl"
        placeholder="İl seç"
        searchPlaceholder="İl ara..."
        emptyMessage="İl bulunamadı."
        value={city}
        options={locations.map((item) => ({
          label: item.label,
          value: item.value,
        }))}
        onChange={(value) => {
          onCityChange(value);
          onDistrictChange("");
        }}
      />

      <SearchableSelect
        label="İlçe"
        placeholder="İlçe seç"
        searchPlaceholder="İlçe ara..."
        emptyMessage="İlçe bulunamadı."
        value={district}
        disabled={!city}
        options={
          selectedCity?.districts.map((item) => ({
            label: item.label,
            value: item.value,
          })) || []
        }
        onChange={onDistrictChange}
      />

      <Button
        onClick={onSearch}
        disabled={isLoading}
        className="h-12 rounded-xl bg-emerald-500 px-8 text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 disabled:bg-emerald-300"
      >
        {isLoading ? "Aranıyor..." : "Ara"}
      </Button>
    </div>
  );
}