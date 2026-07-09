// ハバースイン距離（m）と最寄り地点検索
const R = 6371000

export function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// points（県単位・最大2,000点程度）を線形走査して近い順にn件返す
export function nearestPoints(points, lat, lon, n = 5) {
  return points
    .map((p) => ({ ...p, dist: haversine(lat, lon, p.lat, p.lon) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n)
}
