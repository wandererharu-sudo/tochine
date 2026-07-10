import { evaluate, taxEstimate, formatYen, tsuboToM2 } from '../lib/tax'

// 固定資産税・都市計画税の年額概算（特例あり/なしの2ケース併記）
// kuiki: 用途地域カードで選んだ区域区分。市街化区域以外なら都市計画税を外す
export default function TaxCard({ point, area, unit, actualRosenka, kuiki }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  const ev = evaluate(point.p, areaM2, actualRosenka)
  const tax = taxEstimate(ev.kotei, areaM2)
  if (!tax) return null
  const noToshikei = kuiki !== '' && kuiki != null && kuiki !== '市街化区域'

  const caseBlock = (title, t, note) => (
    <div className="tax-case">
      <h3>{title}</h3>
      <p className="tax-total">{formatYen(noToshikei ? t.kotei : t.total)}</p>
      <p className="tax-detail">
        固定資産税 {formatYen(t.kotei)} ＋ 都市計画税{' '}
        {noToshikei ? `なし（${kuiki}）` : formatYen(t.toshi)}
      </p>
      <p className="note">{note}</p>
    </div>
  )

  return (
    <section className="card">
      <h2>固定資産税・都市計画税の概算 <span className="sub">年額</span></h2>
      <div className="tax-grid">
        {caseBlock('住宅が建っている場合', tax.residential, '住宅用地特例適用（200㎡まで1/6・超過分1/3）')}
        {caseBlock('更地・非住宅の場合', tax.vacant, '特例なし')}
      </div>
      <p className="note">
        ※都市計画税（0.3%）は原則市街化区域のみ（非線引き等は自治体により課税あり）。
        負担調整措置・自治体ごとの税率差は未考慮です。
      </p>
    </section>
  )
}
