# Tiền tuyến, thẻ và năng lượng — 15/10/2026

Issue #18. Phạm vi theo người dùng: chỉ phép được miễn giới hạn tiền tuyến; chưa thêm tướng/thẻ vật phẩm ngoại lệ. Không thay mana, deck, chỉ số, phép, tầm đánh hay thứ tự tick.

## Luật triển khai

Mỗi lane tìm quân địch còn sống gần căn cứ mình nhất. Tướng chỉ được thả trong vùng nhà, cách phía căn cứ của quân đó ít nhất `clearance`. Quân chết và lane khác không ảnh hưởng. Nếu không còn đoạn triển khai, mở dải thủ cuối lane rộng `rearDefenseWidth`, cho phép gọi quân dù địch đã vượt qua dải này để đánh lõi. Hai phe đối xứng. Tọa độ người chơi chỉ định bị từ chối nếu sai; không âm thầm dời quân hoặc trừ mana/thẻ. AI và nút gọi quân nhanh tự chọn điểm trong vùng hợp lệ.

`core/physics/deployment-range.ts` là hàm thuần dùng chung cho Battle/server, AI, input và renderer. Renderer đọc vị trí logic, không dùng vị trí đội hình giãn hoặc camera để quyết định luật. PvP vẫn do server xác thực tọa độ/mã thẻ và cache kết quả command để retry không tiêu thẻ hai lần. Phép giữ nguyên phạm vi và mục tiêu hiện có.

## Database và admin

`gameplay.board.deployment` thuộc module `board` schema 2:

| Trường | Seed mặc định | Ý nghĩa |
|---|---|---|
| `enabled` | `true` | Bật luật tiền tuyến cho cycle |
| `clearance` | `0.6` m | Khoảng cách triển khai trước quân địch |
| `rearDefenseWidth` | `1.2` m | Dải thủ cuối lane khi địch ép hết chỗ |

Gameplay → **Tiền tuyến & vùng thủ cuối lane** chỉnh các trường này, lưu nháp/phát hành. Clearance giới hạn 0,05–2 m; vùng thủ 0,2–3 m và không vượt bề rộng vùng triển khai. Migration schema 1 → 2 tạo revision mới, giữ các giá trị board cũ và content/history cũ. Trận đang chạy giữ snapshot. Snapshot lịch sử thiếu policy không bị áp luật mới khi mô phỏng/replay; restore lịch sử vào nháp được nâng schema để dùng cho trận mới.

## Đồ họa

Vùng xanh chỉ đoạn hợp lệ; vùng đỏ báo đoạn phía sau địch bị chặn; vùng vàng chỉ dải thủ cuối lane. Mũi tên năng lượng theo từng lane nhấp nháy nhẹ; vòng trỏ đổi đỏ ở điểm không thể thả. Khi chọn phép, bỏ lớp vùng triển khai tướng và giữ preview phép.

Thẻ có khung kim loại, huy hiệu mana nhiều mặt, trạng thái thiếu mana xám và thẻ chọn nổi lên. Chân dung 256×352 render từ model hiện có, bám vị trí đầu thay vì bounding box bị khiên/vũ khí kéo lệch; góc model dùng `models.<id>.portraitYaw` từ database rồi khôi phục transform combat. Admin Nhân vật → Model & Animation có trường Hướng chân dung (độ). Model hiện tại của Aurelia dùng 180°, các model còn lại 0°; manifest nhập asset giữ giá trị này. Không nhập asset ngoài mới. Hình tham khảo chỉ dùng định hướng bố cục.

Mana dùng DOM tinh thể bền vững, cập nhật phần năng lượng thay vì tạo lại cây DOM mỗi 160 ms. Có hiệu ứng hồi đầy từng viên, ánh chạy trong viên đang hồi và phản hồi khi tiêu mana. Tôn trọng reduced motion trong hoạt ảnh DOM. Model/texture 3D hiện có vẫn dùng mipmap khi zoom.

## QA local

- `npm run check`: architecture, TypeScript server/client, **212/212 tests**, Vite build; golden `three-baseline.json` giữ nguyên.
- `npm run smoke`: production game/admin bundle, HTTP/content/module config, auth và người chơi database tạm đạt.
- Test mới: đối xứng/nearest enemy/lane/dead/push, từ chối atomic, phép miễn giới hạn, vùng thủ, AI chọn điểm hợp lệ, snapshot cũ, migration/history/restore, validator, vùng hiển thị và command PvP giả tọa độ/retry. Test portrait kiểm tra đầu vẫn trong khung khi khiên lớn lệch tâm.
- Edge trực tiếp, database QA riêng/59 asset: thả sau địch bị chặn giữ 10 mana và tay; Gió sau địch thành công, còn 8 mana và rút vào đúng ô; vùng thủ cuối lane gọi tướng thành công còn 6 mana. Luồng game thật sảnh → luyện tập → giữ bài → kéo thẻ Mira vào sân, rút thẻ đúng ô và hồi mana được kiểm tra ở mobile ngang 844×390. Fixture desktop 1536×720 kiểm tra vùng thả và thẻ. Không thấy lỗi/warning console trong phiên QA bản cuối.
- Admin QA: nháp clearance 0,8 chưa đổi public 0,6; phát hành revision 3 trả public 0,8; trả mặc định 0,6 ở revision 4. Nhân vật → Aurelia → góc chân dung 180° phát hành ở revision 5; hướng combat vẫn 0°. Không dùng database chính để thử publish.

Chưa benchmark điện thoại thật. Chunk Three.js còn cảnh báo trên 500 kB. Screenshot/harness QA chỉ lưu `.data`, không đưa vào source/release; production build cuối xóa harness tạm.
