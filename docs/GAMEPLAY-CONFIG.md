# Cấu hình gameplay từ database — 14/10/2026

Phạm vi được người dùng chọn: giữ gameplay đã chốt, đưa các thông số và cơ chế hiện có vào Content Studio. Mặc định vẫn là deck 14 thẻ duy nhất, tay 6, mở đầu ít nhất 4 tướng/1 phép, đổi tối đa 2 thẻ, mana 4/10, hồi 1,05/s và Băng đóng băng 2 giây.

## Nguồn dữ liệu và phát hành

Backend Node lưu toàn bộ `ContentConfig`, gồm `gameplay`, trong JSON của bảng SQLite `config` (draft/published) và `revisions`. Trận luyện tập lưu content snapshot trong `matches`; phòng PvP khóa content trong Battle của phòng. Không có file JSON ngoài database ghi đè cân bằng sau khi nạp API. ASP.NET/PostgreSQL vẫn phục vụ metadata asset/snapshot theo giai đoạn migration hiện tại.

Mở `/admin` → **Gameplay** → chỉnh trường → **Lưu bản nháp** → **Phát hành**. Lưu chưa làm thay đổi published. Publish validate cấu hình/asset, kiểm tra version và tạo revision/audit. Nạp lại game để nhận revision mới; trận đang chạy và replay dùng bản sao cũ. **Phiên bản → Đưa về bản nháp** rồi phát hành để rollback. Không cần restart backend khi chỉnh cấu hình.

Lần khởi động bản nâng cấp, database cũ được bổ sung profile vào draft/published trong transaction, tạo revision và audit `gameplay.migrate`. Nội dung revision/matches cũ được giữ nguyên. Preset TypeScript chỉ khởi tạo database, chạy demo offline và phát lại content cũ thiếu profile. Sao lưu SQLite nhất quán qua backup API trước khi cập nhật môi trường đang chạy.

## Các nhóm có thể chỉnh

| Nhóm trong content | Phạm vi |
|---|---|
| `gameplay.deck` | Số thẻ, tay bài, thành phần mở đầu, giới hạn bản sao, đổi bài, xáo/recycle, deck mặc định và AI |
| `gameplay.startingMana`, `rules` | Mana đầu/tối đa/hồi, cooldown tướng, máu và đòn trụ, lõi, quá tải, giới hạn quân |
| `gameplay.spells` | Bật/tắt từng phép, tên/mô tả/màu, mana, cooldown, bán kính/cảnh báo/thời lượng, phe tác động và chuỗi hiệu ứng |
| `gameplay.synergies` | Ngưỡng tướng khác nhau, toàn đội/thành viên và các buff |
| `gameplay.resonance` | Bật/tắt, trần/tốc độ tích năng lượng, thưởng hạ gục/sát thương, sát thương/hồi máu/choáng |
| `gameplay.board`, `gameplay.combat` | Biên/vùng thả, gọi quân nhanh/AI, vị trí trụ/lõi, tầm lane/tìm mục tiêu và chờ đánh/kỹ năng |
| `gameplay.ai` | Nhịp theo độ khó, độ dao động, trọng số lane/thẻ, chọn đội hình/hồi máu/nhóm địch |
| `gameplay.match` | Chốt bài PvP, reconnect, giới hạn thời gian và phân định khi bằng điểm |
| `gameplay.collection`, `economy`, `items` | Vàng mới, cấp/mảnh nâng cấp, số thẻ rương, giá/phần thưởng/cửa hàng |
| `heroes`, `abilities` | Chỉ số, điều kiện/truy vấn/chuỗi kỹ năng, truy vấn hậu tuyến và khoảng áp sát |
| `models`, `map`, `vfx`, `audio` | Model/clip, vật liệu/props, atlas/màu và âm thanh theo các editor hiện có |

Phép hỗ trợ damage/heal/shield/push/slow/stun/freeze/weaken/haste. Vùng có `duration > 0` áp dụng damage/heal/shield/push theo giây; hiệu ứng trạng thái áp thời hạn từ lần tác động. `refresh` cập nhật thời hạn; `ignore-active` bỏ qua hiệu ứng đang còn hiệu lực. Băng freeze bảo vệ thời hạn đóng băng trước các lần choáng ngắn hơn; slow giữ mức mạnh nhất còn hiệu lực. Shield có `cap` tùy chọn.

Synergy hỗ trợ shield/health/attack/attackSpeed/skillCooldown/mana/regeneration/slowOnHit. Buff hệ số nhân kết hợp bằng phép nhân, buff cộng bằng phép cộng; ngưỡng đếm ID tướng khác nhau, không đếm bản sao. `members` chỉ tác động tướng đúng tộc/hệ; `team` tác động toàn đội. Mana là tài nguyên chung: buff `members` không có đối tượng quân nên không tăng mana đội.

Deck có thể cấu hình 2–54 thẻ, tay 2–10 và tối đa 1–3 bản sao. Validator bắt buộc đủ tướng/phép cho tay mở đầu, số đổi không vượt tay/chồng chưa rút, deck mặc định/AI hợp lệ và không chứa phép bị tắt. Nếu deck đã lưu trên thiết bị không còn hợp lệ, game dùng deck mặc định đã được validate. Tắt recycle tạo chồng hữu hạn; không tự tạo thẻ thay thế khi hết chồng.

## Ranh giới kỹ thuật

- Giữ ba lane, tick xác định 20 Hz, catalog 10 tướng/8 phép và giới hạn renderer 100 quân. Board phải đối xứng, nằm trong mặt sân hiện có; mana tối đa 30. Giá trị không hợp lệ, NaN, khóa lạ và deck không thể chia bị từ chối trước khi lưu/phát hành.
- Cấp sưu tập không tăng chỉ số cycle/PvP. `rules.startingMana` và `gameplay.combat.levelGrowth` là dữ liệu tương thích legacy; editor live dùng `gameplay.startingMana` và không hiển thị levelGrowth.
- Engine diễn giải các loại hiệu ứng/truy vấn đã hỗ trợ. Một loại cơ chế hoàn toàn mới vẫn cần code và test; không thực thi JavaScript từ database.
- PvP phòng riêng còn nằm trong bộ nhớ một process; restart mất phòng. Guest/deck lựa chọn và thiết lập máy giữ mô hình lưu hiện tại; đợt này chuyển cấu hình gameplay, không bổ sung tài khoản đa thiết bị.

## Kiểm thử

`tests/gameplay-config.test.ts` kiểm tra deck/UID/bản sao, chồng hữu hạn, phép cấu hình, synergy/áp sát, AI, giới hạn trận, economy, validation, migration giữ content cũ, API admin và dữ liệu HUD/VFX. Bộ regression tiếp tục kiểm replay/golden fixture gốc; không tạo lại baseline.

QA Chrome trên server riêng 8788 và database riêng: đổi tay 6 → 4, mở đầu 3 tướng/1 phép, đổi tối đa 1, mana 4 → 7; lưu/reload thấy giá trị giữ nguyên, phát hành và vào luyện tập thấy tay 4/mana 7/chồng rút 10. Khôi phục revision mặc định rồi publish; trận đã mở vẫn giữ profile cũ. Đã sửa lưu form theo input/đọc lại khi lưu và menu sidebar cuộn được ở màn hình thấp. Các giá trị QA không ghi vào database chính.

Kiểm tra cuối: `npm run check` vượt qua 148/148 test, kiểm tra ranh giới kiến trúc, TypeScript server/client và production build. QA form kỹ năng xác nhận giá trị số 87 và JSON 88 lưu được qua reload, kể cả tướng chưa gán model; sau đó khôi phục draft QA. Bản mặc định mới hiển thị tay 6/mana 4/chồng rút 8, được đổi 2 thẻ.

Database chính đã được sao lưu bằng SQLite backup API trước migration; published lên revision 12. Đối chiếu toàn bộ dòng cũ của players/cards/ledger/matches/assets/revisions với backup: giữ nguyên, chỉ bổ sung revision mới. Content Studio chính hiển thị đủ 10 tướng/51 asset và profile 14/6/4. Ảnh kiểm chứng local: `.data/gameplay-config-admin.png`. Không commit database, ảnh QA, upload hoặc build output.
