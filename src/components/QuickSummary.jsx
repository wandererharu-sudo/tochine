import { evaluate, formatYen, tsuboToM2, m2ToTsubo, judge } from '../lib/tax'

export default function QuickSummary({ point, area, unit, price, actualRosenka, kuiki,
  onAreaChange, onUnitChange, onPriceChange, onSave, savedFlash, canSave, onDetails }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  const ev = point && areaM2 > 0 ? evaluate(point.p, areaM2, actualRosenka) : null
  const sale = (Number(price) || 0) * 10000
  const ratio = ev?.jika > 0 && sale > 0 ? sale / ev.jika : null
  const result = ratio !== null ? judge(ratio) : null
  return (
    <section className="card quick-summary" aria-labelledby="quick-title">
      <h2 id="quick-title">面積と価格を入れて比較</h2>
      <div className="area-row">
        <label htmlFor="area">土地面積</label>
        <input id="area" type="number" inputMode="decimal" min="0" step="any"
          value={area} onChange={(e) => onAreaChange(e.target.value)} placeholder="150" />
        <div className="unit-switch" role="group" aria-label="面積の単位">
          {['m2', 'tsubo'].map((u) => <button key={u} type="button" aria-pressed={unit === u}
            className={unit === u ? 'on' : ''} onClick={() => onUnitChange(u)}>{u === 'm2' ? '㎡' : '坪'}</button>)}
        </div>
        {areaM2 > 0 && <span className="area-conv">= {unit === 'tsubo' ? `${areaM2.toFixed(1)}㎡` : `${m2ToTsubo(areaM2).toFixed(1)}坪`}</span>}
      </div>
      <div className="area-row">
        <label htmlFor="price">販売価格</label>
        <input id="price" type="number" inputMode="decimal" min="0" step="any"
          value={price} onChange={(e) => onPriceChange(e.target.value)} placeholder="500" />
        <span>万円</span>
      </div>
      <div className="quick-result" aria-live="polite" aria-atomic="true">
        <span>土地値の目安</span>
        <strong className="quick-value">{ev ? formatYen(ev.jika) : '—'}</strong>
        {ev && <span className="basis-tag">{ev.isActual ? '入力した路線価から計算' : '近隣地点から推定'}</span>}
        {!point && <p className="hint">住所を検索し、基準となる地点を選ぶと目安が出ます。</p>}
        {point && !ev && <p className="hint">面積を入れると土地値の総額が出ます。</p>}
        {result && <p className={`judge ${result.cls}`}>販売 {formatYen(sale)} ／ 土地値の{Math.round(ratio * 100)}％<br />{result.mark} {result.label}</p>}
        {ev && !result && <p className="hint">販売価格を入れると土地値と比較できます。</p>}
      </div>
      {point && <p className="hint">参考地点：{point.n}{Number.isFinite(point.dist) ? `・約${Math.round(point.dist)}m` : ''}
        {point.chousei && !actualRosenka ? ` ／ 調整区域補正 ×${point.chousei}` : ''}</p>}
      <p className="hint">区域区分：{kuiki || '未確認'} ／ 土地のみの概算・建物価値や接道条件は未反映</p>
      {point && point.u !== '住宅地' && <p className="warn-text">参考地点は「{point.u}」です。宅地の換算を適用できるか確認してください。</p>}
      <div className="quick-actions">
        <button type="button" className="secondary-btn" onClick={onDetails}>費用を入れて詳しく検討</button>
        <button type="button" className="save-btn" onClick={onSave} disabled={!canSave}>{savedFlash ? '✓ 保存しました' : 'この土地を保存'}</button>
      </div>
    </section>
  )
}
