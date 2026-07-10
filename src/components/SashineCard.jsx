import { evaluate, formatYen, tsuboToM2 } from '../lib/tax'

// 指値逆算: 土地値から解体費・残置物処分・リフォーム・安全代を引いて「いくらまでなら買えるか」を出す
export default function SashineCard({ point, area, unit, price, actualRosenka, costs, onChange }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  if (!(areaM2 > 0)) return null
  const ev = evaluate(point.p, areaM2, actualRosenka)

  const kaitai = (Number(costs.kaitai) || 0) * 10000
  const zanchi = (Number(costs.zanchi) || 0) * 10000
  const reform = (Number(costs.reform) || 0) * 10000
  const safetyPct = Number(costs.safety) || 0
  const safety = Math.round((ev.jika * safetyPct) / 100)
  const limit = ev.jika - kaitai - zanchi - reform - safety
  const priceYen = (Number(price) || 0) * 10000

  const set = (key) => (e) => onChange({ ...costs, [key]: e.target.value })

  const rows = [
    ['解体費', 'kaitai', kaitai],
    ['残置物処分', 'zanchi', zanchi],
    ['リフォーム', 'reform', reform],
  ]

  return (
    <section className="card">
      <h2>指値逆算 <span className="sub">いくらまでなら買っていいか</span></h2>
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
          {rows.map(([label, key, yen]) => (
            <tr key={key}>
              <th>
                − {label}
                <span className="cost-input">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={costs[key]}
                    onChange={set(key)}
                    placeholder="0"
                  />
                  万円
                </span>
              </th>
              <td>{yen > 0 ? `−${formatYen(yen)}` : '─'}</td>
            </tr>
          ))}
          <tr>
            <th>
              − 安全代
              <span className="cost-input">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  value={costs.safety}
                  onChange={set('safety')}
                  placeholder="10"
                />
                ％
              </span>
            </th>
            <td>{safety > 0 ? `−${formatYen(safety)}` : '─'}</td>
          </tr>
          <tr className="main-row">
            <th>指値上限</th>
            <td className="total">{formatYen(limit)}</td>
          </tr>
          {priceYen > 0 && (
            <tr>
              <th>販売価格 {formatYen(priceYen)} との差</th>
              <td className={limit >= priceYen ? '' : 'over'}>
                {limit >= priceYen ? '買値の範囲内（＋' : '要交渉（−'}
                {formatYen(Math.abs(limit - priceYen))}）
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {limit <= 0 && (
        <p className="warn-text">⚠ 費用が土地値を上回っています。この条件では土地値ベースの買値が成立しません。</p>
      )}
      <p className="note">
        ※安全代=想定外の出費・売却時の値下がり余地の備え（土地値に対する割合）。
      </p>
    </section>
  )
}
