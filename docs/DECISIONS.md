# Các quyết định đang áp dụng

## 14/10/2026 — Module gameplay/rule và phiên bản database

Người dùng yêu cầu module hóa cơ chế/rule để nâng cấp và điều chỉnh sau này. Tách dữ liệu profile thành các module trách nhiệm; registry chứa ID/schema/migration. SQLite `rule_modules` là nguồn đọc gameplay, `rule_module_revisions` lưu history; giữ content snapshot để replay/tool cũ hoạt động. Tách pipeline system khỏi Battle, giữ nguyên thứ tự tick và gameplay. Admin hiển thị schema/version nháp/live; sửa module riêng vẫn validate cả bộ luật, phát hành theo revision thống nhất và transaction. Không chạy code tùy ý từ database. Xem [cấu trúc và vận hành](RULE-MODULES.md).

## 14/10/2026 — Gameplay cấu hình từ database

Người dùng yêu cầu admin điều chỉnh các cơ chế gameplay và lưu cấu hình trên database, sau đó chọn **“Giữ gameplay đã chốt, ưu tiên config đầy đủ”**. Không tự thêm tăng trần mana, bỏ bài hoặc thay luật mặc định.

`ContentConfig.gameplay` chứa luật deck/tay bài/đổi bài, phép và chuỗi hiệu ứng, synergy, Cộng Hưởng Lõi, vùng triển khai/combat, AI, thời hạn PvP và bộ sưu tập. Chỉ số tướng/kỹ năng, rules, giá/phần thưởng và media tiếp tục dùng các nhóm content hiện có. Admin lưu nháp, validate, phát hành revision hoặc khôi phục revision về nháp. AI, luyện tập, PvP, HUD và renderer đọc cùng profile.

SQLite hiện là nơi ghi gameplay config. PostgreSQL tiếp tục phụ trách asset/snapshot theo lộ trình backend, chưa chuyển nơi ghi gameplay nghiệp vụ. Migration bổ sung profile cho draft/published, tạo revision mới và audit; giữ nguyên content của revision/trận cũ. Trận mới khóa bản sao content; phiên app đang mở cần nạp lại để nhận bản phát hành mới.

Preset trong code phục vụ khởi tạo, demo offline và replay thiếu profile. Ba lane, fixed tick 20 Hz, catalog 10 tướng/8 phép và giới hạn 100 quân là ranh giới engine. Có thể ghép các loại hiệu ứng đã hỗ trợ trong admin; loại cơ chế hoàn toàn mới cần handler và test. Xem [cấu hình và QA](GAMEPLAY-CONFIG.md).

## 14/10/2026 — Deck 14 thẻ, tay 6 và chiến thuật hậu tuyến

Người dùng yêu cầu cơ chế rút bài theo Castle Crush và đã xác nhận: **mỗi thẻ 1 bản**, thêm **hồi máu/lá chắn/suy yếu/tăng tốc**, **Băng đóng băng 2 giây**, hết chồng rút **chỉ xáo thẻ đã dùng, giữ nguyên tay 6 thẻ**. Đây là luật hiện hành `cycle-v1`, thay thế deck cố định 4 tướng + 2 phép của MVP ngày 13/10.

- Xây deck đúng 14 thẻ từ 10 tướng + 8 phép; không trùng. Mở đầu 6 thẻ có ít nhất 4 tướng và 1 phép. Xáo Fisher–Yates theo PRNG seed một lần, sau đó hoán đổi tối thiểu để đạt thành phần mở đầu.
- Được giữ bài hoặc đổi 1–2 thẻ một lần. Thẻ thay lấy từ chồng chưa rút, vẫn giữ bảo đảm mở đầu; thẻ trả đặt cuối chồng. Luyện tập dừng tick/mana/AI tới khi chốt; PvP tự giữ bài sau 15 giây nếu chưa chốt.
- Dùng thẻ hợp lệ thì thay đúng ô bằng thẻ kế tiếp; lệnh thiếu mana, sai vị trí, cooldown hoặc mã thẻ cũ không tiêu thẻ. Mỗi lần vào tay có UID mới để chống lệnh chậm/trùng. Khi chồng rút trống, chỉ xáo discard gồm các thẻ đã dùng. Tổng hand + pile + discard luôn 14, không trùng.
- Băng gây 35 sát thương và đóng băng di chuyển/đánh/kỹ năng 2 giây sau cảnh báo; khống chế ngắn hơn không kết thúc đóng băng sớm. Tactical cũ vẫn làm chậm 40% trong 2 giây; quy tắc slow mạnh nhất tiếp tục áp dụng riêng.
- Hồi Sinh Lực hồi 100 HP trong vùng; Khiên Aether thêm 100 khiên, tổng tối đa 200; Suy Yếu giảm sát thương từ quân 30% trong 4 giây; Gia Tốc tăng di chuyển và tốc độ đánh 35% trong 4 giây. Hồi máu/khiên/gia tốc tác động đồng minh; phép tấn công tác động địch. Tái áp dụng hiệu ứng thời hạn cập nhật tới thời điểm tác động mới, không cộng dồn hệ số.
- Nyx ưu tiên mục tiêu đánh xa cùng lane trong 5m, Du Hiệp trước, rồi HP thấp/ID; áp sát phía sau và dùng sát thương Ám Kích 120. Khi không có hậu tuyến phù hợp, giữ kỹ năng cũ. Mage AoE và Gió đẩy lùi giữ luật hiện có.
- PvP server giữ seed/thứ tự rút/tay đối thủ riêng; client chỉ nhận tay của mình và số thẻ đối thủ. Replay luyện tập lưu ruleset, lệnh chốt bài tick 0 và UID từng thẻ. Save cũ chuyển sang deck 14 hợp lệ; fixture gốc không sửa.
- Giữ Three.js, lore, ba lane, mana 4/10, hồi 1,05/s, trụ 400 HP, lõi 1.500 HP, quá tải 180 giây, synergy theo deck và cấp chuẩn hóa. Deck nhiều tướng kích hoạt nhiều synergy hơn; cân bằng thực chiến vẫn cần playtest.

Các quyết định deck cố định bên dưới là lịch sử của ruleset cũ. Xem [QA deck và combat](CARD-DECK-QA.md).

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

## Nâng cấp hình ảnh theo mẫu và zoom — 14/10/2026

Người dùng yêu cầu map trước, sau đó hiệu ứng/animation/âm thanh và Home riêng theo ảnh tham chiếu; bổ sung zoom in/out. Giữ Three.js và lore Elyndra. Camera nghiêng, ba lane ngang, Home có huy hiệu Aether riêng; không thêm ranked, timer rương hoặc tiền tệ giả theo ảnh mẫu. Zoom giới hạn 1–1,85×, projection 3D, HUD giữ kích thước; pinch hủy chọn thẻ và chặn click phát sinh. Texture/model Poly Haven và atlas GegX được dùng qua asset service local. Đây là thay đổi trình bày, không đổi Băng thành stun hoặc sửa sát thương phép. Xem [QA đồ họa](VISUAL-QA.md).

## Animation và vật liệu — tiếp tục ngày 14/10/2026

Cờ vải dùng texture dệt và huy hiệu Aether tạo bằng canvas, mesh uốn với mép trên cố định; đuốc dùng texture gradient, tàn lửa theo pool. Tia trúng đòn và vệt chém cận chiến là lớp trình bày giới hạn 128 tia/16 vệt. PBR giữ sắc độ từng loại đá; texture model được áp anisotropy theo GPU. Clip đánh/cast/spawn/death được căn theo cửa sổ animation, idle fallback luôn lặp. Pause giữ pose và dừng cả VFX/cảnh vật; render-frame delta theo tốc độ chơi giữ chuyển động mượt giữa các tick mô phỏng. Mira được đóng gói lại từ nguồn đã kiểm SHA để bổ sung clip đi/đánh/cast gốc; không thay chỉ số hoặc luật trận.

## Hoàn thiện phản hồi giao chiến — 14/10/2026

Số nổi lấy chênh lệch HP giữa các snapshot, không lấy giá trị hit trước khi trừ lá chắn. Nhịp hồi nhỏ tích lũy ít nhất 3 HP trước khi hiển thị; damage liên tiếp được gom theo cửa sổ 0,18 giây. Các số chỉ mô tả thay đổi nhìn thấy giữa snapshot, không thay log sát thương server. Thanh máu có nền, vệt tụt và neo trái; độ cao theo model. Hit flash có material riêng cho từng instance, giữ texture nguồn. Bóng mềm dùng một texture radial và instancing tối đa 100 quân, vẫn có ở low. Trụ HP bằng 0 có animation sụp 0,65 giây và pool tối đa 72 mảnh; trạng thái combat vẫn theo simulation ngay lập tức. Reset phục hồi transform trụ và xóa toàn bộ pool.
