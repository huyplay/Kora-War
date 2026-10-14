import type { Battle, Difficulty } from '../core/index';
import type { Hero } from '../data/index';
import type { World } from '../rendering/World';
import type { Sound } from '../services/audio';
import type { SpellId } from '../data/spells';
/** Dữ liệu và hành động mà các màn hình được phép sử dụng. */
export interface ScreenContext {
  readonly heroes: Hero[];
  readonly heroMap: Record<string, Hero>;
  deck: string[];
  cards: string[];
  spells: SpellId[];
  readonly online: boolean;
  difficulty: Difficulty;
  wins: number;
  mode: 'lobby' | 'battle';
  battle: Battle;
  readonly sound: Sound;
  readonly world: World;
  endedShown: boolean;
  tutorial: number;
  accumulator: number;
  toast(message: string): void;
  startBattle(tutorial?: boolean): void;
  lobby(): void;
  persist(): void;
  renderDeck(): void;
  preview(): void;
  clearSelection(): void;
  card(hero: Hero, index: number, roster?: boolean): string;
  formatTime(time: number): string;
  claimReward(): Promise<number>;
}
