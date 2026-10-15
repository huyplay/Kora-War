# Xác nhận hủy hàng chờ khi mạng lỗi

Issue #39, 15/10/2026. Không đổi luật combat, Elo, quá hạn hàng chờ hoặc database content.

Trước đây `leave()` xóa packet/mã phòng cả khi POST bị lỗi mạng; UI về sảnh dù server có thể còn giữ hàng chờ. Nay request lỗi tạm thời được thử lại một lần với cùng mã phòng. Chỉ xóa phiên khi server xác nhận thành công hoặc báo phòng đã mất/xác thực hết hạn. Nếu vẫn chưa xác nhận được, giữ packet/token, trả lỗi ngắn cho caller, mở lại nút hủy và tiếp tục polling. Không tự surrender từ polling. Dispose abort cả request rời phòng; phản hồi cũ không xóa phiên mới.

Màn chờ dùng status sẵn có để báo `Đang nối lại…`, kể cả khi mở lại lúc đang mất kết nối. Không thêm layout/cuộn trang hoặc tham số gameplay vào UI.

QA Windows local: `npm run check` đạt 266/266 test, kiến trúc, typecheck server/client và production build; `npm run smoke` đạt. Regression kiểm retry cùng token, không retry auth/expired error, thất bại giữ token và cho retry, polling sau thất bại, mất response sau server đã hủy, dispose abort và phản hồi cũ. Ba regression có chủ đích tái hiện lỗi trên implementation trước bản sửa.

Edge viewport 844×390, production bundle và server/database QA riêng:

- Chặn API state và leave bằng 503: màn chờ hiện nối lại; chạm hủy gửi đúng hai request, giữ màn chờ, nút 180×44px được mở lại, hiện `Chưa rời được phòng. Thử lại.`. Khung trang đo được 844×390, không overflow. Khi gỡ lỗi, phòng đã quá hạn reconnect được giải phóng theo phản hồi server.
- Chặn riêng leave, vẫn cho polling chạy: hủy thất bại hai lần vẫn giữ hàng chờ; polling phục hồi và đồng hồ tiếp tục. Sau đó chạm hủy lại trong lúc proxy làm mất response đầu sau khi server đã xử lý: đúng hai request cho lần hủy đó, UI trở về sảnh không báo lỗi giả. Reload vẫn ở sảnh, không khôi phục hàng chờ đã hủy; console của trang sau reload không ghi lỗi.
- Ảnh QA local: `.data/qa-cancellation/retry-cancel-844.png`, `.data/qa-cancellation/canceled-lobby-844.png`. Fault proxy chỉ nằm trong `.data` của worktree QA, không được đưa vào production. QA tắt fallback và nâng timeout lên 600s ở database riêng để giữ hàng chờ cho kiểm cancellation; cấu hình live 60s giữ nguyên. Viewport desktop không thay thế kiểm cảm ứng trên điện thoại thật.
