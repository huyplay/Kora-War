# Cổng gia cố Elyndra — 16/10/2026

Task [#73](https://github.com/huyplay/Kora-War/issues/73), phần kiến trúc arena [#4](https://github.com/huyplay/Kora-War/issues/4).

Sáu cổng có bậc ngưỡng đá, mũ đá hai tầng, đai cửa dọc/ngang, đinh tán và huy hiệu Aether với viền kim loại, lòng tối và viên ngọc hai phe. Trụ cổng có các đai đá phân tầng. Chi tiết giữ cùng nhóm frontage để scale/align theo `coreX`, chiều cao và độ dày presentation như trước; không thêm vật cản, HP riêng hoặc lực đẩy.

Huy hiệu và đinh tán dùng geometry dùng chung; các dải mảnh dùng hộp phẳng thay bevel để giữ ngân sách. Tất cả bake vào các batch hiện có, dùng lại màu/vật liệu. Không có texture/asset tải thêm, migration hoặc publish content. Geometry do builder tạo được trả về để environment dispose sau bake.

## QA

- `npm run check`: architecture, server/client TypeScript, **396/396 tests**, production build; golden replay giữ nguyên. Ba test mới kiểm sáu huy hiệu/ngọc/đinh tán/ngưỡng chạm nền, geometry chia sẻ/ownership, đối xứng và clearance, dữ liệu bề mặt hữu hạn cùng mặt đánh lõi ở 27 tổ hợp coreX/height/thickness. Giữ kiểm tra bounds/UV/budget trước đây; cập nhật kỳ vọng số tam giác có chủ đích cho chi tiết mới.
- `npm run smoke` sau build, Prettier, `git diff --check` và review diff.
- Kiến trúc **36 batches / 34.440 tam giác**, thêm 2.160 tam giác so với PR #72, vẫn dưới trần 35.000. Dữ liệu màu đỉnh đá **957.024 byte**, không thêm texture/lượt vẽ. Không tăng trần test để bỏ qua lỗi. Một lượt nháp tạo hai batch thêm do vật liệu đai trụ; đổi sang vật liệu đá dùng chung trước kiểm tra cuối.
- QA database riêng chỉ sao content/assets; fixture mana đầu/max 10, deck cố định, tướng HP 5.000/attack 1/skill cooldown 900s. Thay profile đêm chỉ trong QA, không triển khai các giá trị này. Main revision 29.
- Chrome DOM **844×390**, **667×376**, **1536×720**: ngày/đêm, overview và zoom tối đa phía cổng đồng minh bằng wheel, reset toàn sân; touch triển khai Solan làm chồng rút 8→7. Quan sát khung đá, đai kim loại, huy hiệu/ngọc hai phe và tiếp giáp chân nền. Không cuộn trang hoặc warning/error console. Viewport/media override đã dọn sau QA.
- Ảnh local: `.data/gates-mobile.png`, `.data/gates-zoom.png`, `.data/gates-desktop.png`, `.data/gates-night-small.png`. Các kích thước là DOM viewport; screenshot có vùng đệm do browser zoom. Độ khớp mặt đánh/scale kiểm bằng geometry test, không tuyên bố đã thử mọi config trong trình duyệt. Đây không phải benchmark hay nghiệm thu trên điện thoại thật.
