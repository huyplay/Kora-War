# Cảnh báo trụ và thành — 15/10/2026

Issue #33. Cảnh báo trình bày, không thay gameplay hoặc lượng HP công trình.

## Phản hồi

- `ui/defense-state.ts` quan sát chênh lệch HP của trụ/lõi phe mình từ snapshot, dùng cho cả AI và PvP. Không lấy projectile/attack làm bằng chứng trúng đòn. Snapshot đầu, nối lại, tua ngược và đổi trận tạo baseline yên lặng; dữ liệu combat không bị ghi lại.
- Trụ bị đánh hiện tên lane và âm riêng; trụ HP về 0 chuyển sang thông báo thất thủ. Nhiều lane dùng chung nhịp âm để tránh dồn cảnh báo. Thành mất HP luôn ưu tiên hơn trụ.
- Thành hiện “Thành đang chịu sát thương!”, viền HP lõi sáng đỏ và hai gradient đỏ ở mép trái/phải. Nhịp opacity 1,2 giây, không tô đỏ phần giữa sân; hiệu ứng/thông báo hết sau 2,4 giây không nhận thêm sát thương. Đánh liên tục giữ hiệu ứng nhưng không phát lại âm từng đòn.
- Overlay `pointer-events: none`, chữ ngắn, có live region; tạm ẩn toast thông thường để không chồng thông báo. Pause ẩn cảnh báo và không phát lại âm cũ khi resume. Kết thúc/đổi trận/chuyển tab dọn trạng thái. Reduced motion dùng mép đỏ tĩnh.

## Âm thanh và database

Hai cue `audio.cues.tower-warning` / `core-warning` là binding tùy chọn, không đổi schema hoặc bắt buộc backfill content cũ. Content Studio → Âm thanh cho chỉnh file, volume, rate và `cooldownMs`; khoảng lặp được đọc từ audio snapshot của trận (seed mới: trụ 4.000ms, thành 2.800ms). Mute/master/UI gain được giữ. Cảnh báo có quyền thay một voice đang phát khi mixer đầy, vẫn trong giới hạn số voice; cảnh báo đang tắt âm không ngắt voice khác.

Hai WAV nguyên bản được tổng hợp bằng `tools/generate-defense-audio.ts`: mono PCM 16-bit, 22,05 kHz, 580/740ms, tổng 58.300 byte. Không dùng sample bên ngoài. Manifest/provenance/SHA-256 ở `assets/design/audio/defense/`; kiểm tra RMS, headroom và đuôi âm không bị click. Có synth fallback khi file chưa tải hoặc snapshot cũ thiếu binding.

`tools/apply-defense-audio.ts` mặc định dry run; `--apply` backup SQLite rồi bổ sung cue còn thiếu. Giữ file/tốc độ/âm lượng/nhịp admin đã chọn, nháp không liên quan, người chơi, kết quả và toàn bộ revision cũ. Chạy lại không tạo asset/revision mới.

## QA

- Kiểm tra có chủ đích: own/enemy HP, baseline/reconnect/rewind, ưu tiên thành, cooldown admin, pause/hidden/end, không đổi simulation, bounded priority audio/mute, dữ liệu WAV và installer giữ lịch sử/admin choice/idempotence. Admin editor có đủ hai cue và các trường điều chỉnh.
- `npm run check`: architecture, server/client typecheck, **245/245 test** và production build đạt. `npm run smoke` đạt. Không sửa golden fixture.
- Edge mobile 844×390 và 667×375: AI đánh trụ làm hiện đúng thông báo lane; quan sát thành giảm còn 1.390 HP, mép đỏ và thông báo thành bật, pause ẩn overlay và bỏ viền đỏ. Dùng tốc độ debug 2×/4× để đi nhanh tới công thành; đây không phải benchmark điện thoại.
- Browser xác nhận `fortress-warning` 1,2s khi `no-preference`; khi `reduce`, animation `none` và opacity 0,42. Overlay không bắt chạm, document bằng viewport. Không khẳng định đã nghe trên loa điện thoại thật; mixer/scheduling và PCM được kiểm bằng test.
- QA dùng database/server riêng, ảnh local `.data/qa-defense/`. Không commit database, log hoặc build. CI/CD tiếp tục tắt.
