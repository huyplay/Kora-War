import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultContent, validateContent, assetReferences, type ContentConfig } from '../src/data/content';

export class GameDatabase {
  readonly db: DatabaseSync;
  constructor(
    readonly directory: string,
    password?: string,
  ) {
    mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(join(directory, 'kora.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
          CREATE TABLE IF NOT EXISTS config(id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL, draft TEXT NOT NULL, published TEXT NOT NULL, revision INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
          CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, path TEXT NOT NULL, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, metadata TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
          CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, hash TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, kind TEXT NOT NULL, subject TEXT NOT NULL, expires INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, gold INTEGER NOT NULL CHECK(gold>=0), created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
          CREATE TABLE IF NOT EXISTS cards(player TEXT NOT NULL REFERENCES players(id), hero TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1, copies INTEGER NOT NULL DEFAULT 0 CHECK(copies>=0), PRIMARY KEY(player,hero));
          CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY AUTOINCREMENT, player TEXT NOT NULL REFERENCES players(id), request TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL, result TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(player,request));
          CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY, player TEXT NOT NULL REFERENCES players(id), seed INTEGER NOT NULL, deck TEXT NOT NULL, difficulty TEXT NOT NULL, content TEXT NOT NULL, levels TEXT NOT NULL, revision INTEGER NOT NULL, created INTEGER NOT NULL, result TEXT);
          CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, detail TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
    if (
      !this.db
        .prepare('PRAGMA table_info(assets)')
        .all()
        .some((column) => column.name === 'archived')
    )
      this.db.exec('ALTER TABLE assets ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
    const initial = JSON.stringify(defaultContent());
    this.db.prepare('INSERT OR IGNORE INTO config VALUES(1,1,?,?,1)').run(initial, initial);
    this.db.prepare('INSERT OR IGNORE INTO revisions(id,content) VALUES(1,?)').run(initial);
    if (!this.db.prepare('SELECT id FROM admins').get()) {
      const secret = password || randomBytes(18).toString('base64url'),
        salt = randomBytes(16).toString('hex');
      this.db
        .prepare('INSERT INTO admins VALUES(1,?,?)')
        .run(salt, scryptSync(secret, salt, 64).toString('hex'));
      if (!password)
        writeFileSync(
          join(directory, 'admin-setup.txt'),
          `Kora War local administrator\nUsername: admin\nPassword: ${secret}\n`,
          { mode: 0o600 },
        );
    }
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  audit(action: string, detail: unknown) {
    this.db.prepare('INSERT INTO audit(action,detail) VALUES(?,?)').run(action, JSON.stringify(detail));
  }
  login(password: string): boolean {
    const row = this.db.prepare('SELECT salt,hash FROM admins WHERE id=1').get() as {
      salt: string;
      hash: string;
    };
    return timingSafeEqual(scryptSync(password, row.salt, 64), Buffer.from(row.hash, 'hex'));
  }
  session(kind: 'admin' | 'player', subject: string) {
    this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    this.db
      .prepare('INSERT INTO sessions VALUES(?,?,?,?)')
      .run(token, kind, subject, Date.now() + (kind === 'admin' ? 8 * 3600000 : 90 * 86400000));
    return token;
  }
  subject(token: string, kind: string): string | undefined {
    return (
      this.db
        .prepare('SELECT subject FROM sessions WHERE token=? AND kind=? AND expires>?')
        .get(token, kind, Date.now()) as { subject: string } | undefined
    )?.subject;
  }
  config() {
    const row = this.db.prepare('SELECT * FROM config WHERE id=1').get() as {
      version: number;
      draft: string;
      published: string;
      revision: number;
    };
    return {
      version: row.version,
      revision: row.revision,
      draft: JSON.parse(row.draft) as ContentConfig,
      published: JSON.parse(row.published) as ContentConfig,
    };
  }
  saveDraft(content: unknown, version: number) {
    validateContent(content);
    const result = this.db
      .prepare('UPDATE config SET draft=?,version=version+1 WHERE id=1 AND version=?')
      .run(JSON.stringify(content), version);
    if (!result.changes) throw new Error('CONFLICT: Bản nháp đã thay đổi. Hãy tải lại trước khi lưu.');
    this.audit('draft.save', { version: version + 1 });
    return this.config();
  }
  publish(version: number) {
    return this.transaction(() => {
      const current = this.config();
      if (current.version !== version) throw new Error('CONFLICT: Bản nháp đã thay đổi.');
      validateContent(current.draft);
      for (const id of assetReferences(current.draft))
        if (
          !this.asset(id) ||
          this.asset(id)!.archived ||
          !existsSync(join(this.directory, this.asset(id)!.path as string))
        )
          throw new Error(`Asset chưa tồn tại hoặc đã ẩn: ${id}`);
      for (const binding of Object.values(current.draft.models)) {
        const model = this.asset(binding.assetId)!;
        if (model.kind !== 'model') throw new Error('Nhân vật phải gán GLB.');
        const clips = new Set(
          JSON.parse(this.asset(binding.animationAssetId || binding.assetId)!.metadata as string).clips || [],
        );
        for (const name of Object.values(binding.clips))
          if (!clips.has(name)) throw new Error(`Animation không tồn tại: ${name}`);
      }
      for (const p of current.draft.map.props)
        if (this.asset(p.assetId)?.kind !== 'model') throw new Error('Map prop phải là GLB.');
      for (const id of [current.draft.map.towerAssetId, current.draft.map.coreAssetId])
        if (id && this.asset(id)?.kind !== 'model') throw new Error('Trụ/lõi phải là model GLB.');
      if (current.draft.vfx.spriteAssetId && this.asset(current.draft.vfx.spriteAssetId)?.kind !== 'image')
        throw new Error('Sprite VFX phải là ảnh.');
      const json = JSON.stringify(current.draft),
        revision = Number(
          this.db.prepare('INSERT INTO revisions(content) VALUES(?)').run(json).lastInsertRowid,
        );
      this.db
        .prepare('UPDATE config SET published=?,revision=?,version=version+1 WHERE id=1')
        .run(json, revision);
      this.audit('config.publish', { revision });
      return this.config();
    });
  }
  asset(id: string) {
    return this.db.prepare('SELECT * FROM assets WHERE id=?').get(id);
  }
  assets(includeArchived = false) {
    return (
      this.db
        .prepare('SELECT * FROM assets WHERE archived=0 OR ?=1 ORDER BY created DESC')
        .all(includeArchived ? 1 : 0) as {
        id: string;
        name: string;
        kind: string;
        path: string;
        bytes: number;
        sha256: string;
        metadata: string;
        created: string;
        archived: number;
      }[]
    ).map((a) => ({ ...a, metadata: JSON.parse(a.metadata as string), url: `/api/assets/${a.id}` }));
  }
  archiveAsset(id: string, archived: boolean) {
    const c = this.config();
    if (!this.asset(id)) throw new Error('Asset không tồn tại.');
    if (archived && [...assetReferences(c.draft), ...assetReferences(c.published)].includes(id))
      throw new Error('Asset đang dùng trong bản nháp hoặc game; gỡ binding trước khi ẩn.');
    this.db.prepare('UPDATE assets SET archived=? WHERE id=?').run(archived ? 1 : 0, id);
    this.audit('asset.archive', { id, archived });
  }
  player() {
    return this.transaction(() => {
      const id = randomUUID();
      this.db.prepare('INSERT INTO players(id,gold) VALUES(?,300)').run(id);
      for (const h of defaultContent().heroes)
        this.db.prepare('INSERT INTO cards(player,hero) VALUES(?,?)').run(id, h.id);
      return id;
    });
  }
  wallet(player: string) {
    return {
      player,
      gold: (this.db.prepare('SELECT gold FROM players WHERE id=?').get(player) as { gold: number }).gold,
      cards: this.db.prepare('SELECT hero,level,copies FROM cards WHERE player=? ORDER BY hero').all(player),
      ledger: this.db
        .prepare('SELECT delta,reason,created FROM ledger WHERE player=? ORDER BY id DESC LIMIT 30')
        .all(player),
    };
  }
  trade(
    player: string,
    request: string,
    fn: () => { delta: number; reason: string; [key: string]: unknown },
  ) {
    return this.transaction(() => {
      const previous = this.db
        .prepare('SELECT result FROM ledger WHERE player=? AND request=?')
        .get(player, request) as { result: string } | undefined;
      if (previous) return JSON.parse(previous.result);
      const result = fn();
      const changed = this.db
        .prepare('UPDATE players SET gold=gold+? WHERE id=? AND gold+?>=0')
        .run(result.delta, player, result.delta);
      if (!changed.changes) throw new Error('Không đủ vàng.');
      this.db
        .prepare('INSERT INTO ledger(player,request,delta,reason,result) VALUES(?,?,?,?,?)')
        .run(player, request, result.delta, result.reason, JSON.stringify(result));
      return result;
    });
  }
  close() {
    this.db.close();
  }
}
