import type { Object3D } from 'three';

/** Some exported glTF scenes contain every LOD as a sibling, all visible.
 * Keep the most detailed supplied variant in each family on this instance only. */
export function selectModelLod(root: Object3D) {
  root.traverse((parent) => {
    const families = new Map<string, { object: Object3D; level: number }[]>();
    for (const object of parent.children) {
      const match = /^(.*)_LOD(\d+)$/i.exec(object.name);
      if (!match) continue;
      const key = match[1].toLowerCase(),
        list = families.get(key) ?? [];
      list.push({ object, level: Number(match[2]) });
      families.set(key, list);
    }
    for (const family of families.values()) {
      const first = Math.min(...family.map((item) => item.level));
      for (const item of family) if (item.level !== first) parent.remove(item.object);
    }
  });
}
