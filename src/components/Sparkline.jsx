// 直近10年＋当年の㎡単価推移ミニグラフ（②地価推移）
export default function Sparkline({ point, years }) {
  const histYears = years.hist_years ?? 10
  const curYear = point.s === 'K' ? years.koji_year : years.chosa_year
  const series = [...(point.h ?? []), point.p]
    .map((v, i) => ({ year: curYear - histYears + i, v }))
    .filter((d) => d.v > 0)
  if (series.length < 2) return null

  const first = series[0]
  const last = series[series.length - 1]
  const pct = (last.v / first.v - 1) * 100
  const up = pct >= 0

  const W = 300
  const H = 64
  const PAD = 6
  const min = Math.min(...series.map((d) => d.v))
  const max = Math.max(...series.map((d) => d.v))
  const range = max - min || 1
  const x = (year) => PAD + ((year - first.year) / (last.year - first.year)) * (W - PAD * 2)
  const y = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const pts = series.map((d) => `${x(d.year).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ')
  const color = up ? '#1a7f37' : '#b3261e'

  return (
    <div className="spark">
      <div className="spark-head">
        <span>地価の推移（{first.year}〜{last.year}年）</span>
        <span className="spark-pct" style={{ color }}>
          {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="spark-svg" role="img"
        aria-label={`地価推移 ${first.year}年${first.v}円から${last.year}年${last.v}円`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
        <circle cx={x(last.year)} cy={y(last.v)} r="3" fill={color} />
      </svg>
      <div className="spark-foot">
        <span>{first.year}年 {(first.v / 10000).toFixed(1)}万円/㎡</span>
        <span>{last.year}年 {(last.v / 10000).toFixed(1)}万円/㎡</span>
      </div>
    </div>
  )
}
