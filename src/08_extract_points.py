# -*- coding: utf-8 -*-
"""
08_extract_points.py
--------------------
从天津市民政局公开名单中抽取点位级数据。

输入：
  data/raw/meal/*.png       16 区“老人家食堂”图片名单（其中和平区另有一张裁剪图，跳过）
  data/raw/daycare/*.pdf    16 区“社区老年人日间照料中心”PDF 名单

输出：
  data/selected/设施点位_原始OCR.csv
  字段：name, type, district, address, phone, level, service, source

说明：
  - 使用 RapidOCR 本地识别，不依赖云服务；
  - 表格按 y 坐标聚类成行，再按关键词/电话/级别拆分字段；
  - OCR 可能有少量错字，后续用地址做街道级坐标匹配，并在网站标注“街道级近似”。
"""

import re
import sys
from pathlib import Path

import fitz
import pandas as pd
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).resolve().parents[1]
MEAL_DIR = BASE / "data" / "raw" / "meal"
DAY_DIR = BASE / "data" / "raw" / "daycare"
OUT = BASE / "data" / "selected" / "设施点位_原始OCR.csv"
OUT.parent.mkdir(parents=True, exist_ok=True)

ocr = RapidOCR()
PHONE_RE = re.compile(r"(?:022[-\s]?\d{7,8}|\d{7,12})")
ADDR_HINTS = ("区", "街", "道", "路", "号", "小区", "楼", "院", "里", "底商", "平房", "增", "旁")
NAME_HINTS = ("食堂", "老人家", "日间照料", "照料中心", "服务中心", "养老")


def ocr_items(image) -> list[tuple[float, float, str]]:
    """把长图切成竖条再 OCR，避免整图缩放后小字丢失。"""
    if isinstance(image, (str, Path)):
        im = Image.open(image).convert("RGB")
    else:
        im = image.convert("RGB") if hasattr(image, "convert") else Image.fromarray(image)
    w, h = im.size
    items = []
    for y in range(0, h, 1200):
        top = max(0, y - 100)
        bottom = min(h, y + 1300)
        crop = im.crop((0, top, w, bottom))
        result, _ = ocr(crop)
        for box, text, score in result or []:
            if not text:
                continue
            top_y = min(p[1] for p in box) + top
            left = min(p[0] for p in box)
            items.append((float(top_y), float(left), str(text).strip()))
    # 去掉切片重叠造成的重复
    dedup = []
    for item in sorted(items, key=lambda x: (x[0], x[1])):
        if any(abs(item[0] - o[0]) < 4 and abs(item[1] - o[1]) < 4 and item[2] == o[2] for o in dedup):
            continue
        dedup.append(item)
    return dedup


def group_rows(items: list[tuple[float, float, str]]) -> list[list[tuple[float, float, str]]]:
    if not items:
        return []
    items = sorted(items, key=lambda x: (x[0], x[1]))
    rows = [[items[0]]]
    for item in items[1:]:
        top = item[0]
        prev_top = rows[-1][-1][0]
        # 行高约 60—120 px；同一行的文字 top 差通常 < 25
        if top - prev_top <= 26:
            rows[-1].append(item)
        else:
            rows.append([item])
    for row in rows:
        row.sort(key=lambda x: x[1])
    return rows


def clean(s: str) -> str:
    return re.sub(r"\s+", "", s).replace("（", "(").replace("）", ")")


def parse_row(row: list[tuple[float, float, str]], kind: str) -> dict | None:
    texts = [clean(t) for _, _, t in row if clean(t)]
    if not texts:
        return None
    joined = " ".join(texts)
    if any(h in joined for h in ("序号", "食堂名称", "详细地址", "联系电话", "管理运营方", "服务电话", "备注")):
        return None
    if "名单" in joined and len(joined) < 30:
        return None

    phone = ""
    for t in texts:
        m = PHONE_RE.search(t)
        if m:
            phone = m.group(0).replace(" ", "").replace("-", "")
            break

    level = ""
    for t in texts:
        if t in ("一级", "二级", "三级"):
            level = t
            break

    service = ""
    for t in texts:
        if any(k in t for k in ("堂食", "送餐", "订餐")):
            service = t
            break

    name_candidates = []
    addr_candidates = []
    for t in texts:
        if not t or t == level or t == service or t == phone:
            continue
        if PHONE_RE.fullmatch(t):
            continue
        if t in ("一级", "二级", "三级", "堂食就餐", "送餐", "订餐"):
            continue
        if any(k in t for k in NAME_HINTS):
            name_candidates.append(t)
        if any(k in t for k in ADDR_HINTS) and not any(k in t for k in ("食堂", "日间照料", "照料中心")):
            # 日照表里的“管理运营方”也含区/院，优先选更像地址的文本
            if kind == "daycare" and any(k in t for k in ("公司", "协会", "养老院", "服务中心")) and not any(k in t for k in ("号", "路", "街", "道", "小区", "楼", "平房", "底商", "增")):
                continue
            addr_candidates.append(t)

    if kind == "meal":
        name = max(name_candidates, key=len) if name_candidates else ""
        address = max(addr_candidates, key=len) if addr_candidates else ""
    else:
        # 日照：名称通常含“日间照料/照料中心”，地址通常含“区/街/路/号”，运营方含公司/院/协会
        names = [t for t in name_candidates if "日间照料" in t or "照料中心" in t]
        name = max(names, key=len) if names else (max(name_candidates, key=len) if name_candidates else "")
        address = max(addr_candidates, key=len) if addr_candidates else ""

    # 名称过短、没有地址的，视为表头/噪声
    if len(name) < 3 or len(address) < 4:
        return None

    return {
        "name": name,
        "address": address,
        "phone": phone,
        "level": level,
        "service": service,
    }


def parse_document(image, district: str, kind: str, source: str) -> list[dict]:
    rows = group_rows(ocr_items(image))
    records = []
    for row in rows:
        rec = parse_row(row, kind)
        if rec:
            rec.update({"type": kind, "district": district, "source": source})
            records.append(rec)
    return records


def main():
    all_records = []

    meal_files = sorted(p for p in MEAL_DIR.glob("*.png") if not p.name.startswith("_"))
    print(f"[助餐] {len(meal_files)} 张区级图片")
    for p in meal_files:
        district = p.stem.replace("区", "") + "区"
        recs = parse_document(str(p), district, "meal", p.name)
        print(f"  {district}: {len(recs)} 条")
        all_records.extend(recs)

    day_files = sorted(p for p in DAY_DIR.glob("*.pdf") if not p.name.startswith("_"))
    print(f"[日照] {len(day_files)} 个区级 PDF")
    for p in day_files:
        district = p.stem.replace("区", "") + "区"
        recs = []
        doc = fitz.open(p)
        for page in doc:
            pix = page.get_pixmap(dpi=190)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            recs.extend(parse_document(img, district, "daycare", p.name))
        print(f"  {district}: {len(recs)} 条")
        all_records.extend(recs)

    df = pd.DataFrame(all_records)
    df = df.drop_duplicates(subset=["type", "district", "name", "address"])
    df.to_csv(OUT, index=False, encoding="utf-8-sig")

    print(f"\n[输出] {OUT}")
    print(f"[合计] {len(df)} 条")
    print(df.groupby(["type", "district"]).size().to_string())
    print("\n样例：")
    print(df.head(12).to_string(index=False))


if __name__ == "__main__":
    main()
