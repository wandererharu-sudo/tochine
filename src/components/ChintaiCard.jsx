import { evaluate, taxEstimate, formatYen, tsuboToM2 } from '../lib/tax'

// 賃貸収支の概算（現金買い前提・築古戸建て投資向け）
// 固定資産税は税額カードと同じ計算値（住宅用地特例あり側・市街化区域以外は都計税なし）を年間経費に自動計上する
export default function ChintaiCard({ point, area, unit, actualRosenka, price, kuiki, chintai, onChange }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  if (!(areaM2 > 0)) return null
  const ev = evaluate(point.p, areaM2, actualRosenka)
  const tax = taxEstimate(ev.kotei, areaM2)
  const noToshikei = kuiki !== '' && kuiki != null && kuiki !== '市街化区域'
  const koteiTax = tax ? (noToshikei ? tax.residential.kotei : tax.residential.total) : 0

  const set = (key) => (e) => onChange({ ...chintai, [key]: e.target.value })

  const kakaku = (Number(chintai.kakaku) || Number(price) || 0) * 10000
  const shoki = (Number(chintai.shoki) || 0) * 10000
  const yachin = (Number(chintai.yachin) || 0) * 10000
  const keihiPct = Number(chintai.keihi) || 0

  const total = kakaku + shoki // 総投資額
  const nenshu = yachin * 12 // 年間家賃
  const keihi = Math.round(nenshu * (keihiPct / 100)) // 管理・空室・修繕
  const tedori = nenshu - keihi - koteiTax // 年間手取り
  const ready = total > 0 && yachin > 0

  return (
    <section className="card">
      <h2>賃貸収支 <span className="sub">買って貸した場合（現金買い・概算）</span></h2>
      <div className="area-row">
        <label htmlFor="ch-kakaku">購入価格</label>
        <input
          id="ch-kakaku"
          type="number"
          inputMode="decimal"
          min="0"
          value={chintai.kakaku}
          onChange={set('kakaku')}
          placeholder={price || '500'}
        />
        <span>万円 <span className="note">空欄なら販売価格を使用</span></span>
      </div>
      <div className="area-row">
        <label htmlFor="ch-yachin">想定家賃</label>
        <input
          id="ch-yachin"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={chintai.yachin}
          onChange={set('yachin')}
          placeholder="6"
        />
        <span>万円/月</span>
      </div>
      <div className="area-row">
        <label htmlFor="ch-shoki">初期費用</label>
        <input
          id="ch-shoki"
          type="number"
          inputMode="decimal"
          min="0"
          value={chintai.shoki}
          onChange={set('shoki')}
          placeholder="150"
        />
        <span>万円 <span className="note">リフォーム・登記・仲介料など</span></span>
      </div>
      <div className="area-row">
        <label htmlFor="ch-keihi">運営経費率</label>
        <input
          id="ch-keihi"
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          value={chintai.keihi}
          onChange={set('keihi')}
          placeholder="15"
        />
        <span>％ <span className="note">管理料・空室・修繕のならし</span></span>
      </div>

      {ready ? (
        <table className="val-table">
          <tbody>
            <tr>
              <th>総投資額<span className="note">（購入＋初期費用）</span></th>
              <td className="total">{formatYen(total)}</td>
            </tr>
            <tr>
              <th>年間家賃収入</th>
              <td>{formatYen(nenshu)}</td>
            </tr>
            <tr className="main-row">
              <th>表面利回り</th>
              <td className="total">{((nenshu / total) * 100).toFixed(1)}％</td>
            </tr>
            <tr>
              <th>− 運営経費（{keihiPct}％）</th>
              <td>−{formatYen(keihi)}</td>
            </tr>
            <tr>
              <th>− 固定資産税{!noToshikei && '・都計税'}<span className="note">（税額カードと同じ概算）</span></th>
              <td>−{formatYen(koteiTax)}</td>
            </tr>
            <tr className="main-row">
              <th>年間手取り／実質利回り</th>
              <td className="total">
                {formatYen(tedori)}／{((tedori / total) * 100).toFixed(1)}％
              </td>
            </tr>
            <tr>
              <th>投資回収の目安</th>
              <td>{tedori > 0 ? `約${(total / tedori).toFixed(1)}年` : '回収できません'}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="hint">想定家賃（と購入価格）を入れると収支が出ます</p>
      )}
      {ready && tedori <= 0 && (
        <p className="warn-text">⚠ 年間手取りがマイナスです。家賃・購入価格・経費を見直してください。</p>
      )}
      <p className="note">
        ※現金買い前提です。ローン返済・所得税・大規模修繕・退去リフォームは含みません。
      </p>
    </section>
  )
}
