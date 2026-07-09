import { formatYen } from '../lib/tax'

function distLabel(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`
}

// 最寄り地点カード群。住宅地以外は換算式の適用外になりやすいので警告バッジ
export default function PointList({ points, selected, onSelect, residentialOnly, onToggleFilter }) {
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
              <span className="point-price">{formatYen(p.p)}/㎡</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
