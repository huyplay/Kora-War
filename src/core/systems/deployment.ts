import type { Battle } from '../Battle';
import { canDeployAt, isLane } from '../physics/lane-space';
import type { Side, Unit } from '../types';
export function validateDeployment(
  battle: Battle,
  side: Side,
  heroId: string,
  lane: number,
  x = side === 0 ? -12 : 12,
  uid?: number,
): string | null {
  if (side !== 0 && side !== 1) return 'Phe không hợp lệ.';
  if (battle.phase !== 'playing') return 'Trận đấu chưa sẵn sàng.';
  if (!isLane(lane) || !Number.isFinite(x)) return 'Vị trí không hợp lệ.';
  if (!canDeployAt(side, x, battle.gameplay.board)) return 'Triển khai trong vùng sáng bên mình.';
  const h = battle.heroes[heroId];
  if (!h || !battle.decks[side].includes(heroId)) return 'Tướng không nằm trong đội hình.';
  if (!battle.held(side, heroId, uid)) return 'Thẻ không còn trên tay.';
  if (battle.mana[side] + 1e-8 < h.cost) return `Cần ${h.cost} mana để gọi ${h.name}.`;
  if ((battle.cooldowns[side][heroId] || 0) > battle.time) return 'Thẻ đang hồi. Hãy chọn tướng khác.';
  if (battle.units.length >= battle.maxUnits) return 'Chiến trường đang đầy quân.';
  return null;
}
export function deployUnit(
  battle: Battle,
  side: Side,
  heroId: string,
  lane: number,
  x = side === 0 ? -12 : 12,
  uid?: number,
): string | null {
  const error = battle.canPlay(side, heroId, lane, x, uid);
  if (error) return error;
  const base = battle.heroes[heroId];
  const multiplier =
    side === 0 ? 1 + ((battle.levels[heroId] || 1) - 1) * battle.gameplay.combat.levelGrowth : 1;
  const h = { ...base, hp: base.hp * multiplier, attack: base.attack * multiplier };
  battle.mana[side] -= h.cost;
  battle.cooldowns[side][heroId] = battle.time + battle.content.rules.cardCooldown;
  const maxHp = battle.buff(side, heroId, 'health', h.hp);
  const u: Unit = {
    id: battle.nextId++,
    heroId,
    side,
    lane,
    x,
    previousX: x,
    hp: maxHp,
    maxHp,
    shield: battle.buff(side, heroId, 'shield', 0),
    attack: battle.buff(side, heroId, 'attack', h.attack),
    range: h.range,
    speed: h.speed,
    attackCd: battle.gameplay.combat.initialAttackDelay,
    skillCd: Math.min(battle.gameplay.combat.initialSkillDelay, h.skillCooldown),
    slowUntil: 0,
    slowFactor: 1,
    stunUntil: 0,
    born: battle.time,
    attackAt: -10,
    skillAt: -10,
    state: 'move',
  };
  battle.units.push(u);
  battle.stats[side].deployed++;
  battle.stats[side].spent += h.cost;
  battle.emit({ type: 'spawn', side, lane, x, heroId });
  battle.consumeCard(side, heroId, uid);
  return null;
}
