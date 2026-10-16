# Cue hồi máu — 16/10/2026

Task [#87](https://github.com/huyplay/Kora-War/issues/87), tiếp tục hoàn thiện phản hồi chiến đấu mobile.

Với content có cả `vfx.feedback` và `vfx.readability`, cue hồi máu dùng cùng delta HP đã gom của `UnitFeedback` như số hồi máu. World không phát thêm cue từ sự kiện heal lịch sử vốn thiếu ID người nhận. Cue giữ ID tướng, theo origin/vị trí đã giãn đội hình và độ cao thân model; không tìm lại quân đứng gần. Khi tướng biến mất, cue giữ vị trí cuối tới lúc mờ hết. Snapshot đầu không tạo hồi máu giả. Core, event log, replay và lượng hồi máu không thay đổi.

Đây là phản hồi của **HP tăng ròng giữa các snapshot render**, không phải thống kê toàn bộ heal xảy ra đồng thời với damage trong một tick. Ngưỡng gom/nhịp có sẵn của UnitFeedback và giới hạn vùng của readability vẫn áp dụng. Content cũ thiếu profile tiếp tục dùng event heal qua atlas hiện có.

Atlas admin `eventSprites.heal` được ưu tiên, giữ màu gốc. Khi atlas chưa tải được hoặc không có binding, renderer hiện hành dùng atlas dấu “+” trắng ba lớp có viền tối, nhuộm bằng `vfx.heal`; không xoay dấu. Atlas Canvas 1024×128/8 frame được tạo một lần, không tạo texture lúc giao tranh. Không ghi đè asset, thêm schema, migration hay publish database. Admin tiếp tục chỉnh màu fallback, opacity, scale, blend, cooldown và maxDuration/budget qua module VFX.

Cue heal hiện trước model để không bị thân tướng che. Pool trả lại depthTest/renderOrder thông thường khi tái sử dụng cho loại hiệu ứng khác. Pause giữ frame/pose; bật reduced motion giữ frame/scale/rotation/position hiện tại, tiếp tục mờ/hết hạn và không bật lại chuyển động của cue cũ khi tắt tùy chọn. Guard vị trí/thời gian không hữu hạn, late configure/emit/update và dispose lặp.

## Kiểm tra tự động

- `npm run check`: architecture, TypeScript server/client, **434/434 tests**, production build. Bảy test mới kiểm delta HP thật/ID người nhận/origin, atlas dấu cộng và biên frame, asset admin nạp bất đồng bộ, giới hạn vùng/cooldown/disable/reuse, reduced motion không giật, legacy/de-dup và cleanup/invalid. Không sửa golden fixture.
- `npm run smoke` sau build, scoped Prettier và `git diff --check`.
- Giữ pool chung **48 sprite**, không thêm draw ngoài pool, geometry/material cấp phát lúc pool mở rộng vẫn giới hạn 48. Thêm một canvas atlas dự phòng; GPU upload chỉ khi dùng. Đây là ngân sách cấu trúc, không phải benchmark thiết bị thật.

## QA trình duyệt

- Database QA riêng sao content/assets, không sao player/session. Fixture mana đầu 10, không xáo, HP 5.000/attack 12/skill cooldown 900s; lượt dự phòng chỉ xóa binding `eventSprites.heal` trong QA. Main giữ nguyên texture admin và revision 29.
- Chrome DOM 844×390: chạm thả Solan/Lyra/Aurelia (chồng rút 8→5), dùng Hồi Sinh Lực (5→4), Khiên Aether (4→3), zoom và quan sát giao tranh có hồi HP. Kiểm tra cả binding hiện hành và trường hợp thiếu binding. Không đổi luật phép hoặc vị trí triển khai.
- QA phát hiện dấu dự phòng nhỏ có thể bị thân model che; tăng phần glyph trung tâm/cỡ fallback và cho heal qua lớp trước model. Cỡ atlas admin giữ nguyên. Sau sửa đã chạy lại toàn bộ check/smoke và reload production build để kiểm tiếp desktop/mobile.
- Bản cuối: DOM 1536×720 triển khai nhanh Solan/Lyra/Aurelia (8→5), zoom; DOM 667×376 pause giữ 00:29, bật reduced motion rồi resume, tắt reduced motion/reset overview, quay về sảnh. Body bằng viewport, `scrollX/Y=0`, console không warning/error. Đã khôi phục viewport/media và đóng tab QA sau khi xác nhận đang ở sảnh. Ảnh bản cuối `.data/recovery-final-desktop.png`, `.data/recovery-final-small-reduced.png`; ảnh binding admin `.data/recovery-stock-mobile.png`, `.data/recovery-stock-small.png` từ lượt QA trước chỉnh lớp/cỡ fallback.
- Cỡ fallback bù cho diện tích trong suốt quanh dấu; `events.heal.scale` tiếp tục nhân với cỡ gốc và scale tướng. Không tự tăng opacity ngoài cấu hình. Không hứa cue nào cũng được hiển thị: pool/cooldown/budget vùng vẫn có thể bỏ bớt khi quá đông.
- Không kiểm reconnect PvP hoặc điện thoại thật; CI/CD tiếp tục tắt. Ảnh QA giữ local trong `.data/recovery-*.png`; screenshot nguyên bản có vùng đệm do browser zoom.
