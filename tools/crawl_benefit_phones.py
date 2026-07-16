#!/usr/bin/env python3
"""Tesis detay sayfalarından telefon toplar.

benefit_facilities.json'daki her slug için benefitsystems.com.tr/tesisler/<slug>
sayfasındaki tel: linkini çeker (sitenin kendi destek hattı 08504770274 elenir).

Çıktı: benefit_phones.json -> { "<id>": "05441445911", ... }
Tekrar çalıştırılabilir: mevcut çıktıdaki id'ler atlanır (resume).
"""
import json
import os
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://benefitsystems.com.tr/tesisler/"
SITE_PHONE = "08504770274"  # footer'daki Benefit destek hattı
OUT = os.path.join(os.path.dirname(__file__), "benefit_phones.json")
SRC = os.path.join(os.path.dirname(__file__), "benefit_facilities.json")
TEL_RE = re.compile(r'tel:([+\d][\d\s().-]{6,})')


def fetch_phone(slug):
    req = urllib.request.Request(BASE + slug, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        html = r.read().decode("utf-8", "replace")
    for m in TEL_RE.finditer(html):
        phone = re.sub(r"[^\d+]", "", m.group(1))
        if phone.replace("+9", "").lstrip("0") != SITE_PHONE.lstrip("0") and phone != SITE_PHONE:
            return phone
    return None


def main():
    facilities = json.load(open(SRC))
    done = json.load(open(OUT)) if os.path.exists(OUT) else {}
    todo = [f for f in facilities if f["id"] not in done and f.get("slug")]
    print(f"{len(facilities)} tesis, {len(done)} hazır, {len(todo)} çekilecek")

    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(fetch_phone, f["slug"]): f["id"] for f in todo}
        for i, fut in enumerate(as_completed(futures), 1):
            fid = futures[fut]
            try:
                done[fid] = fut.result()
            except Exception as e:
                done[fid] = None  # ponytail: hata = telefon yok; tekrar koşuşta yeniden denemek için OUT'tan null'ları silin
            if i % 200 == 0:
                json.dump(done, open(OUT, "w"), ensure_ascii=False, indent=0)
                print(f"{i}/{len(todo)}")

    json.dump(done, open(OUT, "w"), ensure_ascii=False, indent=0)
    found = sum(1 for v in done.values() if v)
    print(f"bitti: {found}/{len(done)} telefon bulundu -> {OUT}")


if __name__ == "__main__":
    assert TEL_RE.search('href="tel:0544 144 59 11"').group(1).strip() == "0544 144 59 11"
    main()
