# Asset Kora War

Game dùng model/animation Khada và sprite CommunityDragon theo xác nhận giấy phép của chủ dự án, kết hợp địa hình/VFX nguyên bản từ mã nguồn. Không đưa ảnh tham khảo Castle Crush vào bundle game.

| Asset | Source / factory | Instance / vòng đời |
|---|---|---|
| 10 nhân vật LoL | [manifest](riot/manifest.json), [báo cáo import và checksum](riot/import-report.json) | GLTFLoader + SkeletonUtils.clone, AnimationMixer riêng mỗi instance |
| Trụ, lõi, inhibitor | Khada Extras, nguồn/checksum trong báo cáo | Binding map trên database; renderer theo dõi HP từ core |
| Aether star | CommunityDragon `3026_items_star.png` | Sprite pool 48, texture có cache HTTP |
| 10 hero prefab | `src/rendering/hero-model.ts`, catalog `src/data/heroes.ts` | Registry `hero-prefabs.ts`; geometry/material dùng chung |
| Địa hình, cây, cầu, căn cứ | `src/rendering/environment.ts` | Batch static theo material, dispose cùng World |
| Portrait thẻ | World render prefab sang WebP data URL 256px | Tạo một lần lúc boot, dùng lại trong deck/roster |
| Sprite atlas 8 frame | `src/rendering/vfx/sprite-effects.ts` | Canvas2D 1024×128; texture dùng chung, pool 48 sprite |
| Icons UI | `src/ui/icons.ts` | SVG nội tuyến |
| Âm thanh | `src/services/audio.ts` | Web Audio oscillator, không có file thu âm bên ngoài |

Chạy `npm run assets:import` sau khi khởi tạo backend để tải nguồn, tạo bản mobile, upload vào SQLite asset catalog và phát hành binding. Chỉ chạy khi dự án có quyền sử dụng các asset này. File gốc và bản runtime ở `.data/`, không đưa database hoặc file nhị phân Riot vào Git; repo lưu manifest/checksum và pipeline tái lập. Runtime phục vụ file qua `/api/assets/:id` từ chính server game, không hotlink CDN.

`tools/compact-glb.ts` giữ clip được ánh xạ, đóng gói lại accessor và bỏ keyframe không dùng; giữ giá trị vertex, skin, texture và keyframe của clip còn lại. Không retarget skeleton, giảm polygon hay thay đổi nội dung mesh. Bản đầy đủ vẫn được giữ trong cache nguồn để upload/mở rộng animation sau. 10 model được giảm từ khoảng 57,5 MiB xuống 15,8 MiB; đây là kích thước file, không phải benchmark FPS.

`model-library.ts` dùng wrapper để normalization không bị animation ghi đè; chuyển clip idle/walk/attack/cast/stunned/spawn/death. Model thủ tục là fallback khi file bị lỗi. Map trụ/lõi có palette hai phe; map prop dùng `scale` làm chiều cao chuẩn hóa tính bằng mét. Sprite hỗ trợ 1–8 cột/hàng, một ảnh tĩnh dùng 1×1. Animation GLB riêng phải dùng cùng skeleton/node names, chưa có chuyển rig tự động.

Thông tin quyền do người dùng cung cấp được lưu cùng asset; không coi URL tải được là giấy phép. [Khada](https://modelviewer.lol/), [CommunityDragon](https://raw.communitydragon.org/latest/). Decoder Basis Universal được vendored từ Three.js 0.180.0, giấy phép Apache 2.0 trong `public/decoders/basis/`.
