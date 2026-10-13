from build_combat_ui import *

repo_notes={
'BOSS-BigOpenSourceSibling/realtimecardgame':([4,2,2,1,0,0],'Unity2019.4/C#','Không có license repo rõ; asset vendors riêng','GameRoom local, dummy deck, deploy, projectile, multi-deploy, animation; sau chơi rút bù ngay khác documented CC','Chưa chạy Unity; cần editor2019.4.9f1. Không tìm thấy network trong files đã review. Fork của pedrodelyra; không phải hai foundation độc lập.'),
'pedrodelyra/realtimecardgame':([4,1,2,1,0,0],'Unity2019.4/C#','Không có license repo rõ','Core lane/dealer/hand/attack/visual scripts; scaffold local','19 commits default branch; chưa chạy Unity; thiếu production account/PvP/economy. Tham khảo cấu trúc, không copy.'),
'ciro-unity/UnityRoyale-Public':([2,2,3,2,0,0],'Unity2020.3/URP/C#','Assets/License.pdf: personal/non-commercial, non-distribution','CardData, CPUOpponent, projectile, particle pool, Addressables, toon shading, Timeline','README nói simplified AI và demo mobile; không có bằng chứng PvP server. License hạn chế xung đột lời quảng bá; không foundation thương mại.'),
'baderkamal-dev/Crown-Clash':([2,3,3,5,0,5],'JavaScript/Canvas2D','MIT (đã đọc LICENSE)','Procedural art/audio, fixed-step loop, AI, cards/combat/UI; không online','Đã build46 modules/2365KiB và node --check bundle pass; chưa chơi browser. Ba tower/elixir và rules Clash Royale khác game đích; lấy pattern có attribution, không giữ tên/nhận diện.'),
'ironiamison/clash-arena':([2,3,2,5,1,0],'TypeScript/Phaser/Vite/Node ws','Không có root license; vài asset pack CC0 không cấp phép code','Pure sim, modes, collection/economy, relay tick/input, result từ client','Đọc server/index.mjs: relay không tính battle combat; không đạt server authority. Chưa install/run, asset bundle lớn và root rights chưa rõ.'),
'ataberkus/age-of-war-clone':([1,3,3,5,1,0],'React/TS/Canvas/Supabase','Không có root license','HostSync áp input, gửi state0.125s; guest vẽ shadow; unit queue, AI, ages','Có multiplayer code nhưng host là client, không trusted server; một lane, không card deck. Chưa chạy cần Supabase configuration.'),
'BizachiCode/ClashBattle-Server':([2,4,3,4,4,5],'Node/TS/Colyseus/Express/TypeORM/MySQL','MIT (đã đọc LICENSE)','BattleRoom setSimulationInterval → session.step; authoritative combat, room validation hooks, result settlement; nhiều meta systems','Một commit nên chưa chứng minh maintenance history. Source review có authority, chưa runtime/load/security audit; data export và Unity client ngoài scope repo. Thích hợp tham khảo protocol/modules, không dùng nguyên ruleset.')}
repos=[]
for r,(scores,stack,lic,systems,note) in repo_notes.items():
    d=json.loads((ROOT/'.research'/ (r.replace('/','__')+'.json')).read_text())
    score=round(sum(a*b for a,b in zip(scores,[.30,.20,.15,.15,.10,.10]))*20,1)
    repos.append(dict(repo=r,url='https://github.com/'+r,head=d['head'],stars=d['meta']['stargazers_count'],commits_default_branch=d['commit_count'],pushed_at=d['meta']['pushed_at'],updated_at=d['meta']['updated_at'],archived=d['meta']['archived'],stack=stack,license_assessment=lic,systems=systems,notes=note,scores=scores,weighted_score=score))
    source('REPO-'+r.split('/')[0],r,'https://github.com/'+r+'/tree/'+d['head'],'primary-code','Source review tại commit pin; không phải chứng cứ luật Castle Crush')
dump('data/github-repositories.json',repos)
write('03-technical-design/github-research.md','''
# GitHub research và xếp hạng

Ngày đọc13/10/2026. API metadata, recursive tree, README, license và các file core được kiểm tra tại SHA dưới đây. Stars/last update là snapshot biến động. `commits` là số reachable commits của default branch theo pagination API, không phải toàn bộ branches. `pushed_at` khác `updated_at` (có thể chỉ do star/metadata).

Điểm0–5 theo thứ tự **similarity/completeness/maintainability/web/multiplayer/license**, trọng số30/20/15/15/10/10%. Điểm là nhận định từ mức kiểm tra, không phải benchmark. License là **hard gate**: điểm tổng cao không cho phép copy repo thiếu quyền. Chưa repo nào đủ foundation nguyên khối.

| Hạng | Repo | Thành phần điểm | Tổng/100 | Stars | Commits | Last push | Stack |
|---|---|---|---|---|---|---|---|
'''+ '\n'.join(f"| {i} | [{r['repo']}]({r['url']}) | {'/'.join(map(str,r['scores']))} | {r['weighted_score']} | {r['stars']} | {r['commits_default_branch']} | {r['pushed_at'][:10]} | {r['stack']} |" for i,r in enumerate(sorted(repos,key=lambda r:-r['weighted_score']),1))+ '\n\n'+ '\n\n'.join(f"## {r['repo']}\n\nCommit [`{r['head'][:12]}`]({r['url']}/tree/{r['head']}); archived={r['archived']}; metadata updated={r['updated_at']}.\n\n**Đã có:** {r['systems']}.\n\n**License:** {r['license_assessment']}.\n\n**Khả năng chạy/thiếu/khuyến nghị:** {r['notes']}" for r in repos)+'''

## Mở rộng tìm kiếm và loại nhiễu

Đã tìm nhóm Castle Crush clone/source, realtime card game, three-lane/card PvP, lane-based strategy, Clash Royale clone, Phaser card battle, Three.js multiplayer strategy và Babylon lane battler. Đã xem GitHub Topics card-game, GitHub search API và parent fork của realtimecardgame. Không khẳng định tìm hết GitHub.

- [Raffiesaurus/bubble-brawl](https://github.com/Raffiesaurus/bubble-brawl): README mô tả Unity, ba lane, MIT, game jam48h. Tham khảo mô hình lane; chưa code audit nên không chấm ngang bảy repo chính.
- [colyseus/colyseus](https://github.com/colyseus/colyseus): framework multiplayer, không game tương đương; ứng viên stack TypeScript nếu C# offline spike không đạt.
- [gururise/CastleCrush](https://github.com/gururise/CastleCrush): Rampart/Godot, tên trùng, loại vì sai game.
- Deckborn turn-based/Pygame, SoulRealms Java terminal, Babylon runner và tower-defense khác không chứng minh CC mechanics.

Decision: viết core theo đặc tả riêng. Có thể tái sử dụng có chọn lọc MIT patterns từ Crown-Clash và ClashBattle-Server sau tests/license attribution; không import cả progression/card names/assets của game khác. UnityRoyale chỉ đọc ý tưởng; PDF license phải được làm rõ bằng văn bản trước mọi distribution. Build thử Crown không chứng minh chơi hoàn chỉnh hay performance mobile; engine benchmark của dự án vẫn chưa thực hiện.
''')

write('03-technical-design/tech-stack-evaluation.md','''
# Lựa chọn công nghệ — ADR-001 (provisional)

## Kết luận có điều kiện

Ưu tiên **React+TypeScript UI, Babylon.js renderer camera cố định, ASP.NET Core/C# authoritative simulation, SignalR/WebSocket, PostgreSQL**. Chưa chốt engine production: cần benchmark B0 cùng art/replay trên Babylon, Three và Phaser atlas. Redis chưa cần cho single match host. C# offline WASM phải qua spike về load/runtime; nếu thất bại, xem ADR-002: TypeScript simulation dùng chung browser worker/Node+Colyseus, thay vì maintain hai combat engines.

| Công nghệ | Giá trị | Chi phí/bảo trì cho1 developer | Load/performance | Quyết định |
|---|---|---|---|---|
| React+TS | Forms/lobby/accessibility, typed contracts | Ecosystem tốt; tránh entity per React state | Không render mỗi unit bằng React | Chọn UI ngoài sim |
| Three.js | Scene renderer linh hoạt, glTF/instancing | Tự ghép animation/VFX/debug/game services | Có thể tree-shake, cần đo thực | Đối chứng3D |
| Babylon.js | Game-oriented scene, animation, inspector, particles | Ít glue hơn là inference của thiết kế | Thin instances có trade-off static/dynamic, skinning phải đo | Ưu tiên slice2.5D |
| Phaser | Sprite/atlas/input/scene workflow | Nhanh nếu pipeline baked; đổi camera/skin đắt art | Batching lợi khi atlas tốt, texture memory dễ lớn | Fallback2D đối chứng |
| PlayCanvas | Web graphics/runtime + editor workflow | Engine MIT; editor/cloud terms tách riêng | glTF/streaming có sẵn; chưa benchmark | Hợp lệ, chưa có lợi thế đo đủ đổi lựa chọn |
| Unity Web | Editor/animation workflow, C# ecosystem | Export/upgrade, bridge React, payload và asset rights | Mobile đã được hỗ trợ trong tài liệu mới; không loại vì quan niệm cũ | Không ưu tiên repo Unity cũ; đo nếu art pipeline chọn Unity |
| ASP.NET Core | Auth/REST/jobs/typed domain, pure C# core | Hợp ưu tiên người dùng; offline bridge phức tạp | Actor room, không allocation per entity/tick | Chọn backend provisional |
| SignalR | MessagePack/JSON, connection lifecycle | Không tự cung cấp authoritative sim hay replay | Đo serialization/traffic, configure limits | Chọn transport adapter |
| Raw WebSocket | Nhẹ, tự kiểm soát protocol | Phải tự retry/auth/backpressure/versioning | Không tự nhanh hơn nếu payload xấu | Chỉ đổi sau profile |
| PostgreSQL | Ledger/transaction/index/outbox | Một DB giai đoạn đầu dễ vận hành | Không ghi unit movement mỗi tick | Chọn persistence |
| Redis | Ephemeral queue/presence/routing khi scale | Thêm service, phải xử failover | Không source of truth wallet | Trì hoãn đến nhiều worker |

## Bằng chứng năng lực, không phải kết quả benchmark

[Three InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) giảm draw calls cho mesh/material chung; không có nghĩa animation độc lập skinning tự động được batch.
[Babylon thin instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances/) bỏ object instance JS nhưng add/remove và culling có trade-off; dùng pool/matrix buffer sau đo. [Skeletons](https://doc.babylonjs.com/features/featuresDeepDive/mesh/bonesSkeletons) cho thấy bone processing vẫn có chi phí.
[Phaser](https://docs.phaser.io/) có WebGL/Canvas; phải pin major khi chọn vì renderer/API phiên bản khác nhau. [Unity web](https://docs.unity.com/en-us/engine/6000.6/manual/platform-specific/webgl/intro/browsercompatibility) hiện liệt kê Safari iOS và Chrome Android, nên cần thử trên thiết bị thay vì khẳng định “không hỗ trợ mobile”. [PlayCanvas engine](https://github.com/playcanvas/engine) xác nhận WebGL2/WebGPU và glTF.

## Gate B0, tiêu chí lựa chọn

5 ngày engineering spike sau research triage: 3 renderer cùng battlefield, 4 archetype asset **được cấp quyền**, 0/10/30/60/100 unit và replay timing tương đồng. Đo10 lần, warm-up60s, capture180s, cold load riêng. Score gồm visual readability30%, p95frame30%, payload15%, art workflow15%, maintenance10%. Không dùng sphere-only benchmark để kết luận skeleton performance.

Babylon được giữ nếu đạt mobile30FPS budget và không hơn Three >20% frame p95 ở cùng chất lượng; nếu Three nhẹ hơn rõ và glue effort nhỏ, đổi Three. Nếu cả hai vượt memory/frame budget mobile, dùng baked atlas/Phaser hoặc giảm art load rồi đo lại. Không đổi simulation/luật để “đạt FPS”. Mọi số threshold là acceptance Proposed, không claim measured.
''')

write('03-technical-design/system-architecture.md','''
# System Architecture

Modular monolith + authoritative match rooms cho giai đoạn đầu. Không cần microservices theo từng tính năng. Có16 module: Identity, PlayerProgress, ContentCatalog, Collection, Decks, Matchmaking, BattleSimulation, RealtimeGateway, AI, ResultsRewards, WalletShopChests, ForgeSeasons, ClansChatDonations, ModesTournaments, ReplayTelemetry, WebPresentation. Ascension adapter nằm trong Content/Wallet với gate riêng, không triển khai chain chỉ vì tài liệu lịch sử.

```mermaid
flowchart LR
  Browser[React UI + renderer] --> CDN[CDN / immutable assets]
  Browser --> API[ASP.NET REST]
  Browser <-->|SignalR WSS| GW[Realtime Gateway]
  GW --> Rooms[Match room actors]
  Rooms --> Sim[Pure C# simulation]
  Rooms --> AI[Bot via commands]
  API --> PG[(PostgreSQL)]
  Rooms --> Outbox[Durable results / outbox]
  Outbox --> PG
  Rooms --> Replay[Replay object storage]
  API -. phase scale .-> Redis[(Redis tickets / routing)]
  Browser -. offline optional .-> WASM[Same core WASM worker]
```

Server owns all battle truth; client owns presentation. Content hash gắn assets, ruleset, protocol, replay binary. Không đưa model transforms vào database combat. Match actor single writer nhận commands từ bounded mailbox; gateway chỉ authenticate/route/serialize, không giữ business state trong Hub instance.

API process và match process có thể cùng deployment ban đầu nhưng module riêng để sau tách worker. Một match được một worker sở hữu bằng lease+fencing epoch. Result có unique matchId; duplicate worker không settle được hai lần. Redis mất không làm wallet mất; worker vẫn chạy trận hiện có.

Boundary source: mô hình này do thiết kế đề xuất; không có bằng chứng Wildlife dùng stack/tick-rate/DB này.
''')

write('03-technical-design/frontend-architecture.md','''
# Frontend Architecture

```text
web/src/
  app/            routes, providers, error boundary
  features/       lobby, decks, collection, shop, clan, progression
  battle/         input adapter, interpolation buffer, audio, HUD bridge
  renderer/       engine adapter, asset cache, animation/VFX views
  network/        protocol codecs, reconnect, receipt cache
  offline/        WASM worker adapter (conditional gate)
contracts/        generated JSON/TS contracts from schema
```

`BattleRenderer.mount(canvas, manifest)`, `applySnapshot(snapshot)`, `applyEvents(events)`, `resize(viewport)`, `dispose()`. Renderer không gọi reward API và không trừ mana. UI subscribe derived HUD tối đa10Hz trừ input immediate; entity transforms mutable render arrays, không React render60Hz.

NetworkState gồm serverTick, baselineId, ownPrivateState, publicState, ackedInputSeq, contentHash. Interpolation ring buffer tách previous/current snapshots, entity generation tránh lerp unit cũ qua unit mới. Spawn/death dùng eventId dedup; snapshot loss có resync.

React effects mount engine/socket subscriptions với cleanup, StrictMode không tạo hai loop. [React effect lifecycle](https://react.dev/learn/synchronizing-with-effects). Khi rời battle: release pointer capture, cancel RAF, dispose scene/material/texture theo refcount, stop audio nodes, unsubscribe network, terminate worker nếu không tái dùng.

IndexedDB chỉ lưu setting, manifest cache, downloaded practice/replay assets. Account currency/deck official đến từ API; cache local có server revision không có quyền settle. Asset URLs content-addressed, lazy-load extras; ServiceWorker không cache POST/auth/results và không thay phiên bản giữa match. Renderer fallback: context lost hiện reconnect overlay, recreate GPU resources từ snapshot, không restart server match.
''')

write('03-technical-design/game-rendering.md','''
# Rendering Contract

Proposed2.5D: sân3 lane ở mặt phẳng world XZ, unit di chuyển scalar X theo lane, height Y chỉ visual; fixed camera target. Mirror orientation hiển thị cho playerB bằng projection, không sửa authoritative coordinate. HUD nằm DOM overlay.

Camera thông số `projection, position, target, orthographicExtent/FOV` là art config lab; chưa đo gốc. Raycast plane → canonical lane/x; server validate. Freeze input mapping lúc pointerdown hoặc cancel khi resize để không deploy sai lane. Depth sort transparent particles; billboards health bar theo camera; silhouettes không bị thành che điểm đặt quân. Selection ghost dùng màu/outline riêng.

Animation semantic clips: idle/move/attack/spawn/hit/death, optional cast/stun/transform. Đây là yêu cầu asset mới; chưa xác minh full clip list gốc. `attackStartTick, impactTick, clipDuration` điều khiển playback; visual có thể blend nhanh/chậm nhưng không gửi damage ngược server. Không dựa animation event của GPU làm combat clock.

Instancing: props, shadows, projectile primitives trước; animated units đo skeleton instances so với baked vertex animation texture. Không giả định InstancedMesh tự chia sẻ pose nhưng vẫn giữ pose độc lập. Pool views/effects, cache assets theo archetype, texture atlas cho HUD/VFX. Frustum culling ít lợi nếu toàn sân luôn nhìn thấy; tối ưu draw calls/overdraw/skinning trước.

Quality tiers Proposed: Low không realtime shadows/postprocess, DPRcap1; Medium blob/baked shadows,DPR1.5; High light shadow map có budget,DPR2. Tự hạ sau p95frame vượt target trong5s, hồi phục chậm sau20s để tránh oscillation. Không giảm simulation tick-rate hay hitboxes theo tier.
''')

write('03-technical-design/simulation-engine.md','''
# Simulation Engine

Pure C# library `Battle.Core` không phụ thuộc ASP.NET, engine graphics, wall clock hoặc filesystem. Fixed step đề xuất20Hz (50ms); snapshot10Hz. 20Hz là khởi điểm, có thể tăng30Hz nếu timing quan sát cần độ phân giải cao hơn; đổi tick rate phải đổi ruleset/replay version. Damage timing quantization test sai số≤1tick; muốn parity nghiêm hơn cần temporal resolution phù hợp evidence.

State: tick, contentHash, players[2], lanes[3], castles[2], entities, projectiles, statuses, scheduledEvents, private RNG state từng bên, terminal status. Fixed-point integer positions với scale1000 Proposed; damage/hp integer hoặc fixed-point rõ rounding. RNG algorithm/version cụ thể trong ruleset, ví dụ PCG32 với seed/stream stored; không dùng System.Random thay đổi runtime hay Math.random. Gameplay RNG độc lập cosmetic RNG.

```text
serverLoop(monotonicClock):
  accumulator += elapsedMonotonic
  while accumulator >= step and workBudget remains:
    accepted = mailbox.drainFor(nextTick) ordered by serverReceiptSequence
    state, events = core.step(state, accepted, ruleset)
    journal(accepted, state.tick, state.hash)
    if snapshotDue: publish filtered snapshots
    accumulator -= step
  if backlog too large: shed NEW matches and alert
  # Không bỏ simulation ticks để catch-up bằng teleport.

renderLoop(rafTime):
  renderTick = estimatedServerTick - interpolationDelay
  older,newer = buffer.bracket(renderTick)
  draw(lerp(older,newer,alpha), eventDrivenAnimations)

schedule(event):
  assert event.tick >= currentTick
  queue.insert(event.tick, event.phase, event.sourceId, event.seq)
```

Simulation time là ticks; render time là RAF; network time là estimatesRTT/clock offset; animation time là visual timeline được neo eventTick. Client lag không dừng simulation. Với nhiều room, mỗi actor có accumulator; round-robin bounded work tránh room đông làm starvation.

## Offline practice

Ưu tiên cùng C# core compile browser WASM runtime, nạp lazy trong Worker và chạy bot bằng command API; chưa có benchmark toolchain/load nên **gate A-WASM**. Cross-runtime deterministic test C# server vs WASM cùng config/seed/commands; integer64 không đi qua JS number nếu vượt53bits (serialize string/bytes).

Nếu bundle/startup vượt budget hoặc interoperability >10 ngày effort: ADR chuyển Battle.Core sang TS+Node/Colyseus dùng chung worker, hoặc hoãn offline với status rõ. Không gọi local client preview là “offline practice” nếu vẫn cần server. Không duy trì một engine C# và bản port TS độc lập khi chỉ có1 developer.

Replay gồm seed streams, initial frozen decks/levels, accepted commands+executionTick, rulesetHash, coreVersion, periodic state hashes/checkpoints. Event recording hỗ trợ visual playback fallback; event log đơn thuần không đủ regenerate hidden RNG state. Hidden deck chỉ được tiết lộ theo replay visibility policy sau trận.
''')

write('03-technical-design/multiplayer-architecture.md','''
# Server-authoritative Networking

Tất cả thông số dưới đây Proposed. Match tick20Hz, broadcast10Hz, render60/30Hz. Input command không chứa HP, damage, mana hoặc winner. Gateway xác thực participant và fencing epoch; actor validate toàn bộ ở execution tick.

```mermaid
sequenceDiagram
  participant A as Player A
  participant API as Match API
  participant Q as Queue allocator
  participant S as Match actor
  participant B as Player B
  participant DB as PostgreSQL
  A->>API: Create ticket + deckRevision
  B->>API: Create ticket + deckRevision
  API->>Q: validated frozen deck tickets
  Q->>DB: atomically claim pair / create match
  Q->>S: allocate ruleset + private seeds
  S-->>A: participant token / content manifest
  S-->>B: participant token / content manifest
  A->>S: Ready
  B->>S: Ready
  S-->>A: Start + private filtered snapshot
  S-->>B: Start + private filtered snapshot
  loop simulation
    A->>S: PlayCard(commandId, seq, handInstanceId, lane, x)
    S->>S: validate, execute tick, combat
    S-->>A: receipt + own snapshot
    S-->>B: public events + own snapshot
  end
  A->>S: Resume(matchId,lastAck)
  S-->>A: full snapshot + command receipts
  S->>DB: terminal result + reward transaction + outbox
  DB-->>S: committed resultReceipt
  S-->>A: Result
  S-->>B: Result
```

## Ordering, prediction, reconciliation

Server receipt sequence đóng dấu sau auth, chấp nhận một commandId một lần. Command requestedTick chỉ diagnostic; không để client backdate damage. Không lag compensation kiểu rewind shooter vì deploy-time strategy; cho UI ghost tức thời, authoritative spawn chờ ack. Reject vì thiếu mana thì rollback ghost, không HP prediction.

Snapshots public: entities, HP, effects, castle, tick, eventSeq; own-private: own hand/current mana/receipts. Không gửi opponent hand/deck shuffle/seed. Public mana nếu chưa xác minh original có hiển thị thì chỉ internal server; UI web có thể giữ private. Delta kèm baselineId; thiếu baseline phải full resync. Full snapshot định kỳ2s hoặc reconnect Proposed. Interpolation100–150ms adaptive; extrapolate tối đa100ms cho movement, không predicted damage.

Transport WebSocket ordered/reliable vẫn có head-of-line blocking. Bounded send queue, coalesce snapshot cũ; không drop reliable receipts/result. MessagePack có lợi payload phải đo; JSON dễ debug. [SignalR configuration](https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration?view=aspnetcore-10.0) hỗ trợ cả hai nhưng stateful reconnect không thay được application match recovery.

## Reconnect và anti-cheat

Heartbeat5s, dead transport15s, gameplay grace30s là config Proposed tách khỏi default SignalR. Token refresh/reconnect rebind player; chỉ một active controlling socket mỗi account. Client seq/session epoch ngăn lệnh cũ của socket bị thay. Reconnect snapshot áp trước events mới; dedup effect theo eventId.

Giới hạn đề xuất ingress commands10/s burst20, payload2KiB/play, bounds kiểm tra trước deserialize deep objects. Rule-based exploit tests: stale hand, forged owner, NaN/infinity/x ngoài lane, replay command, spam paid draw, unknown ability, mismatched content hash. Không tin client checksum làm proof fairness; server hash dùng replay/internal diagnostics.

Server crash: PhaseD void active match nếu chưa terminal durable, không đổi trophy, không cấp win chest; CSPRNG seed không thể reconstruct? báo VOID. Production cần checkpoint/log durable nếu muốn recover; không hứa seamless recovery khi chỉ in-memory. Sau terminal commit mất result packet: GET result trả cùng receipt.
''')

write('03-technical-design/backend-architecture.md','''
# Backend Architecture

ASP.NET Core API application services gọi domain modules và repositories. Match actor dùng pure simulation, không query DB mỗi tick. `IContentCatalog` immutable cache, `IMatchScheduler`, `IResultSettlement`, `IWalletLedger`, `IReplayStore`, `IIdentityProvider` tách adapter.

Identity: guest session → link email/OIDC provider của sản phẩm mới; không sao chép OAuth app identity Wildlife. Account-link conflict cần proof sở hữu cả hai và explicit merge rule; không tự chọn profile trophy cao. Session cookie HttpOnly/Secure/SameSite, CSRF cho REST mutations, origin allowlist WSS; token join match TTL ngắn. Password nếu có dùng thư viện identity standard; không tự crypto.

Transactions ngắn: wallet row lock theo player/currency; idempotency unique; order khóa nhất quán playerId để tránh deadlock donation; retries bounded. PostgreSQL isolation không tự giải business idempotency; unique grant key là bắt buộc. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Background jobs: outbox dispatch, season settlement, chest availability derived từ timestamps, expired boosts/offers, session cleanup, replay retention. Không tạo timer hệ điều hành cho mỗi chest. Jobs có lease và unique checkpoint; restart an toàn.

Social: clan permissions leader/member, chat length/rate limits, report/mute, retention; donation transfer+gold/XP atomically theo rule config, không cho donor double donate vượt copies. Friendly invitation accept CAS để chỉ hai participants.

Operations: health/liveness tách readiness, version/contentHash trong diagnostics, structured correlation matchId/commandId, không log access token/payment details. Admin content publish có role và audit; imported catalog Unknown không được activate cho ranked. No auto DB schema synchronize production; migrations versioned, backup trước destructive changes.
''')

write('03-technical-design/asset-pipeline.md','''
# Asset Pipeline và quyền sử dụng

## GLB

Blender source được tự tạo/đặt mua có license → retopo/UV/rig → semantic animation clips → export glTF2/GLB → validate hierarchy/scale/bounds → reduce mesh/texture → KTX2/Basis textures và meshopt/Draco nếu benchmark decoder có lợi → hashed manifest → CDN. Preserve authoring source và license ledger (creator, invoice/licenseURL, commercial/export rights, attribution).

Proposed budget mỗi archetype mobile:1–3k triangles LODlow, 20–40 bones,1 material/atlas nếu feasible; hero cần hơn phải bù budget toàn scene. Đây là mục tiêu art, chưa measured. Không mirror negative-scale skeleton tùy tiện; test normals/winding, weapons và hit VFX anchor. Root motion xuất tại chỗ; movement authoritative.

## Sprite alternative

Cùng Blender scene/rig → render camera cố định, 2 facing chính (thêm direction nếu mechanics cần) × idle/walk/attack/spawn/death → trim/pad atlas → metadata pivot/clipFPS/frameCount → texture compression → Phaser renderer. Attack semantic hit marker tách frame index. Outline baked phải không gây alpha halo. Ước memory uncompressed RGBA = width×height×4×mipFactor; atlas2048²≈16MiB trước mips, nhiều skins nhanh vượt budget. Không chỉ nhìn PNG download size.

Audio tự sáng tác hoặc CC0/được cấp quyền; mixer theo category, concurrency limits, không copy voice lines gốc. UI symbols/portraits/logo/names mới khi public release; catalog original giữ ở docs research.

QA: import pose/scale, walk no skating ở nhiều renderFPS, attack alignment, death freeze, occlusion3lane, dark/light arena, reduced motion, team readability. `assetKey` không cần bằng cardId vì nhiều cards có thể share rig với thiết kế mới. Không tải full roster trước battle; preload deck archetypes và summon descendants, tránh spawn hitch.
''')

if __name__=='__main__':print('Technical documents generated')
