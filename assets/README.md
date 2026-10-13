# Asset Kora War

Asset đang sử dụng là nguyên bản, tạo cục bộ từ mã nguồn. Không đưa ảnh tham khảo Castle Crush vào bundle game.

| Asset | Source / factory | Instance / vòng đời |
|---|---|---|
| 10 hero prefab | `src/rendering/hero-model.ts`, catalog `src/data/heroes.ts` | Registry `hero-prefabs.ts`; geometry/material dùng chung |
| Địa hình, cây, cầu, căn cứ | `src/rendering/environment.ts` | Batch static theo material, dispose cùng World |
| Portrait thẻ | World render prefab sang WebP data URL 256px | Tạo một lần lúc boot, dùng lại trong deck/roster |
| Sprite atlas 8 frame | `src/rendering/vfx/sprite-effects.ts` | Canvas2D 1024×128; texture dùng chung, pool 48 sprite |
| Icons UI | `src/ui/icons.ts` | SVG nội tuyến |
| Âm thanh | `src/services/audio.ts` | Web Audio oscillator, không có file thu âm bên ngoài |

Hiện chưa có asset GLB hoặc sprite do họa sĩ dựng. Khi thay bằng file, đặt source có thể chỉnh sửa và bản tối ưu riêng; khai báo license, nguồn, tác giả, định dạng và ID trong registry. Không dùng URL runtime trực tiếp cho asset lõi nếu chưa có chiến lược cache/offline.
