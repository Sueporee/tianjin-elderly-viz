# -*- coding: utf-8 -*-
"""
14_amap_geocode.py
------------------
高德 Web 服务批量地理编码（batch=true，每次 10 个地址）。
Key 只从本地 amap_key.txt 读取，不写入网页、不打印。

输出：
  data/selected/点位_全市_高德坐标.csv
  outputs/高德地理编码进度.txt
"""

import sys
import time
from pathlib import Path

import pandas as pd
import requests

sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).resolve().parents[1]
SRC = BASE / "data" / "selected" / "点位_全市_带坐标.csv"
OUT = BASE / "data" / "selected" / "点位_全市_高德坐标.csv"
PROGRESS = BASE / "outputs" / "高德地理编码进度.txt"
KEY_FILE = BASE / "amap_key.txt"
URL = "https://restapi.amap.com/v3/geocode/geo"

key = KEY_FILE.read_text(encoding="utf-8").strip() if KEY_FILE.exists() else ""
if len(key) < 20:
    raise SystemExit("amap_key.txt 为空或格式不对。")

df = pd.read_csv(SRC, encoding="utf-8-sig")
session = requests.Session()
session.headers.update({"User-Agent": "tj-elderly-viz/1.0"})


def norm_address(row):
    addr = str(row.get("address", "")).strip()
    district = str(row.get("district", "")).strip()
    if addr.startswith("天津市"):
        return addr
    if district and district not in addr[:8]:
        return f"天津市{district}{addr}"
    return f"天津市{addr}"


addresses = [norm_address(r) for _, r in df.iterrows()]
unique = list(dict.fromkeys(addresses))
print(f"点位 {len(df)}，唯一地址 {len(unique)}", flush=True)


def request_batch(batch):
    for attempt in range(4):
        try:
            r = session.get(
                URL,
                params={"key": key, "address": "|".join(batch), "city": "天津", "batch": "true"},
                timeout=12,
            )
            j = r.json()
        except Exception:
            time.sleep(0.8 + attempt)
            continue
        if j.get("status") == "1":
            return j.get("geocodes") or []
        info = str(j.get("info", ""))
        if "QPS" in info or "CUQPS" in info or j.get("infocode") in ("10021",):
            time.sleep(1.0 + attempt)
            continue
        return None
    return None


def request_one(addr):
    for attempt in range(3):
        try:
            r = session.get(URL, params={"key": key, "address": addr, "city": "天津"}, timeout=12)
            j = r.json()
        except Exception:
            time.sleep(0.5 + attempt)
            continue
        if j.get("status") == "1":
            gs = j.get("geocodes") or []
            return gs[0] if gs else None
        time.sleep(0.5)
    return None


by_addr = {}
quota_hit = False
for start in range(0, len(unique), 10):
    chunk = unique[start:start + 10]
    gs = request_batch(chunk)
    if gs is None:
        gs = []
    if len(gs) == len(chunk):
        for addr, g in zip(chunk, gs):
            by_addr[addr] = g
    else:
        # 批量顺序/数量不稳定时逐条补
        for addr in chunk:
            g = request_one(addr)
            by_addr[addr] = g
            time.sleep(0.08)
    done = min(start + 10, len(unique))
    if done % 100 == 0 or done == len(unique):
        ok = sum(1 for x in by_addr.values() if x)
        PROGRESS.write_text(
            f"高德批量地理编码进度\n\n总点位：{len(df)}\n唯一地址：{len(unique)}\n已处理地址：{done}/{len(unique)}\n成功：{ok}\n当前批次：{chunk[0][:30]}…\n",
            encoding="utf-8",
        )
        print(f"{done}/{len(unique)} 成功 {ok}", flush=True)
    time.sleep(0.12)

lons, lats, levels, coordsyses, formatted, amaplevels = [], [], [], [], [], []
for i, row in df.iterrows():
    addr = addresses[i]
    g = by_addr.get(addr)
    if g and g.get("location"):
        lon, lat = g["location"].split(",", 1)
        lons.append(round(float(lon), 6))
        lats.append(round(float(lat), 6))
        levels.append("address")
        coordsyses.append("gcj")
        formatted.append(g.get("formatted_address", addr))
        amaplevels.append(g.get("level", ""))
    else:
        lons.append(row.get("lon"))
        lats.append(row.get("lat"))
        levels.append("district")
        coordsyses.append("gcj")
        formatted.append(addr)
        amaplevels.append("")

out = df.copy()
out["lon"] = lons
out["lat"] = lats
out["geo_level"] = levels
out["coord_sys"] = coordsyses
out["formatted_address"] = formatted
out["amap_level"] = amaplevels
out.to_csv(OUT, index=False, encoding="utf-8-sig")

ok = levels.count("address")
PROGRESS.write_text(
    f"高德地理编码完成\n\n总点位：{len(df)}\n成功门址/兴趣点：{ok}\n失败保留区级：{len(df) - ok}\n输出：{OUT}\n",
    encoding="utf-8",
)
print(f"[输出] {OUT} {len(df)} 条，成功 {ok}")
