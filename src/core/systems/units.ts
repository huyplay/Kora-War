import { STEP } from '../../data/index';
import type { Battle } from '../Battle';
import { advanceAlongLane } from '../physics/lane-space';
import type { Side } from '../types';
import { refreshSlowEffects } from './slow-effects';
export function updateUnits(battle: Battle) {
  const ordered = battle.tick % 2 ? battle.units.slice() : battle.units.slice().reverse();
  for (const u of ordered) {
    if (u.hp <= 0) continue;
    if (battle.tactical) refreshSlowEffects(u, battle.time);
    u.previousX = u.x;
    const haste = (u.hasteUntil ?? 0) > battle.time ? 1.35 : 1;
    u.attackCd -= STEP * haste;
    u.skillCd -= STEP;
    if (battle.has(u.side, 'grove')) {
      const amount = Math.min(u.maxHp - u.hp, 4 * STEP);
      u.hp += amount;
      battle.stats[u.side].healed += amount;
    }
    if (Math.max(u.stunUntil, u.frozenUntil ?? 0) > battle.time) {
      u.state = 'stunned';
      continue;
    }
    const enemies = battle.units.filter((e) => e.side !== u.side && e.hp > 0);
    const h = battle.heroes[u.heroId];
    if (u.skillCd <= 0 && battle.skill(u, h, enemies))
      u.skillCd =
        h.skillCooldown *
        ((h.role === 'mage' && battle.has(u.side, 'mage')) ||
        (h.role === 'support' && battle.has(u.side, 'support'))
          ? 0.75
          : 1);
    const dir = u.side === 0 ? 1 : -1;
    const target = enemies
      .filter((e) => e.hp > 0 && e.lane === u.lane && Math.abs(e.x - u.x) <= u.range)
      .sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x) || a.id - b.id)[0];
    const tower = battle.towers.find((t) => t.side !== u.side && t.lane === u.lane && t.hp > 0);
    const structureX = tower ? tower.x : dir * 14;
    const inStructureRange = Math.abs(structureX - u.x) <= u.range + 0.45;
    if (target || inStructureRange) {
      u.state = 'attack';
      if (u.attackCd <= 0) {
        u.attackCd = h.interval / (h.role === 'vanguard' && battle.has(u.side, 'vanguard') ? 1.2 : 1);
        u.attackAt = battle.time;
        const x = target ? target.x : structureX;
        if (u.range > 2)
          battle.emit({ type: 'projectile', side: u.side, lane: u.lane, x: u.x, toX: x, heroId: h.id });
        if (target) battle.damage(target, u.attack, u.side, u);
        else if (tower) {
          const value = Math.min(tower.hp, u.attack * ((u.weakenUntil ?? 0) > battle.time ? 0.7 : 1));
          tower.hp -= value;
          battle.stats[u.side].damage += value;
          battle.resonance[u.side] = Math.min(100, battle.resonance[u.side] + 2);
          if (tower.hp <= 0) {
            battle.stats[u.side].towers++;
            battle.emit({
              type: 'tower',
              side: tower.side,
              lane: tower.lane,
              x: tower.x,
              label: 'TRỤ ĐÃ SỤP ĐỔ',
            });
          }
        } else {
          const victim = (1 - u.side) as Side;
          const value = Math.min(
            battle.cores[victim],
            u.attack * ((u.weakenUntil ?? 0) > battle.time ? 0.7 : 1),
          );
          battle.cores[victim] -= value;
          battle.stats[u.side].damage += value;
          battle.emit({ type: 'core', side: victim, lane: u.lane, x: structureX, value: Math.round(value) });
        }
      }
    } else {
      u.state = 'move';
      const speed = u.speed * haste * (u.slowUntil > battle.time ? u.slowFactor : 1);
      u.x = advanceAlongLane(u.x, dir, speed, STEP);
    }
  }
}
