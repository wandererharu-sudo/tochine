import { evaluate, taxEstimate, formatYen, tsuboToM2 } from '../lib/tax'

// 固定資産税・都市計画税の年額概算（特例あり/なしの2ケース併記）
export default function TaxCard({ point, area, unit }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  const ev = evaluate(point.p, areaM2)
  const tax = taxEstimate(ev.kotei, areaM2)
  if (!tax) return null

  return (
    <section className="card">
      <h2>固定資産税・都市計画税の概算 <span className="sub">年額</span></h2>
      <div className="tax-grid">
        <div className="tax-case">
          <h3>住宅が建っている場合</h3>
          <p className="tax-total">{formatYen(tax.residential.total)}</p>
          <p className="tax-detail">
            固定資産税 {formatYen(tax.residential.kotei)} ＋ 都市計画税 {formatYen(tax.residential.toshi)}
          </p>
          <p className="note">住宅用地特例適用（200㎡まで1/6・超過分1/3）</p>
        </div>
        <div className="tax-case">
          <h3>更地・非住宅の場合</h3>
          <p className="tax-total">{formatYen(tax.vacant.total)}</p>
          <p className="tax-detail">
            固定資産税 {formatYen(tax.vacant.kotei)} ＋ 都市計画税 {formatYen(tax.vacant.toshi)}
          </p>
          <p className="note">特例なし</p>
        </div>
      </div>
      <p className="note">
        ※都市計画税（0.3%）は市街化区域のみ。負担調整措置・自治体ごとの税率差は未考慮です。
      </p>
    </section>
  )
}
