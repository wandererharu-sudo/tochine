import test from 'node:test'
import assert from 'node:assert/strict'
import { regionalAdjustment, normalizeKanou, pickChouseiBase, kuikiOfPoint } from './adjustment.js'
import { haversine } from './geo.js'

const target = '市街化調整区域'
const cho = { status: 'ok', kuiki: target }
const shi = { status: 'ok', kuiki: '市街化区域' }

test('対象地が調整区域でなければ補正しない', () => {
  assert.equal(regionalAdjustment('市街化区域', cho, 'ng').ratio, 1)
})

test('調整区域内の地点が基準: 建築可1.0・不明0.6・不可0.25', () => {
  assert.equal(regionalAdjustment(target, cho, 'ok').ratio, 1.0)
  assert.equal(regionalAdjustment(target, cho, 'unknown').ratio, 0.6)
  assert.equal(regionalAdjustment(target, cho, 'ng').ratio, 0.25)
})

test('市街化区域の地点が基準: 建築可0.6・不明0.4・不可0.15', () => {
  assert.equal(regionalAdjustment(target, shi, 'ok').ratio, 0.6)
  assert.equal(regionalAdjustment(target, shi, 'unknown').ratio, 0.4)
  assert.equal(regionalAdjustment(target, shi, 'ng').ratio, 0.15)
})

test('基準地点の区域が未確認なら保留、ただし建築不可は0.25', () => {
  for (const ref of [undefined, null, { status: 'loading' }, { status: 'error' }, { status: 'ok', kuiki: '非線引き区域' }]) {
    assert.equal(regionalAdjustment(target, ref, 'unknown').ratio, 1)
    assert.equal(regionalAdjustment(target, ref, 'ng').ratio, 0.25)
  }
})

test('旧データの掛け率を可否の区分に読み替える', () => {
  assert.equal(normalizeKanou('0.7'), 'ok')
  assert.equal(normalizeKanou('0.6'), 'unknown')
  assert.equal(normalizeKanou('0.5'), 'ng')
  assert.equal(normalizeKanou(undefined), 'unknown')
  assert.equal(regionalAdjustment(target, shi, '0.6').ratio, 0.4)
})

test('調整区域の住宅地点を3km以内で探す', () => {
  const pts = [
    { n: 'A', u: '住宅地', k: 2, lat: 34.80, lon: 136.85, p: 60000 },
    { n: 'B', u: '住宅地', k: 3, lat: 34.81, lon: 136.85, p: 30000 },
    { n: 'C', u: '商業地', k: 3, lat: 34.80, lon: 136.851, p: 50000 },
    { n: 'D', u: '住宅地', k: 3, lat: 34.90, lon: 136.85, p: 20000 },
  ]
  const base = pickChouseiBase(pts, 34.80, 136.85, haversine)
  assert.equal(base.n, 'B')
  assert.ok(base.dist > 1000 && base.dist < 1200)
  assert.equal(pickChouseiBase(pts.filter((p) => p.n !== 'B'), 34.80, 136.85, haversine), null)
  assert.equal(kuikiOfPoint(base), '市街化調整区域')
  assert.equal(kuikiOfPoint({}), null)
})
