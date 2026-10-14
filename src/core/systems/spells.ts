import { SPELLS, isSpell, type SpellId } from '../../data/spells';
import { STEP } from '../../data/rules';
import type { Battle } from '../Battle';
import { isLane, LANE_SPACE } from '../physics/lane-space';
import type { Side } from '../types';
import { applySlowEffect } from './slow-effects';
export interface SpellZone {
  id: number;
  spellId: SpellId;
  side: Side;
  lane: number;
  x: number;
  starts: number;
  ends: number;
}
export function validateSpell(
  b: Battle,
  side: Side,
  id: string,
  lane: number,
  x: number,
  uid?: number,
): string | null {
  if (side !== 0 && side !== 1) return 'Phe không hợp lệ.';
  if (b.phase !== 'playing' || !b.tactical) return 'Trận đấu chưa sẵn sàng.';
  if (!isLane(lane) || !Number.isFinite(x) || Math.abs(x) > LANE_SPACE.maxX)
    return 'Vị trí phép không hợp lệ.';
  if (!isSpell(id) || !b.spellDecks[side].includes(id)) return 'Phép không nằm trong bộ bài.';
  if (!b.held(side, id, uid)) return 'Thẻ không còn trên tay.';
  if (b.mana[side] + 1e-8 < SPELLS[id].cost) return 'Chưa đủ mana.';
  if ((b.cooldowns[side][id] || 0) > b.time) return 'Phép đang hồi.';
  return null;
}
export function castSpell(
  b: Battle,
  side: Side,
  id: string,
  lane: number,
  x: number,
  uid?: number,
): string | null {
  const error = validateSpell(b, side, id, lane, x, uid);
  if (error) return error;
  const s = SPELLS[id as SpellId];
  b.mana[side] -= s.cost;
  b.stats[side].spent += s.cost;
  b.stats[side].skills++;
  b.cooldowns[side][id] = b.time + s.cooldown;
  b.spellZones.push({
    id: b.eventId,
    spellId: s.id,
    side,
    lane,
    x,
    starts: b.time + s.warning,
    ends: b.time + s.warning + s.duration,
  });
  b.emit({ type: 'skill', side, lane, x, label: s.name });
  b.consumeCard(side, id, uid);
  return null;
}
export function updateSpells(b: Battle) {
  for (const zone of b.spellZones) {
    if (b.time + 1e-8 < zone.starts) continue;
    const s = SPELLS[zone.spellId];
    const friendly = ['heal', 'shield', 'haste'].includes(zone.spellId);
    const targets = b.units.filter(
      (u) =>
        u.hp > 0 &&
        (friendly ? u.side === zone.side : u.side !== zone.side) &&
        u.lane === zone.lane &&
        Math.abs(u.x - zone.x) <= s.radius,
    );
    for (const u of targets) {
      if (s.damage) b.damage(u, s.damage * (s.duration ? STEP : 1), zone.side);
      if (zone.spellId === 'heal') b.heal(u, 100);
      if (zone.spellId === 'shield') u.shield = Math.min(200, u.shield + 100);
      if (zone.spellId === 'weaken') u.weakenUntil = b.time + 4;
      if (zone.spellId === 'haste') u.hasteUntil = b.time + 4;
      if (zone.spellId === 'wind')
        u.x = Math.max(LANE_SPACE.minX, Math.min(LANE_SPACE.maxX, u.x + (zone.side === 0 ? 2 : -2)));
      // Non-additive control durations. Recasts cannot extend an existing stun.
      if (zone.spellId === 'lightning' && u.stunUntil <= b.time) u.stunUntil = b.time + 0.6;
      if (zone.spellId === 'ice') {
        if (b.cycling) {
          u.frozenUntil = b.time + 2;
          u.stunUntil = Math.max(u.stunUntil, u.frozenUntil);
        } else applySlowEffect(u, 0.6, b.time + 2, b.time);
      }
    }
  }
  // Tick times and warning/end times may round in opposite directions. Use the
  // same tolerance as activation so a duration cannot gain an extra damage tick.
  b.spellZones = b.spellZones.filter((z) => b.time + STEP + 1e-8 < z.ends || b.time + 1e-8 < z.starts);
}
