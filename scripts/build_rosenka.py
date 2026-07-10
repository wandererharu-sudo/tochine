# -*- coding: utf-8 -*-
"""国税庁 路線価図サイトから「町名→図面番号」全国索引を生成する。

出力: public/rosenka/{県コード}.json
  {
    "year": "r08",
    "base": "https://www.rosenka.nta.go.jp/main_r08/nagoya/aichi/prices/",
    "cities": {
      "常滑市": {"page": "f34504fr.htm", "towns": {"青海1": ["67208"], ...}},
      ...
    }
  }
URL組み立て（フロント側）:
  図面PDF   = base + "pdf/" + 番号 + ".pdf"
  図面HTML  = base + "html/" + 番号 + "f.htm"
  市区町村頁 = base + page

使い方:
  python scripts/build_rosenka.py             # 全国47県（約30分）
  python scripts/build_rosenka.py --pref 23   # 愛知県のみ
  python scripts/build_rosenka.py --year r08  # 年版指定（既定 r08）

年次更新: 毎年7月上旬に新年版公開。--year を上げて再実行するだけ。
"""
import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "rosenka"
TOP = "https://www.rosenka.nta.go.jp/"
UA = {"User-Agent": "Mozilla/5.0 (tochine index builder; personal use)"}
WAIT = 0.4  # リクエスト間隔（秒）

# 県スラッグ → JIS都道府県コード（国税庁サイトは訓令式ローマ字が混在。r08実サイトの実リスト）
PREF_SLUG = {
    "hokkaido": "01", "aomori": "02", "iwate": "03", "miyagi": "04",
    "akita": "05", "yamagata": "06", "fukusima": "07", "ibaraki": "08",
    "tochigi": "09", "gunma": "10", "saitama": "11",
    "chiba": "12", "tokyo": "13", "kanagawa": "14", "niigata": "15",
    "toyama": "16", "isikawa": "17", "fukui": "18", "yamanasi": "19",
    "nagano": "20", "gifu": "21", "sizuoka": "22", "aichi": "23",
    "mie": "24", "shiga": "25", "kyoto": "26", "osaka": "27",
    "hyogo": "28", "nara": "29", "wakayama": "30", "tottori": "31",
    "simane": "32", "okayama": "33", "hirosima": "34", "yamaguti": "35",
    "tokusima": "36", "kagawa": "37", "ehime": "38", "koti": "39",
    "fukuoka": "40", "saga": "41", "nagasaki": "42", "kumamoto": "43",
    "oita": "44", "miyazaki": "45", "kagosima": "46", "okinawa": "47",
}


def fetch(url, retries=3):
    for i in range(retries):
        try:
            time.sleep(WAIT)
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("cp932", errors="replace")
        except Exception as e:
            if i == retries - 1:
                raise
            print(f"  retry {i+1}: {url} ({e})", flush=True)
            time.sleep(2 * (i + 1))


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).replace("　", "").strip()


def parse_pref_links(year):
    """トップページから {県コード: (国税局slug, 県slug)} を得る"""
    html = fetch(TOP)
    prefs = {}
    for kyoku, slug in re.findall(
            rf"main_{year}/([a-z]+)/([a-z0-9_]+)/pref_frm\.htm", html):
        code = PREF_SLUG.get(slug)
        if not code:
            print(f"!! 未知の県スラッグ: {kyoku}/{slug}（PREF_SLUGに追加要）")
            continue
        prefs[code] = (kyoku, slug)
    return prefs


def parse_city_list(base):
    """city_frm.htm から [(市区町村名, ○XXXXXfr.htm)]
    接頭文字は国税局ごとに異なる（名古屋局=f、仙台局=b 等）"""
    html = fetch(base + "city_frm.htm")
    return re.findall(r'<a[^>]*href="([a-z]\d+fr\.htm)"[^>]*>([^<]+)</a>', html)


def parse_towns(base, page):
    """市区町村ページから {町名: [図面番号,...]}
    テーブル行 = [五十音見出し(任意), 町名, 番号リンク...] の構造。
    最初の番号リンクセルの直前セルを町名とみなす。"""
    html = fetch(base + page)
    towns = {}
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
        name = None
        nums = []
        for c in cells:
            m = re.findall(r'href="html/(\d+)f?\.htm"', c)
            if m:
                nums.extend(m)
            elif not nums:
                t = strip_tags(c)
                if t:
                    name = t  # 番号が出る前の最後の非空セル
        if name and nums:
            towns.setdefault(name, [])
            for n in nums:
                if n not in towns[name]:
                    towns[name].append(n)
    return towns


def build_pref(code, kyoku, slug, year):
    base = f"{TOP}main_{year}/{kyoku}/{slug}/prices/"
    cities = {}
    try:
        city_links = parse_city_list(base)
    except Exception as e:
        print(f"[{code}] city_frm.htm 取得失敗: {e}")
        return None
    print(f"[{code}] {slug}: {len(city_links)} 市区町村", flush=True)
    for page, name in city_links:
        name = strip_tags(name)
        try:
            towns = parse_towns(base, page)
        except Exception as e:
            print(f"  {name} 失敗: {e}", flush=True)
            towns = {}
        cities[name] = {"page": page, "towns": towns}
    return {"year": year, "base": base, "cities": cities}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", default="r08")
    ap.add_argument("--pref", default=None, help="県コード指定（例: 23)")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    prefs = parse_pref_links(args.year)
    print(f"県リンク {len(prefs)} 件", flush=True)
    if len(prefs) < 47 and not args.pref:
        print("!! 47県そろっていません。PREF_SLUG要確認", flush=True)

    targets = sorted(prefs) if not args.pref else [args.pref.zfill(2)]
    t0 = time.time()
    for code in targets:
        if code not in prefs:
            print(f"[{code}] トップページにリンクなし・スキップ")
            continue
        out = OUT_DIR / f"{code}.json"
        kyoku, slug = prefs[code]
        data = build_pref(code, kyoku, slug, args.year)
        if data:
            out.write_text(
                json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8")
            n_towns = sum(len(c["towns"]) for c in data["cities"].values())
            print(f"[{code}] 保存 {out.name}: {len(data['cities'])}市区町村 "
                  f"{n_towns}町 {out.stat().st_size//1024}KB "
                  f"(経過{int(time.time()-t0)}s)", flush=True)
    print("完了", flush=True)


if __name__ == "__main__":
    main()
