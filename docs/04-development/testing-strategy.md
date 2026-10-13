# Test Strategy

**34 tình huống battle dựa trên thuộc tính documented,14 tình huống engine/network/security đề xuất; chưa chạy test game nào vì chưa có implementation.** Expected property có thể được mô tả từ nguồn dù expected numeric trace chưa đủ; không biến một property pass thành cảfeature đạtparity. Các testcase cần cardfixture hoặc live timing vẫn Blocked oracle cho phầnchưađo.

## Battle cases có nguồn

Fixture chung: pin build/mode/ruleset/core/content, hai decks/levels/castleHP/Forge/tier, seed cho engineweb và timelinequan sát cho gamegốc; không so trận khácconditions. D1/D2 là damage đượcđo từ fixture, không sốgiả. Framecounter và timestamp không được trộn simulationtick. Test cycle phải tính rõ initial5 có nằm cycle không theo U02 trước executableoracle.

| ID | Phạm vi | Setup/action | Expected được nguồn hỗ trợ | Evidence | Features |
|---|---|---|---|---|---|
| T01 | Battlefield | Khởi tạo trận1v1 documented profile | Hai phía đối địch, ba lane dùng để triển khai/tấn công | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) | F001,F069 |
| T02 | Shared castle HP | Gây damage D1 ở lane0, D2 ở lane2 vào cùng castle; D đã đo | Một HP pool giảm tổng damage hợp lệ; không có ba tower HP riêng | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) | F002 |
| T03 | Passive castle | Đưa một attacker đến castle, không có defender/buff | Castle không tự bắn/phản công; không thêm tower attack từ game khác | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) | F003 |
| T04 | Lane endpoint | Cho một unit tự đi hết lane không gặp địch | Unit đến cuối lane tấn công castle, không biến mất chỉ vì chạm endpoint | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) | F006,F004 |
| T05 | Victory | Đưa một castle HP xuống0 bằng hit hợp lệ, castle kia cònHP | Bên phá castle thắng; match terminal; không tiếp tục trận sau kết quả | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) | F004 |
| T06 | Opening hand | Bắt đầu trận deck14, quan sát trước timed draw đầu | Mỗi người có5 lá trên tay | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F025 |
| T07 | Normal draw | Tay5, trước Double Cards, chờ lần draw kế | Tay thành6 nếu không play giữa chừng | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F025 |
| T08 | Full hand burn | Tay6, tới normal draw | Tay vẫn6; lá định rút mất, không xếp hàng để tự nhận sau | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F027 |
| T09 | One deck permutation | Theo dõi đủ14 lá cycle, luôn chừa chỗ trên tay | Multiset14 lần rút đúng deck14, không weighted random independent | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F026 |
| T10 | Duplicate count | Deck có đúng2Dwarfs, theo dõi14 lá khôngburn | Đúng2Dwarfs trong cycle đó; thứ tự ngẫu nhiên chưa cần biết PRNG gốc | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F026,F023 |
| T11 | Next cycle | Tiếp tục quan sát14 lá cycle kế, chừa chỗ | Multiset lại bằng deck; không buộc thứ tự phải khác vì random có thể trùng | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F026 |
| T12 | Buy draw | Tay0, mana ít nhất5, bấm rút thêm một lần | Rút một extra card và tiêu5mana; cursor/christal side effects cònU02 | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F028 |
| T13 | Timed simultaneous draw | Hai phía trong cùng trận, khôngExtraCrystal/paidDraw | Timed draw/crystal event xảy ra cho cả hai trong cùng chu kỳ; latency UI không đổi luật | [Card drawing and deck cycling](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684698308625-Card-drawing-and-deck-cycling) | F030 |
| T14 | Double draw roomy | Mode Double Cards đã xác nhận active, tay3 | Một cycle nhận2lá, hand5; không tự chọn45s làm trigger live | [Double cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758851089-Double-cards) | F029 |
| T15 | Double draw one slot | Double Cards active, tay5 | Chỉ1lá được nhận, tay6; lá thứhai consume cursor hay không cònUnknown | [Double cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758851089-Double-cards) | F029,F025 |
| T16 | Double draw cap | Double Cards active, tay6 | Không vượt6lá; chi tiết double burn cursor phải đoU02 | [Double cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758851089-Double-cards) | F029,F027 |
| T17 | Starting crystals | Trận mới trước hiệu ứng extra | Mana crystal capacity khởi đầu2 | [Mana and Crystals](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758284689-Mana-and-Crystals) | F030 |
| T18 | Crystal progression | Timed crystal event khi cap dưới12 | Capacity tăng1; không tự cho mana hiện có đầy ngay nếu chưa đo | [Mana and Crystals](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758284689-Mana-and-Crystals) | F030 |
| T19 | Maximum crystals | Cho timed crystal events tiếp tục khi capacity12 | Capacity không tăng quá12 | [Mana and Crystals](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758284689-Mana-and-Crystals) | F030 |
| T20 | Extra Crystal below cap | ChơiExtraCrystal hợp lệ ở capacity<12 | Thêm1crystal; numeric cost vẫn cần verified catalog | [Mana and Crystals](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758284689-Mana-and-Crystals) | F030 |
| T21 | Extra Crystal at cap | ChơiExtraCrystal khi cap12 và đủ chỗ hand | Rút thêm card thay vì tăngcapacity13; side effects khác không suy đoán | [Mana and Crystals](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758284689-Mana-and-Crystals) | F030 |
| T22 | First target enters range | Một eligible enemy vào range trước enemy khác, không tie/specialability | Unit tấn công eligible enemy đầu vào range; masking/range numeric từfixture | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) | F007 |
| T23 | Movement toward enemy | Một normal unit, lane trống, khôngroot/stun/target | Vị trí tiến về thành đối phương theo lane; tốc độ cụ thể từverified card | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) | F006 |
| T24 | Overtime entry | Giữ trận chưaterminal đến4phút, khôngcastleattack quanhmốc | Bắt đầu cơ chếcastle tự mấtmáu sau4phút theo support; firsttickexact cầncapture | [Overtime](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12694401083537-Overtime) | F020 |
| T25 | Overtime escalation | Tiếp tục trận overtime, tách damage unit khỏi tựdamage | Mức tựdamage tăng theo thời gian; chưa đặt curve/cadence cụ thể | [Overtime](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12694401083537-Overtime) | F020 |
| T26 | Metamorph level | ChơiMetamorph vào battlefield có eligible cards | Copy card ngẫu nhiên trênfield; level theoMetamorph, mappingrarity phảiverified | [My card is in a lower level in battle](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684727124113-My-card-is-in-a-lower-level-in-battle) | F018 |
| T27 | Mana Ritual level cap | DùngManaRitual rồi card ởlevelcao hơn mức ritual hỗtrợ | Effective card level chịu giới hạn ritual; không chỉ giảm cost rồi giữlevel vôđiềukiện | [My card is in a lower level in battle](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684727124113-My-card-is-in-a-lower-level-in-battle) | F013 |
| T28 | Giant Growth level cap | DùngGiantGrowth lêncardlevelvượt ngưỡng hỗtrợ | Level bịgiớihạn theoGiantGrowth; exactmapping/buffamount chờfixture | [My card is in a lower level in battle](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684727124113-My-card-is-in-a-lower-level-in-battle) | F013 |
| T29 | Meteor upgrade | Cùng eligible target/setup, soMeteor hai level kề đã đo | Levelcao tăng damage; không tự áp10% nếu không có bảng | [Upgrading cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684766514577-Upgrading-cards) | F036 |
| T30 | Blizzard upgrade | Cùng targets, soBlizzard hai level kề đã đo | Upgrade tăng duration hiệu ứng; không tự biến thành tăngdamage | [Upgrading cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684766514577-Upgrading-cards) | F013,F036 |
| T31 | Practice result | Hoàn tất một battle Practice | Không đổi trophy, không cấpchest từ kếtquảtrận; opponent làTrainer bot | [What is the Practice Mode?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684746317201-What-is-the-Practice-Mode) | F076 |
| T32 | Friendly result | Clan friendly đượcaccept và hoàn tất | Không đổi trophy/gold, không cấpchest | [How to play Friendly Battles?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684695238289-How-to-play-Friendly-Battles) | F071 |
| T33 | Equal-trophy win | Ranked với hai người trophy ngangnhau theo snapshot | Thắngđược+30 theo support; floor/reset ngoài fixture | [Trophies](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684773222289-Trophies) | F048 |
| T34 | Championship effective level | Vào Championship với collectionlevelkhác nhau | Deck mode có Common9/Rare7/Epic4/Legendary1; chỉcardđãunlock | [Championship](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684749806609-Championship) | F085 |

T02/T04/T22–T30 cần typed parameters và observedtrace trước exact automated assertions. T24 chỉ chứng minh ngưỡng4phút, chưa cadence. T09–T11 không được dùng kiểm tra thống kê “phải khác thứtự” như mộtassertionchắcchắn. T26 randomcopy kiểmtra eligible set và level mapping; không đoán card cụ thể ở bản gốc nếu không biếtseed.

## Web correctness và anti-cheat — Proposed

| ID | Nhóm | Kịch bản | Expected |
|---|---|---|---|
| N01 | Determinism | Cùng seed/config/acceptedcommands chạy100seeds tại30/60/120renderFPS và headless | Per-tick statehash identical; hash loại cosmetic |
| N02 | Retry | Gửi lại cùngPlayCard20lần sau timeout | Mộtcard/mana debit; cùngreceipt; payloadkhác cùngkey bịreject |
| N03 | Forged combat | Client thêmdamage/HP/winner/owner trongcommand | Schema reject hoặc ignore invalidextra theo schema strict; khôngstatechange |
| N04 | Hidden state | Inspect own snapshots/events/logs/live replay/API | Khôngopponent hand/futuredeck/RNG; filterauthorization |
| N05 | Snapshot gap | Dropdelta và deliverdelta phụthuộcbaseđãmất | Requestfullresync; khôngapplydiffsai; reconnecthandđúng |
| N06 | Network impairments | RTT300ms,jitter80ms,loss5%,disconnect15s | Servercontinues; onecardpercommand;fullrecovery; latencyreport |
| N07 | Economy retry | 50parallelclaim cùngchest/result plus DBtimeoutaftercommit | Mộtgrant; mộtreceipt; wallet/copiesconsistent |
| N08 | Concurrent spend | Haiupgrades mỗi cái đủcost riêng nhưng tổngvượtgold | Chỉcácoperationđượcaffordcommitted; balancekhôngâm |
| N09 | Fencing | Oldhost và newhost gửi hairesultkhác cho match | Chỉ currentepoch và mộtterminalresultđượcsettle |
| N10 | Crash recovery | Killmatchhost trước/sau terminalcommit | Recoverdurablecheckpointđúng hoặcvoid; khônggrantclientwinner |
| N11 | Mobile UX | Pointercancel/rotate/background/lowmana | Khôngplayngoàiýđịnh;safearea;networkresync;HUDmanafollowsserver |
| N12 | Invite concurrency | Hai clanmateaccept mộtinvite cùnglúc;creatorcancelrace | Mộtacceptorhoặc cancelwinsCAS; không3-playerroom |
| N13 | Version skew | Oldclient/stalerules/contenthash và savedreplayoldcore | Khôngsilentmix; updateprompt hoặc archiveplayerđúngversion |
| N14 | Input boundaries | NaN/Infinity/out-of-bounds/replayedseq/oversizepayload | Rejectbeforemutation; no crash;rate-limit;auditkhônglộsecrets |

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
