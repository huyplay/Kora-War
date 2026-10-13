import type { Battle } from '../Battle';
import type { Side, Unit } from '../types';
export function applyDamage(battle: Battle, target: Unit, amount: number, side: Side, source?: Unit) {
    if (target.hp <= 0)
        return;
    const absorb = Math.min(target.shield, amount);
    target.shield -= absorb;
    const actual = Math.min(target.hp, Math.max(0, amount - absorb));
    target.hp -= actual;
    battle.stats[side].damage += actual;
    battle.resonance[side] = Math.min(100, battle.resonance[side] + actual * 0.035);
    if (source && battle.has(side, 'frost')) {
        target.slowUntil = Math.max(target.slowUntil, battle.time + 1.5);
        target.slowFactor = .8;
    }
    battle.emit({ type: 'hit', side, lane: target.lane, x: target.x, targetId: target.id, value: Math.round(amount) });
    if (target.hp <= 0) {
        battle.stats[side].kills++;
        battle.resonance[side] = Math.min(100, battle.resonance[side] + 5);
        battle.emit({ type: 'death', side: target.side, lane: target.lane, x: target.x, heroId: target.heroId });
    }
}
export function applyHealing(battle: Battle, u: Unit, amount: number) {
    if (u.hp <= 0)
        return;
    const value = Math.min(amount, u.maxHp - u.hp);
    u.hp += value;
    battle.stats[u.side].healed += value;
    if (value > 1)
        battle.emit({ type: 'heal', side: u.side, lane: u.lane, x: u.x, value: Math.round(value) });
}
