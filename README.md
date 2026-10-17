# Kora War

[Issues](https://github.com/huyplay/Kora-War/issues) · [Codex quản lý và QA thủ công](docs/TEAM-WORKFLOW.md). Từ 15/10/2026, Codex trực tiếp phụ trách thiết kế, lập trình, QA và merge main; không tiếp tục phân công Gemini. CI/CD tự động đã tắt. GitHub Pages đã cấu hình nhưng chưa có bản demo được phát hành.

Game chiến thuật thẻ 3D với luyện tập AI và phòng PvP 1v1 trong trình duyệt, triển khai theo yêu cầu gameplay mới ngày 14/10/2026. Bố cục ba lane lấy cảm hứng từ Castle Crush; đây là **ruleset và thế giới riêng**, không phải bản tái tạo chính xác Castle Crush, Liên Quân hoặc TFT.

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

`dist/` chứa frontend game và admin; backend Node phục vụ API, upload và SQLite. Không mở trực tiếp bằng `file://`. Bản static không có API vẫn chạy luyện tập tactical với asset thủ tục; PvP và economy cần backend. Google Fonts có fallback font hệ thống. Asset đã nhập được phục vụ cục bộ; chỉ pipeline import cần kết nối nguồn CDN.

## Đã triển khai

- Sân đá PBR ba đường, camera nghiêng và zoom 1–1,85×; cờ vải chuyển động, đuốc/tàn lửa, ba trụ mỗi bên và hai lõi 1.500 HP.
- 14 tướng (10 gốc và Elara/Seryn/Kharos/Torvyn), 5 tộc, 5 hệ; xây deck **14 thẻ khác nhau** từ catalog 22 thẻ và lưu trên thiết bị.
- Tay **6 thẻ**, mở đầu ít nhất 4 tướng + 1 phép, được đổi tối đa 2 thẻ. Dùng thẻ rút thẻ kế tiếp vào cùng ô; hết chồng rút chỉ xáo các thẻ đã dùng, giữ các thẻ đang cầm.
- Tám phép: Gió/Lửa/Sét/Băng và Hồi Sinh Lực/Khiên Aether/Suy Yếu/Gia Tốc. Băng đóng băng di chuyển/đánh/kỹ năng 2 giây; Nyx ưu tiên áp sát hậu tuyến đánh xa. Mana chung, hồi chiêu riêng, vùng cảnh báo và hiệu ứng theo fixed tick; bắt đầu 4/10.
- Phòng PvP có mã mời, chỉ số chuẩn hóa, server quyết định trận; reconnect cùng profile trong 30 giây, đầu hàng và kết quả.
- Gọi quân bằng kéo thả, chọn thẻ rồi chạm sân, hoặc nút/phím chiến tuyến; mana có chi phí và hồi phục.
- Tự tiến quân, tìm mục tiêu, đánh cận/xa, kỹ năng riêng, lá chắn, hồi máu, làm chậm, choáng, sát thương vùng.
- Synergy kích hoạt từ deck; kỹ năng chủ động Cộng Hưởng Lõi hồi máu đồng minh/gây sát thương địch theo lane.
- AI tuân thủ cùng mana/deck/validation; ba nhịp quyết định cho Khám phá/Tiêu chuẩn/Thử thách.
- Mở đầu cốt truyện, hướng dẫn ba bước, nhiệm vụ chiếm lõi, thắng/thua, thống kê, chơi lại và đổi đội hình.
- Luyện tập tạm dừng khi chuyển tab; PvP tiếp tục trên server, SFX WAV/Ogg với mixer và âm thanh dự phòng, high/low graphics và tự hạ chất lượng khi FPS thấp kéo dài.
- Giao diện ngang dành cho mobile, sáu thẻ luôn hiện, HUD gọn, kéo/vuốt thẻ để thả quân; yêu cầu xoay khi màn hình dọc; chỉ pause luyện tập.
- Module vật lý lane, asset registry, prefab tướng, animation theo trạng thái và sprite VFX dùng pool; quản lý vòng đời tài nguyên tập trung.
- Phản hồi giao chiến: bóng mềm tiếp đất, thanh máu có nền/vệt tụt, nháy trúng đòn và số HP thay đổi; trụ sụp dần với mảnh vỡ. Số hồi nhỏ được gộp để giảm rối mắt.
- 10 model rigged từ Khada, trụ/lõi nhập ngoài, clip animation có ánh xạ, map prop và sprite CommunityDragon; bản mobile bỏ dữ liệu animation không dùng.
- Content Studio: upload/preview/ẩn/khôi phục asset, sửa chỉ số và chuỗi kỹ năng, map/VFX/economy, ví người chơi, lưu nháp/phát hành/khôi phục revision.
- [Gameplay từ database](docs/GAMEPLAY-CONFIG.md): admin cấu hình deck/tay bài/phép/synergy/AI/mana/combat/PvP/bộ sưu tập; trận khóa content revision, giữ nguyên các mặc định đã chốt.
- [17 module rule](docs/RULE-MODULES.md) có schema/data version, dữ liệu draft/published và history riêng trong database; API admin sửa module, pipeline combat tách theo system.
- [Đội hình hiển thị và chat nhanh](docs/BATTLE-PRESENTATION.md): 17 module gồm presentation/communication, packing model, câu/emoji/mute, art reaction qua asset service.
- [8 reaction art của Gemini](docs/REACTION-ART-QA.md): ảnh trong suốt, manifest/checksum và tool nhập/gán database; Codex QA/tích hợp, admin tiếp tục điều chỉnh ảnh.
- Ví vàng, mảnh thẻ, rương, cửa hàng và nâng cấp lưu SQLite; server mô phỏng lại command log để xác minh thưởng trận.
- F3: FPS/frame p95/simulation time/draw calls/triangles/units; debug mana, auto-play, 2×/4×, thử kết quả và xuất JSON trạng thái. Debug không cộng chiến thắng.

## Ổn định MVP ngày 13/10/2026

- Lửa giữ đúng 60 tick / 135 sát thương trong 3 giây, kể cả khi thời điểm cast làm số thực lệch tại biên hết hạn.
- Tactical giữ mức slow mạnh nhất còn hiệu lực, với thời hạn riêng; khi hết hiệu ứng mạnh sẽ dùng hiệu ứng yếu còn thời gian. Legacy/replay cũ và golden hash giữ nguyên.
- PvP thử lại lệnh mất phản hồi bằng cùng ID, giữ mã khi mạng tạm mất, tra phòng hiện hành khi mã cũ hết hạn và hủy request khi rời phiên.
- Phòng xử lý timeout theo thứ tự thời gian, dừng combat tại deadline và thu hồi sức chứa theo TTL thực tế. Content/loadout/state trả về là bản sao.
- Preview phép khớp bán kính/màu của thẻ; phản hồi lệnh chậm giữ lựa chọn thẻ mới của người chơi.
- Chặn lệnh mới khi đang rời phòng; nút lane và thông báo reconnect không che sân trên màn hình nhỏ.

`npm run check` kiểm tra kiến trúc, TypeScript server/client, regression và production build Vite. Kết quả đợt deck 14 thẻ được ghi tại [QA deck và combat](docs/CARD-DECK-QA.md). Bundle Three.js còn cảnh báo vượt 500 kB; chưa có benchmark điện thoại thật hoặc kiểm thử WAN. Chi tiết tại [phân tích project](docs/PROJECT-REVIEW.md), [QA đồ họa](docs/VISUAL-QA.md) và [quyết định gameplay](docs/DECISIONS.md).

## Điều khiển

| Thao tác | Chuột/cảm ứng | Phím |
|---|---|---|
| Chọn tướng / phép | Chạm thẻ đang cầm | 1–6 theo ô trên tay |
| Dùng phép | Kéo/chạm vị trí trên lane bất kỳ | W/E/R: tâm lane |
| Gọi quân | Kéo thẻ vào vùng bên trái, hoặc chọn thẻ rồi chạm | W/E/R: trên/giữa/dưới |
| Cộng hưởng | Nhấn nút khi đạt 100%, rồi chọn đường | Q rồi W/E/R |
| Hủy chọn | Nút Hủy chọn | Esc |
| Menu trận | Nút cạnh đồng hồ; PvP có đầu hàng | Esc khi chưa chọn thẻ |
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
- `tests/`: mô phỏng AI, đối chiếu bốn seed với bản gốc trước refactor, biên tick phép/slow/freeze, invariants deck/rút/đổi bài, replay thưởng, preview và phục hồi/vòng đời phòng PvP.
- [Audio/texture/prop](assets/media/README.md): nguồn, giấy phép, tải và nhập thư viện. Studio điều chỉnh mixer, âm thanh theo tướng, texture và map props.
- [ASP.NET Core / PostgreSQL](docs/BACKEND-MIGRATION.md): service asset, đồng bộ có retry, storage local/R2 và lộ trình chuyển dữ liệu. Ví/trận vẫn ghi SQLite; chưa bật R2/CDN.
- [Module engine](docs/ENGINE.md), [quy ước asset](assets/README.md), [mobile UX](docs/MOBILE-UX.md), [kết quả QA](docs/06-implementation/qa.md).
- [Kiến trúc và điểm mở rộng](docs/ARCHITECTURE.md), [hướng dẫn bảo trì](docs/DEVELOPMENT.md), [các quyết định đã chốt](docs/DECISIONS.md).
- [Ghi chú triển khai](docs/06-implementation/aetherfall-v0.1.md): luật chính xác và giới hạn.
- [Hồ sơ nghiên cứu Castle Crush trước đó](docs/README.md): tài liệu tham khảo lịch sử, không phải cam kết parity của Aetherfall.

PvP có phòng bạn bè, hàng chờ ranked/casual và Thử thách. Mô phỏng active vẫn nằm trong một Node process; restart không resume trận và ghi void cho trận active đã lưu. Kết quả/Elo/moderation lưu SQLite. Chưa có tài khoản đa thiết bị hay benchmark iOS/Android thật. Luyện tập mô phỏng trên client và được replay để xác minh thưởng; PvP chạy trên server, chưa phát thưởng vàng. Số FPS trong inspector là số đo runtime, không phải cam kết 60 FPS trên mọi máy.

[Khảo sát toàn project, REA và đối chiếu Castle Crush/TFT/Liên Quân ngày 17/10](docs/PROJECT-AUDIT-2026-10-17.md). Chi tiết tướng có nút xem Đứng/Đi/Đánh/Chiêu; admin cấu hình nhịp từng model. Chạy `npm run presentation:animation` để cài gói nhịp 14 tướng có backup và giữ tùy chỉnh admin; xem [QA và hướng dẫn](docs/HERO-ANIMATION-QA.md).

## Chơi PvP

Chạy `npm run start`, mở game ở hai trình duyệt/profile khác nhau để có hai cookie người chơi. Chọn bộ bài trước trận; người thứ nhất bấm **PvP · Đấu bạn bè → Tạo phòng**, người thứ hai nhập mã và bấm **Vào phòng**. Chọn tối đa 2 thẻ đổi rồi chốt bài; sau 15 giây server tự giữ bài nếu chưa chốt. Cả hai luôn thấy đội mình bên trái, chỉ thấy lưng bài đối thủ. Trận không tạm dừng khi ẩn tab. Server mặc định chỉ nghe loopback; chơi qua Internet cần triển khai cùng origin/HTTPS riêng.

Cấp thẻ trong kho là cấp sưu tập; trận tactical dùng chỉ số chuẩn hóa. [Phân tích toàn project và đối chiếu thiết kế](docs/PROJECT-REVIEW.md), [quyết định MVP](docs/DECISIONS.md), [thiết kế nguồn](Game_desgin.md).
