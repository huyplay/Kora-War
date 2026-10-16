# Đường đạn và va chạm của tướng — 16/10/2026

Task [#77](https://github.com/huyplay/Kora-War/issues/77), tiếp tục hoàn thiện đồ họa chiến đấu.

Vệt đạn thuôn và tối dần về đuôi, dùng vertex color trên geometry chung; mũi tên, cầu phép và tia sét giữ hình/màu riêng từ `vfx.combat.heroes`. Dấu va chạm chuyển từ vòng cứng sang shader có lõi sáng, vòng mềm và tia ngắn. Billboard nhỏ vẽ trên thân tướng để không bị chìm trong model; đạn bay vẫn kiểm tra độ sâu. Không thêm texture, đèn hoặc asset tải mạng.

Profile combat đã khóa theo trận tiếp tục quyết định bật/tắt, màu/kiểu đạn, kích thước, chiều dài vệt, đường cong, thời gian bay và thời gian/kích thước va chạm. Không thêm schema, migration hoặc publish database; không đổi timing gây sát thương hay luật combat. World dùng chung `unitBodyPoint` cho nguồn và đích, gồm độ cao origin và tỉ lệ đội hình/triệu hồi.

Đạn chỉ theo ID mục tiêu đã ghép với sự kiện hit. Pause hoặc dt không hữu hạn không lấy mẫu mục tiêu, không tiến tuổi hiệu ứng. Tọa độ không hợp lệ hoặc mục tiêu biến mất giữ điểm hợp lệ cuối cùng, không chuyển sang quân lân cận. Slot tái sử dụng xóa hướng quay cũ khi quỹ đạo có độ dài 0. Dispose lặp an toàn và từ chối emit/configure/update muộn.

Bật giảm chuyển động giữa lúc bay chuyển đạn thành dấu trúng đòn tĩnh tại đích đã biết. Dấu đang nở giữ nguyên kích thước hiện tại; tắt tùy chọn không làm dấu đó nở hoặc bay lại. Fade/expiry vẫn theo clock của trận; pause giữ tuổi và độ mờ.

## Kiểm tra

- `npm run check`: architecture, TypeScript server/client, **408/408 tests**, production build; fixture/hash replay gốc giữ nguyên. Năm test mới kiểm tra World body anchor, hình/màu/vệt dùng chung, pause/invalid/missing target, chuyển reduced motion, tái sử dụng/dispose. Các test burst 500 đạn, profile/admin và installer cũ tiếp tục đạt.
- `npm run smoke` sau production build, Prettier và `git diff --check`.
- Giữ pool **40 đạn + 40 va chạm**, năm geometry dùng chung và 80 material tái sử dụng. Mỗi đạn vẽ một đầu và tối đa một vệt; mỗi va chạm một plane hai tam giác. Vệt mở có 10 tam giác; không thêm draw layer so với renderer cũ. Không tạo mesh/material mỗi lần bắn. Đây là giới hạn cấu trúc, không phải benchmark thiết bị thật.
- Chrome DOM **844×390**, **667×376**, **1536×720**: giao tranh Lyra/Vesper/Orin, wheel zoom/reset overview, pause/resume, bật/tắt reduced motion giữa trận và chơi lại. Touch deploy thay thẻ, chồng rút 8→7 ở màn hình nhỏ. Không cuộn trang, không warning/error console hoặc lỗi shader. QA phát hiện dấu va chạm nằm trong model và đã sửa depth test riêng cho billboard, nạp lại build để xác nhận.
- Database QA riêng chỉ sao content/assets, không sao người chơi/session. Fixture HP tướng 5.000, attack 1, skill cooldown 900s, mana đầu 10, không xáo và AI deck cố định phục vụ quan sát; không triển khai các giá trị này. Main giữ revision 29.
- Ảnh local: `.data/hero-projectiles-final.png` (mobile cận cảnh), `.data/hero-projectiles-desktop-final.png`, `.data/hero-projectiles-small.png`, `.data/hero-projectiles-small-reduced.png`. Screenshot có vùng đệm do browser zoom; kích thước trên là viewport DOM.
- Định vị và vòng đời chính xác kiểm bằng test có kiểm soát; task này không tuyên bố đã QA reconnect PvP hoặc đo FPS trên điện thoại thật.
