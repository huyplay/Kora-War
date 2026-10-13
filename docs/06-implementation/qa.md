# Kiểm tra bản Three.js sau refactor — 13/10/2026

## Tự động — đã đạt

- `npm run check:architecture`: core/data không phụ thuộc UI/Three.js/clock trình duyệt.
- `npm test`: 33/33 test; có 20 trận AI-v-AI đầy đủ, 10 kỹ năng, mana, trụ, thắng/thua, pause và restart.
- Golden regression: bốn seed khớp commit `e792b00` tại mọi checkpoint đã lưu.
- Vòng lặp render 30/60/144 Hz cho kết quả mô phỏng giống nhau.
- Save null/sai cấu trúc/JSON lỗi, storage bị từ chối, snapshot tách tham chiếu: đạt.
- Lifecycle, asset registry, pool giới hạn, tọa độ lane và gesture một pointer/cancel/cleanup: đạt.
- TypeScript strict + noUnusedLocals/noUnusedParameters và Vite production build: đạt.

## Trình duyệt

Đã mở bundle production trên Chrome tại `http://127.0.0.1:4173/`:

- Giao diện Kora War ở 667×375 và 844×390: sân 3D, ba lane, bốn thẻ, nút icon và màn chọn đủ 10 tướng; cốt truyện Elyndra/Aether được giữ.
- Chạm Lyra rồi nút lane trên, kéo Solan từ thẻ vào sân: gọi quân và trừ mana đúng; thấy model/hiệu ứng trên sân.
- Xoay sang 390×844: chỉ hiện hướng dẫn xoay ngang, chặn game. Trở lại ngang: trận ở màn pause, thời gian và mana giữ nguyên.
- Trận kiểm tra mới với debug tự đấu 4×, seed 20261014: thắng ở 01:22; lõi địch 0, lõi nhà 1114, gọi 28 tướng, 27 hạ gục, 13.380 sát thương, phá 3 trụ, 78 kỹ năng. Trận có nhãn DEBUG, không cộng chiến thắng.
- Chơi lại: thời gian 00:00, hai lõi 1500, mana 5; pause hoạt động. Ở đợt QA trước refactor UI cũng đã kiểm tra thử kết quả thua và về sảnh.
- Không có lỗi console được ghi nhận trong lượt chạy renderer/mobile này.

## Giới hạn

Chưa benchmark thiết bị iOS/Android thật; không coi FPS hiển thị khi điều khiển trình duyệt là cam kết hiệu năng. Chưa có bộ E2E tự động trong repository. Model/animation vẫn là asset thủ tục của prototype.
