import { evaluate, formatYen, tsuboToM2, judge } from '../lib/tax'

export default function PriceCompareCard({ point, area, unit, price, actualRosenka, plannedPrice }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  if (!(areaM2 > 0)) return null
  const ev = evaluate(point.p, areaM2, actualRosenka)
  const priceYen = (Number(price) || 0) * 10000
  const ratio = priceYen > 0 ? priceYen / ev.jika : null
  const j = ratio !== null ? judge(ratio) : null
  const plannedYen = (Number(plannedPrice === '' || plannedPrice == null ? price : plannedPrice) || 0) * 10000
  const usePlanned = plannedYen > 0 && plannedYen <= ev.jika
  const simpleOffer = usePlanned ? plannedYen : Math.round(ev.jika * 0.8)

  return (
    <section className="card">
      <h2>土地値判定 <span className="sub">販売価格と比べる</span></h2>
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
                    <span className="note">・入力した路線価ベース</span>
                  ) : (
                    point.chousei && <span className="note">・調整区域補正×{point.chousei}</span>
                  )}
                </th>
                <td className="total">{formatYen(ev.jika)}</td>
              </tr>
              <tr>
                <th>指値の簡易目安<span className="note">{usePlanned ? '（土地値以下のため予定購入価格）' : '（土地値×0.8）'}</span></th>
                <td className="total">{formatYen(simpleOffer)}</td>
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
