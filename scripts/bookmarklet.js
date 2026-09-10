// 土地値チェッカー ブックマークレット（物件ページ→住所・価格・土地面積を拾って開く）
// 対応: SUUMO・アットホーム・楽待・健美家・HOME'S など「所在地／価格／土地面積」表記のあるページ全般
(function () {
  var t = document.body.innerText.replace(/\u3000/g, ' ');
  function grab(labels, re) {
    for (var i = 0; i < labels.length; i++) {
      var m = t.match(new RegExp(labels[i] + '[\s:：]*\n?\s*' + re));
      if (m) return m[1];
    }
    return null;
  }
  var ADDR = '((?:北海道|東京都|京都府|大阪府|[^\s\n]{1,3}県)[^\s\n【】\[\]()（）]{2,60})';
  var addr = grab(['所在地', '住所', '所在', '物件所在地'], ADDR);
  if (!addr) { var m0 = t.match(new RegExp(ADDR)); addr = m0 ? m0[1] : ''; }
  addr = addr.replace(/(地図|MAP|周辺|※|▶|＞|>).*$/, '').trim();
  var price = grab(['販売価格', '物件価格', '価格'], '((?:\d+億)?[\d,]*(?:\.\d+)?万円|\d+億円)') || '';
  var pm = price.match(/(?:(\d+)億)?([\d,]*(?:\.\d+)?)万?円/);
  var man = pm ? (Number(pm[1] || 0) * 10000 + Number((pm[2] || '0').replace(/,/g, ''))) : '';
  var area = grab(['土地面積', '敷地面積', '地積'], '([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|m²|平米)') || '';
  area = area.replace(/,/g, '');
  if (!addr) { alert('住所が見つかりませんでした。土地値チェッカーを開くので住所を入れてください。'); }
  var u = 'https://wandererharu-sudo.github.io/tochine/?addr=' + encodeURIComponent(addr) +
    '&price=' + encodeURIComponent(man) + '&area=' + encodeURIComponent(area) + '&unit=m2' +
    '&src=' + encodeURIComponent(location.href.split('#')[0]);
  window.open(u, '_blank') || (location.href = u);
})();
