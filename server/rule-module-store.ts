import type { DatabaseSync } from 'node:sqlite';
import { validateContent, type ContentConfig } from '../src/data/content';
import {
  composeRuleModules,
  extractRuleModules,
  migrateRuleModule,
  RULE_MODULES,
  type RuleModuleRecord,
  type RuleModuleStatus,
} from '../src/data/rule-modules';

type Scope = 'draft' | 'published';
interface StoredModule extends RuleModuleRecord {
  dataVersion: number;
}
/** Canonical serialization avoids treating JSON key order as a balance change. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
}
export class RuleModuleStore {
  constructor(private db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS rule_modules (
      scope TEXT NOT NULL CHECK(scope IN ('draft','published')), module_id TEXT NOT NULL,
      schema_version INTEGER NOT NULL CHECK(schema_version>0), data_version INTEGER NOT NULL CHECK(data_version>0),
      payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(scope,module_id));
      CREATE TABLE IF NOT EXISTS rule_module_revisions (
      revision INTEGER NOT NULL REFERENCES revisions(id), module_id TEXT NOT NULL,
      schema_version INTEGER NOT NULL, data_version INTEGER NOT NULL,
      payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(revision,module_id));`);
  }
  initialize(config: { draft: ContentConfig; published: ContentConfig; revision: number }) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      let migrated = false;
      let schemaChanged = false;
      const isNew =
        this.db.prepare('SELECT count(*) AS n FROM rule_modules').get()!.n === 0 &&
        this.db.prepare('SELECT count(*) AS n FROM rule_module_revisions').get()!.n === 0;
      const normalized = { draft: config.draft, published: config.published };
      for (const scope of ['draft', 'published'] as const) {
        const old = this.read(scope);
        if (isNew) {
          this.write(scope, config[scope]);
          migrated = true;
        } else {
          const upgraded = this.historicalModules(config[scope], old);
          if (upgraded.length !== old.length) {
            old.push(
              ...upgraded
                .filter((m) => !old.some((o) => o.id === m.id))
                .map((m) => ({ ...m, dataVersion: 1 })),
            );
            schemaChanged = true;
          }
          // Apply only explicit schema migrations; validate cross-module dependencies afterwards.
          const content = composeRuleModules(config[scope], old);
          validateContent(content);
          normalized[scope] = content;
          schemaChanged ||= old.some(
            (m) => m.schemaVersion !== RULE_MODULES.find((d) => d.id === m.id)!.schemaVersion,
          );
          this.write(scope, content);
        }
      }
      if (migrated) {
        this.snapshot(config.revision);
        this.db
          .prepare('INSERT INTO audit(action,detail) VALUES(?,?)')
          .run(
            'rules.modules.migrate',
            JSON.stringify({ revision: config.revision, modules: RULE_MODULES.map((m) => m.id) }),
          );
      }
      if (schemaChanged) {
        const revision = Number(
          this.db
            .prepare('INSERT INTO revisions(content) VALUES(?)')
            .run(JSON.stringify(normalized.published)).lastInsertRowid,
        );
        this.db
          .prepare('UPDATE config SET draft=?,published=?,version=version+1,revision=? WHERE id=1')
          .run(JSON.stringify(normalized.draft), JSON.stringify(normalized.published), revision);
        this.snapshot(revision);
        this.db
          .prepare('INSERT INTO audit(action,detail) VALUES(?,?)')
          .run('rules.modules.upgrade', JSON.stringify({ revision, from: config.revision }));
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  read(scope: Scope): StoredModule[] {
    return this.db
      .prepare('SELECT * FROM rule_modules WHERE scope=? ORDER BY module_id')
      .all(scope)
      .map((row) => ({
        id: String(row.module_id),
        schemaVersion: Number(row.schema_version),
        dataVersion: Number(row.data_version),
        data: JSON.parse(String(row.payload)),
      }));
  }
  compose(scope: Scope, base: ContentConfig) {
    const content = composeRuleModules(base, this.read(scope));
    validateContent(content);
    return content;
  }
  /** Caller owns transaction, including content version, module writes and audit. */
  write(scope: Scope, content: ContentConfig): string[] {
    const changed: string[] = [];
    for (const record of extractRuleModules(content)) {
      const payload = canonical(record.data);
      const old = this.db
        .prepare('SELECT * FROM rule_modules WHERE scope=? AND module_id=?')
        .get(scope, record.id);
      if (old && old.schema_version === record.schemaVersion && old.payload === payload) continue;
      this.db
        .prepare(
          `INSERT INTO rule_modules VALUES(?,?,?,?,?) ON CONFLICT(scope,module_id) DO UPDATE SET
        schema_version=excluded.schema_version,data_version=rule_modules.data_version+1,payload=excluded.payload`,
        )
        .run(scope, record.id, record.schemaVersion, 1, payload);
      changed.push(record.id);
    }
    return changed;
  }
  snapshot(revision: number) {
    this.db
      .prepare(
        `INSERT INTO rule_module_revisions SELECT ?,module_id,schema_version,data_version,payload
      FROM rule_modules WHERE scope='published'`,
      )
      .run(revision);
  }
  revision(revision: number): RuleModuleRecord[] {
    return this.db
      .prepare(
        'SELECT module_id,schema_version,payload FROM rule_module_revisions WHERE revision=? ORDER BY module_id',
      )
      .all(revision)
      .map((row) => ({
        id: String(row.module_id),
        schemaVersion: Number(row.schema_version),
        data: JSON.parse(String(row.payload)),
      }));
  }
  historicalModules(content: ContentConfig, modules: RuleModuleRecord[]) {
    // Only complete known releases (15 or 17 modules) may acquire new modules.
    for (const additions of [['communication', 'presentation', 'competition'], ['competition']]) {
      const previous = RULE_MODULES.filter((m) => !additions.includes(m.id));
      if (modules.length === previous.length && previous.every((d) => modules.some((m) => m.id === d.id)))
        return [...modules, ...extractRuleModules(content).filter((m) => additions.includes(m.id))];
    }
    return modules;
  }
  status(): RuleModuleStatus[] {
    const draft = this.read('draft'),
      published = this.read('published');
    return RULE_MODULES.map((d) => {
      const a = draft.find((m) => m.id === d.id)!,
        b = published.find((m) => m.id === d.id)!;
      return {
        id: d.id,
        name: d.name,
        schemaVersion: d.schemaVersion,
        draftVersion: a.dataVersion,
        publishedVersion: b.dataVersion,
        changed: canonical(a.data) !== canonical(b.data),
      };
    });
  }
  replace(content: ContentConfig, record: RuleModuleRecord) {
    const definition = RULE_MODULES.find((d) => d.id === record.id);
    if (!definition || record.schemaVersion !== definition.schemaVersion)
      throw new Error('Rule module hoặc schema không được hỗ trợ.');
    const modules = extractRuleModules(content).map((m) =>
      m.id === record.id ? migrateRuleModule(record) : m,
    );
    const next = composeRuleModules(content, modules);
    validateContent(next);
    return next;
  }
}
