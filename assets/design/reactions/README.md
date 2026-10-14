# Bộ 8 biểu tượng cảm xúc gốc Kora War (Reactions Art)

Tài sản thiết kế cho tính năng phản hồi nhanh (Quick Chat) trong Kora War, thực hiện bởi **Gemini Design Agent** theo [Issue #3](https://github.com/huyplay/Kora-War/issues/3).

## 1. Thông tin tổng quan và Hợp đồng tích hợp

- **Hợp đồng dữ liệu**: `communication.reactions[].imageAssetId` (trong `src/data/communication.ts`).
- **Phạm vi tác quyền**: Tác phẩm nghệ thuật vector nguyên bản cho thế giới Aetherfall / Elyndra. Không sử dụng hình ảnh từ bên ngoài, không vi phạm bản quyền Castle Crush hoặc Riot.
- **Giấy phép**: Proprietary - Kora War Project. Tác giả: Gemini Design Agent (huyplay).
- **Quy chuẩn kỹ thuật**:
  - Kích thước chuẩn: **256x256 px**.
  - Định dạng: **WebP** (nén lossless cao cấp) và **PNG** (alpha transparency).
  - Ngưỡng dung lượng tối đa cho mobile: **≤ 100 KB/hình**. WebP thực tế **20,5–55,3 KiB**; xem byte/checksum chính xác trong manifest và bảng bên dưới.
  - Không chứa văn bản/chữ trong hình (No in-image text).
  - Độ tương phản cao với viền bóng đổ, đọc rõ ràng ở cả **40px** và **64px** trên nền bong bóng tối (`#002B49`) và bong bóng sáng (`#ECEFF1`).

## 2. Bảng kê 8 biểu tượng và Ngân sách kích thước

| ID | Nhãn | Mô tả Elyndra / Lore | PNG (bytes) | WebP (bytes) | WebP SHA-256 |
|---|---|---|---|---|---|
| `happy` | Vui vẻ | Chiến binh Elyndra mỉm cười rạng rỡ với đôi mắt Aether phát sáng và vương trâm hoàng kim | 36182 | 23796 | `0706379a6d02...` |
| `cheer` | Cổ vũ | Vương miện Aether chiến thắng cùng pháo hoa tinh thể sao và nụ cười ăn mừng rực rỡ | 35560 | 26148 | `e37be91e1b0f...` |
| `wow` | Bất ngờ | Mắt mở to kinh ngạc lấp lánh ánh sáng ma thuật và vòng phù văn rune Aether xoay quanh | 74554 | 56652 | `e9731ae083d1...` |
| `cry` | Buồn quá | Biểu cảm khóc dở khóc dở cười với thác nước mắt tinh thể ma thuật Aether tuôn trào | 37371 | 26646 | `519389dee6be...` |
| `laugh` | Cười | Nụ cười sảng khoái hả hê với đôi mắt cong vút và hai giọt nước mắt cười lấp lánh | 31321 | 20968 | `a89786134090...` |
| `respect` | Tán thưởng | Đôi găng tay giáp hiệp sĩ Elyndra nạm ngọc Aether chạm nhau tán thưởng tinh thần thượng võ | 39836 | 26906 | `5c3a18684f8e...` |
| `fire` | Bùng cháy | Ngọn lửa ma thuật Elyndra 3 lớp với lõi Aether xanh lam và tinh thần chiến đấu rực lửa | 30567 | 22568 | `56c0d88f718c...` |
| `heart` | Yêu thích | Trái tim tinh thể Aether lam ngọc giác cắt 3D lấp lánh hào quang ma thuật Elyndra | 46792 | 31750 | `57476873396e...` |

## 3. Cấu trúc thư mục bàn giao

```
assets/design/reactions/
├── manifest.json              # Khai báo ID, kích thước, dung lượng, sha256 checksum
├── README.md                  # Báo cáo kỹ thuật và checklist nghiệm thu
├── contact-sheet.png          # Contact sheet toàn bộ 8 emoji trên nền sáng & tối
├── contact-sheet.html         # HTML sinh contact sheet
├── preview.html               # Trang xem thử trực quan tương tác
├── preview-desktop.png        # Bằng chứng nghiệm thu desktop (1536x720)
├── preview-mobile-844x390.png # Bằng chứng nghiệm thu mobile landscape (844x390)
├── build-reactions.mjs        # Script tạo lập và kiểm thử có thể tái lập
├── svg/                       # 8 file nguồn vector SVG
│   ├── happy.svg
│   ├── cheer.svg
│   ├── wow.svg
│   ├── cry.svg
│   ├── laugh.svg
│   ├── respect.svg
│   ├── fire.svg
│   └── heart.svg
├── png/                       # 8 file PNG 256x256 trong suốt
└── webp/                      # 8 file WebP 256x256 trong suốt siêu nhẹ

public/design/reactions/       # Bản demo tĩnh cho frontend / Pages
├── index.html                 # Trang demo tương tác
├── *.png
└── *.webp
```

## 4. Hướng dẫn tích hợp cho Senior Codex

1. Codex kiểm tra PR từ nhánh `gemini/3-reaction-art`.
2. Kiểm tra `npm run check` đạt 100%.
3. Tích hợp các file WebP/PNG từ `assets/design/reactions/` vào kho asset SQLite bằng script upload hoặc giao diện Admin (`admin.html`).
4. Gán `imageAssetId` tương ứng với từng reaction id trong cấu hình `communication.reactions` (ví dụ: `imageAssetId: 'kora-reaction-happy'`).
5. Frontend `QuickChat` component (`src/ui/quick-chat.ts`) sẽ tự động hiển thị thẻ `<img src="/api/assets/...">` thay cho emoji mặc định.
