import * as THREE from 'three';
import type { Unit, Side } from '../core/types';
import { spellAffectsUnit } from '../core/physics/spell-area';
import type { GameplayConfig, SpellConfig } from '../data/gameplay';
import { LANES } from '../data/map';
import { createAimArea, createAimMarkers } from './aim-primitives';

export interface SpellAimAnchor {
  position: { x: number; z: number };
  radius: number;
}

/** Current eligibility only: the warning window can change which units are eventually affected. */
export class SpellAimPreview {
  readonly root = new THREE.Group();
  readonly area = createAimArea();
  readonly markers = createAimMarkers();
  private dummy = new THREE.Object3D();
  constructor() {
    this.root.name = 'SpellAimPreview';
    this.area.name = 'SpellAimLaneArea';
    this.area.rotation.x = -Math.PI / 2;
    this.area.position.y = 0.29;
    this.markers.name = 'SpellAimEligibleUnits';
    this.markers.frustumCulled = false;
    this.markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.area, this.markers);
    this.clear();
  }
  update(
    area: { side: Side; lane: number; x: number },
    spell: Pick<SpellConfig, 'radius' | 'target' | 'color'>,
    board: Pick<GameplayConfig['board'], 'halfWidth'>,
    units: readonly Unit[],
    anchor: (unit: Unit) => SpellAimAnchor | undefined,
  ) {
    this.root.visible = true;
    this.area.position.set(area.x, 0.29, LANES[area.lane]);
    this.area.scale.set(spell.radius * 2, board.halfWidth * 2, 1);
    this.area.material.uniforms.size.value.set(spell.radius * 2, board.halfWidth * 2);
    this.area.material.uniforms.color.value.set(spell.color);
    this.markers.material.color.set(spell.color);
    this.markers.count = 0;
    for (const unit of units) {
      if (!spellAffectsUnit(unit, area, spell)) continue;
      const point = anchor(unit);
      if (!point) continue;
      if (this.markers.count >= this.markers.instanceMatrix.count) break;
      this.dummy.position.set(point.position.x, 0.32, point.position.z);
      this.dummy.rotation.set(-Math.PI / 2, 0, 0);
      this.dummy.scale.setScalar(Math.max(0.18, point.radius) + 0.12);
      this.dummy.updateMatrix();
      this.markers.setMatrixAt(this.markers.count++, this.dummy.matrix);
    }
    this.markers.instanceMatrix.needsUpdate = true;
  }
  clear() {
    this.root.visible = false;
    this.markers.count = 0;
  }
  dispose() {
    this.clear();
    this.root.removeFromParent();
    this.area.geometry.dispose();
    this.area.material.dispose();
    this.markers.geometry.dispose();
    this.markers.material.dispose();
    this.markers.dispose();
  }
}
