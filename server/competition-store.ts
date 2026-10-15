import {
  competitionOf,
  eloAfter,
  tierFor,
  type MatchMode,
  type MatchOutcome,
  type CompetitionOverview,
} from '../src/data/competition';
import type { ContentConfig } from '../src/data/content';
import type { GameDatabase } from './database';

export interface MatchRecord {
  id: string;
  players: string[];
  mode: MatchMode;
  content: ContentConfig;
  revision: number;
  seed: number;
  loadouts: unknown[];
}
interface Rating {
  player: string;
  rating: number;
  games: number;
  wins: number;
}
export class CompetitionStore {
  constructor(private store: GameDatabase) {
    store.db.exec(`CREATE TABLE IF NOT EXISTS ratings (
      player TEXT PRIMARY KEY REFERENCES players(id), rating INTEGER NOT NULL, games INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS pvp_matches (
      id TEXT PRIMARY KEY, players TEXT NOT NULL, mode TEXT NOT NULL, content TEXT NOT NULL, revision INTEGER NOT NULL,
      seed INTEGER NOT NULL, loadouts TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER,
      outcomes TEXT, status TEXT NOT NULL DEFAULT 'active');
      CREATE INDEX IF NOT EXISTS ratings_leaderboard ON ratings(rating DESC, player);
      CREATE TABLE IF NOT EXISTS pvp_members (
      match TEXT NOT NULL REFERENCES pvp_matches(id), player TEXT NOT NULL REFERENCES players(id),
      PRIMARY KEY(match,player));
      CREATE INDEX IF NOT EXISTS pvp_player_history ON pvp_members(player,match);`);
  }
  private rating(player: string, c: ContentConfig): Rating {
    this.store.db
      .prepare('INSERT OR IGNORE INTO ratings(player,rating) VALUES(?,?)')
      .run(player, competitionOf(c).rating.initial);
    return this.store.db.prepare('SELECT * FROM ratings WHERE player=?').get(player) as unknown as Rating;
  }
  score(player: string, c: ContentConfig) {
    return this.rating(player, c).rating;
  }
  start(match: MatchRecord) {
    if (match.players.length !== 2 || new Set(match.players).size !== 2)
      throw new Error('Trận cần hai người chơi khác nhau.');
    this.store.transaction(() => {
      for (const player of match.players) {
        const active = this.store.db
          .prepare(
            `SELECT 1 FROM pvp_members m JOIN pvp_matches p ON p.id=m.match
          WHERE m.player=? AND p.status='active'`,
          )
          .get(player);
        if (active) throw new Error('Người chơi đang có trận khác.');
        this.rating(player, match.content);
      }
      this.store.db
        .prepare(
          `INSERT INTO pvp_matches(id,players,mode,content,revision,seed,loadouts,started)
        VALUES(?,?,?,?,?,?,?,?)`,
        )
        .run(
          match.id,
          JSON.stringify(match.players),
          match.mode,
          JSON.stringify(match.content),
          match.revision,
          match.seed,
          JSON.stringify(match.loadouts),
          Date.now(),
        );
      for (const player of match.players)
        this.store.db.prepare('INSERT INTO pvp_members VALUES(?,?)').run(match.id, player);
    });
  }
  /** Called only with an authoritative room result. Repeated settlement returns the original receipt. */
  finish(id: string, winner: number | null, reason: string, voided = false): MatchOutcome[] {
    if (winner !== null && winner !== 0 && winner !== 1) throw new Error('Kết quả trận không hợp lệ.');
    return this.store.transaction(() => {
      const row = this.store.db.prepare('SELECT * FROM pvp_matches WHERE id=?').get(id);
      if (!row) throw new Error('Không tìm thấy trận PvP.');
      if (row.outcomes) return JSON.parse(String(row.outcomes)) as MatchOutcome[];
      const content = JSON.parse(String(row.content)) as ContentConfig,
        config = competitionOf(content);
      const players = JSON.parse(String(row.players)) as string[],
        mode = row.mode as MatchMode;
      const ratings = players.map((player) => this.rating(player, content));
      const outcomes: MatchOutcome[] = ratings.map((r, side) => {
        const score = winner === null ? 0.5 : Number(winner === side);
        const after =
          mode === 'ranked' && !voided
            ? eloAfter(r.rating, ratings[1 - side].rating, score, config)
            : r.rating;
        if (mode === 'ranked' && !voided)
          this.store.db
            .prepare('UPDATE ratings SET rating=?,games=games+1,wins=wins+? WHERE player=?')
            .run(after, Number(winner === side), r.player);
        return {
          matchId: id,
          mode,
          result: voided ? 'void' : winner === null ? 'draw' : winner === side ? 'win' : 'loss',
          reason,
          before: r.rating,
          after,
          delta: after - r.rating,
          tier: tierFor(after, config),
        };
      });
      this.store.db
        .prepare('UPDATE pvp_matches SET status=?,outcomes=?,ended=? WHERE id=?')
        .run(voided ? 'void' : 'finished', JSON.stringify(outcomes), Date.now(), id);
      this.store.audit('pvp.settle', { id, mode, winner, reason, voided });
      return outcomes;
    });
  }
  /** In-memory simulation cannot resume after restart: record a void, never an invented winner. */
  recover() {
    for (const row of this.store.db.prepare("SELECT id FROM pvp_matches WHERE status='active'").all())
      this.finish(String(row.id), null, 'server-restart', true);
  }
  overview(player: string, content: ContentConfig): CompetitionOverview {
    const config = competitionOf(content),
      self = this.rating(player, content);
    const name = (id: string) => `Kết Nối ${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const standing = (r: Rating, rank: number | null) => ({
      name: name(r.player),
      rating: r.rating,
      games: r.games,
      wins: r.wins,
      tier: tierFor(r.rating, config),
      rank,
    });
    const above = this.store.db
      .prepare(
        `SELECT count(*) AS n FROM ratings WHERE games>0 AND
      (rating>? OR (rating=? AND player<?))`,
      )
      .get(self.rating, self.rating, player)!;
    const leaders = this.store.db
      .prepare('SELECT * FROM ratings WHERE games>0 ORDER BY rating DESC,player LIMIT 100')
      .all() as unknown as Rating[];
    const history = this.store.db
      .prepare(
        `SELECT p.* FROM pvp_members m JOIN pvp_matches p ON p.id=m.match
      WHERE m.player=? AND p.status!='active' ORDER BY p.ended DESC,p.id DESC LIMIT 20`,
      )
      .all(player)
      .map((row) => {
        const side = (JSON.parse(String(row.players)) as string[]).indexOf(player);
        return {
          ...(JSON.parse(String(row.outcomes)) as MatchOutcome[])[side],
          ended: Number(row.ended),
          map: (JSON.parse(String(row.content)) as ContentConfig).map.name,
        };
      });
    return {
      self: standing(self, self.games ? Number(above.n) + 1 : null),
      leaderboard: leaders.map((r, i) => ({ ...standing(r, i + 1), self: r.player === player })),
      history,
    };
  }
}
