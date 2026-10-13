import { ABILITIES, type TargetQuery } from '../../data/abilities';
import type { Hero } from '../../data/index';
import type { Battle } from '../Battle';
import type { Unit } from '../types';
interface AbilityContext {
    caster: Unit;
    near: Unit[];
    allies: Unit[];
    enemies: Unit[];
    target?: Unit;
}
function selectTargets(query: TargetQuery, ctx: AbilityContext): Unit[] {
    const { caster, near, allies, enemies, target } = ctx;
    let selected = query.group === 'self' ? [caster]
        : query.group === 'nearEnemies' ? near.slice()
            : query.group === 'allies' ? allies.slice()
                : enemies.filter(unit => unit.lane === caster.lane);
    const center = query.group === 'areaEnemies' ? target?.x : caster.x;
    if (query.radius !== undefined)
        selected = selected.filter(unit => center !== undefined && Math.abs(unit.x - center) < query.radius!);
    if (query.excludeSelf)
        selected = selected.filter(unit => unit.id !== caster.id);
    if (query.woundedOnly)
        selected = selected.filter(unit => unit.hp < unit.maxHp);
    if (query.order === 'health')
        selected.sort((a, b) => a.hp - b.hp);
    if (query.order === 'healthRatio')
        selected.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    return query.limit === undefined ? selected : selected.slice(0, query.limit);
}
export function castAbility(battle: Battle, caster: Unit, hero: Hero, enemies: Unit[]): boolean {
    if (caster.hp <= 0)
        return false;
    const definition = ABILITIES[hero.id];
    if (!definition)
        return false;
    const near = enemies.filter(unit => unit.lane === caster.lane && Math.abs(unit.x - caster.x) < caster.range + 2.5)
        .sort((a, b) => Math.abs(a.x - caster.x) - Math.abs(b.x - caster.x));
    const allies = battle.units.filter(unit => unit.side === caster.side && unit.hp > 0 && unit.lane === caster.lane && Math.abs(unit.x - caster.x) < 5);
    const target = near[0];
    if (definition.trigger === 'enemy' && !target)
        return false;
    if (definition.trigger === 'enemyOrAlly' && !target && !allies.some(unit => unit.id !== caster.id))
        return false;
    if (definition.trigger === 'woundedAllies' && !allies.some(unit => unit.hp < unit.maxHp - (definition.missingHp ?? 0)))
        return false;
    const ctx = { caster, near, allies, enemies, target };
    for (const effect of definition.effects) {
        for (const unit of selectTargets(effect.targets, ctx)) {
            switch (effect.kind) {
                case 'damage':
                    battle.damage(unit, effect.amount, caster.side, caster);
                    break;
                case 'heal':
                    battle.heal(unit, effect.amount);
                    break;
                case 'shield':
                    unit.shield = Math.min(effect.cap ?? Infinity, unit.shield + effect.amount);
                    break;
                case 'slow':
                    unit.slowUntil = battle.time + (effect.duration ?? 0);
                    unit.slowFactor = effect.amount;
                    break;
                case 'stun':
                    unit.stunUntil = battle.time + (effect.duration ?? 0);
                    break;
            }
        }
    }
    caster.skillAt = battle.time;
    battle.stats[caster.side].skills++;
    battle.emit({ type: 'skill', side: caster.side, lane: caster.lane, x: caster.x, toX: target?.x, heroId: hero.id, label: hero.ability });
    return true;
}
