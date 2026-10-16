import { VFX_EVENTS, type VfxEvent } from './media';

export interface VfxReadability {
  events: Record<
    VfxEvent,
    { opacity: number; scale: number; blend: 'normal' | 'additive'; cooldown: number }
  >;
  maxPerArea: number;
  areaRadius: number;
  maxDuration: number;
  melee: { enabled: boolean; size: number; opacity: number; lifetime: number; heightRatio: number };
}

/** Provisioning only; current matches retain their published presentation snapshot. */
export function defaultVfxReadability(): VfxReadability {
  return {
    events: {
      hit: { opacity: 0.45, scale: 0.65, blend: 'normal', cooldown: 0.09 },
      skill: { opacity: 0.4, scale: 0.8, blend: 'normal', cooldown: 0.12 },
      spawn: { opacity: 0.55, scale: 0.75, blend: 'normal', cooldown: 0.08 },
      heal: { opacity: 0.4, scale: 0.65, blend: 'normal', cooldown: 0.18 },
      death: { opacity: 0.45, scale: 0.7, blend: 'normal', cooldown: 0.08 },
      pulse: { opacity: 0.5, scale: 1, blend: 'additive', cooldown: 0.3 },
      projectile: { opacity: 0.75, scale: 0.7, blend: 'additive', cooldown: 0 },
    },
    maxPerArea: 3,
    areaRadius: 1.5,
    maxDuration: 0.55,
    melee: { enabled: true, size: 1, opacity: 0.55, lifetime: 0.22, heightRatio: 0.55 },
  };
}

export function validateVfxReadability(profile: VfxReadability): void {
  const number = (value: unknown, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const keys = (value: unknown, allowed: readonly string[]) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowed.includes(key));
  const fail = () => {
    throw Error('Cấu hình độ rõ hiệu ứng chiến đấu không hợp lệ.');
  };
  if (
    !keys(profile, ['events', 'maxPerArea', 'areaRadius', 'maxDuration', 'melee']) ||
    !keys(profile.events, VFX_EVENTS) ||
    !number(profile.maxPerArea, 1, 8) ||
    !Number.isInteger(profile.maxPerArea) ||
    !number(profile.areaRadius, 0.25, 4) ||
    !number(profile.maxDuration, 0.1, 2) ||
    !keys(profile.melee, ['enabled', 'size', 'opacity', 'lifetime', 'heightRatio'])
  )
    fail();
  for (const event of VFX_EVENTS) {
    const style = profile.events[event];
    if (
      !keys(style, ['opacity', 'scale', 'blend', 'cooldown']) ||
      !number(style.opacity, 0, 1) ||
      !number(style.scale, 0.2, 2) ||
      !['normal', 'additive'].includes(style.blend) ||
      !number(style.cooldown, 0, 2)
    )
      fail();
  }
  const melee = profile.melee;
  if (
    typeof melee.enabled !== 'boolean' ||
    !number(melee.size, 0.3, 2) ||
    !number(melee.opacity, 0, 1) ||
    !number(melee.lifetime, 0.08, 0.6) ||
    !number(melee.heightRatio, 0.2, 0.9)
  )
    fail();
}
