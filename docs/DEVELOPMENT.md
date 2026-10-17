# Phát triển và bảo trì

## Chạy và kiểm tra

```sh
npm ci
npm run dev
npm run check
```

`check` chạy kiểm tra ranh giới dependency, TypeScript, toàn bộ test và build production. `npm run smoke` kiểm entrypoint/static bundles/API trên database tạm; `npm run package` tạo gói runtime theo allowlist. CI/CD đang tắt; Codex QA và tích hợp thủ công theo [quy trình hiện hành](TEAM-WORKFLOW.md). `npm run preview` phục vụ `dist` để kiểm tra bundle thực tế. Nếu đổi source sau khi build, phải build lại trước khi preview.

## Chỉnh dữ liệu

Chỉ số tướng nằm trong `src/data/heroes.ts`, kỹ năng trong `src/data/abilities.ts`, luật chung trong `src/data/rules.ts`. `validateGameData()` chạy trước khi khởi tạo renderer. Khi thêm một tướng phải có ID duy nhất, tộc/hệ hợp lệ, chỉ số dương và cấu hình kỹ năng tương ứng.

Không đặt HP/damage trong model 3D; không đưa raycast/DOM vào simulation. Khi cần thay luật đã chốt, hỏi người dùng và cập nhật [quyết định](DECISIONS.md) trước khi thay test hồi quy.

## Kiểm tra hồi quy

`tests/fixtures/three-baseline.json` chứa SHA-256 của snapshot mỗi 100 tick và tick kết thúc cho seed 1, 7, 42, 20261013. Fixture được lấy từ bản gốc commit `e792b00`, trước refactor. Test đối chiếu cả trạng thái quân, trụ, lõi, mana, RNG và thống kê. Không ghi đè fixture để che thay đổi kết quả ngoài dự kiến.

`tests/simulation.test.ts` còn chạy 20 trận AI-v-AI độc lập và kiểm tra từng kỹ năng. `services.test.ts` kiểm tra save hỏng, snapshot không rò tham chiếu, vòng lặp trên nhiều FPS và giới hạn catch-up.

## Kiểm tra thủ công khi sửa UI/renderer

1. Mở sảnh và catalog đang phát hành (hiện 14 tướng); thử lưu deck không hợp lệ.
2. Xem hoặc bỏ qua truyện, thực hiện hướng dẫn, thả quân vào cả ba lane.
3. Kiểm tra mana, chặn vị trí sai, pause/resume và đổi cài đặt.
4. Chơi đến kết quả, bấm chơi lại, về sảnh rồi bắt đầu lần nữa.
5. Mở F3: kiểm tra số quân, draw calls, VFX, FPS; dùng debug phải có nhãn trận thử nghiệm.
6. Kiểm tra ngang 667×375, 844×390, kéo thả, chạm lane, hủy gesture và lỗi console. Xoay dọc phải chặn tương tác và pause; xoay về ngang cần Tiếp tục. Dùng thiết bị thật nếu cần cam kết hiệu năng mobile.

Xem [module engine](ENGINE.md), [asset](../assets/README.md) và [giao diện mobile](MOBILE-UX.md) trước khi thêm prefab, animation hoặc thao tác cảm ứng. AssetRegistry giữ cache; Lifetime và ObjectPool chịu trách nhiệm vòng đời, tránh tạo tài nguyên GPU mỗi frame.

## Vấn đề cần phân biệt

- Projectile hiện là VFX; sát thương tầm xa áp dụng tại tick tấn công theo luật prototype.
- `Battle.snapshot()` dùng cho chẩn đoán và regression; không chứa đủ trạng thái để resume/replay trận.
- Hệ số synergy được triển khai trong các combat system; tên/mô tả ở data. Thêm một hiệu ứng synergy mới cần triển khai và test logic tương ứng.
- Model nhập dùng skeleton và AnimationMixer riêng; model thủ tục là fallback. `models.<id>.animation` trong snapshot cấu hình nhịp đánh/cast/chuyển clip; không quyết định damage. Xem [QA hoạt ảnh](HERO-ANIMATION-QA.md).

## Content Studio và backend

Chạy Node 24. `npm run server` phục vụ SQLite/API và `npm run dev` phục vụ Vite có proxy. `npm run start` build rồi phục vụ cả game/admin tại cổng 8787. Xem [Admin](ADMIN.md) và [asset](../assets/README.md) để import nguồn hoặc quản lý revision. `npm run check` còn typecheck server/tools và kiểm tra auth, giao dịch, replay thưởng, upload/provenance, GLB compaction và animation normalization. Database runtime nằm trong `.data/`, không phải fixture hay migration được commit.

`npm run format` dùng Prettier với cấu hình trong repo. Tránh đưa decoder bên thứ ba hoặc fixture vào formatter; `.prettierignore` đã loại chúng.
