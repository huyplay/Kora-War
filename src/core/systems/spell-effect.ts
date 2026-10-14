import type { Battle } from '../Battle';
import type { Side, Unit } from '../types';
import type { SpellEffect } from '../../data/gameplay';
import { applySlowEffect } from './slow-effects';

/** Declarative spell operations. Configuration carries values; this interpreter owns combat. */
export function applySpellEffect(b: Battle, u: Unit, e: SpellEffect, side: Side, scale = 1) {
  const until = b.time + (e.duration ?? 0);
  const available = (activeUntil = 0) => e.stacking !== 'ignore-active' || activeUntil <= b.time;
  switch (e.kind) {
    case 'damage':
      b.damage(u, e.amount * scale, side);
      break;
    case 'heal':
      b.heal(u, e.amount * scale);
      break;
    case 'shield':
      u.shield = Math.min(e.cap ?? Infinity, u.shield + e.amount * scale);
      break;
    case 'push':
      u.x = Math.max(
        b.gameplay.board.minX,
        Math.min(b.gameplay.board.maxX, u.x + (side === 0 ? 1 : -1) * e.amount * scale),
      );
      break;
    case 'slow':
      if (available(u.slowUntil)) applySlowEffect(u, e.amount, until, b.time);
      break;
    case 'stun':
      if (available(u.stunUntil)) u.stunUntil = until;
      break;
    case 'freeze':
      if (available(u.frozenUntil)) {
        u.frozenUntil = Math.max(u.frozenUntil ?? 0, until);
        u.stunUntil = Math.max(u.stunUntil, u.frozenUntil);
      }
      break;
    case 'weaken':
      if (available(u.weakenUntil)) {
        u.weakenUntil = until;
        u.weakenFactor = e.amount;
      }
      break;
    case 'haste':
      if (available(u.hasteUntil)) {
        u.hasteUntil = until;
        u.hasteFactor = e.amount;
      }
      break;
  }
}
