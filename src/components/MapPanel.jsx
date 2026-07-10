import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ③地図ピン表示: 地理院タイル（淡色）に検索位置の旗＋最寄り地点の番号マーカー
const flagIcon = L.divIcon({
  className: 'flag-icon',
  html: '🚩',
  iconSize: [30, 30],
  iconAnchor: [5, 28], // 旗ポールの根元を座標に合わせる
})

function numIcon(i, kind, active) {
  return L.divIcon({
    className: `num-icon ${kind === 'K' ? 'koji' : 'chosa'}${active ? ' active' : ''}`,
    html: String(i),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function MapPanel({ location, points, selected, onSelect }) {
  const divRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !divRef.current) return
    const map = L.map(divRef.current, { scrollWheelZoom: false })
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>',
      maxZoom: 18,
    }).addTo(map)
    map.setView([35, 137], 5)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // マーカー再描画（選択状態の強調もここで反映）
  useEffect(() => {
    const map = mapRef.current
    if (!map || !location) return
    if (layerRef.current) layerRef.current.remove()
    const g = L.layerGroup().addTo(map)
    layerRef.current = g
    L.marker([location.lat, location.lon], { icon: flagIcon, zIndexOffset: 1000 })
      .bindPopup(location.title)
      .addTo(g)
    ;(points ?? []).forEach((p, i) => {
      const active = selected && selected.n === p.n && selected.s === p.s
      const m = L.marker([p.lat, p.lon], { icon: numIcon(i + 1, p.s, active) })
      m.bindTooltip(`${p.n}（${Math.round(p.p).toLocaleString()}円/㎡）`)
      m.on('click', () => onSelect(p))
      m.addTo(g)
    })
  }, [location, points, selected, onSelect])

  // 表示範囲は検索地点を中心に約1km範囲で固定（遠い地点に引っぱられて広域にしない）
  // 範囲外の地点マーカーは手動で地図を動かせば見える
  useEffect(() => {
    const map = mapRef.current
    if (!map || !location) return
    const dLat = 1 / 111 // 緯度1度≒111km → 約1km
    const dLon = 1 / (111 * Math.cos((location.lat * Math.PI) / 180))
    map.fitBounds([
      [location.lat - dLat, location.lon - dLon],
      [location.lat + dLat, location.lon + dLon],
    ])
  }, [location])

  if (!location) return null
  return (
    <section className="card map-card">
      <h2>地図 <span className="sub">🚩=検索地点　番号=公示・調査地点　表示は約1km範囲</span></h2>
      <div ref={divRef} className="map" />
    </section>
  )
}
