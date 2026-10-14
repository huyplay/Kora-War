import type { Unit } from '../core/types';
import type { PresentationConfig } from '../data/presentation';
import type { GameplayConfig } from '../data/gameplay';
import { LANES } from '../data/map';
export interface FormationPoint {
  x: number;
  z: number;
  scale: number;
}
/** Render-only packing: fixed rows, mirrored ordering, no writes to simulation units. */
export class FormationLayout {
  private rows = new Map<number, number>();
  private anchors = new Map<number, number>();
  reset() {
    this.rows.clear();
    this.anchors.clear();
  }
  update(
    units: readonly Unit[],
    f: PresentationConfig['formation'],
    board: GameplayConfig['board'],
    dt: number,
  ) {
    const result = new Map<number, FormationPoint>(),
      alive = new Set(units.map((u) => u.id));
    for (const id of this.rows.keys())
      if (!alive.has(id)) {
        this.rows.delete(id);
        this.anchors.delete(id);
      }
    if (!f.enabled) {
      for (const u of units)
        result.set(u.id, { x: u.x, z: LANES[u.lane] + ((u.id % 3) - 1) * 0.32, scale: 1 });
      return result;
    }
    const blend = 1 - Math.exp(-f.smoothing * Math.max(0, dt));
    for (let lane = 0; lane < LANES.length; lane++) {
      const members = units
        .filter((u) => u.lane === lane && u.hp > 0)
        .slice()
        .sort((a, b) => a.id - b.id);
      const counts = Array.from({ length: f.laneRows }, () => 0);
      for (const u of members) {
        const row = this.rows.get(u.id);
        if (row !== undefined && row < f.laneRows) counts[row]++;
        else this.rows.delete(u.id);
      }
      for (const u of members) {
        if (!this.rows.has(u.id)) {
          const least = Math.min(...counts),
            row = counts.findIndex((n) => n === least);
          this.rows.set(u.id, row);
          counts[row]++;
        }
        const old = this.anchors.get(u.id);
        this.anchors.set(u.id, old === undefined ? u.x : old + (u.x - old) * blend);
      }
      const z = (u: Unit) =>
        (this.rows.get(u.id)! / (f.laneRows - 1) - 0.5) * 2 * Math.max(0.1, board.halfWidth - 0.3);
      const ordered = members.sort(
        (a, b) =>
          this.anchors.get(a.id)! - this.anchors.get(b.id)! ||
          a.side - b.side ||
          (a.side === 0 ? b.id - a.id : a.id - b.id),
      );
      const lower = board.minX + 0.25,
        upper = board.maxX - 0.25,
        center = (lower + upper) / 2;
      let compression = 1,
        packed: number[] = [];
      for (let attempt = 0; attempt < 24; attempt++) {
        const gap = (f.radius * 2 + f.spacing) * compression;
        const desired = ordered.map((u) => center + (this.anchors.get(u.id)! - center) * compression);
        const forward = desired.slice(),
          backward = desired.slice();
        const separation = (i: number, j: number) =>
          Math.sqrt(Math.max(0, gap * gap - (z(ordered[i]) - z(ordered[j])) ** 2));
        for (let i = 0; i < ordered.length; i++)
          for (let j = 0; j < i; j++) {
            const space = separation(i, j);
            if (space > 0) forward[i] = Math.max(forward[i], forward[j] + space);
          }
        for (let i = ordered.length - 1; i >= 0; i--)
          for (let j = i + 1; j < ordered.length; j++) {
            const space = separation(i, j);
            if (space > 0) backward[i] = Math.min(backward[i], backward[j] - space);
          }
        packed = forward.map((v, i) => (v + backward[i]) / 2);
        if (!packed.length || Math.max(...packed) - Math.min(...packed) <= upper - lower) break;
        compression *= 0.9;
      }
      const shift = packed.length
        ? Math.max(lower - Math.min(...packed), Math.min(upper - Math.max(...packed), 0))
        : 0;
      ordered.forEach((u, i) =>
        result.set(u.id, { x: packed[i] + shift, z: LANES[lane] + z(u), scale: f.modelScale * compression }),
      );
    }
    return result;
  }
}
