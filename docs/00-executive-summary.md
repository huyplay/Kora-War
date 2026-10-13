# Castle Crush — kết quả nghiên cứu và hướng triển khai web

Hồ sơ ngày **13/10/2026** đã được tạo đủ cấu trúc yêu cầu, nhưng **chưa đủ bằng chứng để cam kết specification100% hoặc functional parity100%**. Không có game code được viết. Các luật công khai đã tách khỏi đề xuấtweb;14researchgaps còn mở, gồm timing/collision/target/tie-break, roster/stats, live modes/NFT và benchmark. Tiêu chuẩn “không phải tự đoán cơ chế quan trọng” chưa đạt cho toàn game; [gap register](05-parity/research-gaps.md) ghi artifact cần bổ sung để đạt.

## Game thực sự hoạt động thế nào theo nguồn

Castle Crush của Wildlife là card battler realtime1v1 với **ba lane, hai thành có HP chung trên cả ba lane**. Unit tự tiến, gặp eligible target trong tầm thì đánh; tới cuối lane đánh thành, thành không tự phản công theo whitepaper. Phá thành thắng. Support mô tả tựdamage thành tăng dần sau4phút; simultaneouslethal/tie-break chưa công khai. [Whitepaper](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) tr.3–8; [Overtime](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12694401083537-Overtime).

Deck mới7lá, mở14ở200trophy; cap2bản/card thường và1Legendary,5deckslots. Openinghand5/cap6; draw theo chu kỳ shuffledeck, tayfull làm mấtlá; emptyhand có paid draw5mana. Capacity từ2 lên12; ExtraCrystal ởcap chuyển thành rútcard. DoubleCards và nhịp tăngmana/rútbài có mâu thuẫn giữa nguồn lịch sử nên chưa nhập runtime defaults. [Deck](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684724253329-Building-a-battle-deck), [Draw](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling), [Double](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758851089-Double-cards), [Mana](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758284689-Mana-and-Crystals).

iOS storefrontUS/API hiển thị **6.8.0 ngày24/08/2026**, releaseDate09/11/2016; Android package Wildlife cập nhật19/08/2026 nhưng versionName chưa xác minh. Listing/support còn truycập được; login/PvP live chưa thử. Enginegốc và mesh/sprite runtime vẫnUnknown. [AppStore](https://apps.apple.com/us/app/castle-crush-clash-cards-game/id1060704812), [AppleLookup](https://itunes.apple.com/lookup?id=1060704812&country=us), [GooglePlay](https://play.google.com/store/apps/details?id=com.tfgco.games.strategy.free.castlecrush&hl=en).

## Quy mô và phần phải thiết kế mới

Inventory có **95hạng mục khảo sát/8nhóm**, 70Confirmed theo phạm vi tài liệu, không đồng nghĩa đủtham số hoặc cònlive. Có25screen/workflows và20mechanism breakdowns. Đã ghi **66tên thẻ ứng viên/68thẻ lịch sử**; còn2tên chưađịnhdanh và rosterhiện tại chưađóng. Mỗi record có trường được yêu cầu, source và nullreason; canonical numericstats không được giả lập từwiki mâu thuẫn. [Inventory](02-feature-specs/feature-inventory.md), [Catalog](01-research/card-catalog.md).

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
