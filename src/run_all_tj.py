# -*- coding: utf-8 -*-
"""天津版一键重建：分析 -> 合并点位 -> 质检 -> 网站数据。"""
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
BASE = Path(__file__).resolve().parents[1]
steps = [BASE / "src" / "06_tianjin_analysis.py"]
rest = BASE / "data" / "selected" / "点位_其余区.csv"
if rest.exists():
    steps.append(BASE / "src" / "12_merge_points.py")
else:
    print("[跳过] 未找到点位_其余区.csv，先运行 11_extract_rest.py。")
steps += [BASE / "src" / "13_audit_points.py", BASE / "src" / "07_build_web_tj.py"]

for script in steps:
    if not script.exists():
        print(f"[跳过] 缺少 {script.name}")
        continue
    print(f"\n{'=' * 60}\n[运行] {script.name}\n{'=' * 60}", flush=True)
    r = subprocess.run([sys.executable, str(script)], cwd=BASE)
    if r.returncode:
        sys.exit(r.returncode)
print("\n天津版重建完成。")
