# Các quyết định đang áp dụng

## 13/10/2026 — Ổn định MVP và quy tắc làm chậm

Người dùng đã chốt: trong trận tactical, giữ hiệu ứng làm chậm mạnh nhất còn hiệu lực và thời hạn riêng của từng mức làm chậm. Quy tắc áp dụng cho Băng, synergy Băng Thệ và kỹ năng tướng; không cộng phần trăm làm chậm.

- Hiệu ứng yếu hơn không ghi đè hoặc kéo dài thời hạn của hiệu ứng mạnh hơn. Khi hiệu ứng mạnh hết hạn, quân chuyển sang hiệu ứng yếu còn thời gian; hết mọi hiệu ứng thì trở về tốc độ thường.
- Hiệu ứng cùng mức làm chậm cập nhật thời hạn tới thời điểm hết hạn muộn hơn, không cộng thời lượng. Ví dụ Băng 40% hết ở giây 2,4 và Băng Thệ 20% hết ở giây 2,5: giữ 40% tới giây 2,4, sau đó 20% tới giây 2,5.
- Chỉ đường tactical dùng các bản ghi thời hạn này. `new Battle()` legacy tiếp tục hành vi ghi đè cũ để bảo toàn replay và golden fixture `e792b00`; không tạo lại hash fixture.
- Sửa sai số hết hạn Lửa để vùng có đủ 60 tick sát thương, tổng 135 khi mục tiêu ở trong vùng suốt 3 giây. Giữ thông số mana, sát thương, thời gian cảnh báo và hồi chiêu.
- Preview phép dùng đúng bán kính và màu của thẻ được chọn; các sửa retry, vòng đời phòng và selection PvP là thay đổi kỹ thuật ổn định MVP.

## 13/10/2026 — MVP Tactical Card Arena được phê duyệt

Người dùng yêu cầu phân tích project và triển khai `Game_desgin.md`, sau đó xác nhận: **“Áp dụng MVP thiết kế mới: 4 tướng + 2 phép, mana 4, PvP chuẩn hóa; giữ lore và luật khác”**. Quyết định này thay thế deck chỉ bốn thẻ và mana bắt đầu 5 trong bản chơi mới.

- Chế độ hiện hành: luyện tập AI và phòng PvP 1v1; 4 tướng + 2 phép luôn hiện. Bốn phép MVP: Gió/Lửa/Sét/Băng, có cooldown riêng và cùng ngân sách mana.
- Mana bắt đầu 4/10. Giữ hồi 1,05/s, bonus Lôi Đình, ba lane, trụ 400 HP tự đánh, lõi 1.500 HP, quá tải 180 giây, Cộng Hưởng Lõi và synergy theo deck.
- Trận tactical chuẩn hóa cấp tướng cho cả hai phía, kể cả luyện tập. Bộ sưu tập/ledger cũ được giữ; UI nói rõ cấp sưu tập không tăng chỉ số tactical.
- Giữ 10 tướng, năm hệ/năm tộc và lore Elyndra. Vai trò chiến thuật được đáp ứng bằng catalog hiện có; không đổi schema hệ/tộc thành bốn hệ mới.
- PvP MVP dùng TypeScript core trên Node gateway, fixed tick 20 Hz, HTTP command + snapshot khoảng 10 Hz. Đây là lựa chọn triển khai ban đầu, không phải hoàn tất lộ trình SignalR/C#.
- Phòng riêng có mã, khóa loadout, snapshot theo góc nhìn người chơi, reconnect cùng cookie/phòng trong 30 giây, đầu hàng và hết hạn phòng. Phòng nằm trong bộ nhớ một process. Không thưởng vàng/xếp hạng cho PvP trong MVP.
- Ranked, draft đối kháng, ban/pick, matchmaking, combo nguyên tố và replay UI thuộc Phase 2/3 của thiết kế; không đưa vào phạm vi MVP đã chọn.
- `new Battle()` giữ đường legacy để phát lại fixture `e792b00` và trận đã lưu. App mới gọi `tacticalBattle()`. Không sửa hash fixture.

Xem [phân tích project và kết quả triển khai](PROJECT-REVIEW.md).

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

## Asset, dashboard và economy — bổ sung cùng ngày

Người dùng yêu cầu backend/database, dashboard điều chỉnh tướng/kỹ năng/map/asset/vật phẩm/tiền và chọn thêm vòng chơi nhận vàng, mở rương, cửa hàng, nâng cấp thẻ. Node 24 + SQLite phục vụ game và admin cùng origin; bản nháp, published revision và audit log tách riêng. Admin điều chỉnh dữ liệu không có hiệu lực giữa trận. Cấu hình mặc định giữ luật đã chốt; chỉnh cân bằng qua dashboard là thao tác phát hành có chủ đích.

Người dùng xác nhận có giấy phép dùng toàn bộ asset Riot. Ngoại hình LoL được gán vào 10 tướng Kora War, giữ tên/hệ/tộc/lore. Khada là nguồn chính; CommunityDragon cung cấp sprite. Ghi nguồn, checksum và xác nhận quyền từng asset. Phạm vi kinh tế/cấp tướng, cách vận hành và giới hạn được ghi trong [Content Studio](ADMIN.md).

## Chuyển backend và mở rộng media

Người dùng chọn chuyển từng bước sang ASP.NET Core/PostgreSQL, ưu tiên asset/admin/database và tiếp tục chơi AI. PvP chỉ chuẩn bị kiến trúc. Database riêng là `kora_war`, cấu hình bí mật qua `.env.local`; hiện chưa có R2. File lớn dùng object storage, PostgreSQL lưu metadata; không lưu binary model/audio vào bảng game. Bước hiện tại bổ sung service asset và snapshot chuyển dữ liệu, giữ một nơi ghi ví/trận ở SQLite đến khi hoàn tất migration nghiệp vụ.
