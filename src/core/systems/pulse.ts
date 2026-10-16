import { LANES } from '../../data/index';
import type { Battle } from '../Battle';
import type { Side } from '../types';
import { pulseAffectsUnit } from '../physics/pulse-area';
export function castPulse(battle: Battle, side: Side, lane: number): string | null {
  if (side !== 0 && side !== 1) return 'Phe không hợp lệ.';
  if (battle.phase !== 'playing') return 'Trận đấu chưa sẵn sàng.';
  if (!Number.isInteger(lane) || lane < 0 || lane >= LANES.length) return 'Chọn một đường.';
  const r = battle.gameplay.resonance;
  if (!r.enabled) return 'Cộng hưởng đã bị tắt.';
  if (battle.resonance[side] < r.cap) return 'Cộng hưởng chưa đầy. Gây sát thương để tích năng lượng.';
  battle.resonance[side] = 0;
  battle.stats[side].skills++;
  for (const u of battle.units.filter((u) => pulseAffectsUnit(u, lane))) {
    if (u.side !== side) {
      battle.damage(u, r.damage, side);
      u.stunUntil = battle.time + r.stun;
    } else battle.heal(u, r.heal);
  }
  battle.emit({ type: 'pulse', side, lane, x: 0, label: 'CỘNG HƯỞNG LÕI' });
  return null;
}
