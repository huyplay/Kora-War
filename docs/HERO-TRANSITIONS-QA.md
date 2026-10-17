# Xuất hiện và tan biến của tướng — 17/10/2026

Task [#89](https://github.com/huyplay/Kora-War/issues/89), tiếp tục hoàn thiện hình ảnh giao tranh.

Content có `vfx.readability` dùng cửa sổ xuất hiện 0,3 giây hiện hành: kích thước tăng nhẹ từ 88% tới 100%, đồng thời phủ dần model bằng dither. Reduced motion hiện model ở kích thước đầy đủ. Content lịch sử thiếu profile giữ đường scale cũ. Không thêm thời gian chờ triệu hồi, thay đổi vị trí, va chạm hoặc luật chiến đấu.

Model GLB tử trận bỏ vòng phe dưới chân, tiếp tục clip death được admin gán và mờ trong phần cuối của thời gian giữ model 1,1 giây hiện hành. Tối đa 12 model tử trận được giữ; model vượt ngân sách được dọn ngay. Reduced motion bỏ hoặc dừng chuyển động death, vẫn mờ/hết hạn; tắt tùy chọn không khởi động lại chuyển động của model đã dừng. Pause giữ tuổi/pose. Reset, teardown và lời gọi muộn dọn an toàn, dispose lặp không giải phóng tài nguyên lần hai.

Fade và hit flash dùng chung bản sao material riêng cho instance, giữ map/geometry nguồn, alpha test, depth write và shader đổi màu phe. Dither giữ vật liệu opaque để tránh lỗi sắp xếp xuyên thân; không thêm texture hay draw pass. Model procedural dự phòng chỉ có scale xuất hiện, chưa có corpse fade. Các mốc thời gian là cửa sổ presentation đã tồn tại, không phải thông số cân bằng mới. Không có schema, migration, publish database hoặc chỉnh clip/asset admin trong task này.

## Kiểm tra

- `npm run check`: architecture, TypeScript server/client, production build; lượt đầu **440/440 tests**, sau tích hợp main `1d6aee1` (animation timing và skill recipients) **462/462 tests**. Sáu test mới kiểm đường xuất hiện, pause/expiry/death clip, reduced motion, giới hạn/reset/teardown/legacy, material riêng và shader hook màu phe. Giữ chữ ký `play(..., elapsedSeconds)` và timing database từ main khi giải quyết xung đột. Golden fixture không thay đổi.
- `npm run smoke` sau build: production bundles, API, module config, auth và player cô lập đạt.
- Edge native UI: mở production build bằng database QA riêng; vào trận, giữ bài, reset nhiều lượt, bật tự đấu hai phe. Lượt tự đấu kết thúc 01:35 với 15 tướng gọi và 10 hạ gục; có model, rút thẻ, damage/heal, cảnh báo công trình và màn kết quả. Pause giữ đồng hồ 01:04 trong thời gian mở DevTools, resume tiếp tục giao tranh.
- Edge device emulation iPhone 16 ngang **852×393**, zoom 100%: tay sáu thẻ và điều khiển vẫn nằm trong khung, không cần cuộn trang. Ảnh bằng chứng local `.data/transitions-edge-mobile.png`. Quan sát nhiều snapshot giao tranh; không dùng ảnh tĩnh để khẳng định chính xác từng frame của fade.
- Console sau giao tranh chỉ thấy hai lỗi 404 `/favicon.ico`, không thấy lỗi JavaScript/WebGL shader. Favicon là vấn đề ngoài task này. Reduced motion và thời điểm fade được kiểm tự động; chưa nghiệm thu chuyển tùy chọn reduced motion bằng UI trên Edge hoặc điện thoại thật, chưa kiểm reconnect PvP và không công bố benchmark FPS.
- Fixture QA sao content/assets, không sao player/session; riêng QA đặt mana đầu 10, không xáo, core 10.000 HP, tower 3.000 HP/1 damage, hero 180 HP/60 attack/skill cooldown 900 giây để tạo tử trận thường xuyên. Không đưa các giá trị QA vào content main.
- Kiểm lại production build sau ghép main: fixture dài hơn giữ core 10.000, tower 10.000 HP/0 damage và hero 15 HP/10 attack; giữ nguyên giới hạn validation. Đã nạp lại bundle `bootstrap-CGvOzYAu.js`/`model-library-CZS-WqAw.js`, tự đấu, thấy model hai phe và tay bài thay thế; ảnh `.data/transitions-edge-combined.png`. Lượt thử nâng HP QA vượt giới hạn bị validation từ chối, không lưu/phát hành giá trị lỗi. Main vẫn revision 30, 14 tướng/73 asset; không dùng fixture QA để cân bằng game.

CI/CD tiếp tục tắt; QA và tích hợp thủ công đúng commit đã kiểm tra.
