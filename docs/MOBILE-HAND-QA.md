# HUD mobile và phản hồi thẻ — 15/10/2026

Issue #26 theo yêu cầu giảm chữ, ưu tiên không gian chiến trường và vuốt/chạm. Giữ deck, tay, vòng rút, mana, cooldown và mọi luật combat hiện hành. “Chờ thẻ” là phản hồi mana/cooldown đang có; không thêm thời gian chờ rút bài.

## Trình bày và input

- Battle HUD dùng hình thẻ, số mana, HP hiện tại và biểu tượng. Tên thẻ chỉ hiện khi chọn; aria-label vẫn giữ tên/kỹ năng/chi phí và HP tối đa. Bỏ nhãn phụ, chữ trang trí ở sảnh và câu dư ở pause/result trên mobile.
- Hand nằm giữa hai vùng ngón cái, giữ chỗ cho chat ở trái, cộng hưởng/hủy chọn ở phải. Nút hủy chỉ hiện khi có lựa chọn. Vùng chạm chính ít nhất 44px, safe area được giữ; camera dùng pinch và một nút về toàn sân. Không có cuộn document hoặc ba nút lane chữ nổi trên sân mobile. Tay lớn do admin cấu hình vẫn dùng hai hàng.
- `ui/hand-feedback.ts` giữ node theo UID. Chỉ thẻ thay thế bay từ chồng rút vào ô vừa dùng trong 340ms; các node còn lại giữ listener/focus. Hand đầu trận và snapshot PvP đầu tiên không phát âm/animation rút giả. Pool tối đa 16 animation, có pause/reset/dispose và reduced motion.
- Chạm thẻ thiếu tài nguyên làm sáng số mana và hiện tiến độ ngay trên thẻ, không bật một đoạn toast che sân. Mana/cooldown đều lấy snapshot. Khi trở nên dùng được, flash và báo sẵn sàng một lần; không tự chọn/dùng thẻ, không lặp âm chờ.

## Âm thanh và database

`audio.cues.card-draw`, `card-wait`, `card-ready` là binding tùy chọn trong Content Studio → Âm thanh. Admin thay file, âm lượng, tốc độ và giãn cách phát. Không đổi schema/giá trị lịch sử để ép thêm cue vào trận cũ. Mỗi trận dùng audio snapshot của chính nó.

Ba WAV gốc được tổng hợp bằng `tools/generate-card-audio.ts`, không chứa sample ngoài. Mono PCM 16-bit/22,05 kHz, dài 120–300ms, tổng 31.002 byte. Manifest/checksum/provenance ở `assets/design/audio/`. Sound service dùng bus UI, master gain, voice cap và cooldown; tắt tiếng hoặc UI gain bằng 0 không tạo nguồn âm. Có fallback synth khi offline/tải asset chưa xong. Pause dừng voice đang phát.

`tools/apply-card-audio.ts` mặc định dry run, `--apply` backup SQLite rồi bổ sung binding còn thiếu. Giữ lựa chọn admin, phần draft không liên quan và revision/snapshot lịch sử; chạy lại không tạo revision/asset mới. Không đổi gameplay hay dữ liệu người chơi.

## QA local

- `npm run check`: kiến trúc, server/client typecheck, **236/236 tests**, production build đạt. Fixture legacy giữ nguyên.
- `npm run smoke`: production bundle/API/module config/auth trên database tạm đạt.
- Edge ở 844×390 và 667×375: hand sáu thẻ, nút hủy có điều kiện, chat/pulse/reset camera, vùng chạm và kích thước document bằng viewport. Không có cuộn trang.
- Touch thực qua capability CDP của công cụ trình duyệt: chạm để triển khai Raiko và kéo thả Aurelia vào lane dưới. UID ô 1 đổi từ 1 sang 7; ô 3 từ 3 sang 8; các UID khác giữ nguyên. Kiểm tra thẻ chờ Kael ở tiến độ 89,375%, sau khi đủ mana trạng thái chờ biến mất.
- Content Studio trên database QA riêng: cả ba cue có editor và asset ID đã lưu. Kiểm thử WAV/checksum, UI gain/mute/cooldown/voice cap; installer giữ draft/history/admin choice và idempotent. Không có lỗi/warning console ở trang game/admin QA cuối. Không khẳng định đã đánh giá loa điện thoại thật.
- Ảnh nghiệm thu lưu local `.data/qa-mobile/`, không commit database, log hoặc build output. CI/CD vẫn tắt; Codex QA và merge thủ công.
