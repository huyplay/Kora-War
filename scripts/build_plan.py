from build_delivery import *

phases=[
('R','Research baseline','10–20','U01–U11 triage; capture protocol; P0 rules khóa cho slice đầu; không hứa đo đủ mọi level trong20 ngày','Evidence packet + content profile validated; unresolved rules chặn parity profile'),
('A','Foundation và renderer spike','15–25','Repo, CI, contracts, C# WASM spike, Babylon/Three/Phaser comparison, original art blockout','Browser mở lobby→3-lane field; input mobile; benchmark report và ADR'),
('B','Offline battle playable','25–40','Shared fixed-step core, deck/draw/mana, spawn/target/combat/result,8–12 thẻ đã đo','Một trận local hoàn chỉnh, replay hash,30/60FPS same state, reset trận không leak'),
('C','AI và local progression','15–25','Utility AI, practice UI, collection/deck/card detail, local lab save','MVP local chơi được; fake rewards chỉ profile lab, không đại diện economy gốc'),
('D','Online PvP','35–55','Identity,matchmaking,authority,filtered snapshots,reconnect,result ledger','Hai browser đấu thật; forged input không tạo damage/reward; crash/retry không double grant'),
('E','Core progression/economy và roster','45–75','Verified roster/abilities,upgrade,chests,shop,arena,XP,trophy,Forge,season','Loop đấu→thưởng→upgrade→đấu; U04/U07 phải đủ; chưa đủ roster không gắn feature-complete'),
('F','Social/modes và production art','40–70','Clan/chat/donation/friendly,rank,replay,verified modes,asset/audio,mobile UX','Beta feature set test được; moderation và concurrency; visual fixtures approved'),
('G','Hardening và release','25–45','Load/security/mobile QA,ops,backup restore,privacy,release rollback','Release candidate qua criteria,không known P0 bug; production-ready checklist có evidence')]

write('04-development/roadmap.md','''
# Roadmap từ repository trống

Hiện trạng: chỉ tài liệu, JSON nghiên cứu và script kiểm tra tài liệu; **chưa có game implementation**. Thứ tự R→A→B→C→D→E→F→G; một lập trình viên hoàn thành từng vertical slice, không đồng thời dựng hàng loạt hệ thống chưa có consumer. Research mở lại khi thay build/ruleset.

| Phase | Mục tiêu | Person-days | Phạm vi | Phần mềm / gate đầu ra |
|---|---|---|---|---|
'''+ '\n'.join('| '+' | '.join(r)+' |' for r in phases)+'''

## Ước lượng và độ bất định

Một person-day=6 giờ tập trung,5 ngày/tuần; chưa bao gồm chờ cấp asset/quyền, mua/tiếp cận thiết bị, chờ season quan sát hay vận hành người chơi thật. Có thể thuê art/audio; một developer tự làm toàn bộ68+ thẻ/art sẽ làm tăng đáng kể estimate. Range là planning judgment, không phải cam kết. R chỉ dành cho đóng P0 của slice; research toàn roster có effort trong E và có thể vượt estimate nếu không truy cập được tài khoản phù hợp.

| Mốc | Cộng phase | Base effort | Với contingency30% | Calendar full-time |
|---|---|---|---|---|
| MVP offline 8–12 thẻ | R+A+B+C |65–110 ngày |85–143 ngày |17–29 tuần |
| PvP playable cùng subset | Thêm D |100–165 ngày |130–215 ngày |26–43 tuần |
| Beta core roster/meta/social | Thêm E+F |185–310 ngày |241–403 ngày |48–81 tuần |
| Feature-complete **phạm vi đã xác minh**, production candidate | Thêm G |210–355 ngày |273–462 ngày |55–93 tuần |

Không lấy MVP subset làm functional equivalence toàn game. Nếu current Ascension marketplace/NFT được xác nhận và nằm scope parity, dự trù thêm40–80 ngày thiết kế/tích hợp/QA và chuyên môn phù hợp; con số này chưa vào bảng. Tính năng mới sau baseline, art hero chất lượng cao, marketing/liveops liên tục cũng chưa vào. Nếu làm20 giờ/tuần thay30 giờ tập trung, nhân calendar khoảng1.5.

Rủi ro lớn nhất không phải scaffolding web: thiếu luật/thông số mọi thẻ, asset và độ ổn định combat/network. Nếu P0 chưa đo được, A có thể chạy renderer với synthetic fixture nhưng B chỉ được `WEB-lab-v0`; phải ghi deviation, không biến default thành luật gốc. Chi phí nghiên cứu có thể không bị chặn trên nếu game/server/tài khoản không còn truy cập được.

## Khởi động cụ thể

Ngày1–3: chốt baseline account/build+evidence template, chọn8–12 thẻ theo cơ chế có dữ liệu, lập acceptance fixtures. Ngày4–10: rút bài/crystals/vùng đặt/target/OT measurement ưu tiên; thẻ không đo được ở ngoài verified slice. Sau gate R: scaffold mono-repo, chạy B0/WASM, freeze ADR; hoàn thành browser battlefield/input rồi mới battle loop. Không dựng production shop hay blockchain trước PvP correctness.

Mỗi PR sau này phải trỏ featureID, source/observation, ruleset version, testID, status parity; không chỉ ghi “implement card”. Với thiếu chứng cứ, PR chỉ được đẩy lab/deviation và phải giữ gate hiện rõ. [Backlog](task-backlog.md) đưa thứ tự/dependency chi tiết.
''')

write('04-development/milestone-breakdown.md','''
# Milestones và vertical slices

Các package A–G dưới đây chia effort phase, không cộng thêm vào estimate roadmap. Mỗi slice kết thúc bằng URL/build chạy được cùng test report; dữ liệu placeholder được đánh nhãn lab. Không cần đợi backend hoàn chỉnh để test rendering, nhưng không gọi local wallet là secure economy.

| Slice | Dependency | Deliverable chạy được | Definition of Done | Rủi ro/gate |
|---|---|---|---|---|
| R1 Baseline | none | Evidence index xem được với fixtures | Build/locale/mode/tier và source/timecode cho mọi P0 slice | U01 access |
| R2 Ruleset candidate | R1 | Catalog validator báo rõ field thiếu |8–12 cards đủ numeric tables/abilities; conflicts resolved hoặc excluded | U02–06 |
| A1 Shell | R triage | Lobby→battlefield trên mobile/desktop | Resize/safe area, pointer cancel, loading/retry, no input trap | U10 |
| A2 Render comparison | A1 | Ba scene Babylon/Three/Phaser | Same assets/replay; B01–B10 report; ADR signed by reviewer | U12, art rights |
| A3 Shared core path | A1 | C# headless+WASM worker same trace | Payload/startup đạt budget; fail thì ADR TS shared core | A-WASM |
| B1 Deploy duel | A2+A3+R2 | Spawn/mana/3 lane/castle local |20 documented cases ready subset; input invalid no debit | Target geometry |
| B2 Combat & result | B1 | Melee/ranged/spell→win→restart | Replay hash, attack timing, same-time test, OT known or lab-gated | U05/U06 |
| B3 Deck loop | B2 | Full match with draw/cycle/empty hand | Full-hand/double/cursor tests; no CR instant redraw assumption | U02 |
| C1 Practice | B3 | Bot complete trận offline | Commands same validator, no hidden info,30 seeded scenarios | U13 new policy |
| C2 Local meta | C1 | Edit deck→practice→result→collection | Persistent local save versioned; lab rewards labeled | Not online ownership |
| D1 Connected duel | C2 | Two browsers join same room | Server only damage; private hands filtered; seq dedup | Latency |
| D2 Identity/queue | D1 | Login→queue→match→result | One active ticket/player, frozen deck, authenticated room | Account conflict |
| D3 Recovery/settlement | D2 | Disconnect/rejoin; rewards after result | Exactly-once business grant under retries; fencing/void crash | U11 original vs new |
| E1 Progress loop | D3+U07 | Reward→upgrade→next match | Wallet/collection atomic, no client price, daily/chest timers | Loot/config |
| E2 Roster | E1+U04 | Entire verified catalog usable | Each ability+level/scaling+interaction fixtures; aliases reconciled | Largest content cost |
| E3 Season/Forge | E2 | Timed boosts/reset/league rewards | Frozen effective levels, expiry/reset race tests | Historical live gate |
| F1 Clan/friendly | E1+U08 | Create/join/chat/donate/invite battle | CAS invite, donation ledger, clan permissions, mute/report | Moderation |
| F2 Modes/ranking/replay | F1+U08 | Rotation+leaderboard+authorized replay | No hidden state leak; mode gates; stable rank projection | Unknown schedules |
| F3 Final presentation | A2+B2+E2 | New art/audio/UI |25 screens states/mobile QA; animation driven by events | Asset throughput |
| G1 Resilience | D3+E3+F2 | Staging load/fault tests | Capacity report, migration+backup restore, drift alarms | Host crash |
| G2 Release candidate | G1+F3 | Versioned release/rollback | P0 acceptance closed; parity matrix evidence; no unlicensed assets | Not automatic100% |

Mỗi milestone có cutline: phạm vi chưa đủ evidence không lén bỏ khỏi inventory; chuyển Blocked research và cập nhật release claim. Beta có thể xuất với subset rõ, nhưng feature-complete của baseline cần đóng toàn bộ mandatory rows.
''')

tasks=[
('R01','P0','R','none','Ghi app build/account/OS/locale và thử live PvP','U01','Evidence manifest;3 trận complete hoặc lý do inaccessible'),
('R02','P0','R','R01','Đo draw/crystal/mana và cursor overflow','U02','10 captures; resolve 7/8/7–10s,45s vs5draw; dữ liệu sai số'),
('R03','P0','R','R01','Đo deployment frontier và lane geometry','U03','20 vị trí/lane; valid/invalid bounds, push/retreat'),
('R04','P0','R','R01','Thu roster/detail và normalize aliases','U04','66 candidates đối chiếu68 lịch sử; mọi tên có evidence'),
('R05','P0','R','R04','Chốt stats8–12 thẻ cho playable slice','U04','Required fields đủ; source version/level/units, no default unknown'),
('R06','P0','R','R03,R05','Đo target/collision/hit/projectile','U05','Equal-range/target death traces và temporal error'),
('R07','P0','R','R01','Đo overtime/simultaneous lethal','U06','Curve+cadence+winner precedence hoặc block verified profile'),
('R08','P0','R','R01','Đo disconnect/rejoin/loading fail','U11','Hai controlled clients,5/15/30/60s interruptions'),
('R09','P1','R','R01','Thu meta/modes/NFT current availability','U07,U08,U09','Existence lịch sử/live tách; announcement link; không giao dịch NFT'),
('R10','P0','R','R01','Camera/animation/mobile interaction captures','U10','Timestamps và layout metrics3arenas,10abilities'),
('A01','P0','A','R02,R03,R05,R06','Scaffold frontend/core/backend/test projects','Architecture','CI build, lint, contract version; chưa mock luật unknown làm thật'),
('A02','P0','A','A01','C# WASM deterministic/load spike','A-WASM','Server/WASM hashes equal, payload/time measured hoặc TS ADR'),
('A03','P0','A','R10,A01','Ba renderer benchmark với art hợp pháp','U12,U14','Report B0; choose engine bằng số liệu'),
('A04','P0','A','A03','Battle shell/loading/error/resize','S01,S06','Mobile safe area, DPR,30/60 profile,context restore'),
('A05','P0','A','A04,R03','Touch drag/drop/cancel + accessibility controls','S06','Invalid zone/low mana clear;pointercancel no play'),
('A06','P0','A','R05,A01','Content schema/validator/versioned manifest','F035','Unknown stats reject parity publication; lab namespace separate'),
('B01','P0','B','A02,A06','Fixed-step state/RNG/event queue','C01–C20','Replay deterministic across runtimes, integer overflow tests'),
('B02','P0','B','B01,R02','Deck/hand/shuffle/mana reducer','F022–F036','Documented tests T06–T19/T28–T31 mapped'),
('B03','P0','B','B01,R03','Lane spawn/movement/target/collision','C01–C04','Swept range and mirrored lane tests; measured target policy'),
('B04','P0','B','B03,R06','Melee/ranged/projectile/HP/death','C05–C10','Attack semantic ticks; no damage animation side effects'),
('B05','P0','B','B04,R05','Spell/status/heal/summon/copy slice','C11–C19','Validated ability parameters; overlapping effects fixtures'),
('B06','P0','B','B05,R07','Castle/OT/result state machine','F001–F021','Shared HP,terminal once,simultaneous lethal verified or blocked'),
('B07','P0','B','B02,B06,A05','Connect renderer/HUD/audio to core','S06','30/60/120 renderFPS same simhash; private view schema'),
('B08','P0','B','B07','Local full match/reset/replay','MVP','20 match soak; deterministic replay; no listener/texture leaks'),
('C01','P0','C','B08','Utility AI via legal command API','U13','No hidden info; seeded policy tests; blocked action fallback'),
('C02','P1','C','C01','Deck collection/detail/local persistence UI','F024,F032','5 slots validation; corrupt save reset/export path'),
('C03','P1','C','C02','Tutorial/practice/result flow','F037,F077','First battle completable touch; practice no ranked rewards'),
('D01','P0','D','C03','Identity/session/provider link','Player','Token rotate/revoke; ownership tests; account conflict UI'),
('D02','P0','D','D01','Postgres migrations/deck snapshots','Database','Empty+upgrade migration; transactional revision constraints'),
('D03','P0','D','D02','Match actor lifecycle/fencing','Authority','Single writer,terminal guard,host epoch checked'),
('D04','P0','D','D03','SignalR command/receipt + filtered snapshots','API','Seq/dedup/rate limit; forged owner/damage rejected'),
('D05','P0','D','D04','Interpolation/resync/mobile network recovery','U11','Jitter/loss/resume tests; full snapshot recovery; no duplicate card'),
('D06','P0','D','D03,D02','Queue tickets/trophy range/loading','Matchmaking','No duplicate assignment; cancel/assign race'),
('D07','P0','D','D04,D02','Result settlement/reward ledger/outbox','Economy','Replay50 retries=one grant; old worker cannot settle'),
('D08','P0','D','D05,D06,D07','Online duel acceptance','PvP','2 real clients complete10 matches; network/security tests'),
('E01','P1','E','R09,D08','Complete upgrade/XP/trophy/arena tables','U07','No invented Elo/cost/drop odds; lookup source coverage'),
('E02','P1','E','E01','Collection upgrade and transactional wallet','F036','Concurrent spends no negative balance; UI receipt'),
('E03','P1','E','E02','Battle/free/victory chest state machines','F061,F062','Stack/unlock timers,retry,full slots tested'),
('E04','P1','E','E03','Shop offers/piggy/capsule/subscription gates','Economy','Price version; eligibility; unknown thresholds disable feature'),
('E05','P1','E','E04','Payment sandbox webhook entitlement/refund','F066','Provider signatures,duplicate/reordered callbacks,refund receipt'),
('E06','P0','E','R04,B05','Implement remainder of verified roster','U04','Each card levels/abilities/animation links; interaction fixtures'),
('E07','P1','E','E02,R09','Forge expiry/permanent cap/season reset','Progression','Time boundary+frozen match snapshot; idempotent award'),
('E08','P1','E','E06,E07','Economy/progression end-to-end review','Meta','Chest→upgrade→arena→battle acceptance plus audit export'),
('F01','P1','F','E08,R09','Clans memberships/roles/chat','Social','Permission matrix,capacity race,report/mute'),
('F02','P1','F','F01','Donations ledger/quotas','F083','Donor/recipient balances atomic;limit config verified'),
('F03','P1','F','F01,D06','Friendly invitation/accept/cancel','F071','CAS accept;no trophy/chest/gold; queue excluded while pending'),
('F04','P1','F','F01,E07','Leaderboards/seasons projections','F054,F084','Stable paging/watermark;rebuild from authoritative scores'),
('F05','P1','F','D08,F01','Replay recording/authorized playback','F055','Same core version;hidden state policy;seek checkpoints'),
('F06','P1','F','R09,F03','Daily modes/championship rules','U08','Per-mode rules+reward tests;no guessing fees/caps'),
('F07','P1','F','A03,E06','Final original models/atlases/rig/VFX/audio','Asset pipeline','License ledger,clip semantics,mobile budget for full roster'),
('F08','P1','F','F07,F06','25-screen UI states/accessibility/device pass','S01–S25','Loading/empty/error/offline/permission each screen'),
('G01','P0','G','F08,D08','Cross-browser and thermal performance','B01–B12','Measured budgets;no unexplained>10% regression'),
('G02','P0','G','D08,E08','Concurrency/fault/security/load suite','N01–N14','Result/wallet consistency after retries/crash;capacity documented'),
('G03','P0','G','G02','Docker/staging/CDN/metrics/secrets','Deployment','One command deploy immutable version;health/drain config'),
('G04','P0','G','G03','Backup restore/migration/rollback drill','Ops','RPO/RTO measured;ledger reconciliation pass'),
('G05','P0','G','G01,G02,G04','Parity evidence audit + legal asset audit','Acceptance','Every claimed feature links passing evidence;deviations disclosed'),
('G06','P0','G','G05','Production release with canary/drain','Release','Error/latency alarms;rollback rehearsed;support/runbook'),
('X01','P2','Extension','R09,U09 resolved','Ascension/marketplace equivalent feasibility','U09','Scope/live proof;separate40–80day estimate;no claim omitted parity')]
dump('data/task-backlog.json',[dict(id=r[0],priority=r[1],phase=r[2],dependencies=r[3].split(','),task=r[4],traceability=r[5],done_when=r[6],status='Not started') for r in tasks])
write('04-development/task-backlog.md','''
# Backlog có thứ tự và Definition of Done

Thực thi từ trên xuống khi dependency đạt; thứ tự giữa các task độc lập cùng phase có thể đổi theo bottleneck. Uxx là research gate, không task implementation. Mọi task **Not started**; viết tài liệu không hoàn thành task code. Effort phân bổ theo milestone, tránh cộng effort của một task nhiều phase.

| ID | Priority | Phase | Depends on | Task | Trace | Done when |
|---|---|---|---|---|---|---|
'''+ '\n'.join('| '+' | '.join(r)+' |' for r in tasks)+'''

Coding agent bắt đầu: đọc README→unknowns→rule spec→ADR→task đầu chưa done. Trước code xác nhận gate của task từ evidence files, không hỏi lại quyền cho hành động đã nằm scope. Chỉ move Done khi có artifact/test evidence. Nếu task bị thiếu original rule, update Blocked research và làm task độc lập; không tạo default âm thầm. [JSON backlog](../data/task-backlog.json).
''')

risks=[
('Thông tin gameplay thiếu','Rất cao','P0 cònnull; prototype có vẻ giống nhưng xử khác','Research fixtures/gates;lab profile riêng','R, mỗi card'),
('Baseline không truy cập được','Cao','Store online nhưng login/PvP không hoạt động','Ghi inaccessible;chọn historical baseline rõ,không claim latest','R01'),
('Roster/stat/ability scope','Rất cao','68lịch sử/66candidates; mọi level cần dữ liệu','Per-card coverage+interaction matrix;không đếm tên=implemented','E06'),
('NFT/ACS bị thay đổi','Cao','Support tồn tại nhưng community báo mất thẻ','Verify announcement/live;phạm vi branch riêng','R09'),
('Asset throughput/quyền','Rất cao','Một dev không đủ art; repo LICENSE khác asset license','New identity,commission/CC0/license ledger;budget art','A03,F07'),
('Cross-runtime determinism','Cao','C#WASM load/timing/overflow khác server','Sharedcore+goldentrace;failspike chuyển TS','A02'),
('Sai target/hit/event ordering','Cao','Sai một tick đổi winner','Measure temporal precision;fixedpoint;trace diff','B01–B06'),
('Authority chỉ trên giấy','Cao','Client gửi winner/HP hoặc host client có đặc quyền','Server core,filtered state,invalid-input security tests','D03/D04'),
('Double reward/negative balances','Cao','Retries/callback/outbox gây duplicate','Ledger/idempotency/fencing/transaction;fault tests','D07/E05'),
('Sync/reconnect lỗi','Cao','Burn/play duplicate,hand stale,mobile background','Sequence receipts/fullresync/privateview;networkmatrix','D05'),
('Mobile CPU/GPU/memory','Cao','Rig/VFX/atlas quá lớn;Safari context lost','B0 real devices/adaptivequality/LOD/loadbydeck-safe','A03/G01'),
('Server cost/capacity','Trung–cao','Nhiều snapshot/room vượtCPU+egress','Measure unitload+serialization;capacity/headroomformula','G02'),
('Economy không cân bằng','Cao','Không có exactdrop/price;rewardpressure sai','Versioned tables,noinventedodds;economy model','E01–E08'),
('Queue population nhỏ','Trung–cao','Không đủ đối thủ cùngtrophy/region','UX estimated wait,cancel;bot chỉ explicit practice','D06'),
('Social abuse/operations','Cao','Chat spam,account takeover,payment dispute','Moderation/rate limits/audit/runbook;beta constrained','F01/G03'),
('Một developer quá tải','Rất cao','Web/game/net/art/liveops đồng thời','Vertical slices;defer optionalnonverified;outsourceart','All'),
('Source version drift','Cao','Wiki/patch update làm golden stale','Hash/dated registry;freeze baseline;review sourcechanges','All'),
('Migrations/rollout corrupt state','Cao','Old/new rooms dùng content/schema không tương thích','Pin core/content,expandcontract,drain,restore drill','G03/G04')]
write('04-development/risks-and-dependencies.md','''
# Risks và dependencies

Mức rủi ro là nhận định planning; không phải xác suất thống kê. Chủ sở hữu ban đầu là developer kiêm researcher/QA; production cần ít nhất người review độc lập gameplay và security/operations khi có tiền thật.

| Risk | Mức | Failure signal | Mitigation | Gate |
|---|---|---|---|---|
'''+ '\n'.join('| '+' | '.join(r)+' |' for r in risks)+'''

Critical path: accessible baseline→complete slice rules→shared simulation→PvP authority→settlement→full roster/meta→mobile/ops. Art pipeline và evidence capture có thể tiến cùng engineering nếu có người hỗ trợ; estimate không mặc định có team. External dependencies: hợp pháp truy cập game/current accounts, thiết bị iOS/Android, art rights, provider credentials cho login/payment khi đến phase, hosting/CDN/domain. Chưa dependency nào được coi provisioned chỉ vì có thiết kế.

Stop conditions có phạm vi: P0 rule thiếu chặn verified gameplay feature; license thiếu chặn reuse asset/code; benchmark fail chặn ADRproduction; settlement fail chặn online progression; backup restore fail chặn public release. Vẫn được làm docs,synthetic spike hoặc task độc lập. Không coi nghiên cứu không đầy đủ là lý do che scope bị bỏ.
''')

if __name__=='__main__':print('Roadmap and backlog generated')
