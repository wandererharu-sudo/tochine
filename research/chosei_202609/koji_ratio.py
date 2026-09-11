# 愛知の公示・基準地点を A09 区域区分で分類し、調整区域の住宅地点 ÷ 最寄り市街化住宅地点 の比率を出す
import json, math, statistics
from collections import defaultdict

BASE = r"C:\Users\wande\tochine\public"
pts = json.load(open(f"{BASE}/data/23.json", encoding="utf-8"))["points"]
kuiki = json.load(open(f"{BASE}/youto/23/kuiki.json", encoding="utf-8"))


def in_ring(x, y, ring):
    inside = False
    n = len(ring) // 2
    j = n - 1
    for i in range(n):
        xi, yi = ring[2 * i], ring[2 * i + 1]
        xj, yj = ring[2 * j], ring[2 * j + 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def in_feat(x, y, f):
    minx, miny, maxx, maxy = f["b"]
    if x < minx or x > maxx or y < miny or y > maxy:
        return False
    for rings in f["p"]:
        if not in_ring(x, y, rings[0]):
            continue
        if any(in_ring(x, y, r) for r in rings[1:]):
            continue
        return True
    return False


def classify(lat, lon):
    codes = {str(f["c"]) for f in kuiki if in_feat(lon, lat, f)}
    if "3" in codes:
        return "調整"
    if "2" in codes:
        return "市街化"
    if "1" in codes:
        return "非線引き"
    return "区域外"


def dist(a, b):
    R = 6371000
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp = p2 - p1
    dl = math.radians(b["lon"] - a["lon"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


res = [p for p in pts if p["u"] == "住宅地"]
for p in res:
    p["k"] = classify(p["lat"], p["lon"])

cnt = defaultdict(int)
for p in res:
    cnt[p["k"]] += 1
print("住宅地点の区域内訳:", dict(cnt))

shigai = [p for p in res if p["k"] == "市街化"]
rows = []
for p in res:
    if p["k"] != "調整":
        continue
    near = sorted(shigai, key=lambda q: dist(p, q))[:3]
    near = [q for q in near if dist(p, q) <= 3000] or near[:1]
    ref = statistics.mean(q["p"] for q in near)
    rows.append((p["a"], p["n"], p["p"], round(ref), p["p"] / ref, round(dist(p, near[0]))))

rows.sort(key=lambda r: r[4])
print(f"調整区域の住宅地点: {len(rows)}件（最寄り3km内の市街化住宅地点 最大3件の平均と比較）")
ratios = [r[4] for r in rows]
print(f"比率 中央値 {statistics.median(ratios):.2f} / 平均 {statistics.mean(ratios):.2f} / 最小 {min(ratios):.2f} / 最大 {max(ratios):.2f}")
q = statistics.quantiles(ratios, n=4)
print(f"四分位: 25% {q[0]:.2f} / 75% {q[2]:.2f}")
print()
print("| 所在地 | 地点 | 調整区域 円/㎡ | 近隣市街化 円/㎡ | 比率 | 最寄り距離m |")
print("|---|---|---:|---:|---:|---:|")
for r in rows:
    print(f"| {r[0]} | {r[1]} | {r[2]:,} | {r[3]:,} | {r[4]:.2f} | {r[5]:,} |")
