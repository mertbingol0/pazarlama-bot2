#!/usr/bin/env python3
"""benefitsystems.com.tr/tesisler/ crawler.

Site statik (Astro); tüm tesis verisi tek JSON endpoint'inde:
  https://benefitsystems.com.tr/facilities-tr.json
Sayfadaki filtreler (şehir, ilçe, aktivite, kart, diğer) de bu datadan türüyor.

Çıktı:
  benefit_facilities.json  -> ham tesis listesi
  benefit_filters.json     -> filtre ekranındaki tüm filtreler + değerleri
  benefit_categorized.json -> tesisler filtrelere göre kategorize (id listeleri)
"""
import json
import urllib.request
from collections import defaultdict

BASE = "https://benefitsystems.com.tr"


def fetch_facilities():
    req = urllib.request.Request(
        f"{BASE}/facilities-tr.json", headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def build(facilities):
    filters = {
        "city": set(),
        "district": set(),          # "Şehir / İlçe"
        "activityGroup": set(),
        "activity": set(),
        "card": set(),
        "amenity": set(),
        "other": ["plusOnly", "internationalVisits", "vcOnly", "hasDiscount"],
    }
    cat = defaultdict(lambda: defaultdict(list))  # cat[filtre][değer] = [id, ...]

    for f in facilities:
        fid = f["id"]
        if f.get("city"):
            filters["city"].add(f["city"])
            cat["city"][f["city"]].append(fid)
        if f.get("cityDistrict"):
            dist = f"{f.get('city', '')} / {f['cityDistrict']}"
            filters["district"].add(dist)
            cat["district"][dist].append(fid)
        for g in f.get("activityGroups", []):
            filters["activityGroup"].add(g["name"])
            cat["activityGroup"][g["name"]].append(fid)
            for a in g.get("activities", []):
                filters["activity"].add(a["name"])
                cat["activity"][a["name"]].append(fid)
        for c in f.get("cards", []):
            filters["card"].add(c)
            cat["card"][c].append(fid)
        for a in f.get("amenities", []):
            name = a["name"] if isinstance(a, dict) else a
            filters["amenity"].add(name)
            cat["amenity"][name].append(fid)
        # "diğer" filtreleri
        if f.get("cards") == ["Plus"]:
            cat["other"]["plusOnly"].append(fid)
        if f.get("allowInternationalVisits"):
            cat["other"]["internationalVisits"].append(fid)
        if f.get("vcOnly"):
            cat["other"]["vcOnly"].append(fid)
        if f.get("discounts"):
            cat["other"]["hasDiscount"].append(fid)

    filters = {k: sorted(v) if isinstance(v, set) else v for k, v in filters.items()}
    cat = {k: dict(v) for k, v in cat.items()}
    return filters, cat


def main():
    facilities = fetch_facilities()
    print(f"{len(facilities)} tesis alındı")

    filters, cat = build(facilities)

    json.dump(facilities, open("benefit_facilities.json", "w"), ensure_ascii=False, indent=1)
    json.dump(filters, open("benefit_filters.json", "w"), ensure_ascii=False, indent=1)
    json.dump(cat, open("benefit_categorized.json", "w"), ensure_ascii=False, indent=1)

    for k, v in filters.items():
        print(f"  {k}: {len(v)} değer")
    print("yazıldı: benefit_facilities.json, benefit_filters.json, benefit_categorized.json")


def _selfcheck():
    sample = [{
        "id": "1TR", "city": "İstanbul", "cityDistrict": "Kadıköy",
        "activityGroups": [{"name": "Fitness & Gym", "activities": [{"name": "Fitness & Gym"}]}],
        "cards": ["Plus"], "amenities": [], "allowInternationalVisits": True,
        "vcOnly": False, "discounts": [],
    }]
    fl, ct = build(sample)
    assert fl["city"] == ["İstanbul"]
    assert ct["district"]["İstanbul / Kadıköy"] == ["1TR"]
    assert ct["other"]["plusOnly"] == ["1TR"]
    assert "1TR" in ct["activity"]["Fitness & Gym"]


if __name__ == "__main__":
    _selfcheck()
    main()
