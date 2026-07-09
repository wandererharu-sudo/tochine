# -*- coding: utf-8 -*-
"""国土数値情報 L01（地価公示）/ L02（地価調査）→ 都道府県別JSON変換
年1回実行する。使い方:
    python build_data.py            # raw/ に zip が無ければダウンロードして変換
    python build_data.py --force    # zip を再ダウンロード
新年版に更新するときは attr_maps.py に年版を追加してから
下の DATASETS を書き換える（README の年次更新手順も参照）。
"""
import io
import json
import sys
import zipfile
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.request import urlopen

from attr_maps import ATTR_MAPS, USE_NAMES, EXCLUDED_USE

DATASETS = ["L01-2026", "L02-2025"]  # ← 年次更新時はここを変える

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR / "raw"
OUT_DIR = SCRIPT_DIR.parent / "public" / "data"

# 日本の座標範囲（検証用）
LAT_RANGE = (20.0, 46.0)
LON_RANGE = (122.0, 154.0)
PRICE_WARN = 50_000_000  # 円/㎡ これを超えたら警告（銀座でも6千万弱）


def download(url: str, dest: Path, force: bool) -> None:
    if dest.exists() and not force:
        print(f"  スキップ（既存）: {dest.name}")
        return
    print(f"  ダウンロード中: {url}")
    with urlopen(url) as res:
        data = res.read()
    dest.write_bytes(data)
    print(f"  保存: {dest.name} ({len(data):,} bytes)")


def point_number(name: str, use_code: str, seq: str, source: str) -> str:
    """公示・調査の慣用表記の地点番号を組み立てる（例: 常滑-1, 常滑5-2, 常滑(県)-1）"""
    prefix = name + ("(県)" if source == "C" else "")
    use_part = "" if use_code == "000" else str(int(use_code))
    return f"{prefix}{use_part}-{int(seq)}"


def convert(dataset_key: str) -> tuple[list[dict], int, Counter]:
    m = ATTR_MAPS[dataset_key]
    zip_path = RAW_DIR / m["zip_name"]
    with zipfile.ZipFile(zip_path) as z:
        geojson = json.loads(z.read(m["geojson_member"]))
    feats = geojson["features"]

    points = []
    excluded = Counter()
    year = None
    for f in feats:
        p = f["properties"]
        use_code = str(p[m["use_code"]])
        if use_code in EXCLUDED_USE:
            excluded[EXCLUDED_USE[use_code]] += 1
            continue
        if use_code not in USE_NAMES:
            raise SystemExit(f"未知の用途区分コード {use_code!r} in {dataset_key}: {p}")
        lon, lat = f["geometry"]["coordinates"]
        price = int(p[m["price"]])
        if price <= 0:
            raise SystemExit(f"価格が不正 {price} in {dataset_key}: {p}")
        if price > PRICE_WARN:
            print(f"  警告: 高額地点 {price:,}円/㎡ {p[m['address']]}")
        year = int(p[m["year"]])
        points.append({
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "p": price,
            "u": USE_NAMES[use_code],
            "a": str(p[m["address"]]),
            "n": point_number(str(p[m["name"]]), use_code, str(p[m["seq"]]), m["source"]),
            "s": m["source"],
            "c": str(p[m["admin_code"]])[:2],  # 都道府県コード
        })

    lo, hi = m["expected_count"]
    if not (lo <= len(feats) <= hi):
        raise SystemExit(f"{dataset_key}: 総地点数 {len(feats)} が期待範囲 {lo}〜{hi} 外")
    for pt in points:
        if not (LAT_RANGE[0] <= pt["lat"] <= LAT_RANGE[1] and LON_RANGE[0] <= pt["lon"] <= LON_RANGE[1]):
            raise SystemExit(f"{dataset_key}: 座標が日本の範囲外 {pt}")
    print(f"  {dataset_key}: 全{len(feats):,}地点 → 採用{len(points):,} / 除外{dict(excluded)}")
    return points, year, excluded


def spot_check_tokoname(by_pref: dict) -> None:
    """愛知県に常滑の地点が妥当な価格帯で存在するか"""
    aichi = by_pref.get("23", [])
    tokoname = [p for p in aichi if "常滑" in p["a"] and p["u"] == "住宅地"]
    if not tokoname:
        raise SystemExit("検証失敗: 愛知県に常滑の住宅地地点がありません")
    for p in tokoname:
        if not (10_000 <= p["p"] <= 300_000):
            raise SystemExit(f"検証失敗: 常滑の価格が想定帯外 {p}")
    print(f"  スポットチェックOK: 常滑住宅地 {len(tokoname)}地点 "
          f"({min(p['p'] for p in tokoname):,}〜{max(p['p'] for p in tokoname):,}円/㎡)")


def main() -> None:
    force = "--force" in sys.argv
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    all_points = []
    years = {}
    for key in DATASETS:
        m = ATTR_MAPS[key]
        print(f"[{key}]")
        download(m["zip_url"], RAW_DIR / m["zip_name"], force)
        points, year, _ = convert(key)
        years["koji_year" if m["source"] == "K" else "chosa_year"] = year
        all_points.extend(points)

    by_pref = {}
    for pt in all_points:
        code = pt.pop("c")
        by_pref.setdefault(code, []).append(pt)

    spot_check_tokoname(by_pref)

    counts = {}
    total_bytes = 0
    for code in sorted(by_pref):
        out = {"pref": code, "points": by_pref[code]}
        path = OUT_DIR / f"{code}.json"
        text = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
        path.write_text(text, encoding="utf-8")
        counts[code] = len(by_pref[code])
        total_bytes += len(text.encode("utf-8"))

    index = {
        **years,
        "generated": date.today().isoformat(),
        "total": sum(counts.values()),
        "counts": counts,
        "source": "国土数値情報（地価公示データL01・都道府県地価調査データL02）（国土交通省）を加工して作成（CC BY 4.0）",
    }
    (OUT_DIR / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"完了: {len(counts)}都道府県 / 計{index['total']:,}地点 / 約{total_bytes/1024/1024:.1f}MB")
    print(f"出力先: {OUT_DIR}")


if __name__ == "__main__":
    main()
