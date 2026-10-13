# Matchmaking và Multiplayer Specification

Original: realtime1v1, trophy là cơ sở ghép, friendly qua clan; friendly không gold/trophy/chest. Invite active chặn matchmaking, đóng popup hủy request. [Friendly](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684695238289-How-to-play-Friendly-Battles), [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) tr.8. Tham số queue expansion, region, reconnect, timeout, surrender/rematch **Unknown**.

## Thiết kế Proposed

Ticket `{id, playerId, mode, region, rating, deckSnapshotHash, createdAt, expiresAt, version}`. Một account chỉ một active ticket/match/invite. Ghép cùng ruleset/mode/region trước, khoảng trophy mở rộng theo wait time có config; latency hard cap; không dựa purchase history. Prototype candidate ±100, mở thêm 100 mỗi 10s, cap 600 sau 50s: lab values cần telemetry. Không chèn bot ranked mà không hiển thị.

Claim pair trong transaction/CAS, reserve room → issue participant token one-use → hai client Ready. Load timeout20s Proposed: void, không trao reward/trophy. Queue cancel thắng CAS thì không tạo room, room đã committed thì trả allocation hiện hành thay vì báo canceled giả.

Mất mạng: simulation tiếp tục; giữ slot30s Proposed; reconnect bằng session credential, matchId, lastAck; trả snapshot đầy đủ và command receipts. Quá30s có thể xử forfeit trong web profile, phải đánh dấu deviation nếu chưa đo gốc. Cả hai mất mạng vẫn xử nhất quán; server crash dùng policy recover/void, không đoán winner từ HP snapshot.

Result settlement một lần: terminal event → durable result → transaction trophy/reward/outbox → result receipt. Friendly/Practice reward policy tách riêng. Reconnect sau kết thúc trả cùng receipt. Replay chỉ xem thông tin public trong live; hidden hand không leak qua snapshot/telemetry.

Security: server validate player membership, instance tồn tại, cost, target bounds, cooldown, game status, sequence/rate; clamp không thay cho reject invalid. [Networking chi tiết](../03-technical-design/multiplayer-architecture.md).


## Daily Game Modes và Championship — luật documented, live gate U08

Daily Game Modes mở khi đã unlock Castle4. Mỗi ngày một mode được chọn cho mọi người; thưởng ngày chỉ ở trận thắng đầu. Chuỗi sáu ngày thắng trước là điều kiện cho phần thưởng ngày bảy; thiếu ngày thì mất phần thưởng cuối tuần tương ứng. Ngày bảy chọn một fragment bằng1/5 Legendary trong tập castle đã mở; đủ5 fragments nhận thẻ. Không có danh sách đầy đủ rule của từng mode, timezone/catch-up chưa rõ; mode rules phải có version riêng. [Game Modes](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684689584017-Game-Modes).

Championship có Grand/Master Tournament, Hall of Fame tính điểm thắng tournament. Tài liệu mô tả10 rounds, phải thắng đủ mới nhận thưởng hoàn thành. Sau thua có Continue trả gems trong1giờ, giá tăng theo round nhưng bảng giá chưa biết. Lần đầu hoàn thành có cơ hội hoàn lại gems Continue theo support, không tự biến thành bảo đảm hoàn tiền. Championship deck chỉ dùng thẻ đã unlock, level cố định Common9/Rare7/Epic4/Legendary1; nâng card collection không thay level trong deck này. [Championship](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684749806609-Championship).

Proposed state machine tournament: ELIGIBLE→ENTERED→ROUND_READY→IN_BATTLE→(NEXT_ROUND hoặc CONTINUE_WINDOW)→COMPLETED/EXPIRED. Server timestamps và unique roundResult; phí Continue+state advance một transaction. Retry không trả hai lần. Reward policy snapshot theo entry; UI hiện price rõ trước xác nhận. Chưa đủ cost/reward/current rules thì endpoint trả MODE_UNAVAILABLE thay vì giá mẫu. Daily mode rotation và tournament là hai hệ thống riêng, không gọi chúng là quest/battle pass.
