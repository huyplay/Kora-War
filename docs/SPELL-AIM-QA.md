# Vùng ngắm phép — 16/10/2026

Task [#59](https://github.com/huyplay/Kora-War/issues/59) thay elip ngắm phép có bề rộng cố định bằng vùng chữ nhật theo lane và dấu dưới chân quân hiện nằm trong vùng. Đây là phản hồi trước khi thả, không thay luật phép hoặc điểm gửi lệnh.

- Bán kính, màu, phe mục tiêu và bề rộng lane đọc từ gameplay snapshot của trận. Vùng ngắm phủ khoảng `x ± radius` trên lane, gồm các góc mà elip trước đây không thể hiện. Khi bán kính hoặc bề rộng được admin phát hành, trận mới tự dùng giá trị đó; không có cấu hình cân bằng mới hay migration.
- `core/physics/spell-area.ts` chứa đúng predicate cũ: quân còn sống, đúng phe, cùng lane và `abs(unit.x - x) <= radius`. `updateSpells` và renderer dùng chung; không thêm epsilon, clamp hay luật chọn mục tiêu. Fixture/replay lịch sử giữ hash cũ.
- Phạm vi xét quân dùng tọa độ logic. Dấu chân dùng vị trí đội hình đã giãn và tỷ lệ model; vì vậy một dấu có thể lệch nhẹ khỏi vùng nền khi hình ảnh của quân được giãn ra. Chạm model vẫn gửi tọa độ logic hiện tại, không thay thành tọa độ hình ảnh. Vũ khí/cánh rộng không làm dấu chân phình theo toàn bộ bounding box.
- Dấu chỉ mô tả các quân hợp lệ ở snapshot hiện tại; quân đi vào/ra hoặc chết trước lúc hết warning có thể đổi kết quả thực tế. Không khóa target theo preview. Hình vùng phép đang hoạt động sau khi dùng tiếp tục là lớp VFX riêng.
- Một plane dùng lại và một batch tối đa 100 vòng chân; không tải texture, không tạo label DOM hay animation mới. Màu viền sáng nhẹ giúp đọc trên nền đá, fill mờ; cập nhật sau khi đồng bộ vị trí quân. Hủy/chuyển thẻ, điểm ngắm không hợp lệ, pause/end/reset dọn dấu. Reduced motion dùng cùng dấu tĩnh; dispose trả tài nguyên GPU.

## QA

- `npm run check`: kiến trúc, server/client TypeScript, 352 tests và production build. Ba test helper bao phủ biên chính xác, lane/quân chết, enemy/ally/all, hai phe, radius tùy chỉnh và so sánh với tác động cast thật. Ba test renderer bao phủ hình vùng, tọa độ đội hình, đổi trạng thái, missing visual, giới hạn 100 và disposal. Test World thêm kiểm tra gameplay đã khóa, pick mode, command coordinate, pointer đứng yên và model có vũ khí quá rộng. Golden fixtures không đổi.
- `npm run smoke`, `git diff --check` và review độc lập phần tích hợp.
- Chrome DOM 844×390 và 667×376: ngắm Lửa/Băng, hồi máu đồng minh, kéo thẻ rồi hủy, pointer đứng yên khi quân di chuyển, zoom bằng wheel và pinch, reduced motion, pause/resume. Pinch hủy chọn và giữ số thẻ; các vùng ngắm/thanh máu vẫn đọc được khi zoom. Thử chọn vùng trống trên lane cũng hiển thị vùng mà không tạo dấu chân giả. Document không cuộn; không có console warning/error trong lượt QA. Ảnh local `.data/spell-aim.png`.
- QA tách database/asset khỏi main và không sao chép người chơi/session. Fixture quan sát dùng max/starting mana 30 rồi 10, HP tướng 5.000, attack 1 và cooldown kỹ năng 900s; không triển khai các giá trị này. Main giữ revision 29. Đây là kiểm tra kích thước trình duyệt, không phải benchmark hoặc nghiệm thu cảm ứng/loa điện thoại thật.
