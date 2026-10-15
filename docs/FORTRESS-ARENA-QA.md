# Fortress arena — 15/10/2026

Đợt hai của issue #4, theo hai ảnh tham khảo người dùng cung cấp. Chỉ thay renderer; không sửa core, balance, deck, giao tranh hoặc revision database.

## Đồ họa

- Camera phối cảnh nghiêng thay camera trực giao: lane xa thu nhỏ tự nhiên, giữ zoom quang học 1–1,85×. Frustum thích ứng với tỉ lệ màn hình. Rig lưu vị trí gốc để reset không nhảy về vị trí camera cũ.
- Sáu cổng vòm đá nguyên bản Elyndra, cửa gỗ lùi sâu, trụ chống có cạnh vát, đá đỉnh và ngọc phe. Cổng nằm ngoài vùng triển khai/chiến đấu. Giữ trụ/lõi theo mô phỏng.
- Đá lát chia ô nhỏ và so le; nẹp đồng mảnh hơn, mặt tường có độ sáng phân lớp. PBR diffuse/normal/roughness tiếp tục đọc asset binding trong database.
- Cờ xanh/đỏ dài có đuôi chữ V và chuyển động vải; sáu dấu ấn Aether ở cửa lane dùng một texture chia sẻ và hai InstancedMesh. Lửa/tàn lửa hiện có tiếp tục hoạt động.
- Sửa shader công trình địch: diffuse và emissive cùng chuyển ánh xanh sang đỏ, tránh lõi địch ngả tím.

## Nguồn và ngân sách

Không nhập asset bên ngoài mới, không sao chép pixel/model từ ảnh tham khảo. Cổng và chi tiết kiến trúc tạo bằng geometry TypeScript tại `fortress-gates.ts`; cờ và sigil là hình vẽ canvas nguyên bản, không phải bitmap tải về. Texture/model Poly Haven đã nghiệm thu và quản lý trong SQLite tiếp tục dùng, provenance của chúng giữ nguyên trong asset metadata. Không publish lại config hoặc thay content lịch sử.

Kiến trúc tĩnh: **20 material batches, 19.172 triangles** (trước 15/12.040). Kiểm thử giới hạn ≤20 batches và <25.000 triangles. Texture dấu ấn mới 256×256 RGBA (~256 KiB decoded), cờ dùng texture 256×512 chia sẻ theo phe. Canvas texture có mipmap; không phóng ảnh chụp map khi zoom.

Fixture 54 quân/18 mỗi lane, đứng trước combat ở overview: khoảng **346 draw calls, 704.370 triangles, 208 textures** toàn cảnh. Đây là thống kê renderer tại một frame, không phải benchmark FPS hoặc kết quả trên điện thoại thật. Công trình/model quân nhập vẫn là phần lớn chi phí; chưa đạt mục tiêu hoàn toàn tương đương art tham khảo.

## QA đã chạy

- `npm run check`: **195/195 tests**, architecture, TypeScript server/client, Vite build đạt. Golden replay fixture giữ nguyên. `npm run smoke` đạt.
- Tests phối cảnh xa–gần, ray picking sau zoom 1,85×, reset giữ đúng góc/điểm gốc; test target model dùng camera phối cảnh; gate bounds, UV/budget geometry hữu hạn.
- Edge kết nối qua CUA, database QA riêng với 59 asset, nguồn DB chính mở read-only. Viewport CSS đã đo 844×390 và 1536×720. Fixture 54 quân, overview/max zoom/reset, low quality và chạy combat; body picking tại overview và zoom lớn trả lane 1/x logic 0,55, spellValid=true.
- Luồng app Home → luyện tập → giữ bài chạy trên viewport mobile; sân/HUD hiển thị cả ba lane. Kiểm tra chạm thả quân, zoom/reset và console trong bước QA cuối. Screenshot lưu `.data` worktree task, không vào Git/release. Harness kiểm tra trong dist được xóa bởi production build cuối.

## Giới hạn

Đây là kiến trúc 3D và phối cảnh mới trên hệ asset hiện tại. Không đổi bố trí logic ba lane hoặc thêm vật cản thật. Ở zoom lớn, các phần ngoài vùng nhìn bị cắt như camera quang học bình thường. Vũ khí/vạt áo chuyển động vẫn có thể che nhau, theo giới hạn formation đã ghi ở đợt trước. Bundle Three.js vẫn cảnh báo >500 kB. Issue #4 tiếp tục mở cho chất lượng art, animation và tối ưu thiết bị thật.
