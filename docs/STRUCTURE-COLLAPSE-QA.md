# Công trình bám nền và phá hủy — 16/10/2026

Issue #41, tiếp nối arena #4. Chỉ renderer, không đổi HP, sát thương, hitbox, luật, database hoặc fixture lịch sử.

Trước đây hoạt ảnh squash cả group trụ, kéo bệ nền theo; mảnh vỡ mất sau 0,9 giây và shadow map tĩnh giữ hình trụ còn nguyên. `StructureAnimator` nay chỉ tác động `TowerBody`, giữ root/bệ cố định và lưu transform gốc để reset đúng cả model thủ tục có scale riêng. Các snapshot bắt đầu với trụ đã chết hiển thị đống đổ nát ở tư thế cuối, không phát lại vụ sụp.

Rubble dùng lại một InstancedMesh 72 slot, tối đa 12 mảnh/trụ, cùng geometry/material trong suốt trận. Các mảnh nằm trong bề rộng lane và không có va chạm. Khi đã nằm yên hoặc pause, không upload instance matrix mỗi frame; reset dọn toàn bộ. Không thêm file texture/model mới hay request tải asset.

`StructureShadowRefresh` chỉ làm mới bóng công trình khi thân trụ, vị trí trụ hoặc trạng thái sống/chết của lõi thay đổi. Nhịp khi chuyển động tối đa 12 Hz, flush tư thế cuối lúc pause; sau khi đứng yên không tiếp tục render bóng. Low vẫn tắt shadow map; bật high/reset dùng cơ chế invalidation hiện có. Không bật shadow caster cho quân hoặc bật shadow cập nhật liên tục toàn cảnh.

QA Windows local: `npm run check` đạt 271/271 test, architecture, typecheck server/client và production build; `npm run smoke` đạt. Test kiểm bệ giữ nguyên matrix, scale thân trụ theo cấu hình và reset, pause, snapshot trụ chết, 72 mảnh hữu hạn trên mặt lane, không duplicate burst/upload sau khi nằm yên và nhịp/cancel shadow refresh.

Chrome kết nối trực tiếp, production bundle và database QA riêng sao chép published content/assets hiện hành. Cảnh so sánh bundle trước/sau ở 844×390 CSS px, desktop 1536×720; browser zoom 90% được bù bằng viewport override và xác nhận qua `innerWidth/innerHeight`. Sáu trụ bị phá: root mới giữ scale 1, thân còn 0,22, 72 mảnh tồn tại; bản cũ root 0,22 và 0 mảnh. Bộ đếm callback shadow thực tế dừng ở 9 pass (gồm pass đầu) sau một lượt sụp; low không tăng, bật high và phá lõi lúc pause làm mới đúng tư thế. Đây là kiểm scene, không phải benchmark điện thoại.

Đã kiểm zoom 1,85×, high/low, ngày/đêm, pause, snapshot chết và reset. Sau reset thân/root về 1, rubble về 0. Cảnh sau khi sụp có 142 main draw calls / 199.964 triangles; bản trước 141 / 198.524: thêm một batch và 1.440 triangles cho toàn bộ 72 mảnh. Không thêm batch theo từng viên.

Luồng app thật: luyện tập → giữ bài → chạy tới kết quả → chơi lại; chọn Lyra rồi quick deploy bằng phím E, thẻ thay thế đúng ô và chồng rút 8→7. Khung app 844×390 không tràn/cuộn document; console cảnh thử và app không có warning/error. Chưa thử cảm ứng trên điện thoại thật. Screenshot local trong `.data/qa-structures/`: `before-mobile-day.png`, `after-mobile-day.png`, `after-mobile-night.png`, `after-mobile-low-zoom.png`, `after-desktop-night.png`, `practice-mobile.png`. Harness/asset/database QA nằm trong `.data`/`dist`, không commit hay triển khai lên bản người chơi.
