# Roadmap từ repository trống

Hiện trạng: chỉ tài liệu, JSON nghiên cứu và script kiểm tra tài liệu; **chưa có game implementation**. Thứ tự R→A→B→C→D→E→F→G; một lập trình viên hoàn thành từng vertical slice, không đồng thời dựng hàng loạt hệ thống chưa có consumer. Research mở lại khi thay build/ruleset.

| Phase | Mục tiêu | Person-days | Phạm vi | Phần mềm / gate đầu ra |
|---|---|---|---|---|
| R | Research baseline | 10–20 | U01–U11 triage; capture protocol; P0 rules khóa cho slice đầu; không hứa đo đủ mọi level trong20 ngày | Evidence packet + content profile validated; unresolved rules chặn parity profile |
| A | Foundation và renderer spike | 15–25 | Repo, CI, contracts, C# WASM spike, Babylon/Three/Phaser comparison, original art blockout | Browser mở lobby→3-lane field; input mobile; benchmark report và ADR |
| B | Offline battle playable | 25–40 | Shared fixed-step core, deck/draw/mana, spawn/target/combat/result,8–12 thẻ đã đo | Một trận local hoàn chỉnh, replay hash,30/60FPS same state, reset trận không leak |
| C | AI và local progression | 15–25 | Utility AI, practice UI, collection/deck/card detail, local lab save | MVP local chơi được; fake rewards chỉ profile lab, không đại diện economy gốc |
| D | Online PvP | 35–55 | Identity,matchmaking,authority,filtered snapshots,reconnect,result ledger | Hai browser đấu thật; forged input không tạo damage/reward; crash/retry không double grant |
| E | Core progression/economy và roster | 45–75 | Verified roster/abilities,upgrade,chests,shop,arena,XP,trophy,Forge,season | Loop đấu→thưởng→upgrade→đấu; U04/U07 phải đủ; chưa đủ roster không gắn feature-complete |
| F | Social/modes và production art | 40–70 | Clan/chat/donation/friendly,rank,replay,verified modes,asset/audio,mobile UX | Beta feature set test được; moderation và concurrency; visual fixtures approved |
| G | Hardening và release | 25–45 | Load/security/mobile QA,ops,backup restore,privacy,release rollback | Release candidate qua criteria,không known P0 bug; production-ready checklist có evidence |

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
