# Đấu trường, Elo và Thử thách

Ngày 15/10/2026, người dùng chốt Elo và tách Thử thách khỏi map chuẩn. Issue #11.

## Chơi

Sảnh → **Đấu trường · Hạng & thường**:

- **Đấu hạng**: ghép người thật cùng revision, Elo gần nhau; khoảng Elo nới dần theo thời gian chờ. Chỉ mode này thay đổi điểm và số trận hạng.
- **Đấu thường**: ghép người thật, map chuẩn, không tính Elo.
- **Thử thách — Dòng Aether**: cùng địa hình ba lane, hồi mana 2,1/giây và quá tải từ 90 giây theo preset khởi tạo. Không tính Elo. Đây là biến thể luật của map, chưa phải một bộ asset địa hình mới.
- **Đấu bạn bè**: phòng mã mời riêng, không tính Elo. Luyện tập AI tiếp tục ở sảnh.

Top 100 gồm người đã có ít nhất một trận hạng; cùng điểm sắp theo ID ổn định. Hồ sơ hiển thị tên tự sinh từ ID, bậc, Elo, số thắng/trận và vị trí. Lịch sử trả tối đa 20 trận của chính người chơi, gồm trận bị hủy.

Giao diện mobile hiện dùng tab riêng cho bảng hạng/lịch sử và số hàng tự thích ứng chiều cao. Phòng bạn bè có màn riêng; Enter gửi mã và viewport thấp vẫn giữ nút vào phòng. Xem [QA đấu trường mobile](MOBILE-ARENA-QA.md).

## Admin và database

Content Studio → **Đấu trường & hạng**: bật/tắt chế độ, đổi tên/mô tả, Elo khởi tạo/sàn/K/thang chênh lệch, thêm/bỏ/đổi ngưỡng bậc, khoảng ghép và thời hạn chờ, tên map Thử thách, hồi mana mỗi giây và thời điểm quá tải. Lưu nháp/phát hành theo revision như các module khác.

`competition` là module thứ 18. Migration chỉ bổ sung từ bộ đầy đủ 15 hoặc 17 module, không dùng preset để che một store thiếu dữ liệu. Revision lịch sử không viết lại. Snapshot trong `pvp_matches` giữ content, revision, mode, seed, loadout và kết quả; `pvp_members` lập chỉ mục lịch sử; `ratings` lưu Elo.

Khi ghép đủ hai người, server tạo record trước khi bắt đầu. Combat/đầu hàng/hết thời gian reconnect gọi settlement transaction duy nhất; request lặp lại nhận receipt cũ. Client không có API nộp winner/điểm. Tick server xử lý trận kể cả không còn client poll. Cancel khi đang chờ không tạo kết quả; cancel đúng lúc đã ghép trở thành đầu hàng như rời trận thông thường.

Mỗi trận dùng thông số Elo đã khóa lúc ghép. Publish không sửa trận hiện hữu; khôi phục trang nạp content của phòng trước renderer. Queue mới yêu cầu revision hiện tại; hàng chờ khác mode/revision không ghép nhau.

## Giới hạn vận hành

Một tiến trình server sở hữu mô phỏng và hàng chờ; chưa hỗ trợ nhiều worker chia sẻ phòng. Khi khởi động lại, trận đang chạy được ghi hủy với `server-restart`, không thay Elo; không thể tiếp tục mô phỏng từ tick cũ. Điểm và lịch sử vẫn tồn tại qua restart. Không có reset mùa, phần thưởng rank, bot giả người hoặc đăng nhập liên thiết bị trong đợt này. Hồ sơ hiện gắn cookie của trình duyệt như hệ thống player sẵn có.

## QA local

- `npm run check`: architecture, typecheck server/client, unit/integration tests và production build.
- Tests bao gồm Elo, floor/upset/draw, settlement idempotent, quyền truy cập, mode/revision isolation, nới khoảng ghép, redirect token/cancel, disconnect, restart void, migration 17→18, admin publish và kết quả combat tự nhiên của Thử thách.
- Edge headless, hai browser context độc lập; DB QA riêng với 59 asset đọc từ DB chính. Viewport 667×390, 844×390, 1536×720. Đã chạy chọn mode/hủy queue, ranked hai người, admin publish giữa trận + reload reconnect giữ snapshot, đầu hàng/receipt Elo/leaderboard, challenge và casual không đổi hạng. Không lỗi JavaScript.
- Đã sửa dòng Elo bị CSS màn hình ngang ẩn. Screenshot và log ở `.data` của worktree task, không đưa vào source/release. Đây không phải benchmark điện thoại thật. Three.js bundle vẫn có cảnh báo >500 kB.
