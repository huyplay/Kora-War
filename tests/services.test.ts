import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, loadSave, saveGame } from '../src/services/save-store.ts';
import { FixedStepRunner } from '../src/app/fixed-step-runner.ts';
import { DEFAULT_DECK } from '../src/data/index.ts';
import { Battle } from '../src/core/index.ts';

test('corrupt, null and incompatible saves do not prevent startup', () => {
  for(const raw of ['null','[]','broken','"text"','{"deck":"lyra"}','{"deck":["toString","lyra","brann","solan"]}','{"deck":["solan","solan","lyra","brann"]}']) {
    assert.deepEqual(parseSave(raw).deck, DEFAULT_DECK);
  }
  const data=parseSave('{"wins":-9,"quality":"ultra","difficulty":"fake"}');
  assert.equal(data.wins,0);assert.equal(data.quality,'high');assert.equal(data.difficulty,'normal');
});
test('existing saves survive the refactor and denied storage remains optional', () => {
  const saved={deck:['kael','mira','nyx','vesper'],difficulty:'hard',wins:4,sound:false,quality:'low'};
  assert.deepEqual(parseSave(JSON.stringify(saved)),saved);
  assert.deepEqual(loadSave({getItem(){throw Error('denied');}}).deck,DEFAULT_DECK);
  assert.doesNotThrow(()=>saveGame({setItem(){throw Error('full');}},parseSave(null)));
});
test('fixed-step runner produces equal combat results at different render frame rates', () => {
  const run=(hz:number)=>{
    const b=new Battle(undefined,'normal',42);b.start();const runner=new FixedStepRunner();
    for(let frame=0;frame<30*hz;frame++)runner.advance(1/hz,1,()=>b.step(),()=>b.phase==='playing');
    return b.snapshot();
  };
  assert.deepEqual(run(30),run(60));assert.deepEqual(run(60),run(144));
});
test('fixed-step runner bounds stalled frames and resets pause/restart backlog', () => {
  const runner=new FixedStepRunner();let ticks=0;
  assert.equal(runner.advance(30,4,()=>ticks++,()=>true),12);
  assert.equal(ticks,12);runner.advance(.025,1,()=>ticks++,()=>true);runner.reset();
  assert.equal(runner.accumulator,0);assert.equal(runner.advance(1,1,()=>ticks++,()=>false),0);
  assert.equal(runner.advance(NaN,1,()=>ticks++,()=>true),0);
});
test('diagnostic snapshots cannot mutate live battle statistics or entities', () => {
  const b=new Battle();b.start();b.play(0,'solan',0);
  const snapshot=b.snapshot();snapshot.stats[0].deployed=99;snapshot.units[0].hp=0;snapshot.towers[0].hp=0;
  assert.equal(b.stats[0].deployed,1);assert.ok(b.units[0].hp>0);assert.equal(b.towers[0].hp,400);
});

test('Kora War loads the old save and writes only the new key', () => {
  const storage = new Map([['aetherfall-save', JSON.stringify({wins:7})]]);
  const adapter = {getItem:(key:string)=>storage.get(key) ?? null,setItem:(key:string,value:string)=>{storage.set(key,value);}};
  const data=loadSave(adapter);assert.equal(data.wins,7);saveGame(adapter,data);
  assert.equal(JSON.parse(storage.get('kora-war-save')!).wins,7);
  assert.ok(storage.has('aetherfall-save'));
});
