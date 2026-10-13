# Lựa chọn công nghệ — ADR-001 (provisional)

## Kết luận có điều kiện

Ưu tiên **React+TypeScript UI, Babylon.js renderer camera cố định, ASP.NET Core/C# authoritative simulation, SignalR/WebSocket, PostgreSQL**. Chưa chốt engine production: cần benchmark B0 cùng art/replay trên Babylon, Three và Phaser atlas. Redis chưa cần cho single match host. C# offline WASM phải qua spike về load/runtime; nếu thất bại, xem ADR-002: TypeScript simulation dùng chung browser worker/Node+Colyseus, thay vì maintain hai combat engines.

| Công nghệ | Giá trị | Chi phí/bảo trì cho1 developer | Load/performance | Quyết định |
|---|---|---|---|---|
| React+TS | Forms/lobby/accessibility, typed contracts | Ecosystem tốt; tránh entity per React state | Không render mỗi unit bằng React | Chọn UI ngoài sim |
| Three.js | Scene renderer linh hoạt, glTF/instancing | Tự ghép animation/VFX/debug/game services | Có thể tree-shake, cần đo thực | Đối chứng3D |
| Babylon.js | Game-oriented scene, animation, inspector, particles | Ít glue hơn là inference của thiết kế | Thin instances có trade-off static/dynamic, skinning phải đo | Ưu tiên slice2.5D |
| Phaser | Sprite/atlas/input/scene workflow | Nhanh nếu pipeline baked; đổi camera/skin đắt art | Batching lợi khi atlas tốt, texture memory dễ lớn | Fallback2D đối chứng |
| PlayCanvas | Web graphics/runtime + editor workflow | Engine MIT; editor/cloud terms tách riêng | glTF/streaming có sẵn; chưa benchmark | Hợp lệ, chưa có lợi thế đo đủ đổi lựa chọn |
| Unity Web | Editor/animation workflow, C# ecosystem | Export/upgrade, bridge React, payload và asset rights | Mobile đã được hỗ trợ trong tài liệu mới; không loại vì quan niệm cũ | Không ưu tiên repo Unity cũ; đo nếu art pipeline chọn Unity |
| ASP.NET Core | Auth/REST/jobs/typed domain, pure C# core | Hợp ưu tiên người dùng; offline bridge phức tạp | Actor room, không allocation per entity/tick | Chọn backend provisional |
| SignalR | MessagePack/JSON, connection lifecycle | Không tự cung cấp authoritative sim hay replay | Đo serialization/traffic, configure limits | Chọn transport adapter |
| Raw WebSocket | Nhẹ, tự kiểm soát protocol | Phải tự retry/auth/backpressure/versioning | Không tự nhanh hơn nếu payload xấu | Chỉ đổi sau profile |
| PostgreSQL | Ledger/transaction/index/outbox | Một DB giai đoạn đầu dễ vận hành | Không ghi unit movement mỗi tick | Chọn persistence |
| Redis | Ephemeral queue/presence/routing khi scale | Thêm service, phải xử failover | Không source of truth wallet | Trì hoãn đến nhiều worker |

## Bằng chứng năng lực, không phải kết quả benchmark

[Three InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) giảm draw calls cho mesh/material chung; không có nghĩa animation độc lập skinning tự động được batch.
[Babylon thin instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances/) bỏ object instance JS nhưng add/remove và culling có trade-off; dùng pool/matrix buffer sau đo. [Skeletons](https://doc.babylonjs.com/features/featuresDeepDive/mesh/bonesSkeletons) cho thấy bone processing vẫn có chi phí.
[Phaser](https://docs.phaser.io/) có WebGL/Canvas; phải pin major khi chọn vì renderer/API phiên bản khác nhau. [Unity web](https://docs.unity.com/en-us/engine/6000.6/manual/platform-specific/webgl/intro/browsercompatibility) hiện liệt kê Safari iOS và Chrome Android, nên cần thử trên thiết bị thay vì khẳng định “không hỗ trợ mobile”. [PlayCanvas engine](https://github.com/playcanvas/engine) xác nhận WebGL2/WebGPU và glTF.

## Gate B0, tiêu chí lựa chọn

5 ngày engineering spike sau research triage: 3 renderer cùng battlefield, 4 archetype asset **được cấp quyền**, 0/10/30/60/100 unit và replay timing tương đồng. Đo10 lần, warm-up60s, capture180s, cold load riêng. Score gồm visual readability30%, p95frame30%, payload15%, art workflow15%, maintenance10%. Không dùng sphere-only benchmark để kết luận skeleton performance.

Babylon được giữ nếu đạt mobile30FPS budget và không hơn Three >20% frame p95 ở cùng chất lượng; nếu Three nhẹ hơn rõ và glue effort nhỏ, đổi Three. Nếu cả hai vượt memory/frame budget mobile, dùng baked atlas/Phaser hoặc giảm art load rồi đo lại. Không đổi simulation/luật để “đạt FPS”. Mọi số threshold là acceptance Proposed, không claim measured.
