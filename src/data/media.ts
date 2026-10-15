export const SOUND_CUES = [
  'click',
  'card-draw',
  'card-wait',
  'card-ready',
  'play',
  'hit',
  'skill',
  'tower',
  'core',
  'tower-warning',
  'core-warning',
  'death',
  'footstep',
  'win',
  'lose',
] as const;
export type SoundCue = (typeof SOUND_CUES)[number];
/** Compatibility fallback; new live bindings are seeded in the database Audio module. */
export const DEFENSE_CUE_COOLDOWN = { 'tower-warning': 4000, 'core-warning': 2800 } as const;
export interface SoundBinding {
  assetId: string;
  volume: number;
  rate: number;
  cooldownMs: number;
}
export interface AudioProfile {
  master: number;
  effects: number;
  ui: number;
  maxVoices: number;
  cues: Partial<Record<SoundCue, SoundBinding>>;
  heroes: Record<string, Partial<Record<'attack' | 'cast' | 'death' | 'footstep', SoundBinding>>>;
}
export interface TextureBinding {
  assetId: string;
  normalAssetId?: string;
  roughnessAssetId?: string;
  repeat: number;
  tint: string;
}

export const VFX_EVENTS = ['spawn', 'skill', 'heal', 'death', 'pulse', 'hit', 'projectile'] as const;
export type VfxEvent = (typeof VFX_EVENTS)[number];
export interface SpriteBinding {
  assetId: string;
  columns: number;
  rows: number;
  fps: number;
}
export function defaultAudio(): AudioProfile {
  return { master: 0.7, effects: 0.8, ui: 0.6, maxVoices: 12, cues: {}, heroes: {} };
}
