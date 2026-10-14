import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GameDatabase } from '../server/database';
import { importAsset } from '../server/assets';
import { inspectImage } from '../server/image-inspection';

interface ArtFile {
  file: string;
  sha256: string;
  sizeBytes: number;
}
interface ArtManifest {
  author: string;
  license: string;
  items: { id: string; assets: { webp: ArtFile; png: ArtFile; svgSource: ArtFile } }[];
}

export function verifiedReactionArt(root: string) {
  const directory = resolve(root, 'assets/design/reactions');
  const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8')) as ArtManifest;
  if (
    !manifest.author?.trim() ||
    !manifest.license?.trim() ||
    !Array.isArray(manifest.items) ||
    !manifest.items.length
  )
    throw new Error('Reaction art manifest thiếu provenance/items.');
  const seen = new Set<string>();
  return manifest.items.map((item) => {
    if (!/^[a-z][a-z0-9-]{0,47}$/.test(item.id) || seen.has(item.id))
      throw new Error('Reaction ID không hợp lệ/trùng.');
    seen.add(item.id);
    const files = Object.entries(item.assets).map(([format, file]) => {
      const path = resolve(directory, file.file);
      if (!path.startsWith(directory + sep)) throw new Error('Reaction path ngoài thư mục art.');
      const bytes = readFileSync(path);
      if (bytes.length !== file.sizeBytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256)
        throw new Error('Reaction checksum/size: ' + item.id + '/' + format);
      if (format !== 'svgSource') {
        const image = inspectImage(bytes);
        if (
          !image ||
          image.extension !== format ||
          image.width !== 256 ||
          image.height !== 256 ||
          bytes.length > 102400
        )
          throw new Error('Reaction format/resolution/budget: ' + item.id);
        const publicCopy = resolve(root, 'public/design/reactions', item.id + '.' + format);
        if (!readFileSync(publicCopy).equals(bytes))
          throw new Error('Reaction public copy mismatch: ' + item.id);
      }
      return { format, file, bytes };
    });
    const webp = files.find((file) => file.format === 'webp');
    const source = files.find((file) => file.format === 'svgSource');
    if (!webp || !source || !files.some((file) => file.format === 'png'))
      throw new Error('Reaction art thiếu file.');
    return {
      id: item.id,
      bytes: webp.bytes,
      checksum: webp.file.sha256,
      source: source.file.file,
      author: manifest.author,
      license: manifest.license,
    };
  });
}

export function importReactionArt(
  store: GameDatabase,
  root: string,
  options: { bind: boolean; publish: boolean; sourceRef: string },
) {
  const art = verifiedReactionArt(root);
  if (!/^[a-f0-9]{40}$/.test(options.sourceRef)) throw new Error('Source ref phải là commit SHA.');
  if (options.publish && !options.bind) throw new Error('Publish cần bind.');
  const state = store.config();
  if (options.publish && JSON.stringify(state.draft) !== JSON.stringify(state.published))
    throw new Error('Có bản nháp khác; lưu/publish qua admin trước khi nhập art với publish.');
  const reactions = state.draft.communication?.reactions;
  if (options.bind && art.some((item) => !reactions?.some((r) => r.id === item.id && r.kind === 'emoji')))
    throw new Error('Reaction art không khớp catalog emoji.');
  const bindings: Record<string, string> = {};
  let changed = false;
  for (const item of art) {
    const asset =
      store
        .assets()
        .find(
          (a) =>
            a.sha256 === item.checksum &&
            a.kind === 'image' &&
            existsSync(resolve(store.directory, a.path as string)),
        ) ||
      importAsset(store, item.bytes, {
        name: 'Kora reaction · ' + item.id,
        author: item.author,
        license: item.license,
        sourceUrl: `https://github.com/huyplay/Kora-War/blob/${options.sourceRef}/assets/design/reactions/${item.source}`,
        rightsConfirmed: true,
      });
    bindings[item.id] = asset.id;
    const reaction = reactions?.find((r) => r.id === item.id);
    if (options.bind && reaction && !reaction.imageAssetId) {
      reaction.imageAssetId = asset.id;
      changed = true;
    }
  }
  if (changed) {
    const saved = store.saveDraft(state.draft, state.version);
    if (options.publish) store.publish(saved.version);
  }
  return { bindings, changed, revision: store.config().revision };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = new Set(process.argv.slice(2));
  if (![...args].every((arg) => ['--verify', '--import', '--bind', '--publish'].includes(arg)))
    throw new Error('Unknown reaction import option.');
  const art = verifiedReactionArt(root);
  if (!args.has('--import') && !args.has('--bind') && !args.has('--publish')) {
    console.log(
      'Reaction art verified:',
      art.map((item) => ({ id: item.id, bytes: item.bytes.length })),
    );
  } else {
    const store = new GameDatabase(
      resolve(process.env.KORA_DATA_DIR || '.data'),
      process.env.KORA_ADMIN_PASSWORD,
    );
    try {
      console.log(
        importReactionArt(store, root, {
          bind: args.has('--bind'),
          publish: args.has('--publish'),
          sourceRef: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        }),
      );
    } finally {
      store.close();
    }
  }
}
