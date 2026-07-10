// 国税庁 路線価図索引（public/rosenka/{県コード}.json）の読込と住所マッチング
// 索引は scripts/build_rosenka.py が生成。town キーは「青海町５」のように丁目数字を含む
const cache = {}

export async function loadRosenka(prefCode) {
  if (prefCode in cache) return cache[prefCode]
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}rosenka/${prefCode}.json`)
    cache[prefCode] = res.ok ? await res.json() : null
  } catch {
    cache[prefCode] = null
  }
  return cache[prefCode]
}

const KD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }

// 「五」「十」「二十三」「5」→ 数値（1〜99）
function kanji2num(s) {
  if (/^[0-9]+$/.test(s)) return Number(s)
  const m = /^([一二三四五六七八九])?(十)?([一二三四五六七八九])?$/.exec(s)
  if (!m || !(m[1] || m[2])) return null
  if (!m[2]) return KD[m[1]]
  return (m[1] ? KD[m[1]] : 1) * 10 + (m[3] ? KD[m[3]] : 0)
}

const toHalf = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
const norm = (s) => toHalf(s).replace(/[\s　]/g, '')
const stripOaza = (s) => s.replace(/^大字/, '')

// 検索住所（地理院ジオコーダのtitle）から該当市区町村・町丁の図面番号を探す
export function findRosenka(data, title) {
  if (!data || !title) return null
  const t = norm(title)
  // 市区町村: 索引キーが住所に含まれるもののうち最長（政令市は区単位のキー）
  let cityKey = null
  let pos = -1
  for (const k of Object.keys(data.cities)) {
    const i = t.indexOf(norm(k))
    if (i >= 0 && (cityKey === null || k.length > cityKey.length)) {
      cityKey = k
      pos = i
    }
  }
  if (!cityKey) return { base: data.base }
  const city = data.cities[cityKey]
  const rest = t.slice(pos + norm(cityKey).length)
  const towns = city.towns
  const nkeys = Object.keys(towns).map((k) => [norm(k), k])
  const result = (label, sheets) => ({ base: data.base, cityKey, cityPage: city.page, label, sheets })

  // 「○○N丁目」→ 索引キー「○○N」と完全一致
  const m = /^(.*?)([0-9]+|[一二三四五六七八九十]+)丁目/.exec(rest)
  if (m) {
    const num = kanji2num(m[2])
    if (num !== null) {
      const cand = stripOaza(m[1]) + num
      const hit = nkeys.find(([nk]) => stripOaza(nk) === cand)
      if (hit) return result(hit[1], towns[hit[1]])
    }
  }
  // 丁目なし: 数字の手前までを町名として完全一致 → 前方一致の合算
  const mb = /^[^0-9一二三四五六七八九十]+/.exec(rest)
  const baseName = stripOaza(mb ? mb[0] : rest)
  if (baseName) {
    const exact = nkeys.find(([nk]) => stripOaza(nk) === baseName)
    if (exact) return result(exact[1], towns[exact[1]])
    const hits = nkeys.filter(([nk]) => stripOaza(nk).startsWith(baseName))
    if (hits.length) {
      const nums = []
      for (const [, k] of hits) for (const n of towns[k]) if (!nums.includes(n)) nums.push(n)
      if (nums.length <= 6) return result(`${baseName}（丁目までは特定できず）`, nums)
    }
  }
  return result(null, null)
}
