import type { SlowEffect, Unit } from '../types';

/** Select the strongest tactical slow that is still active at this simulation time. */
export function refreshSlowEffects(unit: Unit, time: number) {
  if (!unit.slowEffects) return;
  unit.slowEffects = unit.slowEffects.filter((effect) => effect.until > time + 1e-8);
  const strongest = unit.slowEffects.reduce<SlowEffect | undefined>(
    (best, effect) => (!best || effect.factor < best.factor ? effect : best),
    undefined,
  );
  unit.slowFactor = strongest?.factor ?? 1;
  unit.slowUntil = strongest?.until ?? 0;
}

/** Refresh matching strengths; weaker sources never extend a stronger source's expiry. */
export function applySlowEffect(unit: Unit, factor: number, until: number, time: number) {
  // Preserve an active slow when hydrating an older tactical snapshot without records.
  unit.slowEffects ??=
    unit.slowUntil > time && unit.slowFactor < 1 ? [{ factor: unit.slowFactor, until: unit.slowUntil }] : [];
  refreshSlowEffects(unit, time);
  if (until > time) {
    const matching = unit.slowEffects.find((effect) => effect.factor === factor);
    if (matching) matching.until = Math.max(matching.until, until);
    else unit.slowEffects.push({ factor, until });
  }
  refreshSlowEffects(unit, time);
}
