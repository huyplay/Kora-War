# Ánh sáng, công trình và trụ — 15/10/2026

Issue #16, liên quan arena #4. Đây là thay đổi hiển thị; mô phỏng combat và fixture legacy không đổi.

## Cấu hình SQLite

Content Studio → **Ánh sáng & công trình** lưu `presentation.arena` trong module `presentation` schema 2. Admin có thể lưu nháp/phát hành/khôi phục theo revision. Migration schema 1 thêm arena, giữ formation hiện có, tạo revision mới bằng transaction; revision và snapshot trận cũ không bị sửa. Các giá trị trong `src/data` chỉ là seed/migration và fallback cho content lịch sử/offline.

| Nhóm | Mặc định | Điều chỉnh |
|---|---|---|
| Ánh sáng | Ban ngày; mặt trời 4, nền 3,1; exposure ×1,2 | Chọn ngày/đêm, mặt trời/trăng, nền từng chế độ, đuốc |
| Ban đêm | Trăng 1,8, nền 1,8, đuốc 28 | Bốn nguồn đuốc ấm tại mép sân; không tạo thêm shadow map |
| Công trình | Model trụ cao 4,2; lõi 4,7; thành cao ×1,6/dày ×1,35 | Bệ trụ ba tầng vẫn giữ khi thay model |
| Trụ bắn | Phạm vi bật, opacity nghỉ 0,22/bắn 0,78; đạn 0,32 giây | Bật/tắt và độ rõ phạm vi, thời gian bay hiệu ứng |

Chế độ ánh sáng không chạy theo đồng hồ máy; một trận/replay giữ nguyên content snapshot. Exposure nhân với exposure riêng của map. Kích thước model không thay đổi HP, hitbox, tầm đánh hoặc lựa chọn mục tiêu. Khoảng bay là hoạt ảnh; sát thương vẫn xảy ra tại tick combat như trước.

## Renderer

- Mặt trời/trăng và ánh sáng nền dùng profile database; đuốc có ánh sáng cục bộ và flame/ember rõ hơn ban đêm.
- Thành mỗi bên scale quanh điểm neo ngoài vùng triển khai. Kiến trúc tĩnh gộp thành 31 batch, 19.172 triangles; tăng từ 20 batch để hai đầu thành có tỷ lệ riêng. Không thêm hàng nghìn draw call theo viên gạch.
- Trụ giữ bệ đá ba tầng, model đặt trên bệ; lõi giữ nền đá, có bóng tiếp xúc kể cả cấu hình low. Công trình nhập có bóng tĩnh khi bật shadow quality.
- Cảnh báo trụ là vùng chữ nhật cùng lane theo `rules.towerRange` và `gameplay.board.halfWidth`. Vùng tăng độ rõ khi trụ bắn, ẩn khi trụ bị phá. Không vẽ vòng tròn ngụ ý đánh lane bên cạnh.
- Đạn có lõi sáng, glow theo phe, trail, chớp đầu nòng và vòng trúng. Pool giới hạn 32 phát/bốn InstancedMesh, pause giữ tuổi hiệu ứng; reset/dispose dọn tài nguyên.

## Nghiệm thu local

- `npm run check`: kiểm tra kiến trúc, TypeScript server/client, **201/201 tests** và Vite build. Golden `three-baseline.json` giữ nguyên.
- `npm run smoke`: kiểm tra runtime production bundle game/admin, HTTP/content/module config, auth và tạo người chơi trên database tạm, thành công.
- Edge kết nối trực tiếp: desktop 1536×720 và mobile ngang 844×390; profile ngày/đêm, 54 quân, sáu trụ bắn đồng thời, zoom 1,85×/low và luồng luyện tập với HUD thật. Không thấy lỗi/warning console trong các tab QA.
- Content Studio trên database QA riêng: đổi ngày → đêm/đuốc 30, lưu nháp rồi phát hành revision 4; `/api/content` trả đúng profile đã lưu. Không dùng database người chơi để thử publish.
- Unit test kiểm tra migration/history/restore, validator, thành không lấn vùng thả, bệ/thân trụ, vùng phạm vi và pool/cleanup đạn.

Không đo benchmark trên điện thoại thật. Vite còn cảnh báo chunk Three.js trên 500 kB; ngân sách hình học/pool không phải cam kết FPS. Screenshot QA lưu local trong `.data/`, không commit dữ liệu chạy thử.
