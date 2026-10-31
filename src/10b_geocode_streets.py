# -*- coding: utf-8 -*-
"""
10b_geocode_streets.py
----------------------
中心城区点位的街道级近似坐标（无地图 key）。

策略：
  - 从地址中抽“街道/街”名；
  - 对每个“区 + 街道”只请求一次 Photon（OpenStreetMap）；
  - 查不到就退回区政府中心点；
  - 网站用“街道级近似 / 区级近似”明确标注，不假装门牌精度。

输出：
  data/selected/点位_中心城区_带坐标.csv
  data/selected/geocode_cache.json
"""

import json
import re
import sys
import time
from pathlib import Path

import pandas as pd
import requests

sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).resolve().parents[1]
SRC = BASE / "data" / "selected" / "点位_中心城区.csv"
OUT = BASE / "data" / "selected" / "点位_中心城区_带坐标.csv"
CACHE = BASE / "data" / "selected" / "geocode_cache.json"
GEO = BASE / "data" / "tianjin.geo.json"

HEADERS = {"User-Agent": "tj-elderly-viz/1.0 (course project; street-level)"}
PHOTON = "https://photon.komoot.io/api/"
BOX = (116.7, 38.4, 118.2, 40.4)


def district_centers():
    d = json.loads(GEO.read_text(encoding="utf-8"))
    out = {}
    for f in d["features"]:
        p = f["properties"]
        c = p.get("center") or p.get("centroid")
        if c:
            out[p["name"]] = (float(c[0]), float(c[1]))
    return out


def street_of(addr):
    a = re.sub(r"[（(].*?[)）]", "", str(addr))
    cands = re.findall(r"([\u4e00-\u9fa5]{2,10}(?:街道|街))", a)
    return max(cands, key=len) if cands else ""


def in_box(lon, lat):
    return BOX[0] <= lon <= BOX[2] and BOX[1] <= lat <= BOX[3]


def query(q, cache):
    if q in cache:
        return cache[q]
    for attempt in range(2):
        try:
            r = requests.get(PHOTON, params={"q": q, "limit": 3, "lang": "zh"},
                             headers=HEADERS, timeout=10)
            if r.status_code == 200:
                for f in r.json().get("features", []):
                    c = f.get("geometry", {}).get("coordinates")
                    if c and in_box(c[0], c[1]):
                        cache[q] = c
                        return c
                cache[q] = None
                return None
            if r.status_code in (429, 503):
                time.sleep(2 + attempt * 2)
                continue
        except Exception:
            time.sleep(1 + attempt)
    cache[q] = None
    return None


def main():
    df = pd.read_csv(SRC, encoding="utf-8-sig")
    centers = district_centers()
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    df["street"] = df["address"].map(street_of)
    pairs = sorted({(d, s) for d, s in zip(df["district"], df["street"]) if s})
    print(f"[地理编码] {len(pairs)} 个“区+街道”组合")

    street_coords = {}
    for i, (district, street) in enumerate(pairs, 1):
        q = f"天津 {district} {street}"
        c = query(q, cache)
        if c:
            street_coords[(district, street)] = (float(c[0]), float(c[1]))
        else:
            street_coords[(district, street)] = centers.get(district, (117.2, 39.1))
        if i % 10 == 0:
            print(f"  {i}/{len(pairs)}")
        time.sleep(1.1)

    lons, lats, levels = [], [], []
    for _, r in df.iterrows():
        d, s = r["district"], r["street"]
        if s and street_coords.get((d, s)):
            lon, lat = street_coords[(d, s)]
            level = "street"
        else:
            lon, lat = centers.get(d, (117.2, 39.1))
            level = "district"
        lons.append(round(lon, 6))
        lats.append(round(lat, 6))
        levels.append(level)

    df["lon"] = lons
    df["lat"] = lats
    df["geo_level"] = levels
    df.to_csv(OUT, index=False, encoding="utf-8-sig")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n[输出] {OUT}")
    print(f"[坐标] street {levels.count('street')} | district {levels.count('district')}")
    print(df.groupby(["district", "geo_level"]).size().to_string())


if __name__ == "__main__":
    main()
