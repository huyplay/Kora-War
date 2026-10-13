# Battle Simulation / Combat Contract

Danh sách C01–C20 và thuật toán từng mechanism nằm trong [combat research](../01-research/combat-mechanics.md); tài liệu này định nghĩa cách kết hợp. Mọi ordering là Proposed chờ đối chiếu trace gốc.

## Một tick

1. Lấy commands được server đóng dấu cho tick, deduplicate, validate trên state tại thời điểm xử lý.
2. Xử lý timer/resource/draw theo ruleset; thứ tự draw và play tại boundary là policy cần fixture.
3. Expire effects, activate spawns; snapshot targetable entities.
4. Targeting + movement intents, giải quyết vị trí ổn định.
5. Schedule attacks và advance projectiles; thu damage/heal/effect intents.
6. Resolve batch bằng phase và eventSeq, xét lethal/death hooks, cập nhật frontier.
7. Xét castle terminal, phát events/snapshot; nếu terminal thì không còn actions mới.

Quyết định mặc định lab: effects expiry trước attacks; damage/heal dùng batch với comparator được versioned; mutual lethal không mặc định draw vì tài liệu gốc nói không hòa. Lab tie có thể dùng seeded neutral tie-break để thử luồng, phải gắn deviation, chưa được mở parity gate.

## Ability schema

`AbilityDefinition {trigger, selector, filters, operation, magnitudeByLevel, durationTicks, stackingGroup, stackingPolicy, priority, maxDepth}`.
Triggers: OnSpawn/OnAttackCommit/OnHit/OnDeath/OnTimer/OnAllyCountChanged.
Selectors: self, target, sameLane, area, allLanes, ownCastle; filter theo team/type/tier/alive.
Operations: damage/heal/spawn/applyStatus/displace/transform/modifyResource.

Không cần tạo 65 subclass copy-paste. Tuy vậy interpreter quá tổng quát có thể khó debug: chỉ triển khai operations xuất hiện trong cards của slice, còn lại báo UnsupportedAbility. Damage type/armor không tự thêm nếu nguồn chưa có.

## Invariants và diagnostic

EntityId + generation; không dereference unit đã pool lại. OnDeath chỉ một lần. Event parentId/depth dùng phát hiện vòng summon/reflect. Cap số event/tick là circuit breaker, vượt → terminate match `INTERNAL_ERROR/VOID`, không silently drop ảnh hưởng kết quả. Mỗi issue có seed, config hash, last100 accepted commands và state hash.

Stat math: integer/fixed-point, phép nhân intermediate64-bit, rounding và saturation rõ trong shared core; validate overflow catalog ở build. Range check dùng squared distance hoặc 1D lane interval với scale thống nhất; không dùng mesh bounding box. C++/C#/JS floating-point clone khác nhau không được gọi deterministic trước cross-runtime fixtures.
