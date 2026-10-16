import type * as THREE from 'three';
import { part as primitive } from './resources';

/** Scenery anchors shared by the baked brazier, fire and local light. */
export const ARENA_TORCHES = [
  { x: -12.7, z: -6.5 },
  { x: -12.7, z: 6.5 },
  { x: 12.7, z: -6.5 },
  { x: 12.7, z: 6.5 },
] as const;
export const TORCH_BOWL_Y = 1.38;
export const TORCH_FLAME_Y = 1.65;

/** Render-clock only: pausing freezes the flame and its illumination together. */
export function torchFlicker(time: number, index: number, reducedMotion = false) {
  return reducedMotion ? 1 : 1 + Math.sin(time * 11 + index * 2) * 0.07 + Math.sin(time * 17 + index) * 0.035;
}

export function arenaBraziers(parent: THREE.Group, stone: number[], bronze: number, part = primitive) {
  for (const { x, z } of ARENA_TORCHES) {
    // A broad plinth and stepped bands make the post visibly meet the floor.
    part(parent, 'cylinder', stone[0], x, 0.12, z, 0.38, 0.24, 0.38);
    part(parent, 'cylinder', stone[2], x, 0.27, z, 0.28, 0.12, 0.28);
    part(parent, 'cylinder', stone[1], x, 0.72, z, 0.16, 0.8, 0.16);
    for (const y of [0.38, 1.08]) part(parent, 'cylinder', bronze, x, y, z, 0.21, 0.1, 0.21);
    const bowl = part(parent, 'cone', bronze, x, 1.24, z, 0.34, 0.25, 0.34);
    bowl.rotation.z = Math.PI;
    const rim = part(parent, 'ring', bronze, x, TORCH_BOWL_Y, z, 0.34, 0.34, 0.34);
    rim.rotation.x = Math.PI / 2;
    part(parent, 'cylinder', 0x242a35, x, 1.35, z, 0.29, 0.035, 0.29);
  }
}
