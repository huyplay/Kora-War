# Độ rõ giao tranh — 15/10/2026

Issue #24, tiếp nối arena #4 và PR #23. Chỉ thay renderer; không đổi luật, database content, snapshot, HP, sát thương hoặc fixture legacy.

## Thanh máu và trạng thái

`rendering/unit-overlays.ts` dùng một InstancedMesh, một atlas 448×64 tự vẽ bằng Canvas và 100 slot tái sử dụng (bằng giới hạn tối đa được content validator chấp nhận). Không tạo texture/material theo quân hoặc theo frame. Giữ màu xanh/đỏ, nền tối, vạch chia, vệt sát thương từ UnitFeedback; khiên là một lớp riêng theo tỷ lệ shield/maxHp, giới hạn chiều dài hiển thị ở 100%.

Thanh rộng 36 CSS px khi viewport cao ≤450 px, 44 px ở desktop. Phép chiếu camera giữ kích thước trong cả ba lane và khi zoom, không phụ thuộc độ phân giải buffer/DPR. Neo đi theo đầu model và đội hình đã giãn ở renderer. Quân chết/ngoài camera không chiếm slot; reset/dispose dọn pool và atlas.

Biểu tượng gốc gồm bông tuyết, sao choáng, mũi tên xuống, khiên, mũi tên lên và kiếm suy yếu. Đọc thời hạn từ snapshot trận. Nhóm khống chế ưu tiên đóng băng → choáng → làm chậm; khiên, tăng tốc và suy yếu hiển thị độc lập. Đây là ưu tiên hiển thị, không sửa cách chồng hiệu ứng của core.

`vfx/spell-effects.ts` phân biệt làm chậm với đóng băng: làm chậm có vòng lạnh dưới chân, đóng băng mới có vỏ băng/mảnh băng/sprite GegX quanh người. Hết đóng băng nhưng còn làm chậm sẽ bỏ lớp vỏ và giữ vòng lạnh. Giữ atlas GegX, config màu từ content và vòng đời hiện có.

## Trụ bắn

`vfx/tower-effects.ts` thêm một pool 32 vòng đánh dấu mục tiêu tại mặt sân. Vòng và đạn theo tọa độ đội hình hiển thị cho tới lúc trúng, giữ điểm cuối nếu quân đã chết. Snapshot/event cũ chưa có ID đích dùng quân cùng lane gần tọa độ `toX` nhất như trước; chưa thay protocol/replay để thêm ID. Vòng mất sau lúc trúng; pause giữ tuổi hiệu ứng, reset xóa toàn bộ. Tầm và thời gian bay vẫn đọc cấu hình đã khóa theo trận. Không trì hoãn hoặc áp dụng lại sát thương khi đạn chạm.

## QA local

- `npm run check`: kiến trúc, typecheck server/client, 231/231 tests và production build đạt; golden fixture không đổi.
- `npm run smoke`: production bundle/API/module config/auth và hồ sơ trên database tạm đạt.
- Edge: desktop 1536×720, mobile ngang 844×390; cảnh 18/54 quân (18 mỗi lane), sáu trụ bắn, zoom 1,85×, ngày/đêm. Kiểm tra giảm HP, hết hạn trạng thái, pause, xóa quân và reset. Không có lỗi/warning console trong bản QA cuối.
- Luyện tập AI trên database QA riêng với HUD thật; thao tác chọn bài và điều khiển QA qua UI. Không có cuộn document ở viewport mobile.
- Screenshot lưu local `.data/qa-combat/`, không commit database/asset upload hoặc output build. Glyph là vector tự vẽ trong mã, không cần asset ngoài mới. Không đo benchmark điện thoại thật; thanh máu vẫn có thể gần nhau khi đội hình rất dày.
