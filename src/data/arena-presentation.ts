export interface ArenaPresentation {
  lighting: {
    mode: 'day' | 'night';
    sunIntensity: number;
    dayAmbient: number;
    moonIntensity: number;
    nightAmbient: number;
    torchIntensity: number;
    exposure: number;
  };
  structures: {
    towerHeight: number;
    coreHeight: number;
    wallHeightScale: number;
    wallThicknessScale: number;
  };
  towers: {
    showRange: boolean;
    idleRangeOpacity: number;
    firingRangeOpacity: number;
    projectileSeconds: number;
  };
}
export function defaultArenaPresentation(): ArenaPresentation {
  return {
    lighting: {
      mode: 'day',
      sunIntensity: 4,
      dayAmbient: 3.1,
      moonIntensity: 1.8,
      nightAmbient: 1.8,
      torchIntensity: 28,
      exposure: 1.2,
    },
    structures: { towerHeight: 4.2, coreHeight: 4.7, wallHeightScale: 1.6, wallThicknessScale: 1.35 },
    towers: { showRange: true, idleRangeOpacity: 0.22, firingRangeOpacity: 0.78, projectileSeconds: 0.32 },
  };
}
export function validateArenaPresentation(a: ArenaPresentation) {
  const number = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  if (!a?.lighting || !a.structures || !a.towers || !['day', 'night'].includes(a.lighting.mode))
    throw new Error('Cấu hình ánh sáng/công trình không hợp lệ.');
  const l = a.lighting,
    s = a.structures,
    t = a.towers;
  if (
    !number(l.sunIntensity, 0, 8) ||
    !number(l.dayAmbient, 0.5, 6) ||
    !number(l.moonIntensity, 0, 5) ||
    !number(l.nightAmbient, 0.5, 5) ||
    !number(l.torchIntensity, 0, 60) ||
    !number(l.exposure, 0.6, 1.8) ||
    !number(s.towerHeight, 3.2, 5.5) ||
    !number(s.coreHeight, 3.5, 6) ||
    !number(s.wallHeightScale, 1, 2) ||
    !number(s.wallThicknessScale, 1, 1.6) ||
    typeof t.showRange !== 'boolean' ||
    !number(t.idleRangeOpacity, 0, 0.35) ||
    !number(t.firingRangeOpacity, t.idleRangeOpacity, 0.85) ||
    !number(t.projectileSeconds, 0.15, 0.65)
  )
    throw new Error('Thông số ánh sáng/công trình vượt giới hạn hiển thị.');
}
