import * as THREE from 'three';
import type { Battle } from '../core/Battle';
import { deploymentRange } from '../core/physics/deployment-range';
import { LANES } from '../data/map';

/** Read-only lane masks and flowing arrows share the authority's placement bounds. */
export class DeploymentGuidance {
  readonly root = new THREE.Group();
  private lanes = LANES.map((z) => {
    const plane = (color: number, opacity: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          color,
          opacity,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.105, z);
      this.root.add(m);
      return m;
    };
    const legal = plane(0x53cfff, 0.14),
      blocked = plane(0xff435d, 0.17);
    legal.name = 'LegalDeployment';
    blocked.name = 'BlockedDeployment';
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
      new THREE.LineBasicMaterial({ color: 0x8ae5ff, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(0, 0.12, z);
    this.root.add(edge);
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, -0.07);
    shape.lineTo(0.28, -0.07);
    shape.lineTo(0.28, -0.27);
    shape.lineTo(0.5, 0);
    shape.lineTo(0.28, 0.27);
    shape.lineTo(0.28, 0.07);
    shape.lineTo(-0.5, 0.07);
    shape.closePath();
    const arrow = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({
        color: 0xb6efff,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.13, z);
    arrow.name = 'DeploymentArrow';
    this.root.add(arrow);
    return { legal, blocked, edge, arrow };
  });
  update(battle: Battle, time: number) {
    const board = battle.gameplay.board;
    for (let lane = 0; lane < this.lanes.length; lane++) {
      const { legal, blocked, edge, arrow } = this.lanes[lane],
        r = deploymentRange(battle, 0, lane),
        width = r.maxX - r.minX;
      legal.position.x = edge.position.x = (r.minX + r.maxX) / 2;
      legal.scale.set(width, 2 * board.halfWidth, 1);
      edge.scale.copy(legal.scale);
      legal.material.color.setHex(r.rearDefense ? 0xffcc68 : 0x53cfff);
      (edge.material as THREE.LineBasicMaterial).color.copy(legal.material.color);
      blocked.visible = r.maxX < -board.spawnMin;
      blocked.position.x = (r.maxX - board.spawnMin) / 2;
      blocked.scale.set(Math.max(0, -board.spawnMin - r.maxX), 2 * board.halfWidth, 1);
      arrow.visible = width > 0.7;
      arrow.position.x = (r.minX + r.maxX) / 2;
      arrow.scale.set(Math.max(0.1, width - 0.5), 1.5, 1);
      arrow.material.color.copy(legal.material.color).lerp(new THREE.Color(0xffffff), 0.65);
      arrow.material.opacity = 0.48 + Math.sin(time * 4 - lane * 0.7) * 0.18;
      legal.userData.rearDefense = r.rearDefense;
    }
  }
  dispose() {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
