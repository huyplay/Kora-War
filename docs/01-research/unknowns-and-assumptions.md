# Unknowns, mâu thuẫn và phương pháp đóng gap

`Confirmed` = đúng trong phạm vi nguồn đã đọc; `Strongly Inferred` = nhiều dấu hiệu nhưng chưa đo; `Unverified` = có lời khẳng định chưa kiểm chứng/nguồn mâu thuẫn; `Unknown` = chưa có dữ liệu. `Proposed` là thiết kế web mới, không phải cấp tin cậy về game gốc.

Không suy rằng bài support mới được crawl là luật mới. `updated_at` API có thể phản ánh sửa metadata: Unlocking castles API 2026 nhưng bản web đã đọc hiển thị 2023; giữ cả provenance, chưa kết luận thay luật.

| ID | Ưu tiên | Unknown | Vì sao | Thí nghiệm đóng gap |
|---|---|---|---|---|
| U01 | P0 | Live baseline / Android version | Listing không chứng minh server hoạt động | Cài bản store hợp pháp; ghi version, OS, locale; đăng nhập và hoàn tất 3 PvP |
| U02 | P0 | Rút bài, double và crystals | WP 7–10s/7s; support 5 draws vs WP45s | Quay 60fps 10 trận; tay full/empty, draw trả phí, Extra Crystal ở12; ghi mana/cursor |
| U03 | P0 | Vùng đặt quân | Chỉ wiki nói frontier | Grid thử 20 vị trí/lane, trước/sau quân chết, pushback và qua giữa sân |
| U04 | P0 | Roster và stats mọi level | 68 lịch sử; catalog wiki thiếu, có mâu thuẫn | Chụp toàn collection/build và detail mọi thẻ; đọc stat base/Forge/NFT; kiểm tra alias |
| U05 | P0 | Target, collision và hit timing | Không biết tie/retarget/cooldown | Friendly battle scripted: hai mục tiêu ngang range, unit vượt nhau, target chết giữa projectile |
| U06 | P0 | Overtime và cùng chết | Có 4 phút; chưa có damage curve/tie-break | 10 trận overtime, hai HP bằng nhau; log tick damage và kết quả frame-by-frame |
| U07 | P1 | Upgrade/XP/trophy/loot/reset | Không đủ bảng chi phí, rounding, odds | Ghi nhiều delta và từng level; không suy Elo hay drop rate từ vài chest |
| U08 | P1 | Mode và social đang hoạt động | Support chủ yếu 2023 | Kiểm tra nhiều mức account, full event cycle/season và locale |
| U09 | P1 | NFT/Founder hiện hành | Tài liệu hiện diện không chứng minh marketplace hoạt động | Quan sát read-only UI/announcement; không giao dịch để nghiên cứu |
| U10 | P0 | Camera/animation hiện hành | Chưa xem video có build | Thu capture 3 arena, 10 abilities, giấy phép chỉ tham chiếu |
| U11 | P0 | Disconnect/reconnect/surrender | Không có đặc tả công khai đủ | Ngắt 5/15/30/60s trên hai client do mình kiểm soát |
| U12 | P0 | Engine performance | Chưa benchmark | Chạy fixture giống nhau Babylon/Three/Phaser trên thiết bị thật |
| U13 | P1 | AI nội bộ | Không công khai | Đề xuất utility bot; so phân phối hành động, không tuyên bố cùng thuật toán |
| U14 | P1 | License assets/repo | Thiếu license hoặc asset terms khác code | Kiểm tra từng file/bundle, xin quyền nếu cần; không copy khi chưa rõ |

## Mâu thuẫn không được tự giải bằng suy đoán

- Mana wiki nói 8s và Extra Crystal thêm HP; support nói đạt 12 thì rút lá. Chỉ hành vi support có thể đưa vào profile documented, HP phụ vẫn Unknown.
- Bomb wiki phần văn bản cost 2, bảng cost 1; Dark Angel phần văn bản 7, bảng 6. Cả hai cost canonical `null`.
- Ice Elemental damage giảm đột ngột ở level 7; Archer's Tribe ghi Melee trái mô tả ranged. Giữ raw candidate riêng, không nhập runtime.
- Whitepaper Forge nói tăng level vĩnh viễn; support giải thích mở level cap rồi còn phải nâng bằng cards/gold. Đặc tả ưu tiên sự tách biệt cap và level.
- Whitepaper nói không hòa. Không biến simultaneous lethal thành hòa trong parity profile; phải tìm tie-break hoặc chặn gate parity.

Mỗi phép đo lưu: build, mode, 2 deck, level, skin/tier, Forge, castle HP, thời gian capture, URL/file hợp pháp, timestamp start/end, sai số frame, số lần lặp, reviewer. Dữ liệu chưa đủ không dùng để mở `verified-parity`.


NFT/ACS có báo cáo cộng đồng tháng 01/2026 về mất thẻ/ngừng dịch vụ, trong khi trang hỗ trợ vẫn còn. [Invalid Card error](https://www.reddit.com/r/Castlecrush/comments/1ql912e/invalid_card_error/). Trạng thái hiện tại vẫn **Unknown**, tài liệu Ascension chỉ chứng minh từng được mô tả.
