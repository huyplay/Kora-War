# Kora War Content Studio

Backend Node.js 24 + SQLite nằm trong `server/`. Chạy `npm run start` để build game và phục vụ game/dashboard/API cùng origin tại `http://127.0.0.1:8787`. Database và upload ở `.data/`, không commit. Lần đầu server tạo tài khoản `admin`; mật khẩu sinh ngẫu nhiên ghi trong `.data/admin-setup.txt`. Có thể cung cấp `KORA_ADMIN_PASSWORD` ở lần khởi tạo database đầu tiên. Cookie admin HttpOnly/SameSite=Strict, hết hạn sau 8 giờ; server chỉ bind loopback.

`config` lưu draft và published riêng; số version chặn ghi đè bản nháp đã đổi ở tab khác. Publish tạo revision và kiểm tra nguồn asset/clip tồn tại. Restore revision đưa nội dung về draft; cần publish để có hiệu lực. Mỗi Battle sao chép cấu hình, không sửa trận đang chạy. Tick 20 Hz, ba lane, 10 tướng và lore hiện tại vẫn là ranh giới catalog. Không có chạy JavaScript từ dashboard; kỹ năng cấu hình qua damage/heal/shield/slow/stun.

Asset upload: GLB 2.0 tự chứa texture/buffer, PNG/JPEG/WebP, tối đa 30 MB; model tối đa 150.000 triangles/2.000 nodes/200 clips. Lưu SHA-256, tác giả, URL nguồn, giấy phép và xác nhận quyền dùng. Các budget này là giới hạn nhập, không bảo đảm mobile đạt 60 FPS. Clip ngoài cần cùng skeleton/node names; không có tự động retarget.

Wallet guest lưu trên database, nhận diện bằng cookie riêng. Hồ sơ gắn trình duyệt; chưa có đăng nhập đa thiết bị/phục hồi tài khoản. Giao dịch có request ID để chống double-submit; ledger lưu thay đổi. Thưởng trận dùng seed, deck, content revision và command log để server mô phỏng lại; trận debug không nhận thưởng. Backend này dành cho môi trường local; khi triển khai Internet cần TLS/reverse proxy, domain/cookie cấu hình phù hợp, vận hành backup, account recovery và giới hạn tải.

Sao lưu nhất quán SQLite qua backup API hoặc dừng server trước khi sao chép cả `.data/`; giữ upload cùng database. Không sao chép riêng file SQLite trong khi WAL đang hoạt động.

## Quyết định bổ sung ngày 13/10/2026

Người dùng yêu cầu dashboard/database và xác nhận thêm nhận vàng, rương, cửa hàng, nâng cấp thẻ. Cấu hình ban đầu: 300 vàng, thắng 80/thua 25, rương 100 trả 30 vàng + 3 mảnh ngẫu nhiên, cửa hàng 40 vàng/2 mảnh, nâng cấp tốn 75×cấp vàng và 2×cấp mảnh. Mỗi cấp tăng HP/attack quân người chơi 5%, tối đa cấp 10; level 1 giữ baseline. Chưa có thanh toán tiền thật.

Người dùng xác nhận đã có giấy phép dùng toàn bộ asset LoL trong game. Đây là xác nhận do người dùng cung cấp, chưa phải giấy phép đã được kiểm chứng độc lập. [Khada](https://modelviewer.lol/) là nguồn export model được ưu tiên; [Riot Legal](https://www.riotgames.com/en/legal) và [Khada terms](https://modelviewer.lol/privacy/terms-of-use) được kiểm tra trước khi nhập. Không coi model tải từ Sketchfab hoặc CommunityDragon là tự động được phép tái sử dụng; ghi nguồn/quyền cho từng file.

Backend kiểm thử draft/publish/version conflict, auth/origin/cookie, ví/ledger/rollback, replay thưởng, kiểm tra GLB và isolation per battle. Baseline fixture `e792b00` được giữ nguyên.
