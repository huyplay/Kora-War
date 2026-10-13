# GAME DESIGN – Tactical Card Arena

**Thể loại:** MOBA 3-lane + Real-time Card Strategy + Auto Battle  
**Lấy cảm hứng:** Liên Quân Mobile (bản đồ, chọn tướng), TFT (đội hình, hệ tộc), Castle Crush (triệu hồi quân, phá thành).  
**Nền tảng:** Web (Three.js), định hướng mở rộng Mobile và Desktop.

## 1. Core Gameplay

- **Bản đồ 3 lane:** Top – Mid – Bot, mỗi bên có nhà chính và các trụ phòng thủ.
- **PvP 1v1:** Mỗi người điều khiển một đội quân bằng hệ thống thẻ bài.
- Thả thẻ để triệu hồi nhân vật hoặc sử dụng phép thuật lên chiến trường.
- Nhân vật tự di chuyển, tìm mục tiêu và chiến đấu theo AI.
- Người chơi quản lý mana, thời gian hồi chiêu, vị trí triển khai và phối hợp đội hình.
- Phá hủy nhà chính đối phương để chiến thắng.
- Thời lượng mục tiêu: 4–6 phút/trận.

## 2. Hệ thống chọn thẻ (Draft Phase)

### Rank thấp – Prebuilt Deck

- Người chơi tự xây dựng bộ bài trước trận.
- Chọn **4 thẻ nhân vật + 2 thẻ phép thuật** từ bộ sưu tập.
- Vào trận sử dụng bộ bài đã lưu, không có lượt chọn đối kháng.
- Không rút bài ngẫu nhiên; tất cả thẻ đã chọn luôn hiển thị.

### Rank cao – Competitive Draft

- Hai người chơi chọn thẻ theo lượt, có thể chọn đồng thời ở một số vòng.
- Hiển thị các thẻ đối phương đã khóa để tạo cơ hội khắc chế.
- Có giai đoạn cấm thẻ (Ban Phase) khi số lượng thẻ đủ lớn.
- Mỗi bên hoàn thiện bộ bài gồm **4 nhân vật + 2 phép thuật**.
- Các thẻ đều có chỉ số chuẩn hóa, không phụ thuộc mức nạp tiền.

## 3. Hệ thống thẻ bài

### A. Character Cards – 4 vai trò chính

| Role | Chức năng |
|---|---|
| Tank | Chống chịu, bảo vệ đội hình |
| Fighter | Cận chiến, phá tuyến phòng thủ |
| Assassin | Tiếp cận và tiêu diệt hậu tuyến |
| Mage/Marksman | Sát thương phép hoặc đánh xa |

Mỗi nhân vật có HP, ATK, tốc độ, tầm đánh, kỹ năng tự động, mana cost và cooldown.

Có hệ tộc/synergy lấy cảm hứng từ TFT, kích hoạt khi kết hợp các nhân vật phù hợp trên chiến trường.

### B. Elemental & Spell Cards – Thẻ hiện tượng và phép thuật

| Thẻ | Hiệu ứng |
|---|---|
| 🌪️ Gió | Đẩy lùi quân địch hoặc tách hai đội hình |
| 🔥 Lửa | Gây sát thương diện rộng theo thời gian |
| ⚡ Sấm sét | Gây sát thương tức thời, có thể làm choáng ngắn |
| ❄️ Băng | Làm chậm hoặc đóng băng quân địch |
| 🌊 Nước | Tạo vùng làm chậm, kết hợp với sấm sét |
| 🌍 Động đất | Gây sát thương công trình và gián đoạn đội hình |
| 🛡️ Lá chắn | Bảo vệ một nhóm quân trong thời gian ngắn |
| 💚 Hồi phục | Phục hồi HP trong vùng chỉ định |

- Phép thuật có vùng ảnh hưởng, mana cost và cooldown riêng.
- Có thời gian cảnh báo trước khi tác động đối với phép mạnh.
- Các hiệu ứng khống chế bị giới hạn thời gian và khả năng cộng dồn.
- Cho phép phối hợp nguyên tố, ví dụ Nước + Sét hoặc Gió + Lửa, nhưng phải có giới hạn sức mạnh.

## 4. Mana & Combat

- Mana ban đầu: 4/10.
- Mana hồi theo thời gian, giống nhau cho hai bên.
- Thẻ nhân vật và phép thuật dùng chung mana.
- Mỗi thẻ có cooldown riêng, tránh spam quân.
- Người chơi chọn lane, vị trí và thời điểm thả quân.
- Có thể dùng phép thuật để thay đổi cục diện giao tranh.
- Combat xử lý theo cơ chế tự động, kết quả không phụ thuộc RNG gây sát thương hoặc chí mạng.

## 5. Cân bằng PvP

- **Không Pay-to-Win:** Không mua chỉ số, mana hoặc sức mạnh bằng tiền.
- **Giảm RNG:** Không random rút thẻ, không random tướng trong trận.
- **Skill-Based:** Chiến thắng phụ thuộc chiến thuật, phản ứng, quản lý mana và phối hợp quân.
- **Counter System:** Mỗi loại nhân vật và phép thuật có ưu điểm, nhược điểm rõ ràng.
- **Draft công bằng:** Rank cao có cơ chế chọn/cấm và phản chọn.
- **Cân bằng 3 lane:** Không có một đường nào mặc định mạnh hơn; hai bên có bản đồ đối xứng.

## 6. Hướng phát triển

**MVP:** 3 lane, PvP 1v1, 4 vai trò nhân vật, 4 phép nguyên tố (Gió, Lửa, Sét, Băng), hệ thống 4 nhân vật + 2 phép, mana, cooldown và phá nhà.

**Phase 2:** Hệ tộc, combo nguyên tố, thêm tướng, phép thuật và hệ thống chọn thẻ theo rank.

**Phase 3:** Ranked, Ban/Pick nâng cao, matchmaking, replay, bảng xếp hạng, skin và season pass.

## 7. Triết lý thiết kế

> **Dễ chơi như Castle Crush – Chiến thuật như TFT – Đối kháng và chọn đội hình như Liên Quân.**

Game phải tạo cảm giác mỗi quyết định thả quân, sử dụng nguyên tố và chuyển hướng tấn công đều có thể thay đổi cục diện trận đấu. Chiến thắng đến từ kỹ năng và chiến thuật thay vì may mắn hoặc nạp tiền.