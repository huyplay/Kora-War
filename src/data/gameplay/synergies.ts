import type { BuffKind, GameplayConfig, TraitId } from './types';

export function synergyDescription(g: GameplayConfig, id: TraitId) {
  const rule = g.synergies[id];
  const names: Record<BuffKind, string> = {
    shield: 'khiên xuất trận',
    health: 'máu',
    attack: 'sát thương',
    attackSpeed: 'tốc đánh',
    skillCooldown: 'thời gian hồi kỹ năng',
    mana: 'hồi mana',
    regeneration: 'HP/giây',
    slowOnHit: 'tốc độ đi khi trúng đòn',
  };
  return `${rule.required} tướng · ${rule.scope === 'team' ? 'toàn đội' : 'thành viên hệ/tộc'}: ${rule.effects.map((e) => `${names[e.kind]} ${['shield', 'regeneration'].includes(e.kind) ? '+' : '×'}${e.amount}${e.duration ? ` / ${e.duration}s` : ''}`).join(', ') || 'không có hiệu ứng'}`;
}
