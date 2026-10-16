# Vệt chém cận chiến — 16/10/2026

Task [#79](https://github.com/huyplay/Kora-War/issues/79), tiếp tục hoàn thiện đồ họa chiến đấu.

Content có `vfx.readability` dùng vệt chém hình lưỡi liềm thuôn hai đầu, sáng dần ở đầu vệt và mềm ở hai mép bằng vertex color. Độ dày phần giữa được chỉnh sau QA mobile để vẫn đọc được nét chém khi thu nhỏ. Hai phe giữ hướng đối xứng. Geometry dùng chung, không tải texture hoặc thêm lớp glow/đèn. Content lịch sử thiếu profile giữ RingGeometry và material cũ.

`melee.enabled/size/opacity/lifetime/heightRatio` và màu phe vẫn lấy từ profile database đã khóa theo trận. Không thêm schema/migration/publish hoặc đổi attack clip, sát thương, timing, va chạm hay vị trí combat. Vệt chém theo ID của người ra đòn, gồm origin Y, chiều cao và bán kính hiển thị; không chọn lại mục tiêu combat.

Trong pause, hiệu ứng giữ tuổi, opacity và pose, không lấy mẫu vị trí mới. Mẫu thiếu/không hợp lệ giữ vị trí tốt cuối; mẫu đầu không hợp lệ dùng lane fallback hữu hạn. Tướng đóng băng, choáng, chết hoặc biến mất dọn vệt đang chạy. Reduced motion dọn vệt/tia lửa, theo dõi timestamp để không phát lại đòn cũ khi bật animation trở lại. Reset dọn slot và timestamp; dispose lặp an toàn, bỏ qua lời gọi muộn.

## Kiểm tra

- `npm run check`: architecture, TypeScript server/client, **414/414 tests**, production build; golden fixtures giữ nguyên. Sáu test mới kiểm shape/legacy/shared geometry, body tracking/config/pause, invalid/missing/future samples, freeze/stun/death/reduced motion, sparks origin/matrix và pool/reset/disposal. Các test VFX/animation có sẵn tiếp tục đạt.
- `npm run smoke` sau build, Prettier cho TS/tài liệu QA mới và `git diff --check`.
- Giữ tối đa **16 vệt chém + 128 tia lửa**, 17 draw calls cho lớp này; ba geometry và 17 material tái sử dụng. Mỗi crescent 96 tam giác, nhiều hơn dải cũ 48 tam giác nhưng không thêm draw layer. Khi đầy pool, bỏ cue mới; không tăng mesh/material theo số lần đánh.
- Database QA riêng chỉ sao content/assets, không sao người chơi/session. Fixture HP tướng 5.000, attack 1, skill cooldown 900s, mana đầu 10, deck không xáo và AI deck có các tướng cận chiến để quan sát. Không triển khai các giá trị này; main giữ revision 29.
- Chrome DOM **844×390**, **667×376**, **1536×720**: xem cận chiến trong đội hình đông, zoom/reset overview, pause/resume, bật/tắt reduced motion, chơi lại và touch deploy hai thẻ (chồng rút 8→6). Không cuộn trang hoặc warning/error console. Nạp lại production build sau khi chỉnh độ dày/độ sáng để kiểm nét chém cuối.
- Ảnh local: `.data/melee-final.png`, `.data/melee-mobile.png`, `.data/melee-small.png`, `.data/melee-small-reduced.png`, `.data/melee-desktop-close.png`. Kích thước trên là viewport DOM; screenshot có vùng đệm do browser zoom.
- Các trường hợp freeze/invalid/dispose và pose pause chính xác được kiểm bằng test có kiểm soát. QA trình duyệt không thay thế benchmark điện thoại thật hoặc kiểm reconnect PvP.
