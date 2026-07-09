import { useState } from 'react'

// 住所入力＋GSI候補リスト＋座標直接入力フォールバック
export default function AddressSearch({ onSearch, candidates, onSelect, loading, error }) {
  const [query, setQuery] = useState('')
  const [showCoord, setShowCoord] = useState(false)
  const [coordText, setCoordText] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  // 「34.8879, 136.8322」のような貼り付けを受け付ける（地理院地図・Googleマップからコピペ可）
  const submitCoord = (e) => {
    e.preventDefault()
    const m = coordText.match(/(\d{2}\.\d+)[^\d-]+(\d{3}\.\d+)/)
    if (m) onSelect({ title: `座標指定（${m[1]}, ${m[2]}）`, lat: Number(m[1]), lon: Number(m[2]) })
  }

  return (
    <section className="card">
      <form onSubmit={submit} className="search-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例: 愛知県常滑市新開町1-2-3"
          aria-label="住所"
        />
        <button type="submit" disabled={loading}>{loading ? '検索中…' : '検索'}</button>
      </form>

      {error && (
        <p className="error">
          {error}
          <button type="button" className="link" onClick={() => setShowCoord(true)}>
            緯度経度で指定する
          </button>
        </p>
      )}

      {candidates.length > 0 && (
        <ul className="candidates">
          {candidates.map((c, i) => (
            <li key={i}>
              <button type="button" onClick={() => onSelect(c)}>{c.title}</button>
            </li>
          ))}
        </ul>
      )}

      <p className="coord-toggle">
        <button type="button" className="link" onClick={() => setShowCoord(!showCoord)}>
          {showCoord ? '▲ 閉じる' : '▼ 緯度経度で直接指定（住所検索が使えない時）'}
        </button>
      </p>
      {showCoord && (
        <form onSubmit={submitCoord} className="search-row">
          <input
            type="text"
            value={coordText}
            onChange={(e) => setCoordText(e.target.value)}
            placeholder="例: 34.8879, 136.8322（緯度, 経度）"
            aria-label="緯度経度"
          />
          <button type="submit">表示</button>
        </form>
      )}
    </section>
  )
}
