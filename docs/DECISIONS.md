# Các quyết định đang áp dụng

## 16/10/2026 — Dấu hỗ trợ dưới chân tướng

Tiếp tục đồ họa: tăng tốc dùng chevron theo hướng phe, suy yếu dùng ấn đứt đoạn, gom một lượt vẽ và bám bán kính/origin hiển thị. Màu và style từ snapshot database; legacy giữ vòng cũ. Không đổi luật, thời hạn hoặc phát hành content; hỗ trợ pause/reduced motion/reset/disposal. Xem [QA dấu hỗ trợ](SUPPORT-AURAS-QA.md).

## 16/10/2026 — Phân biệt lớp băng và khiên

Tiếp tục đồ họa trạng thái: khiên có lưới năng lượng và viền, băng có vân tinh thể/phủ sương, giữ màu/opacity/padding từ snapshot database. Họa tiết ổn định theo ID, một lượt vẽ giới hạn 200 lớp; pause/reduced motion, dữ liệu lỗi và disposal được kiểm tra. Không sửa luật hoặc phát hành content. Xem [QA lớp trạng thái](STATUS-BODIES-QA.md).

## 16/10/2026 — Vệt chém cận chiến theo thân tướng

Tiếp tục yêu cầu đồ họa: crescent thuôn/mềm, bám người ra đòn theo origin và kích thước hiển thị, giữ hướng hai phe và cấu hình melee từ database. Dọn khi freeze/stun/death, giữ pause và không phát lại cue sau reduced motion/reset. Không đổi combat, attack clip hoặc content đã phát hành; lịch sử thiếu profile giữ hình cung cũ. Xem [QA cận chiến](MELEE-SLASHES-QA.md).

## 16/10/2026 — Vệt đạn và dấu va chạm của tướng

Tiếp tục yêu cầu hoàn thiện đồ họa: vệt đạn thuôn/mờ dần, dấu trúng đòn mềm và rõ trên thân tướng. Giữ profile combat từ database đã khóa, pool giới hạn và luật sát thương hiện hành. Đạn bám torso hiển thị, xử lý pause/tọa độ lỗi/giảm chuyển động và disposal an toàn. Không thêm schema hoặc phát hành content. Xem [QA đường đạn tướng](HERO-PROJECTILES-QA.md).

## 16/10/2026 — Model và khung bộ sưu tập

Tiếp tục hoàn thiện đồ họa: admin bật/tắt phần model bằng material trong database và chỉnh góc bộ sưu tập độc lập chân dung. Renderer chỉ tính khung theo phần được vẽ, bỏ ảnh hưởng của đạo cụ ẩn/dữ liệu đỉnh dùng chung; giữ nguyên gameplay. Gói chỉnh Kael/Vesper/Orin/Torvyn và hướng mô hình Aurelia có backup, bảo vệ tùy chỉnh admin và snapshot lịch sử. Xem [QA và cài đặt](MODEL-PRESENTATION-QA.md).

## 16/10/2026 — Bốn tướng mới từ catalog database

Người dùng đổi phạm vi từ ngoại hình sang **thêm tướng mới**, sau đó chọn 4 model Leona (đỡ đòn), Ahri (pháp sư), Zed (sát thủ), Volibear (đấu sĩ). Tên/lore Elyndra: Elara, Seryn, Kharos, Torvyn. Kỹ năng ghép từ damage/heal/shield/stun/engage đã có; admin chỉnh chỉ số, nội dung, hệ/tộc, model và chuỗi hiệu ứng qua bản nháp/phát hành database.

Catalog live tăng từ 10 lên 14 tướng, cùng 8 phép. Không tự đổi deck mặc định/AI/người chơi hoặc luật trận. Core, save, synergy, PvP và renderer nhận catalog của content khóa theo trận; preset gốc vẫn có 10 tướng để giữ fixture/replay. Installer cộng thêm tướng/mảnh cho ví cũ và mới, không reset tiến độ, không sửa snapshot lịch sử. Xem [cài đặt và QA](NEW-HEROES.md).

## 15/10/2026 — Tiền tuyến và phòng thủ cuối lane

Người dùng xác nhận tướng chỉ triển khai trước quân địch gần căn cứ mình nhất trong cùng lane; chỉ phép miễn giới hạn, tướng đặc biệt sẽ xét ở đợt sau. Nếu địch ép hết vùng triển khai để đánh lõi, mở vùng thủ cuối lane để gọi quân phòng thủ. Module `board` schema 2 lưu policy, khóa theo trận; thiếu policy trong snapshot lịch sử vẫn dùng luật cũ. Bổ sung vùng báo xanh/đỏ/vàng, mũi tên triển khai, chân dung cận cảnh và mana tinh thể. Xem [triển khai và QA](FRONTLINE-CARDS-QA.md).

## 15/10/2026 — Ánh sáng, thành và hiệu ứng trụ

Người dùng yêu cầu tăng độ sáng, mặt trời ban ngày/đuốc ban đêm, thành hai đầu lớn và cao hơn, trụ cao hơn tướng, công trình gắn với nền và trụ bắn rõ phạm vi/hiệu ứng. Triển khai ở presentation: mặc định ban ngày, admin chọn ngày/đêm cố định theo snapshot trận và chỉnh quy mô/ánh sáng/VFX trong database. Phạm vi trụ phản ánh tầm đánh cùng lane đã có; không thêm đánh xuyên lane hay thời gian đạn gây sát thương mới. Module presentation nâng schema 1 lên 2, giữ replay/revision cũ. Xem [nghiệm thu](ARENA-LIGHTING-QA.md).

## 14/10/2026 — Đội hình hiển thị, chat nhanh và hai agent

Người dùng chọn giãn đội hình ở renderer, giữ luật combat; bổ sung emoji/câu soạn sẵn giữa hai người chơi. `presentation`/`communication` lưu module database; chat transient nằm trong phòng PvP, không đổi mô phỏng/replay. Xem [triển khai và QA](BATTLE-PRESENTATION.md).

Người dùng giao Codex làm lead/backend/gameplay/tích hợp và Gemini design, cùng account GitHub huyplay. Issue/nhánh/worktree phân biệt agent và phạm vi; Codex tích hợp PR sau CI. Triển khai trên GitHub: Pages phục vụ demo AI tĩnh; gói runtime được build trên Actions, backend/PvP/database vẫn cần Node hosting. Xem [quy trình hai agent](TEAM-WORKFLOW.md).

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

## QA thủ công và phối hợp Codex/Gemini — quyết định mới nhất 14/10/2026

Người dùng yêu cầu không cần CI/CD, giao Codex tự QA và merge main; Gemini đang chạy song song phần design. Tắt GitHub workflow CI và gỡ required status checks, giữ PR/bảo vệ main. Codex review đúng HEAD sau các kiểm tra local phù hợp rồi squash/rebase merge; không chờ Billing hoặc tự bật lại CI/CD. Task/nhánh/worktree/scope riêng theo GitHub issues để hai agent không cùng sửa file. Xem [quy trình nhóm](TEAM-WORKFLOW.md).

## 15/10/2026 — Đấu thường, Elo và Thử thách

Người dùng chốt Elo và admin cấu hình bậc hạng; đấu thường/hạng dùng map chuẩn, chỉ số chuẩn hóa. Chế độ Thử thách riêng dùng hồi mana nhanh và quá tải sớm. Module `competition` và kết quả trận lưu SQLite, khóa cấu hình khi ghép trận; không reset mùa hoặc thưởng rank trong đợt này. Chi tiết: [Đấu trường](COMPETITION.md).

## 15/10/2026 — Admin kiểm duyệt thủ công

Người dùng chọn admin hủy kết quả, hoàn tác phần Elo của trận và khóa PvP có thời hạn, bắt buộc lý do; cảnh báo không tự động phạt. Kết quả gốc giữ nguyên, correction/action/audit lưu riêng. Xem [kiểm duyệt](FAIR-PLAY.md).

## 15/10/2026 — Công thành, phòng thủ cuối lane và màn hình chạm

Người dùng xác nhận cả ba cổng là phần hiển thị của lõi chung: đánh cổng trừ HP lõi, không tạo HP tường hoặc vật cản. Cổng được căn theo `board.coreX`, giữ khoảng đánh hiện tại của từng tướng. Triệu hồi cuối lane không di chuyển quân địch; renderer dành chỗ cho quân mới sau khi bố trí quân đang có. Các màn game chuyển sang trang cố định và vuốt ngang thay vì cuộn tài liệu. Xem [triển khai và QA](SIEGE-MOBILE.md).

## 16/10/2026 — Bộ sưu tập tướng trên mobile

Theo ảnh tham chiếu mới, đội hình 14 thẻ hiển thị đồng thời thành hai hàng model có animation trên bệ; bộ sưu tập ở dải thẻ vuốt ngang bên dưới. Chạm mở chi tiết, bỏ/thêm hoặc chọn ô để thay thẻ; bản nháp giữ nguyên khi xem và nâng cấp. Đây là cuộn ngang nội bộ có giới hạn, không cuộn trang game.

Nâng cấp dùng ví server, `collection.copiesPerLevel`, `collection.maxLevel` và `economy.upgradeBase` từ content database. Cấp vẫn là cấp sưu tập, chỉ số combat chuẩn hóa; không thêm tiền tệ, deck preset hoặc powerup từ ảnh. Một renderer WebGL được dùng chung với chiến trường; close trả canvas/trạng thái về World, giảm chuyển động và tab ẩn dừng animation. Xem [QA bộ sưu tập](ROSTER-QA.md).

## 16/10/2026 — Đạn tướng có cấu hình và đúng điểm chạm

Tiếp tục hoàn thiện đồ họa theo yêu cầu người dùng: profile VFX tùy chọn trong database điều khiển kiểu/màu đạn, quỹ đạo và điểm chạm. Renderer nối đạn với hit của cùng đòn và giữ tọa độ quân vừa chết trong frame, thay cách chọn quân gần nhất. Pool giới hạn, pause và reduced motion được hỗ trợ. Không thay luật, nhịp đánh hoặc thời điểm sát thương; snapshot cũ giữ hiệu ứng cũ. Xem [QA đạn chiến đấu](COMBAT-VFX-QA.md).

## 16/10/2026 — Số chiến đấu, băng và lá chắn

Tiếp tục hoàn thiện phản hồi giao chiến trên mobile: số có kích thước theo pixel, lớp băng/khiên theo model và trạng thái snapshot. Profile hiển thị tùy chọn lưu trong database, admin phát hành cho trận mới; không tạo timer hoặc tác động combat mới. Bỏ lớp rune băng trùng khi dùng profile mới, giữ biểu tượng thanh máu. Đóng băng giữ pose của cả model nhập và model dự phòng. Xem [QA phản hồi tướng](UNIT-FEEDBACK-QA.md).

## 16/10/2026 — Giảm lớp sáng che tướng

Tiếp tục hoàn thiện đồ họa theo yêu cầu người dùng: profile database tùy chọn điều khiển độ rõ/kích thước/trộn màu/nhịp và ngân sách atlas sự kiện theo vùng. Khi profile có mặt, sprite không bị vẽ trùng thêm vòng generic. Vệt chém căn theo model/đội hình và hỗ trợ giảm chuyển động. Không đổi combat, asset hay cấu hình lịch sử. Xem [QA độ rõ giao chiến](DENSE-COMBAT-QA.md).

## 16/10/2026 — Kéo thả mobile an toàn

Tiếp tục tối ưu thao tác theo yêu cầu mobile: ảnh thẻ có dấu vùng thả hợp lệ, nằm trên ngón và không vượt màn hình. Chạm thêm ngón, mất capture, đổi tay bài hoặc mất readiness hủy thao tác; chỉ giữ UID của pointer được nhận. Preview đứng yên theo tiền tuyến hiện hành; đổi thẻ xóa mục tiêu cũ. Không đổi luật, tọa độ thả, balance hoặc database. Xem [QA kéo thả](MOBILE-DRAG-QA.md).

## 16/10/2026 — Vòng đời phản hồi thẻ

Tiếp tục hoàn thiện phản hồi mobile: mulligan và snapshot nối lại giữ im lặng; ẩn tab/mất mạng dọn phản hồi cũ, pause thường giữ animation thẻ. Reduced motion dừng hoạt ảnh đang chạy; mana trận mới không tạo pulse tiêu giả. Giới hạn một animation mỗi phần tử và dọn theo vòng đời màn hình. Không đổi gameplay, audio asset hay content database. Xem [QA phản hồi thẻ](CARD-FEEDBACK-LIFECYCLE-QA.md).

## 16/10/2026 — Vùng ngắm phép theo lane

Tiếp tục làm rõ chiến đấu mobile: vùng ngắm phép lấy bán kính/bề rộng lane từ snapshot và đánh dấu các quân hợp lệ hiện tại. Core và renderer dùng chung predicate cũ; dấu chân theo vị trí hình ảnh, lệnh giữ tọa độ logic. Không đổi phép, timing, balance hoặc database. Xem [QA vùng ngắm phép](SPELL-AIM-QA.md).

## 16/10/2026 — Ngắm Cộng Hưởng toàn lane

Tiếp tục làm rõ thao tác mobile: chọn Cộng Hưởng hiện ba guide, nhấn mạnh lane ngắm và đánh dấu đồng minh/địch bằng màu content đã khóa. Ẩn vòng con trỏ nhỏ và vùng thả tướng gây nhầm phạm vi. Core/renderer dùng chung điều kiện còn sống/cùng lane cũ, giữ cách chọn lane gần nhất kể cả ngoài phần nền lane. Không đổi gameplay, năng lượng hoặc database. Xem [QA Cộng Hưởng](PULSE-AIM-QA.md).

## 16/10/2026 — Vùng phép và độ rõ Lửa sau khi dùng

Vùng báo trước/đang tác động dùng cùng footprint chữ nhật với ngắm phép theo radius/bề rộng lane từ snapshot. Cone/atlas Lửa co theo vùng; atlas phép dùng opacity/blend của profile readability đã phát hành để giảm chói. Giữ target, damage, warning/duration, mana, deck và revision database; không thêm luật hoặc asset. Xem [QA vùng phép](SPELL-ZONE-QA.md).

## 16/10/2026 — Đạn trụ theo thân tướng và tầm bắn mobile

Đạn trụ căn điểm chạm theo model/scale đội hình và đúng hit target; cập nhật tới arrival rồi giữ impact, không track khi pause. Reduced motion dùng dấu tĩnh, không tiếp tục đường đạn cũ khi tắt. Viền tầm bắn dùng plane rõ hơn và màu/opacity từ content đã khóa. Không đổi core, timing sát thương, balance hoặc database. Xem [QA đạn trụ](TOWER-VFX-QA.md).

## 16/10/2026 — Hủy pinch bị ngắt trên mobile

Pinch mất capture/thêm ngón hoặc bị ngắt bởi vòng đời màn hình sẽ hủy và chặn click tới khi các ngón đã kết thúc. Dọn trạng thái khi pause, đổi trận, xoay dọc và mất kết nối; nhận release ngoài canvas để không kẹt input. Giữ tap dùng thẻ, giới hạn zoom và toàn bộ luật/config hiện hành. Xem [QA cử chỉ sân](ARENA-GESTURES-QA.md).

## 16/10/2026 — Chậu đuốc và ánh lửa ngày/đêm

Nâng cấp bệ/chậu đuốc và lửa nhiều lớp; geometry, sprite và nguồn sáng dùng chung mốc. Cường độ/mode từ presentation snapshot điều khiển cả lửa và ánh sáng, bao gồm tắt hoàn toàn. Đồng bộ dao động với render clock, pause và reduced motion; không đổi gameplay hay database. Xem [QA ánh lửa](ARENA-TORCHES-QA.md).

## 16/10/2026 — Sắc độ đá và vòng đời vật liệu

Kiến trúc đá có sắc độ vertex tĩnh theo mặt/khe/khối, giữ geometry, UV và tint texture của database. Vật liệu có/không có màu đỉnh dùng biến thể phù hợp; nạp PBR theo generation, thay/clear đủ các kênh và dọn texture bị thay thế hoặc tới muộn. Không đổi gameplay, asset hay config phát hành. Xem [QA vật liệu sân](ARENA-SURFACES-QA.md).

## 16/10/2026 — Cổng gia cố Elyndra

Cổng thành có mũ đá, ngưỡng nền, đai/đinh tán và huy hiệu Aether hai phe; trụ cổng có lớp đá rõ hơn. Chi tiết tĩnh bake cùng batch, giữ mặt đánh theo coreX và scale cấu hình; không thêm vật cản, HP hay đổi combat/database. Xem [QA cổng thành](FORTRESS-DETAILS-QA.md).

## 16/10/2026 — Phản hồi sát thương trụ

Dấu nứt quanh chân trụ đọc HP và dấu trúng đòn đọc delta thực, dùng palette/readability đã khóa. Giới hạn sáu slot, giữ im lặng snapshot đầu; pause/reset/dispose theo vòng đời. Reduced motion giữ dấu tĩnh và chuyển collapse/rubble thành tàn tích đứng yên, không đổi combat hoặc database. Xem [QA sát thương trụ](STRUCTURE-DAMAGE-QA.md).
