# Rendering Contract

Proposed2.5D: sân3 lane ở mặt phẳng world XZ, unit di chuyển scalar X theo lane, height Y chỉ visual; fixed camera target. Mirror orientation hiển thị cho playerB bằng projection, không sửa authoritative coordinate. HUD nằm DOM overlay.

Camera thông số `projection, position, target, orthographicExtent/FOV` là art config lab; chưa đo gốc. Raycast plane → canonical lane/x; server validate. Freeze input mapping lúc pointerdown hoặc cancel khi resize để không deploy sai lane. Depth sort transparent particles; billboards health bar theo camera; silhouettes không bị thành che điểm đặt quân. Selection ghost dùng màu/outline riêng.

Animation semantic clips: idle/move/attack/spawn/hit/death, optional cast/stun/transform. Đây là yêu cầu asset mới; chưa xác minh full clip list gốc. `attackStartTick, impactTick, clipDuration` điều khiển playback; visual có thể blend nhanh/chậm nhưng không gửi damage ngược server. Không dựa animation event của GPU làm combat clock.

Instancing: props, shadows, projectile primitives trước; animated units đo skeleton instances so với baked vertex animation texture. Không giả định InstancedMesh tự chia sẻ pose nhưng vẫn giữ pose độc lập. Pool views/effects, cache assets theo archetype, texture atlas cho HUD/VFX. Frustum culling ít lợi nếu toàn sân luôn nhìn thấy; tối ưu draw calls/overdraw/skinning trước.

Quality tiers Proposed: Low không realtime shadows/postprocess, DPRcap1; Medium blob/baked shadows,DPR1.5; High light shadow map có budget,DPR2. Tự hạ sau p95frame vượt target trong5s, hồi phục chậm sau20s để tránh oscillation. Không giảm simulation tick-rate hay hitboxes theo tier.
