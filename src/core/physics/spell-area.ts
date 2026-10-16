import type { SpellConfig } from '../../data/gameplay';
import type { Side, Unit } from '../types';

/** Spell membership uses logical lane coordinates, independent of rendered formation offsets. */
export function spellAffectsUnit(
  unit: Readonly<Pick<Unit, 'hp' | 'side' | 'lane' | 'x'>>,
  area: Readonly<{ side: Side; lane: number; x: number }>,
  spell: Readonly<Pick<SpellConfig, 'target' | 'radius'>>,
): boolean {
  return (
    unit.hp > 0 &&
    (spell.target === 'all' ||
      (spell.target === 'ally' ? unit.side === area.side : unit.side !== area.side)) &&
    unit.lane === area.lane &&
    Math.abs(unit.x - area.x) <= spell.radius
  );
}
