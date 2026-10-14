# Nâng cấp HUD và Bảng Chat Nhanh trên Mobile (Gemini Task #5)

Tài liệu hoàn thiện giao diện HUD chiến đấu và bảng phản hồi nhanh (Quick Chat) theo chuẩn Castle Crush & nhận diện Kora War, thực hiện bởi **Gemini Design Agent** theo [Issue #5](https://github.com/huyplay/Kora-War/issues/5).

## 1. Các Nâng Cấp Chính Trong `src/ui/styles/gemini-hud.css`

1. **Tuân thủ Chuẩn Vùng Bấm Cảm Ứng Di Động (Touch Targets ≥ 40px)**:
   - Các nút câu thoại (`.quick-phrases button`): Tăng từ 39px lên **44px min-height**.
   - Các nút emoji (`.quick-emojis button`): Đạt **44px × 44px**.
   - Nút đóng (`.quick-chat-close`): Tăng từ 34px lên **42px × 42px**.
   - Nút bật chat (`.quick-chat-toggle`): Đạt **52px × 48px**.
   - Checkbox tắt chat đối thủ (`.quick-chat-mute`): Vùng bấm rộng tối thiểu **40px**.
2. **Không Che Khuất Tay Bài (Non-Interference)**:
   - Khi bảng đóng, không chặn thao tác kéo thả 6 lá bài trên tay.
   - Nút toggle ••• đặt né sang góc trái ngoài vùng bài.
3. **Phạm Vi CSS Độc Quyền (Scope Isolation)**:
   - Toàn bộ selector được bọc nghiêm ngặt trong `.quick-chat` và `.in-battle`, bảo đảm không ảnh hưởng tới Home, Admin hay Roster.
4. **Khả Năng Tiếp Cận (Accessibility)**:
   - Hỗ trợ `:focus-visible` với đường viền Aether Cyan sắc nét cho người dùng bàn phím.
   - Hỗ trợ `@media (prefers-reduced-motion: reduce)` tắt animation giật, chuyển sang chuyển cảnh mượt.

## 2. Hướng dẫn Tích hợp cho Senior Codex
- Codex kiểm tra PR từ nhánh `gemini/5-hud-polish`.
- Import file `src/ui/styles/gemini-hud.css` vào `src/ui/quick-chat.ts` hoặc `src/app/bootstrap.ts`.
- Chạy `npm run check` để hoàn tất nghiệm thu.
