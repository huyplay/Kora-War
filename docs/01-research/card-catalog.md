# Card catalog — dữ liệu nghiên cứu, chưa phải balancing database

Whitepaper tr.6 và support Ascended ghi **68 thẻ** ở baseline tài liệu. Đã định danh **66 tên ứng viên**; còn **2 slot chưa định danh**. Không tạo tên giả để lấp đủ 68; các alias và thẻ mới phải đối chiếu collection 6.8.0. [Nguồn 68](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12680882809105-What-are-the-Castle-Crush-NFTs).

[JSON đầy đủ](../data/card-catalog.json) có toàn bộ 15 trường yêu cầu, null reason từng trường, nguồn từng record và observations tách biệt. Mọi HP/damage/cost dưới đây chỉ là **giá trị wiki báo cáo ở level 1, Unverified**, canonical runtime vẫn `null`. `—` nghĩa `null`, không phải 0. Attack speed, animation, target mask và level scaling chính xác chưa xác minh cho mọi thẻ. Tốc độ/range số trên wiki thiếu đơn vị nên không đổi sang mét/s.

| ID | Tên | Loại báo cáo | Rarity báo cáo | Cost báo cáo | HP L1 | Damage L1 | Nguồn |
|---|---|---|---|---|---|---|---|
| `skeletons` | Skeletons | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `warrior` | Warrior | Minion | Common | 3 | 240 | 60 | [Castle Crush Wiki: Warrior](https://castlecrush.fandom.com/wiki/Warrior) |
| `archers` | Archers | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `dwarf` | Dwarf | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `bomb` | Bomb | Spell | Common | — | — | 80 | [Castle Crush Wiki: Bomb](https://castlecrush.fandom.com/wiki/Bomb) |
| `siege_ballista` | Siege Ballista | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `orc_warrior` | Orc Warrior | Minion | Rare | 5 | 827 | 94 | [Castle Crush Wiki: Orc_Warrior](https://castlecrush.fandom.com/wiki/Orc_Warrior) |
| `inferno` | Inferno | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `jester` | Jester | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `mage` | Mage | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `demon` | Demon | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `golem` | Golem | Minion | Common | 4 | 1080 | 30 | [Castle Crush Wiki: Golem](https://castlecrush.fandom.com/wiki/Golem) |
| `executioner` | Executioner | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `pirate` | Pirate | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `lightning` | Lightning | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `black_knight` | Black Knight | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `standard_bearer` | Standard Bearer | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `skeletons_swarm` | Skeletons Swarm | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `arrows` | Arrows | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `dryad` | Dryad | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `stone_statue` | Stone Statue | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `reaper` | Reaper | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `skull_king` | Skull King | Minion | Epic | 10 | 999 | 113 | [Castle Crush Wiki: Skull_King](https://castlecrush.fandom.com/wiki/Skull_King) |
| `triplets` | Triplets | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `gust_of_wind` | Gust of Wind | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `rage` | Rage | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `genie` | Genie | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `metamorph` | Metamorph | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `archer_s_tribe` | Archer's Tribe | Minion | Common | 6 | 80 | 20 | [Castle Crush Wiki: Archer%27s_Tribe](https://castlecrush.fandom.com/wiki/Archer%27s_Tribe) |
| `meteor` | Meteor | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `blizzard` | Blizzard | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `spectre` | Spectre | Minion | Epic | 6 | 484 | 65 | [Castle Crush Wiki: Spectre](https://castlecrush.fandom.com/wiki/Spectre) |
| `unchained_demon` | Unchained Demon | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `black_witch` | Black Witch | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `shaman` | Shaman | Minion | Legendary | 6 | 515 | 268 | [Castle Crush Wiki: Shaman](https://castlecrush.fandom.com/wiki/Shaman) |
| `nature_heal` | Nature Heal | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `mud_elemental` | Mud Elemental | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `catapult` | Catapult | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `mana_ritual` | Mana Ritual | Spell | Epic | 2 | — | — | [Castle Crush Wiki: Mana_Ritual](https://castlecrush.fandom.com/wiki/Mana_Ritual) |
| `resurrection` | Resurrection | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `hollow_knight` | Hollow Knight | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `archer_s_queen` | Archer's Queen | Minion | Legendary | 8 | 472 | 172 | [Castle Crush Wiki: Archer%27s_Queen](https://castlecrush.fandom.com/wiki/Archer%27s_Queen) |
| `ape_pirate` | Ape Pirate | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `skeletons_legion` | Skeletons Legion | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `extra_crystal` | Extra Crystal | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `protection` | Protection | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `shock` | Shock | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `vampire` | Vampire | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `phoenix` | Phoenix | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `giant_growth` | Giant Growth | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `spiked_statue` | Spiked Statue | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `boneyard` | Boneyard | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `fortify` | Fortify | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `storm_elemental` | Storm Elemental | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `dragon` | Dragon | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `angel` | Angel | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `fan_dancer` | Fan Dancer | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `skull_queen` | Skull Queen | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `valkyrie` | Valkyrie | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `necromancer` | Necromancer | — | — | — | — | — | [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards) |
| `dark_angel` | Dark Angel | Minion | Legendary | — | 1008 | 258 | [Castle Crush Wiki: Dark_Angel](https://castlecrush.fandom.com/wiki/Dark_Angel) |
| `poison` | Poison | Spell | Common | 4 | — | 190 | [Castle Crush Wiki: Poison](https://castlecrush.fandom.com/wiki/Poison) |
| `ice_elemental` | Ice Elemental | Minion | Rare | 6 | 557 | 268 | [Castle Crush Wiki: Ice_Elemental](https://castlecrush.fandom.com/wiki/Ice_Elemental) |
| `fire_elemental` | Fire Elemental | — | — | — | — | — | [Deck discussion](https://www.reddit.com/r/Castlecrush/comments/1idi2e0) |
| `enchanter` | Enchanter | — | — | — | — | — | [Deck discussion](https://www.reddit.com/r/Castlecrush/comments/1idi2e0) |
| `orc_horde` | Orc Horde | — | — | — | — | — | [Castle Crush CASTLE 9 + ORC HORDE](https://www.youtube.com/watch?v=SeyOBSo0DkE) |

## Bất thường và cách sử dụng

Bomb/Dark Angel có cost mâu thuẫn ngay trong cùng trang; không chọn số thuận tiện. Ice Elemental, Spectre có bảng level bất thường. Không lấy công thức 10% áp cho mọi stat: whitepaper có nói ngoại lệ, rounding cũng chưa công khai. Unlock theo castle của wiki mâu thuẫn giữa trang Cards và Castle, nên chỉ dùng làm đầu mối đo.

Importer production phải từ chối card thiếu trường bắt buộc theo loại ability. Thẻ không có HP (spell thuần) cần `not_applicable` sau xác minh, khác `null/unknown`. Record hiện tại giữ Unknown vì cả category canonical chưa đủ chứng cứ cho nhiều thẻ. Asset names gốc chỉ dùng trong nghiên cứu, ID/names public khi phát hành phải có bộ nhận diện riêng.

Với từng thẻ: chụp màn detail → kiểm tra 3 level hoặc đủ level có thể tiếp cận → đo deployment/first-hit/cooldown trong friendly → 3 lane × melee/ranged/air/castle × buff interactions → ghi fixture và expected trace. Chưa hoàn tất bước này thì chưa gọi roster implementation-ready.
