# Đội hình hiển thị và chat nhanh — 14/10/2026

Người dùng yêu cầu cải thiện giao chiến không chồng model và emoji/câu soạn sẵn theo ảnh tham chiếu. Đã chốt **giãn đội hình hiển thị, giữ luật combat**; không thêm va chạm làm quân chặn nhau. Task theo [issue #1](https://github.com/huyplay/Kora-War/issues/1).

`rendering/formation-layout.ts` bố trí hàng ổn định trong lane, làm mượt vị trí gốc rồi giải khoảng cách footprint. Quân mới chọn hàng ít quân nhất; quân sống giữ hàng khi quân khác chết. Hai góc nhìn phản chiếu có layout đối xứng. Trong mật độ rất cao, layout nén kích thước hiển thị để vừa mặt sân; đây là giới hạn đọc hình ảnh cần playtest, không phải thay số lượng quân/HP/damage. Vị trí combat và quy tắc phép vẫn từ snapshot.

World dùng vị trí mới cho model, bóng, HP/shield và feedback. Status Băng/Lửa/Gia Tốc/Suy Yếu, vệt đánh và sprite/projectile bám vị trí hiển thị; raycast lên quân trả tọa độ simulation để phép vẫn tác động đúng mục tiêu. Vùng phép giữ tọa độ combat. Reset xóa layout/feedback; pause giữ pose. Chưa cam kết pixel-perfect so với game tham khảo hoặc FPS trên thiết bị thật.

`ContentConfig.presentation` là module database điều chỉnh packing/scale/hàng/smoothing; `communication` điều chỉnh bật/tắt, cooldown, thời gian bong bóng, giới hạn gửi, câu/emoji và image asset tùy chọn. Tổng module hiện hành 17. Migration từ bộ 15 module hoàn chỉnh thêm hai module trong transaction và tạo revision; không sửa revision/match cũ. Admin **Chat & đội hình** sửa và phát hành như các nhóm content khác.

`server/pvp.ts` lưu phản hồi riêng trong phòng, dùng ID allowlist, cookie membership, cooldown từng người, cache request ID chống retry trùng, giới hạn gửi và pool 32 event. Không đưa chat vào RNG/combat/replay/thưởng. Packet trả side theo người xem và thời gian còn lại. Phản hồi là transient của phòng, hết hạn hoặc mất khi server restart; cấu hình nằm database. Không có chat text tự do.

UI có sáu câu soạn sẵn, tám emoji, bong bóng hai phía và mute đối thủ lưu trên thiết bị. Training cho xem phản hồi riêng của mình; không giả chat AI. UI dùng text escaping, keyboard focus/Escape, reduced motion và bố cục ngang. Asset `communication.reactions[].imageAssetId` phải tồn tại và là image khi publish; Gemini task [#3](https://github.com/huyplay/Kora-War/issues/3) bàn giao art để Codex nhập/gán qua admin.

Kiểm thử: packing nhóm 2/18/60/100 quân, giới hạn mặt sân/footprint, đối xứng/hàng ổn định, không mutate unit, chat membership/whitelist/cooldown/idempotency/expiry/locked config và migration giữ lịch sử. `npm run check` đạt 162/162 test; fixture gốc không sửa. Runtime smoke kiểm entrypoint và production bundles trên database tạm.

QA Edge với hai host/cookie riêng trên server 8788 và 51 asset QA liên kết từ bản local: A gửi “Xin chào!”, B nhận; B gửi 👏, A nhận. Mute của A ẩn 💙 do B gửi. Không có lỗi console admin/game trong lượt kiểm tra. Ảnh local `.data/quick-chat-panel.png` và `.data/reactions-pvp.png`, không commit. Chat/config trên bản chính được giữ đúng revision; account và dữ liệu runtime không đưa lên GitHub Pages.
