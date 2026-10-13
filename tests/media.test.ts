import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectAudio } from '../server/media-inspection';
import { inspectImage } from '../server/image-inspection';
import { importAsset } from '../server/assets';
import { GameDatabase } from '../server/database';
import { defaultContent, assetReferences, validateContent } from '../src/data/content';
import { Sound } from '../src/services/audio';

function wav(seconds = 0.1) {
  const data = Buffer.alloc(44 + Math.round(seconds * 16000));
  data.write('RIFF');
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24);
  data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(data.length - 44, 40);
  return data;
}
test('audio ingestion rejects oversized duration, forged WAV headers and truncated Ogg pages', () => {
  assert.equal(inspectAudio(wav())?.duration, 0.1);
  assert.throws(() => inspectAudio(wav(16)), /15 giây/);
  const broken = wav();
  broken.writeUInt32LE(42, 28);
  assert.throws(() => inspectAudio(broken), /WAV/);
  const alignment = wav();
  alignment.writeUInt16LE(65535, 32);
  assert.throws(() => inspectAudio(alignment), /WAV/);
  const float = wav();
  float.writeUInt16LE(3, 20);
  assert.throws(() => inspectAudio(float), /WAV/);
  assert.throws(() => inspectAudio(Buffer.from('OggS')), /Ogg/);
  assert.equal(inspectAudio(Buffer.from('not audio')), undefined);
});
test('image headers enforce mobile texture dimensions and reject truncation', () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
    'base64',
  );
  assert.deepEqual(inspectImage(png), { extension: 'png', width: 1, height: 1 });
  const huge = Buffer.from(png);
  huge.writeUInt32BE(8192, 16);
  assert.throws(() => inspectImage(huge), /Texture/);
  assert.throws(() => inspectImage(png.subarray(0, 20)), /PNG/);
});
test('audio metadata is persisted and publication rejects audio used as a texture', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kora-media-'));
  const db = new GameDatabase(directory, 'test');
  t.after(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const meta = {
    name: 'test',
    author: 'Test',
    sourceUrl: 'https://example.com/test',
    license: 'CC0',
    rightsConfirmed: true,
  };
  const audio = importAsset(db, wav(), meta);
  assert.equal(audio.kind, 'audio');
  assert.equal(audio.metadata.duration, 0.1);
  const c = defaultContent();
  c.audio!.cues.hit = { assetId: audio.id, volume: 0.4, rate: 1, cooldownMs: 100 };
  assert.ok(assetReferences(c).includes(audio.id));
  db.saveDraft(c, db.config().version);
  db.publish(db.config().version);
  assert.equal(db.config().published.audio?.cues.hit?.assetId, audio.id);
  c.map.textures = { stone: { assetId: audio.id, repeat: 1, tint: '#ffffff' } };
  db.saveDraft(c, db.config().version);
  assert.throws(() => db.publish(db.config().version), /Texture/);
  c.audio!.maxVoices = 1000;
  assert.throws(() => validateContent(c), /Audio/);
});
test('audio voice cap, cooldown and teardown work without affecting game state', () => {
  const sources: { started: boolean; stop(): void; onended?: () => void }[] = [];
  const param = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  const node = () => ({
    connect() {},
    disconnect() {},
    gain: { ...param },
    pan: { ...param },
    threshold: { ...param },
    ratio: { ...param },
  });
  const old = globalThis.AudioContext;
  let closed = false;
  globalThis.AudioContext = class {
    state = 'running';
    currentTime = 0;
    destination = {};
    createGain = node;
    createStereoPanner = node;
    createDynamicsCompressor = node;
    createOscillator() {
      const source = {
        ...node(),
        frequency: { ...param },
        type: 'sine',
        started: false,
        onended: undefined as undefined | (() => void),
        start() {
          this.started = true;
        },
        stop() {
          assert.equal(this.started, true);
        },
      };
      sources.push(source);
      return source;
    }
    close() {
      closed = true;
      return Promise.resolve();
    }
  } as unknown as typeof AudioContext;
  try {
    const sound = new Sound(),
      config = defaultContent().audio!;
    config.maxVoices = 2;
    sound.configure(config);
    sound.unlock();
    sound.tone('hit');
    sound.tone('hit');
    sound.tone('skill');
    sound.tone('click');
    assert.equal(sources.length, 2);
    sources[0].onended?.();
    sound.tone('play');
    assert.equal(sources.length, 3);
    sound.dispose();
    assert.equal(closed, true);
    sound.unlock();
    assert.equal(sound.ctx, null);
  } finally {
    globalThis.AudioContext = old;
  }
});
