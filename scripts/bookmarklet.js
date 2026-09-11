// 土地値チェッカー ブックマークレット（物件ページ→住所・価格・土地面積を拾って開く）
// 対応: SUUMO・アットホーム・楽待・健美家・HOME'S など「所在地／価格／土地面積」表記のあるページ全般
// 注意: 正規表現は必ずリテラル（/.../）で書く。文字列連結で組むとバックスラッシュが落ちて壊れる（2026-09-11）
(function () {
  var t = document.body.innerText.replace(/　/g, ' ');
  var SEP = /[\s:：]*\n?\s*/.source;
  function grab(labels, re) {
    for (var i = 0; i < labels.length; i++) {
      var m = t.match(new RegExp(labels[i] + SEP + re.source));
      if (m) return m[1];
    }
    return null;
  }
  var ADDR = /((?:北海道|東京都|京都府|大阪府|[^\s\n]{1,3}県)[^\s\n【】\[\]()（）]{2,60})/;
  var addr = grab(['所在地', '住所', '所在', '物件所在地'], ADDR);
  if (!addr) { var m0 = t.match(ADDR); addr = m0 ? m0[1] : ''; }
  addr = addr.replace(/(地図|MAP|周辺|※|▶|＞|>).*$/, '').trim();
  var price = grab(['販売価格', '物件価格', '価格'], /((?:\d+億)?[\d,]*(?:\.\d+)?万円|\d+億円)/) || '';
  var pm = price.match(/(?:(\d+)億)?([\d,]*(?:\.\d+)?)万?円/);
  var man = pm ? (Number(pm[1] || 0) * 10000 + Number((pm[2] || '0').replace(/,/g, ''))) : '';
  var area = grab(['土地面積', '敷地面積', '地積'], /([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|m²|平米)/) || '';
  area = area.replace(/,/g, '');
  // 年間収入を月額万円へ換算。重複する見出し（楽待）にも対応する。
  var detailsText = t.split(/この物件に似た|この物件を見た|この不動産会社の他の/)[0];
  var rent = '';
  var income = detailsText.match(/(?:想定年間収入|満室想定年収|年間収入)(?:[\s:：]*(?:想定年間収入|満室想定年収|年間収入))*[\s:：]*([\d,]+(?:\.\d+)?)\s*(万円|円)/);
  var monthly = detailsText.match(/(?:想定月額賃料|想定家賃|月額賃料)[\s:：]*([\d,]+(?:\.\d+)?)\s*(万円|円)/);
  if (monthly) rent = String(Number(monthly[1].replace(/,/g, '')) / (monthly[2] === '円' ? 10000 : 1));
  else if (income) rent = String(Math.round(Number(income[1].replace(/,/g, '')) / (income[2] === '円' ? 10000 : 1) / 12 * 10000) / 10000);
  // 関連物件一覧を判定対象に混ぜない。
  var brokerage = /仲介手数料[\s:：]*(?:は[\s]*)?(?:不要|無料|なし|無し|0\s*円|０\s*円)/.test(detailsText) ? 'none' : '';
  if (!addr) { alert('住所が見つかりませんでした。土地値チェッカーを開くので住所を入れてください。'); }
  var u = 'https://wandererharu-sudo.github.io/tochine/?addr=' + encodeURIComponent(addr) +
    '&price=' + encodeURIComponent(man) + '&area=' + encodeURIComponent(area) + '&unit=m2' +
    '&rent=' + encodeURIComponent(rent) + '&brokerage=' + encodeURIComponent(brokerage) +
    '&src=' + encodeURIComponent(location.href.split('#')[0]);
  window.open(u, '_blank') || (location.href = u);
})();
