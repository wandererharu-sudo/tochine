# 愛知の調整区域 売出し事例（aichi.md）を座標化し、公示・基準地点との比率を出す
#  R_app : アプリが今基準にしている「最寄りの住宅地点（区域問わず）」との比率
#  R_shi : 最寄りの「市街化区域内」住宅地点との比率
#  R_cho : 最寄りの「調整区域内」住宅地点との比率
import json, math, re, statistics as st, time, urllib.parse, urllib.request

BASE = r"C:\Users\wande\tochine\public"
pts = json.load(open(f"{BASE}/data/23.json", encoding="utf-8"))["points"]
kuiki = json.load(open(f"{BASE}/youto/23/kuiki.json", encoding="utf-8"))

CAT = {1:'A',2:'A',3:'A',4:'A',5:'C',6:'A',7:'A',8:'B',9:'B',10:'A',11:'A',12:'A',13:'A',14:'A',
       15:'A',16:'A',17:'A',18:'A',19:'A',20:'B',21:'B',22:'A',23:'A',24:'C',25:'A',26:'A',27:'A',
       28:'A',29:'C',30:'A',31:'B',32:'B',33:'A',34:'C',35:'C',36:'A',37:'C',38:'C',39:'A',40:'C',
       41:'C',42:'C',43:'C',44:'A'}
OLD = {38, 42, 43}  # 2023〜2024年の古い掲載


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
        if in_ring(x, y, rings[0]) and not any(in_ring(x, y, r) for r in rings[1:]):
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
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dl = math.radians(b[1] - a[1])
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def geocode(addr):
    url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + urllib.parse.quote(addr)
    with urllib.request.urlopen(url, timeout=20) as r:
        j = json.load(r)
    if not j:
        return None
    lon, lat = j[0]["geometry"]["coordinates"]
    return lat, lon, j[0]["properties"]["title"]


def clean(addr):
    a = re.sub(r"（.*?）", "", addr)
    a = re.sub(r"\s*[A-ZＡ-Ｚ]区画|\s*\d+号地", "", a)
    a = re.sub(r"\d+番\d*.*$", "", a)
    a = re.sub(r"\d+(-\d+)+$", "", a)
    return "愛知県" + a.strip()


# 事例の読み込み
rows = []
for line in open("aichi.md", encoding="utf-8"):
    m = re.match(r"\| (\d+) \| ([^|]+)\| ([^|]+)\| ([^|]+)\| ([\d,]+)", line)
    if not m:
        continue
    no = int(m.group(1))
    ll = re.search(r"緯度経度 ([\d.]+), ([\d.]+)", line)
    rows.append({"no": no, "addr": m.group(2).strip(), "unit": int(m.group(5).replace(",", "")),
                 "ll": (float(ll.group(1)), float(ll.group(2))) if ll else None})

# 住宅地点の区域分類
res = [p for p in pts if p["u"] == "住宅地"]
for p in res:
    p["k"] = classify(p["lat"], p["lon"])
shi = [p for p in res if p["k"] == "市街化"]
cho = [p for p in res if p["k"] == "調整"]

out = []
for r in rows:
    if r["ll"]:
        lat, lon = r["ll"]
        gtitle = "（物件ページの緯度経度）"
    else:
        g = None
        q = clean(r["addr"])
        for cand in (q, re.sub(r"字.*$", "", q), re.sub(r"(大字)?[^市町村郡]*$", "", q)):
            try:
                g = geocode(cand)
            except Exception:
                g = None
            time.sleep(0.3)
            if g:
                break
        if not g:
            print("座標取れず", r["no"], r["addr"])
            continue
        lat, lon, gtitle = g
    here = (lat, lon)
    near_any = min(res, key=lambda p: dist(here, (p["lat"], p["lon"])))
    near_shi = min(shi, key=lambda p: dist(here, (p["lat"], p["lon"])))
    near_cho = min(cho, key=lambda p: dist(here, (p["lat"], p["lon"])))
    d_any = dist(here, (near_any["lat"], near_any["lon"]))
    d_cho = dist(here, (near_cho["lat"], near_cho["lon"]))
    out.append({**r, "lat": lat, "lon": lon, "g": gtitle, "here_k": classify(lat, lon),
                "any_n": near_any["n"], "any_k": near_any["k"], "any_p": near_any["p"], "any_d": d_any,
                "shi_n": near_shi["n"], "shi_p": near_shi["p"],
                "cho_n": near_cho["n"], "cho_p": near_cho["p"], "cho_d": d_cho,
                "cat": CAT[r["no"]]})

json.dump(out, open("aichi_ratio.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def summary(label, vals):
    if not vals:
        return f"| {label} | 0 | - | - | - |"
    q = st.quantiles(vals, n=4) if len(vals) >= 4 else [min(vals), 0, max(vals)]
    return f"| {label} | {len(vals)} | {st.median(vals):.2f} | {q[0]:.2f}〜{q[2]:.2f} | {min(vals):.2f}〜{max(vals):.2f} |"


print("## 愛知 比率集計（古い掲載3件を除く・No.3は公簿単価）\n")
for key, title in (("any", "R_app 売出し÷アプリが今使う最寄り住宅地点"),
                   ("shi", "R_shi 売出し÷最寄りの市街化区域の住宅地点"),
                   ("cho", "R_cho 売出し÷最寄りの調整区域の住宅地点")):
    print(f"### {title}\n")
    print("| 区分 | 件数 | 中央値 | 25〜75% | 最小〜最大 |")
    print("|---|---:|---:|---:|---:|")
    for c, lab in (("A", "A 建築可と明記"), ("B", "B 可否の記載なし"), ("C", "C 不可・農地・要資格")):
        v = [o["unit"] / o[f"{key}_p"] for o in out if o["cat"] == c and o["no"] not in OLD]
        print(summary(lab, v))
    print()

chita = ["常滑", "半田", "知多", "武豊", "美浜", "阿久比", "東浦"]
print("### 知多半島 区分A\n")
print("| 区分 | 件数 | 中央値 | 25〜75% | 最小〜最大 |")
print("|---|---:|---:|---:|---:|")
for key, lab in (("any", "R_app"), ("shi", "R_shi"), ("cho", "R_cho")):
    v = [o["unit"] / o[f"{key}_p"] for o in out if o["cat"] == "A" and any(c in o["addr"] for c in chita)]
    print(summary(lab, v))
print()
print("アプリの最寄り地点が調整区域だった件数:", sum(1 for o in out if o["any_k"] == "調整"), "/", len(out))
print("調整区域の最寄り地点までの距離 中央値(m):", round(st.median(o["cho_d"] for o in out)))
print("事例地点の区域判定（A09）:", {k: sum(1 for o in out if o["here_k"] == k) for k in {o["here_k"] for o in out}})
print()
print("| No | 区分 | 所在地 | ㎡単価 | 最寄り(区域) | R_app | 最寄り市街化 | R_shi | 最寄り調整(距離) | R_cho |")
print("|---:|---|---|---:|---|---:|---|---:|---|---:|")
for o in sorted(out, key=lambda o: o["no"]):
    old = "（古）" if o["no"] in OLD else ""
    print(f"| {o['no']}{old} | {o['cat']} | {o['addr'][:18]} | {o['unit']:,} | {o['any_n']}({o['any_k']}) {o['any_p']:,} | "
          f"{o['unit']/o['any_p']:.2f} | {o['shi_n']} {o['shi_p']:,} | {o['unit']/o['shi_p']:.2f} | "
          f"{o['cho_n']} {o['cho_p']:,} ({o['cho_d']/1000:.1f}km) | {o['unit']/o['cho_p']:.2f} |")
