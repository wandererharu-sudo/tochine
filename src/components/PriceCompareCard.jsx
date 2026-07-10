import { evaluate, formatYen, tsuboToM2, judge } from '../lib/tax'

export default function PriceCompareCard({ point, area, unit, price, onPriceChange, actualRosenka }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  if (!(areaM2 > 0)) return null
  const ev = evaluate(point.p, areaM2, actualRosenka)
  const priceYen = (Number(price) || 0) * 10000
  const ratio = priceYen > 0 ? priceYen / ev.jika : null
  const j = ratio !== null ? judge(ratio) : null

  return (
    <section className="card">
      <h2>土地値判定 <span className="sub">販売価格と比べる</span></h2>
      <div className="area-row">
        <label htmlFor="price">販売価格</label>
        <input
          id="price"
          type="number"
          inputMode="decimal"
          min="0"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder="500"
        />
        <span>万円</span>
      </div>
      {j ? (
        <>
          <p className={`judge ${j.cls}`}>
            <span className="judge-mark">{j.mark}</span>
            {j.label}（土地値の{Math.round(ratio * 100)}%）
          </p>
          <table className="val-table">
            <tbody>
              <tr>
                <th>
                  土地値（時価の目安）
                  {ev.isActual ? (
                    <span className="note">・実路線価ベース</span>
                  ) : (
                    point.chousei && <span className="note">・調整区域補正×{point.chousei}</span>
                  )}
                </th>
                <td className="total">{formatYen(ev.jika)}</td>
              </tr>
              <tr>
                <th>指値の目安<span className="note">（土地値×0.8）</span></th>
                <td className="total">{formatYen(Math.round(ev.jika * 0.8))}</td>
              </tr>
              <tr>
                <th>販売価格との差</th>
                <td className="total">{priceYen <= ev.jika ? '−' : '＋'}{formatYen(Math.abs(priceYen - ev.jika))}</td>
              </tr>
            </tbody>
          </table>
          <p className="note">※土地のみの比較です。建物の価値・解体費・残置物などは考慮していません。</p>
        </>
      ) : (
        <p className="hint">販売価格を入れると土地値との比較が出ます</p>
      )}
    </section>
  )
}
