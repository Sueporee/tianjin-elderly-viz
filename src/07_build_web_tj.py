# -*- coding: utf-8 -*-
"""
07_build_web_tj.py
------------------
生成天津版静态网站数据：tj/data/app_data.js
"""

import json
import math
import re
import sys
from datetime import date
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).resolve().parents[1]
CSV = BASE / "data" / "selected" / "天津各区_2020人口_2025设施.csv"
POINTS_CSV = BASE / "data" / "selected" / "点位_全市_带坐标_质检.csv"
POINTS_FALLBACK = BASE / "data" / "selected" / "点位_全市.csv"
GEO = BASE / "data" / "tianjin.geo.json"
OUT = BASE / "data" / "app_data.js"
GEO_OUT = BASE / "data" / "tianjin_geo.js"
OUT.parent.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(CSV, encoding="utf-8-sig")
df["老龄化率"] = df["2020_60岁及以上"] / df["2020常住人口"] * 100
for col, name in [("助餐点", "meal"), ("日间照料中心", "daycare"), ("卫生机构床位", "beds")]:
    df[f"{name}Per10k"] = df[col] / df["2020_60岁及以上"] * 10000


def minmax(s):
    lo, hi = s.min(), s.max()
    return pd.Series(0.5, index=s.index) if hi == lo else (s - lo) / (hi - lo)


df["mealNorm"] = minmax(df["mealPer10k"])
df["daycareNorm"] = minmax(df["daycarePer10k"])
df["bedsNorm"] = minmax(df["bedsPer10k"])
df["index"] = (
    df["mealNorm"] * 0.40
    + df["daycareNorm"] * 0.35
    + df["bedsNorm"] * 0.25
) * 100
# A 的“需求”不等于人口规模：人口多 + 老龄化深，需求更强
df["demand"] = (minmax(df["2020_60岁及以上"]) * 0.60 + minmax(df["老龄化率"]) * 0.40) * 100
df["gap"] = df["demand"] - df["index"]

# 权重敏感性：四个预设下排名是否稳定
PRESETS = {
    "均衡": (0.40, 0.35, 0.25),
    "吃饭": (0.60, 0.25, 0.15),
    "照护": (0.20, 0.60, 0.20),
    "就医": (0.20, 0.20, 0.60),
}
for name, (wm, wd, wb) in PRESETS.items():
    df[f"score_{name}"] = (df["mealNorm"] * wm + df["daycareNorm"] * wd + df["bedsNorm"] * wb) * 100
rank_cols = [f"score_{name}" for name in PRESETS]
for c in rank_cols:
    df[f"rank_{c}"] = df[c].rank(ascending=False, method="min")
df["rank_min"] = df[[f"rank_{c}" for c in rank_cols]].min(axis=1)
df["rank_max"] = df[[f"rank_{c}" for c in rank_cols]].max(axis=1)
df["rank_range"] = df["rank_max"] - df["rank_min"]


def weakest_type(r):
    vals = {"助餐点": r["mealNorm"], "日间照料": r["daycareNorm"], "卫生床位": r["bedsNorm"]}
    return min(vals, key=vals.get)


df["weakest"] = df.apply(weakest_type, axis=1)

districts = []
for _, r in df.iterrows():
    districts.append({
        "name": r["区"],
        "pop2020": int(r["2020常住人口"]),
        "elderly60": int(r["2020_60岁及以上"]),
        "aging": round(float(r["老龄化率"]), 1),
        "pop2024": round(float(r["2024户籍人口_万人"]), 2),
        "meal": int(r["助餐点"]),
        "daycare": int(r["日间照料中心"]),
        "beds": int(r["卫生机构床位"]),
        "mealPer10k": round(float(r["mealPer10k"]), 1),
        "daycarePer10k": round(float(r["daycarePer10k"]), 1),
        "bedsPer10k": round(float(r["bedsPer10k"]), 1),
        "index": round(float(r["index"]), 1),
        "demand": round(float(r["demand"]), 1),
        "gap": round(float(r["gap"]), 1),
        "weakest": r["weakest"],
        "rankRange": int(r["rank_range"]),
    })

by_aging = sorted(districts, key=lambda d: d["aging"], reverse=True)
by_index = sorted(districts, key=lambda d: d["index"], reverse=True)
by_meal = sorted(districts, key=lambda d: d["mealPer10k"])
by_day = sorted(districts, key=lambda d: d["daycarePer10k"])
by_gap = sorted(districts, key=lambda d: d["gap"], reverse=True)

# 中心城区点位（没有坐标时先用区政府中心 + 轻微偏移，网站标注“区级近似”）
geo_data = json.loads(GEO.read_text(encoding="utf-8"))
centers = {}
for f in geo_data.get("features", []):
    p = f.get("properties", {})
    c = p.get("center") or p.get("centroid")
    if c:
        centers[p.get("name")] = (float(c[0]), float(c[1]))

points = []
if POINTS_FALLBACK.exists():
    pdf = pd.read_csv(POINTS_CSV if POINTS_CSV.exists() else POINTS_FALLBACK, encoding="utf-8-sig")
    for i, r in pdf.iterrows():
        d = r["district"]
        lon = r.get("lon")
        lat = r.get("lat")
        level = r.get("geo_level") if "geo_level" in pdf.columns else None
        if pd.isna(lon) or pd.isna(lat) or not lon or not lat:
            level = "district"
        if level == "district":
            c = centers.get(d, (117.2, 39.1))
            # 区级近似：围绕区政府中心做轻微环状偏移，避免完全重叠；不代表门牌
            angle = i * 2.39996
            radius = 0.0015 + (i % 9) * 0.00045
            lon = c[0] + math.cos(angle) * radius
            lat = c[1] + math.sin(angle) * radius
        points.append({
            "name": str(r["name"]),
            "type": "助餐点" if r["type"] == "meal" else "日间照料",
            "district": d,
            "street": str(r.get("street", "") or ""),
            "address": str(r["address"]),
            "phone": re.sub(r"\.0$", "", str(r.get("phone", "") or "")).strip(),
            "level": str(r.get("level", "") or ""),
            "extra": str(r.get("extra", "") or ""),
            "lon": round(float(lon), 6),
            "lat": round(float(lat), 6),
            "geoLevel": str(level or "district"),
            "coordSys": str(r.get("coord_sys") or ("wgs" if level == "street" else "gcj")),
            "formattedAddress": str(r.get("formatted_address", "") or ""),
            "amapLevel": str(r.get("amap_level", "") or ""),
            "quality": str(r.get("quality", "") or ""),
            "source": str(r.get("source", "") or ""),
        })

payload = {
    "meta": {
        "title": "海河养老资源",
        "generatedAt": date.today().isoformat(),
        "dataNote": "老年人口与老龄化率为 2020 年第七次全国人口普查（常住）；设施为 2024—2025 年公开名单。",
        "facilityNote": "助餐点、日间照料为区级名单逐行统计；卫生床位为 2024 年卫生机构床位；蓟州助餐点为参照周边涉农区估算。",
        "sources": [
            "天津市第七次全国人口普查（2020）",
            "《2025 天津统计年鉴》表 2-3、表 22-14、表 22-20",
            "天津市民政局：老人家食堂、社区老年人日间照料中心公开名单",
        ],
        "links": {
            "meal": "https://mz.tj.gov.cn/tjsmzjylc/gspd/stzcdt/",
            "daycare": "https://mz.tj.gov.cn/tjsmzjylc/gspd/sqylfwss/202511/t20251128_7187922.html",
        },
    },
    "totals": {
        "districts": len(districts),
        "elderly60": int(df["2020_60岁及以上"].sum()),
        "aging": round(float(df["2020_60岁及以上"].sum() / df["2020常住人口"].sum() * 100), 1),
        "elderly60_2024": 334.05,
        "pop2024": round(float(df["2024户籍人口_万人"].sum()), 1),
        "meal": int(df["助餐点"].sum()),
        "daycare": int(df["日间照料中心"].sum()),
        "beds": int(df["卫生机构床位"].sum()),
        "officialMeal": 1852,
        "officialDaycare": 1471,
    },
    "extremes": {
        "oldest": by_aging[0],
        "youngest": by_aging[-1],
        "best": by_index[0],
        "worst": by_index[-1],
        "mealLow": by_meal[0],
        "dayLow": by_day[0],
        "gapTop": by_gap[:3],
        "gapBottom": by_gap[-1],
    },
    "sensitivity": {
        "stable": int((df["rank_range"] <= 2).sum()),
        "volatile": int((df["rank_range"] >= 5).sum()),
        "total": int(len(df)),
        "presets": list(PRESETS.keys()),
    },
    "points": points,
    "pointSummary": {
        "total": len(points),
        "meal": sum(1 for p in points if p["type"] == "助餐点"),
        "daycare": sum(1 for p in points if p["type"] == "日间照料"),
        "street": sum(1 for p in points if p["geoLevel"] == "street"),
        "district": sum(1 for p in points if p["geoLevel"] == "district"),
        "qualityA": sum(1 for p in points if p.get("quality") == "A"),
        "qualityB": sum(1 for p in points if p.get("quality") == "B"),
        "qualityC": sum(1 for p in points if p.get("quality") == "C"),
        "coveredDistricts": sorted({p["district"] for p in points}),
    },
    "districts": districts,
}

js = "window.APP_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
OUT.write_text(js, encoding="utf-8")
GEO_OUT.write_text("window.TJ_GEO = " + json.dumps(geo_data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

print(f"[网站数据] {OUT}（{len(js):,} 字符）")
print(f"[汇总] 16 区 | 60+ {payload['totals']['elderly60']:,} | 老龄化 {payload['totals']['aging']}% | "
      f"助餐 {payload['totals']['meal']} | 日照 {payload['totals']['daycare']} | 床位 {payload['totals']['beds']:,}")
print(f"[极值] 老龄化最高 {by_aging[0]['name']} {by_aging[0]['aging']}% | "
      f"指数最高 {by_index[0]['name']} {by_index[0]['index']} | 指数最低 {by_index[-1]['name']} {by_index[-1]['index']}")
