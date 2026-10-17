/** Presentation seconds only. These never delay attacks, damage or skill cooldowns. */
export interface ModelAnimationTiming {
  attackSeconds: number;
  castSeconds: number;
  crossFadeSeconds: number;
}
export const DEFAULT_MODEL_ANIMATION: Readonly<ModelAnimationTiming> = Object.freeze({
  attackSeconds: 0.35,
  castSeconds: 0.5,
  crossFadeSeconds: 0.08,
});
export function modelAnimationTiming(value?: Partial<ModelAnimationTiming>): ModelAnimationTiming {
  return { ...DEFAULT_MODEL_ANIMATION, ...value };
}
export function validateModelAnimation(value: Partial<ModelAnimationTiming>): void {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.entries(value).some(
      ([key, n]) =>
        !Object.hasOwn(DEFAULT_MODEL_ANIMATION, key) ||
        typeof n !== 'number' ||
        !Number.isFinite(n) ||
        n < (key === 'crossFadeSeconds' ? 0 : 0.08) ||
        n > (key === 'crossFadeSeconds' ? 0.3 : 2),
    )
  )
    throw Error('Nhịp hoạt ảnh model không hợp lệ.');
}
