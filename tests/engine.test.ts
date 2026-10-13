import test from 'node:test';
import assert from 'node:assert/strict';
import { Lifetime } from '../src/engine/lifecycle.ts';
import { ObjectPool } from '../src/engine/object-pool.ts';
import { AssetRegistry } from '../src/engine/assets/asset-registry.ts';
import { advanceAlongLane,canDeployAt,pickDeployment } from '../src/core/physics/lane-space.ts';
test('scene lifetime cleans every resource once even if one cleanup fails',()=>{
  const lifetime=new Lifetime(),calls:number[]=[];
  lifetime.defer(()=>calls.push(1));lifetime.defer(()=>{calls.push(2);throw Error('cleanup');});
  lifetime.own({dispose:()=>{calls.push(3);}});assert.throws(()=>lifetime.dispose(),AggregateError);
  lifetime.dispose();assert.deepEqual(calls,[3,2,1]);
});
test('bounded pool reuses released objects and rejects duplicate release',()=>{
  let id=0,destroyed=0;const pool=new ObjectPool(2,()=>({id:++id}),()=>{},()=>destroyed++);
  const a=pool.acquire()!,b=pool.acquire();assert.equal(pool.acquire(),null);
  pool.release(a);pool.release(a);assert.equal(pool.acquire(),a);assert.equal(pool.used,2);
  assert.ok(b);pool.dispose();assert.equal(destroyed,2);assert.equal(pool.size,0);
});
test('asset registry validates identifiers and lazily loads once',()=>{
  const assets=new AssetRegistry<object>();let loads=0,disposals=0;
  assets.register({id:'hero',create:()=>{loads++;return {};},dispose:()=>disposals++});
  assert.equal(assets.get('hero'),assets.get('hero'));assert.equal(loads,1);
  assert.throws(()=>assets.get('missing'));assert.throws(()=>assets.register({id:'hero',create:()=>({})}));
  assets.dispose();assert.equal(disposals,1);
});
test('lane physics clamps movement and matches deployment hit tests for all three lanes',()=>{
  assert.equal(advanceAlongLane(13,1,10,1),14);assert.equal(advanceAlongLane(-13,-1,10,1),-14);
  assert.ok(canDeployAt(0,-12));assert.ok(!canDeployAt(0,12));assert.ok(!canDeployAt(1,NaN));
  [-4.8,0,4.8].forEach((z,lane)=>{assert.equal(pickDeployment(-12,z).lane,lane);assert.ok(pickDeployment(-12,z).valid);});
  assert.ok(!pickDeployment(-12,2.4).valid);
});
