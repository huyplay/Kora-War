from build_plan import *

# Correct traceability links after the feature inventory has been assigned IDs.
for task in tasks:
    pass
backlog=json.loads((DOC/'data/task-backlog.json').read_text(encoding='utf8'))
fixes={'C03':'F037,F076','F02':'F081','F04':'F054,F082'}
for t in backlog:
    if t['id'] in fixes:t['traceability']=fixes[t['id']]
dump('data/task-backlog.json',backlog)
p=DOC/'04-development/task-backlog.md'
body=p.read_text(encoding='utf8').replace('F037,F077','F037,F076').replace('| F083 |','| F081 |').replace('F054,F084','F054,F082')
write('04-development/task-backlog.md',body)

append('02-feature-specs/multiplayer.md',f'''## Daily Game Modes và Championship — luật documented, live gate U08

Daily Game Modes mở khi đã unlock Castle4. Mỗi ngày một mode được chọn cho mọi người; thưởng ngày chỉ ở trận thắng đầu. Chuỗi sáu ngày thắng trước là điều kiện cho phần thưởng ngày bảy; thiếu ngày thì mất phần thưởng cuối tuần tương ứng. Ngày bảy chọn một fragment bằng1/5 Legendary trong tập castle đã mở; đủ5 fragments nhận thẻ. Không có danh sách đầy đủ rule của từng mode, timezone/catch-up chưa rõ; mode rules phải có version riêng. [Game Modes]({sup(12684689584017)}).

Championship có Grand/Master Tournament, Hall of Fame tính điểm thắng tournament. Tài liệu mô tả10 rounds, phải thắng đủ mới nhận thưởng hoàn thành. Sau thua có Continue trả gems trong1giờ, giá tăng theo round nhưng bảng giá chưa biết. Lần đầu hoàn thành có cơ hội hoàn lại gems Continue theo support, không tự biến thành bảo đảm hoàn tiền. Championship deck chỉ dùng thẻ đã unlock, level cố định Common9/Rare7/Epic4/Legendary1; nâng card collection không thay level trong deck này. [Championship]({sup(12684749806609)}).

Proposed state machine tournament: ELIGIBLE→ENTERED→ROUND_READY→IN_BATTLE→(NEXT_ROUND hoặc CONTINUE_WINDOW)→COMPLETED/EXPIRED. Server timestamps và unique roundResult; phí Continue+state advance một transaction. Retry không trả hai lần. Reward policy snapshot theo entry; UI hiện price rõ trước xác nhận. Chưa đủ cost/reward/current rules thì endpoint trả MODE_UNAVAILABLE thay vì giá mẫu. Daily mode rotation và tournament là hai hệ thống riêng, không gọi chúng là quest/battle pass.''')

append('02-feature-specs/progression.md',f'''## Account, profile và xóa dữ liệu

PlayerID xuất hiện trong Settings sau tutorial; tên đã đặt không thể sửa theo support, flag liên quan locale. Liên kết/khôi phục dùng các provider được support mô tả, không chứng minh token flow gốc. [ID]({sup(12684589127825)}), [Tên]({sup(12684752821649)}), [Flag]({sup(12684767612689)}), [Restore]({sup(12684767547665)}).

Support có Delete Account trong Settings: confirmation bị khóa15giây, sau xóa quay start screen, không khôi phục được. Reinstall có thể tạo profile mới nhưng không overwrite profile đã gắn provider. [Reset/delete]({sup(12679594402577)}). Web cần re-auth, account-scoped deletion job, revoke sessions và policy retention của ledger theo yêu cầu phát hành; lifecycle backend này là Proposed. Không xóa profile ngay khi chỉ mở popup. Avatar customization, detailed statistics, achievements vẫn Unknown; không dựng UI giả rồi gọi original parity.''')

append('02-feature-specs/screen-flow.md',f'''## Social, invite và clan transitions

Support mở clan ở player level3, tạo clan tốn1000gold; open/invite-only/closed, clan chat, roles, donation, friendly và share replay được mô tả. [Clan]({sup(12684817694481)}). Số50 members chỉ từ whitepaper tr.10, cần U08 xác minh. Donations đổi copies lấy gold theo support; XP được whitepaper nhắc, quota/mức thưởng chưa đủ. [Donation]({sup(12684689322385)}), {link('WP21')}.

Proposed clan state: NO_CLAN→SEARCH→(REQUEST_PENDING hoặc MEMBER); leader có quyền quản trị theo role matrix cần capture, không tự gán elder/co-leader nếu không có evidence. Invite-only accept có server permission; closed không nhận join tự do. Chat pending/sent/failed có idempotent messageId. Donation show owned/remaining limit/expired; khi donor thiếu copies refresh collection và không debit. Friendly pending chặn queue; người khác accept thắng CAS chuyển hai client sang battle; cancel popup gửi cancel, race đã accepted phải vào room hoặc theo disconnect policy. Không có friend list standalone được xác minh.

Delete account UI là màn Settings con: re-auth→warning→15s confirmation→pending→start; interrupted countdown không delete. Mọi button destructive phải dùng endpoint server và confirmation rõ. Chi tiết bố trí pixel/animation của bản gốc còn U10, không lấy Proposed flow làm ảnh chụp quan sát.''')

tests=[
('T01','Battlefield','Khởi tạo trận1v1 documented profile','Hai phía đối địch, ba lane dùng để triển khai/tấn công','WP21','F001,F069'),
('T02','Shared castle HP','Gây damage D1 ở lane0, D2 ở lane2 vào cùng castle; D đã đo','Một HP pool giảm tổng damage hợp lệ; không có ba tower HP riêng','WP21','F002'),
('T03','Passive castle','Đưa một attacker đến castle, không có defender/buff','Castle không tự bắn/phản công; không thêm tower attack từ game khác','WP21','F003'),
('T04','Lane endpoint','Cho một unit tự đi hết lane không gặp địch','Unit đến cuối lane tấn công castle, không biến mất chỉ vì chạm endpoint','WP21','F006,F004'),
('T05','Victory','Đưa một castle HP xuống0 bằng hit hợp lệ, castle kia cònHP','Bên phá castle thắng; match terminal; không tiếp tục trận sau kết quả','WP21','F004'),
('T06','Opening hand','Bắt đầu trận deck14, quan sát trước timed draw đầu','Mỗi người có5 lá trên tay','SUP-12684698308625','F025'),
('T07','Normal draw','Tay5, trước Double Cards, chờ lần draw kế','Tay thành6 nếu không play giữa chừng','SUP-12684698308625','F025'),
('T08','Full hand burn','Tay6, tới normal draw','Tay vẫn6; lá định rút mất, không xếp hàng để tự nhận sau','SUP-12684698308625','F027'),
('T09','One deck permutation','Theo dõi đủ14 lá cycle, luôn chừa chỗ trên tay','Multiset14 lần rút đúng deck14, không weighted random independent','SUP-12684698308625','F026'),
('T10','Duplicate count','Deck có đúng2Dwarfs, theo dõi14 lá khôngburn','Đúng2Dwarfs trong cycle đó; thứ tự ngẫu nhiên chưa cần biết PRNG gốc','SUP-12684698308625','F026,F023'),
('T11','Next cycle','Tiếp tục quan sát14 lá cycle kế, chừa chỗ','Multiset lại bằng deck; không buộc thứ tự phải khác vì random có thể trùng','SUP-12684698308625','F026'),
('T12','Buy draw','Tay0, mana ít nhất5, bấm rút thêm một lần','Rút một extra card và tiêu5mana; cursor/christal side effects cònU02','SUP-12684698308625','F028'),
('T13','Timed simultaneous draw','Hai phía trong cùng trận, khôngExtraCrystal/paidDraw','Timed draw/crystal event xảy ra cho cả hai trong cùng chu kỳ; latency UI không đổi luật','SUP-12684698308625','F030'),
('T14','Double draw roomy','Mode Double Cards đã xác nhận active, tay3','Một cycle nhận2lá, hand5; không tự chọn45s làm trigger live','SUP-12684758851089','F029'),
('T15','Double draw one slot','Double Cards active, tay5','Chỉ1lá được nhận, tay6; lá thứhai consume cursor hay không cònUnknown','SUP-12684758851089','F029,F025'),
('T16','Double draw cap','Double Cards active, tay6','Không vượt6lá; chi tiết double burn cursor phải đoU02','SUP-12684758851089','F029,F027'),
('T17','Starting crystals','Trận mới trước hiệu ứng extra','Mana crystal capacity khởi đầu2','SUP-12684758284689','F030'),
('T18','Crystal progression','Timed crystal event khi cap dưới12','Capacity tăng1; không tự cho mana hiện có đầy ngay nếu chưa đo','SUP-12684758284689','F030'),
('T19','Maximum crystals','Cho timed crystal events tiếp tục khi capacity12','Capacity không tăng quá12','SUP-12684758284689','F030'),
('T20','Extra Crystal below cap','ChơiExtraCrystal hợp lệ ở capacity<12','Thêm1crystal; numeric cost vẫn cần verified catalog','SUP-12684758284689','F030'),
('T21','Extra Crystal at cap','ChơiExtraCrystal khi cap12 và đủ chỗ hand','Rút thêm card thay vì tăngcapacity13; side effects khác không suy đoán','SUP-12684758284689','F030'),
('T22','First target enters range','Một eligible enemy vào range trước enemy khác, không tie/specialability','Unit tấn công eligible enemy đầu vào range; masking/range numeric từfixture','WP21','F007'),
('T23','Movement toward enemy','Một normal unit, lane trống, khôngroot/stun/target','Vị trí tiến về thành đối phương theo lane; tốc độ cụ thể từverified card','WP21','F006'),
('T24','Overtime entry','Giữ trận chưaterminal đến4phút, khôngcastleattack quanhmốc','Bắt đầu cơ chếcastle tự mấtmáu sau4phút theo support; firsttickexact cầncapture','SUP-12694401083537','F020'),
('T25','Overtime escalation','Tiếp tục trận overtime, tách damage unit khỏi tựdamage','Mức tựdamage tăng theo thời gian; chưa đặt curve/cadence cụ thể','SUP-12694401083537','F020'),
('T26','Metamorph level','ChơiMetamorph vào battlefield có eligible cards','Copy card ngẫu nhiên trênfield; level theoMetamorph, mappingrarity phảiverified','SUP-12684727124113','F018'),
('T27','Mana Ritual level cap','DùngManaRitual rồi card ởlevelcao hơn mức ritual hỗtrợ','Effective card level chịu giới hạn ritual; không chỉ giảm cost rồi giữlevel vôđiềukiện','SUP-12684727124113','F013'),
('T28','Giant Growth level cap','DùngGiantGrowth lêncardlevelvượt ngưỡng hỗtrợ','Level bịgiớihạn theoGiantGrowth; exactmapping/buffamount chờfixture','SUP-12684727124113','F013'),
('T29','Meteor upgrade','Cùng eligible target/setup, soMeteor hai level kề đã đo','Levelcao tăng damage; không tự áp10% nếu không có bảng','SUP-12684766514577','F036'),
('T30','Blizzard upgrade','Cùng targets, soBlizzard hai level kề đã đo','Upgrade tăng duration hiệu ứng; không tự biến thành tăngdamage','SUP-12684766514577','F013,F036'),
('T31','Practice result','Hoàn tất một battle Practice','Không đổi trophy, không cấpchest từ kếtquảtrận; opponent làTrainer bot','SUP-12684746317201','F076'),
('T32','Friendly result','Clan friendly đượcaccept và hoàn tất','Không đổi trophy/gold, không cấpchest','SUP-12684695238289','F071'),
('T33','Equal-trophy win','Ranked với hai người trophy ngangnhau theo snapshot','Thắngđược+30 theo support; floor/reset ngoài fixture','SUP-12684773222289','F048'),
('T34','Championship effective level','Vào Championship với collectionlevelkhác nhau','Deck mode có Common9/Rare7/Epic4/Legendary1; chỉcardđãunlock','SUP-12684749806609','F085')]

network_tests=[
('N01','Determinism','Cùng seed/config/acceptedcommands chạy100seeds tại30/60/120renderFPS và headless','Per-tick statehash identical; hash loại cosmetic'),
('N02','Retry','Gửi lại cùngPlayCard20lần sau timeout','Mộtcard/mana debit; cùngreceipt; payloadkhác cùngkey bịreject'),
('N03','Forged combat','Client thêmdamage/HP/winner/owner trongcommand','Schema reject hoặc ignore invalidextra theo schema strict; khôngstatechange'),
('N04','Hidden state','Inspect own snapshots/events/logs/live replay/API','Khôngopponent hand/futuredeck/RNG; filterauthorization'),
('N05','Snapshot gap','Dropdelta và deliverdelta phụthuộcbaseđãmất','Requestfullresync; khôngapplydiffsai; reconnecthandđúng'),
('N06','Network impairments','RTT300ms,jitter80ms,loss5%,disconnect15s','Servercontinues; onecardpercommand;fullrecovery; latencyreport'),
('N07','Economy retry','50parallelclaim cùngchest/result plus DBtimeoutaftercommit','Mộtgrant; mộtreceipt; wallet/copiesconsistent'),
('N08','Concurrent spend','Haiupgrades mỗi cái đủcost riêng nhưng tổngvượtgold','Chỉcácoperationđượcaffordcommitted; balancekhôngâm'),
('N09','Fencing','Oldhost và newhost gửi hairesultkhác cho match','Chỉ currentepoch và mộtterminalresultđượcsettle'),
('N10','Crash recovery','Killmatchhost trước/sau terminalcommit','Recoverdurablecheckpointđúng hoặcvoid; khônggrantclientwinner'),
('N11','Mobile UX','Pointercancel/rotate/background/lowmana','Khôngplayngoàiýđịnh;safearea;networkresync;HUDmanafollowsserver'),
('N12','Invite concurrency','Hai clanmateaccept mộtinvite cùnglúc;creatorcancelrace','Mộtacceptorhoặc cancelwinsCAS; không3-playerroom'),
('N13','Version skew','Oldclient/stalerules/contenthash và savedreplayoldcore','Khôngsilentmix; updateprompt hoặc archiveplayerđúngversion'),
('N14','Input boundaries','NaN/Infinity/out-of-bounds/replayedseq/oversizepayload','Rejectbeforemutation; no crash;rate-limit;auditkhônglộsecrets')]
dump('data/test-cases.json',dict(documented_battle=[dict(id=t[0],area=t[1],setup=t[2],expected=t[3],source_id=t[4],features=t[5].split(','),status='Not run',oracle_scope='Documented property; exact numeric/live oracle pending where noted') for t in tests],proposed_engine_network=[dict(id=t[0],area=t[1],setup=t[2],expected=t[3],status='Not run',oracle_scope='Proposed web design') for t in network_tests]))

write('04-development/testing-strategy.md','''
# Test Strategy

**34 tình huống battle dựa trên thuộc tính documented,14 tình huống engine/network/security đề xuất; chưa chạy test game nào vì chưa có implementation.** Expected property có thể được mô tả từ nguồn dù expected numeric trace chưa đủ; không biến một property pass thành cảfeature đạtparity. Các testcase cần cardfixture hoặc live timing vẫn Blocked oracle cho phầnchưađo.

## Battle cases có nguồn

Fixture chung: pin build/mode/ruleset/core/content, hai decks/levels/castleHP/Forge/tier, seed cho engineweb và timelinequan sát cho gamegốc; không so trận khácconditions. D1/D2 là damage đượcđo từ fixture, không sốgiả. Framecounter và timestamp không được trộn simulationtick. Test cycle phải tính rõ initial5 có nằm cycle không theo U02 trước executableoracle.

| ID | Phạm vi | Setup/action | Expected được nguồn hỗ trợ | Evidence | Features |
|---|---|---|---|---|---|
'''+ '\n'.join('| '+' | '.join([t[0],t[1],t[2],t[3],link(t[4]),t[5]])+' |' for t in tests)+'''

T02/T04/T22–T30 cần typed parameters và observedtrace trước exact automated assertions. T24 chỉ chứng minh ngưỡng4phút, chưa cadence. T09–T11 không được dùng kiểm tra thống kê “phải khác thứtự” như mộtassertionchắcchắn. T26 randomcopy kiểmtra eligible set và level mapping; không đoán card cụ thể ở bản gốc nếu không biếtseed.

## Web correctness và anti-cheat — Proposed

| ID | Nhóm | Kịch bản | Expected |
|---|---|---|---|
'''+ '\n'.join('| '+' | '.join(t)+' |' for t in network_tests)+'''

## Test layers và lịch chạy

| Layer | Công cụ gợi ý / phạm vi | Tần suất / gate |
|---|---|---|
| Unit rules | xUnit hoặc TS runner theo ADR; deck,mana,expiry,rounding,target eligibility | Mỗi PR; property test cho permutations,integeroverflow |
| Simulation scenarios | Headless trace runner; deterministic seed, exacteventorder | Mỗi PR thay core/content; golden phải reviewed |
| Card interactions | Ability tags×target categories×status interactions,plus known pairs | Mỗi card; toàn roster nightly; avoid chỉmirror implementation |
| Deterministic replay | Server/WASM hoặc Node/browser core; checkpoints/per-tick hash | Mỗi runtime/compiler/core update |
| API/DB integration | Real disposablePostgreSQL; migration/ledger/outbox | Mỗi backendPR; không mock transaction semantics |
| Concurrency/fault | Parallel requests,timeoutaftercommit,killworker,duplicatewebhook | D/E/G gates |
| Multiplayer synchronization | Two realbrowserclients và adversarial bot clients | D onward; private state,seq,resync,latency |
| UI automation | Playwright lobby/forms/input smoke; manual touchrealdevice | Mỗi UIchange+milestonefullmatrix |
| Mobile/browser | Chrome/Edge/Firefox/Safari desktop,ChromeAndroid/SafariiOS | Release gate; manualpermissions/background/audio |
| Load/performance | Synthetic legalcommands+realunitload,profiler/RAF/allocation | Nightlyselected; B01–B12 beforeengine/release |
| Security | IDOR,tokenrevocation,forgedplay,rate,chatmarkup,webhookreplay | D/G; review external dependencies pinned |
| Operations | Backuprestore,migrationexpandcontract,drain/rollback | G and schema-incompatible release |

## Oracle và báo cáo

Comparison gồm originalobservations (timestamp,expectedrange,errorbars) và webtrace (tick,event,statehash). Damage/cost/cardcount phải exact khi originalintegerverified; positions/timings chỉ dùng tolerance từ recordingresolution và tickquantization. Sai số không được tự mở rộng để làm testpass. Nếu20Hz không đạt timingtolerance, tăngtemporalresolution rồiversionruleset, không sửa videooracle.

Result artifact: testID,commit,fixtureHash,sourceIDs,originalbuild,webcoreversion,device/browser,pass/fail/blocked,expected,actual,diff,log/captureURL,reviewer. Có ít nhất reviewer độc lập cho claimed parity. Research assertion, enginecorrectness và visualreadability là ba testclass riêng. Goldenupdate phải nêu sourcechange hoặc approveddesignchange; không regenerate mọi expected sau bug để CI xanh.

Cardinteractionmatrix ưu tiên: multi-spawn×lane/fullhand; melee/ranged×air/ground/castle; status apply/expire cùngtick; heal×death; projectile×targetdeath; copy×levelcap/rarity; summon×resurrection; AoE×shield/armor; movement×knockback/lanechange. Phần ability chưaverified có testplan nhưng không fabricateoracle. [JSON test cases](../data/test-cases.json).
''')

write('04-development/deployment-plan.md','''
# Deployment Plan — chưa triển khai dịch vụ

Development chạy Windows/Laragon được nhưng sản phẩm không phụ thuộcPHP/Apache. Sau gate A, dùng frontend devserver, backend ASP.NET, PostgreSQL container; game files đặt theo architecture. Không cài hoặc mở port production ở lượt tài liệu này.

```mermaid
flowchart LR
  Browser -->|HTTPS assets| CDN
  Browser -->|HTTPS REST and WSS| Ingress
  Ingress --> API[API and realtime gateway]
  API --> Rooms[Match workers]
  API --> PG[(PostgreSQL)]
  API -. optional .-> Redis[(Queue and routing)]
  Rooms --> Storage[Private replay storage]
  Jobs[Outbox and scheduled jobs] --> PG
  API --> Telemetry[Metrics logs traces]
  Rooms --> Telemetry
```

## Environments và release pipeline

Local→CI ephemeral→staging→production. Separate DB/buckets/payment/provider credentials theoenv; không lấy prodplayers để testreward. Lock dependency versions, SBOM và assetlicense manifest. Build frontend/content immutablehash; build core/server container bằng pinned SDK/baseimage; không deploy `latest`. CI: validate content/docs→type/lint/build→unit/replay→integrationmigration→browser smoke→package+vulnerabilityreview. Performance trên dedicateddevices ngoài ephemeralCI đểgiảmnoise.

Staging: deployschemaexpand tương thíchngược, seed labaccounts khôngfakeoriginaldata, runfullmatch+wallet/drain/recoverycanary. Production: backup/checkrestoreage→applyexpandmigration→deploynewworkers→route newmatches to compatiblecore→drainoldrooms→watcherrors/latency/settlement→switchfrontendmanifest→latercontractmigration. Không kill room đang đấu chỉ vì deploy. Rooms pin core/content; artifacts cũ cần giữ cho live/replay. Canary là traffic/appchoice được duyệt khi tới release, chưa gửitrafficbâygiờ.

Singlehost ban đầu: ingress + API/match workers + jobs containers, managed hoặc separatePostgreSQL; backupraoff-host. Redis optional chỉ khi nhiềuworkers cần sharedqueue/routing. Sticky routing hoặc matchrouter đảm bảo connection vào ownerroom; SignalRbackplane không tự di chuyển actorstate. Linux container resource limits/health checks; readinessfalse khi CPU/backlogquácapacity, liveness chỉ phát hiện processkẹt, tránh restartloop khiDBchậm.

## Configuration/secrets

Public: APIbaseURL,protocolVersion,contenthash,buildID. Secrets: DBconnection,session signingkeys,OIDC/clientsecrets,webhookverifykeys,objectstoragecredentials,internalroomservicekeys. Secretstore/host-mounted secretfiles, leastprivilege vàrotation; không VITE_* secret, khônglogtokens. TLS/cookieSecure/HttpOnly/SameSite, CORS allowlist, CSRF cho cookie-auth mutations, authorizedwebsocketorigins. CDN immutable assets longcache; manifest shortTTL/ETag. ServiceWorker/PWA thêm sau để tránh staleprotocol với live room.

## Observability và response

Metrics: active/queuedmatches,queuewaitp95,roomtickp95/p99,backlog,entities,serializationbytes,snapshotgap,resyncrate,commandrejectbyreason,reconnectsuccess,resultpendingage,outboxlag,ledgerreconcileerrors,DBlatency/pool,OOM/clientcrash. Logs: correlation matchId/commandId/receiptId,versions,hostepoch; không privatehand/seed hayPII mặcđịnh. Usererrorreport có consent và bounded attachment; source maps private.

Alert thresholds Proposed: tickp99>100ms5phút; resultpending>30s; any ledgerimbalance/duplicatedbusinessgrant; error5xx>1%5phút; DBstorage>80%; backupfailed; crashrate doubled versusacceptedbaseline. Severity/quietwindow/on-callroute xác địnhtrước publiclaunch. Runbooks: disable newqueue,drain,voidunrecoverablerooms,retrysafeoutbox,pausepurchases,restorepaymentreceipts. Không manualupdate balance thiếuledger.

## Backup, retention, rollback

Planning targets progressionledger RPO≤5phút/RTO≤60phút cần PITR/WAL/offsitebackup vàrestoretestthực; nightlydumpmộtmình không đạtRPO5phút. Replaycache có thểRPO24h; in-progressmatchcrashvoid làdeviationđãcôngbố nếu checkpoint chưađạt. Monthlyrestore vào isolatedDB; verifycounts,hashes,FK,wallet=sumledger baseline,latestsettlement,login/replayaccess. Không giảrestorepass từ backupjob thànhcông.

Retention Proposed: private replay30ngày; detailed transportlog7ngày; aggregate metrics90ngày; economicreceipt theo yêu cầu phát hành/provider đãreview; người dùng deleteaccount cần thực hiệnanonymization/retentionđúngpolicy, khôngtựxóaauditđangcần. Quy địnhpháp lýcụthểngoàiphạmvinghiêncứucơchếnày.

Rollback frontendmanifest/serverrouting vềbuild compatible; migrationexpand giữschemascũ. Không rollback destructiveDB migration bằngdownscriptmù; restore/PITR cóincidentplan vàreconcilepayments xảyra saurestorepoint. Contentrollback ảnhhưởngmatchmới, khôngchange stats củaroomđangchạy. Releaseapproval cuối cần konkret commit/artifact/capacity/parityreport khi phầnmềmđãcó; chưa có productiondeployment hoặcclaim SLA trong hồsơ này.
''')

if __name__=='__main__':print('Test, deployment and supplementary specs generated')
