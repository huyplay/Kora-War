import type { Group, Object3D } from 'three';
import type { Phase, Unit } from '../../core/types';
export interface HeroRig {
    body: Object3D;
    leftLeg: Object3D;
    rightLeg: Object3D;
    armL: Object3D;
    armR: Object3D;
    cape: Object3D;
}
export type AnimationState = 'idle' | 'walk' | 'attack' | 'cast' | 'stunned' | 'spawn';
export function animationState(unit: Unit, time: number, phase: Phase): AnimationState {
    if (time - unit.born < .3)
        return 'spawn';
    if (phase !== 'playing')
        return 'idle';
    if (unit.state === 'stunned')
        return 'stunned';
    if (time - unit.skillAt < .5)
        return 'cast';
    if (time - unit.attackAt < .35)
        return 'attack';
    return unit.state === 'move' ? 'walk' : 'idle';
}
/** Procedural clip driver. A GLB AnimationMixer adapter can replace this at the prefab boundary. */
export function animateUnit(group: Group, unit: Unit, time: number, clock: number, phase: Phase): void {
    const rig = group.userData as HeroRig;
    const state = animationState(unit, time, phase);
    const walking = state === 'walk', t = time * 9 + unit.id;
    rig.leftLeg.rotation.x = walking ? Math.sin(t) * .45 : 0;
    rig.rightLeg.rotation.x = walking ? -Math.sin(t) * .45 : 0;
    rig.body.position.y = walking ? Math.abs(Math.sin(t)) * .06 : Math.sin(clock * 2 + unit.id) * .025;
    const strike = state === 'attack' ? Math.max(0, 1 - (time - unit.attackAt) / .35) : 0;
    rig.armR.rotation.x = state === 'cast' ? -1.8 : -strike * 1.5;
    rig.armL.rotation.x = state === 'cast' ? -1.2 : -strike * .4;
    rig.cape.rotation.x = -.15 + Math.sin(clock * 3 + unit.id) * .08;
}
