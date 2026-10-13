# Kiểm tra bản Three.js sau refactor — 13/10/2026

## Tự động — đã đạt

- `npm run check:architecture`: core/data không phụ thuộc UI/Three.js/clock trình duyệt.
- `npm test`: 27/27 test; có 20 trận AI-v-AI đầy đủ, 10 kỹ năng, mana, trụ, thắng/thua, pause và restart.
- Golden regression: bốn seed khớp commit `e792b00` tại mọi checkpoint đã lưu.
- Vòng lặp render 30/60/144 Hz cho kết quả mô phỏng giống nhau.
- Save null/sai cấu trúc/JSON lỗi, storage bị từ chối, snapshot tách tham chiếu: đạt.
- TypeScript strict + noUnusedLocals/noUnusedParameters và Vite production build: đạt.

## Trình duyệt

Đã mở bundle production trên Chrome tại `http://127.0.0.1:4173/`, xác nhận sân Three.js, cốt truyện Elyndra/Aether, ba lane, bốn thẻ và triển khai Solan ở lane dưới qua hướng dẫn. Kiểm tra trọn trận và responsive được bổ sung sau bước QA cuối.

## Giới hạn

Chưa benchmark thiết bị iOS/Android thật; không coi FPS hiển thị khi điều khiển trình duyệt là cam kết hiệu năng. Chưa có bộ E2E tự động trong repository. Model/animation vẫn là asset thủ tục của prototype.
