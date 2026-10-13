import type { Battle, Difficulty } from '../core/index';
import { defaultContent, validateContent, type ContentConfig } from '../data/content';
import { api, type ManagedAsset } from './api';
export interface Wallet {
  player: string;
  gold: number;
  cards: {
    hero: string;
    level: number;
    copies: number;
  }[];
  ledger: {
    delta: number;
    reason: string;
    created: string;
  }[];
}
interface Command {
  tick: number;
  type: 'play' | 'pulse';
  heroId?: string;
  lane: number;
  x?: number;
}
interface RemoteMatch {
  id: string;
  seed: number;
  revision: number;
  content: ContentConfig;
  levels: Record<string, number>;
}
export class GameSession {
  content = defaultContent();
  assets: ManagedAsset[] = [];
  revision = 0;
  wallet?: Wallet;
  match?: RemoteMatch;
  commands: Command[] = [];
  async initialize() {
    try {
      const result = await api<{
        revision: number;
        content: ContentConfig;
        assets: ManagedAsset[];
      }>('/api/content');
      validateContent(result.content);
      this.content = result.content;
      this.revision = result.revision;
      this.assets = result.assets;
      this.wallet = await api<Wallet>('/api/player', 'POST', {});
    } catch {
      /* Static/offline demo stays playable without economy. */
    }
  }
  async start(deck: string[], difficulty: Difficulty) {
    this.commands = [];
    this.match = undefined;
    if (!this.wallet) return undefined;
    const match = await api<RemoteMatch>('/api/game/start', 'POST', { deck, difficulty });
    if (match.revision !== this.revision) throw new Error('Nội dung game đã cập nhật. Hãy tải lại trang.');
    this.match = match;
    return match;
  }
  record(command: Command) {
    if (this.match) this.commands.push({ ...command });
  }
  async reward(battle: Battle) {
    const match = this.match,
      commands = this.commands.slice();
    if (!match || battle.debugUsed) return 0;
    const result = await api<{
      delta: number;
    }>('/api/game/finish', 'POST', { id: match.id, commands, debug: battle.debugUsed });
    this.wallet = await api<Wallet>('/api/player');
    return result.delta;
  }
  async trade(action: 'buy' | 'chest' | 'upgrade', data: Record<string, string> = {}) {
    const result = await api<{
      result: {
        rewards?: string[];
        gold?: number;
        level?: number;
      };
      wallet: Wallet;
    }>(`/api/game/${action}`, 'POST', { ...data, request: crypto.randomUUID() });
    this.wallet = result.wallet;
    return result.result;
  }
}
export const gameSession = new GameSession();
