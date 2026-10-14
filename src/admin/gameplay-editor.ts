import type { ContentConfig } from '../data/content';
import { gameplayOf } from '../data/gameplay';
import { ORIGINS, ROLES } from '../data/traits';
import { esc, input } from './html';
import type { RuleModuleStatus } from '../data/rule-modules';

const labels: Record<string, string> = {
  startingMana: 'Mana đầu trận',
  size: 'Số thẻ trong deck',
  handSize: 'Số ô trên tay',
  minHeroes: 'Tướng tối thiểu đầu trận',
  minSpells: 'Phép tối thiểu đầu trận',
  maxCopies: 'Bản sao tối đa mỗi thẻ',
  mulligan: 'Số thẻ được đổi',
  minX: 'Biên trái',
  maxX: 'Biên phải',
  spawnMin: 'Đầu vùng triển khai',
  spawnMax: 'Cuối vùng triển khai',
  spawnX: 'Vị trí gọi quân AI',
  quickSpawnX: 'Vị trí gọi quân nhanh',
  towerX: 'Vị trí trụ',
  coreX: 'Vị trí lõi',
  halfWidth: 'Nửa chiều rộng lane',
  initialAttackDelay: 'Chờ đánh khi xuất trận (s)',
  initialSkillDelay: 'Chờ kỹ năng khi xuất trận (s)',
  nearEnemyBonus: 'Tầm tìm địch bổ sung (m)',
  allyRadius: 'Tầm tìm đồng minh (m)',
  structureReach: 'Tầm đánh công trình bổ sung',
  cap: 'Năng lượng tối đa',
  passive: 'Năng lượng/giây',
  damageGain: 'Năng lượng/sát thương HP',
  killGain: 'Năng lượng/hạ gục',
  structureGain: 'Năng lượng/đánh trụ',
  damage: 'Sát thương',
  heal: 'Hồi máu',
  stun: 'Thời gian choáng (s)',
  firstDecision: 'AI quyết định đầu (s)',
  storyInterval: 'Nhịp Khám phá (s)',
  normalInterval: 'Nhịp Tiêu chuẩn (s)',
  hardInterval: 'Nhịp Thử thách (s)',
  jitter: 'Dao động nhịp AI (s)',
  threatDistance: 'Chuẩn hóa khoảng cách đe dọa',
  threatWeight: 'Trọng số đe dọa',
  friendlyWeight: 'Trọng số đồng minh',
  destroyedTowerBonus: 'Ưu tiên trụ đã phá',
  laneRandom: 'Dao động chọn lane',
  cardRandom: 'Dao động chọn thẻ',
  meleeRange: 'Ngưỡng tầm cận chiến',
  formationHp: 'HP chọn quân tuyến trước',
  formationBonus: 'Ưu tiên đội hình',
  healMissingHp: 'HP thiếu để AI hồi máu',
  pulseEnemies: 'Số địch để AI cộng hưởng',
  spellClusterRadius: 'Bán kính nhóm địch',
  spellClusterSize: 'Số địch trong nhóm',
  openingSeconds: 'Thời gian chốt bài PvP (s)',
  reconnectSeconds: 'Thời gian kết nối lại (s)',
  maximumSeconds: 'Giới hạn trận (s)',
  initialGold: 'Vàng người chơi mới',
  maxLevel: 'Cấp sưu tập tối đa',
  copiesPerLevel: 'Mảnh nâng cấp × cấp',
  chestDraws: 'Số thẻ mỗi rương',
  coreHp: 'Máu lõi',
  towerHp: 'Máu trụ',
  towerDamage: 'Sát thương trụ',
  towerRange: 'Tầm trụ',
  towerCooldown: 'Nhịp trụ (s)',
  maxMana: 'Mana tối đa',
  manaPerSecond: 'Mana/giây',
  cardCooldown: 'Hồi thẻ tướng (s)',
  maxUnits: 'Quân tối đa',
  overtimeAt: 'Quá tải sau (s)',
  overtimeBaseDamage: 'Sát thương quá tải/giây',
  overtimeAcceleration: 'Gia tốc quá tải',
  eventLimit: 'Sự kiện giữ lại',
};
export const selectField = (path: string, label: string, value: string, options: Record<string, string>) =>
  `<label>${esc(label)}<select data-path="${esc(path)}">${Object.entries(options)
    .map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`)
    .join('')}</select></label>`;
const check = (path: string, label: string, value: boolean) =>
  `<label class="checkbox"><input type="checkbox" data-bool="${path}" ${value ? 'checked' : ''}>${label}</label>`;
const spellKinds = {
  damage: 'Sát thương',
  heal: 'Hồi máu',
  shield: 'Lá chắn',
  slow: 'Làm chậm',
  stun: 'Choáng',
  freeze: 'Đóng băng',
  push: 'Đẩy lùi',
  weaken: 'Suy yếu',
  haste: 'Gia tốc',
};
const buffKinds = {
  shield: 'Khiên xuất trận (+)',
  health: 'Máu (×)',
  attack: 'Sát thương (×)',
  attackSpeed: 'Tốc đánh (×)',
  skillCooldown: 'Hồi kỹ năng (×)',
  mana: 'Hồi mana (×)',
  regeneration: 'Hồi HP/giây (+)',
  slowOnHit: 'Hệ số đi khi trúng đòn',
};
export function gameplayEditor(c: ContentConfig, modules: RuleModuleStatus[] = []) {
  const g = gameplayOf(c);
  const manifest = modules.length
    ? `<details class="panel config-card" id="config-modules"><summary>${modules.length} module rule · phiên bản và trạng thái</summary><p class="muted">Mỗi module có schema và phiên bản dữ liệu riêng trong database. Chỉ module thay đổi mới tăng phiên bản. Phát hành khóa toàn bộ bộ luật thành một revision để giữ tính nhất quán.</p><div class="module-table-scroll"><table><thead><tr><th>Module</th><th>Schema</th><th>Nháp</th><th>Live</th><th>Trạng thái</th></tr></thead><tbody>${modules.map((m) => `<tr><td><code>${esc(m.id)}</code><small>${esc(m.name)}</small></td><td>${m.schemaVersion}</td><td>${m.draftVersion}</td><td>${m.publishedVersion}</td><td>${m.changed ? 'Có thay đổi' : 'Đồng bộ'}</td></tr>`).join('')}</tbody></table></div></details>`
    : '';
  const numeric = (prefix: string, obj: object) =>
    `<div class="form-grid rules-grid">${Object.entries(obj)
      .filter(([k, v]) => typeof v === 'number' && k !== 'levelGrowth')
      .map(([k, v]) => input(`${prefix}.${k}`, labels[k] ?? k, v))
      .join('')}</div>`;
  const effects = (
    prefix: string,
    items: { kind: string; amount: number; duration?: number; cap?: number; stacking?: string }[],
    spell: boolean,
  ) =>
    `${items
      .map((e, i) => {
        const p = `${prefix}.${i}`;
        return `<div class="effect-editor"><div class="form-grid rules-grid">${selectField(`${p}.kind`, 'Hiệu ứng', e.kind, spell ? spellKinds : buffKinds)}${input(`${p}.amount`, 'Giá trị / hệ số', e.amount)}${input(`${p}.duration`, 'Thời lượng (s)', e.duration ?? '')}${spell ? input(`${p}.cap`, 'Giới hạn khiên', e.cap ?? '') + selectField(`${p}.stacking`, 'Tái áp dụng', e.stacking ?? 'refresh', { refresh: 'Cập nhật thời hạn', 'ignore-active': 'Bỏ qua khi còn hiệu lực' }) : ''}</div><button data-config-remove="${prefix}" data-index="${i}">Bỏ hiệu ứng ${i + 1}</button></div>`;
      })
      .join(
        '',
      )}<button data-config-add="${prefix}" data-effect-type="${spell ? 'spell' : 'buff'}">+ Hiệu ứng</button>`;
  return `<article class="panel gameplay-intro"><span class="eyebrow">DATABASE · CONTENT REVISION</span><h2>Cấu hình gameplay</h2><p>Luật hiện hành lấy từ bản phát hành trong database. Lưu nháp để chuẩn bị; phát hành áp dụng cho trận mới. Trận đang chạy và replay giữ cấu hình đã chụp đầu trận.</p><p class="muted">Ba lane, tick 20 Hz và giới hạn GPU 100 quân là ranh giới engine. Mana đầu trận dùng trường ở đây; startingMana trong rules cũ chỉ phục vụ replay legacy.</p><nav class="gameplay-nav"><a href="#config-deck">Deck</a><a href="#config-spells">Phép</a><a href="#config-synergies">Hệ/tộc</a><a href="#config-ai">AI</a><a href="#config-match">PvP</a></nav></article>
  ${manifest}<article class="panel" id="config-deck"><h3>Deck, tay bài & đổi bài</h3>${numeric('gameplay.deck', g.deck)}${check('gameplay.deck.shuffle', 'Xáo trước trận theo seed', g.deck.shuffle)}${check('gameplay.deck.recycle', 'Xáo các thẻ đã dùng khi hết chồng rút', g.deck.recycle)}<div class="columns">${(['defaultCards', 'aiCards'] as const).map((k) => `<label>${k === 'defaultCards' ? 'Deck mặc định người chơi' : 'Deck AI'}<textarea data-card-list="gameplay.deck.${k}" rows="4">${esc(g.deck[k].join(', '))}</textarea><small class="muted">ID thẻ, cách nhau bằng dấu phẩy. Theo đúng số thẻ và giới hạn bản sao.</small></label>`).join('')}</div></article>
  <article class="panel"><h3>Mana, trụ, lõi & quá tải</h3>${input('gameplay.startingMana', labels.startingMana, g.startingMana)}${numeric('rules', Object.fromEntries(Object.entries(c.rules).filter(([k]) => !['tickRate', 'startingMana'].includes(k))))}</article>
  <article class="panel" id="config-spells"><h3>Phép thuật · mục tiêu và chuỗi hiệu ứng</h3><p class="muted">Vùng có thời lượng &gt; 0: damage/heal/shield/push tính theo giây. Slow/weaken là hệ số 0–1; haste là hệ số tốc độ. Khiên không đặt cap sẽ không có giới hạn.</p>${Object.entries(
    g.spells,
  )
    .map(
      ([id, s]) =>
        `<details class="config-card"><summary>${esc(s.name)} · ${s.cost} mana · ${s.cooldown}s</summary><div class="form-grid rules-grid">${input(`gameplay.spells.${id}.name`, 'Tên', s.name, 'text')}${input(`gameplay.spells.${id}.description`, 'Mô tả', s.description, 'text')}${input(`gameplay.spells.${id}.icon`, 'Biểu tượng', s.icon, 'text')}${input(`gameplay.spells.${id}.color`, 'Màu', s.color, 'color')}${['cost', 'cooldown', 'radius', 'warning', 'duration'].map((k) => input(`gameplay.spells.${id}.${k}`, { cost: 'Mana', cooldown: 'Hồi chiêu (s)', radius: 'Bán kính (m)', warning: 'Cảnh báo (s)', duration: 'Thời lượng vùng (s)' }[k]!, s[k as keyof typeof s])).join('')}${selectField(`gameplay.spells.${id}.target`, 'Phe tác động', s.target, { enemy: 'Kẻ địch', ally: 'Đồng minh', all: 'Cả hai phe' })}</div>${check(`gameplay.spells.${id}.enabled`, 'Cho phép đưa vào deck', s.enabled)}${effects(`gameplay.spells.${id}.effects`, s.effects, true)}</details>`,
    )
    .join('')}</article>
  <article class="panel" id="config-synergies"><h3>Hệ/tộc · ngưỡng và hiệu ứng</h3>${Object.entries(
    g.synergies,
  )
    .map(
      ([id, s]) =>
        `<details class="config-card"><summary>${esc(({ ...ORIGINS, ...ROLES } as Record<string, { name: string }>)[id].name)} · ${s.required} tướng</summary><div class="form-grid">${input(`gameplay.synergies.${id}.required`, 'Tướng khác nhau cần có', s.required)}${selectField(`gameplay.synergies.${id}.scope`, 'Áp dụng cho', s.scope, { team: 'Toàn đội', members: 'Chỉ tướng thuộc hệ/tộc này' })}</div>${effects(`gameplay.synergies.${id}.effects`, s.effects, false)}</details>`,
    )
    .join('')}</article>
  <article class="panel"><h3>Cộng hưởng lõi</h3>${check('gameplay.resonance.enabled', 'Bật cộng hưởng lõi', g.resonance.enabled)}${numeric('gameplay.resonance', g.resonance)}</article>
  <article class="panel" id="config-ai"><h3>AI · nhịp quyết định và chiến thuật</h3>${numeric('gameplay.ai', g.ai)}${check('gameplay.ai.cycleEmptySpells', 'Dùng phép vùng trống khi tay toàn phép', g.ai.cycleEmptySpells)}</article>
  <article class="panel" id="config-match"><h3>Trận đấu & PvP</h3>${numeric('gameplay.match', g.match)}${selectField('gameplay.match.tieBreak', 'Khi lõi/sát thương bằng nhau', g.match.tieBreak, { 'damage-seeded': 'Sát thương, sau đó PRNG theo seed', 'damage-player0': 'Sát thương, sau đó phe 0' })}</article>
  <article class="panel"><h3>Vùng triển khai & combat</h3>${numeric('gameplay.board', g.board)}${numeric('gameplay.combat', g.combat)}</article>
  <article class="panel"><h3>Bộ sưu tập & rương</h3>${numeric('gameplay.collection', g.collection)}<p class="muted">Trận cycle/PvP vẫn chuẩn hóa cấp tướng. Giá vàng/phần thưởng ở Vật phẩm & tiền.</p></article>`;
}
