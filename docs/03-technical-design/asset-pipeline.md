# Asset Pipeline và quyền sử dụng

## GLB

Blender source được tự tạo/đặt mua có license → retopo/UV/rig → semantic animation clips → export glTF2/GLB → validate hierarchy/scale/bounds → reduce mesh/texture → KTX2/Basis textures và meshopt/Draco nếu benchmark decoder có lợi → hashed manifest → CDN. Preserve authoring source và license ledger (creator, invoice/licenseURL, commercial/export rights, attribution).

Proposed budget mỗi archetype mobile:1–3k triangles LODlow, 20–40 bones,1 material/atlas nếu feasible; hero cần hơn phải bù budget toàn scene. Đây là mục tiêu art, chưa measured. Không mirror negative-scale skeleton tùy tiện; test normals/winding, weapons và hit VFX anchor. Root motion xuất tại chỗ; movement authoritative.

## Sprite alternative

Cùng Blender scene/rig → render camera cố định, 2 facing chính (thêm direction nếu mechanics cần) × idle/walk/attack/spawn/death → trim/pad atlas → metadata pivot/clipFPS/frameCount → texture compression → Phaser renderer. Attack semantic hit marker tách frame index. Outline baked phải không gây alpha halo. Ước memory uncompressed RGBA = width×height×4×mipFactor; atlas2048²≈16MiB trước mips, nhiều skins nhanh vượt budget. Không chỉ nhìn PNG download size.

Audio tự sáng tác hoặc CC0/được cấp quyền; mixer theo category, concurrency limits, không copy voice lines gốc. UI symbols/portraits/logo/names mới khi public release; catalog original giữ ở docs research.

QA: import pose/scale, walk no skating ở nhiều renderFPS, attack alignment, death freeze, occlusion3lane, dark/light arena, reduced motion, team readability. `assetKey` không cần bằng cardId vì nhiều cards có thể share rig với thiết kế mới. Không tải full roster trước battle; preload deck archetypes và summon descendants, tránh spawn hitch.
