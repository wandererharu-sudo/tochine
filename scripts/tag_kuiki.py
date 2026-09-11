# -*- coding: utf-8 -*-
"""公示・基準地点（public/data/{県}.json）に区域区分コード k を付ける
使い方:
    python tag_kuiki.py          # public/youto/index.json にある県すべて
    python tag_kuiki.py 23 21    # 指定県だけ
k: 2=市街化区域 / 3=市街化調整区域 / 1=非線引き（都市計画区域のみ） / 0=都市計画区域外
判定元は public/youto/{県}/kuiki.json（国土数値情報 A09 都市地域 2006年度）。
build_data.py（地価データ再生成）と build_youto.py（県追加）の最後からも呼ばれる。
"""
import json
import sys
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"


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


def kuiki_code(lat, lon, feats):
    # A09 は 都市計画区域(1) ⊃ 市街化区域(2) / 市街化調整区域(3) の重ね合わせ
    codes = {str(f["c"]) for f in feats if in_feat(lon, lat, f)}
    if "3" in codes:
        return 3
    if "2" in codes:
        return 2
    if "1" in codes:
        return 1
    return 0


def tag_pref(pref):
    kp = PUBLIC / "youto" / pref / "kuiki.json"
    dp = PUBLIC / "data" / f"{pref}.json"
    if not kp.exists() or not dp.exists():
        print(f"  {pref}: kuiki.json または data がないので省略")
        return
    feats = json.loads(kp.read_text(encoding="utf-8"))
    data = json.loads(dp.read_text(encoding="utf-8"))
    counts = {0: 0, 1: 0, 2: 0, 3: 0}
    for p in data["points"]:
        p["k"] = kuiki_code(p["lat"], p["lon"], feats)
        counts[p["k"]] += 1
    dp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {pref}: 市街化{counts[2]} / 調整{counts[3]} / 非線引き{counts[1]} / 区域外{counts[0]}")


def tag_all(prefs=None):
    if not prefs:
        index = json.loads((PUBLIC / "youto" / "index.json").read_text(encoding="utf-8"))
        prefs = sorted(index.keys())
    print("区域区分コードを地点に付与:", ", ".join(prefs))
    for pref in prefs:
        tag_pref(pref)


if __name__ == "__main__":
    tag_all(sys.argv[1:])
