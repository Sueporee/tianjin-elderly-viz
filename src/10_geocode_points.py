# -*- coding: utf-8 -*-
"""
10_geocode_points.py
--------------------
给中心城区点位补街道级近似坐标（不依赖地图 key）。

方法：
  - 用 OpenStreetMap Photon 免费地理编码；
  - 先查“天津 + 区 + 地址（去掉门牌后）”，失败再查“天津 + 区 + 道路”，
    最后退回区政府中心点；
  - 坐标标注 geo_level = street / district，网站会明确显示“街道级近似”。

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

HEADERS = {"User-Agent": "tj-elderly-viz/1.0 (course project; street-level geocoding)"}
PHOTON = "https://photon.komoot.io/api/"

# 天津大致范围，防止匹配到外地
BOX = (116.7, 38.4, 118.2, 40.4)


def load_centers():
    d = json.loads(GEO.read_text(encoding="utf-8"))
    out = {}
    for f in d["features"]:
        p = f["properties"]
        c = p.get("center") or p.get("centroid")
        if c:
            out[p["name"]] = (float(c[0]), float(c[1]))
    return out


def in_box(lon, lat):
    return BOX[0] <= lon <= BOX[2] and BOX[1] <= lat <= BOX[3]


def search(q, cache):
    if q in cache:
        return cache[q]
    try:
        r = requests.get(
            PHOTON,
            params={"q": q, "limit": 3, "lang": "zh"},
            headers=HEADERS,
            timeout=20,
        )
        if r.status_code != 200:
            cache[q] = None
            return None
        features = r.json().get("features", [])
        for f in features:
            coords = f.get("geometry", {}).get("coordinates")
            if coords and in_box(coords[0], coords[1]):
                cache[q] = coords
                return coords
        cache[q] = None
        return None
    except Exception:
        cache[q] = None
        return None
    finally:
        time.sleep(0.12)


def simplify(addr):
    a = re.sub(r"[（(].*?[)）]", "", str(addr))
    a = a.replace("天津市", "").strip()
    a = re.sub(r"\s+", "", a)
    return a


def road_candidate(addr):
    a = simplify(addr)
    # 优先取“路/道/街”前的道路名；取最后一个候选，避免取到“劝业场街”
    cands = re.findall(r"([\u4e00-\u9fa5]{2,12}(?:路|道|街))", a)
    if not cands:
        return ""
    # “陕西路”优于“劝业场街”：优先包含“路/道”的候选
    for c in reversed(cands):
        if c.endswith("路") or c.endswith("道"):
            return c
    return cands[-1]


def main():
    df = pd.read_csv(SRC, encoding="utf-8-sig")
    centers = load_centers()
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    lons, lats, levels, queries = [], [], [], []

    for i, row in df.iterrows():
        district = row["district"]
        addr = simplify(row["address"])
        center = centers.get(district, (117.2, 39.1))
        found = None
        q_used = ""

        # 1) 区 + 地址（去掉括号；保留门牌前的部分）
        base = re.sub(r"\d+号.*", "号", addr)
        q1 = f"天津 {district} {base}"
        found = search(q1, cache)
        q_used = q1

        # 2) 区 + 道路
        if not found:
            road = road_candidate(addr)
            if road:
                q2 = f"天津 {district} {road}"
                found = search(q2, cache)
                q_used = q2

        # 3) 退回区政府中心
        if found:
            lon, lat = found
            level = "street"
        else:
            lon, lat = center
            level = "district"

        lons.append(round(float(lon), 6))
        lats.append(round(float(lat), 6))
        levels.append(level)
        queries.append(q_used)
        if i % 25 == 0:
            print(f"  {i}/{len(df)} {district} {level}")

    df["lon"] = lons
    df["lat"] = lats
    df["geo_level"] = levels
    df["geo_query"] = queries
    df.to_csv(OUT, index=False, encoding="utf-8-sig")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\n[输出] {OUT}")
    print(f"[坐标] street {sum(1 for x in levels if x == 'street')} | district {sum(1 for x in levels if x == 'district')}")
    print(df.groupby(["district", "geo_level"]).size().to_string())
    print("\n样例：")
    print(df[["district", "type", "name", "address", "lon", "lat", "geo_level"]].head(10).to_string(index=False))


if __name__ == "__main__":
    main()
