from build_technical import *
from collections import Counter

def append(path, body):
    write(path, (DOC/path).read_text(encoding='utf8')+'\n\n'+body)

append('01-research/version-history.md',f'''## Tín hiệu cộng đồng cần đối chiếu

Tháng 01/2026 có báo cáo Ascended biến mất và bình luận cho rằng NFT/ACS bị ngừng. Đây là **Unverified**, chưa tìm được thông báo gốc đủ xác nhận phạm vi/ngày hiệu lực; không suy từ lỗi tài khoản thành việc xóa toàn bộ tính năng. {link('COMMUNITY-NFT-2026')}. U09 phải đối chiếu announcement trong game, support và live collection; không tự gán thông báo 6.4.0 cho sự kiện này.''')
append('01-research/unknowns-and-assumptions.md',f'''NFT/ACS có báo cáo cộng đồng tháng 01/2026 về mất thẻ/ngừng dịch vụ, trong khi trang hỗ trợ vẫn còn. {link('COMMUNITY-NFT-2026')}. Trạng thái hiện tại vẫn **Unknown**, tài liệu Ascension chỉ chứng minh từng được mô tả.''')

tables=[
('players','id uuid PK','display_name text, locale text, created_at timestamptz, status text','Tên bản phát hành riêng; unique ID, không bắt unique display name nếu chưa cần'),
('auth_identities','id uuid PK','player_id FK players, provider text, subject text','UNIQUE(provider,subject); không gộp account theo email không verified'),
('sessions','id uuid PK','player_id FK, refresh_hash bytea, expires_at, revoked_at','Hash refresh token; index player_id/expires_at; không lưu token plaintext'),
('player_progress','player_id PK/FK','xp bigint, level int, trophies int, arena_id FK, deck_capacity int, revision bigint','CHECK xp>=0, level>=1; deck_capacity IN(7,14); trophy floor theo config'),
('content_releases','id text PK','manifest_hash text UNIQUE, ruleset_hash text, status text, published_at','Immutable published; unknown rules không activate parity profile'),
('cards','(release_id,card_id) PK','release_id FK, public_name text, rarity text, kind text, definition jsonb','JSON schema validated; card stats lookup và provenance trong content bundle'),
('arenas','(release_id,arena_id) PK','trophy_threshold int, unlocks jsonb','Không ghi threshold tưởng tượng; release có đủ lookup mới active'),
('player_cards','(player_id,card_id) PK','copies bigint, base_level int, revision bigint','copies>=0, level>=1; ownership stable cardId, effective stats theo release'),
('decks','id uuid PK','player_id FK, slot smallint, revision bigint, selected bool','slot0..4; UNIQUE(player_id,slot); partial unique selected=true mỗi player'),
('deck_slots','(deck_id,ordinal) PK','deck_id FK, ordinal smallint, card_id text','ordinal0..13; duplicate/rarity/capacity kiểm tra domain transaction'),
('forge_effects','id uuid PK','player_id FK, card_id, effect_type, starts_at, expires_at, cap_unlock int','Boost có expiry; cap unlock khác base_level; effect conflict theo verified config'),
('wallets','(player_id,currency) PK','balance bigint, revision bigint','balance>=0; integer minor units; gold/gems/forge crystals tách currency'),
('economy_operations','id uuid PK','player_id FK, idempotency_key text, request_hash text, receipt jsonb, created_at','UNIQUE(player_id,idempotency_key); same key khác payload => conflict'),
('ledger_entries','id uuid PK','operation_id FK, player_id, currency, delta bigint, reason, source_ref, created_at','Append-only; FK(player_id,currency) wallets; delta<>0; reversal tham chiếu bút toán gốc'),
('reward_grants','id uuid PK','player_id FK, source_type, source_id, operation_id FK, rewards jsonb','UNIQUE(player_id,source_type,source_id); trận/chest chỉ được grant một lần'),
('chests','id uuid PK','player_id FK, type_id, slot, state, granted_at, unlock_at, loot_revision, receipt_id FK','Partial unique(player_id,slot) khi occupying; partial unique(player_id) khi unlocking'),
('offers','id uuid PK','content_release FK, price jsonb, grant jsonb, begins_at, ends_at, eligibility jsonb','Server price; immutable revision; daily reshuffle lưu offer assignment seed/IDs riêng'),
('purchases','id uuid PK','player_id FK, provider, external_id, offer_id FK, state, receipt_hash, operation_id FK','UNIQUE(provider,external_id); signed webhook, không tin browser success page'),
('entitlements','id uuid PK','player_id FK, product_id, starts_at, expires_at, source_purchase_id FK','Subscription history; perks hiệu lực theo timestamp server'),
('economy_counters','(player_id,counter_type,period_key) PK','value bigint, expires_at, config_revision','Daily coins, capsule/piggy progress; period timezone phải đo U07'),
('matches','id uuid PK','mode, ruleset_hash, content_hash, core_version, status, host_epoch bigint, started_at, ended_at, winner_slot, result_hash','winner_slot NULL khi active/void; terminal result bất biến; check modes/ranked config'),
('match_participants','(match_id,slot) PK','match_id FK, slot0..1, player_id FK nullable, bot_policy_id, deck_snapshot jsonb, trophies_before, trophy_delta','Player hoặc bot, không cả hai; UNIQUE(match_id,player_id); frozen deck'),
('battle_replays','match_id PK/FK','private_object_key, public_object_key nullable, sha256, format_version, bytes, expires_at','Private seed/commands trong object storage; signed access; retention Proposed30d'),
('battle_events','(match_id,event_seq) PK','match_id FK, tick bigint, kind, payload jsonb','Chỉ terminal/audit/important events; không ghi mọi position mỗi tick vào SQL'),
('outbox','id uuid PK','aggregate_id, kind, payload jsonb, created_at, published_at, attempts','At-least-once delivery; consumer dedup eventId; index unpublished'),
('seasons','id text PK','config_revision, starts_at, ends_at, league_rules jsonb','3 tuần documented, timezone/reset lookup chưa verified'),
('season_scores','(season_id,player_id) PK','season_id FK, player_id FK, trophies, league_id, reward_receipt','Index(season_id,trophies DESC,player_id); leaderboard projection có watermark'),
('clans','id uuid PK','name, join_policy, minimum_trophy, leader_id FK players, revision','Capacity/creation price config; 50 là historical WP, phải confirm live'),
('clan_members','player_id PK/FK','clan_id FK, role, joined_at','Một clan/player Proposed; index clan_id; role transfer transactional'),
('clan_messages','id uuid PK','clan_id FK, author_id FK, kind, body, created_at, moderation_state','Length/rate/retention server policy, không nhúng HTML'),
('donation_requests','id uuid PK','clan_id FK, requester_id FK, card_id, requested, fulfilled, expires_at, revision','Giới hạn theo config; donor debit/recipient copies/reward một transaction'),
('donation_actions','id uuid PK','request_id FK, donor_id FK, amount, operation_id FK','Unique request+command; audit copies/gold/XP'),
('friendly_invites','id uuid PK','clan_id FK, creator_id FK, acceptor_id FK nullable, status, match_id FK nullable, expires_at','CAS pending→accepted; tối đa một acceptor, creator không ranked queue đồng thời'),
('mode_rotations','id uuid PK','mode_id, config_revision, starts_at, ends_at','Chỉ publish mode đã kiểm chứng; không mặc định daily schedule bản cũ'),
('tournament_entries','id uuid PK','rotation_id FK, player_id FK, wins, losses, state, operation_id FK','Fees/reward/entry cap còn U08; deploy khi có ruleset đầy đủ')]

write('03-technical-design/database-design.md','''
# Database Design — Proposed

Đây là logical schema để triển khai migrations ở milestone D/E/F, chưa phải cơ sở dữ liệu đã chạy. Dùng UUID cho identity, UTC `timestamptz`, `bigint` cho currency/counters và optimistic revision. Mọi enum/config được version hóa. Bảng liên quan cơ chế lịch sử chỉ bật sau gate live; không tạo bảng quest, friend graph hay battle pass khi chưa xác minh sự tồn tại.

```mermaid
erDiagram
  PLAYERS ||--o{ AUTH_IDENTITIES : links
  PLAYERS ||--o{ SESSIONS : owns
  PLAYERS ||--|| PLAYER_PROGRESS : progresses
  PLAYERS ||--o{ PLAYER_CARDS : collects
  PLAYERS ||--o{ DECKS : builds
  DECKS ||--|{ DECK_SLOTS : contains
  PLAYERS ||--o{ WALLETS : holds
  PLAYERS ||--o{ ECONOMY_OPERATIONS : requests
  ECONOMY_OPERATIONS ||--o{ LEDGER_ENTRIES : posts
  ECONOMY_OPERATIONS ||--o{ REWARD_GRANTS : grants
  PLAYERS ||--o{ CHESTS : receives
  MATCHES ||--|{ MATCH_PARTICIPANTS : contains
  PLAYERS o|--o{ MATCH_PARTICIPANTS : plays
  MATCHES ||--o| BATTLE_REPLAYS : records
  MATCHES ||--o{ BATTLE_EVENTS : audits
  CONTENT_RELEASES ||--|{ CARDS : versions
  CONTENT_RELEASES ||--o{ ARENAS : defines
  CLANS ||--o{ CLAN_MEMBERS : includes
  PLAYERS ||--o| CLAN_MEMBERS : joins
  CLANS ||--o{ DONATION_REQUESTS : hosts
  SEASONS ||--o{ SEASON_SCORES : ranks
```

| Table | Key | Các cột chính | Constraint/index/invariant |
|---|---|---|---|
'''+ '\n'.join('| '+' | '.join(r)+' |' for r in tables)+'''

`player_progress.arena_id` cần composite FK với `content_release_id` tương ứng bảng arenas. Các FK viết tắt `player_id FK` đều trỏ players.id. `card_id` ownership là identity ổn định: khi viết migrations thêm `card_keys(id)` và cards tham chiếu card_keys để bảo đảm FK qua nhiều revision; không FK ownership vào duy nhất latest release. Roster/tier variants cần thiết kế sau U04/U09, không lưu NFT entitlement trong base copy count.

## Ranh giới lưu trữ

| Store | Dữ liệu | Mất dữ liệu / recovery |
|---|---|---|
| PostgreSQL | Accounts, collection, ledger, deck, results, clan, seasonal projections | Backup/PITR; nguồn đúng của progression |
| Match actor RAM | Units, projectiles, timers, private hands/RNG, dedup commands | Crash trước durable checkpoint => void, không dựng winner từ client |
| Redis (khi cần scale) | Queue ticket TTL, presence, room routing/lease | Rebuild; không giữ số dư/rewards duy nhất tại đây |
| Object storage | Versioned art/content, private replay/checkpoints | Hash, immutable keys, lifecycle, access policy |
| Client IndexedDB | Asset cache, UI preferences, local practice replay | Có thể xóa; không authoritative wallet/deck ownership |

## Atomicity và concurrency

Ví dụ upgrade: mở transaction → reserve economy operation bằng unique idempotency key → lock player_cards và wallet theo thứ tự key cố định → validate content revision/copies/gold/level cap → update copies+gold+level+XP → append ledger/receipt/outbox → commit. Cùng key+same request trả receipt cũ; key khác payload trả409. Không có đoạn debit ngoài transaction rồi mới grant.

Result settlement: room đóng terminal một lần → server ký/internal authenticated result kèm host_epoch → transaction validate room fencing+terminal result hash → ghi participants deltas → unique reward_grants theo matchId/playerId → update trophy, chest/counter/wallet → outbox → commit. Retry sau timeout đọc receipt. Worker cũ sau failover không được ghi kết quả khác bằng cùng matchId.

Donation khóa request, donor collection, recipient collection, wallets theo thứ tự ổn định. Request fulfilled không vượt requested; mất mạng trước response không tạo donation thứ hai. Season job dùng cursor/batch+unique season award; leaderboard eventual, wallet transactional.

Read Committed + explicit row locks đủ cho nhiều thao tác; dùng Serializable cho predicate invariants khó khóa, retry toàn transaction có giới hạn và jitter khi serialization failure. Không coi kiểm tra số dư trong application trước update là đủ. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Các giới hạn timed chest chỉ áp đúng chest class, không để Free Chest chiếm battle slot. Check ownership+row revision ở mọi mutation. Migration test: từ empty DB và snapshot version trước, concurrency50 requests một chest/upgrade, reversal, restore backup. Đây là test plan chưa chạy.
''')

rest=[
('GET','/v1/bootstrap','Public','clientVersion/platform/locale → minVersion, contentHash, assetManifest, enabledModes','ETag; không chứa loot seed/private keys'),
('POST','/v1/sessions/guest','Public rate limited','deviceNonce → accessToken, refresh cookie, playerId','Replay/abuse policy; không fingerprint xâm lấn'),
('POST','/v1/sessions/refresh','Refresh cookie','rotation → accessToken','Reuse refresh token cũ revoke family'),
('POST','/v1/sessions/link','Player','provider assertion → linked identities','Verify issuer/audience/nonce; không overwrite conflict'),
('DELETE','/v1/sessions/current','Player','→204','Revoke session; disconnect authenticated hub'),
('GET','/v1/me','Player','→ progress,wallets,entitlements,revision','Chỉ chính mình; ETag'),
('GET','/v1/catalog/{contentHash}','Public','→ immutable public card/rules view','Hidden server policies/seeds không đưa ra'),
('GET','/v1/me/cards','Player','cursor → collection,nextCursor','Stable pagination; effective level+expiry'),
('GET','/v1/me/decks','Player','→slots,selected,revision','Ownership filtered'),
('PUT','/v1/me/decks/{slot}','Player','cards[],expectedRevision → saved deck','If-Match; 409 conflict; validate7/14/duplicates'),
('POST','/v1/me/decks/{slot}/select','Player','expectedRevision → selected','Không sửa frozen deck trong active match'),
('POST','/v1/me/cards/{id}/upgrade','Player','expectedLevel,contentHash → receipt','Idempotency-Key; server lookup price;422 insufficient'),
('POST','/v1/matchmaking/tickets','Player','mode,deckId,regionHint,contentHash → ticketId','One active ticket/match; friendly invite conflict'),
('DELETE','/v1/matchmaking/tickets/{id}','Owner','→cancelled hoặc assigned','Race-safe; assigned không tự cancel cả match'),
('GET','/v1/matchmaking/tickets/{id}','Owner','→queueState,matchId,joinToken khi ready','Join token một match/player, short-lived'),
('GET','/v1/matches/{id}/result','Participant','→pending hoặc result+rewardReceipt','Không có POST client winner'),
('GET','/v1/matches/{id}/replay','Authorized','→signed URL,formatHash,visibility','Không expose live private hand/RNG'),
('GET','/v1/me/chests','Player','→slots,serverNow,unlockAt','Không dùng client clock mở thưởng'),
('POST','/v1/me/chests/{id}/unlock','Owner','→unlockAt','One active battle chest unlock'),
('POST','/v1/me/chests/{id}/claim','Owner','→rewardReceipt','Atomic claim; retry returns same loot'),
('GET','/v1/shop/offers','Player','→eligible offers+price revisions','Server eligibility, local price display'),
('POST','/v1/shop/purchases','Player','offerId,priceRevision → receipt/checkout','No client supplied amount/grant; idempotent'),
('POST','/v1/payments/{provider}/webhook','Signed provider','event → ack','Verify signature/time/provider unique ID'),
('POST','/v1/me/forge/actions','Player','cardId,action,expectedRevision → receipt','Config required; atomic crystals debit'),
('GET','/v1/leaderboards/{scope}','Player','season,cursor → ranks,watermark','Stable tie rule Proposed, not original claim'),
('POST','/v1/clans','Player','name,joinPolicy → clan','Documented level3/gold1000; current gate'),
('POST','/v1/clans/{id}/memberships','Player','join request → pending/joined','Open/invite/closed; capacity atomic'),
('POST','/v1/clans/{id}/donation-requests','Member','cardId → request','Limits pending config; no guessed quotas'),
('POST','/v1/donation-requests/{id}/donate','Clan member','amount → receipt','CAS and ownership/copy validation'),
('POST','/v1/clans/{id}/friendly-invites','Member','deckId → inviteId','Queue exclusion; CAS accept endpoint'),
('POST','/v1/friendly-invites/{id}/accept','Same clan','deckId → matchId','One acceptor; creator cannot self accept'),
('DELETE','/v1/friendly-invites/{id}','Creator','→cancelled','Reject if already accepted; idempotent'),
('GET','/v1/modes','Player','→active rotation/rules/rewards','U08 blocks unsupported modes'),
('POST','/v1/tournaments/{id}/entries','Player','deckId → entry receipt','Verified fee/rules required'),
('POST','/v1/privacy/deletion-requests','Player re-auth','→pending request','Original có delete+15s confirmation; web processing/retention policy Proposed')]

write('03-technical-design/api-contracts.md','''
# REST và realtime contracts — Proposed v0

Contracts dưới đây đủ định hướng codegen/validation; chưa phải service đã chạy hay toàn bộ OpenAPI. HTTPS/WSS bắt buộc production. PlayerId lấy từ session principal; body không được chọn owner/side. Client/protocol/content versions tách riêng. Unknown gameplay parameter không được hợp thức hóa bằng protocol defaults.

| Method | Route | Quyền | Request → response | Quy tắc |
|---|---|---|---|---|
'''+ '\n'.join('| '+' | '.join(r)+' |' for r in rest)+'''

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
''')

command_schema={
 '$schema':'https://json-schema.org/draft/2020-12/schema',
 '$id':'urn:castle-reimplementation:command:v0',
 'title':'Proposed client command envelope; not original protocol',
 'type':'object','additionalProperties':False,
 'required':['protocolVersion','matchId','commandId','clientSeq','observedTick','type','payload'],
 'properties':{
  'protocolVersion':{'const':1},'matchId':{'type':'string','format':'uuid'},'commandId':{'type':'string','format':'uuid'},
  'clientSeq':{'type':'integer','minimum':1,'maximum':9007199254740991},'observedTick':{'type':'integer','minimum':0,'maximum':9007199254740991},
  'type':{'enum':['PlayCard','BuyDraw']},'payload':{'type':'object'}},
 'allOf':[
 {'if':{'properties':{'type':{'const':'PlayCard'}}},'then':{'properties':{'payload':{'type':'object','additionalProperties':False,'required':['handInstanceId','lane','xFixed'],'properties':{'handInstanceId':{'type':'string','minLength':1,'maxLength':80},'lane':{'type':'integer','minimum':0,'maximum':2},'xFixed':{'type':'integer','minimum':-2147483648,'maximum':2147483647}}}}}},
 {'if':{'properties':{'type':{'const':'BuyDraw'}}},'then':{'properties':{'payload':{'type':'object','maxProperties':0}}}}
 ]}
dump('data/command.schema.json',command_schema)

write('03-technical-design/performance-plan.md','''
# Performance Engineering và benchmark B0

**Chưa có kết quả FPS, memory, bandwidth hay capacity của sản phẩm.** Mọi con số dưới đây là target Proposed. Kết quả build Crown-Clash không phải benchmark renderer/simulation. Chốt engine cần report đo, không dùng lời quảng cáo engine thay số liệu.

## Thiết bị và điều kiện

Desktop tham chiếu: Windows i5-class integrated GPU,16GB; macOS Apple Silicon/Safari. Mobile: Android mid-range6GB/Chrome, iPhone11-class/Safari và một thiết bị yếu hơn để kiểm chứng30FPS. Đây là mẫu test cần chuẩn bị, chưa thiết bị nào được chạy. Ghi model chính xác, SoC/RAM, OS, browser build, battery/power mode, nhiệt độ đầu/cuối, DPR, resolution và graphics profile vào kết quả. Desktop Chrome/Edge/Firefox/Safari, Android Chrome, iOS Safari là release matrix; engine hỗ trợ không thay việc test.

Với mỗi scene: cùng logical replay, cùng silhouettes/animation complexity/shadows/resolution; warm-up60s rồi capture180s,10 runs. Cold tải xóa cache nhưng không xóa account, warm tải đo riêng;30 phút thermal/20 trận soak. Network profiles RTT20/80/150/300ms, jitter0/30/80ms, loss0/1/5%, reconnect5/15/30s. Dùng emulated throttling bổ trợ, không thay mobile thật.

| Chỉ số | Target ban đầu | Cách đo / pass |
|---|---|---|
| Desktop/capable mobile |60FPS; frame p95≤16.7ms, p99≤33.3ms | RAF interval + main/GPU profiles; không chỉ average FPS |
| Mid mobile fallback |30FPS; p95≤33.3ms, p99≤50ms | Adaptive quality đạt trong5s, không đổi tick/luật |
| Input visual feedback |p95≤50ms từ pointer đến highlight/ghost | performance marks, không nhầm với server accept |
| Authoritative feedback |p95≤RTT+150ms với RTT≤150ms | Input send → authoritative receipt; tách server wait/network |
| Per-room simulation |p95≤5ms/step ở100 units |20Hz50ms step; room budget và aggregate worker CPU riêng |
| Server utilization |sustained CPU≤65%, p99 tick backlog<100ms | Capacity test cụ thể hardware; stop new rooms trước overload |
| Memory mobile |JS/WASM heap≤128MiB target, resident peak≤300MiB target | Browser counters/platform profiler; unavailable metric ghi N/A |
| GPU texture budget |≤96MiB mobile,≤256MiB desktop | Include mipmaps/uncompressed formats; size zip không đủ |
| Initial shell download |≤2MiB Brotli; interactive≤3s trên10Mbps/80ms | Cold cache; separate JS/CSS/font/assets |
| First battle total |≤12MiB compressed; ready≤12s trên10Mbps/80ms | WASM/art decoding included; offline core lazy cached |
| Network per player |downstream avg≤20KiB/s, p95≤40KiB/s; upstream≤2KiB/s | Payload+framing measured, full resync riêng |
| Leak |Sau20 matches post-GC steady heap tăng<5% và<10MiB | Chỉ dùng thiết bị/tool cho phép GC kiểm chứng; nếu không có đo trend+retained objects |
| GC/jank |Không frame>100ms do recurring allocation sau warm-up | Allocation trace; classify asset load riêng |

Mục tiêu12MiB ở10Mbps đã cần khoảng10s transmission trước decode, nên ready12s khá chặt; nếu không đạt phải sửa tải theo deck/lazy WASM hoặc sửa ADR có report, không đánh dấu pass giả. Không có yêu cầu GPU resident memory nào mà browser không đo được được tự điền0.

## Benchmark scenarios

| ID | Fixture | Phát hiện cần tìm |
|---|---|---|
| B01 |0 units, UI+arena idle | Base renderer/UI cost, idle loops |
| B02 |10 animated units,2 materials | Rig/bone update base |
| B03 |30 units,3 lanes,melee+ranged | Typical combat CPU/GPU balance |
| B04 |60 units,projectiles/statuses | Pool/target search stress |
| B05 |100 units all attacking | Stress; không gọi số100 là cap game gốc |
| B06 |Simultaneous AOE+summon+death | Burst allocation, cleanup, event latency |
| B07 |10 distinct skeletons/skins | Instancing limits, texture switches |
| B08 |Mobile rotate/background60s/resume | Resize/context loss/network recovery |
| B09 |Cold/warm first battle + slow CDN | Critical path, decoder cache, retry |
| B10 |20 consecutive matches | Listener/material/texture/worker leaks |
| B11 |100/250/500 concurrent matches stair-step | Capacity and tick backlog, serialization contention |
| B12 |Packet loss/reorder/reconnect | Snapshot resync/reliable input, bandwidth |

B11 chỉ là load levels để tìm điểm gãy, không cam kết500 matches/host. Scripts phải mô phỏng play commands và entity load thực, không500 socket idle. Ghi match/minute, active matches,entities/room và tick cost histogram. Loadtest service/account giả, không gửi load vào server Castle Crush.

## Tối ưu theo bottleneck

Pool units/projectiles/VFX nhưng ID gameplay không reuse. SoA/sorted lane buffers cho hot path sau profile; tránh LINQ/closures/JSON per-entity per-tick. Spatial index theo lane và swept range, không O(n²) scan toàn scene khi n lớn. Batch static meshes/material atlas; independently animated skeleton cần shared rigs/GPU animation hoặc LOD riêng, không giả định InstancedMesh giải quyết mọi skinning.

Render culling/LOD chỉ giảm vẽ, không xóa unit trong sim. Particle budget theo screen coverage; pool và giảm emitters trên mobile. Bake lighting/static shadows, blob shadows fallback. Adaptive order: shadows → particles → postprocessing → DPR1.5→1.0→0.75 → render30; hysteresis2–5s để không nhấp nháy. Không bỏ feedback quan trọng như lane/target/hit.

Preload models của hai deck và summon graph qua server-safe asset manifest (cân nhắc leak deck: preload superset arena nếu deck hidden); compressed textures, lazy meta screens, CDN immutable. Asset fetch/decoder bounded concurrency tránh mobile memory peak. Dispose scenes/material refs/listeners/RAF/worker on match exit. Browser visibility change không pause online sim. Catch-up cần full snapshot, không replay60s animation nhanh.

Ghi kết quả theo `benchmark_id,commit,coreVersion,contentHash,renderer,device,OS,browser,quality,unitCount,run,frameP50/P95/P99,cpuMs,gpuMs,heapMiB,residentMiB,bytesUp/Down,coldReadyMs,notes`. Giá trị chưa đo=`null`. CI replay correctness mỗi PR; nightly performance trên máy cố định; fail regression>10% so accepted baseline trong3 runs liên tiếp, điều tra noise trước rollback. Không so sample từ thiết bị khác.

Mô hình chi phí: với M match đồng thời,2 clients/match, downstream bKiB/s, egress≈M×2×b×86400/1048576 GiB/ngày khi tải giữ24h. Ví dụ planning M=100,b=10 ⇒164.8GiB/ngày; không phải forecast traffic thực. Peak capacity = min(CPU,memory,network) đo × headroom; giá hosting/CDN phải lấy quote tại thời điểm deploy, chưa có chi phí tháng được xác nhận.
''')

if __name__=='__main__':print('Database, API and performance design generated')
