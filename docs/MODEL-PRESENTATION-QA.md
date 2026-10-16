# Model và animation — issue #47

## Thay đổi

`models.<hero>.hiddenMaterials` là danh sách tên material cần ẩn, lưu trong content database. Admin → Nhân vật → Model & Animation hiển thị các checkbox lấy trực tiếp từ model đang xem trước, kể cả asset cũ chưa có metadata phần hiển thị. Đổi lựa chọn cập nhật preview; lưu nháp/phát hành theo revision hiện có. Server kiểm tra tên thật trong GLB và từ chối ẩn toàn bộ model. Danh sách rỗng là lựa chọn rõ ràng của admin, không bị installer ghi đè.

Renderer clone material cần ẩn cho từng instance; không xóa skeleton, không sửa geometry/texture nguồn dùng chung. Hiệu ứng trúng đòn và màu phe vẫn giữ lựa chọn ẩn. Bounds tính theo các chỉ số đỉnh thực sự được vẽ: một số GLB dùng chung POSITION cho thân, thú phụ và đạo cụ, nên bounding box toàn buffer vẫn sai ngay cả khi đã tắt đạo cụ. Chân dung, bệ bộ sưu tập, tỷ lệ và giãn hình ảnh trong trận dùng cùng phép đo mới; không sửa tọa độ/combat.

`showcaseYaw` tùy chọn tách góc xoay mô hình đi bộ trong bộ sưu tập khỏi `portraitYaw` của hình thẻ. Thiếu field giữ fallback cũ. Aurelia dùng góc 0 trong bộ sưu tập và giữ chân dung 180 vì hai clip nguồn có hướng khác nhau.

Gói `assets/riot/model-presentation.json`:

- Kael: ẩn Poro; idle chuyển từ clip vào tư thế sang vòng lặp `Idle_01_Loop`.
- Vesper: ẩn hoa đạo cụ; chạy `morgana_run` thay `Run_Homeguard`.
- Orin: ẩn đe, kiếm, xô và Poro; giữ thân/búa; chạy `Run_Base` thay `Run_Fast`.
- Torvyn: ẩn Poro; chạy `Run_Base` thay clip chạy kỹ năng `Volibear_spell1_run.anm`.
- Aurelia: sửa góc mô hình bộ sưu tập; giữ model/chân dung/combat.

## Cài đặt

`npm run assets:presentation` dùng `KORA_DATA_DIR` (mặc định `.data`). Công cụ kiểm tra SHA-256 nguồn đã ghi nhận, giữ các clip cũ và thêm clip cần sửa, nhập asset mới qua kho hiện có. Model cũ vẫn được giữ cho revision/replay. Không thay binary trong asset đã tồn tại. Báo cáo kích thước/checksum/clip ở `assets/riot/model-presentation-report.json`.

Installer chỉ cập nhật binding có checksum nguồn đã biết; bỏ qua model hoặc animation GLB riêng của admin. Chỉ đổi từng clip nếu vẫn đúng giá trị cũ; giữ chiều cao/yaw/clip khác và visibility đã cấu hình. Tạo backup SQLite, cập nhật live rồi khôi phục draft chưa phát hành trong cùng transaction. Không tự publish thay đổi khác của admin. Chạy lại không tạo revision. Asset nhập trước transaction có thể chưa được tham chiếu nếu publish thất bại.

Dữ liệu sưu tập, gameplay và snapshot lịch sử được giữ nguyên. Các phần bị ẩn vẫn nằm trong GLB/texture nguồn; không xem đây là giảm dung lượng tải hoặc bộ nhớ texture. Không thêm luật gameplay hoặc nâng trần mana trên bản chính.

## QA

- `tests/model-parts.test.ts`: material riêng từng instance/dispose, visible groups và draw range, shared vertex buffer, skinned pose sau reparent/scale, instancing, validation phần ẩn, bảo vệ draft/clip/asset của admin, idempotency và lịch sử; mapping ưu tiên vòng lặp/chạy thường và escape nhãn admin.
- Browser database riêng: bật/tắt búa Orin, lưu/phát hành và tải lại client; khôi phục búa chính sau thử nghiệm. Orin hết Poro/đạo cụ che model và khung được căn theo phần đang vẽ. Aurelia nhìn về phía trước trong bộ sưu tập.
- Viewport thực tế DOM 844×390: chi tiết thẻ có scrollWidth/scrollHeight đúng viewport, nút đóng 44×44. Đã gọi 8 tướng bằng chạm trong trận, gồm Kael/Vesper/Orin/Torvyn, quan sát đi/đánh/hiệu ứng; không có console error được ghi nhận. Mana 30 và deck AI cố định chỉ dùng ở database QA.
- Chạy `npm run check` và `npm run smoke`; ghi số test cuối cùng trong PR. Giả lập viewport không phải benchmark thiết bị thật.
