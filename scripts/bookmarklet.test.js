import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { readImportParams, importedRental } from '../src/lib/importParams.js'
const fixture = '所在地\n愛知県豊川市平尾町郷中\n販売価格\n280万円\n土地面積\n65.96㎡ 公簿\n'
function run(text, code = fs.readFileSync('scripts/bookmarklet.js','utf8')) {
  let result
  vm.runInNewContext(code, { document:{body:{innerText:text}},
    location:{href:'https://www.rakumachi.jp/example'}, window:{open:u=>{result=u; return true}}, alert:()=>{} })
  return readImportParams(new URL(result).search)
}
test('楽待の重複見出し・年間収入・仲介不要を取込', () => {
  const value = run(fixture + '想定年間収入\n想定年間収入\n660,000円\n(55,000円/月)\n弊社売主につき仲介手数料不要')
  assert.equal(value.addr, '愛知県豊川市平尾町郷中')
  assert.equal(value.price, '280'); assert.equal(value.area, '65.96')
  assert.equal(value.yachin, '5.5'); assert.equal(value.brokerage, 'none')
  const rental = importedRental({shokiMode:'linked'}, value)
  assert.equal(rental.yachin,'5.5'); assert.equal(rental.brokerage,'none')
  assert.equal(importedRental({}, null).yachin, '')
  assert.equal(importedRental({}, null).brokerage, 'estimate')
})
test('年間万円・月額万円・月額円を区別', () => {
  assert.equal(run(fixture+'想定年間収入 66.0万円').yachin,'5.5')
  assert.equal(run(fixture+'想定家賃 5.5万円').yachin,'5.5')
  assert.equal(run(fixture+'月額賃料 55,000円').yachin,'5.5')
})
test('欠落値・関連物件の仲介不要を引き継がない', () => {
  const value=run(fixture+'表面利回り23.57%\nこの物件に似た物件\n仲介手数料無料\n想定年間収入120万円')
  assert.equal(value.yachin,''); assert.equal(value.brokerage,'estimate')
  assert.equal(readImportParams('?addr=sample&rent=1.2.3').yachin,'')
  assert.equal(readImportParams('?addr=sample&src=javascript:alert(1)').src,'')
})
test('配布用リンクとソースが同じ結果を返す', () => {
  const packed=fs.readFileSync('scripts/bookmarklet.min.txt','utf8').trim()
  assert.ok(fs.readFileSync('public/bookmarklet.html','utf8').includes('href="'+packed+'"'))
  const text=fixture+'想定年間収入66万円\n仲介手数料不要'
  assert.deepEqual(run(text,decodeURIComponent(packed.slice('javascript:'.length))),run(text))
})
