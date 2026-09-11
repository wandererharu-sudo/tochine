import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'

// 実コンポーネントから静的な確認資料を生成。実物件・外部通信は使用しない。
const result = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import assert from 'node:assert/strict';
      import QuickSummary from './src/components/QuickSummary.jsx';
      import DetailSection from './src/components/DetailSection.jsx';
      import ValuationCard from './src/components/ValuationCard.jsx';
      import PriceCompareCard from './src/components/PriceCompareCard.jsx';
      import SashineCard from './src/components/SashineCard.jsx';
      import ChintaiCard from './src/components/ChintaiCard.jsx';
      import { syncInitialCosts } from './src/lib/costs.js';
      const noop = () => {};
      const costs = { reform: '100', zanchi: '10', kaitai: '', safety: '10' };
      const chintai = syncInitialCosts({shokiMode: 'linked', shohiyo: '35', kakaku: '', yachin: '6', keihi: '15', kariire: '', kinri: '2', kikan: '15'}, costs);
      const shared = {point: {p: 40000, n: '参考地点（表示サンプル）', s: 'K', u: '住宅地', dist: 320}, area: '150', unit: 'm2', price: '500', actualRosenka: null, kuiki: ''};
      const quick = {...shared, onAreaChange: noop, onUnitChange: noop, onPriceChange: noop, onSave: noop, onDetails: noop, canSave: true};
      export const markup = renderToStaticMarkup(<main className="app">
        <header className="app-head"><h1>土地値チェッカー</h1><p>改善版・画面構成の確認</p></header>
        <p className="import-note">表示サンプルです。金額は架空の条件で、入力・保存はできません。下の詳細欄は開閉できます。公開サイトは未更新です。</p>
        <fieldset disabled style={{border: 0, margin: 0, padding: 0, minWidth: 0}}>
          <QuickSummary {...quick} />
          <DetailSection id="land-details" title="土地値を詳しく調べる" description="地図・参考地点・用途地域・路線価・評価額">
            <ValuationCard {...shared} years={{koji_year: 2026, chosa_year: 2025}} />
            <p className="hint">実際のアプリでは、ここに地図・用途地域・路線価図も表示します。</p>
          </DetailSection>
          <DetailSection id="buying-details" title="買値を検討する" description="販売価格との差・解体費・リフォーム費・指値の目安">
            <PriceCompareCard {...shared} />
            <SashineCard {...shared} costs={costs} onChange={noop} />
          </DetailSection>
          <DetailSection id="rental-details" title="貸した場合を見る" description="家賃・初期費用・借入・手取り・税額">
            <ChintaiCard {...shared} costs={costs} chintai={chintai} onChange={noop} onCostsChange={noop} />
          </DetailSection>
        </fieldset>
        <p className="hint">連動の例：リフォーム100万円＋残置物10万円＋諸費用35万円＝初期費用145万円。解体費・安全代は賃貸の初期費用に含めません。</p>
      </main>);
      assert.ok(markup.includes('600万円'));
      assert.ok(markup.includes('83'));
      assert.ok(markup.includes('value="145"'));
      const ids = [...markup.matchAll(/\\sid="([^"]+)"/g)].map(m => m[1]);
      assert.equal(new Set(ids).size, ids.length, '入力IDが重複していない');
      assert.ok(renderToStaticMarkup(<QuickSummary {...quick} point={null} area="" price="" canSave={false} />).includes('住所を検索'));
      assert.ok(renderToStaticMarkup(<QuickSummary {...quick} actualRosenka={32000} />).includes('入力した路線価から計算'));
    `,
    resolveDir: process.cwd(), loader: 'jsx',
  },
  bundle: true, write: false, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
})
// 外部パッケージの解決基点を維持して、コンパイル結果を実行する。
const compiled = result.outputFiles[0].text
  .replaceAll('from "react"', `from ${JSON.stringify(import.meta.resolve('react'))}`)
  .replaceAll('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`)
  .replaceAll('from "react-dom/server"', `from ${JSON.stringify(import.meta.resolve('react-dom/server'))}`)
const { markup } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const css = (await Promise.all(['src/index.css', 'src/App.css'].map(p => readFile(p, 'utf8')))).join('\n')
await writeFile('確認.html', `<!doctype html><html lang="ja"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>土地値チェッカー 改善版の確認</title><style>${css}</style>${markup}</html>`)
console.log('表示サンプル・未入力・手入力路線価・入力ID重複を確認。確認.html を更新しました。')
