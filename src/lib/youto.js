// 用途地域・区域区分の自動判定（国土数値情報 A29/A09 を public/youto/ に同梱、対応県のみ）
// 手順: index.json で県対応を確認 → GSI逆ジオコーダで市町村コード → 市町村ファイルを取得 → 点が入る区画を探す
// 見つからなければ県の区域区分ファイル（kuiki.json）で 市街化区域/調整区域/非線引き を判定する

const BASE = `${import.meta.env.BASE_URL}youto/`
const cache = {} // {url: Promise<json>}

function getJson(url) {
  if (!cache[url]) {
    cache[url] = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
      return r.json()
    })
    cache[url].catch(() => { delete cache[url] })
  }
  return cache[url]
}

// ring は [x,y,x,y,...] の平坦配列（閉じ点なし）。レイキャスティング法
function pointInRing(x, y, ring) {
  let inside = false
  const n = ring.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2]; const yi = ring[i * 2 + 1]
    const xj = ring[j * 2]; const yj = ring[j * 2 + 1]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// feature.p = [polygon...]、polygon = [外周ring, 穴ring...]
function pointInFeature(x, y, f) {
  const [minx, miny, maxx, maxy] = f.b
  if (x < minx || x > maxx || y < miny || y > maxy) return false
  for (const rings of f.p) {
    if (!pointInRing(x, y, rings[0])) continue
    let inHole = false
    for (let k = 1; k < rings.length; k++) {
      if (pointInRing(x, y, rings[k])) { inHole = true; break }
    }
    if (!inHole) return true
  }
  return false
}

async function muniCodeOf(lat, lon) {
  const res = await fetch(
    `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lon}`)
  const j = await res.json()
  const m = j?.results?.muniCd
  return m ? String(m).padStart(5, '0') : null
}

/**
 * @returns {Promise<{status:'unsupported'|'ok'|'none'|'error', youto?:string, kenpei?:number, youseki?:number,
 *   kuiki?:string, years?:{youto:string,kuiki:string}, muni?:string}>}
 */
export async function lookupZoning(lat, lon, prefCode) {
  try {
    const index = await getJson(`${BASE}index.json`)
    const pref = prefCode && index[prefCode]
    if (!pref) return { status: 'unsupported', supported: Object.keys(index) }
    const years = { youto: pref.youto_year, kuiki: pref.kuiki_year }

    // 区域区分（県1ファイル・小さいので先に引く）
    // A09 は 都市計画区域(1) ⊃ 市街化区域(2) / 市街化調整区域(3) の重ね合わせなので、全ヒットを集めて判定する
    let kuiki = ''
    let inToshi = false
    try {
      const kf = await getJson(`${BASE}${prefCode}/kuiki.json`)
      const codes = new Set(kf.filter((f) => pointInFeature(lon, lat, f)).map((f) => String(f.c)))
      inToshi = codes.has('1')
      if (codes.has('3')) kuiki = '市街化調整区域'
      else if (codes.has('2')) kuiki = '市街化区域'
      else if (inToshi) kuiki = '非線引き区域'
    } catch { /* 区域区分ファイルが無い県は用途地域だけで判定 */ }

    // 用途地域（市町村ファイル）: index の市町村バウンディングボックスで候補を絞り、順に当たる
    // （用途地域は市街化区域内にしか無いので、調整区域の点は候補があっても空振りで終わる）
    let hit = null
    let muni = null
    const cands = Object.entries(pref.munis)
      .filter(([, b]) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3])
      .map(([code]) => code)
    for (const code of cands) {
      const feats = await getJson(`${BASE}${prefCode}/${code}.json`)
      const f = feats.find((ft) => pointInFeature(lon, lat, ft))
      if (f) { hit = f; muni = code; break }
    }
    if (!hit && cands.length === 0 && kuiki === '市街化区域') {
      // bbox に入らないのに市街化区域と出た場合だけ逆ジオコーダで市町村を確定して再挑戦（境界誤差の保険）
      const m = await muniCodeOf(lat, lon).catch(() => null)
      const code = m && (pref.munis[m] ? m : pref.munis[m.slice(0, 2) + '100'] ? m.slice(0, 2) + '100' : null)
      if (code) {
        const feats = await getJson(`${BASE}${prefCode}/${code}.json`)
        hit = feats.find((ft) => pointInFeature(lon, lat, ft)) ?? null
        muni = code
      }
    }
    if (hit) {
      // 用途地域が指定されている地点は市街化区域（非線引き区域の用途地域だけは A09 の判定を優先）
      // ※A09 は 2006年版で古いため、用途地域あり＝調整区域 という矛盾は新しい A29 側を正とする
      if (kuiki !== '非線引き区域') kuiki = '市街化区域'
      return { status: 'ok', youto: hit.n, kenpei: hit.k, youseki: hit.y, kuiki, years, muni }
    }
    if (kuiki) return { status: 'ok', youto: '', kuiki, years, muni }
    // 都市計画区域のどれにも入らない＝都市計画区域外（A09 2006年版の範囲での判定）
    return { status: 'ok', youto: '', kuiki: '都市計画区域外', years, muni, weak: true }
  } catch (e) {
    return { status: 'error', message: String(e) }
  }
}
