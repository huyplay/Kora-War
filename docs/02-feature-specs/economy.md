# Economy Specification

| Hệ thống | Nguồn / điều đã biết | Tham số chưa biết |
|---|---|---|
| Gold/card copies | Upgrade tiêu copies+gold | Bảng cost/copies/XP hiện hành |
| Gems | Shop/chest/continue/subscription | Giá theo vùng, entry/continue curve |
| Free/Victory chest | 4h/24h, mỗi loại stack2 | Mốc bắt đầu, reset timezone và content odds |
| Battle chest | Whitepaper: slots4, unlock1, Silver3h | Current rotation/drop table |
| Daily gold | Giới hạn số lần thắng được coins | Số lần và reset timezone |
| Forge crystals | Common/Rare/Epic/Legendary/Magic | Cost table từng thẻ |

Nguồn: [Upgrade](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684766514577-Upgrading-cards), [Chests](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684731365521-How-do-Free-Chests-and-Victory-Chests-work), [Daily limit](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684722867985-What-does-Daily-Coins-Limit-Reached-mean), [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) tr.7. Đừng nhầm Victory Chest định kỳ với chest nhận sau một trận thắng.

Piggy Bank tích lũy qua mở chest; đầy phải mở trong24h bằng gems, không carry-over chest mở sau khi đầy. Gem Capsule nhận từ Victory Chest, tích chi tiêu gems trong24h, mở miễn phí khi đầy; các threshold `null`. [Piggy](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684752705169-Piggy-Bank), [Capsule](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684817656721-Gem-Capsule).

Subscription có thêm gems Free Chest, shop reshuffle, chiết khấu/reroll một số chest; entitlement và live availability cần kiểm tra. [Perks](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684817774993-What-are-the-subscription-perks). Không coi shop price của một nước là global.

## Transaction model Proposed

Ledger bất biến, mỗi transaction có reason, idempotencyKey, playerId, currency, amount integer, sourceEntityId, contentVersion. Số dư không âm; debit/credit/reward/copies cùng transaction. Chests snapshot loot table + arena lúc nhận hay mở là U07; triển khai policy riêng, không chọn ngầm. RNG loot server-only, lưu audit seed quyền truy cập hạn chế và kết quả thực nhận; không gửi seed tương lai cho client.

`openChest`: ownership → unlock timestamp → claim lock → sampled rewards → ledger+collection+claimed flag → outbox. Retry trả receipt cũ. `upgrade` không dùng client price. Refund/reversal tạo bút toán đảo có audit, không xóa lịch sử. IAP web cần payment provider riêng, webhook chữ ký, unique externalTransactionId, server verification; không sử dụng key hoặc product gốc.

## Ascension scope

Tài liệu support phân biệt AP, ACS và NFT card upgrade; tăng NFT upgrade level nâng reward rate, không thêm combat power. [NFT use](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12680837016721-How-can-I-use-NFTs-in-my-gameplay). Combat tier, Forge crystals và mana crystals là ba khái niệm khác nhau. Giữ branch `Ascension` trong parity inventory; cần xác minh live trước triển khai. Bản lab có thể biểu diễn tier stats trong config; không được gọi tương đương tính năng sở hữu/giao dịch nếu không có marketplace.

Balancing thay thế phải có economy simulator: expected gold/day từ số trận, chest queue, sinks/upgrades; đo time-to-first-upgrade và time-to-unlock. Mọi giá trị là thiết kế mới khi thiếu bản gốc. Không có benchmark retention hay tỷ lệ drop được bịa trong tài liệu này.
