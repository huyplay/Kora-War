import {
  defaultArenaPresentation,
  validateArenaPresentation,
  type ArenaPresentation,
} from './arena-presentation';
export interface PresentationConfig {
  arena?: ArenaPresentation;
  formation: {
    enabled: boolean;
    radius: number;
    laneRows: number;
    spacing: number;
    smoothing: number;
    modelScale: number;
  };
}
export function defaultPresentation(): PresentationConfig {
  return {
    arena: defaultArenaPresentation(),
    formation: { enabled: true, radius: 0.6, laneRows: 3, spacing: 0.12, smoothing: 14, modelScale: 0.88 },
  };
}
export function presentationOf(content: { presentation?: PresentationConfig }) {
  const p = content.presentation ?? defaultPresentation();
  return { ...p, arena: p.arena ?? defaultArenaPresentation() };
}
export function validatePresentation(p: PresentationConfig) {
  if (p?.arena !== undefined) validateArenaPresentation(p.arena);
  const f = p?.formation,
    n = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  if (
    !f ||
    Object.keys(p).some((k) => !['formation', 'arena'].includes(k)) ||
    Object.keys(f).some(
      (k) => !['enabled', 'radius', 'laneRows', 'spacing', 'smoothing', 'modelScale'].includes(k),
    ) ||
    typeof f.enabled !== 'boolean' ||
    !n(f.radius, 0.35, 1) ||
    ![2, 3].includes(f.laneRows) ||
    !n(f.spacing, 0, 0.4) ||
    !n(f.smoothing, 1, 30) ||
    !n(f.modelScale, 0.6, 1.1)
  )
    throw new Error('Cấu hình đội hình hiển thị không hợp lệ.');
}
