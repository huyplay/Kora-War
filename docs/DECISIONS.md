# Các quyết định đang áp dụng

## Tên và nền tảng chơi mới

Tên sản phẩm được người dùng chốt là **Kora War**. Cốt truyện Elyndra/lõi Aether và gameplay không đổi. Save mới dùng `kora-war-save`, tự đọc key `aetherfall-save` khi chưa có save mới; không xóa dữ liệu cũ. Ưu tiên mobile màn hình ngang, ít chữ và điều khiển chạm/kéo. Commit và push riêng theo từng task đã kiểm thử.

## 13/10/2026 — Tiếp tục bản Three.js ban đầu

Yêu cầu cuối của người dùng: “sử dụng full Three.js + TypeScript + Vite đã chơi được như lúc đầu để triển khai tiếp … vẫn giữ nguyên cốt truyện chính như lúc đầu”. Quyết định này thay thế hướng PlayCanvas và cốt truyện Heartstone trong các tin nhắn trước.

| Hạng mục | Đang áp dụng |
|---|---|
| Renderer | Three.js 0.180.0 |
| Ngôn ngữ/build | TypeScript 5.9.3, Vite 7.3.7 |
| Lane | 3: trên, giữa, dưới |
| Deck/tay bài | Chọn 4 tướng khác nhau; luôn thấy cả 4 thẻ; không rút luân phiên |
| Trụ | 3 mỗi bên, 400 HP, tự đánh, chặn đường vào lõi |
| Lõi | 1.500 HP mỗi bên |
| Mana | Bắt đầu 5, tối đa 10, hồi 1,05/giây; Lôi Đình tăng 20% |
| Kết thúc | Phá lõi; quá tải từ giây 180 theo luật prototype; không thêm hòa |
| Nội dung | Aetherfall, Elyndra, lõi Aether, Thung lũng Khởi Nguyên |
| Tướng | Solan, Aurelia, Lyra, Brann, Nyx, Vesper, Kael, Mira, Raiko, Orin |

PlayCanvas đã được gỡ khỏi dependency. Chưa tạo project/scene/asset nào trên PlayCanvas Editor. Không có nhánh renderer thứ hai.

Nếu có yêu cầu mới mâu thuẫn hoặc chưa rõ về gameplay/cốt truyện, cần hỏi lại trước khi đổi. Refactor kỹ thuật giữ nguyên hành vi có thể tiếp tục trong phạm vi đã được yêu cầu.

## Giữ app shell hiện tại

Giao diện TypeScript/DOM đã hoạt động; tách màn hình qua `ScreenContext` thay vì thêm React và thay UI trong cùng đợt refactor. Có thể thay lớp UI sau mà vẫn dùng cùng core. Chưa cần workspace nhiều package khi chưa có ứng dụng thứ hai sử dụng simulation.

## Kiểm thử hiện tại

Giữ bộ chạy `node:test` qua `tsx` để tiếp tục các kiểm thử đã có. Thêm golden regression từ commit gốc, kiểm tra ranh giới module và TypeScript strict. Không tuyên bố đã tích hợp Vitest hoặc bộ E2E Playwright tự động; QA trình duyệt được ghi riêng.
