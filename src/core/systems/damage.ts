import type { Battle } from '../Battle';
import type { Side, Unit } from '../types';
import { applySlowEffect } from './slow-effects';
export function applyDamage(battle: Battle, target: Unit, amount: number, side: Side, source?: Unit) {
  if (target.hp <= 0) return;
  const absorb = Math.min(target.shield, amount);
  target.shield -= absorb;
  const actual = Math.min(target.hp, Math.max(0, amount - absorb));
  target.hp -= actual;
  battle.stats[side].damage += actual;
  const r = battle.gameplay.resonance;
  battle.resonance[side] = Math.min(r.cap, battle.resonance[side] + actual * r.damageGain);
  for (const effect of source
    ? battle.activeBuffs(side, source.heroId).filter((e) => e.kind === 'slowOnHit')
    : []) {
    if (battle.tactical) applySlowEffect(target, effect.amount, battle.time + effect.duration!, battle.time);
    else {
      target.slowUntil = Math.max(target.slowUntil, battle.time + effect.duration!);
      target.slowFactor = effect.amount;
    }
  }
  battle.emit({
    type: 'hit',
    side,
    lane: target.lane,
    x: target.x,
    targetId: target.id,
    value: Math.round(amount),
  });
  if (target.hp <= 0) {
    battle.stats[side].kills++;
    battle.resonance[side] = Math.min(r.cap, battle.resonance[side] + r.killGain);
    battle.emit({ type: 'death', side: target.side, lane: target.lane, x: target.x, heroId: target.heroId });
  }
}
export function applyHealing(battle: Battle, u: Unit, amount: number) {
  if (u.hp <= 0) return;
  const value = Math.min(amount, u.maxHp - u.hp);
  u.hp += value;
  battle.stats[u.side].healed += value;
  if (value > 1) battle.emit({ type: 'heal', side: u.side, lane: u.lane, x: u.x, value: Math.round(value) });
}
