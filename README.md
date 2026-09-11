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
6. 地図（Leaflet＋地理院タイル淡色）に検索地点🚩と最寄り地点マーカーを表示
7. 住所の町丁名を `public/rosenka/{県コード}.json`（scripts/build_rosenka.py が生成）とマッチして、
   国税庁の該当路線価図PDFへ直行リンク（丁目の漢数字↔算用数字は正規化して照合）
8. 「保存リスト」で検討物件を localStorage に保存・比較（面積・販売価格・判定・メモ）

すべて**概算**。画地補正なし・宅地のみ有効・時点ズレあり（アプリ内の免責参照）。

## 開発

```bash
npm install
npm run dev     # localhost:5173/tochine/
npm run build
```

### 使いやすさの改善

- 上部に「相続税路線価ベースの土地評価」を追加。換算値／手入力値の区別、㎡単価・総額・販売価格との比率、任意の70％・80％試算を表示。正式な税務評価や銀行評価とは区別し、保存リストにも路線価目安を表示する。

- 調整区域補正は対象地と参考地点の区域を比較。同じ調整区域なら追加減価なし、市街化区域の参考地点に限り補正し、区域不明時は保留する。旧方式で保存した物件は再表示・保存で更新。
- 「仲介手数料不要」を賃貸収支で切替できる。諸費用を概算連動にすると、購入価格・仲介条件の変更も初期費用へ反映。手入力合計は保持。
- URL取込に `rent`（月額万円）と `brokerage=none` を追加。更新版ブックマークレットは掲載の想定年間収入から月額を換算。登録済みボタンは公開の `bookmarklet.html` から置換が必要。
- `npm run bookmarklet` でソースから配布用リンクと説明ページを同期生成。

- 検索直後に面積・販売価格と土地値の比較を集約。
- 詳細は「土地値を詳しく調べる」「買値を検討する」「貸した場合を見る」で開閉。
- 賃貸初期費用は、買値検討のリフォーム・残置物処分に諸費用を加えて連動。解体費・安全代は含めない。
- 旧保存データの初期費用は手入力として保持。連動に切り替えると内訳から再計算。
- `npm test` で費用連動と保存互換性、`npm run build` で本番ビルドを検証。
- `node scripts/preview.mjs` で実コンポーネントの静的な `確認.html` を上書き生成（架空の表示例、公開対象外）。

## デプロイ（現在は手動・gh-pagesブランチ方式）

```bash
npm run build
cd dist
git init -b gh-pages
git remote add origin https://github.com/wandererharu-sudo/tochine.git
git fetch origin gh-pages && git reset --soft FETCH_HEAD   # 既存履歴に継ぎ足し（force不要）
git add -A && git commit -m "deploy"
git push origin gh-pages
cd .. && rm -rf dist/.git
```

※本当は `.github/workflows/deploy.yml`（作成済み・未push）で main push → 自動デプロイにしたいが、
gh の OAuth トークンに workflow スコープが無く push できなかった。
`gh auth refresh -h github.com -s workflow` を実行してスコープを足せば、
`git add .github && git commit && git push` で自動デプロイに切り替えられる
（その後 Pages の Source を「GitHub Actions」に変更）。

## 市街化調整区域の補正（2026-09-11 見直し）

東海3県の調整区域の売出し事例93件（`research/chosei_202609/`）から、補正を次の方式に変更した（`src/lib/adjustment.js`）。

- 対象地が調整区域なら、3km以内の「調整区域内の住宅地点」を自動で基準にする（一覧・地図にも追加表示）
- 掛け率は「基準地点の区域 × 建築の可否」で決める

| 基準地点 | 建築できる | 不明 | 建築できない（農地・要資格等） |
|---|---:|---:|---:|
| 調整区域内の地点 | ×1.0 | ×0.6 | ×0.25 |
| 市街化区域の地点 | ×0.6 | ×0.4 | ×0.15 |
| 区域が未確認 | ×1.0（保留） | ×1.0（保留） | ×0.25 |

- 地点の区域は `scripts/tag_kuiki.py` が `public/data/{県}.json` の各地点に `k`（2=市街化/3=調整/1=非線引き/0=区域外）として付ける。
  `build_data.py`・`build_youto.py` の最後から自動で呼ばれる。対応県は愛知・岐阜・三重。
- 区域区分は A09（2006年度）なので、その後に開発された団地などが調整区域のまま残っていることがある。

## 最寄り地点の区域区分・用途地域バッジ（2026-09-11）

「近くの公示・基準地点」の各地点にも `lib/youto.js` の判定を当て、調整区域は赤バッジ、
それ以外は「市街化／非線引き／都市計画区域外」バッジ＋用途地域名（分かる場合）を表示する（対応県のみ）。

## 物件ページからの取り込み（URLパラメータ・2026-09-11）

`?addr=住所&price=万円&area=㎡&unit=m2|tsubo&src=元ページURL&memo=任意` で開くと、
起動時に住所を自動検索し、面積・販売価格をプリセットする（保存時は src がメモに入る）。

- ブックマークレット: `scripts/bookmarklet.js`（元）→ `scripts/bookmarklet.min.txt`（javascript: 形式）。
  説明ページは `public/bookmarklet.html`（公開: https://wandererharu-sudo.github.io/tochine/bookmarklet.html ）。
  SUUMO 実ページで「所在地／価格／土地面積」の拾い出しを検証済み（innerText の見出し近傍を正規表現で拾う汎用方式）。
- みこ経由: 物件URLを渡す→Claude が住所・価格・面積を読み取り、上記パラメータ付きURLを開く。

## 用途地域・区域区分の自動判定（2026-09-11・愛知のみ）

`public/youto/{県}/{市町村}.json`（国土数値情報 A29 用途地域 2019年度）と `kuiki.json`（A09 都市地域 2006年度）を同梱し、
`src/lib/youto.js` が旗の座標の包含判定で 区域区分／用途地域／建ぺい率／容積率 を自動入力する（手入力で上書き可）。
A09 の区分コードは実データで確認: 1=都市計画区域, 2=市街化区域, 3=市街化調整区域（重ね合わせ）。

- 県を増やす: `python scripts/build_youto.py 24 21`（三重・岐阜）→ commit → デプロイ。1県あたり 10MB 前後（市町村別に遅延取得）
- A29 の新年版が出たら `A29_VER` を変えて再実行（2026-09 時点で A29-19 が最新）

## 年次更新手順（データの入れ替え）

地価公示は毎年3月下旬、地価調査は毎年9月下旬に新年版が公開される。

### 路線価図索引（public/rosenka/）

国税庁の路線価図は毎年7月上旬に新年版（main_rXX）が公開される。

```bash
python scripts/build_rosenka.py --year r09   # 約8分・全国1,900市区町村を巡回
```

実行後 `public/rosenka/` の47ファイルが新年版のURLで上書きされるので commit → デプロイ。
市区町村ページの接頭文字（f34504fr.htm 等）は国税局ごとに違う点に注意（正規表現は対応済み）。

### 地価データ（public/data/）

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
