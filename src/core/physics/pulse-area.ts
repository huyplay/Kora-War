import type { Unit } from '../types';

/** Resonance affects living units throughout one logical lane, without an x radius. */
export function pulseAffectsUnit(unit: Readonly<Pick<Unit, 'lane' | 'hp'>>, lane: number): boolean {
  return unit.lane === lane && unit.hp > 0;
}
