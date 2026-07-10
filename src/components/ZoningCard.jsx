import { KUIKI_OPTIONS, YOUTO_OPTIONS } from '../lib/tax'

// 用途地域・区域区分の手入力欄（自動判定は未対応）
// 市街化調整区域かどうかで土地の価値が大きく変わるため、事前にわかっていれば入れてもらう
export default function ZoningCard({ kuiki, youto, onKuikiChange, onYoutoChange }) {
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
        <p className="warn-text">
          ⚠ 市街化調整区域: 原則として新築・建替えに許可が必要です。再建築の可否
          （既存宅地・用途変更等）で土地値が大きく変わるため、周辺の公示価格をそのまま
          当てはめると高く出すぎることがあります。
        </p>
      )}
      {kuiki === '都市計画区域外' && (
        <p className="warn-text">⚠ 都市計画区域外: 周辺に公示・調査地点が少なく、目安の精度が落ちます。</p>
      )}
      {youto === '工業専用地域' && (
        <p className="warn-text">⚠ 工業専用地域: 住宅は建築できません。</p>
      )}
      <p className="note">
        ※自動判定は未対応です。市町村の都市計画図・用途地域マップでご確認ください。
      </p>
    </section>
  )
}
