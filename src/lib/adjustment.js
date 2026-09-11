// 対象地だけで減価しない。参考地点も同じ調整区域なら追加の区域補正を行わない。
export function regionalAdjustment(target, reference, factor) {
  if (target !== '市街化調整区域') return { ratio: 1, reason: '' }
  if (reference?.status === 'ok' && reference.kuiki === '市街化調整区域') {
    return { ratio: 1, reason: '参考地点も調整区域のため、区域による追加減価なし（×1.0）' }
  }
  if (reference?.status === 'ok' && reference.kuiki === '市街化区域') {
    const value = Number(factor)
    return { ratio: value > 0 && value <= 1 ? value : 1, reason: '市街化区域の参考地点からの概算補正' }
  }
  return { ratio: 1, reason: '参考地点の区域が未確認、または比較対象外のため区域補正は保留（×1.0）' }
}
