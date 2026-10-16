import { isSpell, type SpellId } from '../../data/spells';
import { STEP } from '../../data/rules';
import type { Battle } from '../Battle';
import { isLane } from '../physics/lane-space';
import { spellAffectsUnit } from '../physics/spell-area';
import type { Side } from '../types';
import { applySpellEffect } from './spell-effect';
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
  if (!isLane(lane) || !Number.isFinite(x) || x < b.gameplay.board.minX || x > b.gameplay.board.maxX)
    return 'Vị trí phép không hợp lệ.';
  if (!isSpell(id) || !b.spellDecks[side].includes(id)) return 'Phép không nằm trong bộ bài.';
  if (!b.held(side, id, uid)) return 'Thẻ không còn trên tay.';
  if (!b.gameplay.spells[id].enabled) return 'Phép đã bị tắt.';
  if (b.mana[side] + 1e-8 < b.gameplay.spells[id].cost) return 'Chưa đủ mana.';
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
  const s = b.gameplay.spells[id as SpellId];
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
    const s = b.gameplay.spells[zone.spellId];
    const targets = b.units.filter((u) => spellAffectsUnit(u, zone, s));
    for (const u of targets) {
      for (const effect of s.effects) applySpellEffect(b, u, effect, zone.side, s.duration ? STEP : 1);
    }
  }
  // Tick times and warning/end times may round in opposite directions. Use the
  // same tolerance as activation so a duration cannot gain an extra damage tick.
  b.spellZones = b.spellZones.filter((z) => b.time + STEP + 1e-8 < z.ends || b.time + 1e-8 < z.starts);
}
