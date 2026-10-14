import { randomInt, randomUUID } from 'node:crypto';
import { Battle } from '../src/core/Battle';
import { ENEMY_DECK } from '../src/data/heroes';
import type { ContentConfig } from '../src/data/content';
import type { Difficulty } from '../src/core/types';
import type { GameDatabase } from './database';
import { tacticalBattle } from '../src/core/tactical';
import { validateSpellDeck, type SpellId } from '../src/data/spells';
import { cycleBattle } from '../src/core/cycle-battle';
import { gameplayOf } from '../src/data/gameplay';
export interface Command {
  tick: number;
  type: 'play' | 'pulse' | 'spell' | 'mulligan';
  cardUid?: number;
  cards?: number[];
  heroId?: string;
  lane: number;
  x?: number;
}
export function startMatch(
  store: GameDatabase,
  player: string,
  deck: string[],
  difficulty: Difficulty,
  spells?: SpellId[],
  cards?: string[],
) {
  if (!['story', 'normal', 'hard'].includes(difficulty)) throw new Error('Độ khó không hợp lệ.');
  const { published: content, revision } = store.config(),
    seed = randomInt(1, 0x7fffffff),
    id = randomUUID();
  const levels =
    spells || cards ? {} : Object.fromEntries(store.wallet(player).cards.map((c) => [c.hero, c.level]));
  if (cards !== undefined) cycleBattle(cards, content, seed);
  else if (spells) {
    validateSpellDeck(spells);
    tacticalBattle(deck, spells, content, seed);
  } else new Battle(deck, difficulty, seed, ENEMY_DECK, content, levels);
  store.db
    .prepare('INSERT INTO matches VALUES(?,?,?,?,?,?,?,?,?,NULL)')
    .run(
      id,
      player,
      seed,
      JSON.stringify(cards ? { ruleset: 'cycle-v1', cards } : spells ? { heroes: deck, spells } : deck),
      difficulty,
      JSON.stringify(content),
      JSON.stringify(levels),
      revision,
      Date.now(),
    );
  return { id, seed, revision, content, levels };
}
export function finishMatch(
  store: GameDatabase,
  player: string,
  id: string,
  commands: Command[],
  debug: boolean,
) {
  const match = store.db.prepare('SELECT * FROM matches WHERE id=? AND player=?').get(id, player) as
    | {
        result: string | null;
        seed: number;
        deck: string;
        difficulty: Difficulty;
        content: string;
        levels: string;
        created: number;
      }
    | undefined;
  if (!match) throw new Error('Không tìm thấy trận.');
  if (match.result) return JSON.parse(match.result);
  if (debug) throw new Error('Trận debug không nhận thưởng.');
  if (!Array.isArray(commands) || commands.length > 2000) throw new Error('Command log không hợp lệ.');
  const content = JSON.parse(match.content) as ContentConfig;
  const maximumTicks = Math.ceil(gameplayOf(content).match.maximumSeconds * content.rules.tickRate);
  let lastTick = 0;
  for (const c of commands) {
    if (
      !Number.isInteger(c.tick) ||
      c.tick < lastTick ||
      c.tick > maximumTicks ||
      !['play', 'pulse', 'spell', 'mulligan'].includes(c.type) ||
      !Number.isInteger(c.lane) ||
      c.lane < 0 ||
      c.lane > 2 ||
      (!['pulse', 'mulligan'].includes(c.type) && (!Number.isFinite(c.x) || typeof c.heroId !== 'string'))
    )
      throw new Error('Lệnh trận không hợp lệ.');
    lastTick = c.tick;
  }
  const savedDeck = JSON.parse(match.deck);
  const battle =
    savedDeck.ruleset === 'cycle-v1'
      ? cycleBattle(savedDeck.cards, content, match.seed, undefined, match.difficulty)
      : !Array.isArray(savedDeck)
        ? tacticalBattle(
            savedDeck.heroes,
            savedDeck.spells,
            content,
            match.seed,
            ENEMY_DECK,
            undefined,
            match.difficulty,
          )
        : new Battle(savedDeck, match.difficulty, match.seed, ENEMY_DECK, content, JSON.parse(match.levels));
  let cursor = 0;
  if (battle.cycling) {
    battle.mulligan(1, []);
    const opening = commands[cursor++];
    if (!opening || opening.type !== 'mulligan' || opening.tick !== 0 || battle.mulligan(0, opening.cards!))
      throw new Error('Đổi bài đầu trận không hợp lệ.');
  }
  battle.start();
  while (battle.phase === 'playing' && battle.tick < maximumTicks) {
    while (commands[cursor]?.tick === battle.tick) {
      const c = commands[cursor++];
      if (battle.cycling && ['play', 'spell'].includes(c.type) && !Number.isSafeInteger(c.cardUid))
        throw new Error('Thiếu mã thẻ trên tay.');
      const error =
        c.type === 'spell'
          ? battle.cast(0, c.heroId!, c.lane, c.x!, c.cardUid)
          : c.type === 'play'
            ? battle.play(0, c.heroId!, c.lane, c.x, c.cardUid)
            : c.type === 'pulse'
              ? battle.pulse(0, c.lane)
              : 'Đã chốt bài đầu trận.';
      if (error) throw new Error(`Lệnh bị từ chối: ${error}`);
    }
    battle.step();
  }
  if (battle.phase !== 'ended' || cursor !== commands.length) throw new Error('Trận chưa kết thúc hợp lệ.');
  if (Date.now() - match.created < battle.time * 1000 * 0.85)
    throw new Error('Trận kết thúc sớm hơn thời gian chơi.');
  return store.trade(player, `match-${id}`, () => {
    const result = {
      delta: battle.winner === 0 ? content.economy.winGold : content.economy.lossGold,
      reason: battle.winner === 0 ? 'Chiến thắng' : 'Hoàn thành trận',
      winner: battle.winner,
      time: battle.time,
    };
    store.db
      .prepare('UPDATE matches SET result=? WHERE id=? AND result IS NULL')
      .run(JSON.stringify(result), id);
    return result;
  });
}
export function buyItem(store: GameDatabase, player: string, itemId: string, request: string) {
  return store.trade(player, request, () => {
    const item = store.config().published.items.find((i) => i.id === itemId);
    if (!item) throw new Error('Vật phẩm không tồn tại.');
    store.db
      .prepare('UPDATE cards SET copies=copies+? WHERE player=? AND hero=?')
      .run(item.copies, player, item.heroId);
    return { delta: -item.price, reason: `Mua ${item.name}`, heroId: item.heroId, copies: item.copies };
  });
}
export function openChest(store: GameDatabase, player: string, request: string) {
  return store.trade(player, request, () => {
    const c = store.config().published;
    const rewards = Array.from(
      { length: gameplayOf(c).collection.chestDraws },
      () => c.heroes[randomInt(c.heroes.length)].id,
    );
    for (const id of rewards)
      store.db.prepare('UPDATE cards SET copies=copies+1 WHERE player=? AND hero=?').run(player, id);
    return {
      delta: c.economy.chestGold - c.economy.chestCost,
      reason: 'Rương Aether',
      rewards,
      gold: c.economy.chestGold,
    };
  });
}
export function upgradeCard(store: GameDatabase, player: string, hero: string, request: string) {
  return store.trade(player, request, () => {
    const card = store.db
      .prepare('SELECT level,copies FROM cards WHERE player=? AND hero=?')
      .get(player, hero) as { level: number; copies: number } | undefined;
    const collection = gameplayOf(store.config().published).collection;
    if (!card || card.level >= collection.maxLevel || card.copies < card.level * collection.copiesPerLevel)
      throw new Error(`Cần đủ mảnh thẻ, cấp tối đa ${collection.maxLevel}.`);
    store.db
      .prepare('UPDATE cards SET level=level+1,copies=copies-? WHERE player=? AND hero=?')
      .run(card.level * collection.copiesPerLevel, player, hero);
    return {
      delta: -store.config().published.economy.upgradeBase * card.level,
      reason: `Nâng cấp ${hero}`,
      hero,
      level: card.level + 1,
    };
  });
}
