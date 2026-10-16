import { inspectGLB } from './assets';

/** Only materials referenced by draw primitives count; unused recall materials are ignored. */
export function inspectModelMaterials(bytes: Buffer): string[] {
  inspectGLB(bytes);
  const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const names = new Set<string>();
  for (const mesh of doc.meshes ?? [])
    for (const primitive of mesh.primitives ?? []) names.add(doc.materials?.[primitive.material]?.name ?? '');
  return [...names].sort();
}
