import type { GameDatabase } from './database';
import type { MatchOutcome } from '../src/data/competition';
import {
  defaultFairPlayPolicy,
  validateFairPlayPolicy,
  type FairPlayPolicy,
  type MatchReviewSummary,
  type MatchReviewDetail,
  type ModerationAction,
} from '../src/data/fair-play';

const EVIDENCE_LIMIT = 4096; // storage bound, not a gameplay rule
export class FairPlayStore {
  constructor(private store: GameDatabase) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS fair_play_policy(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS match_reviews(match TEXT PRIMARY KEY REFERENCES pvp_matches(id),status TEXT NOT NULL DEFAULT 'unreviewed',summary TEXT,available INTEGER NOT NULL DEFAULT 1,truncated INTEGER NOT NULL DEFAULT 0,policy TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS match_evidence(sequence INTEGER PRIMARY KEY AUTOINCREMENT,match TEXT NOT NULL REFERENCES pvp_matches(id),player TEXT NOT NULL,tick INTEGER NOT NULL,request TEXT NOT NULL,command TEXT NOT NULL,error TEXT,received INTEGER NOT NULL,UNIQUE(match,player,request));
      CREATE INDEX IF NOT EXISTS evidence_match ON match_evidence(match,sequence);
      CREATE TABLE IF NOT EXISTS moderation_actions(id INTEGER PRIMARY KEY AUTOINCREMENT,request TEXT UNIQUE NOT NULL,match TEXT,player TEXT,action TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created INTEGER NOT NULL,detail TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS moderation_match ON moderation_actions(match,id);
      CREATE TABLE IF NOT EXISTS pvp_bans(player TEXT PRIMARY KEY REFERENCES players(id),until INTEGER NOT NULL,reason TEXT NOT NULL,action INTEGER NOT NULL REFERENCES moderation_actions(id));
      CREATE TABLE IF NOT EXISTS match_corrections(match TEXT PRIMARY KEY REFERENCES pvp_matches(id),action INTEGER NOT NULL REFERENCES moderation_actions(id),adjustments TEXT NOT NULL);`);
    store.db
      .prepare('INSERT OR IGNORE INTO fair_play_policy VALUES(1,1,?)')
      .run(JSON.stringify(defaultFairPlayPolicy()));
  }
  policy() {
    const row = this.store.db.prepare('SELECT * FROM fair_play_policy WHERE id=1').get()!;
    return { version: Number(row.version), policy: JSON.parse(String(row.payload)) as FairPlayPolicy };
  }
  savePolicy(policy: unknown, version: number) {
    validateFairPlayPolicy(policy);
    return this.store.transaction(() => {
      const before = this.policy();
      if (!Number.isSafeInteger(version) || version !== before.version)
        throw new Error('CONFLICT: Chính sách đã thay đổi. Tải lại.');
      this.store.db
        .prepare('UPDATE fair_play_policy SET version=version+1,payload=? WHERE id=1')
        .run(JSON.stringify(policy));
      this.store.audit('fairplay.policy', { actor: 'admin', before, after: policy });
      return this.policy();
    });
  }
  start(id: string) {
    this.store.db
      .prepare('INSERT INTO match_reviews(match,policy) VALUES(?,?)')
      .run(id, JSON.stringify(this.policy()));
  }
  record(id: string, player: string, tick: number, command: unknown, error: string | null) {
    // Store a bounded whitelist, not arbitrary request bodies or credentials.
    const c = (command && typeof command === 'object' ? command : {}) as Record<string, unknown>;
    const safe: Record<string, unknown> = {};
    for (const key of ['id', 'type', 'card', 'cardUid', 'lane', 'x', 'cards']) {
      const v = c[key];
      if (typeof v === 'string') safe[key] = v.slice(0, 100);
      else if (typeof v === 'number' && Number.isFinite(v)) safe[key] = v;
      else if (key === 'cards' && Array.isArray(v)) safe[key] = v.slice(0, 6).filter(Number.isSafeInteger);
    }
    const request =
      typeof c.id === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(c.id)
        ? c.id
        : `invalid-${JSON.stringify(safe).slice(0, 200)}`;
    const total = Number(
      this.store.db.prepare('SELECT count(*) n FROM match_evidence WHERE match=?').get(id)!.n,
    );
    if (total >= EVIDENCE_LIMIT) {
      this.store.db.prepare('UPDATE match_reviews SET truncated=1 WHERE match=?').run(id);
      return;
    }
    this.store.db
      .prepare(
        'INSERT OR IGNORE INTO match_evidence(match,player,tick,request,command,error,received) VALUES(?,?,?,?,?,?,?)',
      )
      .run(id, player, tick, request, JSON.stringify(safe), error?.slice(0, 240) ?? null, Date.now());
  }
  finish(id: string, summary: unknown) {
    this.store.db
      .prepare('UPDATE match_reviews SET summary=COALESCE(summary,?) WHERE match=?')
      .run(JSON.stringify(summary), id);
  }
  assertAllowed(player: string) {
    const ban = this.store.db
      .prepare('SELECT * FROM pvp_bans WHERE player=? AND until>?')
      .get(player, Date.now());
    if (ban)
      throw new Error(`PvP tạm khóa đến ${new Date(Number(ban.until)).toISOString()}. Lý do: ${ban.reason}`);
  }
  private alerts(
    id: string,
    content: { started: number; ended: number | null; players: string[]; mode: string },
  ) {
    const review = this.store.db.prepare('SELECT * FROM match_reviews WHERE match=?').get(id);
    const p = review ? (JSON.parse(String(review.policy)).policy as FairPlayPolicy) : this.policy().policy;
    if (!p.enabled) return [];
    const alerts: string[] = [];
    const rejected = this.store.db
      .prepare(
        'SELECT player,count(*) n FROM match_evidence WHERE match=? AND error IS NOT NULL GROUP BY player',
      )
      .all(id);
    for (const row of rejected)
      if (Number(row.n) >= p.rejectedCommandThreshold)
        alerts.push(`${row.player}: ${row.n} lệnh khác nhau bị từ chối`);
    if (content.ended && content.ended - content.started < p.shortMatchSeconds * 1000)
      alerts.push(`Trận kết thúc dưới ${p.shortMatchSeconds} giây (có thể do đầu hàng/mất kết nối)`);
    if (content.players.length === 2 && content.mode === 'ranked') {
      const repeat = this.store.db
        .prepare(
          `SELECT count(*) n FROM pvp_matches p JOIN pvp_members a ON a.match=p.id JOIN pvp_members b ON b.match=p.id
        WHERE a.player=? AND b.player=? AND p.mode='ranked' AND p.started BETWEEN ? AND ?`,
        )
        .get(
          content.players[0],
          content.players[1],
          content.started - p.repeatPairWindowHours * 3600000,
          content.started,
        )!;
      if (Number(repeat.n) >= p.repeatPairThreshold)
        alerts.push(`Cặp đối thủ gặp ${repeat.n} lần trong ${p.repeatPairWindowHours} giờ`);
    }
    if (review?.truncated) alerts.push('Nhật ký đã đạt giới hạn lưu trữ; bằng chứng không đầy đủ');
    return alerts;
  }
  list(input: {
    kind?: string;
    player?: string;
    status?: string;
    mode?: string;
    offset?: number;
    id?: string;
  }) {
    const kind = input.kind ?? 'pvp',
      offset = input.offset ?? 0;
    if (!['pvp', 'ai'].includes(kind) || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000)
      throw new Error('Bộ lọc không hợp lệ.');
    const player = (input.player ?? '').slice(0, 100),
      id = (input.id ?? '').slice(0, 100),
      status = input.status ?? '',
      mode = input.mode ?? '';
    const where =
      kind === 'pvp'
        ? `(?='' OR EXISTS(SELECT 1 FROM pvp_members m WHERE m.match=p.id AND m.player=?)) AND (?='' OR p.id=?) AND (?='' OR p.status=?) AND (?='' OR p.mode=?)`
        : `(?='' OR p.player=?) AND (?='' OR p.id=?) AND (?='' OR (CASE WHEN result IS NULL THEN 'unverified' ELSE 'finished' END)=?) AND (?='' OR p.difficulty=?)`;
    const args = [player, player, id, id, status, status, mode, mode];
    const table = kind === 'pvp' ? 'pvp_matches' : 'matches',
      column = kind === 'pvp' ? 'started' : 'created';
    const total = Number(
      this.store.db.prepare(`SELECT count(*) n FROM ${table} p WHERE ${where}`).get(...args)!.n,
    );
    const rows = this.store.db
      .prepare(`SELECT p.* FROM ${table} p WHERE ${where} ORDER BY ${column} DESC,id DESC LIMIT 25 OFFSET ?`)
      .all(...args, offset);
    const matches = rows.map((row) => this.summary(kind as 'pvp' | 'ai', row));
    return { matches, total, offset, limit: 25 };
  }
  private summary(kind: 'pvp' | 'ai', row: Record<string, unknown>): MatchReviewSummary {
    const item: MatchReviewSummary = {
      id: String(row.id),
      kind,
      mode: String(kind === 'pvp' ? row.mode : row.difficulty),
      status: kind === 'pvp' ? String(row.status) : row.result ? 'finished' : 'unverified',
      players: kind === 'pvp' ? JSON.parse(String(row.players)) : [String(row.player)],
      started: Number(kind === 'pvp' ? row.started : row.created),
      ended: kind === 'pvp' && row.ended ? Number(row.ended) : null,
      revision: Number(row.revision),
      review: 'unreviewed',
      alert: false,
    };
    if (kind === 'pvp') {
      const review = this.store.db.prepare('SELECT status FROM match_reviews WHERE match=?').get(item.id);
      item.review = this.store.db.prepare('SELECT 1 FROM match_corrections WHERE match=?').get(item.id)
        ? 'voided'
        : String(review?.status ?? 'legacy');
      item.alert = this.alerts(item.id, item).length > 0;
    }
    return item;
  }
  detail(kind: string, id: string): MatchReviewDetail {
    if (!['pvp', 'ai'].includes(kind)) throw new Error('Loại trận không hợp lệ.');
    const row = this.store.db
      .prepare(`SELECT * FROM ${kind === 'pvp' ? 'pvp_matches' : 'matches'} WHERE id=?`)
      .get(id);
    if (!row) throw new Error('Không tìm thấy trận.');
    const summary = this.summary(kind as 'pvp' | 'ai', row);
    const review =
      kind === 'pvp' ? this.store.db.prepare('SELECT * FROM match_reviews WHERE match=?').get(id) : undefined;
    const evidence =
      kind === 'pvp'
        ? this.store.db.prepare('SELECT * FROM match_evidence WHERE match=? ORDER BY sequence').all(id)
        : [];
    return {
      ...summary,
      content: JSON.parse(String(row.content)),
      loadouts: JSON.parse(String(kind === 'pvp' ? row.loadouts : row.deck)),
      seed: Number(row.seed),
      result: row.outcomes
        ? JSON.parse(String(row.outcomes))
        : row.result
          ? JSON.parse(String(row.result))
          : null,
      evidence: {
        available: !!review?.available,
        truncated: !!review?.truncated,
        summary: review?.summary ? JSON.parse(String(review.summary)) : null,
        entries: evidence.map((e) => ({
          sequence: Number(e.sequence),
          player: String(e.player),
          tick: Number(e.tick),
          command: JSON.parse(String(e.command)),
          error: e.error === null ? null : String(e.error),
          received: Number(e.received),
        })),
      },
      alerts: kind === 'pvp' ? this.alerts(id, summary) : [],
      actions: this.actions(id),
      bans: summary.players.flatMap((player) => {
        const ban = this.store.db
          .prepare('SELECT player,until,reason FROM pvp_bans WHERE player=? AND until>?')
          .get(player, Date.now());
        return ban
          ? [{ player: String(ban.player), until: Number(ban.until), reason: String(ban.reason) }]
          : [];
      }),
    };
  }
  private actions(id: string): ModerationAction[] {
    return this.store.db
      .prepare('SELECT * FROM moderation_actions WHERE match=? ORDER BY id DESC')
      .all(id)
      .map((r) => ({
        id: Number(r.id),
        request: String(r.request),
        match: r.match ? String(r.match) : null,
        player: r.player ? String(r.player) : null,
        action: String(r.action),
        reason: String(r.reason),
        actor: String(r.actor),
        created: Number(r.created),
        detail: JSON.parse(String(r.detail)),
      }));
  }
  moderate(input: {
    request: string;
    match: string;
    action: 'note' | 'clear' | 'flag' | 'void' | 'ban' | 'unban';
    reason: string;
    player?: string;
    hours?: number;
  }) {
    if (
      !input ||
      typeof input.request !== 'string' ||
      !/^[a-zA-Z0-9-]{8,80}$/.test(input.request) ||
      typeof input.reason !== 'string' ||
      input.reason.trim().length < 5 ||
      input.reason.length > 1000 ||
      !['note', 'clear', 'flag', 'void', 'ban', 'unban'].includes(input.action)
    )
      throw new Error('Cần thao tác, mã yêu cầu và lý do ít nhất 5 ký tự.');
    return this.store.transaction(() => {
      const previous = this.store.db
        .prepare('SELECT * FROM moderation_actions WHERE request=?')
        .get(input.request);
      if (previous) {
        if (
          previous.match !== input.match ||
          previous.action !== input.action ||
          previous.player !== (input.player ?? null) ||
          previous.reason !== input.reason.trim() ||
          (input.action === 'ban' && JSON.parse(String(previous.detail)).hours !== input.hours)
        )
          throw new Error('CONFLICT: Mã thao tác đã dùng cho nội dung khác.');
        return { id: Number(previous.id), detail: JSON.parse(String(previous.detail)) };
      }
      const row = this.store.db.prepare('SELECT * FROM pvp_matches WHERE id=?').get(input.match);
      if (!row) throw new Error('Chỉ xử lý trận PvP tồn tại.');
      const players = JSON.parse(String(row.players)) as string[];
      if (['ban', 'unban'].includes(input.action) && (!input.player || !players.includes(input.player)))
        throw new Error('Người chơi không thuộc trận.');
      if (
        input.action === 'ban' &&
        (!Number.isInteger(input.hours) ||
          input.hours! < 1 ||
          input.hours! > this.policy().policy.maximumBanHours)
      )
        throw new Error('Thời hạn khóa vượt chính sách.');
      let detail: unknown = {};
      if (input.action === 'void') {
        if (row.status !== 'finished') throw new Error('Chỉ hủy kết quả trận đã kết thúc.');
        if (this.store.db.prepare('SELECT 1 FROM match_corrections WHERE match=?').get(input.match))
          throw new Error('Kết quả đã được hoàn tác.');
        for (const player of players)
          if (
            this.store.db
              .prepare(
                `SELECT 1 FROM pvp_members m JOIN pvp_matches p ON p.id=m.match WHERE m.player=? AND p.status='active'`,
              )
              .get(player)
          )
            throw new Error('Chờ người chơi kết thúc trận hiện tại trước khi điều chỉnh Elo.');
        const outcomes = JSON.parse(String(row.outcomes)) as MatchOutcome[];
        detail = players.map((player, i) => {
          const rating = this.store.db.prepare('SELECT * FROM ratings WHERE player=?').get(player)!;
          const delta = row.mode === 'ranked' ? -outcomes[i].delta : 0;
          const after = Number(rating.rating) + delta;
          // Exact additive reversal; do not recompute later matches or silently discard compensation at a floor.
          if (
            row.mode === 'ranked' &&
            (Number(rating.games) < 1 || (outcomes[i].result === 'win' && Number(rating.wins) < 1))
          )
            throw new Error('Sổ điểm không nhất quán; dừng hoàn tác để kiểm tra dữ liệu.');
          if (row.mode === 'ranked')
            this.store.db
              .prepare('UPDATE ratings SET rating=?,games=games-1,wins=wins-? WHERE player=? AND games>0')
              .run(after, Number(outcomes[i].result === 'win'), player);
          return { player, before: Number(rating.rating), after, delta };
        });
      } else if (input.action === 'ban')
        detail = { until: Date.now() + input.hours! * 3600000, hours: input.hours };
      const actionId = Number(
        this.store.db
          .prepare(
            'INSERT INTO moderation_actions(request,match,player,action,reason,actor,created,detail) VALUES(?,?,?,?,?,?,?,?)',
          )
          .run(
            input.request,
            input.match,
            input.player ?? null,
            input.action,
            input.reason.trim(),
            'admin',
            Date.now(),
            JSON.stringify(detail),
          ).lastInsertRowid,
      );
      if (input.action === 'void')
        this.store.db
          .prepare('INSERT INTO match_corrections VALUES(?,?,?)')
          .run(input.match, actionId, JSON.stringify(detail));
      if (input.action === 'ban')
        this.store.db
          .prepare(
            'INSERT INTO pvp_bans VALUES(?,?,?,?) ON CONFLICT(player) DO UPDATE SET until=excluded.until,reason=excluded.reason,action=excluded.action',
          )
          .run(input.player!, (detail as { until: number }).until, input.reason.trim(), actionId);
      if (input.action === 'unban')
        this.store.db.prepare('DELETE FROM pvp_bans WHERE player=?').run(input.player!);
      if (['flag', 'clear'].includes(input.action)) {
        this.store.db
          .prepare(
            `INSERT INTO match_reviews(match,status,available,policy) VALUES(?,?,0,?) ON CONFLICT(match) DO UPDATE SET status=excluded.status`,
          )
          .run(input.match, input.action === 'flag' ? 'flagged' : 'cleared', JSON.stringify(this.policy()));
      }
      this.store.audit('fairplay.' + input.action, {
        actor: 'admin',
        match: input.match,
        player: input.player,
        reason: input.reason.trim(),
        actionId,
        detail,
      });
      return { id: actionId, detail };
    });
  }
}
