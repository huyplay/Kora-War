import type { GameEvent, Unit } from '../core/types';
import { defaultAudio, type AudioProfile, type SoundCue } from '../data/media';

/** Browser-only presentation service. Audio never controls simulation timing. */
export class Sound {
  private profile = defaultAudio();
  private buffers = new Map<string, AudioBuffer>();
  private decodedBytes = 0;
  private loading = new Map<string, Promise<void>>();
  private failed = new Set<string>();
  private played = new Map<string, number>();
  private voices = new Set<AudioScheduledSourceNode>();
  private attackTimes = new Map<number, number>();
  private master?: GainNode;
  private disposed = false;
  private active = true;
  get enabled() {
    return this.active;
  }
  set enabled(value: boolean) {
    this.active = value;
    if (!value) this.stop();
  }
  ctx: AudioContext | null = null;
  configure(profile?: AudioProfile) {
    this.profile = structuredClone(profile || defaultAudio());
  }
  unlock() {
    if (this.disposed) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.profile.master;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 12;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
      for (const b of Object.values(this.profile.cues)) void this.load(b.assetId);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
  }
  private load(id: string): Promise<void> {
    if (this.loading.has(id)) return this.loading.get(id)!;
    if (!this.ctx || this.buffers.has(id) || this.failed.has(id)) return Promise.resolve();
    if (this.loading.size >= 4) return Promise.resolve();
    const context = this.ctx;
    const promise = (async () => {
      try {
        const response = await fetch(`/api/assets/${id}`, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('Sound unavailable');
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 4 * 1024 * 1024) throw new Error('Sound budget exceeded');
        const buffer = await context.decodeAudioData(bytes);
        if (buffer.duration > 15 || buffer.numberOfChannels > 2) throw new Error('Sound budget exceeded');
        const size = buffer.length * buffer.numberOfChannels * 4;
        if (size > 8 * 1024 * 1024) throw new Error('Decoded sound budget exceeded');
        if (!this.disposed) {
          while (this.buffers.size >= 32 || this.decodedBytes + size > 16 * 1024 * 1024) {
            const oldest = this.buffers.keys().next().value!;
            const cached = this.buffers.get(oldest)!;
            this.decodedBytes -= cached.length * cached.numberOfChannels * 4;
            this.buffers.delete(oldest);
          }
          this.buffers.set(id, buffer);
          this.decodedBytes += size;
        }
      } catch {
        this.failed.add(id);
      } finally {
        this.loading.delete(id);
      }
    })();
    this.loading.set(id, promise);
    return promise;
  }
  tone(cue: SoundCue, x = 0, binding = this.profile.cues[cue], key: string = cue) {
    const c = this.ctx;
    if (!this.enabled || !c || c.state !== 'running' || this.disposed) return;
    const now = c.currentTime,
      last = this.played.get(key) ?? -Infinity;
    const cooldown = (binding?.cooldownMs ?? (cue === 'hit' ? 100 : cue === 'footstep' ? 320 : 60)) / 1000;
    if (now - last < cooldown || this.voices.size >= this.profile.maxVoices) return;
    this.played.set(key, now);
    const bus = ['click', 'win', 'lose'].includes(cue) ? this.profile.ui : this.profile.effects;
    const gain = c.createGain(),
      pan = c.createStereoPanner();
    gain.gain.value = (binding?.volume ?? 0.08) * bus;
    pan.pan.value = Math.max(-0.8, Math.min(0.8, x / 20));
    gain.connect(pan);
    pan.connect(this.master!);
    let source: AudioBufferSourceNode | OscillatorNode;
    const buffer = binding && this.buffers.get(binding.assetId);
    if (buffer) {
      source = c.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = binding.rate;
    } else {
      if (binding) void this.load(binding.assetId);
      source = c.createOscillator();
      source.type = cue === 'hit' || cue === 'tower' ? 'triangle' : 'sine';
      source.frequency.value =
        cue === 'win' ? 784 : cue === 'lose' ? 196 : cue === 'skill' ? 660 : cue === 'hit' ? 120 : 440;
      gain.gain.setValueAtTime(gain.gain.value * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    }
    this.voices.add(source);
    source.connect(gain);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
    source.start();
    if (!buffer) source.stop(now + 0.14);
  }
  event(event: GameEvent) {
    const specific = event.heroId && this.profile.heroes[event.heroId];
    const cue =
      event.type === 'spawn'
        ? 'play'
        : event.type === 'pulse'
          ? 'skill'
          : event.type === 'projectile'
            ? event.heroId
              ? 'hit'
              : 'tower'
            : event.type;
    if (!['play', 'hit', 'skill', 'tower', 'core', 'death'].includes(cue)) return;
    const binding =
      specific &&
      (event.type === 'skill' ? specific.cast : event.type === 'death' ? specific.death : undefined);
    this.tone(
      cue as SoundCue,
      event.x,
      binding || this.profile.cues[cue as SoundCue],
      binding ? `${event.heroId}:${cue}` : cue,
    );
  }
  movement(units: Unit[]) {
    const alive = new Set(units.map((u) => u.id));
    for (const id of this.attackTimes.keys()) if (!alive.has(id)) this.attackTimes.delete(id);
    for (const unit of units) {
      const previous = this.attackTimes.get(unit.id) ?? 0;
      this.attackTimes.set(unit.id, unit.attackAt);
      const binding =
        this.profile.heroes[unit.heroId]?.attack || (unit.range <= 2 ? this.profile.cues.hit : undefined);
      if (binding && unit.attackAt > previous) this.tone('hit', unit.x, binding, `${unit.heroId}:attack`);
    }
    for (const unit of units.filter((u) => u.hp > 0 && u.state === 'move').slice(0, 3)) {
      const binding = this.profile.heroes[unit.heroId]?.footstep || this.profile.cues.footstep;
      if (binding) this.tone('footstep', unit.x, binding, 'footstep');
    }
  }
  stop() {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {}
    }
  }
  reset() {
    this.stop();
    this.attackTimes.clear();
    this.played.clear();
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.buffers.clear();
    this.decodedBytes = 0;
    this.played.clear();
    if (this.ctx) void this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}
