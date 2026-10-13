# Lịch sử phiên bản và baseline

| Mốc | Phát hiện | Trạng thái |
|---|---|---|
| 2016-11-09 | iOS releaseDate | Confirmed, [Apple Lookup API](https://itunes.apple.com/lookup?id=1060704812&country=us) |
| Đầu 2022 | Whitepaper ghi 68 thẻ; kế hoạch blockchain/PC | Confirmed nội dung lịch sử, không phải thực trạng 2026 |
| 2022-06-03, 5.0.0 | Art reskin | Confirmed changelog iOS |
| 2022-08-15, 6.0.0 | Store ghi cải tiến/sửa lỗi; không tự gán ngày ra NFT cho phiên bản | Confirmed changelog |
| 2022-11-29, 6.3.0 | Sửa lỗi/cải tiến | Confirmed changelog |
| 2023-12-28, 6.3.5 | Sửa lỗi/cải tiến | Confirmed changelog |
| 2025-09-09, 6.3.12 | Sửa lỗi/cải tiến | Confirmed changelog |
| 2025-10-14, 6.4.0 | Thông báo quan trọng, không nêu chi tiết | Nội dung thay đổi Unknown |
| 2026-01 đến 08 | 6.5.x → 6.6.x → 6.7.0 → 6.8.0 | Store chủ yếu ghi tối ưu/sửa lỗi |

Nguồn changelog: [App Store US](https://apps.apple.com/us/app/castle-crush-clash-cards-game/id1060704812). Android và iOS không được mặc định cùng version hoặc cùng thời điểm rollout.

Baseline định nghĩa:

- `CC-public-2026-10-13`: tổng hợp chứng cứ công khai tại ngày khảo sát, gồm tài liệu cũ; **không** phải bản binary đã test.
- `CC-ios-US-6.8.0`: ứng viên baseline live; cần ghi OS, locale, account level, mode, card level, Forge/NFT và quay màn hình.
- `WEB-lab-v0`: luật thử nghiệm do đội thiết kế, phải có nhãn riêng; không gọi là parity baseline.

Tính năng bị xóa: chưa có bằng chứng đủ mạnh để kết luận tính năng cụ thể đã bị xóa. Nội dung NFT/Founder, Forge, Championship vẫn có trên support; tồn tại trong live build là Unknown. Bảng cards trên wiki cũ không thể đại diện toàn bộ roster hiện tại.

Xung đột cần giữ lại: whitepaper mô tả giải đấu có thưởng theo số thắng và hoàn gems; support mô tả chỉ thưởng sau đủ 10 vòng và ưu đãi hoàn gems lần đầu. Dùng nhãn lịch sử cho whitepaper, cần live test trước đặc tả production. [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) tr.11; [Championship](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684749806609-Championship).


## Tín hiệu cộng đồng cần đối chiếu

Tháng 01/2026 có báo cáo Ascended biến mất và bình luận cho rằng NFT/ACS bị ngừng. Đây là **Unverified**, chưa tìm được thông báo gốc đủ xác nhận phạm vi/ngày hiệu lực; không suy từ lỗi tài khoản thành việc xóa toàn bộ tính năng. [Invalid Card error](https://www.reddit.com/r/Castlecrush/comments/1ql912e/invalid_card_error/). U09 phải đối chiếu announcement trong game, support và live collection; không tự gán thông báo 6.4.0 cho sự kiện này.
