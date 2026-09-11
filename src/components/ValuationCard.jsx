import { evaluate, formatYen, tsuboToM2 } from '../lib/tax'
import Sparkline from './Sparkline'

// 面積入力＋評価額目安カード。actualRosenka（路線価図の実数値）があればそちら基準
export default function ValuationCard({ point, area, unit, years, actualRosenka }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  const ev = evaluate(point.p, areaM2, actualRosenka)
  const hasArea = areaM2 > 0
  const yearLabel = point.s === 'K' ? `${years.koji_year}年公示` : `${years.chosa_year}年調査`

  return (
    <section className="card">
      <h2>評価額の目安 <span className="sub">
        {ev.isActual ? '基準: 入力した路線価' : `基準: ${point.n}（${yearLabel}）`}
      </span></h2>
      <table className="val-table">
        <tbody>
          <tr>
            <th>{ev.isActual ? <>時価の目安<span className="note">（路線価÷0.8）</span></> : <>公示・調査価格<span className="note">（時価の目安）</span></>}</th>
            <td>{formatYen(ev.jikaUnit)}/㎡</td>
            <td className="total">{hasArea ? formatYen(ev.jika) : '─'}</td>
          </tr>
          <tr className={ev.isActual ? '' : 'main-row'}>
            <th>固定資産税評価額<span className="note">{ev.isActual ? '（÷0.8×0.7）' : '（×0.7）'}</span></th>
            <td>{formatYen(ev.koteiUnit)}/㎡</td>
            <td className="total">{hasArea ? formatYen(ev.kotei) : '─'}</td>
          </tr>
          <tr className={ev.isActual ? 'main-row' : ''}>
            <th>相続税路線価<span className="note">{ev.isActual ? '（入力値）' : '（×0.8）'}</span></th>
            <td>{formatYen(ev.rosenkaUnit)}/㎡</td>
            <td className="total">{hasArea ? formatYen(ev.rosenka) : '─'}</td>
          </tr>
        </tbody>
      </table>
      {!hasArea && <p className="hint">面積を入れると総額が出ます</p>}
      {point.chousei && !ev.isActual && (
        <p className="note">
          ※市街化調整区域のため、周辺公示の単価に ×{point.chousei} を掛けた概算です。
        </p>
      )}
      <Sparkline point={point} years={years} />
      {point.u !== '住宅地' && (
        <p className="warn-text">
          選択中の地点は「{point.u}」です。×0.7／×0.8 の換算は宅地の経験則のため、参考程度にご覧ください。
        </p>
      )}
    </section>
  )
}
