# Milestones và vertical slices

Các package A–G dưới đây chia effort phase, không cộng thêm vào estimate roadmap. Mỗi slice kết thúc bằng URL/build chạy được cùng test report; dữ liệu placeholder được đánh nhãn lab. Không cần đợi backend hoàn chỉnh để test rendering, nhưng không gọi local wallet là secure economy.

| Slice | Dependency | Deliverable chạy được | Definition of Done | Rủi ro/gate |
|---|---|---|---|---|
| R1 Baseline | none | Evidence index xem được với fixtures | Build/locale/mode/tier và source/timecode cho mọi P0 slice | U01 access |
| R2 Ruleset candidate | R1 | Catalog validator báo rõ field thiếu |8–12 cards đủ numeric tables/abilities; conflicts resolved hoặc excluded | U02–06 |
| A1 Shell | R triage | Lobby→battlefield trên mobile/desktop | Resize/safe area, pointer cancel, loading/retry, no input trap | U10 |
| A2 Render comparison | A1 | Ba scene Babylon/Three/Phaser | Same assets/replay; B01–B10 report; ADR signed by reviewer | U12, art rights |
| A3 Shared core path | A1 | C# headless+WASM worker same trace | Payload/startup đạt budget; fail thì ADR TS shared core | A-WASM |
| B1 Deploy duel | A2+A3+R2 | Spawn/mana/3 lane/castle local |20 documented cases ready subset; input invalid no debit | Target geometry |
| B2 Combat & result | B1 | Melee/ranged/spell→win→restart | Replay hash, attack timing, same-time test, OT known or lab-gated | U05/U06 |
| B3 Deck loop | B2 | Full match with draw/cycle/empty hand | Full-hand/double/cursor tests; no CR instant redraw assumption | U02 |
| C1 Practice | B3 | Bot complete trận offline | Commands same validator, no hidden info,30 seeded scenarios | U13 new policy |
| C2 Local meta | C1 | Edit deck→practice→result→collection | Persistent local save versioned; lab rewards labeled | Not online ownership |
| D1 Connected duel | C2 | Two browsers join same room | Server only damage; private hands filtered; seq dedup | Latency |
| D2 Identity/queue | D1 | Login→queue→match→result | One active ticket/player, frozen deck, authenticated room | Account conflict |
| D3 Recovery/settlement | D2 | Disconnect/rejoin; rewards after result | Exactly-once business grant under retries; fencing/void crash | U11 original vs new |
| E1 Progress loop | D3+U07 | Reward→upgrade→next match | Wallet/collection atomic, no client price, daily/chest timers | Loot/config |
| E2 Roster | E1+U04 | Entire verified catalog usable | Each ability+level/scaling+interaction fixtures; aliases reconciled | Largest content cost |
| E3 Season/Forge | E2 | Timed boosts/reset/league rewards | Frozen effective levels, expiry/reset race tests | Historical live gate |
| F1 Clan/friendly | E1+U08 | Create/join/chat/donate/invite battle | CAS invite, donation ledger, clan permissions, mute/report | Moderation |
| F2 Modes/ranking/replay | F1+U08 | Rotation+leaderboard+authorized replay | No hidden state leak; mode gates; stable rank projection | Unknown schedules |
| F3 Final presentation | A2+B2+E2 | New art/audio/UI |25 screens states/mobile QA; animation driven by events | Asset throughput |
| G1 Resilience | D3+E3+F2 | Staging load/fault tests | Capacity report, migration+backup restore, drift alarms | Host crash |
| G2 Release candidate | G1+F3 | Versioned release/rollback | P0 acceptance closed; parity matrix evidence; no unlicensed assets | Not automatic100% |

Mỗi milestone có cutline: phạm vi chưa đủ evidence không lén bỏ khỏi inventory; chuyển Blocked research và cập nhật release claim. Beta có thể xuất với subset rõ, nhưng feature-complete của baseline cần đóng toàn bộ mandatory rows.
