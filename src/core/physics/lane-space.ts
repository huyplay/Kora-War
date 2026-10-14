import { LANES } from '../../data/map';
import type { Side } from '../types';
/** Deterministic lane-space physics. Render transforms never feed combat coordinates. */
export const LANE_SPACE = Object.freeze({
  minX: -14,
  maxX: 14,
  spawnMin: 5.8,
  spawnMax: 13.5,
  halfWidth: 1.55,
});
export type LaneSpace = { [K in keyof typeof LANE_SPACE]: number };
export function isLane(lane: number): boolean {
  return Number.isInteger(lane) && lane >= 0 && lane < LANES.length;
}
export function canDeployAt(side: Side, x: number, space: LaneSpace = LANE_SPACE): boolean {
  return (
    Number.isFinite(x) &&
    (side === 0 ? x >= -space.spawnMax && x <= -space.spawnMin : x >= space.spawnMin && x <= space.spawnMax)
  );
}
export function nearestLane(z: number): number {
  return LANES.reduce(
    (best, value, index) => (Math.abs(z - value) < Math.abs(z - LANES[best]) ? index : best),
    0,
  );
}
export function advanceAlongLane(
  x: number,
  direction: number,
  speed: number,
  dt: number,
  space: LaneSpace = LANE_SPACE,
): number {
  return Math.max(space.minX, Math.min(space.maxX, x + direction * speed * dt));
}
export function pickDeployment(x: number, z: number, side: Side = 0, space: LaneSpace = LANE_SPACE) {
  const lane = nearestLane(z);
  return {
    x,
    z,
    lane,
    valid: canDeployAt(side, x, space) && Number.isFinite(z) && Math.abs(z - LANES[lane]) < space.halfWidth,
  };
}
