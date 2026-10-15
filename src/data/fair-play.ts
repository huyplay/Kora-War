export interface FairPlayPolicy {
  enabled: boolean;
  rejectedCommandThreshold: number;
  shortMatchSeconds: number;
  repeatPairWindowHours: number;
  repeatPairThreshold: number;
  maximumBanHours: number;
}
export const defaultFairPlayPolicy = (): FairPlayPolicy => ({
  enabled: true,
  rejectedCommandThreshold: 12,
  shortMatchSeconds: 20,
  repeatPairWindowHours: 24,
  repeatPairThreshold: 5,
  maximumBanHours: 720,
});
export function validateFairPlayPolicy(value: unknown): asserts value is FairPlayPolicy {
  const p = value as FairPlayPolicy;
  if (!p || typeof p.enabled !== 'boolean') throw new Error('Chính sách kiểm duyệt không hợp lệ.');
  for (const [key, min, max] of [
    ['rejectedCommandThreshold', 1, 1000],
    ['shortMatchSeconds', 1, 600],
    ['repeatPairWindowHours', 1, 168],
    ['repeatPairThreshold', 2, 100],
    ['maximumBanHours', 1, 8760],
  ] as const)
    if (!Number.isInteger(p[key]) || p[key] < min || p[key] > max)
      throw new Error(`Chính sách ${key} không hợp lệ.`);
}
export interface MatchReviewSummary {
  id: string;
  kind: 'pvp' | 'ai';
  mode: string;
  status: string;
  players: string[];
  started: number;
  ended: number | null;
  revision: number;
  review: string;
  alert: boolean;
}
export interface ModerationAction {
  id: number;
  request: string;
  match: string | null;
  player: string | null;
  action: string;
  reason: string;
  actor: string;
  created: number;
  detail: unknown;
}
export interface MatchReviewDetail extends MatchReviewSummary {
  content: unknown;
  loadouts: unknown;
  seed: number;
  result: unknown;
  evidence: {
    available: boolean;
    truncated: boolean;
    summary: unknown;
    entries: {
      sequence: number;
      player: string;
      tick: number;
      command: unknown;
      error: string | null;
      received: number;
    }[];
  };
  alerts: string[];
  actions: ModerationAction[];
  bans: { player: string; until: number; reason: string }[];
}
