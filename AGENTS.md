# Quy tắc triển khai Kora War

## Tiền tuyến triển khai — quyết định 15/10/2026

- Người dùng yêu cầu tướng chỉ được thả phía căn cứ mình, trước quân địch còn sống gần căn cứ nhất trong cùng lane. Chỉ phép được miễn giới hạn tiền tuyến; chưa có tướng/thẻ vật phẩm ngoại lệ.
- Khi quân địch ép hết vùng triển khai để đánh lõi, tự mở vùng thủ ở cuối lane đó để vẫn gọi được tướng phòng thủ. Hai phe áp dụng đối xứng; quân chết hoặc lane khác không chặn vùng thả.
- `gameplay.board.deployment` trong module `board` schema 2 lưu bật/tắt, khoảng cách trước địch và bề rộng vùng thủ; admin lưu nháp/phát hành. Server, AI, quick deploy và renderer dùng chung hàm thuần. Snapshot cycle cũ thiếu policy giữ luật cũ, không backfill trận/replay lịch sử.

## Các quyết định mới đã chốt ngày 14/10/2026

- Người dùng chọn giữ gameplay đã chốt và ưu tiên cấu hình đầy đủ từ database. `ContentConfig.gameplay` trong SQLite là nguồn luật cho trận `cycle-v1` mới; admin lưu nháp/phát hành revision. Không thêm cơ chế mới ngoài phạm vi đã xác nhận.
- Mỗi trận khóa bản sao content; publish không sửa trận/replay đang tồn tại. Các preset trong `src/data` chỉ khởi tạo database, demo offline và tương thích replay cũ. Không thêm thông số cân bằng live vào core/rendering/UI.
- Gameplay hiện hành dùng `cycle-v1`: deck 14 thẻ khác nhau, mỗi thẻ 1 bản; tay 6 thẻ. Quyết định này thay thế deck cố định 4 tướng + 2 phép trong app mới.
- Xáo theo seed trước trận; bài mở đầu có ít nhất 4 tướng và 1 phép. Người chơi được giữ bài hoặc đổi tối đa 2 thẻ một lần trước combat, vẫn giữ bảo đảm thành phần mở đầu.
- Dùng thẻ thì rút thẻ kế tiếp vào đúng ô vừa dùng. Hết chồng rút chỉ xáo các thẻ đã dùng, giữ nguyên 6 thẻ trên tay; không xáo toàn deck mỗi lượt rút.
- Giữ 10 tướng Aetherfall; catalog có 8 phép: Gió, Lửa, Sét, Băng, Hồi Sinh Lực, Khiên Aether, Suy Yếu, Gia Tốc. Người dùng đã chọn thêm 4 phép hỗ trợ để có lựa chọn xây deck.
- Băng trong `cycle-v1` đóng băng, dừng di chuyển/đánh/kỹ năng trong 2 giây. Làm chậm khác vẫn giữ hiệu ứng mạnh nhất còn hiệu lực. Nyx ưu tiên áp sát hậu tuyến đánh xa, đặc biệt Du Hiệp, trong 5m.
- Giữ ba lane, mana đầu 4/10, hồi 1,05/giây, trụ/lõi, quá tải 180 giây, lore và chỉ số chuẩn hóa. Không áp dụng luật của game tham khảo ngoài các thay đổi được xác nhận.
- `new Battle()` và `tacticalBattle()` phục vụ fixture/replay cũ; không đổi hash golden. App mới gọi `cycleBattle()`; replay lưu ruleset và mã thẻ trên tay.

## Các quyết định đã chốt ngày 13/10/2026

Các mục deck cố định bên dưới là lịch sử, đã được quyết định ngày 14/10 thay thế trong app mới.

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

## Codex phụ trách toàn bộ dự án — quyết định 15/10/2026

- Người dùng đã dừng phân công Gemini: Codex trực tiếp quản lý, thiết kế, lập trình, QA và tích hợp. Quyết định này thay thế các mục phân công Gemini bên dưới (giữ để tra cứu lịch sử).
- Không giao task mới cho Gemini hoặc phát triển cầu nối Codex–Gemini. Issue #8 đóng vì không còn cần; bản nháp chưa merge được giữ trong worktree riêng.
- Task #4 (arena) và #5 (HUD) chuyển sang Codex. Giữ các asset Gemini đã được nghiệm thu trong main; không xóa hay sửa checkout của phiên ngoài.
- Tiếp tục GitHub issue, nhánh task và PR; Codex QA local rồi merge đúng commit đã kiểm tra. CI/CD vẫn tắt.

### Phân công trước ngày 15/10 (lịch sử)

- Codex quản lý backend/gameplay/kiến trúc/tích hợp/QA; Gemini nhận task hình ảnh có phạm vi riêng. Cùng tài khoản `huyplay`, phân biệt bằng issue label, nhánh và PR body.
- Mỗi task có GitHub issue và worktree riêng: `codex/<issue>-<task>` hoặc `gemini/<issue>-<task>`. Không cùng sửa một working tree/file; xem `docs/TEAM-WORKFLOW.md` và scope issue.
- Gemini không sửa core/data/server/app/workflow hoặc World.ts trong task art. Bàn giao manifest/provenance/budget/preview; Codex tích hợp qua PR sau QA local.
- Quyết định mới nhất ngày 14/10/2026: người dùng không cần CI/CD; Codex tự QA và merge main. Workflow GitHub Actions đã tắt, không có required status checks. Quyết định này thay thế yêu cầu CI/CD/checks trước đó.
- Giữ PR, lịch sử tuyến tính, giải quyết hội thoại và cấm force push/xóa main. Chỉ Codex thực hiện tích hợp sau các kiểm tra phù hợp, ghi bằng chứng vào PR/issue.

## Đấu trường — quyết định 15/10/2026

- Người dùng chọn Elo: điểm tăng/giảm theo đối thủ, bậc hạng do admin cấu hình. Đấu thường không đổi điểm, cả hai dùng map chuẩn và chỉ số chuẩn hóa.
- Thêm Thử thách riêng với hồi mana nhanh và quá tải sớm, thông số do admin cấu hình. Không đưa cơ chế đặc biệt này vào đấu hạng/thường.
- Module database `competition` quản lý chế độ, Elo, bậc hạng, ghép trận và Thử thách. Kết quả và điểm do server xác nhận, lưu SQLite; snapshot luật theo trận.

## Kiểm duyệt trận — quyết định 15/10/2026

- Người dùng chọn admin xử lý thủ công: hủy kết quả và hoàn tác phần Elo của trận, khóa PvP có thời hạn; bắt buộc lý do, không tự động phạt theo cảnh báo.
- Kết quả gốc/bản sao luật giữ nguyên. Điều chỉnh Elo và khóa lưu riêng trong SQLite cùng audit; không tính lại các trận xảy ra sau đó.

## Công thành và thao tác mobile — quyết định 15/10/2026

- Mỗi lane giới hạn thả tướng theo quân địch gần căn cứ mình nhất; khi bị ép hết chỗ thì mở dải phòng thủ cuối lane. Chỉ phép được miễn giới hạn hiện tại; các tướng đặc biệt sẽ được quyết định sau. Luật nằm trong module database `board.deployment`, snapshot cũ không có policy giữ luật cũ.
- Người dùng xác nhận đánh cổng/tường cuối cả ba lane trừ HP lõi chung hiện tại. Không thêm HP tường hoặc vật cản mới; mặt cổng hiển thị phải khớp tọa độ mục tiêu lõi.
- Triệu hồi phòng thủ giữ nguyên vị trí địch, chỉ tìm chỗ hiển thị cho quân mới. Không thêm lực đẩy hoặc va chạm vào combat.
- Các màn game dùng khung cố định, chạm/kéo thả và vuốt chuyển trang; không dùng cuộn trang để truy cập thẻ hoặc nút. Admin CMS vẫn là công cụ quản trị riêng.

## HUD và phản hồi thẻ mobile — quyết định 15/10/2026

- Người dùng yêu cầu hạn chế chữ không cần thiết, tính kỹ không gian/vị trí cho vuốt chạm; ưu tiên hình thẻ, số tài nguyên, biểu tượng và vùng chạm tối thiểu 44px. Giữ mô tả đầy đủ trong aria-label/màn chi tiết; không dùng tooltip hover trong thao tác touch.
- Bổ sung hoạt ảnh/âm thanh rút thẻ và chờ thẻ sẵn sàng. Phản hồi chờ đọc mana/cooldown hiện có, không thêm thời gian rút bài hay đổi luật. Chỉ thẻ thay thế bay từ chồng rút vào ô vừa dùng; thẻ còn lại giữ DOM/focus. Âm chờ phát khi chạm, âm sẵn sàng phát một lần; không lặp âm liên tục.
- Cue âm thanh thẻ là binding tùy chọn trong module audio database; nội dung cũ vẫn hợp lệ. Hỗ trợ tắt âm, pause và reduced motion.

## Cảnh báo công trình — quyết định 15/10/2026

- Người dùng yêu cầu tiếng/thông báo khi trụ hoặc thành bị sát thương, kèm hai mép màn hình đỏ nhấp nháy khi thành mất HP. Chỉ cảnh báo công trình phe mình theo HP snapshot; không thêm HP tường hoặc sửa combat. Lõi được ưu tiên khi cả trụ và thành cùng bị đánh.
- `tower-warning` và `core-warning` là cue tùy chọn của module audio database; admin chỉnh file, âm lượng, tốc độ và nhịp lặp qua `cooldownMs`. Chỉ installer thêm binding cho content mới sau backup; không sửa revision/replay cũ hoặc ghi đè lựa chọn admin.
- Cảnh báo có giới hạn nhịp, không phát từ snapshot đầu/reconnect; dọn khi đổi trận, kết thúc hoặc chuyển tab. Overlay không bắt chạm. Reduced motion giữ mép đỏ tĩnh thay nhấp nháy; mute/master/UI gain vẫn được tôn trọng.
