# Performance Engineering và benchmark B0

**Chưa có kết quả FPS, memory, bandwidth hay capacity của sản phẩm.** Mọi con số dưới đây là target Proposed. Kết quả build Crown-Clash không phải benchmark renderer/simulation. Chốt engine cần report đo, không dùng lời quảng cáo engine thay số liệu.

## Thiết bị và điều kiện

Desktop tham chiếu: Windows i5-class integrated GPU,16GB; macOS Apple Silicon/Safari. Mobile: Android mid-range6GB/Chrome, iPhone11-class/Safari và một thiết bị yếu hơn để kiểm chứng30FPS. Đây là mẫu test cần chuẩn bị, chưa thiết bị nào được chạy. Ghi model chính xác, SoC/RAM, OS, browser build, battery/power mode, nhiệt độ đầu/cuối, DPR, resolution và graphics profile vào kết quả. Desktop Chrome/Edge/Firefox/Safari, Android Chrome, iOS Safari là release matrix; engine hỗ trợ không thay việc test.

Với mỗi scene: cùng logical replay, cùng silhouettes/animation complexity/shadows/resolution; warm-up60s rồi capture180s,10 runs. Cold tải xóa cache nhưng không xóa account, warm tải đo riêng;30 phút thermal/20 trận soak. Network profiles RTT20/80/150/300ms, jitter0/30/80ms, loss0/1/5%, reconnect5/15/30s. Dùng emulated throttling bổ trợ, không thay mobile thật.

| Chỉ số | Target ban đầu | Cách đo / pass |
|---|---|---|
| Desktop/capable mobile |60FPS; frame p95≤16.7ms, p99≤33.3ms | RAF interval + main/GPU profiles; không chỉ average FPS |
| Mid mobile fallback |30FPS; p95≤33.3ms, p99≤50ms | Adaptive quality đạt trong5s, không đổi tick/luật |
| Input visual feedback |p95≤50ms từ pointer đến highlight/ghost | performance marks, không nhầm với server accept |
| Authoritative feedback |p95≤RTT+150ms với RTT≤150ms | Input send → authoritative receipt; tách server wait/network |
| Per-room simulation |p95≤5ms/step ở100 units |20Hz50ms step; room budget và aggregate worker CPU riêng |
| Server utilization |sustained CPU≤65%, p99 tick backlog<100ms | Capacity test cụ thể hardware; stop new rooms trước overload |
| Memory mobile |JS/WASM heap≤128MiB target, resident peak≤300MiB target | Browser counters/platform profiler; unavailable metric ghi N/A |
| GPU texture budget |≤96MiB mobile,≤256MiB desktop | Include mipmaps/uncompressed formats; size zip không đủ |
| Initial shell download |≤2MiB Brotli; interactive≤3s trên10Mbps/80ms | Cold cache; separate JS/CSS/font/assets |
| First battle total |≤12MiB compressed; ready≤12s trên10Mbps/80ms | WASM/art decoding included; offline core lazy cached |
| Network per player |downstream avg≤20KiB/s, p95≤40KiB/s; upstream≤2KiB/s | Payload+framing measured, full resync riêng |
| Leak |Sau20 matches post-GC steady heap tăng<5% và<10MiB | Chỉ dùng thiết bị/tool cho phép GC kiểm chứng; nếu không có đo trend+retained objects |
| GC/jank |Không frame>100ms do recurring allocation sau warm-up | Allocation trace; classify asset load riêng |

Mục tiêu12MiB ở10Mbps đã cần khoảng10s transmission trước decode, nên ready12s khá chặt; nếu không đạt phải sửa tải theo deck/lazy WASM hoặc sửa ADR có report, không đánh dấu pass giả. Không có yêu cầu GPU resident memory nào mà browser không đo được được tự điền0.

## Benchmark scenarios

| ID | Fixture | Phát hiện cần tìm |
|---|---|---|
| B01 |0 units, UI+arena idle | Base renderer/UI cost, idle loops |
| B02 |10 animated units,2 materials | Rig/bone update base |
| B03 |30 units,3 lanes,melee+ranged | Typical combat CPU/GPU balance |
| B04 |60 units,projectiles/statuses | Pool/target search stress |
| B05 |100 units all attacking | Stress; không gọi số100 là cap game gốc |
| B06 |Simultaneous AOE+summon+death | Burst allocation, cleanup, event latency |
| B07 |10 distinct skeletons/skins | Instancing limits, texture switches |
| B08 |Mobile rotate/background60s/resume | Resize/context loss/network recovery |
| B09 |Cold/warm first battle + slow CDN | Critical path, decoder cache, retry |
| B10 |20 consecutive matches | Listener/material/texture/worker leaks |
| B11 |100/250/500 concurrent matches stair-step | Capacity and tick backlog, serialization contention |
| B12 |Packet loss/reorder/reconnect | Snapshot resync/reliable input, bandwidth |

B11 chỉ là load levels để tìm điểm gãy, không cam kết500 matches/host. Scripts phải mô phỏng play commands và entity load thực, không500 socket idle. Ghi match/minute, active matches,entities/room và tick cost histogram. Loadtest service/account giả, không gửi load vào server Castle Crush.

## Tối ưu theo bottleneck

Pool units/projectiles/VFX nhưng ID gameplay không reuse. SoA/sorted lane buffers cho hot path sau profile; tránh LINQ/closures/JSON per-entity per-tick. Spatial index theo lane và swept range, không O(n²) scan toàn scene khi n lớn. Batch static meshes/material atlas; independently animated skeleton cần shared rigs/GPU animation hoặc LOD riêng, không giả định InstancedMesh giải quyết mọi skinning.

Render culling/LOD chỉ giảm vẽ, không xóa unit trong sim. Particle budget theo screen coverage; pool và giảm emitters trên mobile. Bake lighting/static shadows, blob shadows fallback. Adaptive order: shadows → particles → postprocessing → DPR1.5→1.0→0.75 → render30; hysteresis2–5s để không nhấp nháy. Không bỏ feedback quan trọng như lane/target/hit.

Preload models của hai deck và summon graph qua server-safe asset manifest (cân nhắc leak deck: preload superset arena nếu deck hidden); compressed textures, lazy meta screens, CDN immutable. Asset fetch/decoder bounded concurrency tránh mobile memory peak. Dispose scenes/material refs/listeners/RAF/worker on match exit. Browser visibility change không pause online sim. Catch-up cần full snapshot, không replay60s animation nhanh.

Ghi kết quả theo `benchmark_id,commit,coreVersion,contentHash,renderer,device,OS,browser,quality,unitCount,run,frameP50/P95/P99,cpuMs,gpuMs,heapMiB,residentMiB,bytesUp/Down,coldReadyMs,notes`. Giá trị chưa đo=`null`. CI replay correctness mỗi PR; nightly performance trên máy cố định; fail regression>10% so accepted baseline trong3 runs liên tiếp, điều tra noise trước rollback. Không so sample từ thiết bị khác.

Mô hình chi phí: với M match đồng thời,2 clients/match, downstream bKiB/s, egress≈M×2×b×86400/1048576 GiB/ngày khi tải giữ24h. Ví dụ planning M=100,b=10 ⇒164.8GiB/ngày; không phải forecast traffic thực. Peak capacity = min(CPU,memory,network) đo × headroom; giá hosting/CDN phải lấy quote tại thời điểm deploy, chưa có chi phí tháng được xác nhận.
