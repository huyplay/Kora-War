/** Lossless accessor repacking for self-contained, uncompressed GLB 2.0 assets.
 * Retains chosen animation clips; preserves mesh, skin, textures and keyframe values.
 * Unsupported compression/sparse accessors are rejected rather than silently damaged.
 */
export function compactGLB(input: Buffer, keepClips: string[]): Buffer {
  const jsonLength = input.readUInt32LE(12);
  const doc = JSON.parse(input.subarray(20, 20 + jsonLength).toString());
  const binOffset = 20 + jsonLength + 8;
  const binary = input.subarray(binOffset);
  if (
    doc.buffers?.length !== 1 ||
    doc.buffers[0].uri ||
    doc.accessors.some((a: { sparse?: unknown }) => a.sparse) ||
    (doc.extensionsUsed || []).some((e: string) =>
      ['KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(e),
    )
  )
    throw new Error('Unsupported GLB compression/sparse layout.');
  doc.animations = (doc.animations || []).filter((a: { name: string }) => keepClips.includes(a.name));
  const used = new Set<number>();
  const visit = (callback: (index: number) => number) => {
    for (const mesh of doc.meshes || [])
      for (const p of mesh.primitives) {
        for (const k of Object.keys(p.attributes)) p.attributes[k] = callback(p.attributes[k]);
        if (p.indices !== undefined) p.indices = callback(p.indices);
        for (const t of p.targets || []) for (const k of Object.keys(t)) t[k] = callback(t[k]);
      }
    for (const skin of doc.skins || [])
      if (skin.inverseBindMatrices !== undefined)
        skin.inverseBindMatrices = callback(skin.inverseBindMatrices);
    for (const animation of doc.animations)
      for (const sampler of animation.samplers) {
        sampler.input = callback(sampler.input);
        sampler.output = callback(sampler.output);
      }
  };
  visit((index) => {
    used.add(index);
    return index;
  });
  const oldAccessors = doc.accessors,
    oldViews = doc.bufferViews;
  const chunks: Buffer[] = [],
    views: Record<string, number>[] = [],
    accessors: Record<string, unknown>[] = [],
    mapping = new Map<number, number>();
  let length = 0;
  const addView = (bytes: Buffer, target?: number) => {
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      length += pad;
    }
    const index = views.length;
    views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, ...(target ? { target } : {}) });
    chunks.push(bytes);
    length += bytes.length;
    return index;
  };
  const components: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const bytes: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  for (const index of [...used].sort((a, b) => a - b)) {
    const a = oldAccessors[index],
      view = oldViews[a.bufferView];
    const size = components[a.type] * bytes[a.componentType];
    if (!size || !view) throw new Error('Unsupported accessor layout.');
    const stride = view.byteStride || size,
      offset = (view.byteOffset || 0) + (a.byteOffset || 0),
      packed = Buffer.alloc(a.count * size);
    for (let n = 0; n < a.count; n++)
      binary.copy(packed, n * size, offset + n * stride, offset + n * stride + size);
    mapping.set(index, accessors.length);
    accessors.push({ ...a, bufferView: addView(packed, view.target), byteOffset: 0 });
  }
  visit((index) => mapping.get(index)!);
  for (const image of doc.images || [])
    if (image.bufferView !== undefined) {
      const v = oldViews[image.bufferView];
      image.bufferView = addView(binary.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength));
    }
  doc.accessors = accessors;
  doc.bufferViews = views;
  doc.buffers = [{ byteLength: length }];
  const rawJSON = Buffer.from(JSON.stringify(doc)),
    jsonPad = (4 - (rawJSON.length % 4)) % 4,
    json = Buffer.concat([rawJSON, Buffer.alloc(jsonPad, 32)]);
  const bin = Buffer.concat([...chunks, Buffer.alloc((4 - (length % 4)) % 4)]),
    out = Buffer.alloc(12 + 8 + json.length + 8 + bin.length);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(json.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  json.copy(out, 20);
  const b = 20 + json.length;
  out.writeUInt32LE(bin.length, b);
  out.writeUInt32LE(0x004e4942, b + 4);
  bin.copy(out, b + 8);
  return out;
}
