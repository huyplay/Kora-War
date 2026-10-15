# Máu trụ và hậu cảnh Elyndra

Issue #22 · 15/10/2026.

## Thanh máu

`TowerHealthBars` đọc `Tower.hp/maxHp` từ snapshot, dùng màu xanh/đỏ theo phe và vệt tụt chậm khi chịu sát thương. Mỗi trụ có một billboard rộng 72 CSS pixel; chiều rộng được tính theo camera và viewport nên vẫn đọc được khi zoom. Độ cao neo theo chiều cao trụ trong cấu hình presentation. Trụ 0 HP ẩn thanh máu ngay, reset trả pool về trạng thái đầu.

Pool cố định sáu nhãn/texture. Chữ chỉ vẽ lại khi giá trị HP đổi; shader hiển thị thanh và chữ trong một draw call mỗi trụ, không tạo DOM hoặc texture mới mỗi frame. Pause giữ nguyên vệt tụt. Đây là phần hiển thị, không sửa HP, sát thương, tầm đánh hoặc cách chọn mục tiêu.

## Cảnh quanh map

- Hậu cảnh gốc vẽ Thung lũng Khởi Nguyên với lớp núi, rừng, sương và dòng sông. Runtime dùng WebP 2172×724, 331.736 byte, lấy qua thư viện asset/database. [Manifest và prompt](../assets/design/arena/README.md).
- `ArenaBackdrop` phủ viewport phía sau hình học thật, không nằm trong vùng raycast combat. Grade màu theo ngày/đêm; thiếu binding/tải lỗi dùng màu trời cũ. Texture mipmap, không kéo giãn canvas khi zoom.
- Mở khung toàn sân để thấy mép thành và thung lũng, giữ góc camera nghiêng và khả năng zoom hiện có. Viền kim loại có độ sáng/roughness phù hợp, nền chân đấu trường thu gọn. Hình học kiến trúc vẫn 36 batch/30.568 tam giác, không tăng ngân sách mesh tĩnh của task trước.
- Thêm sáu khối đá Poly Haven Moon Rock 02 đã kiểm SHA, hạ xuống dưới mặt sân để làm chân vách. Texture/mô hình nguồn giữ nguyên; màu phủ của từng instance chỉ nhân màu material riêng, không sửa cache hoặc instance khác.

## Cấu hình và cài đặt

Map → Môi trường có `map.backdropAssetId` và `map.backdropCrop` (0,35–1). Prop có thêm `y` và `tint`; admin chỉnh như x/z/scale/yaw. Tất cả lưu trong content SQLite và khóa cùng snapshot trận. Các trường tùy chọn giữ tương thích bản cũ, không backfill replay hoặc cần migration gameplay. Publish kiểm tra hậu cảnh là image; asset đang dùng được bảo vệ khỏi archive.

`npx tsx tools/apply-valley-vistas.ts` kiểm tra trước khi chạy. Thêm `--apply` để backup SQLite, nhập asset theo SHA, phát hành hậu cảnh/các prop mẫu và giữ nháp khác. Nếu đã có hậu cảnh do admin chọn, tool giữ nguyên và không tạo revision mới. Chỉ thay map, không lấy các thay đổi gameplay từ nháp đưa vào published.

## Kiểm tra

- `npm run check`: kiến trúc, backend/frontend typecheck, 226 test và build production; fixture legacy không đổi.
- `npm run smoke`: bundle, API, module config, auth và tài khoản riêng.
- Test HP đầy/50%/0, vệt sát thương, pause/reset, số texture cố định, chiều rộng qua lane/zoom, crop/fallback/race khi tải ảnh, tint cách ly material, validate/archive/image kind và cài đặt một lần giữ lịch sử/nháp.
- Browser Edge: desktop/mobile ngang, cảnh ngày/đêm và zoom; trụ `400/400 → 200/400`, ẩn khi phá, khôi phục sáu trụ. Admin lưu crop 0,6 vào nháp, published vẫn 0,65 và gameplay không đổi. QA dùng database/tài khoản riêng. Không coi FPS trình duyệt là benchmark điện thoại thật.
