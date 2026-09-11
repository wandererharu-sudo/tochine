import { KUIKI_OPTIONS, YOUTO_OPTIONS, CHOUSEI_OPTIONS } from '../lib/tax'

// 用途地域・区域区分。対応県（public/youto/ 同梱）は国土数値情報から自動判定し、手入力で上書きできる
// 市街化調整区域を選ぶと減価補正セレクトが現れ、評価額・土地値の概算に掛け率が反映される
function AutoLine({ auto }) {
  if (!auto) return null
  if (auto.status === 'loading') return <p className="auto-line">自動判定中…</p>
  if (auto.status === 'unsupported') {
    return (
      <p className="auto-line muted">
        自動判定はこの県は未対応です（対応: 愛知）。市町村の都市計画図でご確認ください。
      </p>
    )
  }
  if (auto.status === 'error') return <p className="auto-line muted">自動判定に失敗しました（通信エラー）。</p>
  const src = auto.years
    ? `国土数値情報 用途地域${auto.years.youto}年度・区域区分${auto.years.kuiki}年度`
    : '国土数値情報'
  if (auto.status === 'none') {
    return (
      <p className="auto-line">
        自動判定: 用途地域・市街化区域・調整区域のどれにも入りませんでした。
        都市計画区域外か非線引きの白地の可能性があります。<span className="muted">［{src}］</span>
      </p>
    )
  }
  return (
    <p className="auto-line">
      自動判定: <strong>{auto.kuiki}</strong>
      {auto.youto && (
        <>
          {' ／ '}<strong>{auto.youto}</strong>
          {auto.kenpei != null && auto.youseki != null && (
            <>（建ぺい率{auto.kenpei}%・容積率{auto.youseki}%）</>
          )}
        </>
      )}
      {!auto.youto && auto.kuiki === '市街化調整区域' && '（用途地域の指定なし）'}
      <span className="muted">［{src}］</span>
    </p>
  )
}

export default function ZoningCard({ kuiki, youto, chousei, onKuikiChange, onYoutoChange, onChouseiChange, auto, correction }) {
  return (
    <section className="card">
      <h2>用途地域 <span className="sub">自動判定は参考値。違っていれば選び直してください</span></h2>
      <AutoLine auto={auto} />
      <div className="area-row">
        <label htmlFor="kuiki">区域区分</label>
        <select id="kuiki" value={kuiki} onChange={(e) => onKuikiChange(e.target.value)}>
          <option value="">未確認</option>
          {KUIKI_OPTIONS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className="area-row">
        <label htmlFor="youto">用途地域</label>
        <select id="youto" value={youto} onChange={(e) => onYoutoChange(e.target.value)}>
          <option value="">未確認</option>
          {YOUTO_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      {kuiki === '市街化調整区域' && (
        <>
          <div className="area-row">
            <label htmlFor="chousei">市街化区域の地点を使う場合の補正</label>
            <select id="chousei" value={chousei} disabled={correction?.ratio === 1} onChange={(e) => onChouseiChange(e.target.value)}>
              {CHOUSEI_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <p className="warn-text">
            {correction?.reason}。参考地点も調整区域なら、区域を理由にさらに減価しません。
            接道・再建築可否など個別条件の比較は別途必要です。
          </p>
        </>
      )}
      {kuiki === '都市計画区域外' && (
        <p className="warn-text">⚠ 都市計画区域外: 周辺に公示・調査地点が少なく、目安の精度が落ちます。</p>
      )}
      {youto === '工業専用地域' && (
        <p className="warn-text">⚠ 工業専用地域: 住宅は建築できません。</p>
      )}
      <p className="note">
        ※自動判定は国土数値情報の年版データによる参考値で、境界付近や最近の都市計画変更は反映されません。
        購入判断・申請の前に市町村の都市計画図・用途地域マップでご確認ください。
        補正率は概算の目安で、実勢は再建築可否・接道・周辺需要で大きく変わります。
      </p>
    </section>
  )
}
