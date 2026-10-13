import type { Battle } from '../Battle';
import { canDeployAt, isLane } from '../physics/lane-space';
import type { Side, Unit } from '../types';
export function validateDeployment(battle: Battle, side: Side, heroId: string, lane: number, x = side === 0 ? -12 : 12): string | null {
    if (side !== 0 && side !== 1)
        return 'Phe không hợp lệ.';
    if (battle.phase !== 'playing')
        return 'Trận đấu chưa sẵn sàng.';
    if (!isLane(lane) || !Number.isFinite(x))
        return 'Vị trí không hợp lệ.';
    if (!canDeployAt(side, x))
        return 'Triển khai trong vùng sáng bên mình.';
    const h = battle.heroes[heroId];
    if (!h || !battle.decks[side].includes(heroId))
        return 'Tướng không nằm trong đội hình.';
    if (battle.mana[side] + 1e-8 < h.cost)
        return `Cần ${h.cost} mana để gọi ${h.name}.`;
    if ((battle.cooldowns[side][heroId] || 0) > battle.time)
        return 'Thẻ đang hồi. Hãy chọn tướng khác.';
    if (battle.units.length >= battle.maxUnits)
        return 'Chiến trường đang đầy quân.';
    return null;
}
export function deployUnit(battle: Battle, side: Side, heroId: string, lane: number, x = side === 0 ? -12 : 12): string | null {
    const error = battle.canPlay(side, heroId, lane, x);
    if (error)
        return error;
    const base = battle.heroes[heroId];
    const multiplier = side === 0 ? 1 + ((battle.levels[heroId] || 1) - 1) * .05 : 1;
    const h = { ...base, hp: base.hp * multiplier, attack: base.attack * multiplier };
    battle.mana[side] -= h.cost;
    battle.cooldowns[side][heroId] = battle.time + battle.content.rules.cardCooldown;
    const maxHp = h.hp * (h.role === 'guardian' && battle.has(side, 'guardian') ? 1.25 : 1);
    const u: Unit = { id: battle.nextId++, heroId, side, lane, x, previousX: x, hp: maxHp, maxHp, shield: battle.has(side, 'dawn') ? 55 : 0, attack: h.attack * (battle.has(side, 'void') ? 1.15 : 1) * (h.role === 'ranger' && battle.has(side, 'ranger') ? 1.2 : 1), range: h.range, speed: h.speed, attackCd: 0.5, skillCd: Math.min(4, h.skillCooldown), slowUntil: 0, slowFactor: 1, stunUntil: 0, born: battle.time, attackAt: -10, skillAt: -10, state: 'move' };
    battle.units.push(u);
    battle.stats[side].deployed++;
    battle.stats[side].spent += h.cost;
    battle.emit({ type: 'spawn', side, lane, x, heroId });
    return null;
}
