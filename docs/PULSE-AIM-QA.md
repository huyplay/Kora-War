# Ngắm Cộng Hưởng Lõi — 16/10/2026

Task [#61](https://github.com/huyplay/Kora-War/issues/61) làm rõ kỹ năng tác động toàn lane. Khi chọn Cộng Hưởng, ba lane có viền mờ; đưa ngón tay đến sân nhấn mạnh lane đang ngắm và đánh dấu quân còn sống trong lane đó. Vòng nhỏ theo con trỏ và vùng triển khai tướng được ẩn khi chọn kỹ năng.

- `core/physics/pulse-area.ts` chứa đúng điều kiện cũ của `castPulse`: còn sống và cùng lane, không giới hạn khoảng cách x. Core và preview dùng chung, không sửa lượng hồi máu/sát thương/stun, năng lượng, mana hoặc nhịp dùng kỹ năng. Hai phe được kiểm tra đối xứng; fixture/replay cũ giữ nguyên hash.
- Chiều dài/bề rộng lấy từ board snapshot, màu viền từ `vfx.ally`, dấu đồng minh từ `vfx.heal`, dấu địch từ `vfx.enemy` trong content đã khóa. Admin phát hành giá trị mới thì trận mới dùng giá trị đó. Không thêm cấu hình hoặc migration.
- Giữ cách chọn lane gần nhất của lệnh hiện tại, kể cả điểm ground nằm ngoài phần nền lane. Không thêm kiểm tra `spellValid` vào lệnh Cộng Hưởng. Ray không có ground không gửi lệnh. Dấu chỉ phản ánh snapshot hiện tại, không khóa mục tiêu trước khi dùng.
- Dấu chân dùng vị trí đội hình đã giãn và kích thước thân model; không di chuyển quân hoặc dùng tọa độ hình ảnh để đổi lane combat. Cập nhật sau khi đồng bộ vị trí quân, kể cả con trỏ đứng yên. Quân chết/rời lane hoặc chưa có visual không giữ dấu cũ.
- Dùng chung primitive với ngắm phép: ba plane tái sử dụng và một batch tối đa 100 dấu chân. Không thêm texture, chữ, âm thanh hoặc animation. Chuyển thẻ/hủy chọn/pinch/pause/end/reset dọn preview; dispose trả tài nguyên GPU. Reduced motion dùng cùng dấu tĩnh.

## QA

- `npm run check`: kiểm tra kiến trúc, TypeScript server/client, **359 tests**, production build. Hai test core bao phủ predicate chính xác và đối chiếu cast thật với cap/damage/heal/stun tùy chỉnh cho hai phe, gồm quân ở xa, chết và lane khác. Bốn test renderer bao phủ board tùy chỉnh, màu hai phe, tọa độ formation, đổi eligibility/palette, missing visual, cap 100 và disposal. Test World kiểm tra lấy màu từ content đã khóa, giữ pick mode ngoài nền lane, pointer đứng yên và clear. Test ngắm phép hiện có vẫn qua.
- `npm run smoke`, `git diff --check`; review trực tiếp tích hợp World/app và vòng đời tài nguyên.
- Chrome DOM **844×390** và **667×376**: ba guide ban đầu; chọn lane bằng touch và đánh dấu cả hai phe; touch release dùng Cộng Hưởng và giữ nguyên sáu thẻ/chồng rút 7/mana 10 trong fixture. Chọn ngoài nền lane, zoom wheel, pinch hủy chọn, chuyển sang Băng, hủy chọn, pause/resume và reduced motion. Document không cuộn; console không có warning/error trong lượt QA. Ảnh local `.data/pulse-aim.png`.
- Database QA riêng, chỉ sao content/asset, không sao người chơi/session. Fixture dùng max/starting mana 10, HP tướng 5.000, attack 1, skill cooldown 900s, resonance cap 1/passive 0,1 và gain chiến đấu 0 để quan sát; không triển khai các giá trị này. Main giữ revision 29. Kích thước trình duyệt không phải nghiệm thu cảm ứng hay benchmark điện thoại thật.
