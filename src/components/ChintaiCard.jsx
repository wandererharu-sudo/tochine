import { evaluate, taxEstimate, formatYen, tsuboToM2 } from '../lib/tax'

// 賃貸収支の概算（築古戸建て投資向け）
// 固定資産税は税額カードと同じ計算値（住宅用地特例あり側・市街化区域以外は都計税なし）を年間経費に自動計上する
// 借入欄に入力すると元利均等の月返済・返済比率・返済後手取りも出す
export default function ChintaiCard({ point, area, unit, actualRosenka, price, kuiki, chintai, onChange }) {
  const areaM2 = unit === 'tsubo' ? tsuboToM2(Number(area) || 0) : Number(area) || 0
  if (!(areaM2 > 0)) return null
  const ev = evaluate(point.p, areaM2, actualRosenka)
  const tax = taxEstimate(ev.kotei, areaM2)
  const noToshikei = kuiki !== '' && kuiki != null && kuiki !== '市街化区域'
  const koteiTax = tax ? (noToshikei ? tax.residential.kotei : tax.residential.total) : 0

  const set = (key) => (e) => onChange({ ...chintai, [key]: e.target.value })

  const kakaku = (Number(chintai.kakaku) || Number(price) || 0) * 10000
  const shoki = (Number(chintai.shoki) || 0) * 10000
  const yachin = (Number(chintai.yachin) || 0) * 10000
  const keihiPct = Number(chintai.keihi) || 0

  const total = kakaku + shoki // 総投資額
  const nenshu = yachin * 12 // 年間家賃
  const keihi = Math.round(nenshu * (keihiPct / 100)) // 管理・空室・修繕
  const tedori = nenshu - keihi - koteiTax // 年間手取り（返済前）
  const ready = total > 0 && yachin > 0

  // 諸費用の参考概算（購入時にかかる主なもの・建物分の税は評価不明のため土地分のみ）
  // 登記=登録免許税（土地の固定資産税評価額×2%）+司法書士報酬8万、取得税=評価額×1/2×3%（宅地特例）
  const chukai = kakaku > 0 ? Math.round((kakaku * 0.03 + 60000) * 1.1) : 0
  const touki = Math.round(ev.kotei * 0.02) + 80000
  const shutoku = Math.round(ev.kotei * 0.5 * 0.03)
  const inshi = 10000
  const shohiSum = chukai + touki + shutoku + inshi

  // 借入（元利均等・任意入力）
  const kariire = (Number(chintai.kariire) || 0) * 10000
  const kinri = Number(chintai.kinri) || 0
  const kikan = Number(chintai.kikan) || 0
  let monthly = 0
  if (kariire > 0 && kikan > 0) {
    const r = kinri / 100 / 12
    const n = kikan * 12
    monthly = r > 0 ? (kariire * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : kariire / n
  }
  const hensaiHi = monthly > 0 && yachin > 0 ? (monthly / yachin) * 100 : null
  const hensaiCls = hensaiHi === null ? '' : hensaiHi <= 50 ? 'good' : hensaiHi <= 60 ? 'soso' : 'bad'
  const nenHensai = Math.round(monthly * 12)
  const tedoriAfter = tedori - nenHensai
  const jikoShikin = total - kariire

  return (
    <section className="card">
      <h2>賃貸収支 <span className="sub">買って貸した場合（概算）</span></h2>
      <div className="area-row">
        <label htmlFor="ch-kakaku">購入価格</label>
        <input
          id="ch-kakaku"
          type="number"
          inputMode="decimal"
          min="0"
          value={chintai.kakaku}
          onChange={set('kakaku')}
          placeholder={price || '500'}
        />
        <span>万円 <span className="note">空欄なら販売価格を使用</span></span>
      </div>
      <div className="area-row">
        <label htmlFor="ch-yachin">想定家賃</label>
        <input
          id="ch-yachin"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={chintai.yachin}
          onChange={set('yachin')}
          placeholder="6"
        />
        <span>万円/月</span>
      </div>
      <div className="area-row">
        <label htmlFor="ch-shoki">初期費用</label>
        <input
          id="ch-shoki"
          type="number"
          inputMode="decimal"
          min="0"
          value={chintai.shoki}
          onChange={set('shoki')}
          placeholder="150"
        />
        <span>万円 <span className="note">リフォーム・諸費用など</span></span>
      </div>
      {kakaku > 0 && (
        <p className="shohi-hint">
          参考・諸費用の概算 <b>{formatYen(shohiSum)}</b>
          <span className="note">
            ＝仲介 {formatYen(chukai)}＋登記 {formatYen(touki)}＋不動産取得税 {formatYen(shutoku)}＋印紙 {formatYen(inshi)}
          </span>
          <button
            type="button"
            className="copy-btn"
            onClick={() =>
              onChange({ ...chintai, shoki: String(Math.ceil(shohiSum / 10000)) })
            }
          >
            初期費用欄へ入れる
          </button>
          <span className="note">（リフォーム分は足してください）</span>
        </p>
      )}
      <div className="area-row">
        <label htmlFor="ch-keihi">運営経費率</label>
        <input
          id="ch-keihi"
          type="number"
          inputMode="decimal"
          min="0"
          max="100"
          value={chintai.keihi}
          onChange={set('keihi')}
          placeholder="15"
        />
        <span>％ <span className="note">管理料・空室・修繕のならし</span></span>
      </div>

      <div className="kariire-row">
        <span className="kariire-head">借入で買う場合（任意）</span>
        <span className="cost-input">
          借入額
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={chintai.kariire}
            onChange={set('kariire')}
            placeholder="0"
          />
          万円
        </span>
        <span className="cost-input">
          金利
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={chintai.kinri}
            onChange={set('kinri')}
            placeholder="2.0"
          />
          ％
        </span>
        <span className="cost-input">
          期間
          <input
            type="number"
            inputMode="decimal"
            min="1"
            value={chintai.kikan}
            onChange={set('kikan')}
            placeholder="15"
          />
          年
        </span>
      </div>

      {ready ? (
        <table className="val-table">
          <tbody>
            <tr>
              <th>総投資額<span className="note">（購入＋初期費用）</span></th>
              <td className="total">{formatYen(total)}</td>
            </tr>
            <tr>
              <th>年間家賃収入</th>
              <td>{formatYen(nenshu)}</td>
            </tr>
            <tr className="main-row">
              <th>表面利回り</th>
              <td className="total">{((nenshu / total) * 100).toFixed(1)}％</td>
            </tr>
            <tr>
              <th>− 運営経費（{keihiPct}％）</th>
              <td>−{formatYen(keihi)}</td>
            </tr>
            <tr>
              <th>− 固定資産税{!noToshikei && '・都計税'}<span className="note">（税額カードと同じ概算）</span></th>
              <td>−{formatYen(koteiTax)}</td>
            </tr>
            <tr className={monthly > 0 ? '' : 'main-row'}>
              <th>年間手取り／実質利回り{monthly > 0 && <span className="note">（返済前）</span>}</th>
              <td className={monthly > 0 ? '' : 'total'}>
                {formatYen(tedori)}／{((tedori / total) * 100).toFixed(1)}％
              </td>
            </tr>
            {monthly > 0 ? (
              <>
                <tr>
                  <th>− 年間返済<span className="note">（月 {formatYen(Math.round(monthly))}・元利均等{kinri}％/{kikan}年）</span></th>
                  <td>−{formatYen(nenHensai)}</td>
                </tr>
                <tr className="main-row">
                  <th>返済比率<span className="note">（月返済÷月家賃・50％以下が安全圏）</span></th>
                  <td className={`total judge-cell ${hensaiCls}`}>{hensaiHi.toFixed(0)}％</td>
                </tr>
                <tr className="main-row">
                  <th>返済後の年間手取り</th>
                  <td className={`total ${tedoriAfter < 0 ? 'over' : ''}`}>{formatYen(tedoriAfter)}</td>
                </tr>
                <tr>
                  <th>自己資金 {formatYen(jikoShikin)} の回収目安</th>
                  <td>
                    {tedoriAfter > 0
                      ? jikoShikin > 0
                        ? `約${(jikoShikin / tedoriAfter).toFixed(1)}年`
                        : 'フルローン（持ち出しなし）'
                      : '回収できません'}
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <th>投資回収の目安</th>
                <td>{tedori > 0 ? `約${(total / tedori).toFixed(1)}年` : '回収できません'}</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <p className="hint">想定家賃（と購入価格）を入れると収支が出ます</p>
      )}
      {ready && (monthly > 0 ? tedoriAfter : tedori) <= 0 && (
        <p className="warn-text">⚠ 手取りがマイナスです。家賃・購入価格・借入条件を見直してください。</p>
      )}
      <p className="note">
        ※所得税・大規模修繕・退去リフォームは含みません。諸費用の概算は
        登録免許税2％（軽減適用なら下がります）＋司法書士報酬8万・取得税は宅地の1/2特例で土地分のみの粗い目安です。
      </p>
    </section>
  )
}
