export interface UnitFeedbackProfile {
  numbers: {
    enabled: boolean;
    pixels: number;
    lifetime: number;
    risePixels: number;
    damageColor: string;
    healColor: string;
  };
  bodies: { enabled: boolean; opacity: number; padding: number };
}
/** Provisioning only; active matches read the published database snapshot. */
export function defaultUnitFeedback(): UnitFeedbackProfile {
  return {
    numbers: {
      enabled: true,
      pixels: 18,
      lifetime: 0.8,
      risePixels: 24,
      damageColor: '#ffe1ad',
      healColor: '#8affbe',
    },
    bodies: { enabled: true, opacity: 0.32, padding: 0.12 },
  };
}
export function validateUnitFeedback(p: UnitFeedbackProfile) {
  const number = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  const keys = (v: object, allowed: string[]) =>
    v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every((k) => allowed.includes(k));
  const color = (v: string) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  if (
    !p ||
    !keys(p, ['numbers', 'bodies']) ||
    !keys(p.numbers, ['enabled', 'pixels', 'lifetime', 'risePixels', 'damageColor', 'healColor']) ||
    !keys(p.bodies, ['enabled', 'opacity', 'padding']) ||
    typeof p.numbers.enabled !== 'boolean' ||
    typeof p.bodies.enabled !== 'boolean' ||
    !number(p.numbers.pixels, 12, 28) ||
    !number(p.numbers.lifetime, 0.3, 1.5) ||
    !number(p.numbers.risePixels, 0, 48) ||
    !color(p.numbers.damageColor) ||
    !color(p.numbers.healColor) ||
    !number(p.bodies.opacity, 0.05, 0.65) ||
    !number(p.bodies.padding, 0, 0.4)
  )
    throw Error('Cấu hình phản hồi tướng không hợp lệ.');
}
