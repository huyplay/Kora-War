from build_specs import *

mechanisms=[
('Spawn','Card/mana/target được chấp nhận tạo quân; instant effect không chứng minh spawn windup=0','WP21','handInstance, owner, lane, x, card revision','Play hợp lệ','Trừ card+mana một lần; tạo spawn group với entity IDs mới','emit Spawned; activateAt=tick+spawnDelay','Card bị chơi hai lần; multi-spawn có lane đầy','Chỉ một debit; các con cùng source command'),
('Movement','Quân tiến về thành địch','WP21','x, speed, lane, side, dt','MOVING và không bị disable','Bước fixed-point; không dựa animation root motion','xNext=clamp(x+direction*speedPerTick, laneBounds)','Đi qua mục tiêu trong một tick; slow hết hạn','Không tunneling nhờ swept range; render30/60/120 cho cùng trace'),
('Target acquisition','Đánh đối tượng đầu tiên vào tầm; tie và ưu tiên chi tiết chưa biết','WP21','sorted lane entities, targetMask, range','Đến điểm xét target','Lọc team/alive/lane/mask, giữ target policy riêng','target=policy.select(eligible,state)','Khoảng cách bằng nhau, target castle và unit đồng thời','Kết quả reproducible; original tie phải đo U05'),
('Collision/stop','Logic body collision chưa công khai',None,'radii, positions, movement intents','Swept khoảng cách trong bước','Không dùng rigid-body impulse mặc định; chặn chỉ theo collision policy','resolveLaneMovement(intents,stableOrder)','Allied overtaking; nhiều quân cùng x; spawn overlap','Không kẹt vô hạn, lane không đổi trừ ability; parity cần trace'),
('Melee','Có quân cận chiến; timing chưa có','WIKI-Warrior','target, windupTicks, intervalTicks, hitTick','Target hợp lệ trong range','Schedule hit; trước hit validate theo policy','if tick==hitTick: enqueueDamage(source,target)','Target chết/ra range khi windup; stun','Không hit trước windup; cooldown bằng simulation ticks'),
('Ranged/projectile','Có đánh xa; projectile logic không thể suy từ VFX','STORE-IOS','origin,targetId, travelPolicy, speed, damage','Commit ranged attack','Projectile authoritative hoặc delayed hit theo card; visual riêng','advance projectile; onImpact enqueueDamage','Homing? target chết, đổi lane, projectile bị hủy','Một projectile không double-hit; expiry cleanup'),
('AOE/splash','Wiki Bomb mô tả area damage','WIKI-Bomb','center, radius/shape, lane mask, target mask','Spell/hit impact','Snapshot candidates rồi lọc hình dạng, sort ID, tạo damage batch','victims=queryArea(shape); emit damage per victim','Rìa AoE, multi-lane, castle immune','Mỗi victim đúng một hit; boundary inclusive config'),
('Damage resolution','Castle/unit HP giảm bởi combat','WP21','damage intents, modifiers, target HP','Resolve phase','Fixed-point math và rounding định nghĩa trong ruleset; không armor tự phát','applied=damagePolicy.resolve(intent); hp=max(0,hp-applied)','Overkill, simultaneous hits, source đã chết','Conservation với clamping; terminal xử sau batch'),
('Buff/debuff','Một số chỉ số và spell duration tăng theo level','SUP-12684766514577','effectId, source, magnitude, duration','Ability hoặc aura kích hoạt','Modifier stack theo group/policy; expiry tick; không cộng vô hạn tự động','effectiveStat=applyOrderedModifiers(base,activeEffects)','Hai Rage, aura source chết, dispel','Apply/remove đảo đúng; stacking original Unknown'),
('Healing','Store nhắc heal spell','STORE-IOS','target, amount, maxHp, healMask','Heal event','Clamp tối đa maxHP; dead unit không hồi sinh trừ ability riêng','hp=min(maxHp,hp+healAmount)','Heal cùng lethal; tăng maxHP; overheal','Không vượt max; ordering phải fixture hóa'),
('Shield/armor','Có tên Protection trên card index; công thức chưa biết','WIKI-Cards','shieldHp/charges/immuneMask','Damage event có effect','Mỗi card chọn absorb/immune/reduction; không mặc định chung','damage=shieldPolicy.consume(damage,effect)','Poison tick, mixed damage, shield+lethal','Test từng type; không khẳng định giảm % nếu chưa đo'),
('Knockback','Wiki mô tả Gust of Wind tác động triển khai','WIKI-DEPLOY','displacement, laneBounds, target flags','Spell impact','Resolve displacement rồi retarget; frontier recalculated theo policy','x=clamp(x+push,bounds); invalidateTargetIfNeeded','Push qua castle, projectile homing, resistance','Không vượt bounds; không tự đổi lane'),
('Freeze/stun/slow','Wiki Ice Elemental đề cập freeze','WIKI-Ice_Elemental','control effect, endTick, allowed actions','Effect applied','Giữ expiry độc lập; policy xác định pause/reset cooldown','if disabled: skip movement/attack acquisition','Hai freeze, effect hết đúng hit tick, spawn đang delay','Thứ tự nhất quán; không lấy duration wiki lỗi'),
('Summon/multi-lane','Wiki Shaman/Skull King mô tả quân ở nhiều lane','WIKI-Shaman','spawn template, count, offset, inheritedLevel','Summon event','Tạo children có lineage; giới hạn recursion lab','for child in group: schedule Spawn(child)','Source chết trước spawn, full unit cap, clones','Tạo số unit theo card; source không được nhân reward'),
('Transformation/copy','Metamorph copy random trên battlefield, level theo lá copy','SUP-12684727124113','eligible pool, private RNG, effective card level','Metamorph command','Policy đối tượng hợp lệ còn Unknown; select seeded; tạo transformed unit','copy=select(eligible,rng); instantiate(copy,levelPolicy)','Pool rỗng; chỉ spell; copy copy; buff có kế thừa?','Không crash/rng leak; pool/rules cần capture'),
('Level cap effects','Mana Ritual/Giant Growth có thể giới hạn level','SUP-12684727124113','base level, rarity, effect level','Play sau ritual hoặc growth','Lookup mapping theo rarity; không min raw số giữa rarity','level=levelCapTable.resolve(card,effect)','Legendary1 vs Common9; stacked ritual','Đúng table hoặc CONTENT_INCOMPLETE; không min sai'),
('Death/cleanup','Quân có HP; chi tiết corpse và death ability chưa đủ','WP21','lethal batch, death hooks, references','hp<=0 sau resolution','Đánh dấu không targetable; schedule onDeath một lần; visual corpse riêng','for lethal id: markDead; emitDeath; releaseAfterHooks','Resurrection, mutual kills, death summon loops','Không duplicate onDeath; pool generation tăng'),
('Cross-lane','Index/wiki có multi-lane effects','WIKI-Shaman','lane mask, target policy','Ability ghi rõ nhiều lane','Lane mặc định độc lập; chỉ effect cho phép mới query lane khác','query(laneMask); apply sorted effects','AOE đụng ranh lane, copy ở lane khác','Movement thường không đổi lane; ability có test riêng'),
('Overtime','Sau240s, castle tự damage tăng dần','SUP-12694401083537','elapsedTicks, curve, cadence','Bắt đầu overtime','Schedule self-damage theo config verified; không guessed curve','if overtimeDue: damageBoth(curve(overtimeAge))','Hai castle lethal, heal cùng tick','Start đúng240s; curve/tie test blocked U06'),
('Simultaneous events','Không có nguồn thứ tự nội bộ gốc',None,'eventQueue, tick, event sequence','Nhiều event cùng tick','Stable sorting và phase ordering là Proposed','sort by (tick,phase,sourceId,eventSeq)','SideA bias, mutual kill, future event sau end','Replay hash bằng nhau; original ordering chưa đạt parity')]

body='''# Combat Mechanics Research

Mỗi mục có chín phần: observation, inputs, trigger, processing, result, pseudocode, edges, tests và evidence. **Processing/pseudocode là Proposed cho web**; observation ghi mức nguồn. Timing, target mask và giá trị chưa xác minh không được lấp bằng default trong parity profile. Scenario dưới đây là yêu cầu test, chưa có engine để chạy.

'''
for idx,(name,obs,src,inp,trig,rule,ps,edge,test) in enumerate(mechanisms,1):
    body+=f'''## C{idx:02} — {name}

- **Quan sát:** {obs}.
- **Input:** {inp}.
- **Trigger:** {trig}.
- **Luật xử lý Proposed:** {rule}.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `{ps}`.
- **Edge cases:** {edge}.
- **Test/expected:** {test}.
- **Evidence:** {link(src) if src else 'Unknown — chỉ có thiết kế đề xuất, cần U05.'}

'''
write('01-research/combat-mechanics.md',body)

write('02-feature-specs/combat-system.md','''
# Battle Simulation / Combat Contract

Danh sách C01–C20 và thuật toán từng mechanism nằm trong [combat research](../01-research/combat-mechanics.md); tài liệu này định nghĩa cách kết hợp. Mọi ordering là Proposed chờ đối chiếu trace gốc.

## Một tick

1. Lấy commands được server đóng dấu cho tick, deduplicate, validate trên state tại thời điểm xử lý.
2. Xử lý timer/resource/draw theo ruleset; thứ tự draw và play tại boundary là policy cần fixture.
3. Expire effects, activate spawns; snapshot targetable entities.
4. Targeting + movement intents, giải quyết vị trí ổn định.
5. Schedule attacks và advance projectiles; thu damage/heal/effect intents.
6. Resolve batch bằng phase và eventSeq, xét lethal/death hooks, cập nhật frontier.
7. Xét castle terminal, phát events/snapshot; nếu terminal thì không còn actions mới.

Quyết định mặc định lab: effects expiry trước attacks; damage/heal dùng batch với comparator được versioned; mutual lethal không mặc định draw vì tài liệu gốc nói không hòa. Lab tie có thể dùng seeded neutral tie-break để thử luồng, phải gắn deviation, chưa được mở parity gate.

## Ability schema

`AbilityDefinition {trigger, selector, filters, operation, magnitudeByLevel, durationTicks, stackingGroup, stackingPolicy, priority, maxDepth}`.
Triggers: OnSpawn/OnAttackCommit/OnHit/OnDeath/OnTimer/OnAllyCountChanged.
Selectors: self, target, sameLane, area, allLanes, ownCastle; filter theo team/type/tier/alive.
Operations: damage/heal/spawn/applyStatus/displace/transform/modifyResource.

Không cần tạo 65 subclass copy-paste. Tuy vậy interpreter quá tổng quát có thể khó debug: chỉ triển khai operations xuất hiện trong cards của slice, còn lại báo UnsupportedAbility. Damage type/armor không tự thêm nếu nguồn chưa có.

## Invariants và diagnostic

EntityId + generation; không dereference unit đã pool lại. OnDeath chỉ một lần. Event parentId/depth dùng phát hiện vòng summon/reflect. Cap số event/tick là circuit breaker, vượt → terminate match `INTERNAL_ERROR/VOID`, không silently drop ảnh hưởng kết quả. Mỗi issue có seed, config hash, last100 accepted commands và state hash.

Stat math: integer/fixed-point, phép nhân intermediate64-bit, rounding và saturation rõ trong shared core; validate overflow catalog ở build. Range check dùng squared distance hoặc 1D lane interval với scale thống nhất; không dùng mesh bounding box. C++/C#/JS floating-point clone khác nhau không được gọi deterministic trước cross-runtime fixtures.
''')

screens=[
('S01','Splash/Loading','Tải catalog/asset tối thiểu','Progress, retry, version','loading/error/ready','Bootstrap + manifest','Mở app','READY hoặc retry','Proposed'),
('S02','Onboarding/Guest','Học đặt quân, tạo profile','Tutorial step, nickname','new/resume/recover','POST sessions/guest','Account mới','Lobby sau tutorial','SUP-12684589127825'),
('S03','Login/Restore','Liên kết hoặc khôi phục','Provider, recovery prompt','linking/conflict/error','POST sessions/link','Session guest','Lobby; merge không tự ghi đè','SUP-12684767583249'),
('S04','Main Lobby','Vào các vòng lặp','Battle, deck, currencies, chests, practice','ready/offline/reward available','GET me, content','Session hợp lệ','Battle/deck/shop/progression','SUP-12684746317201'),
('S05','Deck Builder','Chọn deck hợp lệ','5 slots, cards, replace, cost preview','valid/invalid/saving/conflict','PUT decks/id','Collection có thẻ','Lobby hoặc Detail','SUP-12684724253329'),
('S06','Collection','Duyệt thẻ','Filter, owned/locked, upgrade bar','loading/empty/error','GET collection','Session','Detail/Deck','SUP-12684766514577'),
('S07','Card Detail','Đọc stats/nâng cấp','Stats theo level, copies, upgrade','eligible/insufficient/pending','POST cards/id/upgrade','Thẻ được biết','Collection','SUP-12684766514577'),
('S08','Battle Lobby','Chốt mode/deck','Mode, selected deck, practice notice','valid/blocked','POST queue','Valid deck; invite không active','Queue','Proposed'),
('S09','Matchmaking','Chờ và hủy','Elapsed, cancel','searching/allocated/canceling','POST/DELETE queue','Ticket','Loading hoặc Lobby','Proposed'),
('S10','Battle','Thao tác chiến đấu','HP, timer, mana, hand, lane ghost, stickers','playing/overtime/reconnecting','SignalR commands/snapshots','Match membership','Result','WP21'),
('S11','Result','Kết quả authoritative','Win/loss, reward receipt, return','settling/committed/retry','GET matches/id/result','Match finished','Lobby','Proposed'),
('S12','Shop','Cards/chests/offer','Price/currency/stock, buy','loading/expired/insufficient/pending','GET offers; POST purchases','Session, offer gate','Receipt/Chest','SUP-12684817774993'),
('S13','Chest Opening','Nhận vật phẩm','Timer, unlock, claim, reward reveal','locked/unlocking/claimable/claimed','POST chest unlock/claim','Owner','Lobby/collection','SUP-12684731365521'),
('S14','Progression/League','Đường trophy và season','Castle threshold, league, timer','locked/unlocked/season settlement','GET progression','Session','Lobby','SUP-12684758554769'),
('S15','Forge','Boost và mở cap','Crystals, matching rarity, expiry','locked/eligible/pending','POST forge','3800 trophy documented','Deck','SUP-12684732708113'),
('S16','Rankings','Xếp hạng player/clan','Scope, rank, season','loading/stale/empty','GET leaderboard','Session','Profile/clan','SUP-12684817694481'),
('S17','Profile','Xem thông tin','ID/name/flag; stats chưa rõ','self/other/error','GET players/id','Visibility policy','Lobby','Proposed'),
('S18','Settings','Âm thanh/quality/account','Sliders, language, account, ID','dirty/saved/offline','Local settings; auth API','Mở app','Previous','SUP-12684589127825'),
('S19','Clan/Chat','Tìm nhóm và tương tác','Search/create/join, chat, donation','notMember/member/requested','Clan REST + chat hub','Level3 documented','Friendly/replay','SUP-12684817694481'),
('S20','Friendly Invite','Mời clanmate','Message, expiry, cancel/accept','active/accepted/expired','POST invites; accept','Clan member','Battle hoặc chat','SUP-12684695238289'),
('S21','Daily Modes','Mode luân phiên','Daily reward, week chain, fragments','locked/available/claimed/missed','GET mode; POST queue','Castle4 documented','Battle','SUP-12684689584017'),
('S22','Championship','10 vòng và continues','Round, deck preset, prizes, continue','open/playing/lost/expired/complete','Tournament REST + battle','Availability chưa live-check','Battle/Hall of Fame','SUP-12684749806609'),
('S23','History/Replay','Xem lại trận','List, share, playback controls','loading/unsupportedVersion/playing','GET replay manifest','Clan rules documented','Clan/lobby','SUP-12684817694481'),
('S24','Piggy/Capsule','Tích luỹ và claim','Fill, expiry, price/claim','empty/filling/full/expired','Economy REST','Offer enabled','Receipt','SUP-12684752705169'),
('S25','Ascension/Marketplace','Tier/NFT account state','Entitlement, tier, reward','unknown/unavailable/linked','Adapter pending','Gate U09','External marketplace','SUP-12680882809105')]
dump('data/screen-inventory.json',[dict(id=i,name=n,purpose=p,components=c,states=s,api=a,access=g,navigation=v,evidence=e) for i,n,p,c,s,a,g,v,e in screens])
write('01-research/original-ui-ux.md','''
# Original UI/UX: bằng chứng và ranh giới

Không có live walkthrough đầy đủ. Đây là screen inventory hỗn hợp: màn được nhắc trong support có bằng chứng về sự tồn tại/luồng; layout, animation, error states và API là thiết kế web đề xuất. **Không có API nội bộ Wildlife được giả định.**

| ID | Screen | Mục đích/thành phần | Điều kiện/điều hướng | Evidence |
|---|---|---|---|---|
'''+ '\n'.join(f'| {i} | {n} | {p}; {c} | {g}; {v} | {link(e) if e != "Proposed" else "Proposed web screen"} |' for i,n,p,c,s,a,g,v,e in screens)+'''

Đã quan sát HUD lịch sử trên whitepaper trang4: HP hai bên trên, cards ở đáy, thanh tài nguyên dưới cards, nút stickers trái dưới. Bố cục full collection/shop/Forge chưa được visually inspected; không cam kết “clone từng pixel”.

UX cần đo original: drag threshold, khoảng an toàn tay, vùng cancel/discard, feedback thiếu mana, ghost preview có hiện đúng target không, multi-touch, thứ tự animation rút/burn, bấm back trong matchmaking và disconnect. Mỗi thao tác lưu clip có build + timestamp. Video nguồn tìm được chưa xem nên không có timestamp được bịa.
''')
write('02-feature-specs/screen-flow.md','''
# UI/UX Specification — web Proposed

## Sitemap và flow

```mermaid
flowchart TD
  Start[Loading] --> Identity[Guest / Restore]
  Identity --> Tutorial[Onboarding]
  Tutorial --> Lobby[Lobby]
  Lobby --> Deck[Deck / Collection / Detail]
  Lobby --> Shop[Shop / Chests / Offers]
  Lobby --> Progress[Castles / Leagues / Forge]
  Lobby --> Clan[Clan / Chat / Donation]
  Lobby --> Settings[Settings / Account]
  Lobby --> Mode[Ranked / Practice / Daily / Tournament]
  Clan --> Invite[Friendly invite]
  Mode --> Queue[Matchmaking]
  Invite --> Queue
  Queue --> Load[Battle load]
  Load --> Battle[Playing / Overtime]
  Battle --> Result[Settlement / Result]
  Result --> Lobby
  Clan --> Replay[History / Replay]
```

## States, API và lỗi

| ID | Screen | States | API đề xuất | Lỗi/khôi phục |
|---|---|---|---|---|
'''+ '\n'.join(f'| {i} | {n} | {s} | `{a}` | Giữ trạng thái đã xác nhận; lỗi typed; retry idempotent; refresh khi revision conflict |' for i,n,p,c,s,a,g,v,e in screens)+'''

Quy tắc lỗi riêng: Login link conflict không overwrite progress; queue cancel race hiển thị allocated; upgrade/buy timeout đọc receipt thay vì submit key mới; battle reject trả ghost về tay; chest đã claim hiển thị receipt cũ; replay không còn engine version báo unavailable; reconnect ưu tiên snapshot và không phát âm/VFX cũ lần hai.

## Input mobile

```mermaid
stateDiagram-v2
  Idle --> Selected: pointerdown card
  Selected --> Dragging: vượt threshold
  Selected --> Aiming: tap release
  Aiming --> Pending: tap valid lane
  Dragging --> Pending: release valid area
  Dragging --> Idle: pointercancel / release ngoài vùng
  Aiming --> Idle: tap cancel / Escape
  Pending --> Idle: accepted receipt
  Pending --> Selected: rejected with reason
```

Proposed: nút ít nhất44 CSS px, safe-area insets, không bắt buộc fullscreen/orientation lock. Landscape là bố cục ưu tiên; portrait fit battlefield có tap-to-place và card detail mở riêng. Pointer capture khi drag, `touch-action:none` chỉ trong battle interaction; cho page/menu cuộn bình thường. Một pointer điều khiển deploy, pointer thứ hai không nhân command. Ghost offset trên ngón tay; vùng valid phản hồi bằng màu+shape+text. Không đủ mana vẫn xem card, không gửi play invalid. Hủy không tiêu tài nguyên; discard nếu xác minh phải là vùng/nút khác rõ ràng, tránh hủy nhầm thành mất thẻ.

Timing Proposed: UI transition120–200ms, result reveal có skip, reduced-motion bỏ shake/zoom; không delay input để đợi tween. Damage event và animation attack lấy tick server, hit flash không quyết định HP. Audio unlock bằng user gesture, mute lưu local, tab background dừng render không pause PvP.

Loading có phase và retry asset; không bịa % dựa timer. Battle canvas có DOM HUD đọc được, keyboard select1–6 + lane keys + Escape, contrast team không chỉ đỏ/xanh. Settings chứa quality Auto/Low/High, volume, reconnect status. Acceptance trên Safari iOS thật: notch, browser chrome resize, lost pointer, app-switch30s, portrait/landscape và virtual keyboard.
''')

if __name__=='__main__':print('Combat mechanisms',len(mechanisms),'screens',len(screens))
