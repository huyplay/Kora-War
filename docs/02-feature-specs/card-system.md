# Card System Specification

## Luật documented

Deck mới 7 lá, không lặp; đạt 200 trophy mở 14, tối đa 2 bản thường và 1 Legendary; lưu tối đa 5 deck. Trận dùng deck đang được chọn. [Deck](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684724253329-Building-a-battle-deck). Mở 14 có tiếp tục giữ khi tụt dưới 200 không: Unknown, cần flag progression thay vì tính lại bằng trophy hiện tại.

Tay 5, cap 6, shuffle mỗi deck cycle; đầy tay làm mất lá rút; tay rỗng có action rút trả 5 mana. [Draw](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling). Double-card đã nêu trong gameplay; không tự cho rằng dùng một lá sẽ rút bù ngay như game khác.

## Data contract đề xuất

`CardDefinition(id, revision, rarity, kind, costPolicy, spawnGroup, targetPolicyId, abilities[], levelStats[], assetKey)`; `CardInstance(instanceId, definitionId, effectiveLevel, tier)`; deck là **list instance slot**, không phải set. Tách base rarity khỏi Ascended/Founder tier. `LevelStats` là lookup có provenance, không phải mỗi thẻ nhân một công thức chung.

`DeckSnapshot` đóng băng khi match tạo: card revisions, ownership, base/forged/tier levels, mode overrides. Forge hết hạn giữa trận không sửa snapshot. Quy tắc này là Proposed, phải đối chiếu bản gốc.

```text
validateDeck(player, deck, mode):
  require deck.slot in [0..4] and optimisticRevision matches
  require size == unlockedDeckSize(player, ruleset)
  require every card owned, unlocked, permittedByMode
  count by canonical card definition (not cosmetic / NFT instance)
  require each count <= duplicateLimit(definition, ruleset)
  snapshot = resolveEffectiveLevels(mode, forge, tier, now)
  persist atomically or return typed error; never partial save

drawOne(player, cause):
  if drawBag exhausted: shuffle full deck with private seeded RNG
  card = drawBag.consumeNext()
  if hand full: emit CardBurned
  else hand.add(new card instance)
  apply crystal gain according to cause policy (OPEN GAP U02)
```

`drawOne` là thuật toán Proposed bao quanh luật documented. Tách cause `initial`, `scheduled`, `double`, `paid`, `extraCrystal`; chưa xác minh crystal gain cho từng cause. Không gọi lại drawOne vô hạn khi Extra Crystal ở cap. Double + tay5 có hai policy candidate `draw_only_available_slots` và `consume_and_burn`; parity gate bắt chọn dựa trên trace.

Command play dùng `handInstanceId` và revision, không index mảng thay đổi. Server kiểm tra mana, target, vùng hợp lệ trước khi trừ thẻ/mana trong cùng tick. Input bị reject không đổi state. Hai play cùng instance: chỉ một accepted. Discount/level cap của Mana Ritual dùng policy riêng; cap cost floor, stacking và cross-rarity mapping đang Unknown.

Acceptance: deck validation, 14-draw permutation với duplicates, full-hand burn, empty-hand purchase, reject stale/replayed play; toàn bộ có seed+trace. [Test cases](../04-development/testing-strategy.md).
