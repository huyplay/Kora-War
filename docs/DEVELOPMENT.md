# Phát triển và bảo trì

## Chạy và kiểm tra

```sh
npm ci
npm run dev
npm run check
```

`check` chạy kiểm tra ranh giới dependency, 27 test và build production. `npm run preview` phục vụ `dist` để kiểm tra bundle thực tế. Nếu đổi source sau khi build, phải build lại trước khi preview.

## Chỉnh dữ liệu

Chỉ số tướng nằm trong `src/data/heroes.ts`, kỹ năng trong `src/data/abilities.ts`, luật chung trong `src/data/rules.ts`. `validateGameData()` chạy trước khi khởi tạo renderer. Khi thêm một tướng phải có ID duy nhất, tộc/hệ hợp lệ, chỉ số dương và cấu hình kỹ năng tương ứng.

Không đặt HP/damage trong model 3D; không đưa raycast/DOM vào simulation. Khi cần thay luật đã chốt, hỏi người dùng và cập nhật [quyết định](DECISIONS.md) trước khi thay test hồi quy.

## Kiểm tra hồi quy

`tests/fixtures/three-baseline.json` chứa SHA-256 của snapshot mỗi 100 tick và tick kết thúc cho seed 1, 7, 42, 20261013. Fixture được lấy từ bản gốc commit `e792b00`, trước refactor. Test đối chiếu cả trạng thái quân, trụ, lõi, mana, RNG và thống kê. Không ghi đè fixture để che thay đổi kết quả ngoài dự kiến.

`tests/simulation.test.ts` còn chạy 20 trận AI-v-AI độc lập và kiểm tra từng kỹ năng. `services.test.ts` kiểm tra save hỏng, snapshot không rò tham chiếu, vòng lặp trên nhiều FPS và giới hạn catch-up.

## Kiểm tra thủ công khi sửa UI/renderer

1. Mở sảnh và màn hình 10 tướng; thử lưu deck thiếu tướng.
2. Xem hoặc bỏ qua truyện, thực hiện hướng dẫn, thả quân vào cả ba lane.
3. Kiểm tra mana, chặn vị trí sai, pause/resume và đổi cài đặt.
4. Chơi đến kết quả, bấm chơi lại, về sảnh rồi bắt đầu lần nữa.
5. Mở F3: kiểm tra số quân, draw calls, VFX, FPS; dùng debug phải có nhãn trận thử nghiệm.
6. Kiểm tra viewport điện thoại và lỗi console; dùng thiết bị thật nếu cần cam kết hiệu năng mobile.

## Vấn đề cần phân biệt

- Projectile hiện là VFX; sát thương tầm xa áp dụng tại tick tấn công theo luật prototype.
- `Battle.snapshot()` dùng cho chẩn đoán và regression; không chứa đủ trạng thái để resume/replay trận.
- Hệ số synergy được triển khai trong các combat system; tên/mô tả ở data. Thêm một hiệu ứng synergy mới cần triển khai và test logic tương ứng.
- Mô hình thủ tục có chuyển động bộ phận; chưa phải skeletal animation từ GLB.
