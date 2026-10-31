# -*- coding: utf-8 -*-
"""
13_audit_points.py
------------------
对 16 区 3,202 个点位做一次程序性质检：
  - 去重、缺失、电话格式、地址完整度
  - 生成 A/B/C 资料完整度
  - 抽样 30 条供人工对照民政局名单
  - 输出质检报告与带质检字段的点位表
"""

import re
import sys
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).resolve().parents[1]
SRC = BASE / "data" / "selected" / "点位_全市_高德坐标.csv"
if not SRC.exists():
    SRC = BASE / "data" / "selected" / "点位_全市_带坐标.csv"
OUT = BASE / "data" / "selected" / "点位_全市_带坐标_质检.csv"
SAMPLE = BASE / "outputs" / "点位抽查_30.csv"
REPORT = BASE / "outputs" / "点位质检报告.md"
SAMPLE.parent.mkdir(exist_ok=True)


def norm_phone(v):
    s = str(v or "").strip()
    s = re.sub(r"\.0$", "", s)
    s = re.sub(r"[^\d]", "", s)
    return s


def main():
    df = pd.read_csv(SRC, encoding="utf-8-sig")
    df["phone"] = df["phone"].map(norm_phone)
    df["name"] = df["name"].astype(str).str.strip()
    df["address"] = df["address"].astype(str).str.strip()
    df["type_cn"] = df["type"].map({"meal": "助餐点", "daycare": "日间照料"})
    df["source"] = df["type"].map({
        "meal": "天津市民政局 2025 老人家食堂区级名单",
        "daycare": "天津市民政局 2025 社区老年人日间照料中心清单",
    })

    df["has_phone"] = df["phone"].str.len() >= 7
    df["has_address"] = df["address"].str.len() >= 6

    def quality(row):
        if row["has_phone"] and row["geo_level"] in ("street", "address"):
            return "A"
        if row["has_phone"] and row["has_address"]:
            return "B"
        return "C"

    df["quality"] = df.apply(quality, axis=1)

    dup = df.duplicated(subset=["type", "district", "name", "address"]).sum()
    report = f"""# 点位数据质检报告

> 自动生成，用于交付前自查；“抽样 30 条”仍需人工对照民政局原名单。

## 一、总量

- 点位总数：**{len(df):,}**
- 助餐点：**{(df['type'] == 'meal').sum():,}**
- 日间照料：**{(df['type'] == 'daycare').sum():,}**
- 覆盖区：**{df['district'].nunique()}** 个

## 二、质检结果

| 检查 | 结果 |
|---|---|
| 重复记录 | {dup} 条 |
| 缺地址 | {(~df['has_address']).sum()} 条 |
| 缺电话 | {(~df['has_phone']).sum()} 条 |
| A 类：有电话 + 街道/门址坐标 | {(df['quality'] == 'A').sum()} 条 |
| B 类：有电话 + 区级坐标 | {(df['quality'] == 'B').sum()} 条 |
| C 类：缺电话或地址 | {(df['quality'] == 'C').sum()} 条 |

说明：A 类较可信；B 类字段完整但坐标只能到区；C 类需要人工核对。

## 三、分区数量

{df.groupby(['district', 'type_cn']).size().unstack(fill_value=0).to_markdown()}

## 四、抽样 30 条（待人工对照）

见 `outputs/点位抽查_30.csv`。核对方法：

1. 打开民政局原名单对应区图片/PDF；
2. 对照名称、地址、电话；
3. 在“核对结果”列标记 `正确 / 错字 / 地址错 / 电话错 / 找不到`；
4. 把确认的错误回写到 `点位_全市_带坐标.csv`，重跑本脚本和 07。

## 五、已知缺口

- 蓟州区助餐名单民政局未发布图片，助餐点位为 0；
- 3,070 个点位为区级近似坐标，只有 132 个街道级；
- 部分郊区名单包含村居级点位，与中心城区街道级名单不完全同口径；
- 电话来自名单 OCR，可能有 1—2 位识别错误，使用前请核对。
"""
    REPORT.write_text(report, encoding="utf-8")

    sample_cols = ["district", "type_cn", "name", "address", "phone", "geo_level", "quality"]
    sample = df.sample(n=min(30, len(df)), random_state=42)[sample_cols].copy()
    sample["核对结果"] = ""
    sample["备注"] = ""
    sample.to_csv(SAMPLE, index=False, encoding="utf-8-sig")

    df.to_csv(OUT, index=False, encoding="utf-8-sig")
    print(f"[输出] {OUT}  {len(df)} 条")
    print(f"[报告] {REPORT}")
    print(f"[抽样] {SAMPLE}")
    print(df["quality"].value_counts().to_string())


if __name__ == "__main__":
    main()
