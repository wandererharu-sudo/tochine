import { KUIKI_OPTIONS, YOUTO_OPTIONS, CHOUSEI_OPTIONS } from '../lib/tax'

// 用途地域・区域区分の手入力欄（自動判定は未対応）
// 市街化調整区域を選ぶと減価補正セレクトが現れ、評価額・土地値の概算に掛け率が反映される
export default function ZoningCard({ kuiki, youto, chousei, onKuikiChange, onYoutoChange, onChouseiChange }) {
  return (
    <section className="card">
      <h2>用途地域 <span className="sub">事前にわかっていれば入力（保存リストに残ります）</span></h2>
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
            <label htmlFor="chousei">調整区域補正</label>
            <select id="chousei" value={chousei} onChange={(e) => onChouseiChange(e.target.value)}>
              {CHOUSEI_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <p className="warn-text">
            ⚠ 市街化調整区域: 原則として新築・建替えに許可が必要です。周辺の公示価格を
            そのまま当てはめると高く出すぎるため、上の掛け率（×{chousei}）で
            評価額・土地値・税額の概算に反映しています。
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
        ※自動判定は未対応です。市町村の都市計画図・用途地域マップでご確認ください。
        補正率は概算の目安で、実勢は再建築可否・接道・周辺需要で大きく変わります。
      </p>
    </section>
  )
}
