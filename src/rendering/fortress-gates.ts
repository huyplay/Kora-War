import * as THREE from 'three';
import { part } from './resources';
import { LANES } from '../data/map';

/** Original Elyndra gate silhouettes, built from reusable stone and metal surfaces. */
export function fortressGates(stage: THREE.Group, stone: number[], bronze: number, make: typeof part = part) {
  const geometry: THREE.BufferGeometry[] = [];
  for (const sign of [-1, 1]) {
    for (const z of [-7.35, -2.4, 2.4, 7.35]) {
      make(stage, 'box', stone[0], sign * 16.95, 1.8, z, 1.4, 4.1, 0.84);
      make(stage, 'box', stone[2], sign * 16.2, 0.45, z, 1.6, 0.9, 1.2);
      const brace = make(stage, 'box', stone[1], sign * 16.46, 1.7, z, 0.6, 2.6, 0.92);
      brace.rotation.z = -sign * 0.14;
      make(stage, 'box', stone[2], sign * 16.9, 3.95, z, 1.6, 0.16, 1.04);
      make(stage, 'cone', stone[1], sign * 16.95, 4.3, z, 0.85, 0.55, 0.74);
    }
    for (const lane of LANES) {
      const gate = new THREE.Group();
      gate.name = 'FortressGate';
      gate.position.set(sign * 16.8, 0, lane);
      gate.userData.side = sign < 0 ? 0 : 1;
      stage.add(gate);
      // Open arch above each lane. No visual structure enters the deployment bounds.
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI,
          b = ((i + 1) / 9) * Math.PI;
        const shape = new THREE.Shape();
        shape.moveTo(Math.cos(a) * 1.82, 1.85 + Math.sin(a) * 1.82);
        shape.lineTo(Math.cos(b) * 1.82, 1.85 + Math.sin(b) * 1.82);
        shape.lineTo(Math.cos(b) * 1.43, 1.85 + Math.sin(b) * 1.43);
        shape.lineTo(Math.cos(a) * 1.43, 1.85 + Math.sin(a) * 1.43);
        shape.closePath();
        const block = new THREE.ExtrudeGeometry(shape, { depth: 0.95, bevelEnabled: false, steps: 1 });
        block.translate(0, 0, -0.475);
        geometry.push(block);
        const mesh = make(gate, 'box', i === 4 ? bronze : stone[1], 0, 0, 0, 1, 1, 1);
        mesh.geometry = block;
        mesh.rotation.y = Math.PI / 2;
      }
      for (const edge of [-1, 1]) {
        for (let row = 0; row < 4; row++)
          part(
            gate,
            'box',
            row % 2 ? stone[1] : stone[2],
            0,
            0.22 + row * 0.46,
            edge * 1.63,
            0.95,
            0.42,
            0.4,
          );
        make(gate, 'box', bronze, -sign * 0.52, 1.6, edge * 1.63, 0.08, 0.13, 0.47);
      }
      // Recessed oak portcullis reads as an entrance behind the arch.
      make(gate, 'box', 0x1e222c, sign * 0.65, 1.45, 0, 0.15, 2.8, 2.8);
      for (let bar = 0; bar < 7; bar++) {
        const z = (bar - 3) * 0.39;
        make(gate, 'box', bar % 2 ? 0x513c2e : 0x433329, sign * 0.52, 1.4, z, 0.13, 2.65, 0.33);
      }
      for (const y of [0.6, 1.5, 2.35]) make(gate, 'box', bronze, sign * 0.41, y, 0, 0.08, 0.12, 2.8);
      const gem = part(
        gate,
        'crystal',
        sign < 0 ? 0x63caff : 0xf47862,
        -sign * 0.58,
        3.43,
        0,
        0.18,
        0.3,
        0.2,
        0.6,
      );
      gem.rotation.z = sign * 0.25;
    }
  }
  return geometry;
}
