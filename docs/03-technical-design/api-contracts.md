# REST và realtime contracts — Proposed v0

Contracts dưới đây đủ định hướng codegen/validation; chưa phải service đã chạy hay toàn bộ OpenAPI. HTTPS/WSS bắt buộc production. PlayerId lấy từ session principal; body không được chọn owner/side. Client/protocol/content versions tách riêng. Unknown gameplay parameter không được hợp thức hóa bằng protocol defaults.

| Method | Route | Quyền | Request → response | Quy tắc |
|---|---|---|---|---|
| GET | /v1/bootstrap | Public | clientVersion/platform/locale → minVersion, contentHash, assetManifest, enabledModes | ETag; không chứa loot seed/private keys |
| POST | /v1/sessions/guest | Public rate limited | deviceNonce → accessToken, refresh cookie, playerId | Replay/abuse policy; không fingerprint xâm lấn |
| POST | /v1/sessions/refresh | Refresh cookie | rotation → accessToken | Reuse refresh token cũ revoke family |
| POST | /v1/sessions/link | Player | provider assertion → linked identities | Verify issuer/audience/nonce; không overwrite conflict |
| DELETE | /v1/sessions/current | Player | →204 | Revoke session; disconnect authenticated hub |
| GET | /v1/me | Player | → progress,wallets,entitlements,revision | Chỉ chính mình; ETag |
| GET | /v1/catalog/{contentHash} | Public | → immutable public card/rules view | Hidden server policies/seeds không đưa ra |
| GET | /v1/me/cards | Player | cursor → collection,nextCursor | Stable pagination; effective level+expiry |
| GET | /v1/me/decks | Player | →slots,selected,revision | Ownership filtered |
| PUT | /v1/me/decks/{slot} | Player | cards[],expectedRevision → saved deck | If-Match; 409 conflict; validate7/14/duplicates |
| POST | /v1/me/decks/{slot}/select | Player | expectedRevision → selected | Không sửa frozen deck trong active match |
| POST | /v1/me/cards/{id}/upgrade | Player | expectedLevel,contentHash → receipt | Idempotency-Key; server lookup price;422 insufficient |
| POST | /v1/matchmaking/tickets | Player | mode,deckId,regionHint,contentHash → ticketId | One active ticket/match; friendly invite conflict |
| DELETE | /v1/matchmaking/tickets/{id} | Owner | →cancelled hoặc assigned | Race-safe; assigned không tự cancel cả match |
| GET | /v1/matchmaking/tickets/{id} | Owner | →queueState,matchId,joinToken khi ready | Join token một match/player, short-lived |
| GET | /v1/matches/{id}/result | Participant | →pending hoặc result+rewardReceipt | Không có POST client winner |
| GET | /v1/matches/{id}/replay | Authorized | →signed URL,formatHash,visibility | Không expose live private hand/RNG |
| GET | /v1/me/chests | Player | →slots,serverNow,unlockAt | Không dùng client clock mở thưởng |
| POST | /v1/me/chests/{id}/unlock | Owner | →unlockAt | One active battle chest unlock |
| POST | /v1/me/chests/{id}/claim | Owner | →rewardReceipt | Atomic claim; retry returns same loot |
| GET | /v1/shop/offers | Player | →eligible offers+price revisions | Server eligibility, local price display |
| POST | /v1/shop/purchases | Player | offerId,priceRevision → receipt/checkout | No client supplied amount/grant; idempotent |
| POST | /v1/payments/{provider}/webhook | Signed provider | event → ack | Verify signature/time/provider unique ID |
| POST | /v1/me/forge/actions | Player | cardId,action,expectedRevision → receipt | Config required; atomic crystals debit |
| GET | /v1/leaderboards/{scope} | Player | season,cursor → ranks,watermark | Stable tie rule Proposed, not original claim |
| POST | /v1/clans | Player | name,joinPolicy → clan | Documented level3/gold1000; current gate |
| POST | /v1/clans/{id}/memberships | Player | join request → pending/joined | Open/invite/closed; capacity atomic |
| POST | /v1/clans/{id}/donation-requests | Member | cardId → request | Limits pending config; no guessed quotas |
| POST | /v1/donation-requests/{id}/donate | Clan member | amount → receipt | CAS and ownership/copy validation |
| POST | /v1/clans/{id}/friendly-invites | Member | deckId → inviteId | Queue exclusion; CAS accept endpoint |
| POST | /v1/friendly-invites/{id}/accept | Same clan | deckId → matchId | One acceptor; creator cannot self accept |
| DELETE | /v1/friendly-invites/{id} | Creator | →cancelled | Reject if already accepted; idempotent |
| GET | /v1/modes | Player | →active rotation/rules/rewards | U08 blocks unsupported modes |
| POST | /v1/tournaments/{id}/entries | Player | deckId → entry receipt | Verified fee/rules required |
| POST | /v1/privacy/deletion-requests | Player re-auth | →pending request | Original có delete+15s confirmation; web processing/retention policy Proposed |

Mutation kinh tế yêu cầu header `Idempotency-Key` UUID và requestHash được server tính sau canonicalization. TTL lưu receipt phù hợp ledger, không expire ngắn rồi cho retry tạo grant mới. PUT deck dùng ETag/If-Match. Error REST dạng `application/problem+json`: `{type,title,status,code,traceId,fieldErrors,retryAfterMs}`. Phân biệt401 authentication,403 quyền,404 không có/không được thấy,409 revision/key conflict,422 vi phạm luật,429 rate limit,503 capacity. Không trả stack trace hoặc private opponent info.

## Hub và vòng đời

Endpoint `/hubs/battle`; client methods `JoinMatch`, `SubmitCommand`, `AcknowledgeSnapshot`, `RequestResync`, `Ping`. Server events `MatchWelcome`, `CommandReceipt`, `StateSnapshot`, `BattleEvents`, `MatchFinished`, `ResyncRequired`, `ProtocolError`. Lobby notification có thể poll ticket giai đoạn đầu; clan chat dùng hub riêng có membership authorization và rate limit.

Join request `{protocolVersion:1,matchId,joinToken,lastSnapshotId?,lastEventSeq?,lastCommandSeq?}`. Server kiểm tra token+identity+match participant+core/content compatibility, gửi full filtered snapshot; reconnect không đòi client tự khôi phục authority. Transport reconnect của SignalR không thay application recovery. [SignalR configuration](https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration?view=aspnetcore-10.0).

```json
{
  "protocolVersion": 1,
  "matchId": "11111111-1111-4111-8111-111111111111",
  "commandId": "22222222-2222-4222-8222-222222222222",
  "clientSeq": 17,
  "observedTick": 142,
  "type": "PlayCard",
  "payload": {"handInstanceId":"h-12","lane":1,"xFixed":12500}
}
```

Ví dụ tọa độ12500 chỉ là wire example, không chứng minh vùng spawn gốc. Lane int0..2; xFixed integer trong ruleset bounds. Play payload chỉ cho phép handInstanceId/lane/xFixed; spell target entity/point shape phải theo card target schema đã verified. Tại v0 chỉ publish card dùng shape này. `BuyDraw` payload rỗng. `DiscardCard` bị feature gate U02; chưa expose `Surrender` trước U11. Emoji input cosmetic server rate limit, không đi qua damage pipeline.

Receipt `{commandId,clientSeq,status,executedTick?,eventSeq?,code?}`: accepted nghĩa đã apply đúng một lần; rejected không mutate tài nguyên. Pending receipt chỉ ACK transport, không dùng chữ accepted trước validation. Error codes: NOT_PLAYING, STALE_HAND, INSUFFICIENT_MANA, INVALID_LANE, INVALID_POSITION, INVALID_TARGET, OUT_OF_ORDER, DUPLICATE_PAYLOAD_MISMATCH, RULESET_MISMATCH, RATE_LIMITED, SERVER_BUSY. Retry cùng commandId trả receipt cũ; cùng sequence nhưng payload mới reject. Commands thực thi theo server receipt order ở tick kế tiếp; observedTick chỉ telemetry, không cho client chọn executionTick hoặc rewind damage.

## Snapshot và event

`StateSnapshot`: protocolVersion, matchId, snapshotId, baseSnapshotId|null, serverTick, rulesetHash, ackClientSeq, lastEventSeq, publicState, privateSelf, viewHash. Full snapshot có base=null. Delta chỉ áp nếu client giữ base đúng; thiếu base/request resync, không tự ghép vào state bất kỳ. Backpressure bỏ snapshot cũ chưa gửi nhưng không bỏ command receipt/result; client có event gaps phải resync. Proposed default10Hz, server20Hz.

Public state: castles[side,hp,maxHp], entities[id,side,lane,xFixed,hp,maxHp,statusFlags,animationState], projectiles, visible effects, timer/phase. Không xuất opponent hand, future draw order, private seed, internal anti-cheat scores. Chỉ thêm opponent mana/deck details nếu original UI xác minh cho thấy. `privateSelf`: mana, manaCap, hand[instanceId,publicCardId,effectiveLevel], own active discounts và lastProcessedSeq. Local deck rendering data không đồng nghĩa được xem deck ẩn đối phương.

`BattleEvents`: eventSeq, tick, type, sourceId?, targetId?, payload. Types Spawned, MovedLane, AttackStarted, ProjectileSpawned, DamageApplied, Healed, StatusChanged, UnitDied, CastleDamaged, CardDrawnSelf, CardBurnedSelf, ManaChangedSelf. Recipient filter cho private events. Entity lifecycle có generation/unique ID; pool renderer không tái dùng network ID. Visual animation nhận event tick, không tự emit damage.

`MatchFinished`: matchId, finalTick, resultVersion, outcome(win/loss/void), winnerSide?, reason, settlementState(pending/committed), receiptId?. Nếu DB chậm UI hiển thị thưởng đang xử lý và poll result; không cho client cấp thưởng dựa predicted winner. Hòa không được đưa thành luật gốc: simultaneous lethal parity profile còn U06. Server crash chưa recover được là void Proposed, không rating delta.

## Limits và compatibility

Mục tiêu ban đầu: command≤1KiB, inbound20/s burst40/player, full snapshot≤64KiB; đây là transport guardrails Proposed, benchmark phải điều chỉnh. SignalR max message receive mặc định không đủ cho mọi snapshot kích thước tùy chiều; cấu hình riêng và đo payload thực. Never deserialize arbitrary type names. JSON readable dùng đầu tiên; MessagePack sau profile, versioned schema/codegen cùng golden roundtrip tests.

Sequence integer an toàn ≤2^53-1 trên JS; match scoped counters reset mỗi match, epoch tách room identity. Int64 wallet trả decimal string. Timestamp UTC ISO8601, gameplay timers là tick int. Reconnect giữ commandId/seq, server trả last receipt và current full snapshot. Version skew: client cũ từ chối bằng minVersion+rõ lỗi, không áp unknown enum mặc định. Match đang chạy pin content/core, rollout mới không thay schema giữa trận.
