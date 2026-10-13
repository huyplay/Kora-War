# Các module engine của Kora War

Kora War dùng Three.js + TypeScript + Vite. Các module sau đang được gọi trong game, không phải thư mục mô phỏng Unity Editor.

| Module | Trách nhiệm | Nơi sử dụng |
|---|---|---|
| `core/physics/lane-space.ts` | Miền tọa độ, vùng thả quân, lane gần nhất, giới hạn di chuyển | Deployment, movement và renderer picking |
| `engine/lifecycle.ts` | Sở hữu resource, dispose ngược thứ tự, dọn cả khi một resource lỗi | App session |
| `engine/assets/asset-registry.ts` | Đăng ký ID, tải lười, cache và dispose asset | Hero prefab registry |
| `rendering/assets/hero-prefabs.ts` | Factory cho 10 tướng, mỗi instance có rig riêng | World portrait và spawn |
| `rendering/animation/unit-animator.ts` | Trạng thái spawn/idle/walk/attack/cast/stunned | Mỗi unit visual |
| `engine/object-pool.ts` | Pool có giới hạn, tái sử dụng, hủy đúng một lần | Sprite VFX |
| `rendering/vfx/sprite-effects.ts` | Atlas 8 frame tự tạo, phát theo combat event, pool tối đa 48 | Spawn/skill/heal/death/pulse |

## Vật lý

Đây là vật lý chuyển động một chiều trên ba lane, không có rigid body, trọng lực hay đẩy quân. Không thêm body blocking vì đó là thay đổi gameplay chưa được chốt. Combat không lấy vị trí mô hình đã nội suy làm input. Nếu thêm vật lý va chạm sau này, thực thi ở fixed tick và kiểm tra lại trận seeded.

## Asset và animation

Mesh/texture hiện tự tạo trong mã, không tải tài sản từ Castle Crush hoặc Liên Quân. Sprite atlas là hiệu ứng nguyên bản tạo bằng Canvas2D. Model prefab có các bộ phận tay/chân/thân/áo choàng riêng; clip driver hiện là procedural, chưa phải skeleton/GLB AnimationMixer. Thay bằng model GLB tại ranh giới prefab/animator, không đổi core.

## Thứ tự nâng cấp

1. Khai báo asset ID và factory/loader trong registry.
2. Tạo prefab sở hữu instance state, dùng chung geometry/material.
3. Định nghĩa animation adapter và mapping từ trạng thái core.
4. Bind combat event vào VFX; giới hạn số instance trên mobile.
5. Gắn dispose vào lifetime. Reset trận chỉ reset instance, không xóa asset dùng chung.

Kiểm thử: pool exhaustion/double release, registry lazy cache/ID trùng, cleanup lỗi, biên vùng thả và golden regression. `npm run check` gồm 32 test tại mốc task này.
