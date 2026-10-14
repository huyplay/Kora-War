# Kora War Content Studio

Backend Node.js 24 + SQLite nằm trong `server/`. Chạy `npm run start` để build game và phục vụ game/dashboard/API cùng origin tại `http://127.0.0.1:8787`. Database và upload ở `.data/`, không commit. Lần đầu server tạo tài khoản `admin`; mật khẩu sinh ngẫu nhiên ghi trong `.data/admin-setup.txt`. Có thể cung cấp `KORA_ADMIN_PASSWORD` ở lần khởi tạo database đầu tiên. Cookie admin HttpOnly/SameSite=Strict, hết hạn sau 8 giờ; server chỉ bind loopback.

`config` lưu draft và published riêng; số version chặn ghi đè bản nháp đã đổi ở tab khác. Publish tạo revision và kiểm tra nguồn asset/clip tồn tại. Restore revision đưa nội dung về draft; cần publish để có hiệu lực. Mỗi Battle sao chép cấu hình, không sửa trận đang chạy. Tick 20 Hz, ba lane, 10 tướng và lore hiện tại vẫn là ranh giới catalog. Không có chạy JavaScript từ dashboard; kỹ năng cấu hình qua damage/heal/shield/slow/stun.

Asset upload: GLB 2.0 tự chứa texture/buffer, PNG/JPEG/WebP, tối đa 30 MB; model tối đa 150.000 triangles/2.000 nodes/200 clips. Lưu SHA-256, tác giả, URL nguồn, giấy phép và xác nhận quyền dùng. Các budget này là giới hạn nhập, không bảo đảm mobile đạt 60 FPS. Clip ngoài cần cùng skeleton/node names; không có tự động retarget.

Studio nhận thêm WAV PCM/float và Ogg Vorbis/Opus tối đa 4 MiB, 15 giây, mono/stereo. Mục Âm thanh chỉnh master/effects/UI, số voice, volume/rate/cooldown của từng cue và attack/cast/death/footstep theo tướng; nút nghe thử áp dụng gain và tốc độ bản nháp. Texture tối đa 4 triệu pixel, cạnh 4096; map chỉnh stone/grass asset, repeat và tint. Sprite sheet VFX dùng image asset cùng số cột/hàng; không tải trực tiếp Unity prefab.

VFX có atlas chung và binding riêng cho gọi quân/kỹ năng/hồi máu/chết/cộng hưởng. Cấu hình cột/hàng phải chia hết kích thước ảnh; FPS atlas 4–60, chỉ điều khiển hình ảnh. Xóa binding riêng để quay về atlas chung. Renderer dùng pool tối đa 48 particle, giải phóng texture của revision cũ và bỏ request trả muộn sau khi đổi cấu hình/dispose.

[Service PostgreSQL](BACKEND-MIGRATION.md) có thể bật qua `.env.local`; upload đồng bộ metadata/file sau khi lưu local. Khi service mất kết nối, bản local vẫn giữ và đánh dấu pending; chạy `npm run assets:sync` để thử lại. Bí mật chỉ nằm ở backend. Hiện ví/trận còn ghi SQLite, R2/CDN chưa cấu hình thực tế.

Wallet guest lưu trên database, nhận diện bằng cookie riêng. Hồ sơ gắn trình duyệt; chưa có đăng nhập đa thiết bị/phục hồi tài khoản. Giao dịch có request ID để chống double-submit; ledger lưu thay đổi. Thưởng trận dùng seed, deck, content revision và command log để server mô phỏng lại; trận debug không nhận thưởng. Backend này dành cho môi trường local; khi triển khai Internet cần TLS/reverse proxy, domain/cookie cấu hình phù hợp, vận hành backup, account recovery và giới hạn tải.

Sao lưu nhất quán SQLite qua backup API hoặc dừng server trước khi sao chép cả `.data/`; giữ upload cùng database. Không sao chép riêng file SQLite trong khi WAL đang hoạt động.

## Quyết định bổ sung ngày 13/10/2026

Người dùng yêu cầu dashboard/database và xác nhận thêm nhận vàng, rương, cửa hàng, nâng cấp thẻ. Cấu hình ban đầu: 300 vàng, thắng 80/thua 25, rương 100 trả 30 vàng + 3 mảnh ngẫu nhiên, cửa hàng 40 vàng/2 mảnh, nâng cấp tốn 75×cấp vàng và 2×cấp mảnh. Mỗi cấp tăng HP/attack quân người chơi 5%, tối đa cấp 10; level 1 giữ baseline. Chưa có thanh toán tiền thật.

Người dùng xác nhận đã có giấy phép dùng toàn bộ asset LoL trong game. Đây là xác nhận do người dùng cung cấp, chưa phải giấy phép đã được kiểm chứng độc lập. [Khada](https://modelviewer.lol/) là nguồn export model được ưu tiên; [Riot Legal](https://www.riotgames.com/en/legal) và [Khada terms](https://modelviewer.lol/privacy/terms-of-use) được kiểm tra trước khi nhập. Không coi model tải từ Sketchfab hoặc CommunityDragon là tự động được phép tái sử dụng; ghi nguồn/quyền cho từng file.

Backend kiểm thử draft/publish/version conflict, auth/origin/cookie, ví/ledger/rollback, replay thưởng, kiểm tra GLB và isolation per battle. Baseline fixture `e792b00` được giữ nguyên.

## Thao tác trong dashboard

- Nhân vật: chỉ số, tên/mô tả kỹ năng, điều kiện kích hoạt, truy vấn hậu tuyến/áp sát và danh sách hiệu ứng; model, chiều cao, hướng xoay, clip theo từng trạng thái. JSON nâng cao dùng cùng schema với các form.
- Gameplay: deck/tay bài/đổi bài, mana/trụ/lõi/quá tải, tám phép và chuỗi hiệu ứng, hệ/tộc, cộng hưởng, AI, vùng triển khai, thời hạn PvP và bộ sưu tập. Form đọc từ database; không cần sửa TypeScript để cân bằng các giá trị này. Xem [schema, giới hạn và QA](GAMEPLAY-CONFIG.md).
- Module rule: trong Gameplay mở bảng schema/version nháp/live và trạng thái của 15 module. Dữ liệu lưu riêng từng module, lịch sử theo revision; API admin hỗ trợ sửa một module. Xem [module và migration](RULE-MODULES.md).
- Chat & đội hình: câu/emoji, hình phản hồi, bật/tắt/nhịp gửi/thời gian hiển thị và packing renderer. Hai module mới nâng tổng lên 17; xem [giao chiến và QA](BATTLE-PRESENTATION.md).
- Asset: upload GLB/ảnh, xem 3D và từng clip, ghi provenance. Ẩn/khôi phục là thao tác có thể đảo ngược; không được ẩn asset đang được draft hoặc published sử dụng.
- Màn chơi: chọn prefab trụ/lõi, đặt prop theo tọa độ, màu sương/exposure. Luật trụ/mana/quá tải cũng có trong Gameplay. Một màn ba lane hiện được hỗ trợ, chưa có campaign nhiều chương hoặc chỉnh địa hình bằng kéo đỉnh mesh.
- Hiệu ứng: palette hai phe/hồi máu, kích thước, sprite/atlas và số cột/hàng.
- Vật phẩm & tiền: danh mục bán mảnh, giá/đơn vị, thưởng trận/rương/nâng cấp. Người chơi: điều chỉnh ví có lý do và audit log.
- Phiên bản: xem audit/revisions, đưa bản cũ về draft rồi phát hành khi sẵn sàng. Khi khôi phục revision có asset đã ẩn, khôi phục asset trước khi publish.

Pipeline Khada: `npm run assets:import`. Repo chỉ lưu manifest, checksum và tool; file nguồn/upload ở `.data/`. Pipeline kiểm tra checksum nguồn trước khi tái nhập; nếu CDN thay file, dừng để xem lại asset mới. Script này gán bộ ngoại hình mặc định và phát hành cấu hình, nên không dùng để chỉ tải file khi đang có binding tùy chỉnh cần giữ.
