from build_research_docs import *

# Atomic features: evidence status is distinct from implementation/parity status.
groups = {
'Battle': [
('Ba lane','WP21','Confirmed','P0'),('HP thành chung','WP21','Confirmed','P0'),('Thành không tự tấn công','WP21','Confirmed','P0'),('Phá thành thắng trận','WP21','Confirmed','P0'),('Vùng triển khai tiến theo quân','WIKI-DEPLOY','Unverified','P0'),('Quân tự di chuyển','WP21','Confirmed','P0'),('Target đầu tiên vào tầm','WP21','Confirmed','P0'),('Melee/ranged','STORE-IOS','Confirmed','P0'),('Projectiles/hit timing',None,'Unknown','P0'),('Collision/retarget',None,'Unknown','P0'),('AOE/splash','WIKI-Bomb','Unverified','P0'),('Healing','STORE-IOS','Confirmed','P0'),('Buff/debuff','SUP-12684766514577','Confirmed','P0'),('Knockback/đổi lane','WIKI-DEPLOY','Unverified','P0'),('Stun/freeze','WIKI-Ice_Elemental','Unverified','P0'),('Shield/armor','WIKI-Cards','Unverified','P1'),('Summon/multi-lane','WIKI-Shaman','Unverified','P0'),('Copy/transformation','SUP-12684727124113','Confirmed','P0'),('Death/resurrection','WIKI-Cards','Unverified','P1'),('Overtime','SUP-12694401083537','Confirmed','P0'),('Không hòa; tie-break chưa rõ','WP21','Confirmed','P0')],
'Cards':[
('Deck 7→14','SUP-12684724253329','Confirmed','P0'),('Duplicate limit','SUP-12684724253329','Confirmed','P0'),('Năm deck slots','SUP-12684724253329','Confirmed','P1'),('Tay 5 tối đa 6','SUP-12684698308625','Confirmed','P0'),('Shuffle theo deck cycle','SUP-12684698308625','Confirmed','P0'),('Burn khi tay đầy','SUP-12684698308625','Confirmed','P0'),('Rút trả 5 mana khi tay rỗng','SUP-12684698308625','Confirmed','P0'),('Double cards','SUP-12684758851089','Confirmed','P0'),('Mana/crystals/Extra Crystal','SUP-12684758284689','Confirmed','P0'),('Discard thẻ','WIKI-Cards','Unverified','P0'),('Collection/detail','SUP-12684766514577','Confirmed','P1'),('Bốn rarity base','WP21','Confirmed','P1'),('Roster 68 lịch sử','SUP-12680882809105','Confirmed','P0'),('Stats từng thẻ/level',None,'Unknown','P0'),('Upgrade cards+gold','SUP-12684766514577','Confirmed','P1')],
'Player':[
('Tutorial','SUP-12684589127825','Confirmed','P1'),('Guest trước liên kết','SUP-12684767583249','Strongly Inferred','P1'),('Save/restore account','SUP-12684767547665','Confirmed','P1'),('Player ID','SUP-12684589127825','Confirmed','P1'),('Tên không sửa','SUP-12684752821649','Confirmed','P1'),('Flag theo locale','SUP-12684767612689','Confirmed','P2'),('Avatar/profile cosmetics',None,'Unknown','P2'),('Player XP/level','WP21','Confirmed','P1'),('Player level ảnh hưởng castle HP','WP21','Confirmed','P0'),('Profile statistics',None,'Unknown','P2'),('Account deletion','SUP-12679594402577','Confirmed','P1')],
'Progression':[
('Trophy gain/loss','SUP-12684773222289','Confirmed','P1'),('Castles unlock','SUP-12684760339601','Confirmed','P1'),('Leagues','SUP-12684758554769','Confirmed','P1'),('Season reset','SUP-12684758554769','Confirmed','P1'),('Forge boost tạm','SUP-12684776797201','Confirmed','P1'),('Forge mở max level','SUP-12684732708113','Confirmed','P1'),('Leaderboard global','STORE-IOS','Confirmed','P1'),('Battle history/replay','SUP-12684817694481','Confirmed','P1'),('Achievements trong game',None,'Unknown','P2')],
'Economy':[
('Gold','SUP-12684766514577','Confirmed','P1'),('Gems','SUP-12684817774993','Confirmed','P1'),('Forge crystals','SUP-12684776797201','Confirmed','P1'),('Shop cards/chests','SUP-12684752380945','Confirmed','P1'),('Battle chest slots/unlock','WP21','Confirmed','P1'),('Free/Victory chests','SUP-12684731365521','Confirmed','P1'),('Daily coin limit','SUP-12684722867985','Confirmed','P1'),('Piggy Bank','SUP-12684752705169','Confirmed','P2'),('Gem Capsule','SUP-12684817656721','Confirmed','P2'),('IAP/subscription','SUP-12684817774993','Confirmed','P2'),('Daily shop reshuffle/reroll','SUP-12684817774993','Confirmed','P2'),('Drop odds/current prices',None,'Unknown','P1')],
'Multiplayer':[
('Online 1v1','STORE-ANDROID','Confirmed','P0'),('Trophy-based matchmaking','WP21','Confirmed','P0'),('Friendly clan battles','SUP-12684695238289','Confirmed','P1'),('Casual standalone queue',None,'Unknown','P2'),('Reconnect behavior gốc',None,'Unknown','P0'),('Surrender/rematch',None,'Unknown','P2'),('Result/reward','SUP-12684773222289','Confirmed','P0'),('Practice bots','SUP-12684746317201','Confirmed','P0'),('Bot difficulty selector',None,'Unknown','P2'),('Bot policy nội bộ',None,'Unknown','P0')],
'Social/LiveOps':[
('Clan create/join/roles','SUP-12684817694481','Confirmed','P1'),('Clan chat','SUP-12684817694481','Confirmed','P1'),('Card donations','SUP-12684689322385','Confirmed','P1'),('Clan leaderboard','SUP-12684817694481','Confirmed','P1'),('Friend list riêng',None,'Unknown','P2'),('Daily game modes','SUP-12684689584017','Confirmed','P1'),('Championship/tournaments','SUP-12684749806609','Confirmed','P1'),('Stickers/mute','SUP-12684689867537','Confirmed','P2'),('Daily/weekly quests',None,'Unknown','P2'),('Battle pass',None,'Unknown','P2'),('Push notifications',None,'Unknown','P2'),('Inbox', 'SUP-12684746317201','Confirmed','P2')],
'Ascension':[
('Ascended/Founder tier','SUP-12680882809105','Confirmed','P1'),('NFT stats/skins/animation','SUP-12680882809105','Confirmed','P1'),('ACS/AP rewards','SUP-12680883480849','Confirmed','P2'),('NFT upgrade reward rate','SUP-12680837016721','Confirmed','P2'),('Marketplace/rent/mint','SUP-12680836810129','Confirmed','P2')]
}
features=[]
for group, rows in groups.items():
    for name,src,conf,p in rows:
        if src and not any(s['id']==src for s in sources):src=None;conf='Unknown'
        features.append(dict(id=f'F{len(features)+1:03}',group=group,name=name,source_ids=[src] if src else [],confidence=conf,live_2026_verified=False,priority=p,implementation='Not started',parity='Not tested',scope='Documented/historical' if src else 'Needs verification'))
dump('data/feature-inventory.json',features)
write('02-feature-specs/feature-inventory.md',f'''
# Feature inventory

**{len(features)} hạng mục khảo sát trong {len(groups)} nhóm**, không phải tuyên bố game có đúng {len(features)} tính năng. Hạng mục Unknown được giữ để tránh biến “không tìm thấy” thành “không tồn tại”. Số module triển khai đề xuất: 16, xem architecture.

Confirmed chỉ áp dụng phạm vi bài hỗ trợ/whitepaper; **0 hạng mục được live-test trên 6.8.0** trong lượt này. NFT/Founder ảnh hưởng sức mạnh nên nằm trong parity scope; không được âm thầm bỏ để tuyên bố 100% base game. Giao dịch blockchain là nhánh mở rộng có gate riêng.

| ID | Nhóm | Hạng mục | Tin cậy | Nguồn | Ưu tiên |
|---|---|---|---|---|---|
'''+ '\n'.join(f"| {f['id']} | {f['group']} | {f['name']} | {f['confidence']} | {link(f['source_ids'][0]) if f['source_ids'] else 'Chưa có'} | {f['priority']} |" for f in features)+'''

Acceptance tối thiểu của mọi tính năng: happy path, thiếu quyền/tài nguyên, retry, offline, concurrency nếu ghi dữ liệu; test gắn ruleset và evidence. Không tạo friend/quest/pass module production trước xác minh; extension interface đủ cho giai đoạn đầu.
''')

names='Skeletons|Warrior|Archers|Dwarf|Bomb|Siege Ballista|Orc Warrior|Inferno|Jester|Mage|Demon|Golem|Executioner|Pirate|Lightning|Black Knight|Standard Bearer|Skeletons Swarm|Arrows|Dryad|Stone Statue|Reaper|Skull King|Triplets|Gust of Wind|Rage|Genie|Metamorph|Archer\'s Tribe|Meteor|Blizzard|Spectre|Unchained Demon|Black Witch|Shaman|Nature Heal|Mud Elemental|Catapult|Mana Ritual|Resurrection|Hollow Knight|Archer\'s Queen|Ape Pirate|Skeletons Legion|Extra Crystal|Protection|Shock|Vampire|Phoenix|Giant Growth|Spiked Statue|Boneyard|Fortify|Storm Elemental|Dragon|Angel|Fan Dancer|Skull Queen|Valkyrie|Necromancer|Dark Angel|Poison|Ice Elemental|Fire Elemental|Enchanter'.split('|')
names.append('Orc Horde')
reported={
'Warrior':dict(cost=3,hp=240,damage=60,rarity='Common',category='Minion',movement_speed_raw=10,attack_range='Melee'),
'Golem':dict(cost=4,hp=1080,damage=30,rarity='Common',category='Minion',movement_speed_raw=4,attack_range='Melee'),
'Orc Warrior':dict(cost=5,hp=827,damage=94,rarity='Rare',category='Minion',movement_speed_raw=7,attack_range='Melee'),
'Skull King':dict(cost=10,hp=999,damage=113,rarity='Epic',category='Minion',movement_speed_raw=5,attack_range='Melee',special_abilities='12 skeletons, 4/lane reported'),
'Ice Elemental':dict(cost=6,hp=557,damage=268,rarity='Rare',category='Minion',movement_speed_raw=5,attack_range=25,special_abilities='freeze reported; bảng level 7 bất thường'),
'Shaman':dict(cost=6,hp=515,damage=268,rarity='Legendary',category='Minion',movement_speed_raw=5,attack_range=25,special_abilities='2 clones ở lane khác; cần đo HP/damage'),
"Archer's Queen":dict(cost=8,hp=472,damage=172,rarity='Legendary',category='Minion',movement_speed_raw=5,attack_range=50,special_abilities='buff ranged reported'),
"Archer's Tribe":dict(cost=6,hp=80,damage=20,rarity='Common',category='Minion',special_abilities='2 archers/lane; range trong bảng mâu thuẫn'),
'Spectre':dict(cost=6,hp=484,damage=65,rarity='Epic',category='Minion',special_abilities='bonus theo quân đồng minh; bảng level 6 bất thường'),
'Bomb':dict(cost=None,cost_candidates=[1,2],damage=80,rarity='Common',category='Spell',special_abilities='AOE damage reported'),
'Dark Angel':dict(cost=None,cost_candidates=[6,7],hp=1008,damage=258,rarity='Legendary',category='Minion',special_abilities='growth on cursed enemy death reported'),
'Poison':dict(cost=4,damage=190,rarity='Common',category='Spell',special_abilities='DoT 5.85s; damage interpretation chưa rõ'),
'Mana Ritual':dict(cost=2,rarity='Epic',category='Spell',special_abilities='discount 3 mana reported; stacking cần đo')}
official={
'Extra Crystal':('SUP-12684758284689','Thêm crystal; nếu đã 12 thì rút lá.'),
'Mana Ritual':('SUP-12684727124113','Giới hạn level thẻ sau; mapping giữa rarity chưa đủ.'),
'Giant Growth':('SUP-12684727124113','Có giới hạn level thẻ bị tác động; tỷ lệ tăng và thời hạn chưa rõ.'),
'Metamorph':('SUP-12684727124113','Copy thẻ ngẫu nhiên trên battlefield; level copy theo Metamorph.'),
'Meteor':('SUP-12684766514577','Upgrade tăng damage.'),
'Blizzard':('SUP-12684766514577','Upgrade tăng duration.')}
fields=['category','rarity','cost','hp','damage','attack_speed','movement_speed','attack_range','target_types','special_abilities','level_scaling','animation','effects','unlock_condition','upgrade_costs']
cards=[]
for name in names:
    sid='WIKI-'+name.replace(' ','_').replace("'",'%27')
    src=[sid] if any(s['id']==sid for s in sources) else ['WIKI-Cards']
    if name in ['Fire Elemental','Enchanter']:src=['COMMUNITY-ENCHANTER']
    if name=='Orc Horde':src=['VIDEO-ORC-HORDE']
    c=dict(id=re.sub('[^a-z0-9]+','_',name.lower()).strip('_'),name=name,baseline='CC-public-2026-10-13',name_confidence='Unverified',source_ids=src,**{f:None for f in fields})
    c['null_reasons']={f:'Chưa có dữ liệu phiên bản/đơn vị/level được kiểm chứng để đưa vào runtime.' for f in fields}
    c['reported_observations']=dict(reported.get(name,{}),level=1,confidence='Unverified',scope='Wiki lịch sử, không phải canonical stats') if name in reported else None
    if name in official:
        s,b=official[name];c['special_abilities']=b;c['source_ids'].append(s);c['name_confidence']='Confirmed';c['null_reasons'].pop('special_abilities')
    if name=='Dark Angel':c['source_ids'].append('WP21');c['name_confidence']='Confirmed'
    cards.append(c)
dump('data/card-catalog.json',dict(catalog_complete=False,expected_historical_count=68,identified_candidates=len(cards),unidentified_slots=68-len(cards),cards=cards))
write('01-research/card-catalog.md',f'''
# Card catalog — dữ liệu nghiên cứu, chưa phải balancing database

Whitepaper tr.6 và support Ascended ghi **68 thẻ** ở baseline tài liệu. Đã định danh **{len(cards)} tên ứng viên**; còn **{68-len(cards)} slot chưa định danh**. Không tạo tên giả để lấp đủ 68; các alias và thẻ mới phải đối chiếu collection 6.8.0. [Nguồn 68]({sup(12680882809105)}).

[JSON đầy đủ](../data/card-catalog.json) có toàn bộ 15 trường yêu cầu, null reason từng trường, nguồn từng record và observations tách biệt. Mọi HP/damage/cost dưới đây chỉ là **giá trị wiki báo cáo ở level 1, Unverified**, canonical runtime vẫn `null`. `—` nghĩa `null`, không phải 0. Attack speed, animation, target mask và level scaling chính xác chưa xác minh cho mọi thẻ. Tốc độ/range số trên wiki thiếu đơn vị nên không đổi sang mét/s.

| ID | Tên | Loại báo cáo | Rarity báo cáo | Cost báo cáo | HP L1 | Damage L1 | Nguồn |
|---|---|---|---|---|---|---|---|
'''+ '\n'.join(f"| `{c['id']}` | {c['name']} | {(c['reported_observations'] or {}).get('category','—')} | {(c['reported_observations'] or {}).get('rarity','—')} | {(c['reported_observations'] or {}).get('cost') if (c['reported_observations'] or {}).get('cost') is not None else '—'} | {(c['reported_observations'] or {}).get('hp','—')} | {(c['reported_observations'] or {}).get('damage','—')} | {link(c['source_ids'][0])} |" for c in cards)+'''

## Bất thường và cách sử dụng

Bomb/Dark Angel có cost mâu thuẫn ngay trong cùng trang; không chọn số thuận tiện. Ice Elemental, Spectre có bảng level bất thường. Không lấy công thức 10% áp cho mọi stat: whitepaper có nói ngoại lệ, rounding cũng chưa công khai. Unlock theo castle của wiki mâu thuẫn giữa trang Cards và Castle, nên chỉ dùng làm đầu mối đo.

Importer production phải từ chối card thiếu trường bắt buộc theo loại ability. Thẻ không có HP (spell thuần) cần `not_applicable` sau xác minh, khác `null/unknown`. Record hiện tại giữ Unknown vì cả category canonical chưa đủ chứng cứ cho nhiều thẻ. Asset names gốc chỉ dùng trong nghiên cứu, ID/names public khi phát hành phải có bộ nhận diện riêng.

Với từng thẻ: chụp màn detail → kiểm tra 3 level hoặc đủ level có thể tiếp cận → đo deployment/first-hit/cooldown trong friendly → 3 lane × melee/ranged/air/castle × buff interactions → ghi fixture và expected trace. Chưa hoàn tất bước này thì chưa gọi roster implementation-ready.
''')

write('02-feature-specs/card-system.md',f'''
# Card System Specification

## Luật documented

Deck mới 7 lá, không lặp; đạt 200 trophy mở 14, tối đa 2 bản thường và 1 Legendary; lưu tối đa 5 deck. Trận dùng deck đang được chọn. [Deck]({sup(12684724253329)}). Mở 14 có tiếp tục giữ khi tụt dưới 200 không: Unknown, cần flag progression thay vì tính lại bằng trophy hiện tại.

Tay 5, cap 6, shuffle mỗi deck cycle; đầy tay làm mất lá rút; tay rỗng có action rút trả 5 mana. [Draw]({sup(12684698308625)}). Double-card đã nêu trong gameplay; không tự cho rằng dùng một lá sẽ rút bù ngay như game khác.

## Data contract đề xuất

`CardDefinition(id, revision, rarity, kind, costPolicy, spawnGroup, targetPolicyId, abilities[], levelStats[], assetKey)`; `CardInstance(instanceId, definitionId, effectiveLevel, tier)`; deck là **list instance slot**, không phải set. Tách base rarity khỏi Ascended/Founder tier. `LevelStats` là lookup có provenance, không phải mỗi thẻ nhân một công thức chung.

`DeckSnapshot` đóng băng khi match tạo: card revisions, ownership, base/forged/tier levels, mode overrides. Forge hết hạn giữa trận không sửa snapshot. Quy tắc này là Proposed, phải đối chiếu bản gốc.

```text
validateDeck(player, deck, mode):
  require deck.slot in [0..4] and optimisticRevision matches
  require size == unlockedDeckSize(player, ruleset)
  require every card owned, unlocked, permittedByMode
  count by canonical card definition (not cosmetic / NFT instance)
  require each count <= duplicateLimit(definition, ruleset)
  snapshot = resolveEffectiveLevels(mode, forge, tier, now)
  persist atomically or return typed error; never partial save

drawOne(player, cause):
  if drawBag exhausted: shuffle full deck with private seeded RNG
  card = drawBag.consumeNext()
  if hand full: emit CardBurned
  else hand.add(new card instance)
  apply crystal gain according to cause policy (OPEN GAP U02)
```

`drawOne` là thuật toán Proposed bao quanh luật documented. Tách cause `initial`, `scheduled`, `double`, `paid`, `extraCrystal`; chưa xác minh crystal gain cho từng cause. Không gọi lại drawOne vô hạn khi Extra Crystal ở cap. Double + tay5 có hai policy candidate `draw_only_available_slots` và `consume_and_burn`; parity gate bắt chọn dựa trên trace.

Command play dùng `handInstanceId` và revision, không index mảng thay đổi. Server kiểm tra mana, target, vùng hợp lệ trước khi trừ thẻ/mana trong cùng tick. Input bị reject không đổi state. Hai play cùng instance: chỉ một accepted. Discount/level cap của Mana Ritual dùng policy riêng; cap cost floor, stacking và cross-rarity mapping đang Unknown.

Acceptance: deck validation, 14-draw permutation với duplicates, full-hand burn, empty-hand purchase, reject stale/replayed play; toàn bộ có seed+trace. [Test cases](../04-development/testing-strategy.md).
''')

write('02-feature-specs/game-rules.md',f'''
# Game Rules Specification

Luật original nằm trong [battlefield](../01-research/gameplay-analysis.md) và [card-system](card-system.md). Đây là contract để triển khai, không tự bổ sung luật gốc.

| Rule ID | Bất biến / điều kiện | Loại |
|---|---|---|
| R01 | Có đúng 2 participants, 3 lane, 2 castle HP pools | Confirmed tài liệu |
| R02 | Input hợp lệ tiêu mana theo thẻ và tạo effect/unit | Confirmed tài liệu; atomicity Proposed |
| R03 | Unit tiến về thành đối phương; mục tiêu trong tầm chặn tiến tùy policy | Confirmed mức mô tả; details U05 |
| R04 | Một castle về 0 → FINISHING; chốt kết quả chỉ một lần | Win condition Confirmed; ordering Proposed |
| R05 | Hai castle cùng lethal: cần original tie-break | Unknown; strict parity phải block |
| R06 | Overtime bắt đầu 240s, damage tự tăng theo thời gian | Confirmed support; curve Unknown |
| R07 | Practice không trophy/chest; Friendly không trophy/gold/chest | Confirmed support |
| R08 | Result từ server, không nhận winner client gửi | Proposed security |
| R09 | Animation/FPS không làm đổi kết quả | Proposed architecture |

## Ruleset và readiness

Mỗi ruleset có `id, schemaVersion, evidenceBaseline, contentHash, parameters, confidence, readiness`. Hai profile:

- `documented`: values có nguồn; unknown `null`; chỉ chạy scenario không phụ thuộc unknown hoặc báo `RULE_UNRESOLVED` rõ ràng.
- `lab`: explicit override có chủ sở hữu/decision ID; có thể chơi technical slice nhưng không tính parity. Ví dụ speed/range demo được phép thiết kế **sau research gate**, không ghi ngược vào catalog gốc.

Mọi match lưu ruleset hash. Config mới chỉ áp dụng match mới. Không áp bảng shop/economy demo lên account thật. Luật overtime và tie-break không thể giấu sau magic number.

Không xác nhận surrender/rematch/casual queue gốc. Khi làm feature web mới phải gắn Proposed và loại khỏi tử số original parity. Một disconnect không đồng nghĩa người chơi chủ động surrender.
''')

write('02-feature-specs/battle-state-machine.md','''
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
''')

write('02-feature-specs/progression.md',f'''
# Progression Specification

Original: trophy quyết định castle/league; upgrade tạo player XP; level người chơi liên quan HP thành. Whitepaper tr.8 mô tả +10% HP/level nhưng base HP/rounding chưa rõ. [Unlock]({sup(12684760339601)}), {link('WP21')}. Không đồng nhất arena/castle đã mở với castle HP level.

Theo support trophy: thắng đối thủ cùng trophy được +30; đối thủ nhiều hơn → nhiều hơn 30, ít hơn → ít hơn 30; chiều thua tương ứng. **Không đủ để khẳng định Elo hoặc công thức đầy đủ.** [Trophies]({sup(12684773222289)}).

Season tài liệu: 3 tuần; League thresholds 3800/4200/4600/5000/5400/5800/6200/6600/7000; công thức reset không công khai. [Season]({sup(12684758554769)}). Quyền sở hữu thẻ, XP curve, arena drop floor và cap level hiện hành đều cần bảng versioned.

## Thiết kế web

`PlayerProgress`: xp, playerLevel, trophy, highestTrophy, unlockedCastleIds, maxUnlockedDeckSize, seasonBestLeague, revision. `ProgressionCatalog`: xpByLevel[], castleThresholds[], rewards[], trophyPolicyVersion. XP overflow xử lý nhiều level bằng while đến threshold kế tiếp; không suy giá trị threshold từ level trước.

Upgrade trong DB transaction: khóa wallet + playerCard; kiểm tra copies/gold → trừ copies theo bảng tiêu hao → tăng level → award XP → update version → outbox event. Thiếu stats/upgrade table phải reject `CONTENT_INCOMPLETE`; không fallback linear.

Forge tách `permanentLevelCap` và `boostExpiresAt`. Support yêu cầu matching rarity crystals, magic crystal cho mở cap theo điều kiện và vẫn cần upgrade cards/gold; boost tạm +1 trong24h. [Forge]({sup(12684732708113)}), [Crystals]({sup(12684776797201)}).

Season job chốt snapshot theo seasonId, xếp hạng với tie policy được duyệt, một reward grant/player/season. Retry không trao lại. Không reset mọi account ngay khi app mở. Hiển thị best/current, lịch kết thúc từ server. Test: boundary 199/200, xp đủ2levels, concurrent upgrade, reset worker chạy2lần, Forge hết hạn khi offline và trong battle.
''')

write('02-feature-specs/economy.md',f'''
# Economy Specification

| Hệ thống | Nguồn / điều đã biết | Tham số chưa biết |
|---|---|---|
| Gold/card copies | Upgrade tiêu copies+gold | Bảng cost/copies/XP hiện hành |
| Gems | Shop/chest/continue/subscription | Giá theo vùng, entry/continue curve |
| Free/Victory chest | 4h/24h, mỗi loại stack2 | Mốc bắt đầu, reset timezone và content odds |
| Battle chest | Whitepaper: slots4, unlock1, Silver3h | Current rotation/drop table |
| Daily gold | Giới hạn số lần thắng được coins | Số lần và reset timezone |
| Forge crystals | Common/Rare/Epic/Legendary/Magic | Cost table từng thẻ |

Nguồn: [Upgrade]({sup(12684766514577)}), [Chests]({sup(12684731365521)}), [Daily limit]({sup(12684722867985)}), {link('WP21')} tr.7. Đừng nhầm Victory Chest định kỳ với chest nhận sau một trận thắng.

Piggy Bank tích lũy qua mở chest; đầy phải mở trong24h bằng gems, không carry-over chest mở sau khi đầy. Gem Capsule nhận từ Victory Chest, tích chi tiêu gems trong24h, mở miễn phí khi đầy; các threshold `null`. [Piggy]({sup(12684752705169)}), [Capsule]({sup(12684817656721)}).

Subscription có thêm gems Free Chest, shop reshuffle, chiết khấu/reroll một số chest; entitlement và live availability cần kiểm tra. [Perks]({sup(12684817774993)}). Không coi shop price của một nước là global.

## Transaction model Proposed

Ledger bất biến, mỗi transaction có reason, idempotencyKey, playerId, currency, amount integer, sourceEntityId, contentVersion. Số dư không âm; debit/credit/reward/copies cùng transaction. Chests snapshot loot table + arena lúc nhận hay mở là U07; triển khai policy riêng, không chọn ngầm. RNG loot server-only, lưu audit seed quyền truy cập hạn chế và kết quả thực nhận; không gửi seed tương lai cho client.

`openChest`: ownership → unlock timestamp → claim lock → sampled rewards → ledger+collection+claimed flag → outbox. Retry trả receipt cũ. `upgrade` không dùng client price. Refund/reversal tạo bút toán đảo có audit, không xóa lịch sử. IAP web cần payment provider riêng, webhook chữ ký, unique externalTransactionId, server verification; không sử dụng key hoặc product gốc.

## Ascension scope

Tài liệu support phân biệt AP, ACS và NFT card upgrade; tăng NFT upgrade level nâng reward rate, không thêm combat power. [NFT use]({sup(12680837016721)}). Combat tier, Forge crystals và mana crystals là ba khái niệm khác nhau. Giữ branch `Ascension` trong parity inventory; cần xác minh live trước triển khai. Bản lab có thể biểu diễn tier stats trong config; không được gọi tương đương tính năng sở hữu/giao dịch nếu không có marketplace.

Balancing thay thế phải có economy simulator: expected gold/day từ số trận, chest queue, sinks/upgrades; đo time-to-first-upgrade và time-to-unlock. Mọi giá trị là thiết kế mới khi thiếu bản gốc. Không có benchmark retention hay tỷ lệ drop được bịa trong tài liệu này.
''')

write('02-feature-specs/ai-opponent.md',f'''
# AI opponent

Practice đấu Trainer bot theo trophy; không thưởng trophy/chest. [Wildlife]({sup(12684746317201)}). Không có bằng chứng về selector độ khó hoặc thuật toán gốc; không suy tất cả opponent yếu trong ranked là bot.

## Utility AI thay thế — Proposed

Bot sử dụng cùng command validator, mana, hand và deck rules. Không đọc hand/seed tương lai đối thủ. Quan sát `public battlefield + own hand/resources`; reaction tick chỉ kích hoạt mỗi khoảng quyết định. Deck lấy từ archetype đã được designer kiểm tra, lọc theo unlocked cards/level budget, không random 14 lá thiếu synergy.

```text
each decisionTick:
  threats[lane] = estimate enemy time-to-castle and damage pressure
  legal = enumerate card × legal lane × sampled deployment positions
  add Wait, optional PaidDraw if rules allow
  for action in legal:
    score = preventedCastleDamage + counterValue + pushSupport
          + manaEfficiency - overcommitRisk - spellWaste - laneNeglect
    simulate short horizon on copied state when budget permits
  choose seeded softmax(score, temperature)
  enqueue chosen action through same server command path
```

MVP heuristic đủ; không cần LLM chạy trong battle. Planning compute budget Proposed ≤1ms/decision trong load target; profile rồi mới tăng horizon. Tactical information: HP, target tags, range, expected travel, spell immune flags và status expiry; chưa có stats thì dùng lab-only.

Độ khó web mới: Easy phản ứng800–1200ms, candidate subset và noise; Normal400–800ms; Hard200–400ms, horizon sâu hơn. Đây là giá trị **thử nghiệm**, không phải số đo Castle Crush và không tăng mana/HP để gian lận. Seedable để reproduce.

Acceptance: không illegal play qua10000 trận seed; không crash khi tay toàn high cost; giải quyết multi-lane threat; không cast heal fullHP khi còn action có lợi; win-rate monotonic theo difficulty với cùng deck bằng CI/bootstrap. So với bot gốc bằng phân phối reaction, mana waste, lane occupancy, không chỉ win-rate. Offline practice cần simulation cùng version, chi tiết kiến trúc WASM ở simulation-engine.
''')

write('02-feature-specs/multiplayer.md',f'''
# Matchmaking và Multiplayer Specification

Original: realtime1v1, trophy là cơ sở ghép, friendly qua clan; friendly không gold/trophy/chest. Invite active chặn matchmaking, đóng popup hủy request. [Friendly]({sup(12684695238289)}), {link('WP21')} tr.8. Tham số queue expansion, region, reconnect, timeout, surrender/rematch **Unknown**.

## Thiết kế Proposed

Ticket `{{id, playerId, mode, region, rating, deckSnapshotHash, createdAt, expiresAt, version}}`. Một account chỉ một active ticket/match/invite. Ghép cùng ruleset/mode/region trước, khoảng trophy mở rộng theo wait time có config; latency hard cap; không dựa purchase history. Prototype candidate ±100, mở thêm 100 mỗi 10s, cap 600 sau 50s: lab values cần telemetry. Không chèn bot ranked mà không hiển thị.

Claim pair trong transaction/CAS, reserve room → issue participant token one-use → hai client Ready. Load timeout20s Proposed: void, không trao reward/trophy. Queue cancel thắng CAS thì không tạo room, room đã committed thì trả allocation hiện hành thay vì báo canceled giả.

Mất mạng: simulation tiếp tục; giữ slot30s Proposed; reconnect bằng session credential, matchId, lastAck; trả snapshot đầy đủ và command receipts. Quá30s có thể xử forfeit trong web profile, phải đánh dấu deviation nếu chưa đo gốc. Cả hai mất mạng vẫn xử nhất quán; server crash dùng policy recover/void, không đoán winner từ HP snapshot.

Result settlement một lần: terminal event → durable result → transaction trophy/reward/outbox → result receipt. Friendly/Practice reward policy tách riêng. Reconnect sau kết thúc trả cùng receipt. Replay chỉ xem thông tin public trong live; hidden hand không leak qua snapshot/telemetry.

Security: server validate player membership, instance tồn tại, cost, target bounds, cooldown, game status, sequence/rate; clamp không thay cho reject invalid. [Networking chi tiết](../03-technical-design/multiplayer-architecture.md).
''')

if __name__=='__main__': print('Features',len(features),'cards',len(cards))
