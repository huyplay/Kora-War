# Các module engine của Kora War

Kora War dùng Three.js + TypeScript + Vite. Các module sau đang được gọi trong game, không phải thư mục mô phỏng Unity Editor.

| Module | Trách nhiệm | Nơi sử dụng |
|---|---|---|
| `core/physics/lane-space.ts` | Miền tọa độ, vùng thả quân, lane gần nhất, giới hạn di chuyển | Deployment, movement và renderer picking |
| `engine/lifecycle.ts` | Sở hữu resource, dispose ngược thứ tự, dọn cả khi một resource lỗi | App session |
| `engine/assets/asset-registry.ts` | Đăng ký ID, tải lười, cache và dispose asset | Hero prefab registry |
| `rendering/assets/hero-prefabs.ts` | Factory cho 10 tướng, mỗi instance có rig riêng | World portrait và spawn |
| `rendering/assets/model-library.ts` | Cache GLTF, clone skeleton, normalization, AnimationMixer/clip mapping, palette cấu trúc | Model Khada, trụ/lõi và map prop |
| `rendering/terrain-style.ts` | Texture nguyên bản tạo một lần, gán cho terrain đã batch | Địa hình và đường đá |
| `rendering/animation/unit-animator.ts` | Trạng thái spawn/idle/walk/attack/cast/stunned | Mỗi unit visual |
| `engine/object-pool.ts` | Pool có giới hạn, tái sử dụng, hủy đúng một lần | Sprite VFX |
| `rendering/vfx/sprite-effects.ts` | Atlas mặc định hoặc sprite nhập ngoài, phát theo combat event, pool tối đa 48 | Spawn/skill/heal/death/pulse |

## Vật lý

Đây là vật lý chuyển động một chiều trên ba lane, không có rigid body, trọng lực hay đẩy quân. Không thêm body blocking vì đó là thay đổi gameplay chưa được chốt. Combat không lấy vị trí mô hình đã nội suy làm input. Nếu thêm vật lý va chạm sau này, thực thi ở fixed tick và kiểm tra lại trận seeded.

## Asset và animation

Game dùng GLB rigged từ Khada theo binding trong content revision. `ModelLibrary` cache nguồn; `SkeletonUtils.clone` và `AnimationMixer` tách skeleton/clip state cho từng quân. Wrapper chuẩn hóa chiều cao/hướng để keyframe không ghi đè transform đặt quân. Model thủ tục và Canvas atlas vẫn là fallback. Sprite nhập từ CommunityDragon có provenance; tham khảo [asset pipeline](../assets/README.md). Thay ngoại hình/animation không sửa core; animation GLB ngoài phải cùng rig, chưa tự retarget.

## Thứ tự nâng cấp

1. Khai báo asset ID và factory/loader trong registry.
2. Tạo prefab sở hữu instance state, dùng chung geometry/material.
3. Định nghĩa animation adapter và mapping từ trạng thái core.
4. Bind combat event vào VFX; giới hạn số instance trên mobile.
5. Gắn dispose vào lifetime. Reset trận chỉ reset instance, không xóa asset dùng chung.

Kiểm thử: pool exhaustion/double release, registry lazy cache/ID trùng, cleanup lỗi, biên vùng thả, GLB compaction giữ vertex/keyframe, normalization không bị clip ghi đè và golden regression. `npm run check` hiện gồm 42 test, typecheck client/server và build hai entry game/admin.
