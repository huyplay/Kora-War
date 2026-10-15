import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const rate = 22050;
const recipes = [
  {
    cue: 'tower-warning',
    seconds: 0.58,
    pitch: 740,
    beats: [0, 0.22],
    description: 'Two descending resonant caution chimes',
  },
  {
    cue: 'core-warning',
    seconds: 0.74,
    pitch: 392,
    beats: [0, 0.24, 0.48],
    description: 'Three low urgent pulses with soft bell overtones',
  },
] as const;
mkdirSync('public/design/audio/defense', { recursive: true });
mkdirSync('assets/design/audio/defense', { recursive: true });
const files = recipes.map((recipe) => {
  const count = Math.round(rate * recipe.seconds),
    bytes = Buffer.alloc(44 + count * 2);
  bytes.write('RIFF');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const time = i / rate;
    let signal = 0;
    for (const [beat, onset] of recipe.beats.entries()) {
      const t = time - onset;
      if (t < 0) continue;
      const envelope = Math.min(1, t / 0.012) * Math.exp(-t * 18);
      const pitch = recipe.pitch * (beat % 2 ? 0.75 : 1);
      signal +=
        envelope *
        (Math.sin(2 * Math.PI * pitch * t) * 0.64 + Math.sin(2 * Math.PI * pitch * 2.01 * t) * 0.16);
    }
    signal *= Math.min(1, (recipe.seconds - time) / 0.02);
    bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, signal)) * 32767), 44 + i * 2);
  }
  const path = `public/design/audio/defense/${recipe.cue}-v1.wav`;
  writeFileSync(path, bytes);
  return {
    ...recipe,
    path,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sampleRate: rate,
    channels: 1,
    encoding: 'PCM 16-bit',
    author: 'Kora War / Codex',
    source: 'Original mathematical synthesis; tools/generate-defense-audio.ts',
    license: 'Original Kora War project asset; no third-party samples',
  };
});
writeFileSync(
  'assets/design/audio/defense/manifest.json',
  JSON.stringify({ version: 1, files }, null, 2) + '\n',
);
writeFileSync(
  'assets/design/audio/defense/README.md',
  '# Defense warning audio\n\nTwo original, deterministic synthesized warnings; no external recordings or samples. Regenerate with `npx tsx tools/generate-defense-audio.ts`. Mono 16-bit PCM / 22.05 kHz, 580–740 ms; combined size below 64 KiB. Manifest contains provenance and SHA-256.\n\nOptional database audio cues: `tower-warning` and `core-warning`. Install with `npx tsx tools/apply-defense-audio.ts --apply`; backup, historical snapshots and existing admin choices are preserved. Volume, rate and warning repeat interval are editable in Content Studio → Audio. Muting master/UI gain silences warnings.\n',
);
console.log(files.map((f) => `${f.cue}: ${f.bytes} bytes`).join('\n'));
