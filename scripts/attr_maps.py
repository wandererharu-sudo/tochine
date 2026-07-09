# 国土数値情報 L01（地価公示）/ L02（都道府県地価調査）の属性コード表
# 年版によって属性番号が変わることがあるため、年版ごとにここで管理する。
# 新年版を追加するときは、ダウンロードした GeoJSON の properties を目視確認してから追記すること。

ATTR_MAPS = {
    # 地価公示 2026年版（2026-07-10 実データで確認済み）
    "L01-2026": {
        "zip_url": "https://nlftp.mlit.go.jp/ksj/gml/data/L01/L01-26/L01-26_GML.zip",
        "zip_name": "L01-26_GML.zip",
        "geojson_member": "L01-26_GML/L01-26.geojson",
        "admin_code": "L01_001",   # 行政区域コード（5桁、先頭2桁が都道府県）
        "use_code": "L01_002",     # 用途区分コード
        "seq": "L01_003",          # 用途区分内の連番
        "year": "L01_007",         # 価格の年
        "price": "L01_008",        # 当年価格（円/㎡）
        "name": "L01_024",         # 地点名（例: 常滑）
        "address": "L01_025",      # 所在及び地番
        "source": "K",             # K=地価公示
        "expected_count": (24000, 28000),
    },
    # 都道府県地価調査 2025年版（2026-07-10 実データで確認済み）
    "L02-2025": {
        "zip_url": "https://nlftp.mlit.go.jp/ksj/gml/data/L02/L02-25/L02-25_GML.zip",
        "zip_name": "L02-25_GML.zip",
        "geojson_member": "L02-25.geojson",
        "admin_code": "L02_020",
        "use_code": "L02_001",
        "seq": "L02_002",
        "year": "L02_005",
        "price": "L02_006",
        "name": "L02_021",
        "address": "L02_022",
        "source": "C",             # C=地価調査
        "expected_count": (19000, 23000),
    },
}

# 用途区分コード → 表示名（reinfolib の useCategoryCode と同体系）
# 宅地系のみ採用。林地（013・020）は円/10a 単価等で換算式が使えないため除外する。
USE_NAMES = {
    "000": "住宅地",
    "003": "宅地見込地",
    "005": "商業地",
    "007": "準工業地",
    "009": "工業地",
    "010": "調整区域内宅地",
}
EXCLUDED_USE = {"013": "調整区域内林地", "020": "林地"}
