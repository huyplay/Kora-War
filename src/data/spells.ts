/** MVP balance values; identical for both players, independent of card levels. */
export const SPELLS = {
  wind: {
    id: 'wind',
    name: 'Gió',
    icon: '🌪',
    color: '#b7f5da',
    cost: 2,
    cooldown: 8,
    radius: 2.8,
    warning: 0.25,
    duration: 0,
    damage: 20,
    description: 'Đẩy lùi địch 2m, gây 20 sát thương.',
  },
  fire: {
    id: 'fire',
    name: 'Lửa',
    icon: '🔥',
    color: '#ff9c68',
    cost: 4,
    cooldown: 12,
    radius: 2.5,
    warning: 0.7,
    duration: 3,
    damage: 45,
    description: 'Vùng lửa gây 45 sát thương/giây trong 3 giây.',
  },
  lightning: {
    id: 'lightning',
    name: 'Sét',
    icon: '⚡',
    color: '#f4de81',
    cost: 4,
    cooldown: 12,
    radius: 2.2,
    warning: 0.65,
    duration: 0,
    damage: 110,
    description: '110 sát thương và choáng tối đa 0,6 giây.',
  },
  ice: {
    id: 'ice',
    name: 'Băng',
    icon: '❄',
    color: '#89dbff',
    cost: 3,
    cooldown: 10,
    radius: 2.8,
    warning: 0.4,
    duration: 0,
    damage: 35,
    description: '35 sát thương, đóng băng hoàn toàn trong 2 giây.',
  },
  heal: {
    id: 'heal',
    name: 'Hồi Sinh Lực',
    icon: '✚',
    color: '#73ffc1',
    cost: 3,
    cooldown: 10,
    radius: 3,
    warning: 0.3,
    duration: 0,
    damage: 0,
    description: 'Hồi 100 HP cho đồng minh trong vùng.',
  },
  shield: {
    id: 'shield',
    name: 'Khiên Aether',
    icon: '⬡',
    color: '#ffe3a1',
    cost: 3,
    cooldown: 12,
    radius: 3,
    warning: 0.25,
    duration: 0,
    damage: 0,
    description: 'Ban 100 lá chắn cho đồng minh trong vùng, tối đa 200.',
  },
  weaken: {
    id: 'weaken',
    name: 'Suy Yếu',
    icon: '◈',
    color: '#d8a4ff',
    cost: 3,
    cooldown: 12,
    radius: 2.8,
    warning: 0.4,
    duration: 0,
    damage: 0,
    description: 'Giảm 30% sát thương địch trong vùng trong 4 giây.',
  },
  haste: {
    id: 'haste',
    name: 'Gia Tốc',
    icon: '➤',
    color: '#a7edff',
    cost: 2,
    cooldown: 10,
    radius: 3,
    warning: 0.25,
    duration: 0,
    damage: 0,
    description: 'Tăng 35% tốc độ đi và đánh của đồng minh trong 4 giây.',
  },
} as const;
export type SpellId = keyof typeof SPELLS;
export const DEFAULT_SPELLS: SpellId[] = ['fire', 'ice'];
export function isSpell(id: string): id is SpellId {
  return Object.hasOwn(SPELLS, id);
}
export function validateSpellDeck(value: unknown): asserts value is SpellId[] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    new Set(value).size !== 2 ||
    value.some((id) => typeof id !== 'string' || !isSpell(id))
  )
    throw new Error('Chọn đúng 2 phép khác nhau.');
}
