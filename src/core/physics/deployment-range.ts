import type { GameplayConfig } from '../../data/gameplay';
import type { Side, Unit } from '../types';
import { isLane } from './lane-space';

export interface DeploymentState {
  cycling: boolean;
  gameplay: GameplayConfig;
  units: readonly Pick<Unit, 'side' | 'lane' | 'x' | 'hp'>[];
}
/** One deterministic policy shared by authority, AI, input and presentation. */
export function deploymentRange(state: DeploymentState, side: Side, lane: number) {
  const board = state.gameplay.board,
    rule = board.deployment,
    direction = side === 0 ? 1 : -1;
  let back = -board.spawnMax,
    front = -board.spawnMin,
    rearDefense = false;
  if (state.cycling && rule?.enabled) {
    const enemyFront = state.units.reduce(
      (nearest, u) =>
        u.side !== side && u.lane === lane && u.hp > 0 && Number.isFinite(u.x)
          ? Math.min(nearest, direction * u.x)
          : nearest,
      Infinity,
    );
    front = Math.min(front, enemyFront - rule.clearance);
    if (front <= back) {
      // Never soft-lock a besieged lane: the last strip at home remains deployable.
      front = back + rule.rearDefenseWidth;
      rearDefense = true;
    }
  }
  const a = direction * back,
    b = direction * front;
  return {
    minX: Math.min(a, b),
    maxX: Math.max(a, b),
    rearDefense,
    valid: (side === 0 || side === 1) && isLane(lane),
  };
}
export function canDeployInRange(state: DeploymentState, side: Side, lane: number, x: number) {
  const range = deploymentRange(state, side, lane);
  return range.valid && Number.isFinite(x) && x >= range.minX && x <= range.maxX;
}
/** Quick buttons/AI choose a legal point. Explicit user coordinates are never clamped. */
export function quickDeploymentX(state: DeploymentState, side: Side, lane: number, preferred?: number) {
  const range = deploymentRange(state, side, lane);
  const x = (side === 0 ? -1 : 1) * (preferred ?? state.gameplay.board.quickSpawnX);
  return Math.max(range.minX, Math.min(range.maxX, x));
}
