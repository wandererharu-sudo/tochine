import { financing } from '../lib/costs'
import { formatYen } from '../lib/tax'

export default function FinancingCard({ price, chintai, costs, onChange, onCostsChange }) {
  const plan = financing(chintai, price)
  const linked = chintai.shokiMode === 'linked'
  return <section className="card inheritance-card" aria-labelledby="financing-title">
    <h2 id="financing-title">リフォーム込みの借入計画</h2>
    <div className="area-row">
      <label htmlFor="fin-purchase">予定購入価格</label>
      <input id="fin-purchase" type="number" inputMode="decimal" min="0" step="any"
        value={chintai.kakaku} placeholder={price || '500'} onChange={e => onChange({ ...chintai, kakaku: e.target.value })} />
      <span>万円（空欄なら販売価格）</span>
    </div>
    {linked ? <>
      <div className="area-row">
        <label htmlFor="fin-reform">リフォーム費</label>
        <input id="fin-reform" type="number" inputMode="decimal" min="0" step="any"
          value={costs.reform} onChange={e => onCostsChange({ ...costs, reform: e.target.value })} />
        <span>万円（仮予算150万円・変更可）</span>
      </div>
      <div className="area-row">
        <label htmlFor="fin-fees">諸費用・その他</label>
        <input id="fin-fees" type="number" inputMode="decimal" min="0" step="any"
          value={chintai.shohiyo} onChange={e => onChange({ ...chintai, shohiyo: e.target.value, shohiyoSource: 'manual' })} />
        <span>万円（{chintai.shohiyoSource === 'estimate' ? '概算連動中' : '手入力'}）</span>
      </div>
      <p className="hint">諸費用は購入価格と土地評価に基づく概算です。融資手数料・保証料・保険料・建物分の税など、未計上分は見積に合わせて加えてください。</p>
    </> : <p className="hint">保存済みの初期費用合計 {formatYen(plan.initial * 10000)} を使用中。
      <button type="button" className="copy-btn" onClick={() => onChange({ ...chintai, shokiMode: 'linked', manualShoki: chintai.shoki, shohiyoSource: 'estimate' })}>リフォーム別入力・諸費用概算に切り替える</button>
    </p>}
    {plan.purchase > 0 ? <>
      <div className="inheritance-total" aria-live="polite">
        <span>すべて借入した場合の必要借入額</span>
        <strong>{formatYen(plan.total * 10000)}</strong>
        <span>購入 {formatYen(plan.purchase * 10000)} ＋ 初期費用 {formatYen(plan.initial * 10000)}</span>
      </div>
      {linked && <p className="hint">初期費用＝リフォーム {costs.reform || 0}万円＋残置物処分 {costs.zanchi || 0}万円＋諸費用・その他 {chintai.shohiyo || 0}万円</p>}
    </> : <p className="hint">購入価格を入力すると、リフォームを含めた必要借入額を表示します。</p>}
    <label className="cost-link-toggle">
      <input type="checkbox" checked={chintai.loanMode === 'all'} onChange={e => onChange({ ...chintai, loanMode: e.target.checked ? 'all' : 'manual' })} />
      全額借入で返済・賃貸収支を計算する（自己資金0円）
    </label>
    <p className="hint">借入可能額の審査結果ではなく、入力した費用を全額借りる想定です。金利・期間は「貸した場合を見る」で変更できます。</p>
  </section>
}
