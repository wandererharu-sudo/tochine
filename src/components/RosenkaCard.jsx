import { useEffect, useState } from 'react'
import { loadRosenka, findRosenka } from '../lib/rosenka'

// 国税庁 路線価図への直行リンク。町丁まで特定できたら図面PDF、
// できなければ市区町村の町名一覧ページへフォールバック
export default function RosenkaCard({ prefCode, title }) {
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
    </section>
  )
}
