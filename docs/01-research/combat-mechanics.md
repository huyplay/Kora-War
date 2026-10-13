# Combat Mechanics Research

Mỗi mục có chín phần: observation, inputs, trigger, processing, result, pseudocode, edges, tests và evidence. **Processing/pseudocode là Proposed cho web**; observation ghi mức nguồn. Timing, target mask và giá trị chưa xác minh không được lấp bằng default trong parity profile. Scenario dưới đây là yêu cầu test, chưa có engine để chạy.

## C01 — Spawn

- **Quan sát:** Card/mana/target được chấp nhận tạo quân; instant effect không chứng minh spawn windup=0.
- **Input:** handInstance, owner, lane, x, card revision.
- **Trigger:** Play hợp lệ.
- **Luật xử lý Proposed:** Trừ card+mana một lần; tạo spawn group với entity IDs mới.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `emit Spawned; activateAt=tick+spawnDelay`.
- **Edge cases:** Card bị chơi hai lần; multi-spawn có lane đầy.
- **Test/expected:** Chỉ một debit; các con cùng source command.
- **Evidence:** [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf)

## C02 — Movement

- **Quan sát:** Quân tiến về thành địch.
- **Input:** x, speed, lane, side, dt.
- **Trigger:** MOVING và không bị disable.
- **Luật xử lý Proposed:** Bước fixed-point; không dựa animation root motion.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `xNext=clamp(x+direction*speedPerTick, laneBounds)`.
- **Edge cases:** Đi qua mục tiêu trong một tick; slow hết hạn.
- **Test/expected:** Không tunneling nhờ swept range; render30/60/120 cho cùng trace.
- **Evidence:** [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf)

## C03 — Target acquisition

- **Quan sát:** Đánh đối tượng đầu tiên vào tầm; tie và ưu tiên chi tiết chưa biết.
- **Input:** sorted lane entities, targetMask, range.
- **Trigger:** Đến điểm xét target.
- **Luật xử lý Proposed:** Lọc team/alive/lane/mask, giữ target policy riêng.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `target=policy.select(eligible,state)`.
- **Edge cases:** Khoảng cách bằng nhau, target castle và unit đồng thời.
- **Test/expected:** Kết quả reproducible; original tie phải đo U05.
- **Evidence:** [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf)

## C04 — Collision/stop

- **Quan sát:** Logic body collision chưa công khai.
- **Input:** radii, positions, movement intents.
- **Trigger:** Swept khoảng cách trong bước.
- **Luật xử lý Proposed:** Không dùng rigid-body impulse mặc định; chặn chỉ theo collision policy.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `resolveLaneMovement(intents,stableOrder)`.
- **Edge cases:** Allied overtaking; nhiều quân cùng x; spawn overlap.
- **Test/expected:** Không kẹt vô hạn, lane không đổi trừ ability; parity cần trace.
- **Evidence:** Unknown — chỉ có thiết kế đề xuất, cần U05.

## C05 — Melee

- **Quan sát:** Có quân cận chiến; timing chưa có.
- **Input:** target, windupTicks, intervalTicks, hitTick.
- **Trigger:** Target hợp lệ trong range.
- **Luật xử lý Proposed:** Schedule hit; trước hit validate theo policy.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `if tick==hitTick: enqueueDamage(source,target)`.
- **Edge cases:** Target chết/ra range khi windup; stun.
- **Test/expected:** Không hit trước windup; cooldown bằng simulation ticks.
- **Evidence:** [Castle Crush Wiki: Warrior](https://castlecrush.fandom.com/wiki/Warrior)

## C06 — Ranged/projectile

- **Quan sát:** Có đánh xa; projectile logic không thể suy từ VFX.
- **Input:** origin,targetId, travelPolicy, speed, damage.
- **Trigger:** Commit ranged attack.
- **Luật xử lý Proposed:** Projectile authoritative hoặc delayed hit theo card; visual riêng.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `advance projectile; onImpact enqueueDamage`.
- **Edge cases:** Homing? target chết, đổi lane, projectile bị hủy.
- **Test/expected:** Một projectile không double-hit; expiry cleanup.
- **Evidence:** [App Store US](https://apps.apple.com/us/app/castle-crush-clash-cards-game/id1060704812)

## C07 — AOE/splash

- **Quan sát:** Wiki Bomb mô tả area damage.
- **Input:** center, radius/shape, lane mask, target mask.
- **Trigger:** Spell/hit impact.
- **Luật xử lý Proposed:** Snapshot candidates rồi lọc hình dạng, sort ID, tạo damage batch.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `victims=queryArea(shape); emit damage per victim`.
- **Edge cases:** Rìa AoE, multi-lane, castle immune.
- **Test/expected:** Mỗi victim đúng một hit; boundary inclusive config.
- **Evidence:** [Castle Crush Wiki: Bomb](https://castlecrush.fandom.com/wiki/Bomb)

## C08 — Damage resolution

- **Quan sát:** Castle/unit HP giảm bởi combat.
- **Input:** damage intents, modifiers, target HP.
- **Trigger:** Resolve phase.
- **Luật xử lý Proposed:** Fixed-point math và rounding định nghĩa trong ruleset; không armor tự phát.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `applied=damagePolicy.resolve(intent); hp=max(0,hp-applied)`.
- **Edge cases:** Overkill, simultaneous hits, source đã chết.
- **Test/expected:** Conservation với clamping; terminal xử sau batch.
- **Evidence:** [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf)

## C09 — Buff/debuff

- **Quan sát:** Một số chỉ số và spell duration tăng theo level.
- **Input:** effectId, source, magnitude, duration.
- **Trigger:** Ability hoặc aura kích hoạt.
- **Luật xử lý Proposed:** Modifier stack theo group/policy; expiry tick; không cộng vô hạn tự động.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `effectiveStat=applyOrderedModifiers(base,activeEffects)`.
- **Edge cases:** Hai Rage, aura source chết, dispel.
- **Test/expected:** Apply/remove đảo đúng; stacking original Unknown.
- **Evidence:** [Upgrading cards](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684766514577-Upgrading-cards)

## C10 — Healing

- **Quan sát:** Store nhắc heal spell.
- **Input:** target, amount, maxHp, healMask.
- **Trigger:** Heal event.
- **Luật xử lý Proposed:** Clamp tối đa maxHP; dead unit không hồi sinh trừ ability riêng.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `hp=min(maxHp,hp+healAmount)`.
- **Edge cases:** Heal cùng lethal; tăng maxHP; overheal.
- **Test/expected:** Không vượt max; ordering phải fixture hóa.
- **Evidence:** [App Store US](https://apps.apple.com/us/app/castle-crush-clash-cards-game/id1060704812)

## C11 — Shield/armor

- **Quan sát:** Có tên Protection trên card index; công thức chưa biết.
- **Input:** shieldHp/charges/immuneMask.
- **Trigger:** Damage event có effect.
- **Luật xử lý Proposed:** Mỗi card chọn absorb/immune/reduction; không mặc định chung.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `damage=shieldPolicy.consume(damage,effect)`.
- **Edge cases:** Poison tick, mixed damage, shield+lethal.
- **Test/expected:** Test từng type; không khẳng định giảm % nếu chưa đo.
- **Evidence:** [Castle Crush Wiki: Cards](https://castlecrush.fandom.com/wiki/Cards)

## C12 — Knockback

- **Quan sát:** Wiki mô tả Gust of Wind tác động triển khai.
- **Input:** displacement, laneBounds, target flags.
- **Trigger:** Spell impact.
- **Luật xử lý Proposed:** Resolve displacement rồi retarget; frontier recalculated theo policy.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `x=clamp(x+push,bounds); invalidateTargetIfNeeded`.
- **Edge cases:** Push qua castle, projectile homing, resistance.
- **Test/expected:** Không vượt bounds; không tự đổi lane.
- **Evidence:** [Karten / Kampfgrundlagen](https://castle-crush.fandom.com/de/wiki/Karten)

## C13 — Freeze/stun/slow

- **Quan sát:** Wiki Ice Elemental đề cập freeze.
- **Input:** control effect, endTick, allowed actions.
- **Trigger:** Effect applied.
- **Luật xử lý Proposed:** Giữ expiry độc lập; policy xác định pause/reset cooldown.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `if disabled: skip movement/attack acquisition`.
- **Edge cases:** Hai freeze, effect hết đúng hit tick, spawn đang delay.
- **Test/expected:** Thứ tự nhất quán; không lấy duration wiki lỗi.
- **Evidence:** [Castle Crush Wiki: Ice_Elemental](https://castlecrush.fandom.com/wiki/Ice_Elemental)

## C14 — Summon/multi-lane

- **Quan sát:** Wiki Shaman/Skull King mô tả quân ở nhiều lane.
- **Input:** spawn template, count, offset, inheritedLevel.
- **Trigger:** Summon event.
- **Luật xử lý Proposed:** Tạo children có lineage; giới hạn recursion lab.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `for child in group: schedule Spawn(child)`.
- **Edge cases:** Source chết trước spawn, full unit cap, clones.
- **Test/expected:** Tạo số unit theo card; source không được nhân reward.
- **Evidence:** [Castle Crush Wiki: Shaman](https://castlecrush.fandom.com/wiki/Shaman)

## C15 — Transformation/copy

- **Quan sát:** Metamorph copy random trên battlefield, level theo lá copy.
- **Input:** eligible pool, private RNG, effective card level.
- **Trigger:** Metamorph command.
- **Luật xử lý Proposed:** Policy đối tượng hợp lệ còn Unknown; select seeded; tạo transformed unit.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `copy=select(eligible,rng); instantiate(copy,levelPolicy)`.
- **Edge cases:** Pool rỗng; chỉ spell; copy copy; buff có kế thừa?.
- **Test/expected:** Không crash/rng leak; pool/rules cần capture.
- **Evidence:** [My card is in a lower level in battle](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684727124113-My-card-is-in-a-lower-level-in-battle)

## C16 — Level cap effects

- **Quan sát:** Mana Ritual/Giant Growth có thể giới hạn level.
- **Input:** base level, rarity, effect level.
- **Trigger:** Play sau ritual hoặc growth.
- **Luật xử lý Proposed:** Lookup mapping theo rarity; không min raw số giữa rarity.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `level=levelCapTable.resolve(card,effect)`.
- **Edge cases:** Legendary1 vs Common9; stacked ritual.
- **Test/expected:** Đúng table hoặc CONTENT_INCOMPLETE; không min sai.
- **Evidence:** [My card is in a lower level in battle](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684727124113-My-card-is-in-a-lower-level-in-battle)

## C17 — Death/cleanup

- **Quan sát:** Quân có HP; chi tiết corpse và death ability chưa đủ.
- **Input:** lethal batch, death hooks, references.
- **Trigger:** hp<=0 sau resolution.
- **Luật xử lý Proposed:** Đánh dấu không targetable; schedule onDeath một lần; visual corpse riêng.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `for lethal id: markDead; emitDeath; releaseAfterHooks`.
- **Edge cases:** Resurrection, mutual kills, death summon loops.
- **Test/expected:** Không duplicate onDeath; pool generation tăng.
- **Evidence:** [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf)

## C18 — Cross-lane

- **Quan sát:** Index/wiki có multi-lane effects.
- **Input:** lane mask, target policy.
- **Trigger:** Ability ghi rõ nhiều lane.
- **Luật xử lý Proposed:** Lane mặc định độc lập; chỉ effect cho phép mới query lane khác.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `query(laneMask); apply sorted effects`.
- **Edge cases:** AOE đụng ranh lane, copy ở lane khác.
- **Test/expected:** Movement thường không đổi lane; ability có test riêng.
- **Evidence:** [Castle Crush Wiki: Shaman](https://castlecrush.fandom.com/wiki/Shaman)

## C19 — Overtime

- **Quan sát:** Sau240s, castle tự damage tăng dần.
- **Input:** elapsedTicks, curve, cadence.
- **Trigger:** Bắt đầu overtime.
- **Luật xử lý Proposed:** Schedule self-damage theo config verified; không guessed curve.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `if overtimeDue: damageBoth(curve(overtimeAge))`.
- **Edge cases:** Hai castle lethal, heal cùng tick.
- **Test/expected:** Start đúng240s; curve/tie test blocked U06.
- **Evidence:** [Overtime](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12694401083537-Overtime)

## C20 — Simultaneous events

- **Quan sát:** Không có nguồn thứ tự nội bộ gốc.
- **Input:** eventQueue, tick, event sequence.
- **Trigger:** Nhiều event cùng tick.
- **Luật xử lý Proposed:** Stable sorting và phase ordering là Proposed.
- **Kết quả:** state mutation và event có tick/sequence; snapshot downstream, animation không mutate combat.
- **Pseudocode:** `sort by (tick,phase,sourceId,eventSeq)`.
- **Edge cases:** SideA bias, mutual kill, future event sau end.
- **Test/expected:** Replay hash bằng nhau; original ordering chưa đạt parity.
- **Evidence:** Unknown — chỉ có thiết kế đề xuất, cần U05.
