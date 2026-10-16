import type { GameplayConfig } from '../data/gameplay';
import type { Wallet } from '../services/game-session';

/** Collection progress uses the published economy, never combat growth. */
export function collectionState(
  id: string,
  wallet: Wallet | undefined,
  collection: GameplayConfig['collection'],
  upgradeBase: number,
) {
  const card = wallet?.cards.find((card) => card.hero === id);
  const level = card?.level ?? 1,
    copies = card?.copies ?? 0;
  const need = level * collection.copiesPerLevel,
    cost = level * upgradeBase;
  const max = level >= collection.maxLevel;
  const reason = !wallet
    ? 'Kết nối để nâng cấp'
    : !card
      ? 'Thẻ này không có cấp sưu tập'
      : max
        ? 'Đã đạt cấp tối đa'
        : copies < need
          ? `Cần ${need - copies} mảnh nữa`
          : wallet.gold < cost
            ? `Cần ${cost - wallet.gold} vàng nữa`
            : '';
  return {
    level,
    copies,
    need,
    cost,
    max,
    owned: !!card,
    reason,
    canUpgrade: !reason,
    progress: max ? 1 : Math.min(1, copies / Math.max(1, need)),
  };
}
