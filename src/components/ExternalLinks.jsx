// 正確な確認のための外部リンク集（すべて新規タブ）
export default function ExternalLinks({ lat, lon }) {
  const links = [
    {
      href: `https://www.reinfolib.mlit.go.jp/realEstatePrices/#15/${lat}/${lon}`,
      label: '不動産情報ライブラリ（地図で公示価格・用途地域を確認）',
    },
    {
      href: `https://maps.gsi.go.jp/#16/${lat}/${lon}`,
      label: '地理院地図（位置の確認）',
    },
    {
      href: 'https://www.chikamap.jp/',
      label: '全国地価マップ（固定資産税路線価の正確な確認・住所で検索）',
    },
  ]
  return (
    <section className="card">
      <h2>正確に確認するには</h2>
      <ul className="links">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>
          </li>
        ))}
      </ul>
    </section>
  )
}
