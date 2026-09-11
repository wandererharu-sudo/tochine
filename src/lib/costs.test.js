import test from 'node:test'
import assert from 'node:assert/strict'
import { syncInitialCosts, restoreInitialCosts } from './costs.js'

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
