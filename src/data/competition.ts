import type { ContentConfig } from './content';

export const MATCH_MODES = ['friendly', 'casual', 'ranked', 'challenge'] as const;
export type MatchMode = (typeof MATCH_MODES)[number];
export type QueueMode = Exclude<MatchMode, 'friendly'>;
export interface CompetitionConfig {
  modes: Record<MatchMode, { enabled: boolean; name: string; description: string }>;
  rating: {
    initial: number;
    floor: number;
    kFactor: number;
    scale: number;
    tiers: { name: string; minimum: number }[];
  };
  queue: { initialRange: number; expandPerSecond: number; maximumRange: number; timeoutSeconds: number };
  challenge: { name: string; manaPerSecond: number; overtimeAt: number };
}
/** Seeds only. Live matchmaking and settlement read the locked database content. */
export function defaultCompetition(): CompetitionConfig {
  return {
    modes: {
      friendly: { enabled: true, name: 'Đấu bạn bè', description: 'Phòng riêng · không tính hạng' },
      casual: { enabled: true, name: 'Đấu thường', description: 'Tìm đối thủ · không mất điểm hạng' },
      ranked: { enabled: true, name: 'Đấu hạng', description: 'Tranh tài Elo · chỉ số chuẩn hóa' },
      challenge: {
        enabled: true,
        name: 'Thử thách',
        description: 'Dòng Aether · mana nhanh, quá tải sớm · không tính hạng',
      },
    },
    rating: {
      initial: 1000,
      floor: 0,
      kFactor: 32,
      scale: 400,
      tiers: [
        { name: 'Đồng', minimum: 0 },
        { name: 'Bạc', minimum: 1100 },
        { name: 'Vàng', minimum: 1300 },
        { name: 'Bạch Kim', minimum: 1500 },
        { name: 'Kim Cương', minimum: 1800 },
        { name: 'Cao Thủ', minimum: 2100 },
      ],
    },
    queue: { initialRange: 150, expandPerSecond: 5, maximumRange: 800, timeoutSeconds: 180 },
    challenge: { name: 'Dòng Aether', manaPerSecond: 2.1, overtimeAt: 90 },
  };
}
export const competitionOf = (c: ContentConfig) => c.competition ?? defaultCompetition();
export function tierFor(rating: number, config: CompetitionConfig) {
  return config.rating.tiers.filter((t) => rating >= t.minimum).at(-1)?.name ?? config.rating.tiers[0].name;
}
export function eloAfter(a: number, b: number, score: number, config: CompetitionConfig): number {
  const r = config.rating;
  return Math.max(
    Math.min(r.floor, a),
    Math.round(a + r.kFactor * (score - 1 / (1 + 10 ** ((b - a) / r.scale)))),
  );
}
export function modeContent(base: ContentConfig, mode: MatchMode): ContentConfig {
  const content = structuredClone(base);
  if (mode === 'challenge') {
    const c = competitionOf(base).challenge;
    content.rules.manaPerSecond = c.manaPerSecond;
    content.rules.overtimeAt = c.overtimeAt;
    content.map.name = c.name;
  }
  return content;
}
export function validateCompetition(c: CompetitionConfig, base: ContentConfig) {
  const fail = () => {
    throw new Error('Cấu hình đấu hạng/chế độ không hợp lệ.');
  };
  const num = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  const text = (v: string, max = 100) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!c || !c.modes || !c.rating || !c.queue || !c.challenge) return fail();
  for (const mode of MATCH_MODES) {
    const m = c.modes[mode];
    if (!m || typeof m.enabled !== 'boolean' || !text(m.name, 40) || !text(m.description, 200)) fail();
  }
  const r = c.rating,
    q = c.queue,
    t = c.challenge;
  if (
    !Number.isInteger(r.initial) ||
    !num(r.initial, 0, 10000) ||
    !Number.isInteger(r.floor) ||
    !num(r.floor, 0, r.initial) ||
    !num(r.kFactor, 1, 200) ||
    !num(r.scale, 50, 2000) ||
    !Array.isArray(r.tiers) ||
    r.tiers.length < 1 ||
    r.tiers.length > 20
  )
    fail();
  if (new Set(r.tiers.map((t) => t.name)).size !== r.tiers.length) fail();
  r.tiers.forEach((t, i) => {
    if (
      !text(t.name, 40) ||
      !Number.isInteger(t.minimum) ||
      !num(t.minimum, 0, 100000) ||
      (i === 0 ? t.minimum > r.floor : t.minimum <= r.tiers[i - 1].minimum)
    )
      fail();
  });
  if (
    !num(q.initialRange, 0, 10000) ||
    !num(q.maximumRange, q.initialRange, 10000) ||
    !num(q.expandPerSecond, 0, 100) ||
    !num(q.timeoutSeconds, 15, 600) ||
    !text(t.name, 80) ||
    !num(t.manaPerSecond, base.rules.manaPerSecond, 10000) ||
    !num(t.overtimeAt, 10, base.rules.overtimeAt)
  )
    fail();
}

export interface MatchOutcome {
  matchId: string;
  mode: MatchMode;
  result: 'win' | 'loss' | 'draw' | 'void';
  reason: string;
  before: number;
  after: number;
  delta: number;
  tier: string;
}
export interface Standing {
  name: string;
  rating: number;
  games: number;
  wins: number;
  tier: string;
  rank: number | null;
}
export interface CompetitionOverview {
  self: Standing;
  leaderboard: (Standing & { self: boolean })[];
  history: (MatchOutcome & { ended: number; map: string; corrected?: boolean })[];
}
