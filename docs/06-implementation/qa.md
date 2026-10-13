# Kiểm tra bản Three.js sau refactor — 13/10/2026

## Tự động — đã đạt

- `npm run check:architecture`: core/data không phụ thuộc UI/Three.js/clock trình duyệt.
- `npm test`: 42/42 test; có 20 trận AI-v-AI đầy đủ, 10 kỹ năng, mana, trụ, thắng/thua, pause và restart.
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

## Content Studio / asset / economy

- Chrome production tại `http://127.0.0.1:8787/` và `/admin`: dashboard mở được, model 3D và clip hiện đúng; game nạp 10 model, trụ/lõi/prop Khada và sprite CommunityDragon. Sửa normalization dùng wrapper đã được kiểm tra bằng test geometry/animation và hình ảnh Solan trong preview/game.
- Pipeline nguồn: 10 model từ 57,53 MiB xuống 15,82 MiB, tổng bộ runtime gồm ba cấu trúc và sprite khoảng 21,62 MiB. Test GLTFLoader đối chiếu vertex và keyframe của fixture trước/sau đóng gói. Đây là kích thước file, không phải benchmark.
- Luồng UI thực hiện: ví 350 → mua 2 mảnh Solan còn 310 → nâng cấp Solan cấp 2 còn 235 → mở rương còn 165, nhận Aurelia/Vesper/Mira mỗi tướng 1 mảnh và 30 vàng. Tải lại: ví 165, Solan cấp 2, mảnh thưởng vẫn còn.
- Trận thường 1× trên viewport 844×390: triển khai một Solan cấp 2, trận thua ở 00:49, 717 sát thương, hai kỹ năng, 39 hồi máu; server mô phỏng lại command log và trả +25 vàng. Không dùng debug. Console không ghi nhận lỗi/warning trong lượt trận này.
- Rương được kiểm tra ở 844×390; đã chỉnh bố cục rương thành hai cột ở màn thấp để dành chỗ cho nút mở. Label ví trong sảnh được nối lại với wallet sau khi nhận thưởng. Hai sửa UI cuối đã build/typecheck; chưa được mở lại trong browser do quyền truy cập trang local bị từ chối ở bước upload QA.
- Lượt upload UI qua công cụ Chrome chưa hoàn thành: extension yêu cầu quyền file URLs, sau đó quyền thao tác trang local bị từ chối. Không thay quyền extension hoặc dùng đường vòng. Test tự động kiểm tra GLB/nguồn/quyền, lưu file/catalog, archive và publish bằng database tạm; không tuyên bố upload UI đã qua QA.
- Kiểm thử mới: auth/origin/session cookie, bản nháp/publish/conflict, ví/idempotency/rollback, reward replay, asset provenance/archive, compaction và animation normalization. Mọi test dùng dữ liệu tạm; không thay fixture baseline.

## Giới hạn

Chưa benchmark thiết bị iOS/Android thật; không coi FPS hiển thị khi điều khiển trình duyệt là cam kết hiệu năng. Chưa có bộ E2E browser tự động trong repository. Bộ import dùng model LoL theo xác nhận giấy phép của chủ dự án; chưa retarget skeleton tùy ý hoặc dựng campaign nhiều màn.
