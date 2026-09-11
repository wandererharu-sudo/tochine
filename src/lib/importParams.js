export function readImportParams(search) {
  const q = new URLSearchParams(search)
  const addr = (q.get('addr') || '').trim()
  if (!addr) return null
  const num = (v) => {
    const clean = (v || '').replace(/,/g, '').trim()
    return /^\d+(?:\.\d+)?$/.test(clean) && Number.isFinite(Number(clean)) ? clean : ''
  }
  const src = (q.get('src') || '').trim()
  return { addr, price: num(q.get('price')), area: num(q.get('area')),
    unit: q.get('unit') === 'tsubo' ? 'tsubo' : 'm2',
    yachin: num(q.get('rent')), brokerage: q.get('brokerage') === 'none' ? 'none' : 'estimate',
    src: /^https?:\/\//i.test(src) ? src : '', memo: (q.get('memo') || '').trim() }
}

export function importedRental(defaults, imported) {
  return { ...defaults, yachin: imported?.yachin || '',
    brokerage: imported?.brokerage || 'estimate' }
}
