import { competitionOf } from './competition';
import type { ContentConfig } from './content';
import { gameplayOf } from './gameplay/defaults';
import { communicationOf } from './communication';
import { presentationOf } from './presentation';

/** Schema upgrades are pure data transforms; module code never comes from the database. */
export interface RuleModuleDefinition {
  id: string;
  name: string;
  schemaVersion: number;
  migrations: Readonly<Record<number, (data: unknown) => unknown>>;
}
const define = (id: string, name: string): RuleModuleDefinition =>
  Object.freeze({ id, name, schemaVersion: 1, migrations: Object.freeze({}) });
export const RULE_MODULES = Object.freeze([
  define('rules', 'Luật nền: mana, trụ, lõi, quá tải'),
  define('mana', 'Mana đầu trận'),
  define('deck', 'Deck, tay bài và đổi bài'),
  define('board', 'Vùng triển khai'),
  define('combat', 'Combat và tìm mục tiêu'),
  define('resonance', 'Cộng hưởng lõi'),
  define('spells', 'Phép và chuỗi hiệu ứng'),
  define('synergies', 'Hệ, tộc và buff'),
  define('ai', 'Chính sách AI'),
  define('match', 'Thời hạn trận và PvP'),
  define('collection', 'Bộ sưu tập và rương'),
  define('heroes', 'Chỉ số tướng'),
  define('abilities', 'Kỹ năng và truy vấn mục tiêu'),
  define('economy', 'Giá và phần thưởng'),
  define('items', 'Vật phẩm cửa hàng'),
  define('communication', 'Emoji và chat nhanh'),
  define('presentation', 'Đội hình hiển thị'),
  define('competition', 'Đấu hạng, ghép trận & thử thách'),
]);
export type RuleModuleId =
  | 'rules'
  | 'mana'
  | 'deck'
  | 'board'
  | 'combat'
  | 'resonance'
  | 'spells'
  | 'synergies'
  | 'ai'
  | 'match'
  | 'collection'
  | 'heroes'
  | 'abilities'
  | 'economy'
  | 'items'
  | 'communication'
  | 'presentation'
  | 'competition';
const CONTENT_MODULES = [
  'rules',
  'heroes',
  'abilities',
  'economy',
  'items',
  'communication',
  'presentation',
  'competition',
] as const;
type ContentModuleId = (typeof CONTENT_MODULES)[number];
export interface RuleModuleRecord {
  id: string;
  schemaVersion: number;
  data: unknown;
}
export interface RuleModuleStatus {
  id: string;
  name: string;
  schemaVersion: number;
  draftVersion: number;
  publishedVersion: number;
  changed: boolean;
}
export function migrateRuleModule(record: RuleModuleRecord, definitions = RULE_MODULES): RuleModuleRecord {
  const definition = definitions.find((d) => d.id === record.id);
  if (!definition || !Number.isSafeInteger(record.schemaVersion) || record.schemaVersion < 1)
    throw new Error(`Rule module không hợp lệ: ${record.id}`);
  let data = structuredClone(record.data),
    version = record.schemaVersion;
  if (version > definition.schemaVersion) throw new Error(`Rule module ${record.id}: schema mới hơn engine.`);
  while (version < definition.schemaVersion) {
    const migrate = definition.migrations[version];
    if (!migrate) throw new Error(`Rule module ${record.id}: thiếu migration từ schema ${version}.`);
    data = migrate(data);
    version++;
  }
  return { id: record.id, schemaVersion: version, data };
}
export function extractRuleModules(content: ContentConfig): RuleModuleRecord[] {
  const g = gameplayOf(content);
  return RULE_MODULES.map((d) => ({
    id: d.id,
    schemaVersion: d.schemaVersion,
    data: structuredClone(
      CONTENT_MODULES.includes(d.id as ContentModuleId)
        ? d.id === 'competition'
          ? competitionOf(content)
          : d.id === 'communication'
            ? communicationOf(content)
            : d.id === 'presentation'
              ? presentationOf(content)
              : content[d.id as ContentModuleId]
        : d.id === 'mana'
          ? { startingMana: g.startingMana }
          : g[d.id as Exclude<RuleModuleId, ContentModuleId | 'mana'>],
    ),
  }));
}
/** All modules must be present; a partial/corrupt database must not silently use defaults. */
export function composeRuleModules(base: ContentConfig, records: RuleModuleRecord[]): ContentConfig {
  if (records.length !== RULE_MODULES.length || new Set(records.map((r) => r.id)).size !== records.length)
    throw new Error('Rule modules thiếu hoặc trùng ID.');
  const content = structuredClone(base);
  content.gameplay = structuredClone(gameplayOf(base));
  for (const raw of records) {
    const record = migrateRuleModule(raw);
    if (CONTENT_MODULES.includes(record.id as ContentModuleId))
      Object.assign(content, { [record.id]: record.data });
    else if (record.id === 'mana') {
      const data = record.data as { startingMana: number };
      if (
        !data ||
        typeof data !== 'object' ||
        Object.keys(data).length !== 1 ||
        !Object.hasOwn(data, 'startingMana')
      )
        throw new Error('Rule module mana không hợp lệ.');
      content.gameplay.startingMana = data.startingMana;
    } else Object.assign(content.gameplay, { [record.id]: record.data });
  }
  return content;
}
