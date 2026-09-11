import test from 'node:test'
import assert from 'node:assert/strict'
import { syncInitialCosts, restoreInitialCosts, purchaseCosts, effectiveRental } from './costs.js'

test('仲介不要はゼロで諸費用から除外', () => {
  const normal=purchaseCosts(2800000,2036185)
  const direct=purchaseCosts(2800000,2036185,'none')
  assert.equal(direct.chukai,0)
  assert.equal(normal.total-direct.total,158400)
})
test('概算連動後に仲介設定や価格を変えても初期費用が追従', () => {
  const costs={reform:'100',zanchi:'10'}
  const rental={shokiMode:'linked',shohiyoSource:'estimate',brokerage:'estimate'}
  const normal=effectiveRental(rental,costs,2800000,2036185)
  const direct=effectiveRental({...normal,brokerage:'none'},costs,2800000,2036185)
  assert.equal(Number(direct.shoki),110+Math.ceil(purchaseCosts(2800000,2036185,'none').total/10000))
  assert.ok(Number(normal.shoki)>Number(direct.shoki))
  const restored=JSON.parse(JSON.stringify(direct))
  assert.deepEqual(effectiveRental(restored,costs,2800000,2036185),direct)
})
test('手入力の諸費用や旧データの合計は上書きしない', () => {
  const manual=effectiveRental({shokiMode:'linked',shohiyoSource:'manual',shohiyo:'50',brokerage:'none'},{reform:'100'},2800000,2036185)
  assert.equal(manual.shoki,'150')
  assert.equal(effectiveRental({shoki:'150'},{reform:'100'},2800000,2036185).shoki,'150')
})

test('連動合計にはリフォーム・残置物・諸費用だけを含める', () => {
  const result = syncInitialCosts({ shokiMode: 'linked', shohiyo: '35' },
    { reform: '100', zanchi: '10', kaitai: '200', safety: '10' })
  assert.equal(result.shoki, '145')
})
test('リフォーム変更と諸費用の繰り返し反映で二重加算しない', () => {
  let rental = { shokiMode: 'linked', shohiyo: '35', yachin: '6' }
  rental = syncInitialCosts(rental, { reform: '100', zanchi: '10' })
  rental = syncInitialCosts({ ...rental, shohiyo: '40' }, { reform: '120', zanchi: '10' })
  rental = syncInitialCosts(rental, { reform: '120', zanchi: '10' })
  assert.equal(rental.shoki, '170')
  assert.equal(rental.yachin, '6')
})
test('空欄・ゼロ・小数を扱える', () => {
  assert.equal(syncInitialCosts({ shokiMode: 'linked', shohiyo: '' }, {}).shoki, '0')
  assert.equal(syncInitialCosts({ shokiMode: 'linked', shohiyo: '0.1' }, { reform: '0.2' }).shoki, '0.3')
})
test('従来の保存金額はリフォームを重ねず手入力で復元する', () => {
  const restored = restoreInitialCosts({ shoki: '150', yachin: '6' }, { shokiMode: 'linked' }, { reform: '100' })
  assert.equal(restored.shokiMode, 'manual')
  assert.equal(syncInitialCosts(restored, { reform: '200' }).shoki, '150')
})
test('連動保存データのJSON往復後も合計と設定を維持する', () => {
  const costs = { reform: '100', zanchi: '10' }
  const saved = JSON.parse(JSON.stringify(syncInitialCosts({ shokiMode: 'linked', shohiyo: '35' }, costs)))
  const restored = restoreInitialCosts(saved, {}, costs)
  assert.equal(restored.shoki, '145')
  assert.equal(restored.shokiMode, 'linked')
})
