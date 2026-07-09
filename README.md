# 土地値チェッカー（tochine）

住所を入力すると、土地の**固定資産税評価額・相続税路線価の目安**を表示するWebアプリ。
賃貸事業（築古戸建て投資）の物件検討用。

- 公開URL: https://wandererharu-sudo.github.io/tochine/
- 技術: React 19 + Vite 7 の純静的SPA（サーバ・APIキー不要）
- データ: 国土数値情報（地価公示L01・都道府県地価調査L02）を都道府県別JSONに変換して同梱
- 住所検索: 国土地理院API（キー不要・CORS対応）

## 仕組み

1. 住所 → 国土地理院APIで緯度経度
2. 都道府県コード判定 → `public/data/{01..47}.json` を遅延fetch
3. ハバースイン距離で最寄り5地点を表示
4. 選択地点の㎡単価 × 0.7 ＝ 固定資産税評価額の目安 ／ × 0.8 ＝ 相続税路線価の目安
5. 面積入力で総額と固定資産税・都市計画税の年額概算（住宅用地特例あり/なし）

すべて**概算**。画地補正なし・宅地のみ有効・時点ズレあり（アプリ内の免責参照）。

## 開発

```bash
npm install
npm run dev     # localhost:5173/tochine/
npm run build
```

## デプロイ（現在は手動・gh-pagesブランチ方式）

```bash
npm run build
cd dist
git init -b gh-pages && git add -A && git commit -m "deploy"
git push https://github.com/wandererharu-sudo/tochine.git gh-pages --force
cd .. && rm -rf dist/.git
```

※本当は `.github/workflows/deploy.yml`（作成済み・未push）で main push → 自動デプロイにしたいが、
gh の OAuth トークンに workflow スコープが無く push できなかった。
`gh auth refresh -h github.com -s workflow` を実行してスコープを足せば、
`git add .github && git commit && git push` で自動デプロイに切り替えられる
（その後 Pages の Source を「GitHub Actions」に変更）。

## 年次更新手順（データの入れ替え）

地価公示は毎年3月下旬、地価調査は毎年9月下旬に新年版が公開される。

1. 国土数値情報のダウンロードページで新年版を確認
   - 地価公示: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-{西暦}.html
   - 地価調査: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L02-{西暦}.html
2. zipをダウンロードして GeoJSON の properties を目視確認し、`scripts/attr_maps.py` に新年版のエントリを追加
   （属性コード L01_XXX は年版で変わることがある。2026年版: 価格=L01_008、所在=L01_025 など既存エントリ参照）
3. `scripts/build_data.py` の先頭 `DATASETS` を新年版キーに書き換え
4. 実行: `python -X utf8 scripts/build_data.py`
   - 件数・座標範囲・常滑スポットチェックが自動検証される。エラーが出たら属性コードを疑う
5. `public/data/` の差分を確認して commit → push（自動デプロイ）

## 換算精度の実測メモ

- 2026-07-10: 常滑市新開町の公示地点「常滑-1」70,600円/㎡ → 固定資産税評価額目安 49,420円/㎡。
  全国地価マップの固定資産税路線価との突合は未実施（確認したらここに記録する）。

## 出典

- 国土数値情報（地価公示データL01・都道府県地価調査データL02）（国土交通省）を加工して作成（CC BY 4.0）
- 住所検索: 国土地理院 AddressSearch API
