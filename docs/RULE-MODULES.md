# Module gameplay và rule

Gameplay đã chốt không thay đổi. Cấu trúc mới tách dữ liệu rule theo module trong SQLite và tách thực thi mô phỏng theo system; app, PvP và replay tiếp tục nhận `ContentConfig` thống nhất.

## Mã nguồn

| Thành phần | Trách nhiệm |
|---|---|
| `src/data/gameplay/types.ts` | Interface profile, phép và synergy |
| `src/data/gameplay/defaults.ts` | Seed database, demo và preset replay cũ |
| `src/data/gameplay/validation.ts` | Kiểm tra giới hạn và phụ thuộc gameplay |
| `src/data/gameplay/deck.ts` | Kiểm tra/chuẩn hóa loadout |
| `src/data/gameplay/synergies.ts` | Mô tả dữ liệu synergy cho UI |
| `src/data/rule-modules.ts` | Registry module, schema, extract/compose và migration thuần |
| `server/rule-module-store.ts` | Đọc/ghi module, phiên bản, snapshot và migration lưu trữ |
| `src/core/modules/pipeline.ts` | Điều phối system theo thứ tự fixed tick |
| `src/core/systems/*` | Deployment, damage, spells, status, mana, pulse, units, towers, victory |
| `src/core/ai/heuristic.ts`, `draw-deck.ts` | AI và chồng bài xác định theo seed |

`src/data/gameplay.ts` giữ export tương thích để các import hiện có tiếp tục hoạt động. Core chỉ nhận dữ liệu và chạy handler TypeScript; không fetch database, đọc DOM hoặc thực thi code lưu trong database.

## Database

17 module hiện có: `rules`, `mana`, `deck`, `board`, `combat`, `resonance`, `spells`, `synergies`, `ai`, `match`, `collection`, `heroes`, `abilities`, `economy`, `items`, `communication`, `presentation`. Hai module cuối được migration có chủ đích từ release 15 module; giữ nguyên content lịch sử.

`rule_modules` là nguồn dữ liệu live: mỗi dòng có `scope` (draft/published), `module_id`, `schema_version`, `data_version`, `payload` JSON. Khóa chính `(scope,module_id)`. `schema_version` mô tả cấu trúc; `data_version` tăng riêng trong từng scope khi payload/schema thay đổi. Hai bộ đếm draft/published không cần bằng nhau; trạng thái “Có thay đổi” so sánh payload. Thứ tự khóa JSON không được coi là thay đổi cân bằng.

`rule_module_revisions` khóa `(revision,module_id)`, chụp schema/data version/payload khi publish. Bảng `config` và `revisions.content` tiếp tục giữ snapshot đầy đủ tương thích các tool/replay cũ. `GameDatabase.config()` ghép content từ **module rows**, không dùng khối gameplay JSON cũ để ghi đè. Snapshot trong `matches` và content của trận đã tạo giữ nguyên.

Lưu draft cập nhật content, module thay đổi và audit trong một transaction với optimistic version. Publish validate toàn bộ các phụ thuộc và asset, ghi published/module history/content revision/audit trong cùng transaction. Nếu một bước thất bại, tất cả được rollback. Publish toàn bộ revision giữ tính nhất quán, dù API có thể sửa riêng một module.

Migration ban đầu từ storage JSON tạo 30 dòng draft/published và 15 dòng history cho revision 12, không tạo cân bằng mới hoặc sửa lịch sử cũ. Nâng cấp từ bộ 15 module hoàn chỉnh thêm `communication` và `presentation`, thành 34 dòng draft/published và tạo revision 13 với 17 dòng history; history revision 12 giữ nguyên. Revision trước migration không cần backfill: restore dùng content snapshot cũ, nâng cấp bản nháp và ghi module hiện hành. Restart không seed lại module đã tồn tại. Thiếu/trùng module, schema mới hơn engine hoặc migration thiếu bị từ chối; không âm thầm dùng preset thay dữ liệu database bị hỏng.

## Admin và API

Trong **Gameplay**, mở **17 module rule · phiên bản và trạng thái** để xem schema, version nháp/live và module đang thay đổi. Các form hiện có tiếp tục lưu vào đúng module thông qua service database; nhóm **Chat & đội hình** sửa hai module mới. Sau khi lưu, trạng thái cập nhật ngay; phát hành và khôi phục vẫn dùng luồng revision hiện tại.

API chỉ dành cho admin đã đăng nhập, cùng chính sách cookie/origin/header:

- `GET /api/admin/rule-modules`: config version, trạng thái và payload draft/published.
- `PUT /api/admin/rule-modules/{id}`: `{ "version": <config version>, "schemaVersion": 1, "data": <payload đầy đủ của module> }`. Chỉ thay module đó trong draft; kiểm tra toàn bộ content sau khi ghép. Version cũ trả 409; ID/schema/payload không hỗ trợ trả 400.
- Publish/restore qua endpoint hiện có. Không sửa trực tiếp SQL để vận hành cân bằng.

## Nâng cấp sau này

Điều chỉnh thông số/ghép các hiệu ứng hiện có: dùng form hoặc API module rồi phát hành, không đổi code. Nếu đổi cấu trúc module, tăng `schemaVersion` trong registry và thêm hàm `migrations[oldVersion]` thuần từ cấu trúc cũ sang mới. Khi khởi động, service chạy các bước tuần tự, validate toàn bộ content rồi transaction cập nhật module và tạo revision/audit nâng cấp; giữ nguyên snapshot lịch sử. API editor chỉ chấp nhận schema hiện hành.

Nếu thêm một loại module mới, bổ sung mapping extract/compose và migration lưu trữ có chủ đích cho database cũ trước khi đưa registry mới vào dùng. Không seed tùy ý để che trường dữ liệu bị thiếu. Nếu thêm một loại cơ chế/hiệu ứng mới, bổ sung handler trong core và schema/validation/editor; viết test từ tình huống gameplay. Không thay thứ tự pipeline mà thiếu quyết định ruleset/replay: thứ tự mana → AI → units → spells → towers → cleanup → victory là một phần của kết quả xác định.

Ba lane, tick 20 Hz, lore/catalog và luật chuẩn hóa giữ theo quyết định hiện tại. Rule/handler versioning không phải hệ thống plugin thực thi JavaScript từ database.

## Kiểm tra

`tests/rule-modules.test.ts` kiểm round-trip, migration schema, migration storage/idempotency, nguồn module authoritative, phiên bản chỉ tăng khi thay đổi, stale write, validation, rollback publish, restore lịch sử và auth/API. Fixture gameplay cũ được mô phỏng trước khi module storage tồn tại; hash `three-baseline.json` không sửa. Bộ regression xác nhận pipeline mới giữ baseline và replay hiện hành.

Đợt migration ban đầu: `npm run check` đạt 156/156 test, kiểm tra kiến trúc, TypeScript server/client và production build. QA Edge trên database riêng: mana 4 → 7 → 8, chỉ module mana tăng version; bảng hiện nháp 3/live 2 và “Có thay đổi”; khôi phục revision 1 và phát hành trở lại 4. Không có lỗi console admin. Database QA không dùng cookie/host người chơi chính.

Database chính đã được sao lưu bằng backup API trước migration ban đầu. Đối chiếu players/cards/ledger/matches/assets/revisions/config với backup: toàn bộ dòng giữ nguyên, public content không đổi và vẫn revision 12. Bổ sung 15 module draft, 15 published, 15 history revision 12. Admin chính hiển thị schema 1/version 1 và đồng bộ; ảnh kiểm chứng `.data/rule-modules-admin.png`. Không commit database, backup hoặc ảnh QA.

Đợt thêm chat/đội hình: `npm run check` đạt 162/162 test và runtime smoke đạt. Sao lưu riêng trước nâng cấp; đối chiếu players/cards/ledger/matches/assets và revision cũ giữ nguyên. Admin chính hiển thị revision 13, 17 module cùng các form phản hồi/packing; các luật combat cũ không thay đổi. Xem [QA chat và đội hình](BATTLE-PRESENTATION.md).
