import { evaluate, formatYen, tsuboToM2, m2ToTsubo } from '../lib/tax'
import Sparkline from './Sparkline'

// 面積入力＋評価額目安カード。actualRosenka（路線価図の実数値）があればそちら基準
export default function ValuationCard({ point, area, unit, onAreaChange, onUnitChange, years, actualRosenka }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  const ev = evaluate(point.p, areaM2, actualRosenka)
  const hasArea = areaM2 > 0
  const yearLabel = point.s === 'K' ? `${years.koji_year}年公示` : `${years.chosa_year}年調査`

  return (
    <section className="card">
      <h2>評価額の目安 <span className="sub">
        {ev.isActual ? '基準: 路線価図の実数値' : `基準: ${point.n}（${yearLabel}）`}
      </span></h2>
      <div className="area-row">
        <label htmlFor="area">土地面積</label>
        <input
          id="area"
          type="number"
          inputMode="decimal"
          min="0"
          value={area}
          onChange={(e) => onAreaChange(e.target.value)}
          placeholder="150"
        />
        <div className="unit-switch">
          <button type="button" className={unit === 'm2' ? 'on' : ''} onClick={() => onUnitChange('m2')}>㎡</button>
          <button type="button" className={unit === 'tsubo' ? 'on' : ''} onClick={() => onUnitChange('tsubo')}>坪</button>
        </div>
        {hasArea && (
          <span className="area-conv">
            = {unit === 'tsubo' ? `${areaM2.toFixed(1)}㎡` : `${m2ToTsubo(areaM2).toFixed(1)}坪`}
          </span>
        )}
      </div>

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
            <th>相続税路線価<span className="note">{ev.isActual ? '（図面の実数値）' : '（×0.8）'}</span></th>
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
