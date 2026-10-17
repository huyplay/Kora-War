# Người tung và người nhận kỹ năng — 17/10/2026

Issue [#92](https://github.com/huyplay/Kora-War/issues/92). Tiếp nối [khảo sát project](PROJECT-AUDIT-2026-10-17.md) và [nhịp model](HERO-ANIMATION-QA.md), ưu tiên người dùng đã chọn: model, hoạt ảnh và kỹ năng.

## Hành vi

- Event `skill` của `cycle-v1` thêm `sourceId` và `skillTargets`: ID, vị trí, phe và các loại hiệu ứng thực sự nhận. Theo dõi ngay sau từng thao tác combat, giữ nguyên thứ tự chọn mục tiêu. Hồi máu không tăng HP hoặc khiên đã chạm cap không tạo dấu nhận giả; sát thương kết liễu vẫn giữ người nhận. Một kỹ năng có thể tạo khiên cho bản thân và khống chế kẻ địch khác.
- Anchor dùng đúng ID người tung, kể cả hai bản cùng tướng đứng sát nhau. ID bị thiếu khỏi snapshot dùng tọa độ sự kiện, không mượn model bên cạnh. Recipient bám vị trí đội hình của đúng ID; khi biến mất giữ điểm cuối tới khi cue hết hạn. `onlineState` đảo cả tọa độ/phe của recipient cho người xem phe 2, giữ ID và tách bản sao khỏi state server.
- Dấu chém = damage, cộng xanh = heal, khiên theo màu phe = shield, mũi tên xuống = slow, sao = stun. Dấu ngắn xác nhận lần nhận hiệu ứng; thời gian trạng thái còn lại vẫn do overlay/status hiện có thể hiện. Sprite người tung và asset admin đã chọn vẫn hoạt động.
- `SkillTargetEffects` dùng một InstancedMesh, chung geometry/material, tối đa 32 recipient cue và 160 glyph trong một draw. Giới hạn vùng, thời lượng, opacity, scale, blending và cooldown đọc `vfx.readability` hiện hành. Deduplicate event, cooldown theo người tung; bỏ cue quá cũ hoặc tương lai. Giữ pause; reduced motion bỏ chuyển động nâng glyph, vẫn hết hạn theo thời gian trận. Reset/dispose dọn pool và bộ nhớ ID.
- Kích thước có ngưỡng theo camera/CSS pixel và trần world-space; glyph có viền và không bị thân model che. Đây là lớp trình bày, không quyết định damage hay thêm windup.

Không thêm chỉ số cân bằng, luật, model/texture hoặc dependency. Không sửa content/revision/database, không cần installer. Trận đang mở vẫn giữ content đã khóa. Legacy không thêm trường event; replay thiếu metadata tiếp tục cách hiển thị cũ. Golden `three-baseline.json` không thay đổi.

## Rà ảnh hưởng

Luồng sửa: `cast-ability` → `GameEvent` → `onlineState` → `combat-anchors` → `World`/pool recipient. GitNexus hiện không có index Kora War, nên rà bằng tìm kiếm/call sites và test trực tiếp; không dùng graph của repo khác. Core chỉ ghi lại kết quả thao tác có sẵn, renderer chỉ đọc. Không đổi command hoặc dữ liệu lưu trận.

## Kiểm tra tự động

- `npm run check`: **456/456 test**, architecture, server/client TypeScript và production build đạt. 14 test mới kiểm ID trùng tướng, mục tiêu theo HP, heal tuần tự, shield cap, lethal/control, AoE khác lane, legacy, đảo phe, packet cũ/trùng, pause/reduced motion, pool/resource và kích thước theo camera.
- `npm run smoke` đạt production bundle/API/auth/người chơi trên database tạm; `npm run package` đạt. Prettier trên các file code sửa và `git diff --check` đạt.
- Đối chiếu riêng với baseline `414b5d2`: 12 seed × hai catalog 10/14 tướng = **24 trường hợp, 49.657 tick, 3.126 kỹ năng**. Snapshot chiến đấu và toàn bộ trường event cũ giống nhau; chỉ bỏ hai trường metadata mới khi so sánh event. Không tạo lại golden. Evidence local `.data/task-92-parity.log`; digest kết quả `78ff48f5a1a555ef8d82ad8f17cc7117ad04b347938132a415df21f1e25716de`.

## Trình duyệt

Edge/Windows, model GLB thật từ bản sao content revision 30, **14 tướng/73 asset**; database QA riêng không sao player/session. Fixture gọi cùng `cycleBattle`, `castAbility`, `onlineState` và `World` của game, giữ khung sau cast để nhìn dấu. Fixture và screenshot nằm trong `.data`, không vào source/release.

- Kiểm damage Nyx chọn mục tiêu ít HP hơn ở xa; heal Mira vào hai đồng minh; Aurelia shield; Vesper damage+slow; Kael self-shield và stun đối thủ. Hai bản người tung cùng tướng gần cùng tọa độ; ID #2 thực hiện kỹ năng.
- Kiểm người nhận biến mất sau cast và góc nhìn phe 2 qua `onlineState`; không thay người nhận bằng quân đứng gần.
- Desktop **1280×720** và CSS viewport **844×390**, **667×376**, có bù browser zoom 90% và đọc lại kích thước CSS. Khung nhỏ không cuộn trang. Không có warning/error WebGL trong các lượt đọc console.
- Reduced motion được bật qua công tắc riêng của fixture vào cùng cờ renderer; không đổi cài đặt hệ điều hành. Raw CDP media emulation không khả dụng trong lượt QA này. Hành vi tĩnh/pause và chuyển cờ giữa cue có test tự động riêng.
- Screenshot: `.data/skill-targets-mobile.png`, `.data/skill-targets-small.png`, `.data/skill-targets-desktop.png`. Đây là fixture kiểm dấu kỹ năng, không phải UI người chơi mới.
- Giao diện chính ở chế độ demo: vào luyện tập, giữ bài mở đầu, bật Tự đấu/4× trong inspector; quan sát tới 51 giây mô phỏng, chụp giao tranh, pause/resume rồi về sảnh. Không lỗi console; không cộng chiến thắng vì đây là trận debug. Screenshot `.data/skill-targets-game.png`. Không dùng chỉ số FPS inspector làm benchmark thiết bị.

## Giới hạn

Chưa benchmark điện thoại Android/iOS vật lý, WAN, tải nhiều phòng hoặc chạy cặp hai trình duyệt PvP cho lượt này. Đảo phe được kiểm ở hàm transport và fixture renderer. Chưa thay toàn bộ chiêu bằng asset độc quyền từng tướng; glyph theo nhóm bổ sung cho sprite/cast hiện có. Còn việc căn mọi frame/vũ khí của 14 rig và playtest nhịp trong giao tranh đông. Cảnh báo chunk Three.js khoảng 590 kB vẫn còn.
