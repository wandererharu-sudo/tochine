// 国土地理院 住所検索API（無料・キー不要・CORS対応）
// レスポンスの coordinates は [経度, 緯度] の順であることに注意
const GSI_URL = 'https://msearch.gsi.go.jp/address-search/AddressSearch?q='

export async function geocode(query) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(GSI_URL + encodeURIComponent(query), { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (!Array.isArray(json)) return []
    return json.slice(0, 5).map((f) => ({
      title: f.properties?.title ?? '',
      lon: f.geometry?.coordinates?.[0],
      lat: f.geometry?.coordinates?.[1],
    })).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
  } finally {
    clearTimeout(timer)
  }
}
