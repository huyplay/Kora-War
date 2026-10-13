import { RULES, STEP } from '../../data/index';
import type { Battle } from '../Battle';
export function updateTowers(battle: Battle) {
    for (const t of battle.towers) {
        if (t.hp <= 0)
            continue;
        t.cooldown -= STEP;
        const e = battle.units.filter(u => u.hp > 0 && u.side !== t.side && u.lane === t.lane && Math.abs(u.x - t.x) < RULES.towerRange).sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x))[0];
        if (e && t.cooldown <= 0) {
            t.cooldown = RULES.towerCooldown;
            battle.damage(e, RULES.towerDamage, t.side);
            battle.emit({ type: 'projectile', side: t.side, lane: t.lane, x: t.x, toX: e.x });
        }
    }
}
