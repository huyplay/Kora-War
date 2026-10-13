from build_final import *

behaviors={
'Battle':[
'Ba lane nối hai phía; kích thước tương đối chưa đo.',
'Một pool HP cho mỗi thành, nhận sát thương từ cả ba lane.',
'Thành không tự phòng thủ bằng đòn tấn công theo whitepaper.',
'Phá thành đối phương thắng; simultaneous lethal chưa rõ.',
'Wiki nói vùng đặt tiến theo quân tới nửa sân; chưa có live evidence.',
'Unit tự tiến theo lane về phía thành địch.',
'Whitepaper nói tấn công đối tượng đầu vào tầm; tie/retarget chưa rõ.',
'Store mô tả melee và ranged; range/cooldown từng thẻ thiếu.',
'Chưa xác minh projectile speed, homing, hit tick và windup.',
'Chưa xác minh body blocking, overlap, retarget và collision radius.',
'Wiki mô tả sát thương vùng; shape/radius/falloff chưa rõ.',
'Store có healer; amount/priority/overheal/death interaction chưa rõ.',
'Support có hiệu ứng tăng/giới hạn level và Blizzard duration; bảng status thiếu.',
'Knockback/lane change có đầu mối cộng đồng; điều kiện chưa verified.',
'Wiki Ice Elemental nhắc freeze; duration/stacking thiếu.',
'Tên Protection/Fortify không đủ xác nhận công thức shield/armor.',
'Wiki mô tả summon và clone nhiều lane; stats/timing chưa rõ.',
'Metamorph copy card ngẫu nhiên trên field, level theo Metamorph.',
'Có tên Resurrection/Phoenix; death trigger/revive ordering chưa đo.',
'Sau4phút thành tự mất máu tăng dần; cadence/curve chưa biết.',
'Whitepaper nói không có hòa; luật khi hai thành cùng0HP chưa biết.'],
'Cards':[
'New deck7 không trùng; đạt200trophy mở deck14.',
'Deck14 tối đa2 bản một non-Legendary và1 Legendary.',
'Lưu5decks; trận dùng deck đang chọn.',
'Opening hand5, hand cap6.',
'Mỗi14 lá là một permutation của deck rồi shuffle chu kỳ tiếp.',
'Tay đầy làm mất lá định rút; double overflow cursor chưa rõ.',
'Tay rỗng có thể tiêu5mana để rút một extra card.',
'Sau5draws chuyển nhận2/cycle, tay5 chỉ nhận1; trigger counting còn mâu thuẫn.',
'Capacity2→12, thêm crystal theo draw; Extra Crystal ở12 rút card.',
'Discard chưa xác minh thao tác, phí và ảnh hưởng cycle.',
'Có collection/card detail/upgrade; toàn bộ UI states chưa capture.',
'Common, Rare, Epic, Legendary; tier NFT là trục khác.',
'68thẻ được tài liệu lịch sử nêu; chưa chứng minh roster6.8.0.',
'Canonical cost/HP/damage/range/scaling chưa có dữ liệu live đủ.',
'Upgrade cần copies+gold; tăng HP/attack troops, Meteor damage, Blizzard duration.'],
'Player':[
'Có tutorial trước khi xem PlayerID trong Settings.',
'Progress có trước liên kết provider, guest lifecycle chỉ suy luận.',
'Có restore qua provider; cross-platform theo hướng dẫn Facebook lịch sử.',
'PlayerID xem sau tutorial qua Settings.',
'Support nói không đổi tên đã đặt.',
'Flag theo locale, không phải lựa chọn quốc tịch được xác minh.',
'Chưa xác minh avatar/cosmetic customization.',
'Nâng thẻ tạo XP, XP liên quan level người chơi; bảng thiếu.',
'Whitepaper nói castle HP tăng10%/level; base/rounding thiếu.',
'Chưa biết toàn bộ statistics hiển thị.',
'Settings có Delete Account, confirmation chờ15s và xóa không khôi phục.'],
'Progression':[
'Thắng đối thủ ngang trophy +30; chênh trophy điều chỉnh, formula thiếu.',
'Trophy mở castle và pool thẻ/phần thưởng; bảng ngưỡng hiện tại thiếu.',
'Support liệt kê league từ3800 đến7000trophy.',
'Season3tuần; reset/reward có mô tả, formula đầy đủ thiếu.',
'Forge có +1level tạm24h theo crystal phù hợp.',
'Forge mở cap vĩnh viễn; vẫn cần copies+gold để nâng thực tế.',
'Store quảng bá bảng xếp hạng; tie/update cadence thiếu.',
'Support clan có chia sẻ replay; full history/private visibility chưa rõ.',
'Chưa xác minh achievements nội bộ, không suy từ platform badges.'],
'Economy':[
'Gold dùng nâng thẻ, tạo clan và có phần thưởng.',
'Gems dùng một số shop/continue/perks; giá phụ thuộc sản phẩm/vùng.',
'Forge crystals gồm rarity và magic; khác mana crystals.',
'Có shop cards/chests; Legendary tại castle cuối theo support.',
'Whitepaper có4battle chest slots, unlock1/lần, Silver3h.',
'Free Chest4h, Victory Chest24h; mỗi loại stack2.',
'Có giới hạn daily win coins, giá trị/reset timezone chưa biết.',
'Piggy tích lũy qua chest; đầy mở bằng gems trong24h, không carry overflow.',
'Capsule từ Victory Chest, tích tiêu gems trong24h, đầy mở miễn phí.',
'Có IAP/subscription perks theo support; entitlement live chưa thử.',
'Subscription có shop reshuffle và chest perks; phạm vi cần đối chiếu.',
'Chưa có bảng giá/loot odds/reset/current caps đủ để triển khai exact.'],
'Multiplayer':[
'Realtime online1v1 được store mô tả; live server chưa thử.',
'Trophy là cơ sở ghép trận; expansion/latency/bot-fill chưa công khai.',
'Clan invitation friendly; không gold/trophy/chest; invite pending chặn queue.',
'Chưa tìm bằng chứng standalone casual queue.',
'Chưa có reconnect/forfeit/timeouts của bản gốc.',
'Chưa xác minh surrender/rematch controls hoặc rules.',
'Ranked result liên quan trophy/reward; grant algorithm chưa công khai.',
'Practice đấu Trainer theo trophy, không trophy/chest.',
'Không có bằng chứng selector độ khó bot.',
'Không công khai scoring/policy/decision rate của bot.'],
'Social/LiveOps':[
'Level3 mở clan, tạo1000gold, open/invite/closed và roles.',
'Có clan chat; history/moderation/rate limits chưa rõ.',
'Donate card đổi gold; quota và XP table thiếu.',
'Có top clans; score aggregation/tie chưa rõ.',
'Chưa xác minh friend list riêng ngoài clan.',
'Castle4 mở daily mode; một mode/ngày, first-win reward, chuỗi7ngày.',
'Grand/Master,10rounds, continue window1h; mode level9/7/4/1.',
'Sticker hiển thị3s, tối đa5 rồi khoảng2s throttle; Practice không dùng.',
'Chưa xác minh daily/weekly quests riêng.',
'Chưa xác minh battle pass.',
'Chưa xác minh push notification permission/settings/trigger.',
'Support Practice định vị icon cạnh inbox; nội dung inbox chưa rõ.'],
'Ascension':[
'Tài liệu mô tả Ascended/Mythical/Founder; tình trạng2026 Unknown.',
'Tier NFT có chỉ số/skin/animation đặc biệt, không chỉ cosmetic.',
'AP/ACS rewards lịch sử; ví dụ support có bất thường, không dùng formula.',
'NFT upgrade1–5 tăng reward rate, không tăng combat stats theo support.',
'Có tài liệu marketplace/acquisition/rent/mint; hiện hành chưa xác minh.']}
spec_map={'Battle':'combat-system','Cards':'card-system','Player':'progression','Progression':'progression','Economy':'economy','Multiplayer':'multiplayer','Social/LiveOps':'screen-flow','Ascension':'economy'}
plan_map={'Battle':'Core fixed-step + ability policies; gate U03/U05/U06', 'Cards':'Catalog versioned + deck/hand reducers; gate U02/U04', 'Player':'Identity/progress/UI + domain constraints; gate U01/U07', 'Progression':'Lookup tables + transactional progression; gate U07', 'Economy':'Server ledger/chest/offer policy; gate U07/U09', 'Multiplayer':'Authoritative rooms + command receipts; gate U01/U11', 'Social/LiveOps':'Clan/mode workflows theo config; gate U08', 'Ascension':'Adapter tách tier/combat/ownership; chặn production tới U09'}
parity=[]
for group, rows in groups.items():
    fs=[f for f in features if f['group']==group]
    assert len(fs)==len(behaviors[group]),group
    for f, behavior in zip(fs,behaviors[group]):
        parity.append(dict(feature_id=f['id'],name=f['name'],original_behavior=behavior,confidence=f['confidence'],evidence_ids=f['source_ids'],web_design=plan_map[group],spec='../02-feature-specs/'+spec_map[group]+'.md',priority=f['priority'],implementation='Not started',verified_parity='Not tested',research_ready=False,live_verified=False))
dump('data/parity-matrix.json',parity)
counts=Counter(f['confidence'] for f in features)
covered=sum(bool(f['source_ids']) for f in features)
write('05-parity/original-vs-web.md',f'''
# Functional parity matrix

Mỗi dòng là một hạng mục khảo sát; một số dòng là câu hỏi chưa xác minh tồn tại. Tổng **{len(parity)}**, không phải xác nhận game có đúng95features. Confidence là phạm vi nguồn, tách với độ đầy đủ specification và current build. Chưa có implementation: **0 implemented,0 verified behavior parity**. Full baseline denominator chưa đóng, nên không công bố phần trăm “toàn game”.

| Metric | Cách tính | Hiện tại |
|---|---|---|
| Evidence-linked inventory | Rows có ít nhất một source /95 | {covered}/95 ({covered/95:.1%}); chỉ là chỉ số phụ, không phải research complete |
| Research coverage | Atomic requirements có source đúng baseline + parameters + edge rules + oracle / tổng requirements baseline | N/A: denominator và live oracle chưa đóng; mọi feature research_ready=false theo gate nghiêm |
| Functional implementation coverage | Implemented accepted requirements / verified in-scope requirements |0 implemented;0/95 tracked rows, baseline-wide chưa tính |
| Verified behavior parity | Implemented requirements pass differential original/web tests / verified in-scope requirements |0 passed;0/95 tracked rows, baseline-wide chưa tính |

Confidence inventory: {', '.join(k+'='+str(counts[k]) for k in ['Confirmed','Strongly Inferred','Unverified','Unknown'])}. Confirmed **không** có nghĩa entire behavior đượcđặc tảđủ hoặc còn live. Trạng thái web hiện tại luôn Not started/Not tested. Mỗi feature sau này được tách requirement con và evidence test, không lấy một test property làm pass cảmodule.

| Feature | Original behavior / phạm vi | Evidence | Web implementation plan | Priority | Status |
|---|---|---|---|---|---|
'''+ '\n'.join(f"| {p['feature_id']} {p['name']} | {p['original_behavior']} ({p['confidence']}) | {', '.join(link(s) for s in p['evidence_ids']) or 'Unknown'} | [{p['web_design']}]({p['spec']}) | {p['priority']} | Not started; Not tested |" for p in parity)+'''

Visual similarity chấm riêng: lane readability, team/target identification, silhouette scale, semantic animation timing, UI task completion và audio feedback. Asset mới không thể dùng pixel-diff với tài sản gốc làm duy nhất oracle. Không có số “giống95%” cảm tính trong acceptance.
''')

gaps=json.loads((DOC/'data/research-gaps.json').read_text(encoding='utf8'))
gap_deliverables={
'U01':('R01','App/build manifest + login/PvP evidence; inaccessible cũng phải có log'),
'U02':('R02','Timeline10matches: initial/cycle cursor,interval,mana,cap,double,overflow,paid/Extra effects'),
'U03':('R03','Deployment valid polygons/frontier policy theo3lanes và state transitions'),
'U04':('R04/R05/E06','Roster reconciled + level tables + target/ability params cho từng thẻ'),
'U05':('R06','Target/collision/hit/projectile rules và equal-time traces'),
'U06':('R07','OT damage curve/cadence + winner precedence có tái lập'),
'U07':('R09/E01','XP/cost/copies/trophy/drop/reset versioned tables; không suy odds từ vài mẫu'),
'U08':('R09/F06','Feature live/historical/removed evidence; full mode schedule + fees/rewards'),
'U09':('R09/X01','Thông báo gốc + current UI xác định combat tiers và ownership/ACS status'),
'U10':('R10','Capture timestamps/measurements cho camera/layout/animation; mesh vẫn Unknown nếu chỉ video'),
'U11':('R08/D05','Disconnect experiment traces; phân biệt original policy và web fallback'),
'U12':('A03/G01','Renderer/device benchmark raw CSV và chọn ADR bằng thresholds'),
'U13':('C01','Published algorithm nếu có; nếu không thì replacement policy+behavior comparison'),
'U14':('A03/F07/G05','License ledger mỗi code/asset,permission evidence,attribution')}
write('05-parity/research-gaps.md','''
# Research gaps và bàn giao đo bổ sung

Tất cả14gap cònOpen. Hồ sơ đã xác địnhunknown quantrọng nhưng chưa đạt tiêu chuẩn specification100% implementation-ready của toàn bộ game. Đây là giới hạn thực tế của evidence công khai đọc được, không phải mặc định suy đoán để tiếp tục code.

| Gap | Priority | Vì sao chặn | Cách thu bằng chứng | Task / artifact để đóng |
|---|---|---|---|---|
'''+ '\n'.join(f"| {g['id']} {g['topic']} | {g['priority']} | {g['reason']} | {g['method']} | {gap_deliverables[g['id']][0]}: {gap_deliverables[g['id']][1]} |" for g in gaps)+'''

Mẫu observation: `observationId,sourceURL_or_localAuthorizedCapture,build,platform,OS,locale,mode,playerLevel,deck[],cardLevels,tier,forge,castleHP,recordedAt,timecodeStart,timecodeEnd,frameRate,action,observedResult,errorBound,repetitions,confidence,reviewer`. Video chưa xem có `timecodeStart=null`, không được cite như đã xem. Replay sourcecode clone chỉ chứng minh clone, không chứng minh game gốc.

Quan sát bằng thao tác hợp pháp, không lấy private source/token/account của người khác. Không cần giải mã app/asset hay mua NFT để nghiên cứu. Nếu chỉ đo black-box được behavior, engine/camera projection nội bộ vẫn có thểUnknown; functional-equivalent không bắt buộc cùng implementation.

Close gap chỉ khi evidence nhất quán với baseline hoặc explicitdeviation đượcđặt tên. Không đổi status thànhClosed chỉ vì đã viết pseudocode. Một số gap như internalAI/engine có thể không bao giờ biết chính xác: chốt requirement observable+replacement algorithm được đánh nhãn, không tuyên bố cùng source/algorithm.
''')

write('05-parity/acceptance-criteria.md','''
# Acceptance criteria và release claims

Research dossier hoàn thành về cấu trúc khi đủ42file Markdown theo yêu cầu, sources có URL/date/access,95inventoryrows có confidence, cardunknown có nullreason,7repo có SHA/weightedscore/license, đầy đủspec/diagram/backlog/testplan. **Điều đó chưa chứng minh nghiên cứu đủ để implement100%gamegốc.** Mỗi gate bên dưới cần report thực hiện riêng.

| Gate | Điều kiện pass | Bằng chứng bắt buộc |
|---|---|---|
| G-R baseline | Build/mode/timeframe và mandatory feature set đã đóng; allP0 của slice có rules/parameters/edgeoracle | Capture manifest, resolved conflict log, source provenance |
| G-C catalog | Mọi card trong slice có stats/units/levels/abilities/targets/costs đủ; missing card không được silently default | Validator report + reviewed observed tables |
| G-S sim | Fixed-step deterministic, event ordering/tie rules known; no FPS-dependent result | Golden traces, runtime hash comparison, T/N reports |
| G-V playable MVP | First-time touch flow→full battle→result→retry; subset và labdeviations hiện rõ | Browser build + recorded E2E + crash/leak checks |
| G-P PvP | Trusted server toàn combat; auth/private views; reconnect/resync; result một lần | Two-client network/security/concurrency reports |
| G-E economy | No negative balances/double rewards; authoritative prices/progression; exact verified tables | Ledger reconciliation + fault injection + contentreview |
| G-F full functionality | Mọi verified mandatory requirement implemented; account/meta/social/modes trong baseline đủ | Requirement-level trace matrix, no silent omissions |
| G-M mobile/performance | B0/device matrix đạt target tại quality đã công bố; no leaked contexts/thermalcollapse | Raw benchmark artifacts; regression baseline |
| G-O operations | Backup restore/migration/rollback/drain/rate-limit/monitoring hoạt động | Rehearsal logs, measured capacity/RPO/RTO |
| G-L assets | Toàn bộ code/asset có quyền sử dụng phù hợp, nhận diện phát hành riêng | License manifest + attribution + original asset sources |
| G-100 parity claim | Denominator fixed, mọi observable required behavior đã pass original-vs-web, zero opencriticalgap | Independent review + repeatable differential fixtures |

Status progression: Not started→In progress→Implemented (self tests pass)→Verified (differential oracle pass). Blocked research, Not applicable và Intentional deviation là trạng thái riêng; deviation không tínhpass. Removedfeature cần official/currentevidence, không tự xóa denominator vì khó làm. Historicalbaseline đượcphép nếu đặt tên rõ và người dùng hiểu không phải latest.

Quy tắc kiểm chứng: số nguyên damage/cardcount/mana exact; timing/geometry tolerance được thiết lập từ đo vàresolution, ghi trước khi test; fail nếu đổiwinner/validaction/order. Visualmatch đánh giá readability/timing/newidentity, không buộccopytrái phép. QA saupatch phải tái verify impactedrules/cards,không giữ nhãnVerified từbaselinecũ.

Hiện tại: structural docs có thể kiểm tra bằng `python scripts/validate_docs.py`; game gates G-R..G-100 **chưa pass**. Không gọi library build thànhcông là browserplayable, không gọi selectedfileaudit là securityaudit, không gọichưa cóbugreport làbugfree.
''')

for s in sources:
    if s['id'].startswith('SUP-'):
        s['access']='API metadata/body retrieved; cited rules reviewed'
dump('data/source-registry.json',sources)
write('01-research/sources.md',f'''
# Source Registry

Ngày khảo sát **13/10/2026**, nguồn truy cập công khai. Có **{len(sources)} source records**, gồm56bài help center, storefront/API,whitepaper, community candidates, technicaldocs và7repo pincommit. Đây là số nguồn đăng ký, không phải số nguồn độc lập xác nhận mỗi claim.

Thứ bậc: bản game hợp pháp có build/timestamp→announcement/changelog và support đúng thời kỳ→tài liệu chính thức lịch sử→wiki/community/video đúngbuild→suy luận. Trong lượt này chưa chạy live app và chưa xem video gameplay có timecode; các video chỉ là candidate metadata, **không dùng để chứng minh timing/rules**. Wiki trực tiếp bịrobots, đã đọc search-index text và ghi rõ. API article updated_at không tự chứng minh luật thay đổi ngàyđó.

Whitepaper25trang tải trực tiếp và trích text; đãrender/xem page4 battle vàtranglicense củaUnityRoyale để kiểm tra trựcquan. Store marketing screenshot đã xem nhưng không dùngđoFOV. Tài liệu PDF gốc/asset không được đónggói làm tài sảnphát hành. Publicreport chỉ có paraphrase vàlink; `.research/` là cache local bịgitignore.

| ID | Nguồn | Loại | Published/updated theo nguồn | Access / giới hạn | Phạm vi sử dụng |
|---|---|---|---|---|---|
'''+ '\n'.join(f"| `{s['id']}` | [{s['title']}]({s['url']}) | {s['kind']} | {s['published_or_updated'] or 'Không rõ / xem nội dung'} | {s['access']} | {s['scope']} |" for s in sources)+'''

## Những điều không được suy từ nguồn

- Store còn listing/update không chứng minh serverPvP accessible hoặc NFTmarketplace hiện hành.
- Whitepaper2022 và support2023 không tự đại diện6.8.0; scope đượcghi tại mỗi claim.
- Một repoUnity clone không chứng minh engineCastleCrush. GitHubstars không chứng minh maturity.
- Video title/thumbnail chưa xem không cung cấp timestamp. Không bịa timecode để lấp yêu cầu.
- README “multiplayer” không đủ: đã đọc authority path hoặc relay code và phân biệt runtime chưatest.

Các URL repos chính đượcpin SHA trong [GitHub research](../03-technical-design/github-research.md). JSON source registry hỗ trợ kiểmtra sourceIDs. Nguồn engine là bằng chứng API/capabilities, không thay benchmark trên thiết bị mục tiêu.
''')

write('00-executive-summary.md',f'''
# Castle Crush — kết quả nghiên cứu và hướng triển khai web

Hồ sơ ngày **13/10/2026** đã được tạo đủ cấu trúc yêu cầu, nhưng **chưa đủ bằng chứng để cam kết specification100% hoặc functional parity100%**. Không có game code được viết. Các luật công khai đã tách khỏi đề xuấtweb;14researchgaps còn mở, gồm timing/collision/target/tie-break, roster/stats, live modes/NFT và benchmark. Tiêu chuẩn “không phải tự đoán cơ chế quan trọng” chưa đạt cho toàn game; [gap register](05-parity/research-gaps.md) ghi artifact cần bổ sung để đạt.

## Game thực sự hoạt động thế nào theo nguồn

Castle Crush của Wildlife là card battler realtime1v1 với **ba lane, hai thành có HP chung trên cả ba lane**. Unit tự tiến, gặp eligible target trong tầm thì đánh; tới cuối lane đánh thành, thành không tự phản công theo whitepaper. Phá thành thắng. Support mô tả tựdamage thành tăng dần sau4phút; simultaneouslethal/tie-break chưa công khai. [Whitepaper](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) tr.3–8; [Overtime]({sup(12694401083537)}).

Deck mới7lá, mở14ở200trophy; cap2bản/card thường và1Legendary,5deckslots. Openinghand5/cap6; draw theo chu kỳ shuffledeck, tayfull làm mấtlá; emptyhand có paid draw5mana. Capacity từ2 lên12; ExtraCrystal ởcap chuyển thành rútcard. DoubleCards và nhịp tăngmana/rútbài có mâu thuẫn giữa nguồn lịch sử nên chưa nhập runtime defaults. [Deck]({sup(12684724253329)}), [Draw]({sup(12684698308625)}), [Double]({sup(12684758851089)}), [Mana]({sup(12684758284689)}).

iOS storefrontUS/API hiển thị **6.8.0 ngày24/08/2026**, releaseDate09/11/2016; Android package Wildlife cập nhật19/08/2026 nhưng versionName chưa xác minh. Listing/support còn truycập được; login/PvP live chưa thử. Enginegốc và mesh/sprite runtime vẫnUnknown. [AppStore](https://apps.apple.com/us/app/castle-crush-clash-cards-game/id1060704812), [AppleLookup](https://itunes.apple.com/lookup?id=1060704812&country=us), [GooglePlay](https://play.google.com/store/apps/details?id=com.tfgco.games.strategy.free.castlecrush&hl=en).

## Quy mô và phần phải thiết kế mới

Inventory có **95hạng mục khảo sát/8nhóm**, {counts['Confirmed']}Confirmed theo phạm vi tài liệu, không đồng nghĩa đủtham số hoặc cònlive. Có25screen/workflows và20mechanism breakdowns. Đã ghi **66tên thẻ ứng viên/68thẻ lịch sử**; còn2tên chưađịnhdanh và rosterhiện tại chưađóng. Mỗi record có trường được yêu cầu, source và nullreason; canonical numericstats không được giả lập từwiki mâu thuẫn. [Inventory](02-feature-specs/feature-inventory.md), [Catalog](01-research/card-catalog.md).

Có thể nghiên cứu trực tiếp qua support/whitepaper: deck/hand, một số resource rules, progression/chests/Forge, Practice/friendly, clan và mode lịch sử. Phải đo thực nghiệm: vùngspawn,targetpriority,hit/collision,statusinteraction,cardstats mọi level,OTcurve vàmàn hìnhcurrent. AI nội bộ, server stack và networktimeouts không công khai: web cần thiết kếthay thế, đánh nhãnProposed vàđoobservablebehavior. Không thể suy gameplayCastleCrush từClashRoyaleclone.

## Kiến trúc và khả năng tương đương trên web

Ứng viên ưu tiên: **React+TypeScript UI, Babylon.js camera cố định2.5D, ASP.NETCore/C# authoritative simulation, SignalR/WSS, PostgreSQL**, Redis khi scale cần. Babylon là lựa chọn có điều kiện vì các tiện ích scene/animation phù hợpworkflowgame; chưa có benchmark để tuyên bố nhanhhơnThree. Three.js và Phaser atlas là đối chứng bắtbuộc ởspike B0; UnityWeb hiện cóhỗtrợ mobile trongdocs mới nhưng payload/workflow/license cầnđo, không bịloại bằnggiảđịnhcũ. [ADR](03-technical-design/tech-stack-evaluation.md), [Benchmarkplan](03-technical-design/performance-plan.md).

Simulation lane scalar/fixed-step tách renderer, cùngcore offlineWASM/server; nếu WASM không đạtbudget/effortgate thì xét sharedTS+Node/Colyseus đểtránhmaintainhaiengine. Server kiểmtra commands,mana,spawn,combat,winner,rewards; client input/render/interpolate. AI utility bot dùngcùngvalidatorkhôngđọcbàiẩn, difficultyweb làthiếtkếmới. [Simulation](03-technical-design/simulation-engine.md), [AI](02-feature-specs/ai-opponent.md), [PvP](03-technical-design/multiplayer-architecture.md).

Đồhọa2.5D/model3D hoặc atlas prerender đều có thể diễn tả tương đương lane/readability/timing; mứcgiốnghìnhảnh chưađượcđo. Dùngassets/nhậndiệnriêng; khônghứapixel-identical. Có16module: Identity, PlayerProgress, ContentCatalog, Collection, Decks, Matchmaking, BattleSimulation, RealtimeGateway, AI, ResultsRewards, WalletShopChests, ForgeSeasons, ClansChatDonations, ModesTournaments, ReplayTelemetry, WebPresentation.

Backend cần accounts/session/deck ownership,versionedcontent,roomactors,matchmaking,transactionalledger,rewardidempotency,outbox vàjobs. PostgreSQL lưuprogression/collection/results/economy/clans; combatstate nằmRAM;replayởprivateobjectstorage. ERD/schema/API vàfailurecases đãđượcđặc tả; quest/friend/pass khôngđượcgánlàtínhnănggốc khi chưaevidence. [DB](03-technical-design/database-design.md), [API](03-technical-design/api-contracts.md).

## Reuse, effort và kiểm chứng

Đã review7repo theo SHA và trọngsố yêu cầu. **ClashBattle-Server67/100, Crown-Clash58/100** là hai referenceMITđángxem; khôngrepo nàođủfoundationnguyênkhối. Crown build46modules/2365KiB vàsyntaxcheckpass,chưabrowserplaytest. ClashBattle-Server cóauthoritativecodepath,chưaload/securitytested. UnityRoyale assetlicense cóhạnchếnoncommercial/nondistribution; repo cònlạithiếulicensehoặcchỉrelay/clienthost. [Bảngđánhgiá](03-technical-design/github-research.md).

Lộtrình gồm **R+7phase A–G**, chia20verticalslices; base210–355person-days, contingency30% thành273–462ngày (**55–93tuần mộtdev30giờtậptrung/tuần**). MVP offline subset17–29tuần; PvPplayable26–43tuần; beta48–81tuần. Khôngbao gồmnhánhmarketplace/NFTchưachốt, artoutsourcing/chờaccess hoặcvận hànhdài hạn. Đây làestimatebấtđịnhcao,khônglời hứatiến độ. [Roadmap](04-development/roadmap.md), [Backlog](04-development/task-backlog.md).

Rủirochi phối: thiếuevidencecard/combat,currentbaseline/NFT,assetthroughput/license,determinism/sync,economyduplicategrant,mobileperformance,servercost vàscopequálớn chomộtdeveloper. Đónggates theophase,khônglấpunknown bằngdefault. Chưabắtđầuproductiongame; tasktiếptheolàR01/R02–R08vàbenchmarksyntheticđượcgắnnhãnsau researchtriage.

Đo3chỉsố riêng: researchcoverage cấpatomicrequirement,implementationcoverage,verifiedbehaviorparity. Evidence-linkedrows khôngphảiresearchcompletion. Hiện0implemented và0verified; **34documentedbattlecases+14web/networkcases** chỉmớilàtestplan. Sau nàymỗi claim cầnoriginalcapture+webtrace,đúngbuild/ruleset,mứcsa sốđãđịnhtrước vàindependentreview. [Paritymatrix](05-parity/original-vs-web.md), [Acceptance](05-parity/acceptance-criteria.md).
''')

sections=[('Nghiên cứu','01-research'),('Đặc tả tính năng','02-feature-specs'),('Thiết kế kỹ thuật','03-technical-design'),('Kế hoạch phát triển','04-development'),('Đối chiếu parity','05-parity')]
toc=[]
for label,folder in sections:
    toc.append('## '+label+'\n\n'+'\n'.join(f'- [{p.stem}]({folder}/{p.name})' for p in sorted((DOC/folder).glob('*.md'))))
write('README.md',f'''
# Castle Crush research & web reimplementation dossier

**Ngày baseline nghiên cứu:13/10/2026. Ngôn ngữ: tiếng Việt. Trạng thái: hồ sơ nghiên cứu/thiết kế; chưa có game implementation.**

Bắt đầu bằng [Executive summary](00-executive-summary.md), [unknowns](01-research/unknowns-and-assumptions.md) và [roadmap](04-development/roadmap.md). Có42file Markdown theo cây yêu cầu, dữ liệuJSON để kiểmtra tựđộng,95hạngmụckhảosát,66candidatecards,7repođánhgiá,34battlecasesvà14caseweb/network. Đây khôngphảichứngnhận100%specification-ready:14gapcònOpen, chưa cólive6.8.0test/videotimestamp/enginebenchmark.

`Confirmed`, `Strongly Inferred`, `Unverified`, `Unknown` nói vềbằngchứng của gamegốc. `Proposed` làthiết kếwebmới. `Not started`, `Implemented`, `Verified`, `Blocked research` làtrạngtháicôngviệc; khôngđồngnhấtvớiconfidence. Historicalclaim khôngtựthànhcurrentfeature. Mọi publishedparityclaimphảiqua [acceptance](05-parity/acceptance-criteria.md).

## Cách dùng để bắt đầu triển khai

1. Chốt baseline/live access và hoàn tất evidence tasksR01–R10 cho slice. Giữ nguyênnull khi thiếu dữliệu.
2. Chạy renderer/WASMspikes theo ADR; chọnenginebằngreport, khôngtheothóiquen.
3. Thực hiện [backlog](04-development/task-backlog.md) theo dependencies,8–12verifiedcards trước, mở rộngdần.
4. MỗiPR cập nhật requirement→source→code→test→parity. Khôngcopy tên/asset thươngmại sangbảnpháthành.
5. Trướcpublicrelease chốt serverauthority,ledger/recovery,mobile/ops/assetrighs vàfullscopecoverage.

'''+ '\n\n'.join(toc)+'''

## Dữ liệu và kiểm tra

- [Source registry](data/source-registry.json), [feature inventory](data/feature-inventory.json), [card catalog](data/card-catalog.json).
- [Screen inventory](data/screen-inventory.json), [research gaps](data/research-gaps.json), [GitHub snapshots](data/github-repositories.json).
- [Backlog](data/task-backlog.json), [test cases](data/test-cases.json), [parity matrix](data/parity-matrix.json), [command schema](data/command.schema.json).
- Chạy từ root: `python scripts/validate_docs.py`. Kiểmtra cấu trúc,linksrelative,sourceIDs,nullreasons,IDs/dependencies vàtraceability; khôngthay gametests hoặcwebURLavailability.

Các script `build_*.py` là authoring scripts dùng cachelocal `.research/` để cậpnhậthồsơ; chạy `python scripts/build_index.py` tạo cảchuỗi. Cache đãgitignore, khôngđónggói nội dungnguồn/asset đểpháthành. Khôngcầncache đểđọcdocs hay chạy validator. SourceJSONgiữprovenance,khônglưu toànvăn hỗtrợ/wiki.
''')

if __name__=='__main__':print(f'Complete dossier: {len(list(DOC.rglob("*.md")))} Markdown files; {len(sources)} sources; {len(features)} features; {len(cards)} card candidates')
