import * as THREE from 'three';
import { part } from './resources';
import { LANES } from '../data/map';

export const GATE_CONTACT_X = 0.61;
/** Keep the visible strike face on the authoritative shared-core target plane. */
export function alignFortressFrontages(
  groups: THREE.Group[],
  coreX: number,
  height: number,
  thickness: number,
) {
  for (const group of groups) {
    group.scale.set(thickness, height, 1);
    group.position.x = group.userData.sign * (coreX + GATE_CONTACT_X * thickness);
  }
}

/** Original Elyndra gate silhouettes, built from reusable stone and metal surfaces. */
export function fortressGates(stage: THREE.Group, stone: number[], bronze: number, make: typeof part = part) {
  const geometry: THREE.BufferGeometry[] = [];
  const plateGeometry = new THREE.BoxGeometry(1, 1, 1);
  const boltGeometry = new THREE.CylinderGeometry(1, 1, 1, 4);
  geometry.push(plateGeometry, boltGeometry);
  // Thin bands and bolts need no bevel subdivisions; bake them with the existing materials.
  const plate = (
    parent: THREE.Group,
    color: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const mesh = make(parent, 'box', color, x, y, z, sx, sy, sz);
    mesh.geometry = plateGeometry;
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(-0.44, 0.42);
  shieldShape.lineTo(0.44, 0.42);
  shieldShape.lineTo(0.36, -0.14);
  shieldShape.lineTo(0, -0.55);
  shieldShape.lineTo(-0.36, -0.14);
  shieldShape.closePath();
  const shield = new THREE.ExtrudeGeometry(shieldShape, { depth: 0.08, bevelEnabled: false, steps: 1 });
  shield.translate(0, 0, -0.04);
  geometry.push(shield);
  for (const sign of [-1, 1]) {
    const side = new THREE.Group();
    side.userData.sign = sign;
    side.name = 'FortressSideSource';
    stage.add(side);
    for (const z of [-7.35, -2.4, 2.4, 7.35]) {
      make(side, 'box', stone[0], sign * 16.95, 1.8, z, 1.4, 4.1, 0.84);
      make(side, 'box', stone[2], sign * 16.2, 0.45, z, 1.6, 0.9, 1.2);
      const brace = make(side, 'box', stone[1], sign * 16.46, 1.7, z, 0.6, 2.6, 0.92);
      brace.rotation.z = -sign * 0.14;
      make(side, 'box', stone[2], sign * 16.9, 3.95, z, 1.6, 0.16, 1.04);
      make(side, 'cone', stone[1], sign * 16.95, 4.3, z, 0.85, 0.55, 0.74);
      for (const y of [1.05, 2.35, 3.45]) plate(side, stone[2], sign * 16.95, y, z, 1.52, 0.14, 1.01);
      plate(side, stone[1], sign * 16.18, 2.35, z, 0.08, 0.09, 0.95);
    }
    for (const lane of LANES) {
      const gate = new THREE.Group();
      gate.name = 'FortressGate';
      gate.position.set(sign * 16.8, 0, lane);
      gate.userData.side = sign < 0 ? 0 : 1;
      side.add(gate);
      make(gate, 'box', stone[2], sign * 0.15, 0.12, 0, 1.55, 0.24, 3.05).name = 'GateThreshold';
      make(gate, 'box', stone[0], sign * 0.2, 3.83, 0, 1.25, 0.24, 3.95);
      make(gate, 'box', stone[2], sign * 0.2, 4.02, 0, 1.42, 0.14, 4.12);
      plate(gate, bronze, -sign * 0.49, 3.72, 0, 0.08, 0.06, 3.87);
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
        make(gate, 'box', stone[0], sign * 0.9, 0.82, edge * 1.68, 2.4, 1.8, 0.38);
        make(gate, 'box', stone[2], sign * 0.9, 1.77, edge * 1.68, 2.5, 0.14, 0.48);
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
      // Strike face meets the lane endpoint; return walls join the fortress behind it.
      make(gate, 'box', 0x1e222c, -sign * 0.48, 1.45, 0, 0.15, 2.8, 2.8);
      for (let bar = 0; bar < 7; bar++) {
        const z = (bar - 3) * 0.39;
        make(gate, 'box', bar % 2 ? 0x513c2e : 0x433329, -sign * 0.52, 1.4, z, 0.13, 2.65, 0.33);
      }
      for (const y of [0.6, 1.5, 2.35])
        make(gate, 'box', bronze, -sign * GATE_CONTACT_X, y, 0, 0.08, 0.12, 2.8);
      for (const z of [-1.13, 1.13]) {
        plate(gate, bronze, -sign * 0.57, 1.45, z, 0.08, 2.65, 0.09);
        for (const y of [0.6, 1.5, 2.35]) {
          const bolt = make(gate, 'cylinder', stone[0], -sign * 0.66, y, z, 0.055, 0.045, 0.055);
          bolt.geometry = boltGeometry;
          bolt.rotation.z = Math.PI / 2;
          bolt.name = 'GateRivet';
        }
      }
      const badge = make(gate, 'box', bronze, -sign * 0.53, 3.17, 0, 1, 1, 1);
      badge.name = 'GateAetherShield';
      badge.geometry = shield;
      badge.rotation.y = Math.PI / 2;
      const inset = make(gate, 'box', stone[0], -sign * 0.575, 3.17, 0, 0.78, 0.78, 0.65);
      inset.geometry = shield;
      inset.scale.set(0.78, 0.78, 0.65);
      inset.rotation.y = Math.PI / 2;
      inset.name = 'GateShieldInset';
      const gem = make(
        gate,
        'crystal',
        sign < 0 ? 0x63caff : 0xf47862,
        -sign * 0.58,
        3.17,
        0,
        0.18,
        0.3,
        0.2,
        0.6,
      );
      gem.rotation.z = sign * 0.25;
      gem.name = 'GateAetherGem';
    }
  }
  return geometry;
}
