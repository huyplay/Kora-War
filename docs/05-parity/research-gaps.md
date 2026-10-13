# Research gaps và bàn giao đo bổ sung

Tất cả14gap cònOpen. Hồ sơ đã xác địnhunknown quantrọng nhưng chưa đạt tiêu chuẩn specification100% implementation-ready của toàn bộ game. Đây là giới hạn thực tế của evidence công khai đọc được, không phải mặc định suy đoán để tiếp tục code.

| Gap | Priority | Vì sao chặn | Cách thu bằng chứng | Task / artifact để đóng |
|---|---|---|---|---|
| U01 Live baseline / Android version | P0 | Listing không chứng minh server hoạt động | Cài bản store hợp pháp; ghi version, OS, locale; đăng nhập và hoàn tất 3 PvP | R01: App/build manifest + login/PvP evidence; inaccessible cũng phải có log |
| U02 Rút bài, double và crystals | P0 | WP 7–10s/7s; support 5 draws vs WP45s | Quay 60fps 10 trận; tay full/empty, draw trả phí, Extra Crystal ở12; ghi mana/cursor | R02: Timeline10matches: initial/cycle cursor,interval,mana,cap,double,overflow,paid/Extra effects |
| U03 Vùng đặt quân | P0 | Chỉ wiki nói frontier | Grid thử 20 vị trí/lane, trước/sau quân chết, pushback và qua giữa sân | R03: Deployment valid polygons/frontier policy theo3lanes và state transitions |
| U04 Roster và stats mọi level | P0 | 68 lịch sử; catalog wiki thiếu, có mâu thuẫn | Chụp toàn collection/build và detail mọi thẻ; đọc stat base/Forge/NFT; kiểm tra alias | R04/R05/E06: Roster reconciled + level tables + target/ability params cho từng thẻ |
| U05 Target, collision và hit timing | P0 | Không biết tie/retarget/cooldown | Friendly battle scripted: hai mục tiêu ngang range, unit vượt nhau, target chết giữa projectile | R06: Target/collision/hit/projectile rules và equal-time traces |
| U06 Overtime và cùng chết | P0 | Có 4 phút; chưa có damage curve/tie-break | 10 trận overtime, hai HP bằng nhau; log tick damage và kết quả frame-by-frame | R07: OT damage curve/cadence + winner precedence có tái lập |
| U07 Upgrade/XP/trophy/loot/reset | P1 | Không đủ bảng chi phí, rounding, odds | Ghi nhiều delta và từng level; không suy Elo hay drop rate từ vài chest | R09/E01: XP/cost/copies/trophy/drop/reset versioned tables; không suy odds từ vài mẫu |
| U08 Mode và social đang hoạt động | P1 | Support chủ yếu 2023 | Kiểm tra nhiều mức account, full event cycle/season và locale | R09/F06: Feature live/historical/removed evidence; full mode schedule + fees/rewards |
| U09 NFT/Founder hiện hành | P1 | Tài liệu hiện diện không chứng minh marketplace hoạt động | Quan sát read-only UI/announcement; không giao dịch để nghiên cứu | R09/X01: Thông báo gốc + current UI xác định combat tiers và ownership/ACS status |
| U10 Camera/animation hiện hành | P0 | Chưa xem video có build | Thu capture 3 arena, 10 abilities, giấy phép chỉ tham chiếu | R10: Capture timestamps/measurements cho camera/layout/animation; mesh vẫn Unknown nếu chỉ video |
| U11 Disconnect/reconnect/surrender | P0 | Không có đặc tả công khai đủ | Ngắt 5/15/30/60s trên hai client do mình kiểm soát | R08/D05: Disconnect experiment traces; phân biệt original policy và web fallback |
| U12 Engine performance | P0 | Chưa benchmark | Chạy fixture giống nhau Babylon/Three/Phaser trên thiết bị thật | A03/G01: Renderer/device benchmark raw CSV và chọn ADR bằng thresholds |
| U13 AI nội bộ | P1 | Không công khai | Đề xuất utility bot; so phân phối hành động, không tuyên bố cùng thuật toán | C01: Published algorithm nếu có; nếu không thì replacement policy+behavior comparison |
| U14 License assets/repo | P1 | Thiếu license hoặc asset terms khác code | Kiểm tra từng file/bundle, xin quyền nếu cần; không copy khi chưa rõ | A03/F07/G05: License ledger mỗi code/asset,permission evidence,attribution |

Mẫu observation: `observationId,sourceURL_or_localAuthorizedCapture,build,platform,OS,locale,mode,playerLevel,deck[],cardLevels,tier,forge,castleHP,recordedAt,timecodeStart,timecodeEnd,frameRate,action,observedResult,errorBound,repetitions,confidence,reviewer`. Video chưa xem có `timecodeStart=null`, không được cite như đã xem. Replay sourcecode clone chỉ chứng minh clone, không chứng minh game gốc.

Quan sát bằng thao tác hợp pháp, không lấy private source/token/account của người khác. Không cần giải mã app/asset hay mua NFT để nghiên cứu. Nếu chỉ đo black-box được behavior, engine/camera projection nội bộ vẫn có thểUnknown; functional-equivalent không bắt buộc cùng implementation.

Close gap chỉ khi evidence nhất quán với baseline hoặc explicitdeviation đượcđặt tên. Không đổi status thànhClosed chỉ vì đã viết pseudocode. Một số gap như internalAI/engine có thể không bao giờ biết chính xác: chốt requirement observable+replacement algorithm được đánh nhãn, không tuyên bố cùng source/algorithm.
