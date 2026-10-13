import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, STEP } from '../src/simulation.ts';
import { HEROES, HERO_MAP, DEFAULT_DECK } from '../src/data.ts';

const advance=(b:Battle,seconds:number)=>{for(let i=0;i<Math.round(seconds/STEP);i++)b.step();};
const empty=()=>{const b=new Battle();b.start();b.aiEnabled=false;return b;};

test('catalog contains ten original heroes with all five origins and roles',()=>{
  assert.equal(HEROES.length,10);assert.equal(new Set(HEROES.map(h=>h.id)).size,10);
  assert.equal(new Set(HEROES.map(h=>h.origin)).size,5);assert.equal(new Set(HEROES.map(h=>h.role)).size,5);
});
test('deck requires four unique, known heroes',()=>{
  assert.throws(()=>new Battle(['solan']));assert.throws(()=>new Battle(['solan','solan','lyra','brann']));
  assert.throws(()=>new Battle(['fake','solan','lyra','brann']));
});
test('illegal placement and insufficient mana cannot consume mana or spawn',()=>{
  const b=empty(),before=b.mana[0];assert.ok(b.play(0,'solan',3));assert.ok(b.play(0,'solan',1,0));assert.ok(b.play(0,'solan',1,NaN));
  assert.equal(b.mana[0],before);assert.equal(b.units.length,0);b.mana[0]=0;assert.ok(b.play(0,'solan',1));assert.equal(b.units.length,0);
});
test('play pays cost exactly once and cooldown prevents duplicate rapid plays',()=>{
  const b=empty();assert.equal(b.play(0,'solan',1),null);assert.equal(b.mana[0],2);assert.equal(b.units.length,1);
  b.mana[0]=10;assert.ok(b.play(0,'solan',1));assert.equal(b.mana[0],10);advance(b,2);assert.equal(b.play(0,'solan',1),null);
});
test('regeneration caps at ten and pause freezes all simulation state',()=>{
  const b=empty();advance(b,20);assert.equal(b.mana[0],10);b.phase='paused';const before=JSON.stringify(b.snapshot());advance(b,10);assert.equal(JSON.stringify(b.snapshot()),before);
});
test('origins apply spawn shield, healing and mana bonuses',()=>{
  const b=empty();b.play(0,'solan',1);assert.equal(b.units[0].shield,55);b.units[0].hp-=50;advance(b,2);assert.ok(b.units[0].hp>HERO_MAP.solan.hp-50);
  const storm=new Battle(['raiko','orin','solan','lyra']);storm.start();storm.aiEnabled=false;storm.mana[0]=0;advance(storm,1);assert.ok(Math.abs(storm.mana[0]-1.26)<1e-6);
});
test('two guardians increase guardian max health',()=>{
  const b=new Battle(['kael','brann','lyra','solan']);b.start();b.play(0,'kael',1);assert.equal(b.units[0].maxHp,HERO_MAP.kael.hp*1.25);
});
test('units advance toward opposing base independently of rendering',()=>{
  const b=empty();b.play(0,'solan',0,-12);const initial=b.units[0].x;advance(b,2);assert.ok(b.units[0].x>initial+1);assert.equal(b.units[0].lane,0);
});
test('enemy units engage and deal damage',()=>{
  const b=empty();b.mana=[10,10];b.play(0,'solan',1);b.play(1,'nyx',1);b.units[0].x=-.4;b.units[1].x=.4;advance(b,3);assert.ok(b.stats[0].damage>0);assert.ok(b.stats[1].damage>0);
});
test('dead units cannot be healed or attack again',()=>{
  const b=empty();b.play(0,'solan',1);const u=b.units[0];b.damage(u,10000,1);b.heal(u,100);assert.equal(u.hp,0);b.step();assert.equal(b.units.length,0);assert.equal(b.stats[1].kills,1);
});
test('each of ten skills has a concrete combat effect',()=>{
  for(const h of HEROES){
    const deck=[h.id,...HEROES.map(h=>h.id).filter(id=>id!==h.id).slice(0,3)];const b=new Battle(deck);b.start();b.aiEnabled=false;b.mana=[10,10];b.play(0,h.id,1);b.play(1,'kael',1);b.play(1,'nyx',1);
    const u=b.units[0];u.x=0;u.hp-=110;b.units[1].x=1;b.units[2].x=1.6;
    const before=JSON.stringify(b.units.map(u=>[u.hp,u.shield,u.stunUntil,u.slowUntil]));
    assert.equal(b.skill(u,h,b.units.filter(e=>e.side===1)),true,h.id);assert.notEqual(JSON.stringify(b.units.map(u=>[u.hp,u.shield,u.stunUntil,u.slowUntil])),before,h.id);
    assert.equal(b.stats[0].skills,1);
  }
});
test('charged resonance heals allies and damages only enemies in selected lane',()=>{
  const b=empty();b.mana=[10,10];b.play(0,'solan',1);b.play(1,'kael',1);b.play(1,'nyx',0);b.units[0].hp-=100;
  assert.ok(b.pulse(0,1));b.resonance[0]=100;const otherHp=b.units[2].hp;assert.equal(b.pulse(0,1),null);assert.ok(b.units[0].hp>260);assert.ok(b.units[1].hp<540);assert.equal(b.units[2].hp,otherHp);assert.ok(b.resonance[0]<100);
});
test('lane tower blocks core damage until destroyed',()=>{
  const b=empty();b.play(0,'solan',1);const u=b.units[0];u.x=8.8;u.hp=10000;u.shield=0;u.skillCd=100;advance(b,2);assert.ok(b.towers.find(t=>t.id==='1-1')!.hp<400);assert.equal(b.cores[1],1500);
  b.towers.find(t=>t.id==='1-1')!.hp=0;u.x=13.5;u.attackCd=0;b.step();assert.ok(b.cores[1]<1500);
});
test('AI uses the same deck, resource budget and deployment constraints',()=>{
  const b=new Battle();b.start();for(let i=0;i<2400;i++){b.step();assert.ok(b.mana[1]>=0&&b.mana[1]<=10);}
  assert.ok(b.stats[1].deployed>0);assert.ok(b.stats[1].spent<=5+120*1.05+1e-6);assert.ok(b.units.every(u=>b.decks[u.side].includes(u.heroId)));
});
test('fixed seed and identical commands produce identical full match states',()=>{
  const a=new Battle(DEFAULT_DECK,'normal',42),b=new Battle(DEFAULT_DECK,'normal',42);a.start();b.start();
  for(let tick=0;tick<5000;tick++){if(tick%25===0){a.ai(0);b.ai(0);}a.step();b.step();}
  assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.phase,'ended');
});
test('overtime forces terminal result and ended battle is immutable',()=>{
  const b=empty();advance(b,250);assert.equal(b.phase,'ended');assert.ok(b.winner===0||b.winner===1);const before=JSON.stringify(b.snapshot());advance(b,20);assert.equal(JSON.stringify(b.snapshot()),before);
});
test('both win and loss outcomes and replay start from clean state',()=>{
  const a=empty();a.cores[1]=0;a.step();assert.equal(a.winner,0);
  const b=empty();b.cores[0]=0;b.step();assert.equal(b.winner,1);
  const c=new Battle();assert.equal(c.units.length,0);assert.equal(c.time,0);assert.equal(c.stats[0].deployed,0);assert.deepEqual(c.cores,[1500,1500]);
});
test('twenty seeded AI-v-AI matches terminate without invalid state',()=>{
  let won=0,lost=0;for(let seed=1;seed<=20;seed++){
    const b=new Battle(DEFAULT_DECK,'normal',seed);b.start();for(let tick=0;tick<5200&&b.phase==='playing';tick++){if(tick%30===0)b.ai(0);b.step();assert.ok(b.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.hp)&&u.hp>0));assert.ok(b.mana.every(m=>m>=0&&m<=10));}
    assert.equal(b.phase,'ended',`seed ${seed}`);b.winner===0?won++:lost++;
  }assert.equal(won+lost,20);
});
