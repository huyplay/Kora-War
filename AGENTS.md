# Quy tắc triển khai Kora War

## Các quyết định đã chốt ngày 13/10/2026

- Tiếp tục từ bản Three.js + TypeScript + Vite đã chơi được. Không chuyển sang PlayCanvas.
- Giữ cốt truyện Aetherfall: Elyndra, Đại Phân Ly, lõi Aether, Người Kết Nối, nhiệm vụ Thung lũng Khởi Nguyên.
- Quyết định bổ sung theo `Game_desgin.md`: MVP có ba lane, deck đúng bốn tướng + hai phép khác nhau, cả sáu thẻ luôn hiện. Trụ có máu và tự tấn công, hai lõi 1.500 HP.
- Người dùng đã xác nhận: “Áp dụng MVP thiết kế mới: 4 tướng + 2 phép, mana 4, PvP chuẩn hóa; giữ lore và luật khác”. Mana đầu trận MVP là 4/10; PvP dùng chỉ số chuẩn hóa. Bản legacy vẫn phục vụ fixture và replay cũ.
- Giữ luật trận hiện tại, gồm hồi mana 1,05/giây và quá tải lõi sau 180 giây. Không tự áp dụng luật hai lane, tay hai thẻ, thành 1.000 HP hay trụ trang trí trong bản master prompt cũ.
- Catalog hiện tại gồm 10 tướng Aetherfall và năm hệ/năm tộc. Yêu cầu quay về bản ban đầu thay thế hướng chuyển sang bộ tướng/cốt truyện Heartstone.
- Khi một yêu cầu mới mâu thuẫn với các quyết định này hoặc còn chưa rõ về thay đổi gameplay/nội dung, hỏi người dùng trước khi áp dụng. Có thể tiếp tục phần công việc độc lập trong lúc chờ.

## Ranh giới mã nguồn

- `src/data`: dữ liệu và cấu hình, không import core/rendering/UI.
- `src/core`: mô phỏng xác định theo seed và fixed tick; chỉ phụ thuộc core/data. Không DOM, Three.js, thời gian hệ thống hoặc `Math.random()`.
- `src/rendering`: Three.js đọc trạng thái và sự kiện; không gây sát thương, hồi mana hay quyết định thắng/thua.
- `src/ui`: các màn hình và thành phần giao diện; nhận context từ app.
- `src/app`: điều phối trạng thái phiên chơi, input và vòng lặp.
- `src/services`: lưu game và âm thanh.
- Các file `src/data.ts`, `simulation.ts`, `world.ts`, `audio.ts` chỉ là export tương thích. Không thêm implementation vào đó.

## Kiểm tra và tài liệu

- Chạy `npm run check` sau thay đổi logic/cấu trúc; kiểm tra trình duyệt khi đổi UI hoặc renderer.
- Các hash trong `tests/fixtures/three-baseline.json` được lấy từ commit `e792b00`. Không tạo lại fixture từ code mới để làm test vượt qua.
- Khi đổi gameplay đã được người dùng chấp thuận, ghi rõ quyết định và cập nhật test có chủ đích.
- Chỉ báo các kiểm thử đã chạy. FPS runtime không phải benchmark thiết bị thật.
- Không đưa cache, `node_modules` hay `dist` vào Git.

Xem [kiến trúc](docs/ARCHITECTURE.md) và [quyết định](docs/DECISIONS.md).

- Tên sản phẩm: Kora War. Giữ lore Elyndra/lõi Aether; tên cũ trong tài liệu lịch sử không phải tên sản phẩm hiện tại.
- Mobile-first, chỉ chơi ở màn hình ngang; thao tác chạm/kéo thả, ít chữ.
- Commit từng task đã kiểm thử và push lên origin hiện có theo yêu cầu người dùng.
