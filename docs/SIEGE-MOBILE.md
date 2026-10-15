# Công thành và thao tác mobile

Issue #20 · 15/10/2026.

## Công thành

- Ba cổng mỗi bên dùng chung mục tiêu lõi. `alignFortressFrontages` đặt mặt giằng cổng tại `±board.coreX` dù admin đổi chiều cao/độ dày thành. Tướng cận chiến tiếp cận theo tầm đánh hiện tại; tướng đánh xa giữ khoảng cách theo luật trận.
- Tường hồi nối vòm vào thành chính; sân lát đá, nền liên tục, hành lang sau cổng và tháp góc thay khoảng trống/khối nền rời. Hình học tĩnh được gộp thành 36 batch, 30.568 tam giác (ngân sách test ≤36 batch, <35.000 tam giác). Con số này không bao gồm model nhập, tướng hoặc VFX.
- Sự kiện `core` phát tia va chạm ở mặt thành bằng pool hiện có, tối đa 128 hạt; không thêm sát thương hoặc tài nguyên mới.
- glTF có nhiều node anh em `_LOD0…3` chỉ dùng mức chi tiết cao nhất có sẵn của từng nhóm trong bản sao instance. Không sửa model nguồn, texture, cache hoặc skeleton. Điều này tránh vẽ chồng nhiều LOD và tính sai kích thước chuẩn hóa.
- `tools/polish-arena-scenery.ts --apply` thay bốn vị trí đá demo cũ bằng model Moon Rock 02 đã kiểm SHA, gom về nền sau thành. Tool chỉ nhận đúng các vị trí demo gốc, giữ cảnh do admin sửa; backup SQLite trước khi publish, giữ nháp khác và lịch sử. Chạy không có `--apply` để xem số vị trí, chạy lại không tạo revision mới.

## Quân phòng thủ

`FormationLayout` nhận biết quân mới trong dải phòng thủ từ `board.deployment`. Quân đang có được bố trí trước; quân phòng thủ tìm vị trí trống theo hàng, footprint thực và khoảng cách cấu hình. Chỉ quân mới thu nhỏ khi cần. Không ghi vào `Unit`, không thay mục tiêu, tầm đánh hoặc tọa độ server. Reset trận xóa mọi trạng thái bố trí.

## Màn hình chạm

- Viewport game cố định; bộ bài và bộ sưu tập có tab riêng. Catalog, cửa hàng, nâng cấp, cốt truyện, bảng hạng và lịch sử dùng trang với nút trước/sau và vuốt ngang.
- `pageDeck` chỉ bắt pointer sau khi xác nhận vuốt ngang; vuốt không kích hoạt nút thẻ ở cuối cử chỉ. Cleanup khi đóng/thay modal gỡ listener và điều khiển trang.
- Chat nhanh tách câu/emoji, giữ mute và gửi phản hồi như trước. Tay bài cấu hình lớn hiển thị hai hàng thay cuộn ngang; không thay số thẻ hoặc cách rút bài.
- Admin CMS, replay và snapshot database giữ nguyên. Không đổi schema hoặc cấu hình gameplay; tool cảnh chỉ phát hành revision content với các vị trí trang trí được cập nhật.

## Kiểm tra

- `npm run check`: kiến trúc, typecheck backend/frontend, 217 test và production build. Fixture legacy không đổi.
- `npm run smoke`: bundle production, API, module database, auth và tài khoản kiểm thử độc lập.
- Test có chủ đích: triệu hồi không sửa địch; cả ba lane đánh cùng HP lõi; mặt cổng theo tỷ lệ; bố trí nhiều quân/footprint; vuốt/phân trang/cleanup; chọn LOD trước khi tính bounds, giữ nguyên cache.
- Browser QA dùng SQLite và tài khoản riêng, bản sao asset đọc từ thư viện hiện có. Kiểm tra desktop, mobile ngang 844×390 và khung nhỏ 640×320; không coi FPS trình duyệt là benchmark điện thoại thật.
- Cảnh QA công thành xác nhận `Guard: OK · enemy combat unchanged · visual unchanged` và HP lõi 1.500 → 1.444,8 khi đánh cổng. Kéo Solan trong game thay đúng ô bằng Vesper, chồng rút giảm 8 → 7.
- Tại 640×320, đã đo bộ bài, truyện hai trang, đấu trường/phòng bạn bè, phần thưởng rương, chat câu/emoji, tạm dừng và kết quả. Sửa thêm việc focus tự cuộn `.home-screen` bên trong vùng `overflow:hidden`: dùng `overflow:clip`, thu gọn sảnh và cho chữ trang trí bỏ qua pointer.
