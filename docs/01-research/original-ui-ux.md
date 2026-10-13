# Original UI/UX: bằng chứng và ranh giới

Không có live walkthrough đầy đủ. Đây là screen inventory hỗn hợp: màn được nhắc trong support có bằng chứng về sự tồn tại/luồng; layout, animation, error states và API là thiết kế web đề xuất. **Không có API nội bộ Wildlife được giả định.**

| ID | Screen | Mục đích/thành phần | Điều kiện/điều hướng | Evidence |
|---|---|---|---|---|
| S01 | Splash/Loading | Tải catalog/asset tối thiểu; Progress, retry, version | Mở app; READY hoặc retry | Proposed web screen |
| S02 | Onboarding/Guest | Học đặt quân, tạo profile; Tutorial step, nickname | Account mới; Lobby sau tutorial | [How can I find my Player ID?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684589127825-How-can-I-find-my-Player-ID) |
| S03 | Login/Restore | Liên kết hoặc khôi phục; Provider, recovery prompt | Session guest; Lobby; merge không tự ghi đè | [I got a new device. How can I transfer my progress?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684767583249-I-got-a-new-device-How-can-I-transfer-my-progress) |
| S04 | Main Lobby | Vào các vòng lặp; Battle, deck, currencies, chests, practice | Session hợp lệ; Battle/deck/shop/progression | [What is the Practice Mode?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684746317201-What-is-the-Practice-Mode) |
| S05 | Deck Builder | Chọn deck hợp lệ; 5 slots, cards, replace, cost preview | Collection có thẻ; Lobby hoặc Detail | [Building a battle deck](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684724253329-Building-a-battle-deck) |
| S06 | Collection | Duyệt thẻ; Filter, owned/locked, upgrade bar | Session; Detail/Deck | [Upgrading cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684766514577-Upgrading-cards) |
| S07 | Card Detail | Đọc stats/nâng cấp; Stats theo level, copies, upgrade | Thẻ được biết; Collection | [Upgrading cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684766514577-Upgrading-cards) |
| S08 | Battle Lobby | Chốt mode/deck; Mode, selected deck, practice notice | Valid deck; invite không active; Queue | Proposed web screen |
| S09 | Matchmaking | Chờ và hủy; Elapsed, cancel | Ticket; Loading hoặc Lobby | Proposed web screen |
| S10 | Battle | Thao tác chiến đấu; HP, timer, mana, hand, lane ghost, stickers | Match membership; Result | [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) |
| S11 | Result | Kết quả authoritative; Win/loss, reward receipt, return | Match finished; Lobby | Proposed web screen |
| S12 | Shop | Cards/chests/offer; Price/currency/stock, buy | Session, offer gate; Receipt/Chest | [What are the subscription perks?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684817774993-What-are-the-subscription-perks) |
| S13 | Chest Opening | Nhận vật phẩm; Timer, unlock, claim, reward reveal | Owner; Lobby/collection | [How do Free Chests and Victory Chests work?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684731365521-How-do-Free-Chests-and-Victory-Chests-work) |
| S14 | Progression/League | Đường trophy và season; Castle threshold, league, timer | Session; Lobby | [Season's Reset](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684758554769-Season-s-Reset) |
| S15 | Forge | Boost và mở cap; Crystals, matching rarity, expiry | 3800 trophy documented; Deck | [How to use the Forge?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684732708113-How-to-use-the-Forge) |
| S16 | Rankings | Xếp hạng player/clan; Scope, rank, season | Session; Profile/clan | [How to join/create a clan?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684817694481-How-to-join-create-a-clan) |
| S17 | Profile | Xem thông tin; ID/name/flag; stats chưa rõ | Visibility policy; Lobby | Proposed web screen |
| S18 | Settings | Âm thanh/quality/account; Sliders, language, account, ID | Mở app; Previous | [How can I find my Player ID?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684589127825-How-can-I-find-my-Player-ID) |
| S19 | Clan/Chat | Tìm nhóm và tương tác; Search/create/join, chat, donation | Level3 documented; Friendly/replay | [How to join/create a clan?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684817694481-How-to-join-create-a-clan) |
| S20 | Friendly Invite | Mời clanmate; Message, expiry, cancel/accept | Clan member; Battle hoặc chat | [How to play Friendly Battles?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684695238289-How-to-play-Friendly-Battles) |
| S21 | Daily Modes | Mode luân phiên; Daily reward, week chain, fragments | Castle4 documented; Battle | [Game Modes](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684689584017-Game-Modes) |
| S22 | Championship | 10 vòng và continues; Round, deck preset, prizes, continue | Availability chưa live-check; Battle/Hall of Fame | [Championship](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684749806609-Championship) |
| S23 | History/Replay | Xem lại trận; List, share, playback controls | Clan rules documented; Clan/lobby | [How to join/create a clan?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684817694481-How-to-join-create-a-clan) |
| S24 | Piggy/Capsule | Tích luỹ và claim; Fill, expiry, price/claim | Offer enabled; Receipt | [Piggy Bank](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684752705169-Piggy-Bank) |
| S25 | Ascension/Marketplace | Tier/NFT account state; Entitlement, tier, reward | Gate U09; External marketplace | [What are the Castle Crush NFTs?](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12680882809105-What-are-the-Castle-Crush-NFTs) |

Đã quan sát HUD lịch sử trên whitepaper trang4: HP hai bên trên, cards ở đáy, thanh tài nguyên dưới cards, nút stickers trái dưới. Bố cục full collection/shop/Forge chưa được visually inspected; không cam kết “clone từng pixel”.

UX cần đo original: drag threshold, khoảng an toàn tay, vùng cancel/discard, feedback thiếu mana, ghost preview có hiện đúng target không, multi-touch, thứ tự animation rút/burn, bấm back trong matchmaking và disconnect. Mỗi thao tác lưu clip có build + timestamp. Video nguồn tìm được chưa xem nên không có timestamp được bịa.
