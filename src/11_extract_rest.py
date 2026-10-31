# -*- coding: utf-8 -*-
"""
11_extract_rest.py
---------------------
抽取中心城区以外的 11 个区点位：
  - 老人家食堂图片：按表头列位置切分“名称/地址/电话”
  - 日间照料 PDF：按表头列位置切分“名称/地点/电话”

输出：
  data/selected/点位_中心城区.csv
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
OUT = BASE / "data" / "selected" / "点位_其余区.csv"

DISTRICTS = ["红桥区", "东丽区", "西青区", "津南区", "北辰区", "武清区", "宝坻区", "滨海新区", "宁河区", "静海区", "蓟州区"]
ocr = RapidOCR()
PHONE_RE = re.compile(r"(?:022[-\s]?\d{7,8}|\d{7,12})")


def ocr_items(image) -> list[tuple[float, float, float, str]]:
    if isinstance(image, (str, Path)):
        im = Image.open(image).convert("RGB")
    else:
        im = image.convert("RGB") if hasattr(image, "convert") else Image.fromarray(image)
    w, h = im.size
    items = []
    for y in range(0, h, 2400):
        top = max(0, y - 60)
        bottom = min(h, y + 2460)
        result, _ = ocr(im.crop((0, top, w, bottom)))
        for box, text, score in result or []:
            if not text:
                continue
            top_y = min(p[1] for p in box) + top
            left = min(p[0] for p in box)
            right = max(p[0] for p in box)
            items.append((float(top_y), float(left), float(right), str(text).strip()))
    dedup = []
    for item in sorted(items, key=lambda x: (x[0], x[1])):
        if any(abs(item[0] - o[0]) < 4 and abs(item[1] - o[1]) < 4 and item[3] == o[3] for o in dedup):
            continue
        dedup.append(item)
    return dedup


def group_rows(items):
    if not items:
        return []
    items = sorted(items, key=lambda x: (x[0], x[1]))
    rows = [[items[0]]]
    for item in items[1:]:
        if item[0] - rows[-1][-1][0] <= 28:
            rows[-1].append(item)
        else:
            rows.append([item])
    return [sorted(r, key=lambda x: x[1]) for r in rows]


def clean(s):
    return re.sub(r"\s+", "", s).replace("（", "(").replace("）", ")")


def header_positions(rows, keys):
    """在 OCR 行中找到表头，返回每个关键列的 x 左边界。"""
    for row in rows:
        texts = [clean(t).replace("老人家食堂名称", "食堂名称").replace("地址信息", "详细地址") for _, _, _, t in row]
        if not any(k in " ".join(texts) for k in keys[:2]):
            continue
        pos = {}
        for _, left, right, text in row:
            t = clean(text).replace("老人家食堂名称", "食堂名称").replace("地址信息", "详细地址")
            for key in keys:
                if key in t and key not in pos:
                    pos[key] = left
        if len(pos) >= 3:
            return pos
    return {}


def column_bounds(pos, width):
    if not pos:
        return None
    ordered = sorted(pos.items(), key=lambda kv: kv[1])
    xs = [x for _, x in ordered]
    # 用相邻表头的中间点作为边界
    bounds = [0.0]
    for a, b in zip(xs, xs[1:]):
        bounds.append((a + b) / 2)
    bounds.append(float(width))
    return ordered, bounds


def col_index(x, bounds):
    for i in range(len(bounds) - 1):
        if bounds[i] <= x < bounds[i + 1]:
            return i
    return len(bounds) - 2


def parse_rows(rows, kind, width):
    if kind == "meal":
        keys = ["序号", "食堂名称", "食堂级别", "详细地址", "联系电话", "三餐供应"]
    else:
        keys = ["区", "名称", "地点", "管理运营方", "服务电话", "备注"]
    pos = header_positions(rows, keys)
    cb = column_bounds(pos, width)
    # 没识别到表头时，用相对位置兜底
    if cb is None:
        if kind == "meal":
            bounds = [0, .10, .42, .55, .82, .92, width]
        else:
            bounds = [0, .10, .35, .68, .88, .98, width]
        labels = keys
    else:
        labels = [k for k, _ in cb[0]]
        bounds = cb[1]
        # 补齐缺失的表头列名
        while len(labels) < len(bounds) - 1:
            labels.append(f"col{len(labels)}")

    records = []
    for row in rows:
        cols = [[] for _ in range(len(bounds) - 1)]
        for _, left, right, text in row:
            t = clean(text)
            if not t:
                continue
            idx = col_index((left + right) / 2, bounds)
            if 0 <= idx < len(cols):
                cols[idx].append(t)
        if not cols:
            continue
        texts = ["".join(c) for c in cols]
        joined = " ".join(texts)
        if any(h in joined for h in ("序号", "食堂名称", "详细地址", "联系电话", "管理运营方", "服务电话")):
            continue

        # 按表头顺序取字段
        def get(label, default=""):
            try:
                return texts[labels.index(label)]
            except ValueError:
                return default

        if kind == "meal":
            name = get("食堂名称")
            address = get("详细地址")
            phone = get("联系电话")
            level = get("食堂级别")
            service = get("三餐供应")
        else:
            name = get("名称")
            address = get("地点")
            phone = get("服务电话")
            level = ""
            service = get("管理运营方")

        m = PHONE_RE.search(phone) or PHONE_RE.search(joined)
        phone = m.group(0).replace(" ", "").replace("-", "") if m else ""
        if len(name) < 3 or len(address) < 4:
            continue
        records.append({
            "name": name, "type": kind, "address": address,
            "phone": phone, "level": level, "extra": service,
        })
    return records


def main():
    records = []

    for d in DISTRICTS:
        p = MEAL_DIR / f"{d}.png"
        if not p.exists():
            print("[缺图]", p)
            continue
        items = ocr_items(p)
        rows = group_rows(items)
        recs = parse_rows(rows, "meal", Image.open(p).width)
        for r in recs:
            r["district"] = d
        print(f"[助餐] {d}: {len(recs)}")
        records.extend(recs)

    for d in DISTRICTS:
        p = DAY_DIR / f"{d}.pdf"
        if not p.exists():
            print("[缺 PDF]", p)
            continue
        recs = []
        doc = fitz.open(p)
        for page in doc:
            pix = page.get_pixmap(dpi=190)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            items = ocr_items(img)
            rows = group_rows(items)
            recs.extend(parse_rows(rows, "daycare", img.width))
        for r in recs:
            r["district"] = d
        print(f"[日照] {d}: {len(recs)}")
        records.extend(recs)

    df = pd.DataFrame(records)
    df = df.drop_duplicates(subset=["type", "district", "name", "address"])
    df.to_csv(OUT, index=False, encoding="utf-8-sig")
    print(f"\n[输出] {OUT}  {len(df)} 条")
    print(df.groupby(["type", "district"]).size().to_string())
    print(df.head(15).to_string(index=False))


if __name__ == "__main__":
    main()
