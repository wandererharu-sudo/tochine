import { useState } from 'react'
import { judge, formatYen, tsuboToM2, evaluate } from '../lib/tax'

// ④検討物件の保存・比較リスト（localStorage）
export default function SavedList({ items, onLoad, onDelete, onMemoChange }) {
  const [copied, setCopied] = useState(false)
  if (!items.length) return null
  // 賃貸収支シミュレーター（ローカルアプリ）に貼り付けて渡す用
  const copyForShushi = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(items))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* クリップボード不可の環境では何もしない */ }
  }
  return (
    <section className="card">
      <div className="card-head">
        <h2>保存した土地 <span className="sub">{items.length}件・タップで再表示</span></h2>
        <button type="button" className="copy-btn" onClick={copyForShushi}>
          {copied ? '✓ コピー済' : '収支用コピー'}
        </button>
      </div>
      <ul className="points">
        {items.map((it) => {
          const areaM2 = it.unit === 'tsubo' ? tsuboToM2(Number(it.area) || 0) : Number(it.area) || 0
          const actual = (Number(it.rosenkaInput) || 0) * 1000 || null
          // 市街化調整区域は減価補正を掛けた概算（メイン表示と同じ扱い）
          const ratio = it.kuiki === '市街化調整区域' ? Number(it.chousei) || 1 : 1
          const jika =
            areaM2 > 0 && (it.point || actual)
              ? evaluate((it.point?.p ?? 0) * ratio, areaM2, actual).jika
              : null
          const priceYen = (Number(it.price) || 0) * 10000
          const j = jika && priceYen > 0 ? judge(priceYen / jika) : null
          // 賃貸収支が入力済みなら表面利回りも一覧に出す（購入価格が空なら販売価格を使用）
          const ch = it.chintai
          const invest =
            ((Number(ch?.kakaku) || Number(it.price) || 0) + (Number(ch?.shoki) || 0)) * 10000
          const yachin = (Number(ch?.yachin) || 0) * 10000
          const omote = yachin > 0 && invest > 0 ? ((yachin * 12) / invest) * 100 : null
          return (
            <li key={it.id}>
              <button type="button" className="point saved-item" onClick={() => onLoad(it)}>
                <span className="point-top">
                  {j && <span className={`badge judge-badge ${j.cls}`}>{j.mark}</span>}
                  <span className="saved-title">{it.title}</span>
                  {it.kuiki === '市街化調整区域' && <span className="badge chosei">調整区域</span>}
                  {it.kuiki && it.kuiki !== '市街化調整区域' && (
                    <span className="badge kuiki">{it.kuiki}</span>
                  )}
                  <span className="dist">{it.date}</span>
                </span>
                <span className="point-addr">
                  {it.area ? `${it.area}${it.unit === 'tsubo' ? '坪' : '㎡'}` : '面積未入力'}
                  {priceYen > 0 && ` ／ 販売 ${formatYen(priceYen)}`}
                  {jika && ` ／ 土地値 ${formatYen(Math.round(jika))}`}
                  {j && `（${Math.round((priceYen / jika) * 100)}%）`}
                  {omote !== null && ` ／ 家賃 ${formatYen(yachin)}・表面 ${omote.toFixed(1)}%`}
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
