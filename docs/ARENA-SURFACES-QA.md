# Sắc độ đá và vòng đời PBR — 16/10/2026

Task [#71](https://github.com/huyplay/Kora-War/issues/71), một phần arena [#4](https://github.com/huyplay/Kora-War/issues/4).

Kiến trúc đá có sắc độ trung tính theo từng khối, mặt đứng và mép dưới. Mặt trên giữ sáng hơn khe/cạnh; màu vẫn nhân với tint và texture đã phát hành. Đây là lớp trình bày tĩnh, không phải hệ thống ambient occlusion thời gian thực. Không đổi vị trí, bounds, normal, UV hay topology; không đổi gameplay.

Geometry đá được tô màu trước khi bake vào các batch. Chỉ mesh có thuộc tính color dùng shader vertex-color; bệ trụ/kim loại không có color dùng biến thể thường. Các mesh cùng loại vẫn chia sẻ vật liệu. Kiểm tra trình duyệt đã phát hiện và sửa trường hợp thiếu color khiến mesh tối đen; test riêng giữ tương thích hai biến thể.

TerrainStyle nạp theo generation và bản sao binding. Vật liệu đang dùng giữ nguyên tới khi bộ thay thế hoàn tất; sau đó cả diffuse/normal/roughness và màu được cập nhật cùng lượt. Bỏ binding trả màu gốc và xóa tất cả map. Kênh tải lỗi dùng fallback thay vì giữ ảnh từ revision trước. Tải cũ không ghi đè lượt mới; texture đã tải một phần được trả khi bị thay thế, texture đến muộn sau dispose cũng được trả. Không tải binding không có bề mặt hiển thị. Không sửa input content hoặc thêm schema/migration/publish.

## Kiểm tra

- `npm run check`: architecture, server/client TypeScript, **393/393 tests**, production build; golden replay giữ nguyên. Tám test mới bao phủ seam/face/variation trung tính và geometry bất biến, tích hợp batch/budget, biến thể màu đỉnh/thường, PBR color spaces/repeat/anisotropy/tint, thay/bỏ binding, async stale/partial release, tải lỗi từng kênh và disposal/late load.
- `npm run smoke` sau build thành công; Prettier và `git diff --check`.
- Kiến trúc vẫn **36 batches / 32.280 tam giác**. 18 batch đá thêm **890.496 byte** dữ liệu màu đỉnh (~0,85 MiB), không thêm lượt vẽ, texture, shadow pass hoặc hiệu ứng hậu kỳ. Các texture color/normal/roughness Poly Haven hiện có vẫn từ database. Đây là ngân sách dữ liệu, không phải benchmark GPU/điện thoại thật.
- QA dùng database riêng, chỉ sao content/asset, không sao player/session. Fixture mana 10, deck cố định, tướng HP 5.000/attack 1/skill cooldown 900s; mode và binding chỉ thay trong QA. Main giữ revision 29.
- Chrome DOM **844×390**, **667×376**, **1536×720**: so sánh ảnh trước/sau trên cùng profile ban ngày; quan sát khe/cạnh, chân trụ, kim loại và hai phe ở overview/zoom; touch deploy Solan (chồng rút 8→7), pinch tới giới hạn và reset; cảnh đêm và fallback khi bỏ texture. Khung mobile/desktop không cuộn trang; console không warning/error trong lượt QA. Fallback render được màu đá gốc và trận vẫn bắt đầu bình thường.
- Ảnh local: `.data/surface-before.png`, `.data/surface-after.png`, `.data/surface-zoom.png`, `.data/surface-desktop.png`, `.data/surface-night-small.png`, `.data/surface-fallback.png`. Viewport ghi trên là kích thước DOM; screenshot có vùng đệm do zoom browser. QA trình duyệt không phải nghiệm thu trên thiết bị thật; async lỗi/stale/dispose được kiểm bằng test có kiểm soát.
