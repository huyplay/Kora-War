# Độ rõ giao chiến đông quân — 16/10/2026

Task [#53](https://github.com/huyplay/Kora-War/issues/53) giảm các lớp sáng che tướng khi đông quân và căn vệt chém theo model. Không thay combat, sự kiện replay, thời điểm sát thương hoặc luật chọn mục tiêu.

## Profile và admin

`ContentConfig.vfx.readability` là profile tùy chọn trong database. Admin → Hiệu ứng → Độ rõ giao chiến chỉnh độ rõ, tỷ lệ kích thước, cách trộn màu và giãn nhịp của bảy loại atlas sự kiện; giới hạn số atlas trong cùng lane/vùng và thời gian atlas; bật/tắt, kích thước, độ rõ, tuổi thọ, độ cao vệt chém. Màu vệt chém/tia trúng đòn dùng màu đồng minh/đối thủ từ VFX profile.

`npm run presentation:readability` thêm mặc định có backup/transaction. Giữ asset và cấu hình admin khác, nháp chưa phát hành, người chơi, gameplay và lịch sử. Profile đã có được giữ nguyên; chạy lại không tạo revision. Trận đang chạy khóa snapshot; snapshot thiếu profile tiếp tục hiệu ứng cũ.

## Hiển thị và giới hạn

- Atlas trúng đòn/kỹ năng/hồi máu/triệu hồi/hạ gục mặc định dùng trộn màu thông thường và độ rõ thấp hơn. Các ảnh GegX hiện tại có alpha; không chỉnh hoặc thay file nguồn. Cộng hưởng và atlas đạn vẫn có tùy chọn cộng sáng.
- Khi có profile, sprite sở hữu cue sự kiện và World không vẽ thêm vòng generic lên cùng cue. Đạn tướng/trụ chuyên biệt giữ pipeline riêng. Không tạo sát thương hay delay để khớp hình ảnh.
- Sprite neo theo tọa độ đội hình, thân và tỷ lệ model. Sự kiện có target/source anchor giãn nhịp theo unit ID; thiếu anchor dùng phe/lane/vị trí làm fallback. Nguồn trong event lịch sử không có source ID vẫn là xấp xỉ theo dữ liệu hiện có.
- Mặc định tối đa ba atlas sự kiện không phải đạn trong bán kính 1,5 cùng lane. Vượt ngân sách bỏ phần hình ảnh đó; lane/vị trí khác vẫn được hiển thị. Pool tổng giữ tối đa 48 sprite; bộ nhớ nhịp sự kiện giới hạn 512 key. Đây không phải giới hạn cho mọi VFX: lửa vùng, trạng thái, đạn chuyên biệt và cảnh báo công trình có pipeline/ngân sách riêng.
- Vệt chém lấy chiều cao/bán kính hiển thị của tướng, đối xứng theo phe và đọc `attackAt`; tối đa 16 vệt, tia trúng đòn tối đa 128. Giảm chuyển động bỏ vệt/tia mới nhưng vẫn ghi nhịp để không phát lại khi bật chuyển động. Atlas giảm chuyển động giữ khung/scale/rotation cố định và chỉ mờ dần. Pause dừng tuổi thọ; reset/dispose dọn pool.

## QA và giới hạn thực tế

- `npm run check`: kiến trúc, TypeScript server/client, 317 tests và production build. Golden fixtures giữ nguyên. Tám test renderer mới bao phủ style/neo model, giới hạn vùng và tổng, nhịp theo mục tiêu, pause/reduced motion, legacy fallback, tái sử dụng vật liệu, căn vệt theo phe/model và khống chế. Sáu test cấu hình kiểm tra validator/admin, backup/draft/asset/player/history, idempotence và rollback.
- `npm run smoke` và `git diff --check` được chạy trước tích hợp.
- Chrome ở DOM 844×390: gọi Solan/Lyra/Brann bằng chạm, quan sát giao tranh đông, dùng Lửa, zoom và pause/resume, reduced motion, không cuộn trang, không có lỗi console trong lượt kiểm tra. Bản QA tự chuyển sang chất lượng tiết kiệm; không diễn giải đây là benchmark FPS thiết bị thật.
- Admin QA đổi số atlas mỗi vùng từ 3 lên 4, lưu/phát hành và kiểm tra revision/dữ liệu sau tải lại. Fixture riêng dùng mana 30, HP tướng 5.000, đòn thường 1, cooldown kỹ năng 900s để quan sát lâu hơn. Các thông số fixture và thử nghiệm admin không được triển khai lên main.
- Ảnh QA của vùng Lửa có thể chụp ở pha cảnh báo trước khi vùng hoạt động; thay đổi này không điều chỉnh cường độ atlas lửa tồn tại theo vùng và không khẳng định đã giới hạn mọi lớp sáng trong trận.
