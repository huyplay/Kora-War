# Simulation Engine

Pure C# library `Battle.Core` không phụ thuộc ASP.NET, engine graphics, wall clock hoặc filesystem. Fixed step đề xuất20Hz (50ms); snapshot10Hz. 20Hz là khởi điểm, có thể tăng30Hz nếu timing quan sát cần độ phân giải cao hơn; đổi tick rate phải đổi ruleset/replay version. Damage timing quantization test sai số≤1tick; muốn parity nghiêm hơn cần temporal resolution phù hợp evidence.

State: tick, contentHash, players[2], lanes[3], castles[2], entities, projectiles, statuses, scheduledEvents, private RNG state từng bên, terminal status. Fixed-point integer positions với scale1000 Proposed; damage/hp integer hoặc fixed-point rõ rounding. RNG algorithm/version cụ thể trong ruleset, ví dụ PCG32 với seed/stream stored; không dùng System.Random thay đổi runtime hay Math.random. Gameplay RNG độc lập cosmetic RNG.

```text
serverLoop(monotonicClock):
  accumulator += elapsedMonotonic
  while accumulator >= step and workBudget remains:
    accepted = mailbox.drainFor(nextTick) ordered by serverReceiptSequence
    state, events = core.step(state, accepted, ruleset)
    journal(accepted, state.tick, state.hash)
    if snapshotDue: publish filtered snapshots
    accumulator -= step
  if backlog too large: shed NEW matches and alert
  # Không bỏ simulation ticks để catch-up bằng teleport.

renderLoop(rafTime):
  renderTick = estimatedServerTick - interpolationDelay
  older,newer = buffer.bracket(renderTick)
  draw(lerp(older,newer,alpha), eventDrivenAnimations)

schedule(event):
  assert event.tick >= currentTick
  queue.insert(event.tick, event.phase, event.sourceId, event.seq)
```

Simulation time là ticks; render time là RAF; network time là estimatesRTT/clock offset; animation time là visual timeline được neo eventTick. Client lag không dừng simulation. Với nhiều room, mỗi actor có accumulator; round-robin bounded work tránh room đông làm starvation.

## Offline practice

Ưu tiên cùng C# core compile browser WASM runtime, nạp lazy trong Worker và chạy bot bằng command API; chưa có benchmark toolchain/load nên **gate A-WASM**. Cross-runtime deterministic test C# server vs WASM cùng config/seed/commands; integer64 không đi qua JS number nếu vượt53bits (serialize string/bytes).

Nếu bundle/startup vượt budget hoặc interoperability >10 ngày effort: ADR chuyển Battle.Core sang TS+Node/Colyseus dùng chung worker, hoặc hoãn offline với status rõ. Không gọi local client preview là “offline practice” nếu vẫn cần server. Không duy trì một engine C# và bản port TS độc lập khi chỉ có1 developer.

Replay gồm seed streams, initial frozen decks/levels, accepted commands+executionTick, rulesetHash, coreVersion, periodic state hashes/checkpoints. Event recording hỗ trợ visual playback fallback; event log đơn thuần không đủ regenerate hidden RNG state. Hidden deck chỉ được tiết lộ theo replay visibility policy sau trận.
