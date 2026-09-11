# -*- coding: utf-8 -*-
"""国土数値情報 A29（用途地域）/ A09（都市地域=区域区分）→ 市町村別の軽量JSONに変換
使い方:
    python build_youto.py            # 愛知(23)
    python build_youto.py 23 24 21   # 複数県
raw/ に zip が無ければダウンロードする。
出力: public/youto/{県コード}/{市町村コード}.json（用途地域）
      public/youto/{県コード}/kuiki.json（区域区分）
      public/youto/index.json（対応県・年版・市町村一覧）
座標は小数5桁（約1m）に丸め、属性は用途コード・名称・建ぺい率・容積率だけ残す。
"""
import io
import json
import sys
import zipfile
from pathlib import Path
from urllib.request import urlopen

import shapefile  # pyshp

A29_VER = "19"  # 2019年度（愛知は A29-19 が最新。A29-2x は 2026-09 時点で 404）
A09_VER = "06"  # 2006年度（A09 はこの版しか無い）

SCRIPT_DIR = Path(__file__).resolve().parent
RAW_DIR = SCRIPT_DIR / "raw"
OUT_DIR = SCRIPT_DIR.parent / "public" / "youto"
PREC = 5

# A09_003 区分コード。愛知の実データで確認（2026-09-11）: 1=都市計画区域（全体・24件）、
# 2=市街化区域（用途地域のある所と一致・173件）、3=市街化調整区域（用途地域なしと一致・49件）
KUIKI_CODE = {"1": "都市計画区域", "2": "市街化区域", "3": "市街化調整区域"}


def download(url: str, dest: Path) -> None:
    if dest.exists():
        return
    print(f"  ダウンロード中: {url}")
    with urlopen(url) as res:
        data = res.read()
    dest.write_bytes(data)
    print(f"  保存: {dest.name} ({len(data):,} bytes)")


def rnd(v: float) -> float:
    return round(v, PREC)


def pack_rings(rings):
    """GeoJSON の ring 列 → [[x,y,x,y,...], ...]（外周→穴）。閉じ点は落とす"""
    out = []
    for ring in rings:
        pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
        flat = []
        last = None
        for x, y in pts:
            p = (rnd(x), rnd(y))
            if p != last:
                flat.extend(p)
                last = p
        if len(flat) >= 6:
            out.append(flat)
    return out


def bbox_of(polys):
    xs = []
    ys = []
    for rings in polys:
        outer = rings[0]
        xs.extend(outer[0::2])
        ys.extend(outer[1::2])
    return [min(xs), min(ys), max(xs), max(ys)]


def convert_a29(pref: str) -> tuple[dict, int]:
    zpath = RAW_DIR / f"A29-{A29_VER}_{pref}_GML.zip"
    download(f"https://nlftp.mlit.go.jp/ksj/gml/data/A29/A29-{A29_VER}/A29-{A29_VER}_{pref}_GML.zip", zpath)
    z = zipfile.ZipFile(zpath)
    munis = {}
    total = 0
    for info in z.infolist():
        if not info.filename.endswith(".geojson"):
            continue
        muni = info.filename.rsplit("_", 1)[-1].split(".")[0]  # A29-19_23216.geojson → 23216
        g = json.loads(z.read(info).decode("utf-8"))
        feats = []
        for ft in g["features"]:
            pr = ft["properties"]
            geom = ft["geometry"]
            if geom is None:
                continue
            raw_polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
            polys = [pack_rings(rings) for rings in raw_polys]
            polys = [p for p in polys if p]
            if not polys:
                continue
            feats.append({
                "c": pr.get("A29_004"),
                "n": pr.get("A29_005"),
                "k": pr.get("A29_006"),  # 建ぺい率 %
                "y": pr.get("A29_007"),  # 容積率 %
                "b": bbox_of(polys),
                "p": polys,
            })
        munis[muni] = feats
        total += len(feats)
    return munis, total


def convert_a09(pref: str) -> list[dict]:
    zpath = RAW_DIR / f"A09-{A09_VER}_{pref}_GML.zip"
    download(f"https://nlftp.mlit.go.jp/ksj/gml/data/A09/A09-{A09_VER}/A09-{A09_VER}_{pref}_GML.zip", zpath)
    z = zipfile.ZipFile(zpath)
    base = next(n[:-4] for n in z.namelist() if n.endswith("UrbanArea.shp"))
    r = shapefile.Reader(
        shp=io.BytesIO(z.read(base + ".shp")),
        shx=io.BytesIO(z.read(base + ".shx")),
        dbf=io.BytesIO(z.read(base + ".dbf")),
        encoding="cp932",
    )
    feats = []
    for sr in r.iterShapeRecords():
        code = str(sr.record[2]).strip()
        shp = sr.shape
        parts = list(shp.parts) + [len(shp.points)]
        rings = [shp.points[parts[i]:parts[i + 1]] for i in range(len(parts) - 1)]
        # shapefile は外周=時計回り・穴=反時計回り。外周ごとに polygon を切る
        polys = []
        cur = None
        for ring in rings:
            area2 = sum(ring[i][0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * ring[i][1]
                        for i in range(len(ring)))
            if area2 < 0 or cur is None:  # 時計回り（面積負）= 外周
                cur = [ring]
                polys.append(cur)
            else:
                cur.append(ring)
        packed = [pack_rings(rs) for rs in polys]
        packed = [p for p in packed if p]
        if not packed:
            continue
        feats.append({"c": code, "n": KUIKI_CODE.get(code, f"区分{code}"), "b": bbox_of(packed), "p": packed})
    return feats


def main(prefs: list[str]) -> None:
    RAW_DIR.mkdir(exist_ok=True)
    index_path = OUT_DIR / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
    for pref in prefs:
        print(f"== 県 {pref}")
        munis, total = convert_a29(pref)
        kuiki = convert_a09(pref)
        out = OUT_DIR / pref
        out.mkdir(parents=True, exist_ok=True)
        size = 0
        muni_bbox = {}
        for muni, feats in munis.items():
            p = out / f"{muni}.json"
            p.write_text(json.dumps(feats, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            size += p.stat().st_size
            if feats:
                bs = [f["b"] for f in feats]
                muni_bbox[muni] = [round(min(b[0] for b in bs), PREC), round(min(b[1] for b in bs), PREC),
                                   round(max(b[2] for b in bs), PREC), round(max(b[3] for b in bs), PREC)]
        kp = out / "kuiki.json"
        kp.write_text(json.dumps(kuiki, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        index[pref] = {
            "youto_year": "20" + A29_VER,
            "kuiki_year": "20" + A09_VER,
            "munis": dict(sorted(muni_bbox.items())),  # {市町村コード: [minLon,minLat,maxLon,maxLat]}
        }
        print(f"  用途地域 {total:,} 区画 / {len(munis)} 市町村 / {size/1e6:.1f} MB"
              f"  区域区分 {len(kuiki)} 区画 / {kp.stat().st_size/1e6:.1f} MB")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    print("index.json 更新:", ", ".join(sorted(index.keys())))

    # 公示・基準地点に区域区分コード k を付ける（調整区域の補正で「調整区域内の地点」を探すため）
    from tag_kuiki import tag_all
    tag_all(prefs)


if __name__ == "__main__":
    main(sys.argv[1:] or ["23"])
