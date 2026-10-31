# -*- coding: utf-8 -*-
"""合并中心城区带坐标点位 + 其余区点位，生成全市点位表。"""
import json, math, sys
from pathlib import Path
import pandas as pd

BASE=Path(__file__).resolve().parents[1]
CENTRAL=BASE/"data"/"selected"/"点位_中心城区_带坐标.csv"
REST=BASE/"data"/"selected"/"点位_其余区.csv"
GEO=BASE/"data"/"tianjin.geo.json"
OUT=BASE/"data"/"selected"/"点位_全市_带坐标.csv"
OUT_ALL=BASE/"data"/"selected"/"点位_全市.csv"

centers={}
for f in json.loads(GEO.read_text(encoding="utf-8"))["features"]:
    p=f["properties"]; c=p.get("center") or p.get("centroid")
    if c: centers[p["name"]]=(float(c[0]),float(c[1]))

frames=[]
if CENTRAL.exists():
    c=pd.read_csv(CENTRAL,encoding="utf-8-sig")
    c["geo_level"]=c.get("geo_level","district")
    frames.append(c)
if REST.exists():
    r=pd.read_csv(REST,encoding="utf-8-sig")
    r["lon"]=None; r["lat"]=None; r["geo_level"]="district"
    frames.append(r)
if not frames:
    print("no input"); sys.exit(1)

df=pd.concat(frames,ignore_index=True,sort=False)
# 其余区没有坐标：区政府中心 + 轻微环状偏移
for i,row in df.iterrows():
    if pd.isna(row.get("lon")) or pd.isna(row.get("lat")):
        c=centers.get(row["district"],(117.2,39.1))
        angle=i*2.39996; radius=0.0015+(i%9)*0.00045
        df.at[i,"lon"]=round(c[0]+math.cos(angle)*radius,6)
        df.at[i,"lat"]=round(c[1]+math.sin(angle)*radius,6)
        df.at[i,"geo_level"]="district"

df=df.drop_duplicates(subset=["type","district","name","address"])
df.to_csv(OUT,index=False,encoding="utf-8-sig")
# 不含坐标的全量表（保留给其他用途）
df.drop(columns=["lon","lat","geo_level","street"],errors="ignore").to_csv(OUT_ALL,index=False,encoding="utf-8-sig")
print("total",len(df))
print(df.groupby(["district","type"]).size().to_string())
print("street/district",df["geo_level"].value_counts().to_dict())
