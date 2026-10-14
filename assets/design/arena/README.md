# Đề xuất Hướng đi Nghệ thuật & Vật liệu Chiến trường (Arena Art Direction)

Tài liệu thiết kế và hồ sơ vật liệu PBR nâng cấp giao diện chiến trường 3-lane Kora War, thực hiện bởi **Gemini Design Agent** theo [Issue #4](https://github.com/huyplay/Kora-War/issues/4).

## 1. Mục tiêu và Nguyên tắc Thiết kế
- **Giữ nguyên ranh giới gameplay & mô phỏng**: Không thay đổi logic combat, không chỉnh sửa vị trí tọa độ các lane (`LANES = [-3.8, 0, 3.8]`), không can thiệp tầm đánh hoặc tốc độ di chuyển.
- **Tối ưu khả năng đọc trận đấu (Combat Readability)**:
  - Tướng hai phe phân biệt rõ rệt qua màu sắc đặc trưng (Phe Ta: Xanh lam ngọc `#1E88E5`; Phe Địch: Đỏ thẫm `#D32F2F`) cùng viền sáng tương phản.
  - Thanh máu (HP bar) và giáp (shield) thiết kế viền đen tương phản, luôn nổi bật trên nền đá lát sàn, không bị chìm ở cả 2 chế độ **Zoom 1.0x (toàn cảnh)** và **Zoom 1.85x (cận cảnh)**.
  - Hỗ trợ rõ ràng mật độ dày đặc lên tới **18 quân/lane**.
- **Không chặn thao tác**: Vùng thả quân (Spawn / Placement zones) hoàn toàn thông thoáng, không đặt bất kỳ vật thể cảnh quan (props) nào gây vướng thao tác kéo thả thẻ bài.
- **Chất liệu Aetherfall / Elyndra**:
  - Đá lát sàn (Cobblestone): Tông xám nâu ấm cổ kính, độ nhám (Roughness) cao từ 0.75 - 0.9 để triệt tiêu hiện tượng phản chiếu chói lóa từ nguồn sáng mặt trời.
  - Tường thành lâu đài: Đá hoa cương xám đậm viền kim loại đồng cổ (Ancient Bronze `#9C734A`).
  - Cờ hiệu hai phe (Banners): Treo tại hai bên căn cứ chính, phân định rõ ranh giới lãnh thổ.

## 2. Ngân sách Kỹ thuật (Budget Compliance)

| Tiêu chí | Giới hạn theo docs/ADMIN.md | Thực tế bàn giao | Đánh giá |
|---|---|---|---|
| Dung lượng Texture Pack | ≤ 4.0 MB | **~132 KB** (WebP) | Đạt (nhỏ hơn 30 lần) |
| Kích thước ảnh Texture | ≤ 1024×1024 px | **512×512 px** | Đạt chuẩn mobile |
| Số lượng Triangles Static Mesh | ≤ 25,000 tris | **~6,000 tris** | Cực kỳ tối ưu |
| Static Draw Calls (Batches) | Tối thiểu hóa | **4 merged batches** | Đạt |
| VRAM Footprint | ≤ 15 MB | **~2.8 MB** | Tối ưu cho thiết bị cấu hình thấp |

## 3. Danh mục Tệp bàn giao

```
assets/design/arena/
├── manifest.json                  # Khai báo checksum SHA-256, dung lượng, triangle budget
├── README.md                      # Báo cáo kỹ thuật và hướng dẫn nghiệm thu
├── preview.html                   # Ứng dụng xem thử 3D tương tác (Zoom 1x & 1.85x)
├── preview-desktop-1536x720.png   # Ảnh chụp nghiệm thu desktop 1536×720
├── preview-mobile-844x390.png     # Ảnh chụp nghiệm thu mobile landscape 844×390
├── build-arena.mjs                # Script tạo lập và kiểm thử tái lập
└── textures/                      # Bộ Texture PBR hoàn chỉnh (WebP, PNG, SVG)
    ├── arena-stone-diffuse.*
    ├── arena-stone-normal.*
    ├── arena-stone-roughness.*
    ├── arena-wall-diffuse.*
    ├── arena-banner-blue.*
    └── arena-banner-red.*

public/design/arena/               # Bản demo tĩnh phục vụ duyệt trực tiếp qua trình duyệt
├── index.html
└── *.webp / *.png
```

## 4. Hướng dẫn Tích hợp cho Senior Codex
1. Codex review PR từ nhánh `gemini/4-arena-art`.
2. Kiểm tra `npm run check` đạt 100%.
3. Tích hợp texture từ `assets/design/arena/textures/` vào Admin CMS / Asset Store.
4. Áp dụng vật liệu vào `src/rendering/environment.ts` hoặc gán qua map binding của hệ thống.
