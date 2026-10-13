import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameDatabase } from '../server/database';
import { buyItem, openChest, upgradeCard, startMatch, finishMatch } from '../server/game-service';
import { defaultContent, validateContent } from '../src/data/content';
import { Battle } from '../src/core/Battle';
import { DEFAULT_DECK, ENEMY_DECK } from '../src/data/heroes';
import { createGameServer } from '../server/http';
import { inspectGLB } from '../server/assets';

function setup(t:TestContext) { const dir=mkdtempSync(join(tmpdir(),'kora-test-')); const db=new GameDatabase(dir,'test-local-admin');t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});return db; }
test('draft changes stay isolated until publication and stale edits are rejected',t=>{
    const db=setup(t),c=db.config();c.draft.heroes[0].attack=90;
    db.saveDraft(c.draft,c.version);assert.notEqual(db.config().published.heroes[0].attack,90);
    assert.throws(()=>db.saveDraft(c.draft,c.version),/CONFLICT/);
    db.publish(db.config().version);assert.equal(db.config().published.heroes[0].attack,90);
    c.draft.models.solan={assetId:'missing',height:2,yaw:0,clips:{}};db.saveDraft(c.draft,db.config().version);assert.throws(()=>db.publish(db.config().version),/Asset/);
});
test('economy is transactional, prevents overdraft and duplicate charges, and persists levels',t=>{
    const db=setup(t),p=db.player();assert.equal(db.wallet(p).gold,300);
    buyItem(db,p,'shard-solan','buy-solan-1');buyItem(db,p,'shard-solan','buy-solan-1');assert.equal(db.wallet(p).gold,260);
    upgradeCard(db,p,'solan','upgrade-1');assert.equal(db.wallet(p).gold,185);assert.equal(db.wallet(p).cards.find(c=>c.hero==='solan')!.level,2);
    assert.throws(()=>upgradeCard(db,p,'solan','upgrade-2'),/mảnh/);
    openChest(db,p,'chest-1');assert.equal(db.wallet(p).gold,115);
    db.trade(p,'empty-wallet',()=>({delta:-115,reason:'test'}));const copies=db.wallet(p).cards.find(c=>c.hero==='lyra')!.copies;
    assert.throws(()=>buyItem(db,p,'shard-lyra','buy-no-money'),/vàng/);assert.equal(db.wallet(p).cards.find(c=>c.hero==='lyra')!.copies,copies);
});
test('published configuration is copied per battle and player upgrade affects only player spawns',()=>{
    const c=defaultContent();const b=new Battle(DEFAULT_DECK,'normal',1,ENEMY_DECK,c,{solan:2});b.start();c.heroes[0].hp=1;
    b.play(0,'solan',1);assert.equal(b.units[0].maxHp,b.heroes.solan.hp*1.05);
    assert.throws(()=>validateContent({...defaultContent(),heroes:[]}),/10/);
    const bad=defaultContent();bad.abilities.solan.effects[0].targets.limit=-1;assert.throws(()=>validateContent(bad),/mục tiêu/);
});
test('server reconstructs a complete seeded match and rewards it once',t=>{
    const db=setup(t),p=db.player(),m=startMatch(db,p,DEFAULT_DECK,'story');db.db.prepare('UPDATE matches SET created=? WHERE id=?').run(Date.now()-1000000,m.id);
    const result=finishMatch(db,p,m.id,[],false);assert.equal(result.winner,1);
    const gold=db.wallet(p).gold;finishMatch(db,p,m.id,[],false);assert.equal(db.wallet(p).gold,gold);
    const m2=startMatch(db,p,DEFAULT_DECK,'story');assert.throws(()=>finishMatch(db,p,m2.id,[],true),/debug/);
    assert.throws(()=>finishMatch(db,p,m2.id,[{tick:-1,type:'play',heroId:'solan',lane:0,x:-11}],false),/Lệnh/);
});
test('HTTP requires admin authentication, checks origin and uses opaque player cookies',async t=>{
    const db=setup(t),server=createGameServer(db);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise<void>(r=>server.close(()=>r())));
    const address=server.address();const base=`http://127.0.0.1:${typeof address==='object'&&address?address.port:0}`;
    assert.equal((await fetch(base+'/api/admin/state')).status,401);
    assert.equal((await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json','X-Kora-Request':'1',Origin:'https://evil.example'},body:JSON.stringify({password:'test-local-admin'})})).status,400);
    const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json','X-Kora-Request':'1'},body:JSON.stringify({password:'test-local-admin'})});assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
    assert.equal((await fetch(base+'/api/admin/state',{headers:{cookie}})).status,200);
    const player=await fetch(base+'/api/player',{method:'POST',headers:{'X-Kora-Request':'1'}});assert.equal(player.status,200);assert.equal((await player.json()).gold,300);
});
test('GLB validator refuses corrupt headers and external texture references',()=>{
    assert.throws(()=>inspectGLB(Buffer.from('not a model')),/GLB/);
    const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},nodes:[],images:[{uri:'https://evil.example/texture.png'}]}));const bytes=Buffer.alloc(20+json.length);bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);
    assert.throws(()=>inspectGLB(bytes),/URL ngoài/);
});
