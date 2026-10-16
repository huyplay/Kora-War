import type { Hero } from './types';
export type ProjectileStyle = 'arrow' | 'orb' | 'bolt';
export interface CombatPresentation {
  enabled: boolean;
  flightSeconds: number;
  arcHeight: number;
  size: number;
  trailLength: number;
  impactSize: number;
  impactSeconds: number;
  heroes: Record<string, { style: ProjectileStyle; color: string }>;
}
/** Provisioning only: live presentation comes from the published content snapshot. */
export function defaultCombatPresentation(heroes: readonly Hero[]): CombatPresentation {
  return {
    enabled: true,
    flightSeconds: 0.2,
    arcHeight: 0.28,
    size: 0.18,
    trailLength: 1.25,
    impactSize: 0.65,
    impactSeconds: 0.22,
    heroes: Object.fromEntries(
      heroes.map((hero) => [
        hero.id,
        {
          style: hero.origin === 'storm' ? 'bolt' : hero.weapon === 'bow' ? 'arrow' : 'orb',
          color: `#${hero.accent.toString(16).padStart(6, '0')}`,
        },
      ]),
    ),
  };
}
export function validateCombatPresentation(value: CombatPresentation, heroes: readonly Hero[]) {
  const n = (x: number, min: number, max: number) => Number.isFinite(x) && x >= min && x <= max;
  if (
    !value ||
    typeof value.enabled !== 'boolean' ||
    !n(value.flightSeconds, 0.05, 0.8) ||
    !n(value.arcHeight, 0, 2) ||
    !n(value.size, 0.05, 0.5) ||
    !n(value.trailLength, 0.1, 3) ||
    !n(value.impactSize, 0.1, 2) ||
    !n(value.impactSeconds, 0.08, 0.8) ||
    !value.heroes ||
    typeof value.heroes !== 'object' ||
    Array.isArray(value.heroes) ||
    Object.keys(value).some(
      (key) =>
        ![
          'enabled',
          'flightSeconds',
          'arcHeight',
          'size',
          'trailLength',
          'impactSize',
          'impactSeconds',
          'heroes',
        ].includes(key),
    )
  )
    throw Error('Cấu hình đạn tướng không hợp lệ.');
  for (const [id, profile] of Object.entries(value.heroes))
    if (
      !heroes.some((h) => h.id === id) ||
      !profile ||
      !['arrow', 'orb', 'bolt'].includes(profile.style) ||
      typeof profile.color !== 'string' ||
      !/^#[0-9a-f]{6}$/i.test(profile.color) ||
      Object.keys(profile).some((key) => !['style', 'color'].includes(key))
    )
      throw Error('Ngoại hình đạn tướng không hợp lệ.');
}
