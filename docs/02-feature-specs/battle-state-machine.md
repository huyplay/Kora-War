# State machines và invariants

Các state dưới đây là **Proposed**. Chúng tổ chức web implementation, không phải enum nội bộ Wildlife.

```mermaid
stateDiagram-v2
  [*] --> INITIALIZING
  INITIALIZING --> READY: config/auth loaded
  INITIALIZING --> ERROR: invalid schema
  ERROR --> INITIALIZING: retry
  READY --> MATCHMAKING: valid frozen deck
  MATCHMAKING --> READY: cancel accepted
  MATCHMAKING --> LOADING: allocation committed
  LOADING --> PLAYING: two ready or training ready
  LOADING --> CLOSED: readiness timeout/void
  PLAYING --> FINISHING: authoritative terminal event
  FINISHING --> RESULT: settlement committed
  RESULT --> CLOSED
  CLOSED --> READY
```

Kết nối là orthogonal state `CONNECTED ↔ RECONNECTING → EXPIRED`, không rời PLAYING khi mất socket; server tiếp tục. Settlement pending vẫn FINISHING, không phát thưởng client trước commit. Queue cancel và room allocation tranh chấp phải có một CAS winner.

```mermaid
stateDiagram-v2
  [*] --> SPAWNING
  SPAWNING --> MOVING: spawn delay elapsed
  MOVING --> TARGETING: eligible candidate
  TARGETING --> ATTACKING: in range
  TARGETING --> MOVING: no candidate
  ATTACKING --> TARGETING: target invalid
  ATTACKING --> MOVING: target left range
  MOVING --> DISABLED: control effect
  ATTACKING --> DISABLED: control effect
  DISABLED --> TARGETING: effect expired
  SPAWNING --> DYING: lethal if targetable
  MOVING --> DYING: lethal
  ATTACKING --> DYING: lethal
  DISABLED --> DYING: lethal
  DYING --> DESPAWNED: death event scheduled
  DESPAWNED --> [*]
```

Status là component đa trạng thái (`slow`, `shield`, `freeze`, `buff`), không nhân tất cả tổ hợp thành enum. Resurrection tạo entity generation mới và giữ source link; không tái sử dụng stale target reference. `DYING` logic xảy ra ngay sau lethal resolution, visual corpse có thể tồn tại lâu hơn nhưng không còn targetable.

Invariant: monotonic tick/eventSeq, unitId+generation không trùng, HP clamp [0,max], mana không âm, entity đã chết không tạo đòn mới, terminal result duy nhất, command cũ không mutate trạng thái. Attack event đã được commit trước chết có tiếp tục không là policy Proposed cần U05.
