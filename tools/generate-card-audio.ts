import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const rate = 22050;
const recipes = [
  { cue: 'card-draw', seconds: 0.28, description: 'Filtered paper swish, soft rising crystalline landing' },
  { cue: 'card-wait', seconds: 0.12, description: 'Short low descending wooden tick' },
  { cue: 'card-ready', seconds: 0.3, description: 'Two ascending bell partials, soft attack and decay' },
];
mkdirSync('public/design/audio', { recursive: true });
mkdirSync('assets/design/audio', { recursive: true });
const files = recipes.map((recipe) => {
  const samples = Math.round(rate * recipe.seconds),
    data = Buffer.alloc(44 + samples * 2);
  data.write('RIFF');
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(samples * 2, 40);
  let seed = 26015,
    filtered = 0;
  for (let i = 0; i < samples; i++) {
    const t = i / rate,
      phase = t / recipe.seconds;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 0x80000000 - 1;
    filtered += (noise - filtered) * 0.24;
    const fade = Math.min(1, t / 0.008) * Math.max(0, 1 - phase) ** 2;
    const sine = (hz: number) => Math.sin(2 * Math.PI * hz * t);
    let signal: number;
    if (recipe.cue === 'card-draw') {
      signal = filtered * 0.65 * Math.sin(Math.min(1, phase * 1.6) * Math.PI);
      const landing = Math.max(0, t - 0.11);
      signal +=
        (Math.sin(2 * Math.PI * 880 * landing) + 0.25 * sine(1320)) *
        0.22 *
        Math.min(1, landing * 60) *
        Math.exp(-landing * 18);
    } else if (recipe.cue === 'card-ready') {
      const second = Math.max(0, t - 0.065);
      signal =
        sine(660) * 0.3 * Math.exp(-t * 14) +
        Math.sin(2 * Math.PI * 990 * second) * 0.38 * Math.min(1, second * 100) * Math.exp(-second * 13);
    } else
      signal = (Math.sin(2 * Math.PI * (210 * t - 170 * t * t)) * 0.38 + filtered * 0.12) * Math.exp(-t * 22);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, signal * fade)) * 32767), 44 + i * 2);
  }
  const path = `public/design/audio/${recipe.cue}-v1.wav`;
  writeFileSync(path, data);
  return {
    ...recipe,
    path,
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
    sampleRate: rate,
    channels: 1,
    encoding: 'PCM 16-bit',
    author: 'Kora War / Codex',
    source: 'Original mathematical synthesis; tools/generate-card-audio.ts',
    license: 'Original Kora War project asset; no third-party samples',
  };
});
writeFileSync('assets/design/audio/manifest.json', JSON.stringify({ version: 1, files }, null, 2) + '\n');
writeFileSync(
  'assets/design/audio/README.md',
  '# Card audio\n\nThree original deterministic synthesized mobile UI cues; no external recordings or samples. Regenerate with `npx tsx tools/generate-card-audio.ts`. Mono PCM 16-bit, 22.05 kHz, 120–300 ms, total under 32 KiB. Manifest records recipe, provenance, byte size and SHA-256.\n\nRuntime bindings live in SQLite `audio.cues` (`card-draw`, `card-wait`, `card-ready`). Run `npx tsx tools/apply-card-audio.ts --apply` to back up the database and add missing bindings. Existing admin choices and historical revisions remain unchanged. The sound service applies master/UI gain, voice limits and cooldown, with a synthesized fallback when offline.\n',
);
console.log(files.map((f) => `${f.cue}: ${f.bytes} bytes`).join('\n'));
