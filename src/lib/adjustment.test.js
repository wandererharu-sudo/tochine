import test from 'node:test'
import assert from 'node:assert/strict'
import { regionalAdjustment } from './adjustment.js'
import { evaluate } from './tax.js'
const target='市街化調整区域'
test('調整区域同士は追加減価せず約291万円',()=>{
 const correction=regionalAdjustment(target,{status:'ok',kuiki:target},'0.6')
 assert.equal(correction.ratio,1)
 assert.equal(evaluate(44100*correction.ratio,65.96).jika,2908836)
})
test('市街化区域の参考地点に切替した場合だけ補正',()=>{
 assert.equal(regionalAdjustment(target,{status:'ok',kuiki:'市街化区域'},'0.6').ratio,0.6)
 assert.equal(regionalAdjustment('市街化区域',{status:'ok',kuiki:target},'0.6').ratio,1)
})
test('判定待ち・エラー・対象外で無条件の減価をしない',()=>{
 for(const ref of [undefined,{status:'loading'},{status:'error'},{status:'ok',kuiki:'非線引き区域'}]) {
  assert.equal(regionalAdjustment(target,ref,'0.6').ratio,1)
 }
})
test('手入力路線価を優先',()=>{
 assert.equal(evaluate(44100*.6,65.96,35280).jika,2908836)
})
