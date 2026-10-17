import { MathUtils, type Object3D } from 'three';
import type { ModelInstance } from '../assets/model-library';

/** The existing 0.3s entrance window changes presentation only. */
export function heroEntrance(time: number, born: number, reduced: boolean, modern: boolean) {
  if (![time, born].every(Number.isFinite)) return { scale: 1, visibility: 1 };
  if (!modern) return { scale: MathUtils.clamp((time - born) * 3 + 0.15, 0.15, 1), visibility: 1 };
  if (reduced) return { scale: 1, visibility: 1 };
  const progress = MathUtils.clamp((time - born) / 0.3, 0, 1);
  return { scale: 0.88 + 0.12 * (1 - (1 - progress) ** 3), visibility: MathUtils.smoothstep(progress, 0, 1) };
}

type FallenModel = Pick<
  ModelInstance,
  'root' | 'play' | 'tick' | 'setHitFlash' | 'setVisibility' | 'dispose'
>;
/** Bounded ownership of fallen imported models; geometry/maps remain owned by ModelLibrary. */
export class FallenHeroes {
  private entries: { model: FallenModel; age: number; reduced: boolean; modern: boolean }[] = [];
  private disposed = false;
  add(model: FallenModel, parent: Object3D, modern: boolean, reduced: boolean) {
    if (this.disposed || this.entries.length >= 12) {
      model.dispose();
      return false;
    }
    model.root.getObjectByName('UnitTeamRing')?.removeFromParent();
    if (modern) {
      model.setHitFlash(0);
      model.setVisibility(1);
    }
    if (!modern || !reduced) model.play('death', true);
    parent.add(model.root);
    this.entries.push({ model, age: 0, reduced: modern && reduced, modern });
    return true;
  }
  update(dt: number, reduced = false) {
    if (this.disposed) return;
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      entry.age += step;
      if (entry.age >= 1.1) {
        entry.model.dispose();
        this.entries.splice(i, 1);
        continue;
      }
      entry.reduced ||= entry.modern && reduced;
      if (step > 0 && !entry.reduced) entry.model.tick(step);
      if (entry.modern) entry.model.setVisibility(1 - MathUtils.smoothstep(entry.age, 0.65, 1.1));
    }
  }
  get activeCount() {
    return this.entries.length;
  }
  reset() {
    this.entries.forEach((entry) => entry.model.dispose());
    this.entries = [];
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
  }
}
