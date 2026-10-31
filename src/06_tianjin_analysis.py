# -*- coding: utf-8 -*-
"""
06_tianjin_analysis.py
----------------------
天津版真实数据分析：16 区老年人口 + 三类社区养老设施。

数据口径：
  - 老年人口 / 老龄化率：2020 年第七次全国人口普查，各区常住人口（真实）
  - 助餐点：天津市民政局 2025 年“老人家食堂”区级名单逐行统计（蓟州为参照周边涉农区估算）
  - 日间照料中心：天津市民政局 2025 年 11 月各区清单逐行统计
  - 卫生机构床位：2025 天津统计年鉴 表 22-14（2024 年）
  - 2024 户籍人口：2025 天津统计年鉴 表 2-3

输出：
  outputs/figures/天津_图1_老年人口与老龄化率.png
  outputs/figures/天津_图2_设施配置与便利指数.png
  outputs/figures/天津_图3_老龄化与日间照料.png
  outputs/tables/天津_各区老年人口与设施.csv
  outputs/天津数据分析摘要.md
"""

import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from adjustText import adjust_text

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).resolve().parents[1]
SRC = BASE / "data" / "selected" / "天津各区_2020人口_2025设施.csv"
FIG = BASE / "outputs" / "figures"
TAB = BASE / "outputs" / "tables"
FIG.mkdir(parents=True, exist_ok=True)
TAB.mkdir(parents=True, exist_ok=True)

installed = {f.name for f in font_manager.fontManager.ttflist}
for name in ["Microsoft YaHei", "SimHei", "Noto Sans CJK SC"]:
    if name in installed:
        plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
        break
plt.rcParams["axes.unicode_minus"] = False
warnings.filterwarnings(
    "ignore", message="This figure includes Axes that are not compatible with tight_layout"
)

# ---------------------------------------------------------------------------
# 1. 读取与指标
# ---------------------------------------------------------------------------
df = pd.read_csv(SRC, encoding="utf-8-sig")
df["老龄化率"] = df["2020_60岁及以上"] / df["2020常住人口"] * 100
df["每万老人_助餐点"] = df["助餐点"] / df["2020_60岁及以上"] * 10000
df["每万老人_日间照料"] = df["日间照料中心"] / df["2020_60岁及以上"] * 10000
df["每万老人_卫生床位"] = df["卫生机构床位"] / df["2020_60岁及以上"] * 10000

WEIGHTS = {"助餐点": 0.40, "日间照料": 0.35, "卫生床位": 0.25}


def minmax(s):
    lo, hi = s.min(), s.max()
    return pd.Series(0.5, index=s.index) if hi == lo else (s - lo) / (hi - lo)


df["便利指数"] = (
    minmax(df["每万老人_助餐点"]) * WEIGHTS["助餐点"]
    + minmax(df["每万老人_日间照料"]) * WEIGHTS["日间照料"]
    + minmax(df["每万老人_卫生床位"]) * WEIGHTS["卫生床位"]
) * 100
df = df.sort_values("老龄化率", ascending=False).reset_index(drop=True)

print(f"[读取] {len(df)} 区 | 60+ {df['2020_60岁及以上'].sum():,} 人 | "
      f"助餐点 {df['助餐点'].sum()} | 日间照料 {df['日间照料中心'].sum()} | "
      f"卫生床位 {df['卫生机构床位'].sum():,}")
print(f"[校验] 卫生床位合计 {df['卫生机构床位'].sum():,}（年鉴 73,216）")
print(f"[校验] 日间照料合计 {df['日间照料中心'].sum()}（2024 全市 1,471）")
print(f"[校验] 助餐点合计 {df['助餐点'].sum()}（官方 1,852，名单口径有差异）")

out_cols = ["区", "2020常住人口", "2020_60岁及以上", "老龄化率", "2024户籍人口_万人",
            "助餐点", "日间照料中心", "卫生机构床位",
            "每万老人_助餐点", "每万老人_日间照料", "每万老人_卫生床位", "便利指数"]
table = df[out_cols].copy()
for c in table.select_dtypes(include="float").columns:
    table[c] = table[c].round(2)
table.sort_values("便利指数", ascending=False).to_csv(
    TAB / "天津_各区老年人口与设施.csv", index=False, encoding="utf-8-sig")

# ---------------------------------------------------------------------------
# 2. 图1：老年人口 + 老龄化率
# ---------------------------------------------------------------------------
d = df.sort_values("老龄化率", ascending=False).reset_index(drop=True)
avg = d["2020_60岁及以上"].sum() / d["2020常住人口"].sum() * 100

fig, ax1 = plt.subplots(figsize=(12.4, 6.0))
norm = plt.Normalize(d["老龄化率"].min(), d["老龄化率"].max())
colors = [plt.cm.Blues(0.30 + 0.55 * norm(v)) for v in d["老龄化率"]]
bars = ax1.bar(d["区"], d["2020_60岁及以上"] / 10000, color=colors,
               edgecolor="white", linewidth=1.0, width=0.62, alpha=0.9, zorder=3)
ax1.set_ylabel("60 岁及以上人口（万人）")
ax1.set_ylim(0, d["2020_60岁及以上"].max() / 10000 * 1.28)
ax1.tick_params(axis="x", rotation=28)
ax1.grid(axis="y", linestyle=":", alpha=0.4)
for b, v in zip(bars, d["2020_60岁及以上"] / 10000):
    ax1.text(b.get_x() + b.get_width() / 2, v + 0.25, f"{v:.1f}",
             ha="center", va="bottom", fontsize=8.5, color="#34495E")

ax2 = ax1.twinx()
ax2.plot(d["区"], d["老龄化率"], color="#a84b1f", marker="o", markersize=5.5,
         linewidth=2.2, zorder=4)
ax2.axhline(avg, color="#a84b1f", linestyle="--", linewidth=1, alpha=0.55)
ax2.text(len(d) - 0.4, avg + 0.4, f"全市平均 {avg:.1f}%",
         ha="right", va="bottom", fontsize=9, color="#a84b1f")
ax2.set_ylabel("老龄化率（%）", color="#a84b1f")
ax2.set_ylim(d["老龄化率"].min() * 0.82, d["老龄化率"].max() * 1.12)
ax2.tick_params(axis="y", colors="#a84b1f")
for x, v in zip(d["区"], d["老龄化率"]):
    ax2.annotate(f"{v:.1f}%", (x, v), textcoords="offset points", xytext=(0, 9),
                 ha="center", fontsize=8, color="#a84b1f",
                 bbox=dict(boxstyle="round,pad=0.12", fc="white", ec="none", alpha=0.75))

ax1.set_title("图1  天津各区老年人口规模与老龄化率（2020 七普）", fontsize=15, pad=14)
fig.text(0.01, 0.01,
         "数据来源：天津市第七次全国人口普查（2020）。老龄化率 = 60 岁及以上人口 ÷ 常住人口。",
         fontsize=8.5, color="#7F8C8D")
fig.tight_layout()
fig.savefig(FIG / "天津_图1_老年人口与老龄化率.png", dpi=200, bbox_inches="tight")
plt.close(fig)
print("[绘图] 天津_图1_老年人口与老龄化率.png")

# ---------------------------------------------------------------------------
# 3. 图2：每万老人设施配置 + 便利指数
# ---------------------------------------------------------------------------
d = df.sort_values("便利指数", ascending=False).reset_index(drop=True)
cols = ["每万老人_助餐点", "每万老人_日间照料", "每万老人_卫生床位"]
labels = ["助餐点", "日间照料", "卫生床位"]
heat = d[cols].values
heat_norm = (heat - heat.min(axis=0)) / np.where(
    (heat.max(axis=0) - heat.min(axis=0)) == 0, 1, heat.max(axis=0) - heat.min(axis=0))

fig = plt.figure(figsize=(13.4, 7.4))
gs = fig.add_gridspec(1, 2, width_ratios=[1.55, 1.0], wspace=0.42)

ax = fig.add_subplot(gs[0])
im = ax.imshow(heat_norm, cmap="YlOrRd", aspect="auto", vmin=0, vmax=1)
ax.set_xticks(range(len(labels)), labels, fontsize=10)
ax.set_yticks(range(len(d)), d["区"], fontsize=9.5)
ax.set_title("每万名老人拥有设施数（个 / 张）", fontsize=12, pad=10)
for i in range(heat.shape[0]):
    for j in range(heat.shape[1]):
        val = heat[i, j]
        ax.text(j, i, f"{val:.1f}", ha="center", va="center", fontsize=8.5,
                color="white" if heat_norm[i, j] > 0.62 else "#333333")
ax.set_xticks(np.arange(-0.5, len(labels), 1), minor=True)
ax.set_yticks(np.arange(-0.5, len(d), 1), minor=True)
ax.grid(which="minor", color="white", linewidth=2)
ax.tick_params(which="minor", length=0)
cbar = fig.colorbar(im, ax=ax, fraction=0.035, pad=0.02)
cbar.set_label("同列内相对水平", fontsize=9)
cbar.set_ticks([0, 0.5, 1])
cbar.set_ticklabels(["低", "中", "高"])

ax2 = fig.add_subplot(gs[1])
rank = d.sort_values("便利指数")
bar_colors = [plt.cm.RdYlGn(0.15 + 0.7 * v / 100) for v in rank["便利指数"]]
bars = ax2.barh(rank["区"], rank["便利指数"], color=bar_colors, edgecolor="white", height=0.64)
ax2.axvline(d["便利指数"].mean(), color="#555555", linestyle="--", linewidth=1)
ax2.annotate(f"均值 {d['便利指数'].mean():.1f}", xy=(d["便利指数"].mean(), 0),
             xycoords=("data", "axes fraction"), xytext=(3, 6),
             textcoords="offset points", fontsize=8.5, color="#555555")
ax2.set_xlim(0, 105)
ax2.set_xlabel("综合便利指数（0-100）")
ax2.set_title("社区养老设施综合便利指数", fontsize=12, pad=10)
ax2.grid(axis="x", linestyle=":", alpha=0.45)
for b, v in zip(bars, rank["便利指数"]):
    ax2.text(v + 1.5, b.get_y() + b.get_height() / 2, f"{v:.1f}",
             va="center", fontsize=8.5, color="#333333")

fig.suptitle("图2  天津各区社区养老设施配置与综合便利指数", fontsize=15, y=0.98)
fig.text(0.01, 0.01,
         "注：颜色为各列内相对水平，格内为实际值；默认权重 助餐 0.40、日间照料 0.35、卫生床位 0.25。"
         "助餐/日照为 2025 名单逐行统计，卫生床位为 2024 年。",
         fontsize=8.3, color="#7F8C8D")
fig.tight_layout(rect=[0, 0.03, 1, 0.95])
fig.savefig(FIG / "天津_图2_设施配置与便利指数.png", dpi=200, bbox_inches="tight")
plt.close(fig)
print("[绘图] 天津_图2_设施配置与便利指数.png")

# ---------------------------------------------------------------------------
# 4. 图3：老龄化 vs 日间照料
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(10.6, 7.2))
sizes = df["2020_60岁及以上"] / 10000 * 10
sc = ax.scatter(df["老龄化率"], df["每万老人_日间照料"], s=sizes,
                c=df["便利指数"], cmap="RdYlGn", vmin=0, vmax=100,
                edgecolor="white", linewidth=1, alpha=0.92, zorder=3)
texts = []
for _, row in df.iterrows():
    texts.append(ax.annotate(row["区"], (row["老龄化率"], row["每万老人_日间照料"]),
                             fontsize=9, color="#2C3E50", zorder=4))
adjust_text(texts, ax=ax, arrowprops=dict(arrowstyle="-", color="#95A5A6", lw=0.7, alpha=0.7),
            expand=(1.1, 1.25))

x_mean = df["老龄化率"].mean()
y_mean = df["每万老人_日间照料"].mean()
ax.axvline(x_mean, color="#7F8C8D", linestyle="--", linewidth=1)
ax.axhline(y_mean, color="#7F8C8D", linestyle="--", linewidth=1)
r = np.corrcoef(df["老龄化率"], df["每万老人_日间照料"])[0, 1]
ax.text(0.02, 0.96, f"相关系数 r = {r:.2f}", transform=ax.transAxes, va="top",
        fontsize=10, bbox=dict(boxstyle="round,pad=0.35", fc="white", ec="#BDC3C7", alpha=0.9))
ax.text(0.02, 0.96, "低老龄化 / 高日照", transform=ax.transAxes, va="top",
        fontsize=10, color="#0b5b4e", fontweight="bold")
ax.text(0.98, 0.14, "高老龄化 / 低日照", transform=ax.transAxes, va="bottom", ha="right",
        fontsize=10, color="#a84b1f", fontweight="bold")

ax.set_xlabel("老龄化率（%，2020 七普）")
ax.set_ylabel("每万名老人日间照料中心（个）")
ax.set_title("图3  各区老龄化程度与日间照料供给", fontsize=15, pad=14)
ax.grid(linestyle=":", alpha=0.45)
cbar = fig.colorbar(sc, ax=ax, fraction=0.035, pad=0.02)
cbar.set_label("综合便利指数", fontsize=9)
fig.text(0.01, 0.01,
         "注：气泡大小 = 60 岁及以上人口；虚线为 16 区均值。日间照料为 2025 年各区清单逐行统计。",
         fontsize=8.5, color="#7F8C8D")
fig.tight_layout()
fig.savefig(FIG / "天津_图3_老龄化与日间照料.png", dpi=200, bbox_inches="tight")
plt.close(fig)
print("[绘图] 天津_图3_老龄化与日间照料.png")

# ---------------------------------------------------------------------------
# 5. 摘要
# ---------------------------------------------------------------------------
oldest = df.loc[df["老龄化率"].idxmax()]
youngest = df.loc[df["老龄化率"].idxmin()]
best = df.loc[df["便利指数"].idxmax()]
worst = df.loc[df["便利指数"].idxmin()]
meal_low = df.loc[df["每万老人_助餐点"].idxmin()]
day_low = df.loc[df["每万老人_日间照料"].idxmin()]
day_high = df.loc[df["每万老人_日间照料"].idxmax()]

summary = f"""# 天津数据分析摘要（自动生成）

## 一、数据口径
- 老年人口：2020 年第七次全国人口普查，16 区常住人口；全市 60 岁及以上 **{df['2020_60岁及以上'].sum()/10000:.2f} 万人**，
  老龄化率 **{avg:.1f}%**。
- 设施：助餐点 **{df['助餐点'].sum():,} 个**（2025 年区级名单逐行统计，含蓟州参照估算；官方口径 1,852 家）、
  日间照料中心 **{df['日间照料中心'].sum():,} 个**（2025 年 11 月各区清单；2024 全市 1,471 个）、
  卫生机构床位 **{df['卫生机构床位'].sum():,} 张**（2024 年）。
- 2024 年末户籍人口 **{df['2024户籍人口_万人'].sum():.1f} 万人**。

## 二、主要发现
1. **老龄化最深的是河北区**：{oldest['区']}老龄化率 **{oldest['老龄化率']:.1f}%**，
   {youngest['区']}最低（{youngest['老龄化率']:.1f}%），相差 {oldest['老龄化率'] - youngest['老龄化率']:.1f} 个百分点。
2. **助餐密度差异大**：{meal_low['区']}每万老人仅 **{meal_low['每万老人_助餐点']:.1f} 个**助餐点，
   和平区 **{df.loc[df['每万老人_助餐点'].idxmax(), '每万老人_助餐点']:.1f} 个**；
   名单口径不完全一致，需结合“15 分钟生活圈”进一步核实。
3. **日间照料与老龄化并不匹配**：{day_low['区']}每万老人仅 **{day_low['每万老人_日间照料']:.1f} 个**，
   {day_high['区']} **{day_high['每万老人_日间照料']:.1f} 个**；老龄化率与日照密度的相关系数 **r = {r:.2f}**。
4. **综合便利指数**：{best['区']}最高（{best['便利指数']:.1f}），{worst['区']}最低（{worst['便利指数']:.1f}）；
   默认权重为助餐 0.40、日间照料 0.35、卫生床位 0.25。

## 三、建议
- 河北、红桥、河东等老龄化深、日照密度低的区，优先补社区日间照料中心；
- 河西、南开等助餐名单密度偏低的区，先核对名单完整性，再按街道补点；
- 用“助餐 + 日照 + 卫生床位”三张网做联合布局，避免单类设施重复建设。

## 四、局限
- 老年人口为 2020 年普查，设施为 2024—2025 年，存在时间错位；
- 助餐/日照名单为图片/PDF 逐行统计，部分区口径可能包含村居级点位，横向比较需谨慎；
- 蓟州助餐点为参照周边涉农区估算，不是官方逐点名单。

> 数据来源：天津市统计局《2025 天津统计年鉴》、天津市第七次全国人口普查、天津市民政局公开名单。
"""
(BASE / "outputs" / "天津数据分析摘要.md").write_text(summary, encoding="utf-8")

print("\n[完成] 天津版 3 张图、1 张表、分析摘要已生成")
print(f"  图片：{FIG}")
print(f"  表格：{TAB / '天津_各区老年人口与设施.csv'}")
print(f"  摘要：{BASE / 'outputs' / '天津数据分析摘要.md'}")
