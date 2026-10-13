# Progression Specification

Original: trophy quyết định castle/league; upgrade tạo player XP; level người chơi liên quan HP thành. Whitepaper tr.8 mô tả +10% HP/level nhưng base HP/rounding chưa rõ. [Unlock](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684760339601-Unlocking-castles), [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf). Không đồng nhất arena/castle đã mở với castle HP level.

Theo support trophy: thắng đối thủ cùng trophy được +30; đối thủ nhiều hơn → nhiều hơn 30, ít hơn → ít hơn 30; chiều thua tương ứng. **Không đủ để khẳng định Elo hoặc công thức đầy đủ.** [Trophies](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684773222289-Trophies).

Season tài liệu: 3 tuần; League thresholds 3800/4200/4600/5000/5400/5800/6200/6600/7000; công thức reset không công khai. [Season](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758554769-Season-s-Reset). Quyền sở hữu thẻ, XP curve, arena drop floor và cap level hiện hành đều cần bảng versioned.

## Thiết kế web

`PlayerProgress`: xp, playerLevel, trophy, highestTrophy, unlockedCastleIds, maxUnlockedDeckSize, seasonBestLeague, revision. `ProgressionCatalog`: xpByLevel[], castleThresholds[], rewards[], trophyPolicyVersion. XP overflow xử lý nhiều level bằng while đến threshold kế tiếp; không suy giá trị threshold từ level trước.

Upgrade trong DB transaction: khóa wallet + playerCard; kiểm tra copies/gold → trừ copies theo bảng tiêu hao → tăng level → award XP → update version → outbox event. Thiếu stats/upgrade table phải reject `CONTENT_INCOMPLETE`; không fallback linear.

Forge tách `permanentLevelCap` và `boostExpiresAt`. Support yêu cầu matching rarity crystals, magic crystal cho mở cap theo điều kiện và vẫn cần upgrade cards/gold; boost tạm +1 trong24h. [Forge](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684732708113-How-to-use-the-Forge), [Crystals](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684776797201-What-are-the-Forge-Crystals-and-what-are-they-used-for).

Season job chốt snapshot theo seasonId, xếp hạng với tie policy được duyệt, một reward grant/player/season. Retry không trao lại. Không reset mọi account ngay khi app mở. Hiển thị best/current, lịch kết thúc từ server. Test: boundary 199/200, xp đủ2levels, concurrent upgrade, reset worker chạy2lần, Forge hết hạn khi offline và trong battle.


## Account, profile và xóa dữ liệu

PlayerID xuất hiện trong Settings sau tutorial; tên đã đặt không thể sửa theo support, flag liên quan locale. Liên kết/khôi phục dùng các provider được support mô tả, không chứng minh token flow gốc. [ID](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684589127825-How-can-I-find-my-Player-ID), [Tên](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684752821649-Can-I-change-my-username), [Flag](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684767612689-How-do-I-change-my-flag), [Restore](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684767547665-Can-I-recover-my-progress-if-I-reinstall-the-game).

Support có Delete Account trong Settings: confirmation bị khóa15giây, sau xóa quay start screen, không khôi phục được. Reinstall có thể tạo profile mới nhưng không overwrite profile đã gắn provider. [Reset/delete](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12679594402577-How-can-I-reset-or-delete-my-account). Web cần re-auth, account-scoped deletion job, revoke sessions và policy retention của ledger theo yêu cầu phát hành; lifecycle backend này là Proposed. Không xóa profile ngay khi chỉ mở popup. Avatar customization, detailed statistics, achievements vẫn Unknown; không dựng UI giả rồi gọi original parity.
