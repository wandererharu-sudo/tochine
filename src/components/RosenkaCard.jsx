import { useEffect, useState } from 'react'
import { loadRosenka, findRosenka } from '../lib/rosenka'

// 国税庁 路線価図への直行リンク。町丁まで特定できたら図面PDF、
// できなければ市区町村の町名一覧ページへフォールバック。
// 路線価入力欄: 換算値（autoValue）を自動表示し、図面の実数値に書き換えると
// 全カードの計算が実路線価ベースに切り替わる
export default function RosenkaCard({ prefCode, title, value, autoValue, onChange }) {
  const [data, setData] = useState(undefined)

  useEffect(() => {
    let on = true
    setData(undefined)
    if (!prefCode) {
      setData(null)
      return
    }
    loadRosenka(prefCode).then((d) => on && setData(d))
    return () => {
      on = false
    }
  }, [prefCode])

  if (data === undefined) return null
  const r = data ? findRosenka(data, title) : null

  return (
    <section className="card">
      <h2>国税庁 路線価図 <span className="sub">相続税路線価の正式図面</span></h2>
      {r?.sheets?.length ? (
        <>
          <p className="rosenka-town">「{r.cityKey} {r.label}」の図面</p>
          <div className="rosenka-links">
            {r.sheets.map((n) => (
              <a
                key={n}
                className="rosenka-pdf"
                href={`${r.base}pdf/${n}.pdf`}
                target="_blank"
                rel="noreferrer"
              >
                📄 路線価図 {n}（PDF）↗
              </a>
            ))}
          </div>
          {r.sheets.length > 1 && (
            <p className="note">図面が複数に分かれています。位置に応じて該当する方をご覧ください。</p>
          )}
        </>
      ) : r?.cityPage ? (
        <p className="hint">
          この町名は索引で特定できませんでした（倍率地域の可能性もあります）。{' '}
          <a href={r.base + r.cityPage} target="_blank" rel="noreferrer">
            {r.cityKey}の町名一覧から探す ↗
          </a>
        </p>
      ) : (
        <p className="hint">
          この地域の路線価図索引が見つかりません（路線価図がなく評価倍率表のみの地域もあります）。{' '}
          <a href="https://www.rosenka.nta.go.jp/" target="_blank" rel="noreferrer">
            国税庁 路線価図トップ ↗
          </a>
        </p>
      )}

      <div className="rosenka-input-row">
        <label htmlFor="rosenka-num">前面道路の路線価</label>
        <input
          id="rosenka-num"
          type="number"
          inputMode="decimal"
          min="0"
          value={value !== '' ? value : autoValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="34"
        />
        <span>千円/㎡</span>
        {value !== '' ? (
          <span className="rosenka-mode manual">
            ✓ 図面の実数値で計算中
            <button type="button" className="rosenka-clear" onClick={() => onChange('')}>
              自動に戻す
            </button>
          </span>
        ) : (
          <span className="rosenka-mode auto">自動（近隣地点から換算）</span>
        )}
      </div>
      <p className="note">
        図面PDFで前面道路の数字（例: 34E → 34）を確認し、違っていれば書き換えてください。
        書き換えると評価額・土地値判定・税額が実路線価ベースになります（英字＝借地権割合は入力不要）。
      </p>
    </section>
  )
}
