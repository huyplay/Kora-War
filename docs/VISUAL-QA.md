# Đồ họa arena, Home và zoom — 14/10/2026

## Phạm vi

- Home riêng, huy hiệu Aether dạng SVG, nút luyện tập/PvP ở giữa; hành trình, vàng, rương và đội hình dùng các màn hình chức năng hiện có. Home không render map chơi.
- Sân đá ba lane, tường thành, cờ xanh/đỏ, viền kim loại; camera orthographic nghiêng từ `(0,24,30)` nhìn vào `(0,0.5,0)`.
- Zoom 1–1,85× bằng cuộn chuột, pinch hai ngón hoặc nút +/−; nút toàn sân đặt lại góc rộng. Zoom thay projection của camera, giữ nguyên HUD và độ phân giải canvas. Chạm sau pinch không triển khai quân/phép.
- PBR Poly Haven: Cobblestone Floor 02 và Castle Brick 02 White, mỗi bộ diffuse/normal OpenGL/roughness 1K; mipmaps và anisotropy tối đa 8× tùy GPU. Model Moon Rock 01 bổ sung ngoài lane. Model/texture không được nhúng vào Git.
- GegX: flame/frost/storm/laser theo phép; explosion cho va chạm và laser cho đạn bay. Vùng lửa chỉ hiển thị cháy sau warning; lớp băng theo thời hạn slow trên unit. Fallback hình học vẫn có nếu sheet không tải được.
- Băng làm chậm 40% trong 2 giây theo luật đã chốt, không đổi thành stun. Hoạt ảnh đi chậm theo slow; trạng thái choáng dừng mixer.
- Chạm thân/đầu quân địch dùng body volume thay vì chỉ chiếu xuống đất phía sau; áp dụng cả tap và drag phép. Core damage không thay đổi.
- Âm thanh va chạm giảm trùng lặp giữa attack/projectile/hit; cân lại volume, biến thiên nhẹ playback rate, preload theo lô tối đa bốn file. Chưa đánh giá nghe trên loa/tai nghe thiết bị thật.

## Kiểm tra đã chạy

- `npm run check`: **113/113** test, architecture, TypeScript server/client và build Vite thành công. Fixture baseline gốc không thay đổi.
- Test mới kiểm tra body picking ba lane/đảo phe, Fire tổng 135 damage trên mục tiêu ở đủ 3 giây kể cả shield, Ice 35 damage và slow hết hạn; cleanup VFX và atlas tải muộn; camera bounds/reset/raycast sau zoom; pinch không kích hoạt spell; wheel chỉ xử lý trong trận; validation/reference PBR và spell atlas.
- `npm run assets:sync`: 50 asset đồng bộ vào service local/PostgreSQL.
- `npm run assets:verify`: **50 asset / 89,27 MiB**, tất cả binary SHA-256 khớp.
- Edge qua browser connector: Home desktop; Home ở viewport override 844×390 và 667×375; mở đội hình/rương; vào trận AI; nút zoom, wheel zoom, reset toàn sân; pinch khi đang chọn Băng không dùng phép; chạm phép vào tướng khi phóng gần; warning/vùng lửa và lớp băng hiện trên sân; pause/restart/result/return Home.
- Màn hình dọc 390×844 hiện yêu cầu xoay ngang; đã reset viewport override sau QA. Console lần kiểm tra cuối không có error/warn.
- Ảnh QA local trong `.data/qa/`: `home-upgrade.jpg`, `home-mobile.jpg`, `arena-upgrade-mobile.jpg`, `ice-body-hit.jpg`, `fire-body-hit.jpg`. Không đưa ảnh/cache vào Git.

## Giới hạn

Đây là QA trên trình duyệt desktop và viewport mô phỏng, không phải benchmark điện thoại thật. Atlas GegX có frame 128×128; texture map 1K lặp theo tọa độ thế giới. Zoom có giới hạn để tránh phóng quá mức khả năng asset. Không cam kết độ nét vô hạn hoặc chất lượng/hiệu năng ngang TFT. Three.js vẫn có cảnh báo chunk hơn 500 kB. Không có thay đổi simulation, deck/mana, lore hoặc quy tắc cộng dồn slow trong đợt đồ họa này.
