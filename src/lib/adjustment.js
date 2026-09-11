// 市街化調整区域の減価補正（2026-09-11 見直し）
// 根拠: 東海3県の調整区域の売出し事例93件（research/chosei_202609/）。
//   最寄りの「調整区域内」公示・基準地点に対し 建築可≒×1.0（愛知1.08/岐阜1.15/三重1.02）、不可・農地≒×0.25
//   最寄りの「市街化区域内」地点に対し 建築可 0.36〜0.74、不可・農地 0.13〜0.20（ばらつきが大きい）
// → 調整区域内の地点が近くにあればそれを基準にし、建築の可否で掛け率を分ける。

export const KANOU_OPTIONS = [
  { value: 'ok', label: '建築できる（既存宅地・線引き前・34条11号・旧住造法団地など）' },
  { value: 'unknown', label: '不明・未確認' },
  { value: 'ng', label: '建築できない（農地・山林・要資格・再建築不可）' },
]
export const KANOU_DEFAULT = 'unknown'

// 基準地点の区域 × 建築の可否 → 掛け率
const TABLE = {
  chousei: { ok: 1.0, unknown: 0.6, ng: 0.25 },
  shigai: { ok: 0.6, unknown: 0.4, ng: 0.15 },
  // 基準地点の区域が分からない（対応県外など）: 二重割引を避けて保留。ただし建築不可だけは明らかに低いので減価
  other: { ok: 1.0, unknown: 1.0, ng: 0.25 },
}

// 旧データ（掛け率そのものを保存していた頃）の値を可否の区分に読み替える
export function normalizeKanou(v) {
  if (v === 'ok' || v === 'unknown' || v === 'ng') return v
  if (v === '0.7') return 'ok'
  if (v === '0.5') return 'ng'
  return KANOU_DEFAULT
}

// 地点データの区域コード k（scripts/tag_kuiki.py）→ 区域名
export function kuikiOfPoint(p) {
  if (!p || p.k == null) return null
  return { 2: '市街化区域', 3: '市街化調整区域', 1: '非線引き区域', 0: '都市計画区域外' }[p.k] ?? null
}

/**
 * @param {string} target 対象地の区域区分
 * @param {{status:string,kuiki?:string}|null|undefined} reference 基準にした地点の区域判定
 * @param {string} kanou 'ok' | 'unknown' | 'ng'（旧: '0.7' | '0.6' | '0.5'）
 */
export function regionalAdjustment(target, reference, kanou) {
  if (target !== '市街化調整区域') return { ratio: 1, reason: '' }
  const k = normalizeKanou(kanou)
  const refKuiki = reference?.status === 'ok' ? reference.kuiki : null
  if (refKuiki === '市街化調整区域') {
    return { ratio: TABLE.chousei[k], reason: `調整区域内の地点を基準（建築可なら×1.0・不明×0.6・不可×0.25）` }
  }
  if (refKuiki === '市街化区域') {
    return { ratio: TABLE.shigai[k], reason: `近くに調整区域の地点がなく、市街化区域の地点を基準（建築可×0.6・不明×0.4・不可×0.15）` }
  }
  return {
    ratio: TABLE.other[k],
    reason: k === 'ng'
      ? '基準地点の区域が未確認のため、建築できない土地の減価（×0.25）だけを反映'
      : '基準地点の区域が未確認のため、区域による補正は保留（×1.0）',
  }
}

// 対象地が調整区域のとき、基準にする「調整区域内の住宅地点」を探す（maxDist m 以内の最寄り）
export function pickChouseiBase(points, lat, lon, haversine, maxDist = 3000) {
  if (!points) return null
  let best = null
  for (const p of points) {
    if (p.k !== 3 || p.u !== '住宅地') continue
    const d = haversine(lat, lon, p.lat, p.lon)
    if (d <= maxDist && (!best || d < best.dist)) best = { ...p, dist: d }
  }
  return best
}
