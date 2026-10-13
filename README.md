# Aetherfall — Core Wars

Bản chơi đơn 3D trong trình duyệt, triển khai theo yêu cầu gameplay mới ngày 13/10/2026. Bố cục ba lane lấy cảm hứng từ Castle Crush; đây là **ruleset và thế giới riêng**, không phải bản tái tạo chính xác Castle Crush, Liên Quân hoặc TFT.

## Chạy thử

Yêu cầu Node.js 22.12+ hoặc 24 LTS, trình duyệt hỗ trợ WebGL2.

```sh
npm ci
npm run dev
```

Mở URL Vite in ra, mặc định `http://127.0.0.1:5173/`.

```sh
npm test
npm run build
npm run preview
```

`dist/` là bản static build. Có thể phục vụ thư mục này qua Laragon hoặc web server; không mở trực tiếp bằng `file://`. `base: './'` hỗ trợ phục vụ trong subdirectory. Không cần PHP, tài khoản, API key hoặc database. Google Fonts là tài nguyên ngoài duy nhất; khi offline sử dụng font hệ thống. Bundle game/asset thủ tục nằm trong build.

## Đã triển khai

- Sân 3D camera cố định, ba đường, rừng, sông/cầu, ba trụ mỗi bên và hai lõi 1.500 HP.
- 10 tướng gốc, 5 tộc, 5 hệ; chọn đúng 4 tướng và lưu đội hình trên thiết bị.
- Gọi quân bằng kéo thả, chọn thẻ rồi chạm sân, hoặc nút/phím chiến tuyến; mana có chi phí và hồi phục.
- Tự tiến quân, tìm mục tiêu, đánh cận/xa, kỹ năng riêng, lá chắn, hồi máu, làm chậm, choáng, sát thương vùng.
- Synergy kích hoạt từ deck; kỹ năng chủ động Cộng Hưởng Lõi hồi máu đồng minh/gây sát thương địch theo lane.
- AI tuân thủ cùng mana/deck/validation; ba nhịp quyết định cho Khám phá/Tiêu chuẩn/Thử thách.
- Mở đầu cốt truyện, hướng dẫn ba bước, nhiệm vụ chiếm lõi, thắng/thua, thống kê, chơi lại và đổi đội hình.
- Tạm dừng khi chuyển tab, âm thanh tổng hợp, high/low graphics và tự hạ chất lượng khi FPS thấp kéo dài.
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

- `src/data.ts`: catalog, stats, nguồn hệ/tộc và các mô tả kỹ năng của ruleset riêng.
- `src/simulation.ts`: fixed-step 20 Hz, PRNG có seed, AI, mana, combat và kết quả; không phụ thuộc DOM/Three.js.
- `src/world.ts`: Three.js, môi trường/mô hình thủ tục, animation, raycast và hiệu ứng. Static geometry gộp theo material; model geometry được dùng chung.
- `src/main.ts`: UI, input, tutorial, màn hình, game loop, local save và debug.
- `src/audio.ts`: âm thanh Web Audio tự tổng hợp.
- `tests/simulation.test.ts`: 18 bài test bao gồm 20 trận seeded AI-v-AI hoàn chỉnh.
- [Ghi chú triển khai](docs/06-implementation/aetherfall-v0.1.md): luật chính xác và giới hạn.
- [Hồ sơ nghiên cứu Castle Crush trước đó](docs/README.md): tài liệu tham khảo lịch sử, không phải cam kết parity của Aetherfall.

Đây là playable prototype. Mô hình low-poly thủ tục, animation đơn giản; chưa phải bộ asset MOBA thành phẩm. Chưa có PvP/server-authority, progression kinh tế hoặc benchmark trên thiết bị iOS/Android thật. Số FPS trong inspector là số đo runtime của thiết bị đang mở, không phải cam kết 60 FPS trên mọi máy.
