import { judge, formatYen, tsuboToM2, evaluate } from '../lib/tax'

// ④検討物件の保存・比較リスト（localStorage）
export default function SavedList({ items, onLoad, onDelete, onMemoChange }) {
  if (!items.length) return null
  return (
    <section className="card">
      <h2>保存した土地 <span className="sub">{items.length}件・タップで再表示</span></h2>
      <ul className="points">
        {items.map((it) => {
          const areaM2 = it.unit === 'tsubo' ? tsuboToM2(Number(it.area) || 0) : Number(it.area) || 0
          const actual = (Number(it.rosenkaInput) || 0) * 1000 || null
          const jika =
            areaM2 > 0 && (it.point || actual)
              ? evaluate(it.point?.p ?? 0, areaM2, actual).jika
              : null
          const priceYen = (Number(it.price) || 0) * 10000
          const j = jika && priceYen > 0 ? judge(priceYen / jika) : null
          return (
            <li key={it.id}>
              <button type="button" className="point saved-item" onClick={() => onLoad(it)}>
                <span className="point-top">
                  {j && <span className={`badge judge-badge ${j.cls}`}>{j.mark}</span>}
                  <span className="saved-title">{it.title}</span>
                  <span className="dist">{it.date}</span>
                </span>
                <span className="point-addr">
                  {it.area ? `${it.area}${it.unit === 'tsubo' ? '坪' : '㎡'}` : '面積未入力'}
                  {priceYen > 0 && ` ／ 販売 ${formatYen(priceYen)}`}
                  {jika && ` ／ 土地値 ${formatYen(Math.round(jika))}`}
                  {j && `（${Math.round((priceYen / jika) * 100)}%）`}
                </span>
              </button>
              <div className="saved-tools">
                <input
                  type="text"
                  className="saved-memo"
                  placeholder="メモ（例: 現地確認済み・再建築可）"
                  value={it.memo}
                  onChange={(e) => onMemoChange(it.id, e.target.value)}
                />
                <button type="button" className="saved-del" onClick={() => onDelete(it.id)}>
                  削除
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
