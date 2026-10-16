import * as THREE from 'three';
import type { Side, Unit } from '../core/types';
import { pulseAffectsUnit } from '../core/physics/pulse-area';
import type { GameplayConfig } from '../data/gameplay';
import type { ContentConfig } from '../data/content';
import { LANES } from '../data/map';
import { createAimArea, createAimMarkers } from './aim-primitives';
import type { SpellAimAnchor } from './spell-aim-preview';

/** Lane selection only; enemy/ally effects remain authoritative in castPulse. */
export class PulseAimPreview {
  readonly root = new THREE.Group();
  readonly areas = LANES.map(() => createAimArea());
  readonly markers = createAimMarkers();
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  constructor() {
    this.root.name = 'PulseAimPreview';
    this.areas.forEach((area, lane) => {
      area.name = `PulseAimLane${lane}`;
      this.root.add(area);
    });
    this.markers.name = 'PulseAimAffectedUnits';
    this.root.add(this.markers);
    this.clear();
  }
  update(
    board: Pick<GameplayConfig['board'], 'minX' | 'maxX' | 'halfWidth'>,
    palette: Pick<ContentConfig['vfx'], 'ally' | 'heal' | 'enemy'>,
    side: Side,
    lane: number | undefined,
    units: readonly Unit[],
    anchor: (unit: Unit) => SpellAimAnchor | undefined,
  ) {
    this.root.visible = true;
    const selected = lane !== undefined && Number.isInteger(lane) && lane >= 0 && lane < LANES.length;
    const width = board.maxX - board.minX;
    this.areas.forEach((area, index) => {
      area.position.set((board.minX + board.maxX) / 2, 0.29, LANES[index]);
      area.scale.set(width, board.halfWidth * 2, 1);
      area.material.uniforms.size.value.set(width, board.halfWidth * 2);
      area.material.uniforms.color.value.set(palette.ally);
      area.material.uniforms.strength.value = selected ? (index === lane ? 1 : 0.25) : 0.55;
    });
    this.markers.count = 0;
    if (selected)
      for (const unit of units) {
        if (!pulseAffectsUnit(unit, lane!)) continue;
        const point = anchor(unit);
        if (!point) continue;
        if (this.markers.count >= this.markers.instanceMatrix.count) break;
        this.dummy.position.set(point.position.x, 0.32, point.position.z);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.setScalar(Math.max(0.18, point.radius) + 0.12);
        this.dummy.updateMatrix();
        const index = this.markers.count++;
        this.markers.setMatrixAt(index, this.dummy.matrix);
        this.markers.setColorAt(index, this.color.set(unit.side === side ? palette.heal : palette.enemy));
      }
    this.markers.instanceMatrix.needsUpdate = true;
    if (this.markers.instanceColor) this.markers.instanceColor.needsUpdate = true;
  }
  clear() {
    this.root.visible = false;
    this.markers.count = 0;
  }
  dispose() {
    this.clear();
    this.root.removeFromParent();
    for (const area of this.areas) {
      area.geometry.dispose();
      area.material.dispose();
    }
    this.markers.geometry.dispose();
    this.markers.material.dispose();
    this.markers.dispose();
  }
}
