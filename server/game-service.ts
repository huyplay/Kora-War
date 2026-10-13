import { randomInt, randomUUID } from 'node:crypto';
import { Battle } from '../src/core/Battle';
import { ENEMY_DECK } from '../src/data/heroes';
import type { ContentConfig } from '../src/data/content';
import type { Difficulty } from '../src/core/types';
import type { GameDatabase } from './database';
export interface Command { tick:number; type:'play'|'pulse'; heroId?:string; lane:number; x?:number }
export function startMatch(store:GameDatabase,player:string,deck:string[],difficulty:Difficulty) {
    if(!['story','normal','hard'].includes(difficulty)) throw new Error('Độ khó không hợp lệ.');
    const {published:content,revision}=store.config(), seed=randomInt(1,0x7fffffff),id=randomUUID();
    const levels=Object.fromEntries(store.wallet(player).cards.map(c=>[c.hero,c.level]));
    new Battle(deck,difficulty,seed,ENEMY_DECK,content,levels);
    store.db.prepare('INSERT INTO matches VALUES(?,?,?,?,?,?,?,?,?,NULL)').run(id,player,seed,JSON.stringify(deck),difficulty,JSON.stringify(content),JSON.stringify(levels),revision,Date.now());
    return {id,seed,revision,content,levels};
}
export function finishMatch(store:GameDatabase,player:string,id:string,commands:Command[],debug:boolean) {
    const match=store.db.prepare('SELECT * FROM matches WHERE id=? AND player=?').get(id,player) as {result:string|null;seed:number;deck:string;difficulty:Difficulty;content:string;levels:string;created:number}|undefined;
    if(!match) throw new Error('Không tìm thấy trận.');
    if(match.result) return JSON.parse(match.result);
    if(debug) throw new Error('Trận debug không nhận thưởng.');
    if(!Array.isArray(commands) || commands.length>2000) throw new Error('Command log không hợp lệ.');
    let lastTick=0;
    for(const c of commands) {
        if(!Number.isInteger(c.tick) || c.tick<lastTick || c.tick>18000 || !['play','pulse'].includes(c.type) || !Number.isInteger(c.lane) || c.lane<0 || c.lane>2 || (c.type==='play' && (!Number.isFinite(c.x) || typeof c.heroId!=='string'))) throw new Error('Lệnh trận không hợp lệ.');
        lastTick=c.tick;
    }
    const content=JSON.parse(match.content) as ContentConfig;
    const battle=new Battle(JSON.parse(match.deck),match.difficulty,match.seed,ENEMY_DECK,content,JSON.parse(match.levels)); battle.start();
    let cursor=0;
    while(battle.phase==='playing' && battle.tick<18000) {
        while(commands[cursor]?.tick===battle.tick) {
            const c=commands[cursor++]; const error=c.type==='play'?battle.play(0,c.heroId!,c.lane,c.x):battle.pulse(0,c.lane);
            if(error) throw new Error(`Lệnh bị từ chối: ${error}`);
        }
        battle.step();
    }
    if(battle.phase!=='ended' || cursor!==commands.length) throw new Error('Trận chưa kết thúc hợp lệ.');
    if(Date.now()-match.created < battle.time*1000*.85) throw new Error('Trận kết thúc sớm hơn thời gian chơi.');
    return store.trade(player,`match-${id}`,()=>{
        const result={delta:battle.winner===0?content.economy.winGold:content.economy.lossGold,reason:battle.winner===0?'Chiến thắng':'Hoàn thành trận',winner:battle.winner,time:battle.time};
        store.db.prepare('UPDATE matches SET result=? WHERE id=? AND result IS NULL').run(JSON.stringify(result),id);
        return result;
    });
}
export function buyItem(store:GameDatabase,player:string,itemId:string,request:string) { return store.trade(player,request,()=>{
    const item=store.config().published.items.find(i=>i.id===itemId); if(!item) throw new Error('Vật phẩm không tồn tại.');
    store.db.prepare('UPDATE cards SET copies=copies+? WHERE player=? AND hero=?').run(item.copies,player,item.heroId);
    return {delta:-item.price,reason:`Mua ${item.name}`,heroId:item.heroId,copies:item.copies};
}); }
export function openChest(store:GameDatabase,player:string,request:string) { return store.trade(player,request,()=>{
    const c=store.config().published;
    const rewards=Array.from({length:3},()=>c.heroes[randomInt(c.heroes.length)].id);
    for(const id of rewards) store.db.prepare('UPDATE cards SET copies=copies+1 WHERE player=? AND hero=?').run(player,id);
    return {delta:c.economy.chestGold-c.economy.chestCost,reason:'Rương Aether',rewards,gold:c.economy.chestGold};
}); }
export function upgradeCard(store:GameDatabase,player:string,hero:string,request:string) { return store.trade(player,request,()=>{
    const card=store.db.prepare('SELECT level,copies FROM cards WHERE player=? AND hero=?').get(player,hero) as {level:number;copies:number}|undefined;
    if(!card || card.level>=10 || card.copies<card.level*2) throw new Error('Cần đủ mảnh thẻ, cấp tối đa 10.');
    store.db.prepare('UPDATE cards SET level=level+1,copies=copies-? WHERE player=? AND hero=?').run(card.level*2,player,hero);
    return {delta:-store.config().published.economy.upgradeBase*card.level,reason:`Nâng cấp ${hero}`,hero,level:card.level+1};
}); }
