// 土地の評価額・税額の概算（すべて目安）
// 換算の根拠: 固定資産税評価額 ≒ 地価公示価格 × 0.7、相続税路線価 ≒ × 0.8（宅地のみ有効）
export const KOTEI_RATIO = 0.7
export const ROSENKA_RATIO = 0.8
export const TSUBO = 3.305785 // 1坪 = 400/121 ㎡

export function tsuboToM2(tsubo) {
  return tsubo * TSUBO
}
export function m2ToTsubo(m2) {
  return m2 / TSUBO
}

// 公示/調査の㎡単価と面積(㎡)から各評価額の目安を計算
export function evaluate(unitPrice, areaM2) {
  const jika = unitPrice * areaM2 // 時価の目安（公示水準）
  return {
    jikaUnit: unitPrice,
    koteiUnit: Math.round(unitPrice * KOTEI_RATIO),
    rosenkaUnit: Math.round(unitPrice * ROSENKA_RATIO),
    jika: Math.round(jika),
    kotei: Math.round(jika * KOTEI_RATIO),
    rosenka: Math.round(jika * ROSENKA_RATIO),
  }
}

// 固定資産税・都市計画税の年額概算
// 住宅用地特例: 200㎡以下は課税標準 1/6（都計税 1/3）、200㎡超の部分は 1/3（都計税 2/3）
// 非住宅・更地: 特例なし（負担調整措置は未考慮）
export function taxEstimate(koteiTotal, areaM2) {
  if (!(koteiTotal > 0) || !(areaM2 > 0)) return null
  const smallRatio = Math.min(areaM2, 200) / areaM2
  const largeRatio = 1 - smallRatio
  const koteiBase = koteiTotal * (smallRatio / 6 + largeRatio / 3)
  const toshiBase = koteiTotal * (smallRatio / 3 + (largeRatio * 2) / 3)
  return {
    residential: {
      kotei: Math.round(koteiBase * 0.014),
      toshi: Math.round(toshiBase * 0.003),
      total: Math.round(koteiBase * 0.014 + toshiBase * 0.003),
    },
    vacant: {
      kotei: Math.round(koteiTotal * 0.014),
      toshi: Math.round(koteiTotal * 0.003),
      total: Math.round(koteiTotal * 0.014 + koteiTotal * 0.003),
    },
  }
}

// 金額の表示（1億2,345万円 / 678万円 / 45.2万円 / 9,800円）
export function formatYen(n) {
  if (!Number.isFinite(n)) return '─'
  const abs = Math.abs(n)
  if (abs >= 100000000) {
    const oku = Math.floor(n / 100000000)
    const man = Math.round((n % 100000000) / 10000)
    return man > 0 ? `${oku}億${man.toLocaleString()}万円` : `${oku}億円`
  }
  if (abs >= 1000000) return `${Math.round(n / 10000).toLocaleString()}万円`
  if (abs >= 10000) return `${(n / 10000).toFixed(1)}万円`
  return `${Math.round(n).toLocaleString()}円`
}
