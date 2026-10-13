import { LANES } from '../../data/index';
import type { Battle } from '../Battle';
import type { Side } from '../types';
export function castPulse(battle: Battle, side: Side, lane: number): string | null {
    if (side !== 0 && side !== 1)
        return 'Phe không hợp lệ.';
    if (battle.phase !== 'playing')
        return 'Trận đấu chưa sẵn sàng.';
    if (!Number.isInteger(lane) || lane < 0 || lane >= LANES.length)
        return 'Chọn một đường.';
    if (battle.resonance[side] < 100)
        return 'Cộng hưởng chưa đầy. Gây sát thương để tích năng lượng.';
    battle.resonance[side] = 0;
    battle.stats[side].skills++;
    for (const u of battle.units.filter(u => u.lane === lane && u.hp > 0)) {
        if (u.side !== side) {
            battle.damage(u, 155, side);
            u.stunUntil = battle.time + 1.2;
        }
        else
            battle.heal(u, 95);
    }
    battle.emit({ type: 'pulse', side, lane, x: 0, label: 'CỘNG HƯỞNG LÕI' });
    return null;
}
