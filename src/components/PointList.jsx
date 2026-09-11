import { formatYen } from '../lib/tax'

function distLabel(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`
}

// 地点ごとの区域区分・用途地域バッジ（lib/youto.js の判定結果）。調整区域は赤、それ以外は灰、用途地域が分かれば併記
function ZoningBadge({ z }) {
  if (!z || z.status !== 'ok') return null
  if (z.kuiki === '市街化調整区域') return <span className="badge chosei">調整区域</span>
  const label = z.kuiki ? z.kuiki.replace('市街化区域', '市街化') : 'その他'
  return (
    <span className="point-zoning">
      <span className="badge kuiki">{label}</span>
      {z.youto && <span className="youto-name">{z.youto}</span>}
    </span>
  )
}

// 最寄り地点カード群。住宅地以外は換算式の適用外になりやすいので警告バッジ
export default function PointList({ points, zoning, selected, onSelect, residentialOnly, onToggleFilter }) {
  if (!points) return null
  return (
    <section className="card">
      <div className="card-head">
        <h2>近くの公示・基準地点</h2>
        <label className="toggle">
          <input type="checkbox" checked={residentialOnly} onChange={onToggleFilter} />
          住宅地のみ
        </label>
      </div>
      {points.length === 0 && <p>該当する地点が見つかりませんでした。</p>}
      <ul className="points">
        {points.map((p) => (
          <li key={p.n + p.s}>
            <button
              type="button"
              className={selected && selected.n === p.n && selected.s === p.s ? 'point selected' : 'point'}
              onClick={() => onSelect(p)}
            >
              <span className="point-top">
                <span className={p.s === 'K' ? 'badge koji' : 'badge chosa'}>
                  {p.s === 'K' ? '公示' : '調査'}
                </span>
                <span className="point-n">{p.n}</span>
                <span className={p.u === '住宅地' ? 'use' : 'use warn'}>{p.u}</span>
                <span className="dist">{distLabel(p.dist)}</span>
              </span>
              <span className="point-addr">{p.a}</span>
              <ZoningBadge z={zoning && zoning[p.n + p.s]} />
              <span className="point-price">{formatYen(p.p)}/㎡</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
