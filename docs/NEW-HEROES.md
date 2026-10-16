# Bốn tướng Elyndra — 16/10/2026

Issue #45. Người dùng đã chọn thêm bốn tướng mới, dùng model từ [Khada](https://modelviewer.lol/champions) và giữ lore Elyndra.

| Tướng  | Model nguồn     | Vai trò            | Mana | Kỹ năng ban đầu                                                     |
| ------ | --------------- | ------------------ | ---- | ------------------------------------------------------------------- |
| Elara  | Leona 89000     | Đỡ đòn / Bình Minh | 4    | Nhật Khiên: lá chắn 100, làm choáng một địch gần 0,8 giây           |
| Seryn  | Ahri 103000     | Pháp sư / Lâm Linh | 4    | Linh Châu: sát thương vùng 75, tự hồi 35 HP                         |
| Kharos | Zed 238000      | Sát thủ / Hư Không | 4    | Hư Ảnh Trảm: áp sát hậu tuyến, sát thương 130                       |
| Torvyn | Volibear 106000 | Đấu sĩ / Lôi Đình  | 5    | Sấm Hoang: sát thương vùng 80, lá chắn 90, choáng một địch 0,8 giây |

Vai trò cơ chế của Kharos/Torvyn dùng hệ Tiên Phong hiện có; không thêm hệ hoặc handler combat mới. Mọi con số trên là dữ liệu khởi tạo trong `assets/riot/elyndra-wave-1.json`, có thể chỉnh qua admin sau khi cài.

## Cài và vận hành

Chạy `npm run assets:heroes` tại thư mục repo/runtime, sau build và trước khi khởi động server phiên bản mới. Dùng `KORA_DATA_DIR` để chọn database; mặc định `.data`. Công cụ tải/cache GLB, kiểm tra SHA-256 nguồn đã ghi nhận, giữ các clip idle/walk/attack/cast/death cần thiết và nhập asset qua cơ chế hiện có. Model sau tối ưu lần lượt khoảng 1,91 / 3,93 / 1,82 / 3,34 MiB; số triangle 8.634 / 21.678 / 8.703 / 18.146. Báo cáo checksum/clip ở `assets/riot/elyndra-wave-1-report.json`. GLB runtime nằm ngoài Git trong asset storage.

Nguồn/author/license tiếp tục dùng hồ sơ được chủ dự án cung cấp trong `assets/riot/manifest.json`; đây không phải xác minh độc lập quyền sử dụng. Không tải hoặc thực thi script từ trang model.

Installer kiểm tra cả content live và draft, tạo backup SQLite trong `backups/before-heroes-*.sqlite`, rồi phát hành bổ sung trong một transaction. Thay đổi admin chưa phát hành được giữ trong draft. ID đã có trong live được bỏ qua để không ghi đè lựa chọn admin; ID trùng riêng trong draft báo conflict và không phát hành. Chạy lại không tạo revision mới. Lỗi thiếu asset rollback cả content/module/revision. Import asset trước transaction có thể để lại asset chưa tham chiếu để admin kiểm tra.

Admin → Tướng: sửa tên/danh hiệu/hệ/tộc/vũ khí của tướng mới, mana/chỉ số/kỹ năng/hiệu ứng và model/clip. Danh tính 10 tướng gốc vẫn được bảo vệ. Shop có mảnh cho 4 tướng mới; ví người chơi cũ được thêm hàng cấp 1, 0 mảnh bằng `INSERT OR IGNORE`, giữ vàng/cấp/mảnh đang có. Cấp sưu tập không cộng sức mạnh vào trận chuẩn hóa.

Không tự thay deck: người chơi vào Bộ bài & tướng để thay thẻ; admin có thể chỉnh deck mặc định và AI. Deck vẫn 14 thẻ khác nhau, tay 6, quy tắc mở đầu/rút/triển khai không đổi. Phiên app đang mở cần tải lại để nhận catalog mới. Trận/replay khóa content cũ tiếp tục dùng catalog cũ; khôi phục revision cũ không xóa tiến độ tướng tạm ẩn khỏi catalog.

## Kiểm tra

- `tests/hero-catalog.test.ts`: danh tính/ID, deck mở đầu/save/synergy/determinism, bốn kỹ năng đọc content, ví cũ/mới, mua/nâng cấp/khôi phục, draft/idempotency/rollback, snapshot trận cũ, lệnh PvP và fallback renderer/admin.
- Browser QA database riêng: cả bốn model xuất hiện trong bộ sưu tập, chọn/lưu deck 14 thẻ và tải lại; triển khai cả bốn bằng touch, thay thẻ đúng ô, quan sát đi/đánh và không có console error. Thử admin thay attack Seryn 37→38 rồi phát hành và kiểm tra client đọc 38. Giá trị này chỉ nằm ở database QA.
- QA combat dùng bài mở đầu cố định và mana 30 để gọi đủ bốn tướng, không phát hành các thiết lập này sang database chính. Kiểm tra bố cục ngang mobile bằng viewport giả lập; không coi FPS máy phát triển là benchmark thiết bị thật.
- Đã mua 2 mảnh Elara với 40 vàng rồi nâng cấp 1→2 với 75 vàng bằng UI QA; hiển thị 0/4 mảnh, giữ attack 26/HP 570. `npm run check`: 279/279 test, kiểm tra kiến trúc, typecheck server/client và production build đạt. `npm run smoke` đạt.
