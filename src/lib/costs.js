// 金額は万円。旧保存データの初期費用合計は手入力として保持する。
const amount = (value) => Math.max(0, Number(value) || 0)

export function syncInitialCosts(chintai, costs) {
  if (chintai.shokiMode !== 'linked') return chintai
  const total = amount(costs.reform) + amount(costs.zanchi) + amount(chintai.shohiyo)
  return { ...chintai, shoki: String(Math.round(total * 10000) / 10000) }
}

export function restoreInitialCosts(saved, defaults, costs) {
  return syncInitialCosts({ ...defaults, ...saved, shokiMode: saved?.shokiMode ?? 'manual' }, costs)
}

// 従来の参考式を維持し、仲介不要の取引では仲介分を除外する。
export function purchaseCosts(priceYen, assessedValue, brokerage = 'estimate') {
  const chukai = brokerage === 'none' || !(priceYen > 0) ? 0 : Math.round((priceYen * 0.03 + 60000) * 1.1)
  const touki = Math.round(assessedValue * 0.02) + 80000
  const shutoku = Math.round(assessedValue * 0.5 * 0.03)
  const inshi = 10000
  return { chukai, touki, shutoku, inshi, total: chukai + touki + shutoku + inshi }
}

export function effectiveRental(chintai, costs, priceYen, assessedValue) {
  const fees = purchaseCosts(priceYen, assessedValue, chintai.brokerage)
  const next = chintai.shohiyoSource === 'estimate' && priceYen > 0
    ? { ...chintai, shohiyo: String(Math.ceil(fees.total / 10000)) } : chintai
  return syncInitialCosts(next, costs)
}
