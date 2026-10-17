# Căn khung hoạt ảnh bộ sưu tập — 17/10/2026

Task [#94](https://github.com/huyplay/Kora-War/issues/94), tiếp tục hoàn thiện model/animation mobile.

Preview trước đây đo một pose rồi đặt camera theo chiều rộng/chiều cao cố định. Vũ khí vung hoặc cơ thể bay sâu theo trục Z có thể ra ngoài scissor hoặc near plane. Renderer mới lấy mẫu các clip idle/walk/attack/cast được snapshot database gán trên skeleton tách riêng, đo đúng đỉnh đang vẽ bằng `visibleModelBounds`. Giữ hướng showcase/portrait, phần material ẩn, scale gốc, skin/morph và clip nguồn. ModelLibrary chỉ bổ sung getter clip chỉ đọc; không sửa World hoặc vòng đời chiến đấu.

Khung cố định **theo động tác**, gồm pose nghỉ, các pose lấy mẫu, phần đệm, pedestal và toàn khoảng sway ±0,14 rad. Camera tính trong hệ tọa độ nhìn, kể cả độ nghiêng và chiều sâu; lùi camera nếu cần để đưa toàn hình ra trước near plane. Đổi động tác hoặc tỷ lệ viewport mới tính lại camera; không đo mesh/căn zoom theo từng frame. Phép vẫn có vùng quay tròn riêng. Động tác có vùng chuyển động rất rộng sẽ cần khung rộng hơn; đây chưa phải sửa/chia lại hiệu ứng phụ trong asset nguồn.

Tối đa 33 thời điểm/clip, bốn clip khác nhau/rig; phối hợp mốc đều và key times. Hàng xử lý tuần tự nhường event loop sau lát khoảng 4ms (một lần đo có thể lâu hơn), có hủy khi đóng preview. Cache LRU tối đa 32 profile chỉ giữ box/số/chuỗi, không giữ model/texture. Instance/live mixer và clip nguồn không bị tiến thời gian hoặc chỉnh sửa. Model thủ tục tiếp tục hiển thị trong lúc chuẩn bị; rig không đo được an toàn giữ fallback. Prototype bao theo convex hull xương quá rộng, làm model nhỏ; đã bỏ prototype và dùng đỉnh mesh chính xác trong bản cuối.

## Clip bất thường

Năm động tác của revision 30 có extent cực lớn: Lyra đánh, Nyx chiêu, Raiko đánh/chiêu, Kharos chiêu. Chưa kết luận nguyên nhân: có thể liên quan bone đạo cụ/projectile, tiny scale hoặc inverse-bind. Theo kiểm số học trên mesh gốc, một số pose cao ~67, ~42, ~606 hoặc ~100.391 đơn vị so với thân ban đầu khoảng hai đơn vị. Không tự sửa bytes hoặc đổi lựa chọn clip của admin.

Nếu đường chéo vùng bao động tác vượt bốn lần đường chéo pose nghỉ, preview trả về không sẵn sàng, giữ động tác trước và hiện thông báo ngắn khi chạm. Idle/walk/các động tác khác vẫn dùng được. Đây là guard trình bày bộ sưu tập, không khóa kỹ năng hoặc đổi clip trong combat. [Issue #96](https://github.com/huyplay/Kora-War/issues/96) tiếp tục truy nguyên và sửa asset; đợt này không tuyên bố đã sửa năm clip nguồn.

Thông báo là status ngay dưới các nút trong hộp thoại, không dùng toast chiến trường phía sau modal. Chọn động tác hợp lệ sẽ xóa status; trong lúc model còn chuẩn bị, trả về chưa sẵn sàng thay vì ghi nhận một thao tác rồi âm thầm đổi về idle.

## Kiểm tra

- `npm run check`: architecture, TypeScript client/server, **466/466 tests**, production build. Bốn test mới kiểm vũ khí/pose và shared resources, cache trả bản sao, clip bất thường riêng lẻ, hủy hàng xử lý, sample budget, sway/spin, tỷ lệ hẹp/rộng và near/far sâu. Giữ fixture golden.
- `npm run smoke`, `npm run package`, scoped Prettier và `git diff --check`. Package giữ allowlist hiện hành; không chứa database, thông tin đăng nhập hoặc bằng chứng QA local.
- Một lượt shell nối check/smoke kết thúc bằng mã native Windows `-1073740791` ở smoke sau khi toàn bộ check/build đã đạt; chạy riêng lại build và smoke đều exit 0. Log riêng `.data/build-final.log` và `.data/smoke-final.log`; không bỏ qua lượt lỗi.
- CPU QA đọc SQLite revision 30, 14 rig/73 asset, bỏ giải mã ảnh trong GLB nhưng giữ mesh/skin/clip chính xác. **51 động tác được chấp nhận**, mỗi động tác kiểm 61 thời điểm độc lập × 3 góc sway × 3 tỷ lệ viewport (0,45/0,8/1,5): **9.333 pose/góc**, 27.999 trường hợp frustum. Không điểm góc box nào ra ngoài clip volume trong các mẫu này; năm động tác bị từ chối được liệt kê riêng. Đây là lấy mẫu hữu hạn, không phải chứng minh mọi thời điểm hoặc benchmark mobile.
- Script và kết quả local `.data/framing-audit.ts`, `.data/framing-audit.json`; diagnostic nguồn trong `.data/framing-parts-diagnostic.log`. Asset/DB main chỉ được đọc. Database QA riêng sao content/asset, không sao player/session.
- Edge native UI với GLB thật: mở đội hình/chi tiết Solan, chạm Đánh/Chiêu, đổi viewport iPhone 16 ngang **852×393** trong DevTools (zoom 100%), thấy model/vũ khí và các nút nằm trong khung sau layout ổn định. Console ở lượt kiểm bản cuối trống. Ảnh local `.data/framing-edge-desktop.png`, `.data/framing-edge-mobile.png`.
- Sau bản sửa status: nạp lại production build, mở Raiko ở mobile, chạm Đánh bị từ chối và giữ nút Đi/pose hiện hành. Thông báo hiện rõ ngay dưới nhóm nút trong modal; chạm Đi xóa thông báo. Ảnh `.data/framing-edge-guard.png`. Lượt này kiểm phản hồi UI, không sửa các clip bị chặn.
- Không kiểm tất cả 14 rig bằng mắt, điện thoại thật hoặc WAN. Không thay đổi đường reduced motion đang có; sampler làm trên clone riêng nên không tiến pose tĩnh của preview. Chưa nghiệm thu bật/tắt reduced motion bằng UI trong đợt này.

Không migration/publish content hoặc đổi gameplay. CI/CD tiếp tục tắt; tích hợp đúng commit đã QA.
