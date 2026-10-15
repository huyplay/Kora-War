# Lịch sử trận và kiểm duyệt

Quyết định người dùng ngày 15/10/2026: admin được hủy kết quả, hoàn tác phần Elo của trận và khóa PvP có thời hạn; phải ghi lý do, không tự động phạt. Issue #13.

## Sử dụng

Content Studio → **Lịch sử & kiểm duyệt**.

- Tìm PvP hoặc luyện tập AI theo ID trận/người chơi, chế độ và trạng thái; phân trang 25 trận.
- Chi tiết gồm người chơi, thời gian, revision, kết quả gốc, bộ bài và content đã khóa; PvP mới có tổng kết server và nhật ký lệnh theo tick.
- Nhật ký lưu lệnh được chấp nhận/bị từ chối; request lặp cùng ID chỉ ghi một lần. UI hiển thị 200 lệnh cuối, xuất hồ sơ JSON có toàn bộ dữ liệu đã lưu. Chỉ tài khoản admin được truy cập seed, bộ bài hai phe và bằng chứng.
- Ghi chú, đánh dấu điều tra, đánh dấu đã xem; hủy kết quả; khóa/gỡ khóa PvP. Mỗi thao tác cần lý do ít nhất 5 ký tự và mã request duy nhất để chống thực thi hai lần. UI yêu cầu xác nhận đã xem bằng chứng.

## Cấu hình

Chính sách kiểm duyệt là dữ liệu vận hành trong bảng `fair_play_policy`, không thay combat hoặc content revision. Có version để chống ghi đè từ tab cũ và audit trước/sau. Nút **Lưu chính sách kiểm duyệt** áp dụng riêng, không dùng nút phát hành gameplay ở đầu trang.

Ngưỡng mặc định: 12 lệnh bị từ chối khác nhau/người/trận; trận dưới 20 giây; 5 trận hạng cùng cặp đối thủ trong 24 giờ; thời hạn khóa tối đa 720 giờ. Admin thay đổi các ngưỡng hoặc tắt cảnh báo. Mỗi trận mới giữ snapshot chính sách để việc chỉnh ngưỡng sau đó không thay cách đánh dấu lịch sử.

Các dấu hiệu này có thể xuất hiện do lỗi client, reconnect, đầu hàng hoặc ít người online. Không có hành động phạt tự động. Trạng thái “đã xem” là kết luận thủ công, không xóa bằng chứng/cảnh báo.

## Hoàn tác và khóa

- Chỉ hoàn tác trận PvP đã kết thúc; không sửa kết quả gốc trong `pvp_matches`. `match_corrections`/`moderation_actions` ghi delta bù, điểm trước/sau, lý do, actor admin và thời điểm. Lịch sử người chơi đánh dấu “Đã hủy”.
- Elo hiện tại nhận delta đối ứng đúng với receipt gốc; số trận/thắng hạng giảm tương ứng. Không tính lại trận sau, không sửa vàng/vật phẩm. Non-ranked không thay điểm. Một trận chỉ được hoàn tác một lần.
- Hoàn tác đợi cả hai người không có trận active để tránh đổi điểm giữa trận. Điều chỉnh hành chính có thể đưa Elo xuống dưới sàn combat; trận thua sau đó không tự nâng điểm lên sàn. Bậc thấp nhất vẫn hiển thị; Elo gốc và mọi phần bù được giữ trong hồ sơ.
- Khóa có hạn chặn tạo/join/queue PvP mới (cả phòng bạn bè), hủy hàng chờ hiện có. Không cưỡng ép kết thúc hoặc đổi kết quả trận đang chạy. Luyện tập AI vẫn dùng được. Admin có thể gỡ sớm; hết hạn tự cho phép chơi lại.

## Dữ liệu và giới hạn

`server/fair-play-store.ts` phụ trách chính sách, evidence, truy vấn lịch sử và moderation transactions. `src/admin/match-review.ts` phụ trách màn hình. Tables: `fair_play_policy`, `match_reviews`, `match_evidence`, `moderation_actions`, `pvp_bans`, `match_corrections`. Bổ sung bảng, không sửa content/revision lịch sử.

Lưu tối đa 4.096 lệnh/trận, whitelist các field cần thiết, cắt độ dài và đánh dấu rõ khi thiếu vì giới hạn. Trận PvP cũ không có command evidence; AI có kết quả đã xác minh nếu hoàn tất nhưng không lưu command log từ trước. Không giả lập lại dữ liệu chưa từng ghi. Tính năng này là xem hồ sơ/timeline và xuất JSON, chưa phải trình phát replay 3D hay hệ thống chứng minh mọi hình thức gian lận.

Hệ thống hiện có một tài khoản quản trị, audit actor `admin`; hồ sơ người chơi vẫn gắn cookie. Khóa hồ sơ không phải khóa thiết bị/IP, chưa ngăn tạo hồ sơ mới; chưa có phát hiện thông đồng bằng ML hoặc nhận diện đa tài khoản.

## QA

Unit/integration: quyền admin, ghi và giới hạn evidence, dedup, policy version/snapshot, hoàn tác sau các trận khác, chống thao tác lặp, rollback nếu đang có trận, khóa/gỡ/hết hạn, phục hồi dữ liệu sau reopen SQLite, bảo toàn trận đang chơi, legacy/AI không có evidence. Golden fixture không đổi.

Edge headless với database riêng: tìm/chi tiết, xem cảnh báo, tải JSON 16 lệnh, đánh dấu, hủy và bù ±16 Elo, khóa/gỡ, đổi ngưỡng cảnh báo, kiểm tra AI không có nút xử phạt PvP; desktop 1536×900 và màn hình 844×390. Không áp dụng thao tác QA vào người chơi thật. Ảnh/log trong `.data` worktree task.

Kết quả kiểm tra cuối: `npm run check` đạt **193/193 tests**, architecture, TypeScript server/client và build; `npm run smoke` đạt. Browser QA không có pageerror. Bundle Three.js vẫn có cảnh báo kích thước >500 kB như trước.
