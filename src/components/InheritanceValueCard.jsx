import { evaluate, formatYen, tsuboToM2 } from '../lib/tax'

export default function InheritanceValueCard({ point, area, unit, price, actualRosenka }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  const ready = Number.isFinite(areaM2) && areaM2 > 0 && (point?.p > 0 || actualRosenka > 0)
  const ev = ready ? evaluate(point?.p || 0, areaM2, actualRosenka) : null
  const sale = (Number(price) || 0) * 10000
  return (
    <section className="card inheritance-card" aria-labelledby="inheritance-title">
      <h2 id="inheritance-title">相続税路線価ベースの土地評価</h2>
      {!ev ? <p className="hint">土地面積を入れると、路線価ベースの総額と掛け率の参考試算が出ます。</p> : <>
        <p className="basis-tag">{ev.isActual ? '入力した相続税路線価 × 土地面積' : '公示・基準地価格からの換算（×0.8）／実際の路線価は未確認'}</p>
        <div className="inheritance-total" aria-live="polite" aria-atomic="true">
          <span>路線価ベースの総額（画地補正前の目安）</span>
          <strong>{formatYen(ev.rosenka)}</strong>
          <span>{ev.rosenkaUnit.toLocaleString()}円/㎡ × {areaM2.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}㎡</span>
        </div>
        {!ev.isActual && point?.chousei && <p className="hint">参考地点の単価には、区域補正 ×{point.chousei} を反映済みです。</p>}
        {sale > 0 && ev.rosenka > 0 && <p className="hint">販売価格 {formatYen(sale)} は、路線価ベースの総額の{Math.round(sale / ev.rosenka * 100)}％です。</p>}
        <details className="inheritance-trials">
          <summary>掛け率を変えた参考試算（70％・80％）</summary>
          <div className="inheritance-grid">
            {[70, 80].map(percent => <div key={percent}>
              <span>路線価ベースの総額 × {percent}％</span>
              <strong>{formatYen(Math.round(ev.rosenka * percent / 100))}</strong>
            </div>)}
          </div>
          <p className="hint">任意の掛け率による比較例です。銀行の採用率・担保評価額・融資可能額を示すものではありません。</p>
        </details>
      </>}
      <p className="hint">土地のみ。奥行・間口・不整形地などの画地補正、権利関係の調整は未反映です。正式な相続税評価額や相続税額ではありません。倍率地域は実際の評価倍率を別途確認してください。</p>
    </section>
  )
}
