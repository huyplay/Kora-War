# Aetherfall v0.1 — thay đổi scope và luật đã triển khai

Ngày 13/10/2026, yêu cầu mới chuyển sang playable prototype fantasy 3D với 10 tướng, deck 4 thẻ, synergy và một người đấu AI. Yêu cầu này thay baseline nghiên cứu Castle Crush ở phạm vi bản chơi thử. Không cần đóng toàn bộ research gaps của game gốc để triển khai **ruleset mới được yêu cầu**. Các source/stat chưa xác minh của Castle Crush không được sử dụng làm dữ liệu runtime.

## Luật chính xác

Trận có ba lane độc lập về mục tiêu và hai lõi chung HP giữa các lane. Mỗi phía có ba trụ, mỗi lane một trụ 400 HP. Trụ tự bắn 27 damage, tầm4m, chu kỳ1,35s. Quân phải phá trụ của lane trước khi tiếp cận lõi; lõi không tự bắn. Lõi mỗi phía 1.500 HP, về0 kết thúc trận.

Deck có đúng4 tướng khác nhau trong10 tướng. Bốn thẻ có thể gọi lại, mỗi thẻ cooldown1,8s sau triển khai; **không dùng cycle14/hand6 của Castle Crush**. Mana khởi đầu5, cap10, hồi1,05/s. Cost2–5 tùy tướng. Vùng gọi quân cố định x[-13,5;-5,8] của người chơi và đối xứng phíaAI. Tối đa100unit trên toàn sân để kiểm soát tải; action bị từ chối không tiêu mana.

Synergy được tính từ4 tướng trong deck, không tính số bản sao đã thả. Ngưỡng2 tướng cùng tộc/hệ; hiệu ứng chi tiết ở catalog/UI. AI và người chơi dùng chung validation và stats, không có mana cheat theo difficulty. AI đánh giá sức ép từng lane, số đồng minh, trụ bị phá và vai trò cần bổ sung. Độ khó chỉ đổi khoảng quyết định: Khám phá2,6–3,1s; Tiêu chuẩn1,5–2s; Thử thách0,8–1,3s.

Kỹ năng tướng tự dùng khi có mục tiêu phù hợp; first cooldown tối đa4s, sau đó theo từng tướng. Đòn đánh tầm xa áp damage tại simulation tick; projectile ở renderer là hiệu ứng biểu diễn, **chưa có travel-time damage**. Unit cùng phe có thể overlap; renderer lệch vị trí theo ID để đọc nhóm, chưa có body-blocking/pathfinding vật lý. Các trạng thái slow/stun dùng thời gian simulation. Tick luân phiên thứ tự unit để tránh ưu tiên cố định một phía; không dùng render FPS để tính damage.

Cộng Hưởng Lõi tích theo thời gian, damage và hạ gục. Khi100%, người chơi chọn lane: gây155damage và stun1,2s cho địch, hồi95HP cho đồng minh lane đó. Không tác động trụ/lõi. AI cũng sử dụng kỹ năng này khi đủ năng lượng và có nhiều mục tiêu.

Sau180s, cả hai lõi chịu damage liên tục, tốc độ bắt đầu8HP/s và tăng0,65HP/s mỗi giây overtime. Cùng về0 thì so tổng damage đã gây; nếu bằng nhau dùng PRNG của trận. Đây là tie-break mới, không được gán cho Castle Crush. Trận tự dừng sau terminal; chơi lại tạo Battle instance mới, clear entity/FX renderer, stats, mana, timers và debug mode.

## Mục tiêu câu chuyện

Elyndra tồn tại nhờ các lõi Aether sau Đại Phân Ly. Người chơi là Người Kết Nối, tập hợp bốn người bảo hộ Bình Minh để đánh chiếm lõi Hoàng Hôn trong Thung lũng Khởi Nguyên. Mở đầu gồm lore ngắn và hướng dẫn chọn thẻ→chọn lane→giữ đội hình. Đây là lore đề xuất mới của prototype.

## Lựa chọn triển khai

TypeScript shared pure simulation + Three.js renderer chạy local browser. Chọn trực tiếp cho vertical slice một người này để hoàn thành gameplay, không tuyên bố Three nhanh hơn Babylon theo benchmark. Không có server hoặc React vì UI nhỏ và không cần backend trong phạm vi hiện tại. ASP.NET/SignalR/PvP trong hồ sơ cũ còn là thiết kế tương lai.

Đồ họa dùng hình học/màu/rig đơn giản tạo bằng code riêng, portrait render từ cùng model; âm thanh tổng hợp Web Audio. Không sử dụng logo, hình tướng, texture, nhạc hoặc file lấy từ Castle Crush/Liên Quân/TFT. Three.js MIT và dependencies được khóa ở package-lock. Font Be Vietnam Pro/Cormorant Garamond tải Google Fonts, có fallback hệ thống.

## Kiểm tra và giới hạn

18 simulation tests bao phủ deck validation, mana, vị trí sai, cooldown, synergy, di chuyển, combat, tất cả10 kỹ năng, chết/hồi máu, pulse, trụ chặn lõi, AI resource budget, deterministic trace, overtime, thắng/thua, reset và20 seeded complete matches. `npm run build` kiểm tra TypeScript và đóng gói static. Kiểm tra trình duyệt ghi ở [QA](qa.md).

Chưa có test trên iPhone/Android vật lý, benchmark engine cạnh tranh, replay command playback, tài khoản/PvP/anti-cheat server hoặc art production. Inspector đo FPS thực, không giả60FPS. Debug export là snapshot hỗ trợ chẩn đoán, chưa phải deterministic replay có đủ command log. localStorage chỉ lưu deck/settings/win count, không lưu trận đang chạy.
