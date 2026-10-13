import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameDatabase } from './database';
import { inspectAudio } from './media-inspection';
import { inspectImage } from './image-inspection';

export function inspectGLB(bytes: Buffer) {
  if (
    bytes.length < 20 ||
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length ||
    bytes.readUInt32LE(16) !== 0x4e4f534a
  )
    throw new Error('GLB 2.0 không hợp lệ.');
  const length = bytes.readUInt32LE(12);
  if (length > 8 * 1024 * 1024 || length + 20 > bytes.length) throw new Error('GLB JSON quá lớn/hỏng.');
  const doc = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  if (doc.asset?.version !== '2.0' || !Array.isArray(doc.nodes)) throw new Error('Thiếu node glTF 2.0.');
  for (const item of [...(doc.buffers || []), ...(doc.images || [])])
    if (item.uri && !/^data:(image\/(png|jpeg|webp)|application\/octet-stream);base64,/.test(item.uri))
      throw new Error('GLB phải tự chứa buffer/texture; không cho phép URL ngoài.');
  if ((doc.nodes?.length || 0) > 2000 || (doc.animations?.length || 0) > 200)
    throw new Error('Asset vượt ngân sách node/animation mobile.');
  const triangles = (doc.meshes || [])
    .flatMap((m: { primitives: unknown[] }) => m.primitives)
    .reduce(
      (n: number, p: { indices?: number; attributes: { POSITION: number } }) =>
        n + (doc.accessors?.[p.indices ?? p.attributes.POSITION]?.count || 0) / 3,
      0,
    );
  if (triangles > 150000) throw new Error('Model vượt 150.000 triangles.');
  return {
    clips: (doc.animations || []).map((a: { name?: string }, i: number) => a.name || `clip-${i}`),
    triangles: Math.round(triangles),
    nodes: doc.nodes.length,
    skins: doc.skins?.length || 0,
  };
}
export function importAsset(store: GameDatabase, bytes: Buffer, metadata: Record<string, unknown>) {
  const name = String(metadata.name || '');
  if (
    !name ||
    name.length > 160 ||
    metadata.rightsConfirmed !== true ||
    !String(metadata.author || '').trim() ||
    !String(metadata.license || '').trim()
  )
    throw new Error('Cần tên, tác giả, giấy phép và xác nhận quyền dùng.');
  const source = new URL(String(metadata.sourceUrl));
  if (!['http:', 'https:'].includes(source.protocol)) throw new Error('Nguồn asset phải là URL HTTP(S).');
  if (bytes.length > 30 * 1024 * 1024) throw new Error('File tối đa 30 MB.');
  const isGLB = bytes.subarray(0, 4).toString() === 'glTF';
  let extension = '',
    details = {};
  const audio = inspectAudio(bytes);
  const image = inspectImage(bytes);
  if (audio && bytes.length > 4 * 1024 * 1024) throw new Error('SFX tối đa 4 MB.');
  if (isGLB) {
    extension = 'glb';
    details = inspectGLB(bytes);
  } else if (audio) {
    extension = audio.extension;
    details = audio;
  } else if (image) {
    extension = image.extension;
    details = image;
  } else throw new Error('Chỉ hỗ trợ GLB, PNG, JPEG, WebP, WAV và Ogg.');
  const id = randomUUID(),
    path = `uploads/${id}.${extension}`;
  mkdirSync(join(store.directory, 'uploads'), { recursive: true });
  writeFileSync(join(store.directory, path), bytes);
  const meta = {
    name,
    author: String(metadata.author).slice(0, 200),
    license: String(metadata.license).slice(0, 500),
    sourceUrl: source.href,
    rightsConfirmed: true,
    ...details,
  };
  store.db
    .prepare('INSERT INTO assets(id,name,kind,path,bytes,sha256,metadata) VALUES(?,?,?,?,?,?,?)')
    .run(
      id,
      name,
      isGLB ? 'model' : audio ? 'audio' : 'image',
      path,
      bytes.length,
      createHash('sha256').update(bytes).digest('hex'),
      JSON.stringify(meta),
    );
  store.audit('asset.upload', { id, name });
  return store.assets().find((a) => a.id === id)!;
}
