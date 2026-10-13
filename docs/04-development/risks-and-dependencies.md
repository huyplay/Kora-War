# Risks và dependencies

Mức rủi ro là nhận định planning; không phải xác suất thống kê. Chủ sở hữu ban đầu là developer kiêm researcher/QA; production cần ít nhất người review độc lập gameplay và security/operations khi có tiền thật.

| Risk | Mức | Failure signal | Mitigation | Gate |
|---|---|---|---|---|
| Thông tin gameplay thiếu | Rất cao | P0 cònnull; prototype có vẻ giống nhưng xử khác | Research fixtures/gates;lab profile riêng | R, mỗi card |
| Baseline không truy cập được | Cao | Store online nhưng login/PvP không hoạt động | Ghi inaccessible;chọn historical baseline rõ,không claim latest | R01 |
| Roster/stat/ability scope | Rất cao | 68lịch sử/66candidates; mọi level cần dữ liệu | Per-card coverage+interaction matrix;không đếm tên=implemented | E06 |
| NFT/ACS bị thay đổi | Cao | Support tồn tại nhưng community báo mất thẻ | Verify announcement/live;phạm vi branch riêng | R09 |
| Asset throughput/quyền | Rất cao | Một dev không đủ art; repo LICENSE khác asset license | New identity,commission/CC0/license ledger;budget art | A03,F07 |
| Cross-runtime determinism | Cao | C#WASM load/timing/overflow khác server | Sharedcore+goldentrace;failspike chuyển TS | A02 |
| Sai target/hit/event ordering | Cao | Sai một tick đổi winner | Measure temporal precision;fixedpoint;trace diff | B01–B06 |
| Authority chỉ trên giấy | Cao | Client gửi winner/HP hoặc host client có đặc quyền | Server core,filtered state,invalid-input security tests | D03/D04 |
| Double reward/negative balances | Cao | Retries/callback/outbox gây duplicate | Ledger/idempotency/fencing/transaction;fault tests | D07/E05 |
| Sync/reconnect lỗi | Cao | Burn/play duplicate,hand stale,mobile background | Sequence receipts/fullresync/privateview;networkmatrix | D05 |
| Mobile CPU/GPU/memory | Cao | Rig/VFX/atlas quá lớn;Safari context lost | B0 real devices/adaptivequality/LOD/loadbydeck-safe | A03/G01 |
| Server cost/capacity | Trung–cao | Nhiều snapshot/room vượtCPU+egress | Measure unitload+serialization;capacity/headroomformula | G02 |
| Economy không cân bằng | Cao | Không có exactdrop/price;rewardpressure sai | Versioned tables,noinventedodds;economy model | E01–E08 |
| Queue population nhỏ | Trung–cao | Không đủ đối thủ cùngtrophy/region | UX estimated wait,cancel;bot chỉ explicit practice | D06 |
| Social abuse/operations | Cao | Chat spam,account takeover,payment dispute | Moderation/rate limits/audit/runbook;beta constrained | F01/G03 |
| Một developer quá tải | Rất cao | Web/game/net/art/liveops đồng thời | Vertical slices;defer optionalnonverified;outsourceart | All |
| Source version drift | Cao | Wiki/patch update làm golden stale | Hash/dated registry;freeze baseline;review sourcechanges | All |
| Migrations/rollout corrupt state | Cao | Old/new rooms dùng content/schema không tương thích | Pin core/content,expandcontract,drain,restore drill | G03/G04 |

Critical path: accessible baseline→complete slice rules→shared simulation→PvP authority→settlement→full roster/meta→mobile/ops. Art pipeline và evidence capture có thể tiến cùng engineering nếu có người hỗ trợ; estimate không mặc định có team. External dependencies: hợp pháp truy cập game/current accounts, thiết bị iOS/Android, art rights, provider credentials cho login/payment khi đến phase, hosting/CDN/domain. Chưa dependency nào được coi provisioned chỉ vì có thiết kế.

Stop conditions có phạm vi: P0 rule thiếu chặn verified gameplay feature; license thiếu chặn reuse asset/code; benchmark fail chặn ADRproduction; settlement fail chặn online progression; backup restore fail chặn public release. Vẫn được làm docs,synthetic spike hoặc task độc lập. Không coi nghiên cứu không đầy đủ là lý do che scope bị bỏ.
