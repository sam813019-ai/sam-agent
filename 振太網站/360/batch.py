#!/usr/bin/env python3
import convert, time
# (zip 前綴, slug) — 排除：料桶翻料機(已轉)、羅拉(兩軸)已上線、階梯式送料機暫緩
JOBS = [
    ("升降式自動定量上料機", "elevator-conveyor"),
    ("填充式上料機", "filling-feeder"),
    ("磁力式上料機", "magnetic-feeder"),
    ("提升機+兩段式補料", "lifter-two-stage"),
    ("平送式補料桶", "linear-hopper"),
    ("連接式補料桶", "connectable-hopper"),
    ("偏心馬達補料桶", "eccentric-hopper"),
    ("平送式鐵屑油水分離機", "linear-scrap-sep"),
    ("磁力式鐵屑油水分離機", "magnetic-scrap-sep"),
    ("離心鐵屑分離機", "centrifugal-scrap-sep"),
    ("羅拉篩選機(四軸)", "roller-4axis"),
    ("渦電流", "eddy-current"),
    ("隔音箱", "soundproof-case"),
    ("Jl-0", "jl-0"),
    ("ML-2", "ml-2"),
    ("ML-3", "ml-3"),
    ("ML-8", "ml-8"),
    ("STL-6", "stl-6"),
    ("STL-12", "stl-12"),
    ("攪直機", "straightening"),
]
t0 = time.time()
fails = []
for i, (kw, slug) in enumerate(JOBS, 1):
    print(f"=== [{i}/{len(JOBS)}] {kw} → {slug} ===", flush=True)
    if not convert.convert(kw, slug):
        fails.append(slug)
print(f"\n全部完成，耗時 {int(time.time()-t0)}s，失敗: {fails or '無'}")
