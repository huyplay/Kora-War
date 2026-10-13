# Kiểm tra bản Three.js sau refactor — 13/10/2026

## Kết quả mới nhất — ổn định Tactical MVP

Đợt debug tiếp theo cùng ngày giữ phạm vi MVP đã duyệt. Người dùng xác nhận luật làm chậm: **giữ hiệu ứng mạnh nhất trong thời gian còn hiệu lực**.

- `npm run check`: **98/98 test đạt**, kiểm tra kiến trúc, TypeScript server/client và Vite production build đạt. Golden fixture từ `e792b00` không thay đổi. Three.js vẫn có cảnh báo chunk trên 500 kB.
- Thêm 33 test so với bản MVP ban đầu: 10 về slow mạnh/yếu và thời hạn độc lập; 2 về Lửa đúng 60 tick; 2 về vòng ngắm; 7 về reconnect/retry/cancel; 9 về lifecycle phòng; 3 về chặn lệnh mới khi leave đang chờ và bảo vệ phiên mới.
- Slow chỉ đổi trong tactical; đường legacy vẫn khớp fixture. Test DoT kiểm tra mọi cast tick qua sáu phút và các offset lớn; snapshot không cho chỉnh ngược slow/content/loadout của trận thật.
- Retry lệnh mất phản hồi dùng cùng ID; test đi qua `PvpRooms` xác minh chỉ gọi một quân và trừ mana một lần. Deadline disconnect, thắng bằng lõi trước deadline, TTL timestamp 0 và thu hồi phòng bỏ dở được kiểm tra với clock chủ động.
- Không chạy lại kiểm tra C#/PostgreSQL trong đợt này vì không đổi backend asset; kết quả trước được giữ ở phần lịch sử.

### QA trình duyệt đợt ổn định

- Production trên server QA riêng port 8788, data directory `.data/recovery-qa`; Edge và Chrome có cookie riêng tạo/vào cùng phòng, bắt đầu 4 mana và sáu thẻ. Không dùng database game chính để thử economy.
- Giả lập latency 4.000 ms ở Edge: triển khai Solan, chọn Lyra trước phản hồi. Theo dõi request/response HTTP 200 và DOM sau phản hồi: Lyra vẫn được chọn, Solan xuất hiện trên sân. Đã trả latency về 0.
- Giả lập offline ngắn ở hai lượt: thông báo nối lại hiện, sau bật mạng tự ẩn và timer tiếp tục trong cùng trận. Lựa chọn Lyra vẫn giữ ở lượt đầu. Không chạm deadline 30 giây trong thử nghiệm này.
- Phát hiện toast che banner reconnect: bỏ chi tiết lỗi transport khỏi thông báo, ẩn toast khi banner battle hiện. Thử lại tại CSS viewport thực tế **666×375**: banner đọc rõ, sáu thẻ hiện, document scrollWidth bằng viewportWidth.
- Phát hiện CSS mobile cũ giữ `right` của lane shortcuts khiến nút kéo ngang sân: reset `right` và giới hạn chiều rộng. Sau sửa, đo nhóm nút khoảng 82 px; chiến trường không bị nhóm nút che toàn chiều rộng.
- Tại 666×375, chọn Băng và rê vào phía đối thủ: thấy vòng ngắm màu xanh với phạm vi mới. Chạm đúng điểm ngắm trong PvP trừ mana 10 → 7 và bỏ chọn thẻ. Về sảnh bằng đầu hàng hoạt động. Reload trước đó phục hồi trận/kết quả từ server.
- Console Edge và tab Chrome cuối không ghi nhận error/warning. Tab Chrome cũ có lần không kết nối được debugger; mở tab QA mới bằng API trình duyệt, không coi lỗi công cụ là lỗi game.
- Đã reset viewport và tắt giả lập mạng. Ảnh cục bộ: `.data/qa/pvp-reconnect.jpg`, `.data/qa/spell-preview.jpg` (không đưa cache vào Git).
- Sau final check, khởi động lại game server port 8787 để nạp logic mới và reload tab game chính: sảnh, sáu thẻ, ví 200 và asset đã publish nạp lại; console không ghi nhận error/warning. Ảnh `.data/qa/stability-final.jpg`. Server QA đã dừng. Restart làm mất phòng in-memory theo giới hạn đã ghi.

Lượt này xác minh local một process, mạng lỗi giả lập trên desktop và các case test cụ thể; chưa có WAN, stress test hoặc thiết bị iOS/Android thật. Không tuyên bố mọi lỗi đã hết.

## Triển khai ban đầu — Tactical MVP

Áp dụng quyết định 4 tướng + 2 phép, mana 4 và PvP chuẩn hóa. Các lượt dưới đây kiểm tra luật mới; phần phía sau giữ làm lịch sử QA của bản trước.

- `npm run check` cuối: **65/65 test**, architecture, TypeScript server/client và Vite production build thành công. Hash `tests/fixtures/three-baseline.json` giữ nguyên; legacy vẫn khớp bốn seed/checkpoint gốc.
- Bổ sung test phép: deck đúng hai phép, mana/cooldown chung, lệnh sai không đổi tài nguyên, cảnh báo trước tác động, damage vùng/DoT, đẩy lùi và giới hạn slow/stun, seeded deterministic match có kết quả.
- Bổ sung test PvP: danh tính cookie, người ngoài/cross-origin/lệnh malformed, clock server, state hai góc nhìn, chuẩn hóa level, đầu hàng, timeout/reconnect, phòng hết hạn, phục hồi phòng từ tab mới, lệnh trùng sau hơn 256 lệnh và phản hồi bất đồng bộ khi rời phòng/dispose. Replay phép luyện tập và reward idempotency đạt.
- Một lượt check trước đó báo test process `backend.test.ts` thất bại mà không có assertion/stack. Chạy riêng tám backend test đạt; chạy lại toàn bộ check đạt, và lượt cuối 65/65 cũng đạt. Chưa xác định nguyên nhân của lần process thất bại đó.
- C# build thông thường gặp DLL bị service đang chạy khóa. `dotnet build backend/KoraWar.AssetApi/KoraWar.AssetApi.csproj --no-restore --output .data/backend-audit-build`: đạt, 0 warning / 0 error. `npm run backend:check`: đạt PostgreSQL migration, auth, import/retry, immutable IDs, checksum/provenance, binary roundtrip và snapshot idempotency trên database tạm.

### QA trình duyệt đã thực hiện

- Edge + Chrome, profile riêng, production ở server QA port 8788: tạo/vào cùng phòng, bắt đầu 00:00 / 4 mana, triển khai Solan từ hai phía và nhìn thấy quân trên sân. Các góc nhìn đảo phe/tọa độ đúng.
- Lượt đầu kiểm tra đổi và lưu bộ Băng+Gió ở roster; sáu thẻ hiện đúng sau lưu. Lượt cuối dùng Lửa+Băng.
- Phép Lửa chọn rồi nhấn lane giữa trong PvP: trừ 4 mana. Trong luyện tập, chọn Lửa và chạm tọa độ phía địch: thấy vùng cảnh báo tại điểm chọn, trừ mana và cooldown thẻ.
- Reload Edge khi đang PvP quay lại trận; mở một tab Edge mới với cùng cookie, không có mã trong sessionStorage, tự trở lại trận đang ở 01:00 qua endpoint current.
- Menu PvP ghi rõ trận tiếp tục và rời trận tính đầu hàng. Chrome đầu hàng ở 01:41, Edge nhận kết quả thắng; nút về sảnh của cả hai hoạt động. Không phát vàng PvP.
- Luyện tập AI trên URL Vite: bắt đầu 4 mana, phép hoạt động, pause và về sảnh hoạt động.
- Kiểm tra bố cục ngang: đã thử override 844×390 ở lượt trước; lượt cuối đo CSS viewport thực tế 534×300 và 667×375 vì browser zoom. Sửa CSS cũ làm action panel tràn và roster không co; DOM đo scrollWidth bằng viewportWidth ở sảnh và modal roster không tràn ngang. Cuộn roster tới bốn phép được; trên màn nhỏ vẫn vào kho/rèn/rương qua nút vàng và các tab trong kho.
- Override màn hình dọc 390×844: chỉ hiện yêu cầu xoay ngang, chặn game; reset viewport sau QA.
- Lượt QA production cuối không ghi nhận console error/warning ở Chrome và tab Edge khôi phục. Có vài thao tác click Chrome bị công cụ điều khiển timeout; dùng thao tác bàn phím và xác nhận trạng thái sau đó. Không coi lỗi công cụ là bằng chứng lỗi gameplay.
- Ảnh QA cục bộ: `.data/qa/tactical-mvp.jpg` (cache không đưa vào Git).

### Giới hạn của lượt này

Đã kiểm thử phòng riêng trên một Node process và kích thước viewport desktop. Chưa thử tải PvP nhiều phòng thật, WAN, iOS/Android vật lý, matchmaking/ranked hoặc R2 thật. Room chưa persist qua restart; game server được khởi động lại để nạp bản mới nên các phòng thử trước cần tạo lại. Three.js còn cảnh báo chunk lớn hơn 500 kB. Không có cơ sở cam kết hết mọi lỗi hoặc benchmark FPS trên điện thoại.

Chi tiết đối chiếu thiết kế và phân tích project: [PROJECT-REVIEW.md](../PROJECT-REVIEW.md).

## Tự động — đã đạt

- `npm run check:architecture`: core/data không phụ thuộc UI/Three.js/clock trình duyệt.
- `npm test`: 42/42 test; có 20 trận AI-v-AI đầy đủ, 10 kỹ năng, mana, trụ, thắng/thua, pause và restart.
- Golden regression: bốn seed khớp commit `e792b00` tại mọi checkpoint đã lưu.
- Vòng lặp render 30/60/144 Hz cho kết quả mô phỏng giống nhau.
- Save null/sai cấu trúc/JSON lỗi, storage bị từ chối, snapshot tách tham chiếu: đạt.
- Lifecycle, asset registry, pool giới hạn, tọa độ lane và gesture một pointer/cancel/cleanup: đạt.
- TypeScript strict + noUnusedLocals/noUnusedParameters và Vite production build: đạt.

## Trình duyệt

Đã mở bundle production trên Chrome tại `http://127.0.0.1:4173/`:

- Giao diện Kora War ở 667×375 và 844×390: sân 3D, ba lane, bốn thẻ, nút icon và màn chọn đủ 10 tướng; cốt truyện Elyndra/Aether được giữ.
- Chạm Lyra rồi nút lane trên, kéo Solan từ thẻ vào sân: gọi quân và trừ mana đúng; thấy model/hiệu ứng trên sân.
- Xoay sang 390×844: chỉ hiện hướng dẫn xoay ngang, chặn game. Trở lại ngang: trận ở màn pause, thời gian và mana giữ nguyên.
- Trận kiểm tra mới với debug tự đấu 4×, seed 20261014: thắng ở 01:22; lõi địch 0, lõi nhà 1114, gọi 28 tướng, 27 hạ gục, 13.380 sát thương, phá 3 trụ, 78 kỹ năng. Trận có nhãn DEBUG, không cộng chiến thắng.
- Chơi lại: thời gian 00:00, hai lõi 1500, mana 5; pause hoạt động. Ở đợt QA trước refactor UI cũng đã kiểm tra thử kết quả thua và về sảnh.
- Không có lỗi console được ghi nhận trong lượt chạy renderer/mobile này.

## Content Studio / asset / economy

- Chrome production tại `http://127.0.0.1:8787/` và `/admin`: dashboard mở được, model 3D và clip hiện đúng; game nạp 10 model, trụ/lõi/prop Khada và sprite CommunityDragon. Sửa normalization dùng wrapper đã được kiểm tra bằng test geometry/animation và hình ảnh Solan trong preview/game.
- Pipeline nguồn: 10 model từ 57,53 MiB xuống 15,82 MiB, tổng bộ runtime gồm ba cấu trúc và sprite khoảng 21,62 MiB. Test GLTFLoader đối chiếu vertex và keyframe của fixture trước/sau đóng gói. Đây là kích thước file, không phải benchmark.
- Luồng UI thực hiện: ví 350 → mua 2 mảnh Solan còn 310 → nâng cấp Solan cấp 2 còn 235 → mở rương còn 165, nhận Aurelia/Vesper/Mira mỗi tướng 1 mảnh và 30 vàng. Tải lại: ví 165, Solan cấp 2, mảnh thưởng vẫn còn.
- Trận thường 1× trên viewport 844×390: triển khai một Solan cấp 2, trận thua ở 00:49, 717 sát thương, hai kỹ năng, 39 hồi máu; server mô phỏng lại command log và trả +25 vàng. Không dùng debug. Console không ghi nhận lỗi/warning trong lượt trận này.
- Rương được kiểm tra ở 844×390; đã chỉnh bố cục rương thành hai cột ở màn thấp để dành chỗ cho nút mở. Label ví trong sảnh được nối lại với wallet sau khi nhận thưởng. Hai sửa UI cuối đã build/typecheck; chưa được mở lại trong browser do quyền truy cập trang local bị từ chối ở bước upload QA.
- Lượt upload UI qua công cụ Chrome chưa hoàn thành: extension yêu cầu quyền file URLs, sau đó quyền thao tác trang local bị từ chối. Không thay quyền extension hoặc dùng đường vòng. Test tự động kiểm tra GLB/nguồn/quyền, lưu file/catalog, archive và publish bằng database tạm; không tuyên bố upload UI đã qua QA.
- Kiểm thử mới: auth/origin/session cookie, bản nháp/publish/conflict, ví/idempotency/rollback, reward replay, asset provenance/archive, compaction và animation normalization. Mọi test dùng dữ liệu tạm; không thay fixture baseline.

## Giới hạn

Lượt media/backend ngày 13/10/2026: `npm run check` đạt 48/48 test, architecture/typecheck và production build. Baseline `e792b00` không sửa. `backend:build` đạt 0 warning/0 error; `backend:check` đạt với PostgreSQL tạm và local object storage: auth, migration, import/retry, checksum, ID bất biến, binary roundtrip, JSON lỗi và snapshot idempotency. Test cầu nối xác minh pending được lưu, retry xóa pending, binary sai SHA bị từ chối.

Đã nhập/publish 12 media asset: 10 SFX Kenney/JaggedStone, diffuse Poly Haven và Moon Rock 02 GLB (3.304 triangles, texture 1K). Chưa nghe/xem lại bản mới trong Chrome: công cụ vẫn từ chối địa chỉ local vì saved preference dù người dùng đã đồng ý kiểm tra lại. Không dùng đường vòng. Chưa chạy đồng bộ vào database `kora_war` thực tế vì `.env.local` chưa có; R2/CDN chưa có môi trường thật. GegX chưa tải xong: itch.io trả HTTP 429; atlas hiện có vẫn được dùng, upload PNG 8×1 đã được hỗ trợ.

Chưa benchmark thiết bị iOS/Android thật; không coi FPS hiển thị khi điều khiển trình duyệt là cam kết hiệu năng. Chưa có bộ E2E browser tự động trong repository. Bộ import dùng model LoL theo xác nhận giấy phép của chủ dự án; chưa retarget skeleton tùy ý hoặc dựng campaign nhiều màn.

Lượt tiếp theo cùng ngày: username PostgreSQL được xác nhận là `postgres`; database riêng `kora_war` được tạo, migration thành công. Đã đồng bộ và đọc lại đủ 43 asset (85,01 MiB của toàn thư viện, không phải tải mỗi trận) khớp SHA-256; cấu hình local bật service reads. GegX tải thành công, sáu sheet được nhập; binding riêng cho năm loại sự kiện được publish và lưu trong snapshot PostgreSQL. `npm run check` đạt 50/50 test và production build. Test mới kiểm tra sheet divisions/type/FPS và texture request của revision cũ/dispose. Edge được thử lại theo yêu cầu, vẫn bị saved permission từ chối; chưa xác minh hình ảnh/âm thanh bản mới trong browser.
