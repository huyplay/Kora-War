# GitHub research và xếp hạng

Ngày đọc13/10/2026. API metadata, recursive tree, README, license và các file core được kiểm tra tại SHA dưới đây. Stars/last update là snapshot biến động. `commits` là số reachable commits của default branch theo pagination API, không phải toàn bộ branches. `pushed_at` khác `updated_at` (có thể chỉ do star/metadata).

Điểm0–5 theo thứ tự **similarity/completeness/maintainability/web/multiplayer/license**, trọng số30/20/15/15/10/10%. Điểm là nhận định từ mức kiểm tra, không phải benchmark. License là **hard gate**: điểm tổng cao không cho phép copy repo thiếu quyền. Chưa repo nào đủ foundation nguyên khối.

| Hạng | Repo | Thành phần điểm | Tổng/100 | Stars | Commits | Last push | Stack |
|---|---|---|---|---|---|---|---|
| 1 | [BizachiCode/ClashBattle-Server](https://github.com/BizachiCode/ClashBattle-Server) | 2/4/3/4/4/5 | 67.0 | 1 | 1 | 2026-09-30 | Node/TS/Colyseus/Express/TypeORM/MySQL |
| 2 | [baderkamal-dev/Crown-Clash](https://github.com/baderkamal-dev/Crown-Clash) | 2/3/3/5/0/5 | 58.0 | 0 | 4 | 2026-09-01 | JavaScript/Canvas2D |
| 3 | [ironiamison/clash-arena](https://github.com/ironiamison/clash-arena) | 2/3/2/5/1/0 | 47.0 | 1 | 3 | 2026-06-27 | TypeScript/Phaser/Vite/Node ws |
| 4 | [ataberkus/age-of-war-clone](https://github.com/ataberkus/age-of-war-clone) | 1/3/3/5/1/0 | 44.0 | 1 | 29 | 2026-07-18 | React/TS/Canvas/Supabase |
| 5 | [BOSS-BigOpenSourceSibling/realtimecardgame](https://github.com/BOSS-BigOpenSourceSibling/realtimecardgame) | 4/2/2/1/0/0 | 41.0 | 0 | 45 | 2020-11-08 | Unity2019.4/C# |
| 6 | [pedrodelyra/realtimecardgame](https://github.com/pedrodelyra/realtimecardgame) | 4/1/2/1/0/0 | 37.0 | 0 | 19 | 2020-09-30 | Unity2019.4/C# |
| 7 | [ciro-unity/UnityRoyale-Public](https://github.com/ciro-unity/UnityRoyale-Public) | 2/2/3/2/0/0 | 35.0 | 1178 | 5 | 2021-05-02 | Unity2020.3/URP/C# |

## BOSS-BigOpenSourceSibling/realtimecardgame

Commit [`9b812a84ccbc`](https://github.com/BOSS-BigOpenSourceSibling/realtimecardgame/tree/9b812a84ccbc9a552244a9905c5fd0ad965b086b); archived=False; metadata updated=2025-08-25T16:54:42Z.

**Đã có:** GameRoom local, dummy deck, deploy, projectile, multi-deploy, animation; sau chơi rút bù ngay khác documented CC.

**License:** Không có license repo rõ; asset vendors riêng.

**Khả năng chạy/thiếu/khuyến nghị:** Chưa chạy Unity; cần editor2019.4.9f1. Không tìm thấy network trong files đã review. Fork của pedrodelyra; không phải hai foundation độc lập.

## pedrodelyra/realtimecardgame

Commit [`f7d0731462e2`](https://github.com/pedrodelyra/realtimecardgame/tree/f7d0731462e2c0418074a2312d47e192f242ff04); archived=False; metadata updated=2020-09-23T11:02:49Z.

**Đã có:** Core lane/dealer/hand/attack/visual scripts; scaffold local.

**License:** Không có license repo rõ.

**Khả năng chạy/thiếu/khuyến nghị:** 19 commits default branch; chưa chạy Unity; thiếu production account/PvP/economy. Tham khảo cấu trúc, không copy.

## ciro-unity/UnityRoyale-Public

Commit [`d51081a323d7`](https://github.com/ciro-unity/UnityRoyale-Public/tree/d51081a323d73164866042a38dc93a3fecef2834); archived=False; metadata updated=2026-10-11T09:59:22Z.

**Đã có:** CardData, CPUOpponent, projectile, particle pool, Addressables, toon shading, Timeline.

**License:** Assets/License.pdf: personal/non-commercial, non-distribution.

**Khả năng chạy/thiếu/khuyến nghị:** README nói simplified AI và demo mobile; không có bằng chứng PvP server. License hạn chế xung đột lời quảng bá; không foundation thương mại.

## baderkamal-dev/Crown-Clash

Commit [`cf6575689dac`](https://github.com/baderkamal-dev/Crown-Clash/tree/cf6575689dacc7edc53b31c271b5379b67886c01); archived=False; metadata updated=2026-09-01T23:20:37Z.

**Đã có:** Procedural art/audio, fixed-step loop, AI, cards/combat/UI; không online.

**License:** MIT (đã đọc LICENSE).

**Khả năng chạy/thiếu/khuyến nghị:** Đã build46 modules/2365KiB và node --check bundle pass; chưa chơi browser. Ba tower/elixir và rules Clash Royale khác game đích; lấy pattern có attribution, không giữ tên/nhận diện.

## ironiamison/clash-arena

Commit [`19d0654f3824`](https://github.com/ironiamison/clash-arena/tree/19d0654f3824a2c62da8e2d7f79795733f4e9a51); archived=False; metadata updated=2026-09-19T01:23:46Z.

**Đã có:** Pure sim, modes, collection/economy, relay tick/input, result từ client.

**License:** Không có root license; vài asset pack CC0 không cấp phép code.

**Khả năng chạy/thiếu/khuyến nghị:** Đọc server/index.mjs: relay không tính battle combat; không đạt server authority. Chưa install/run, asset bundle lớn và root rights chưa rõ.

## ataberkus/age-of-war-clone

Commit [`f986be20a689`](https://github.com/ataberkus/age-of-war-clone/tree/f986be20a689da243981af1a7b37b8447bc6def0); archived=False; metadata updated=2026-08-25T05:33:20Z.

**Đã có:** HostSync áp input, gửi state0.125s; guest vẽ shadow; unit queue, AI, ages.

**License:** Không có root license.

**Khả năng chạy/thiếu/khuyến nghị:** Có multiplayer code nhưng host là client, không trusted server; một lane, không card deck. Chưa chạy cần Supabase configuration.

## BizachiCode/ClashBattle-Server

Commit [`2b61894901c5`](https://github.com/BizachiCode/ClashBattle-Server/tree/2b61894901c5040380bffa495cf07bf867985b02); archived=False; metadata updated=2026-09-30T13:17:18Z.

**Đã có:** BattleRoom setSimulationInterval → session.step; authoritative combat, room validation hooks, result settlement; nhiều meta systems.

**License:** MIT (đã đọc LICENSE).

**Khả năng chạy/thiếu/khuyến nghị:** Một commit nên chưa chứng minh maintenance history. Source review có authority, chưa runtime/load/security audit; data export và Unity client ngoài scope repo. Thích hợp tham khảo protocol/modules, không dùng nguyên ruleset.

## Mở rộng tìm kiếm và loại nhiễu

Đã tìm nhóm Castle Crush clone/source, realtime card game, three-lane/card PvP, lane-based strategy, Clash Royale clone, Phaser card battle, Three.js multiplayer strategy và Babylon lane battler. Đã xem GitHub Topics card-game, GitHub search API và parent fork của realtimecardgame. Không khẳng định tìm hết GitHub.

- [Raffiesaurus/bubble-brawl](https://github.com/Raffiesaurus/bubble-brawl): README mô tả Unity, ba lane, MIT, game jam48h. Tham khảo mô hình lane; chưa code audit nên không chấm ngang bảy repo chính.
- [colyseus/colyseus](https://github.com/colyseus/colyseus): framework multiplayer, không game tương đương; ứng viên stack TypeScript nếu C# offline spike không đạt.
- [gururise/CastleCrush](https://github.com/gururise/CastleCrush): Rampart/Godot, tên trùng, loại vì sai game.
- Deckborn turn-based/Pygame, SoulRealms Java terminal, Babylon runner và tower-defense khác không chứng minh CC mechanics.

Decision: viết core theo đặc tả riêng. Có thể tái sử dụng có chọn lọc MIT patterns từ Crown-Clash và ClashBattle-Server sau tests/license attribution; không import cả progression/card names/assets của game khác. UnityRoyale chỉ đọc ý tưởng; PDF license phải được làm rõ bằng văn bản trước mọi distribution. Build thử Crown không chứng minh chơi hoàn chỉnh hay performance mobile; engine benchmark của dự án vẫn chưa thực hiện.
