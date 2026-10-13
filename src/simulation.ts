import { DEFAULT_DECK, ENEMY_DECK, HERO_MAP, traits, type Hero } from './data';

export type Side = 0 | 1;
export type Phase = 'ready'|'playing'|'paused'|'ended';
export type Difficulty = 'story'|'normal'|'hard';
export interface Unit {
  id:number; heroId:string; side:Side; lane:number; x:number; previousX:number;
  hp:number; maxHp:number; shield:number; attack:number; range:number; speed:number;
  attackCd:number; skillCd:number; slowUntil:number; slowFactor:number; stunUntil:number;
  born:number; attackAt:number; skillAt:number; state:'move'|'attack'|'stunned';
}
export interface Tower {id:string;side:Side;lane:number;x:number;hp:number;maxHp:number;cooldown:number}
export interface GameEvent {id:number;time:number;type:'spawn'|'hit'|'projectile'|'skill'|'heal'|'death'|'tower'|'core'|'pulse'|'finish';side:Side;lane:number;x:number;toX?:number;targetId?:number;value?:number;heroId?:string;label?:string}
export interface Stats {deployed:number;kills:number;damage:number;healed:number;skills:number;towers:number;spent:number}
export const STEP = 1/20;
const freshStats = ():Stats => ({deployed:0,kills:0,damage:0,healed:0,skills:0,towers:0,spent:0});

/** Original single-player ruleset Aetherfall v0.1. Renderer never owns combat. */
export class Battle {
  phase:Phase='ready'; time=0; tick=0; seed:number; rng:number; nextId=1; eventId=1;
  units:Unit[]=[]; towers:Tower[]=[]; events:GameEvent[]=[];
  mana=[5,5]; cores=[1500,1500]; maxCore=1500; resonance=[0,0];
  decks:string[][]; synergies:Record<string,number>[]; cooldowns:Record<string,number>[]=[{},{}];
  stats:Stats[]=[freshStats(),freshStats()]; winner:Side|null=null;
  difficulty:Difficulty; aiEnabled=true; aiAt=2.5; maxUnits=100; debugUsed=false;
  constructor(deck=DEFAULT_DECK, difficulty:Difficulty='normal',seed=20261013,enemyDeck=ENEMY_DECK) {
    for(const d of [deck,enemyDeck]) if(d.length!==4||new Set(d).size!==4||d.some(id=>!HERO_MAP[id])) throw new Error('Deck cần đúng 4 tướng khác nhau.');
    this.decks=[deck.slice(),enemyDeck.slice()];this.synergies=this.decks.map(traits);
    this.difficulty=difficulty;this.seed=seed>>>0;this.rng=this.seed||1;
    for(const side of [0,1] as const) for(let lane=0;lane<3;lane++) this.towers.push({id:`${side}-${lane}`,side,lane,x:side===0?-9:9,hp:400,maxHp:400,cooldown:0});
  }
  random(){let x=this.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.rng=x>>>0;return this.rng/4294967296;}
  start(){if(this.phase==='ready')this.phase='playing';}
  emit(event:Omit<GameEvent,'id'|'time'>){this.events.push({...event,id:this.eventId++,time:this.time});if(this.events.length>200)this.events.splice(0,this.events.length-200);}
  has(side:Side,trait:string){return(this.synergies[side][trait]||0)>=2;}
  canPlay(side:Side,heroId:string,lane:number,x=side===0?-12:12):string|null {
    if(this.phase!=='playing')return'Trận đấu chưa sẵn sàng.';
    if(!Number.isInteger(lane)||lane<0||lane>2||!Number.isFinite(x))return'Vị trí không hợp lệ.';
    if((side===0&&(x< -13.5||x> -5.8))||(side===1&&(x>13.5||x<5.8)))return'Triển khai trong vùng sáng bên mình.';
    const h=HERO_MAP[heroId];if(!h||!this.decks[side].includes(heroId))return'Tướng không nằm trong đội hình.';
    if(this.mana[side]+1e-8<h.cost)return`Cần ${h.cost} mana để gọi ${h.name}.`;
    if((this.cooldowns[side][heroId]||0)>this.time)return'Thẻ đang hồi. Hãy chọn tướng khác.';
    if(this.units.length>=this.maxUnits)return'Chiến trường đang đầy quân.';
    return null;
  }
  play(side:Side,heroId:string,lane:number,x=side===0?-12:12):string|null {
    const error=this.canPlay(side,heroId,lane,x);if(error)return error;
    const h=HERO_MAP[heroId];this.mana[side]-=h.cost;this.cooldowns[side][heroId]=this.time+1.8;
    const maxHp=h.hp*(h.role==='guardian'&&this.has(side,'guardian')?1.25:1);
    const u:Unit={id:this.nextId++,heroId,side,lane,x,previousX:x,hp:maxHp,maxHp,shield:this.has(side,'dawn')?55:0,attack:h.attack*(this.has(side,'void')?1.15:1)*(h.role==='ranger'&&this.has(side,'ranger')?1.2:1),range:h.range,speed:h.speed,attackCd:0.5,skillCd:Math.min(4,h.skillCooldown),slowUntil:0,slowFactor:1,stunUntil:0,born:this.time,attackAt:-10,skillAt:-10,state:'move'};
    this.units.push(u);this.stats[side].deployed++;this.stats[side].spent+=h.cost;
    this.emit({type:'spawn',side,lane,x,heroId});return null;
  }
  damage(target:Unit,amount:number,side:Side,source?:Unit){
    if(target.hp<=0)return;const absorb=Math.min(target.shield,amount);target.shield-=absorb;
    const actual=Math.min(target.hp,Math.max(0,amount-absorb));target.hp-=actual;
    this.stats[side].damage+=actual;this.resonance[side]=Math.min(100,this.resonance[side]+actual*0.035);
    if(source&&this.has(side,'frost')){target.slowUntil=Math.max(target.slowUntil,this.time+1.5);target.slowFactor=.8;}
    this.emit({type:'hit',side,lane:target.lane,x:target.x,targetId:target.id,value:Math.round(amount)});
    if(target.hp<=0){this.stats[side].kills++;this.resonance[side]=Math.min(100,this.resonance[side]+5);this.emit({type:'death',side:target.side,lane:target.lane,x:target.x,heroId:target.heroId});}
  }
  heal(u:Unit,amount:number){if(u.hp<=0)return;const value=Math.min(amount,u.maxHp-u.hp);u.hp+=value;this.stats[u.side].healed+=value;if(value>1)this.emit({type:'heal',side:u.side,lane:u.lane,x:u.x,value:Math.round(value)});}
  skill(u:Unit,h:Hero,enemies:Unit[]){
    const near=enemies.filter(e=>e.lane===u.lane&&Math.abs(e.x-u.x)<u.range+2.5);
    const allies=this.units.filter(a=>a.side===u.side&&a.hp>0&&a.lane===u.lane&&Math.abs(a.x-u.x)<5);
    const target=near.sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0];
    if(!target&&!['brann','mira','aurelia','kael'].includes(h.id))return false;
    if(h.id==='mira'&&!allies.some(a=>a.hp<a.maxHp-30))return false;
    if(h.id==='brann'&&!allies.some(a=>a.hp<a.maxHp-40))return false;
    if(h.id==='aurelia'&&!target&&!allies.some(a=>a.id!==u.id))return false;
    if(h.id==='kael'&&!target)return false;
    switch(h.id){
      case'solan':for(const e of near.filter(e=>Math.abs(e.x-u.x)<2.4))this.damage(e,85,u.side,u);break;
      case'aurelia':{const a=allies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||u;a.shield=Math.min(220,a.shield+70);break;}
      case'lyra':for(const e of near.slice(0,3))this.damage(e,65,u.side,u);break;
      case'brann':this.heal(u,95);for(const a of allies.filter(a=>a.id!==u.id&&Math.abs(a.x-u.x)<3))this.heal(a,55);break;
      case'nyx':this.damage(near.sort((a,b)=>a.hp-b.hp)[0],120,u.side,u);break;
      case'vesper':for(const e of enemies.filter(e=>e.lane===u.lane&&Math.abs(e.x-target.x)<3)){this.damage(e,90,u.side,u);e.slowUntil=this.time+3;e.slowFactor=.5;}break;
      case'kael':u.shield=Math.min(240,u.shield+140);for(const e of near.filter(e=>Math.abs(e.x-u.x)<2.5))e.stunUntil=this.time+1.2;break;
      case'mira':for(const a of allies.filter(a=>a.hp<a.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp).slice(0,3))this.heal(a,80);break;
      case'raiko':for(const e of near.slice(0,3))this.damage(e,70,u.side,u);break;
      case'orin':this.damage(target,100,u.side,u);target.stunUntil=this.time+1;break;
    }
    u.skillAt=this.time;this.stats[u.side].skills++;this.emit({type:'skill',side:u.side,lane:u.lane,x:u.x,toX:target?.x,heroId:h.id,label:h.ability});return true;
  }
  pulse(side:Side,lane:number):string|null {
    if(this.phase!=='playing')return'Trận đấu chưa sẵn sàng.';
    if(!Number.isInteger(lane)||lane<0||lane>2)return'Chọn một đường.';
    if(this.resonance[side]<100)return'Cộng hưởng chưa đầy. Gây sát thương để tích năng lượng.';
    this.resonance[side]=0;this.stats[side].skills++;
    for(const u of this.units.filter(u=>u.lane===lane&&u.hp>0)){
      if(u.side!==side){this.damage(u,155,side);u.stunUntil=this.time+1.2;}else this.heal(u,95);
    }
    this.emit({type:'pulse',side,lane,x:0,label:'CỘNG HƯỞNG LÕI'});return null;
  }
  ai(side:Side=1){
    const dir=side===0?1:-1;
    const lanes=[0,1,2].map(lane=>{
      const threat=this.units.filter(u=>u.side!==side&&u.lane===lane&&u.hp>0).reduce((n,u)=>n+u.hp/u.maxHp*(1+(dir===1?-u.x:u.x)/18),0);
      const friends=this.units.filter(u=>u.side===side&&u.lane===lane&&u.hp>0).length;
      const tower=this.towers.find(t=>t.side!==side&&t.lane===lane)!;
      return{lane,score:threat*1.8-friends*.5+(tower.hp<=0?.7:0)+this.random()*1.4};
    }).sort((a,b)=>b.score-a.score);
    const lane=lanes[0].lane;
    if(this.resonance[side]>=100&&this.units.filter(u=>u.side!==side&&u.lane===lane).length>=2)this.pulse(side,lane);
    const front=this.units.some(u=>u.side===side&&u.lane===lane&&HERO_MAP[u.heroId].range<2);
    const affordable=this.decks[side].filter(id=>!this.canPlay(side,id,lane)).map(id=>({id,score:this.random()+(front?(HERO_MAP[id].range>2?1:0):(HERO_MAP[id].hp>300?1:0))})).sort((a,b)=>b.score-a.score);
    if(affordable.length)this.play(side,affordable[0].id,lane);
  }
  step(){
    if(this.phase!=='playing')return;
    this.tick++;this.time=this.tick*STEP;
    for(const side of [0,1] as const){this.mana[side]=Math.min(10,this.mana[side]+STEP*1.05*(this.has(side,'storm')?1.2:1));this.resonance[side]=Math.min(100,this.resonance[side]+STEP*.75);}
    if(this.aiEnabled&&this.time>=this.aiAt){this.ai(1);this.aiAt=this.time+(this.difficulty==='story'?2.6:this.difficulty==='hard'?.8:1.5)+this.random()*.5;}
    // Alternate iteration priority every tick to avoid a permanent side advantage.
    const ordered=this.tick%2?this.units.slice():this.units.slice().reverse();
    for(const u of ordered){
      if(u.hp<=0)continue;u.previousX=u.x;u.attackCd-=STEP;u.skillCd-=STEP;
      if(this.has(u.side,'grove')){const amount=Math.min(u.maxHp-u.hp,4*STEP);u.hp+=amount;this.stats[u.side].healed+=amount;}
      if(u.stunUntil>this.time){u.state='stunned';continue;}
      const enemies=this.units.filter(e=>e.side!==u.side&&e.hp>0);
      const h=HERO_MAP[u.heroId];
      if(u.skillCd<=0&&this.skill(u,h,enemies))u.skillCd=h.skillCooldown*((h.role==='mage'&&this.has(u.side,'mage'))||(h.role==='support'&&this.has(u.side,'support'))?.75:1);
      const dir=u.side===0?1:-1;
      const target=enemies.filter(e=>e.hp>0&&e.lane===u.lane&&Math.abs(e.x-u.x)<=u.range).sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x)||a.id-b.id)[0];
      const tower=this.towers.find(t=>t.side!==u.side&&t.lane===u.lane&&t.hp>0);
      const structureX=tower?tower.x:dir*14;
      const inStructureRange=Math.abs(structureX-u.x)<=u.range+.45;
      if(target||inStructureRange){
        u.state='attack';
        if(u.attackCd<=0){u.attackCd=h.interval/(h.role==='vanguard'&&this.has(u.side,'vanguard')?1.2:1);u.attackAt=this.time;
          const x=target?target.x:structureX;
          if(u.range>2)this.emit({type:'projectile',side:u.side,lane:u.lane,x:u.x,toX:x,heroId:h.id});
          if(target)this.damage(target,u.attack,u.side,u);
          else if(tower){const value=Math.min(tower.hp,u.attack);tower.hp-=value;this.stats[u.side].damage+=value;this.resonance[u.side]=Math.min(100,this.resonance[u.side]+2);if(tower.hp<=0){this.stats[u.side].towers++;this.emit({type:'tower',side:tower.side,lane:tower.lane,x:tower.x,label:'TRỤ ĐÃ SỤP ĐỔ'});}}
          else{const victim=(1-u.side)as Side;const value=Math.min(this.cores[victim],u.attack);this.cores[victim]-=value;this.stats[u.side].damage+=value;this.emit({type:'core',side:victim,lane:u.lane,x:structureX,value:Math.round(value)});}
        }
      }else{
        u.state='move';const speed=u.speed*(u.slowUntil>this.time?u.slowFactor:1);
        u.x=Math.max(-14,Math.min(14,u.x+dir*speed*STEP));
      }
    }
    for(const t of this.towers){if(t.hp<=0)continue;t.cooldown-=STEP;
      const e=this.units.filter(u=>u.hp>0&&u.side!==t.side&&u.lane===t.lane&&Math.abs(u.x-t.x)<4).sort((a,b)=>Math.abs(a.x-t.x)-Math.abs(b.x-t.x))[0];
      if(e&&t.cooldown<=0){t.cooldown=1.35;this.damage(e,27,t.side);this.emit({type:'projectile',side:t.side,lane:t.lane,x:t.x,toX:e.x});}
    }
    this.units=this.units.filter(u=>u.hp>0);
    // Overtime guarantees completion; tie-break is seeded, not always player-favoured.
    if(this.time>=180){const decay=(8+(this.time-180)*.65)*STEP;this.cores=this.cores.map(v=>Math.max(0,v-decay));}
    if(this.cores.some(v=>v<=0)){
      if(this.cores[0]<=0&&this.cores[1]<=0)this.winner=this.stats[0].damage===this.stats[1].damage?(this.random()<.5?0:1):this.stats[0].damage>this.stats[1].damage?0:1;
      else this.winner=this.cores[1]<=0?0:1;
      this.phase='ended';this.emit({type:'finish',side:this.winner,lane:1,x:0});
    }
  }
  snapshot(){return{tick:this.tick,phase:this.phase,mana:this.mana.map(v=>+v.toFixed(4)),cores:this.cores.map(v=>+v.toFixed(4)),rng:this.rng,winner:this.winner,units:this.units.map(u=>({...u,x:+u.x.toFixed(5),hp:+u.hp.toFixed(5)})),towers:this.towers.map(t=>({...t})),stats:this.stats};}
}
