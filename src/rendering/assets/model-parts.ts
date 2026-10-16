import * as THREE from 'three';

export function modelMaterialNames(root: THREE.Object3D) {
  const names = new Set<string>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh)
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        if (material.name) names.add(material.name);
  });
  return [...names].sort();
}

/** Hide draw materials on this clone, retaining bones/attachments and shared geometry/textures. */
export function hideModelMaterials(root: THREE.Object3D, names: readonly string[] = []) {
  const hidden = new Set(names),
    variants = new Map<THREE.Material, THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const select = (material: THREE.Material) => {
      if (!hidden.has(material.name)) return material;
      let copy = variants.get(material);
      if (!copy) {
        copy = material.clone();
        copy.visible = false;
        variants.set(material, copy);
      }
      return copy;
    };
    object.material = Array.isArray(object.material) ? object.material.map(select) : select(object.material);
  });
  return [...variants.values()];
}

const vertices = new WeakMap<THREE.BufferGeometry, Map<string, number[]>>();
/** Exported primitives may share POSITION buffers; bounds must follow their draw indices. */
function drawnVertices(geometry: THREE.BufferGeometry, materials: THREE.Material[]) {
  const count = geometry.index?.count ?? geometry.getAttribute('position').count;
  const start = geometry.drawRange.start,
    end = Math.min(count, start + geometry.drawRange.count);
  const key = `${start}:${end}:${materials.map((material) => Number(material.visible)).join('')}`;
  let cache = vertices.get(geometry);
  if (!cache) {
    cache = new Map();
    vertices.set(geometry, cache);
  }
  const cached = cache.get(key);
  if (cached) return cached;
  const used = new Set<number>();
  const ranges = materials.length === 1 ? [{ start, count: end - start, materialIndex: 0 }] : geometry.groups;
  for (const group of ranges) {
    if (!materials[group.materialIndex ?? 0]?.visible) continue;
    for (let i = Math.max(start, group.start); i < Math.min(end, group.start + group.count); i++)
      used.add(geometry.index ? geometry.index.getX(i) : i);
  }
  const result = [...used];
  cache.set(key, result);
  return result;
}

/** Measures visible indexed vertices in the current pose, without changing shared geometry. */
export function visibleModelBounds(root: THREE.Object3D) {
  root.updateWorldMatrix(true, false);
  // SkinnedMesh overrides updateMatrixWorld to refresh bindMatrixInverse after reparenting.
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3(),
    point = new THREE.Vector3(),
    instance = new THREE.Matrix4(),
    world = new THREE.Matrix4();
  root.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.every((material) => !material.visible)) return;
    const indices = drawnVertices(object.geometry, materials);
    for (let i = 0; i < (object instanceof THREE.InstancedMesh ? object.count : 1); i++) {
      if (object instanceof THREE.InstancedMesh) {
        object.getMatrixAt(i, instance);
        world.multiplyMatrices(object.matrixWorld, instance);
      } else world.copy(object.matrixWorld);
      for (const index of indices) {
        object.getVertexPosition(index, point);
        bounds.expandByPoint(point.applyMatrix4(world));
      }
    }
  });
  // Malformed/empty imports still get finite camera/scale values; publication rejects hiding all parts.
  if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
  return bounds;
}
