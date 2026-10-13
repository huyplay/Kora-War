# Backlog có thứ tự và Definition of Done

Thực thi từ trên xuống khi dependency đạt; thứ tự giữa các task độc lập cùng phase có thể đổi theo bottleneck. Uxx là research gate, không task implementation. Mọi task **Not started**; viết tài liệu không hoàn thành task code. Effort phân bổ theo milestone, tránh cộng effort của một task nhiều phase.

| ID | Priority | Phase | Depends on | Task | Trace | Done when |
|---|---|---|---|---|---|---|
| R01 | P0 | R | none | Ghi app build/account/OS/locale và thử live PvP | U01 | Evidence manifest;3 trận complete hoặc lý do inaccessible |
| R02 | P0 | R | R01 | Đo draw/crystal/mana và cursor overflow | U02 | 10 captures; resolve 7/8/7–10s,45s vs5draw; dữ liệu sai số |
| R03 | P0 | R | R01 | Đo deployment frontier và lane geometry | U03 | 20 vị trí/lane; valid/invalid bounds, push/retreat |
| R04 | P0 | R | R01 | Thu roster/detail và normalize aliases | U04 | 66 candidates đối chiếu68 lịch sử; mọi tên có evidence |
| R05 | P0 | R | R04 | Chốt stats8–12 thẻ cho playable slice | U04 | Required fields đủ; source version/level/units, no default unknown |
| R06 | P0 | R | R03,R05 | Đo target/collision/hit/projectile | U05 | Equal-range/target death traces và temporal error |
| R07 | P0 | R | R01 | Đo overtime/simultaneous lethal | U06 | Curve+cadence+winner precedence hoặc block verified profile |
| R08 | P0 | R | R01 | Đo disconnect/rejoin/loading fail | U11 | Hai controlled clients,5/15/30/60s interruptions |
| R09 | P1 | R | R01 | Thu meta/modes/NFT current availability | U07,U08,U09 | Existence lịch sử/live tách; announcement link; không giao dịch NFT |
| R10 | P0 | R | R01 | Camera/animation/mobile interaction captures | U10 | Timestamps và layout metrics3arenas,10abilities |
| A01 | P0 | A | R02,R03,R05,R06 | Scaffold frontend/core/backend/test projects | Architecture | CI build, lint, contract version; chưa mock luật unknown làm thật |
| A02 | P0 | A | A01 | C# WASM deterministic/load spike | A-WASM | Server/WASM hashes equal, payload/time measured hoặc TS ADR |
| A03 | P0 | A | R10,A01 | Ba renderer benchmark với art hợp pháp | U12,U14 | Report B0; choose engine bằng số liệu |
| A04 | P0 | A | A03 | Battle shell/loading/error/resize | S01,S06 | Mobile safe area, DPR,30/60 profile,context restore |
| A05 | P0 | A | A04,R03 | Touch drag/drop/cancel + accessibility controls | S06 | Invalid zone/low mana clear;pointercancel no play |
| A06 | P0 | A | R05,A01 | Content schema/validator/versioned manifest | F035 | Unknown stats reject parity publication; lab namespace separate |
| B01 | P0 | B | A02,A06 | Fixed-step state/RNG/event queue | C01–C20 | Replay deterministic across runtimes, integer overflow tests |
| B02 | P0 | B | B01,R02 | Deck/hand/shuffle/mana reducer | F022–F036 | Documented tests T06–T19/T28–T31 mapped |
| B03 | P0 | B | B01,R03 | Lane spawn/movement/target/collision | C01–C04 | Swept range and mirrored lane tests; measured target policy |
| B04 | P0 | B | B03,R06 | Melee/ranged/projectile/HP/death | C05–C10 | Attack semantic ticks; no damage animation side effects |
| B05 | P0 | B | B04,R05 | Spell/status/heal/summon/copy slice | C11–C19 | Validated ability parameters; overlapping effects fixtures |
| B06 | P0 | B | B05,R07 | Castle/OT/result state machine | F001–F021 | Shared HP,terminal once,simultaneous lethal verified or blocked |
| B07 | P0 | B | B02,B06,A05 | Connect renderer/HUD/audio to core | S06 | 30/60/120 renderFPS same simhash; private view schema |
| B08 | P0 | B | B07 | Local full match/reset/replay | MVP | 20 match soak; deterministic replay; no listener/texture leaks |
| C01 | P0 | C | B08 | Utility AI via legal command API | U13 | No hidden info; seeded policy tests; blocked action fallback |
| C02 | P1 | C | C01 | Deck collection/detail/local persistence UI | F024,F032 | 5 slots validation; corrupt save reset/export path |
| C03 | P1 | C | C02 | Tutorial/practice/result flow | F037,F076 | First battle completable touch; practice no ranked rewards |
| D01 | P0 | D | C03 | Identity/session/provider link | Player | Token rotate/revoke; ownership tests; account conflict UI |
| D02 | P0 | D | D01 | Postgres migrations/deck snapshots | Database | Empty+upgrade migration; transactional revision constraints |
| D03 | P0 | D | D02 | Match actor lifecycle/fencing | Authority | Single writer,terminal guard,host epoch checked |
| D04 | P0 | D | D03 | SignalR command/receipt + filtered snapshots | API | Seq/dedup/rate limit; forged owner/damage rejected |
| D05 | P0 | D | D04 | Interpolation/resync/mobile network recovery | U11 | Jitter/loss/resume tests; full snapshot recovery; no duplicate card |
| D06 | P0 | D | D03,D02 | Queue tickets/trophy range/loading | Matchmaking | No duplicate assignment; cancel/assign race |
| D07 | P0 | D | D04,D02 | Result settlement/reward ledger/outbox | Economy | Replay50 retries=one grant; old worker cannot settle |
| D08 | P0 | D | D05,D06,D07 | Online duel acceptance | PvP | 2 real clients complete10 matches; network/security tests |
| E01 | P1 | E | R09,D08 | Complete upgrade/XP/trophy/arena tables | U07 | No invented Elo/cost/drop odds; lookup source coverage |
| E02 | P1 | E | E01 | Collection upgrade and transactional wallet | F036 | Concurrent spends no negative balance; UI receipt |
| E03 | P1 | E | E02 | Battle/free/victory chest state machines | F061,F062 | Stack/unlock timers,retry,full slots tested |
| E04 | P1 | E | E03 | Shop offers/piggy/capsule/subscription gates | Economy | Price version; eligibility; unknown thresholds disable feature |
| E05 | P1 | E | E04 | Payment sandbox webhook entitlement/refund | F066 | Provider signatures,duplicate/reordered callbacks,refund receipt |
| E06 | P0 | E | R04,B05 | Implement remainder of verified roster | U04 | Each card levels/abilities/animation links; interaction fixtures |
| E07 | P1 | E | E02,R09 | Forge expiry/permanent cap/season reset | Progression | Time boundary+frozen match snapshot; idempotent award |
| E08 | P1 | E | E06,E07 | Economy/progression end-to-end review | Meta | Chest→upgrade→arena→battle acceptance plus audit export |
| F01 | P1 | F | E08,R09 | Clans memberships/roles/chat | Social | Permission matrix,capacity race,report/mute |
| F02 | P1 | F | F01 | Donations ledger/quotas | F081 | Donor/recipient balances atomic;limit config verified |
| F03 | P1 | F | F01,D06 | Friendly invitation/accept/cancel | F071 | CAS accept;no trophy/chest/gold; queue excluded while pending |
| F04 | P1 | F | F01,E07 | Leaderboards/seasons projections | F054,F082 | Stable paging/watermark;rebuild from authoritative scores |
| F05 | P1 | F | D08,F01 | Replay recording/authorized playback | F055 | Same core version;hidden state policy;seek checkpoints |
| F06 | P1 | F | R09,F03 | Daily modes/championship rules | U08 | Per-mode rules+reward tests;no guessing fees/caps |
| F07 | P1 | F | A03,E06 | Final original models/atlases/rig/VFX/audio | Asset pipeline | License ledger,clip semantics,mobile budget for full roster |
| F08 | P1 | F | F07,F06 | 25-screen UI states/accessibility/device pass | S01–S25 | Loading/empty/error/offline/permission each screen |
| G01 | P0 | G | F08,D08 | Cross-browser and thermal performance | B01–B12 | Measured budgets;no unexplained>10% regression |
| G02 | P0 | G | D08,E08 | Concurrency/fault/security/load suite | N01–N14 | Result/wallet consistency after retries/crash;capacity documented |
| G03 | P0 | G | G02 | Docker/staging/CDN/metrics/secrets | Deployment | One command deploy immutable version;health/drain config |
| G04 | P0 | G | G03 | Backup restore/migration/rollback drill | Ops | RPO/RTO measured;ledger reconciliation pass |
| G05 | P0 | G | G01,G02,G04 | Parity evidence audit + legal asset audit | Acceptance | Every claimed feature links passing evidence;deviations disclosed |
| G06 | P0 | G | G05 | Production release with canary/drain | Release | Error/latency alarms;rollback rehearsed;support/runbook |
| X01 | P2 | Extension | R09,U09 resolved | Ascension/marketplace equivalent feasibility | U09 | Scope/live proof;separate40–80day estimate;no claim omitted parity |

Coding agent bắt đầu: đọc README→unknowns→rule spec→ADR→task đầu chưa done. Trước code xác nhận gate của task từ evidence files, không hỏi lại quyền cho hành động đã nằm scope. Chỉ move Done khi có artifact/test evidence. Nếu task bị thiếu original rule, update Blocked research và làm task độc lập; không tạo default âm thầm. [JSON backlog](../data/task-backlog.json).
