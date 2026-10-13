# Kora War

Bản chơi đơn 3D trong trình duyệt, triển khai theo yêu cầu gameplay mới ngày 13/10/2026. Bố cục ba lane lấy cảm hứng từ Castle Crush; đây là **ruleset và thế giới riêng**, không phải bản tái tạo chính xác Castle Crush, Liên Quân hoặc TFT.

## Chạy thử

Yêu cầu Node.js 24 LTS, trình duyệt hỗ trợ WebGL2.

```sh
npm ci
npm run dev
```

Mở URL Vite in ra, mặc định `http://127.0.0.1:5173/`.

Để chạy đầy đủ database, dashboard và economy:

```sh
npm run assets:import
npm run start
```

Game: `http://127.0.0.1:8787/` · Dashboard: `http://127.0.0.1:8787/admin`. Lần đầu tạo mật khẩu admin trong `.data/admin-setup.txt`. Xem [hướng dẫn admin/database](docs/ADMIN.md) và [pipeline asset](assets/README.md). Khi phát triển, chạy `npm run server` và `npm run dev` ở hai terminal; Vite proxy `/api` sang backend.

```sh
npm test
npm run check
npm run build
npm run preview
```

`dist/` chứa frontend game và admin; backend Node phục vụ API, upload và SQLite. Không mở trực tiếp bằng `file://`. Bản static không có API vẫn chạy demo với asset thủ tục và luật gốc; economy cần backend. Google Fonts có fallback font hệ thống. Asset đã nhập được phục vụ cục bộ; chỉ pipeline import cần kết nối nguồn CDN.

## Đã triển khai

- Sân 3D camera cố định, ba đường, rừng, sông/cầu, ba trụ mỗi bên và hai lõi 1.500 HP.
- 10 tướng gốc, 5 tộc, 5 hệ; chọn đúng 4 tướng và lưu đội hình trên thiết bị.
- Gọi quân bằng kéo thả, chọn thẻ rồi chạm sân, hoặc nút/phím chiến tuyến; mana có chi phí và hồi phục.
- Tự tiến quân, tìm mục tiêu, đánh cận/xa, kỹ năng riêng, lá chắn, hồi máu, làm chậm, choáng, sát thương vùng.
- Synergy kích hoạt từ deck; kỹ năng chủ động Cộng Hưởng Lõi hồi máu đồng minh/gây sát thương địch theo lane.
- AI tuân thủ cùng mana/deck/validation; ba nhịp quyết định cho Khám phá/Tiêu chuẩn/Thử thách.
- Mở đầu cốt truyện, hướng dẫn ba bước, nhiệm vụ chiếm lõi, thắng/thua, thống kê, chơi lại và đổi đội hình.
- Tạm dừng khi chuyển tab, SFX WAV/Ogg với mixer và âm thanh dự phòng, high/low graphics và tự hạ chất lượng khi FPS thấp kéo dài.
- Giao diện ngang dành cho mobile, bốn thẻ luôn hiện, HUD gọn, kéo/vuốt thẻ để thả quân; tự pause và yêu cầu xoay khi màn hình dọc.
- Module vật lý lane, asset registry, prefab tướng, animation theo trạng thái và sprite VFX dùng pool; quản lý vòng đời tài nguyên tập trung.
- 10 model rigged từ Khada, trụ/lõi nhập ngoài, clip animation có ánh xạ, map prop và sprite CommunityDragon; bản mobile bỏ dữ liệu animation không dùng.
- Content Studio: upload/preview/ẩn/khôi phục asset, sửa chỉ số và chuỗi kỹ năng, map/VFX/economy, ví người chơi, lưu nháp/phát hành/khôi phục revision.
- Ví vàng, mảnh thẻ, rương, cửa hàng và nâng cấp lưu SQLite; server mô phỏng lại command log để xác minh thưởng trận.
- F3: FPS/frame p95/simulation time/draw calls/triangles/units; debug mana, auto-play, 2×/4×, thử kết quả và xuất JSON trạng thái. Debug không cộng chiến thắng.

## Điều khiển

| Thao tác | Chuột/cảm ứng | Phím |
|---|---|---|
| Chọn tướng | Chạm thẻ | 1–4 |
| Gọi quân | Kéo thẻ vào vùng bên trái, hoặc chọn thẻ rồi chạm | W/E/R: trên/giữa/dưới |
| Cộng hưởng | Nhấn nút khi đạt 100%, rồi chọn đường | Q rồi W/E/R |
| Hủy chọn | Nút Hủy chọn | Esc |
| Tạm dừng | Nút cạnh đồng hồ | Esc khi chưa chọn thẻ |
| Hiệu năng/debug | Thanh dưới bên phải | F3 |

## Kiến trúc

- `src/data/`: tướng, hệ/tộc, cấu hình kỹ năng, luật chung, map và cốt truyện Aetherfall.
- `src/core/`: Battle và các hệ thống mana, triển khai, kỹ năng, đánh, trụ, kết quả, AI; không phụ thuộc DOM/Three.js.
- `src/rendering/`: Three.js, môi trường, mô hình, batching, animation, raycast và tài nguyên GPU.
- `src/ui/`: các màn hình truyện, đội hình, cài đặt, pause, kết quả và thành phần chung.
- `src/app/`: điều phối phiên chơi, input/HUD/debug và fixed-step runner 20 Hz.
- `src/services/`: lưu game có kiểm tra dữ liệu và âm thanh Web Audio.
- `src/engine/`: lifetime, asset registry, object pool và nhận diện gesture; không quyết định luật chiến đấu.
- `server/`: HTTP API, SQLite, auth admin, asset ingestion và giao dịch economy.
- `src/admin/`: Content Studio và preview 3D.
- `tests/`: 50 bài test, gồm 20 trận AI-v-AI và đối chiếu bốn seed với bản gốc trước refactor.
- [Audio/texture/prop](assets/media/README.md): nguồn, giấy phép, tải và nhập thư viện. Studio điều chỉnh mixer, âm thanh theo tướng, texture và map props.
- [ASP.NET Core / PostgreSQL](docs/BACKEND-MIGRATION.md): service asset, đồng bộ có retry, storage local/R2 và lộ trình chuyển dữ liệu. Ví/trận vẫn ghi SQLite; chưa bật R2/CDN.
- [Module engine](docs/ENGINE.md), [quy ước asset](assets/README.md), [mobile UX](docs/MOBILE-UX.md), [kết quả QA](docs/06-implementation/qa.md).
- [Kiến trúc và điểm mở rộng](docs/ARCHITECTURE.md), [hướng dẫn bảo trì](docs/DEVELOPMENT.md), [các quyết định đã chốt](docs/DECISIONS.md).
- [Ghi chú triển khai](docs/06-implementation/aetherfall-v0.1.md): luật chính xác và giới hạn.
- [Hồ sơ nghiên cứu Castle Crush trước đó](docs/README.md): tài liệu tham khảo lịch sử, không phải cam kết parity của Aetherfall.

Đây là bản chơi đơn có editor và economy cục bộ. Chưa có PvP, tài khoản đa thiết bị hoặc benchmark trên thiết bị iOS/Android thật. Server xác minh thưởng sau trận; trận vẫn mô phỏng trên client. Số FPS trong inspector là số đo runtime, không phải cam kết 60 FPS trên mọi máy.
