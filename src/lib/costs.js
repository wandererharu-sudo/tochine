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
