# Model, hoạt ảnh và xem kỹ năng — 17/10/2026

Issue [#90](https://github.com/huyplay/Kora-War/issues/90). Khảo sát và ma trận Castle Crush/TFT/Liên Quân: [báo cáo toàn project](PROJECT-AUDIT-2026-10-17.md). Người dùng ưu tiên model tướng, hoạt ảnh và kỹ năng.

## Phạm vi

- Thêm `models.<hero>.animation` tùy chọn vào content snapshot. `attackSeconds`/`castSeconds` nhận 0,08–2 giây; `crossFadeSeconds` nhận 0–0,3 giây. Thiếu trường giữ mặc định 0,35/0,5/0,08. Không backfill replay/revision cũ.
- Imported mixer căn tuổi one-shot khi nhận hành động muộn, chỉ restart khi có hành động mới. Kỹ năng cùng tick ưu tiên cast; đòn đánh sau đó chuyển pose. Procedural fallback dùng cùng cách chọn trạng thái. Pause và khống chế tiếp tục giữ pose.
- Mỗi instance giữ bản sao nhịp; không sửa clip nguồn hoặc tạo mixer mới mỗi frame. Thời lượng model không thay đổi attack interval, damage, skill cooldown, mana, targeting hoặc luật thắng.
- Chi tiết tướng có Đứng/Đi/Đánh/Chiêu. Attack/cast phát một lần rồi về idle; các nút chọn pose/clip bằng chạm hoặc bàn phím. Reduced motion chỉ lấy pose mẫu tĩnh khi chủ động chọn. Thiếu clip có thông báo.
- Admin → Tướng → Model & Animation có trường nhịp và nút xem thử clip hiện gán. Preview dùng bản sao binding nháp qua cơ chế có sẵn.

## Cài nội dung

```powershell
npm run presentation:animation
```

Chạy tại repo hoặc gói runtime sau khi cập nhật code; dùng `KORA_DATA_DIR` để chọn database. Gói `assets/riot/model-animation.json` chứa nhịp của 14 tướng và SHA-256/tên clip tương ứng đã kiểm tra tại revision 29. Không tải thêm model, animation hoặc texture.

Installer chỉ thêm profile khi asset hash và hai tên clip khớp. Bỏ qua model/animation asset tùy chỉnh và mọi `animation` admin đã khai báo, kể cả profile rỗng hoặc chỉ sửa một trường. Giữ các sửa đổi nháp khác. Backup `backups/before-model-animation-*.sqlite` trước transaction; lỗi publish rollback config/module/revision/audit trong transaction. Chỉ sửa nháp nếu phần publish đã có profile; chạy lại không tạo revision trùng. Trận đã mở giữ content snapshot cũ, tải lại game để nhận profile mới.

Gói runtime đưa đúng `tools/install-model-animation.ts` vào allowlist để lệnh trên chạy được; không đưa thư mục tools tùy ý, database, credential, cache hoặc model runtime vào gói.

## Kiểm thử đã chạy

- Baseline trước thay đổi: `npm run check`, **434/434 test**.
- Sau thay đổi: `npm run check`, **442/442 test**: architecture, server/client TypeScript, toàn bộ regression và production Vite build. `tests/fixtures/three-baseline.json` giữ nguyên.
- Test mới kiểm validator profile, ưu tiên hành động, future timestamp, packet muộn, không restart cùng packet, pause/freeze, instance riêng và giữ clip gốc. Hai trận cùng seed nhưng khác timing render có snapshot chiến đấu giống nhau sau 1.000 tick; content đã khóa không đổi khi sửa cấu hình nguồn.
- Installer test kiểm hash/clip, draft tùy chỉnh, backup, history, idempotency, chỉ sửa nháp và rollback khi inject lỗi publish. Regression đóng gói kiểm chỉ copy đúng installer được cho phép.
- `npm run smoke`: production bundles/API/module config/auth/người chơi trên database tạm đạt. `npm run package` đạt. Prettier trên file sửa và `git diff --check` đạt.
- Database QA riêng sao content/asset từ revision 29, **14 tướng / 73 asset**, không sao player/session. Kiểm GLB: 14/14 có walk/attack/cast/death đúng binding. Cài profile vào QA tạo revision 3; số revision QA độc lập database chính.

## Trình duyệt

Edge trên Windows, cùng bộ model GLB thật. Kiểm desktop, CSS viewport **844×390** và **667×376**. Trình duyệt đang có tỷ lệ zoom 90%; viewport override được bù và xác minh lại bằng `innerWidth/innerHeight`, không báo kích thước vật lý là kích thước CSS.

- Mở bộ sưu tập, xem Solan, Seryn và Torvyn, chọn đi/đánh/chiêu, đóng/mở detail và trở về sảnh. Tên/chỉ số/kỹ năng giữ theo content. Không tuyên bố đã QA bằng mắt tất cả 14 bộ động tác: 14/14 là kết quả kiểm asset/clip; browser lấy mẫu các rig cận chiến, pháp sư và model lớn.
- 844×390: detail, model và bốn nút thao tác trong khung; không tràn trang. 667×376: `scrollWidth=667`, `scrollHeight=376`; mỗi nút rộng khoảng 51,96px, cao 44px.
- Giả lập `prefers-reduced-motion: reduce`: chạm Chiêu của Seryn cho pose mẫu; hai screenshot ở hai lượt gọi khác nhau giống byte, xác nhận không tiếp tục tự chạy hoạt ảnh. Xóa giả lập media và reset viewport sau QA.
- Screenshot local `.data/hero-animation-mobile.png` và `.data/hero-animation-desktop.png`; không đưa vào source/release. Các lượt kiểm đã đọc console không có warning/error.
- Vào luyện tập → giữ tay mở đầu → bật Tự đấu và 4× trong inspector. Quan sát đến khoảng 50 giây mô phỏng, quân giao tranh, trụ bị phá và lõi địch mất HP; pause/resume rồi về sảnh. Đây là trận debug, không cộng chiến thắng và không phải benchmark hiệu năng hoặc kiểm thử WAN.
- Content Studio QA: Solan đọc nhịp 0,55/0,65/0,07, phát thử Kỹ năng. Đổi cast 0,65→0,72 rồi lưu nháp: public API vẫn trả revision 3, 0,65. Phát hành bằng UI: public trả revision 4, 0,72. Thử nghiệm này chỉ ở database QA.

## Giới hạn

Chưa benchmark Android/iOS vật lý, kiểm WAN hoặc tải nhiều người. Chunk Three.js vẫn khoảng 590kB minified và còn cảnh báo 500kB của Vite. Không đổi timing death/corpse, model/texture bytes, chiêu hoặc công thức damage. Preview chỉ xem clip, chưa dựng sandbox đối thủ để chứng minh tác dụng kỹ năng. Đánh giá pose/vũ khí ở toàn bộ frame của mọi rig và cue kỹ năng theo đúng recipient vẫn nằm trong backlog báo cáo khảo sát.
