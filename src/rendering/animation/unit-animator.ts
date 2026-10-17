import type { Group, Object3D } from 'three';
import type { Phase, Unit } from '../../core/types';
import { DEFAULT_MODEL_ANIMATION, type ModelAnimationTiming } from '../../data/model-animation';
export interface HeroRig {
  body: Object3D;
  leftLeg: Object3D;
  rightLeg: Object3D;
  armL: Object3D;
  armR: Object3D;
  cape: Object3D;
}
export type AnimationState = 'idle' | 'walk' | 'attack' | 'cast' | 'stunned' | 'spawn';
export function animationState(
  unit: Unit,
  time: number,
  phase: Phase,
  timing: ModelAnimationTiming = DEFAULT_MODEL_ANIMATION,
): AnimationState {
  if (phase !== 'playing') return 'idle';
  if (unit.state === 'stunned' || (unit.frozenUntil ?? 0) > time + 1e-8 || unit.stunUntil > time + 1e-8)
    return 'stunned';
  if (time - unit.born < 0.3) return 'spawn';
  const castAge = time - unit.skillAt,
    attackAge = time - unit.attackAt;
  const casting = castAge >= -1e-8 && castAge < timing.castSeconds;
  const attacking = attackAge >= -1e-8 && attackAge < timing.attackSeconds;
  // Skills win a simultaneous tick; a later confirmed attack can interrupt the pose.
  if (casting && (!attacking || unit.skillAt >= unit.attackAt)) return 'cast';
  if (attacking) return 'attack';
  return unit.state === 'move' ? 'walk' : 'idle';
}
/** Procedural clip driver. A GLB AnimationMixer adapter can replace this at the prefab boundary. */
export function animateUnit(
  group: Group,
  unit: Unit,
  time: number,
  clock: number,
  phase: Phase,
  timing: ModelAnimationTiming = DEFAULT_MODEL_ANIMATION,
): void {
  if (phase !== 'playing') return;
  const rig = group.userData as HeroRig;
  const state = animationState(unit, time, phase, timing);
  if (state === 'stunned') return;
  const walking = state === 'walk',
    t = clock * 9 + unit.id;
  rig.leftLeg.rotation.x = walking ? Math.sin(t) * 0.45 : 0;
  rig.rightLeg.rotation.x = walking ? -Math.sin(t) * 0.45 : 0;
  rig.body.position.y = walking ? Math.abs(Math.sin(t)) * 0.06 : Math.sin(clock * 2 + unit.id) * 0.025;
  const strike = state === 'attack' ? Math.max(0, 1 - (time - unit.attackAt) / timing.attackSeconds) : 0;
  rig.armR.rotation.x = state === 'cast' ? -1.8 : -strike * 1.5;
  rig.armL.rotation.x = state === 'cast' ? -1.2 : -strike * 0.4;
  rig.cape.rotation.x = -0.15 + Math.sin(clock * 3 + unit.id) * 0.08;
}
