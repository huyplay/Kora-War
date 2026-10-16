import test from 'node:test';
import assert from 'node:assert/strict';
import { spellAffectsUnit } from '../src/core/physics/spell-area';
import { cycleBattle } from '../src/core/cycle-battle';
import { updateSpells } from '../src/core/systems/spells';
import { defaultContent } from '../src/data/content';
import type { Side, Unit } from '../src/core/types';
import type { SpellConfig } from '../src/data/gameplay';

test('spell membership includes exact interval edges but excludes other lanes, dead units and points beyond them', () => {
  const area = Object.freeze({ side: 0 as Side, lane: 1, x: 2 });
  const spell = Object.freeze({ target: 'enemy' as const, radius: 0.75 });
  const unit = Object.freeze({ hp: 100, side: 1 as Side, lane: 1, x: 2 });
  const before = JSON.stringify({ area, spell, unit });
  for (const x of [1.25, 2, 2.75]) assert.equal(spellAffectsUnit({ ...unit, x }, area, spell), true);
  for (const x of [1.25 - 1e-10, 2.75 + 1e-10])
    assert.equal(spellAffectsUnit({ ...unit, x }, area, spell), false);
  for (const lane of [0, 2]) assert.equal(spellAffectsUnit({ ...unit, lane }, area, spell), false);
  for (const hp of [0, -1]) assert.equal(spellAffectsUnit({ ...unit, hp }, area, spell), false);
  assert.equal(spellAffectsUnit({ ...unit, hp: Number.MIN_VALUE }, area, spell), true);
  assert.equal(spellAffectsUnit(unit, area, spell), true);
  assert.equal(JSON.stringify({ area, spell, unit }), before, 'membership never writes its inputs');
});

test('enemy, ally and all allegiance are mirrored for either caster and use configured radii', () => {
  for (const side of [0, 1] as const) {
    const area = { side, lane: 2, x: side === 0 ? 3 : -3 };
    for (const target of ['enemy', 'ally', 'all'] as const) {
      const spell = { target, radius: 3.25 };
      for (const unitSide of [0, 1] as const) {
        const expected = target === 'all' || (target === 'ally' ? unitSide === side : unitSide !== side);
        for (const x of [area.x - 3.25, area.x, area.x + 3.25])
          assert.equal(spellAffectsUnit({ hp: 1, side: unitSide, lane: 2, x }, area, spell), expected);
        assert.equal(
          spellAffectsUnit({ hp: 1, side: unitSide, lane: 2, x: area.x + 3.3 }, area, spell),
          false,
        );
      }
    }
  }
});

test('content-configured spell target modes and radii select the same units as actual cast impact ticks', () => {
  for (const side of [0, 1] as const)
    for (const target of ['enemy', 'ally', 'all'] as const)
      for (const radius of [0.75, 3.25]) {
        const content = defaultContent();
        content.gameplay!.deck.shuffle = false;
        Object.assign(content.gameplay!.spells.ice, {
          target,
          radius,
          warning: 0.25,
          duration: 0,
          effects: [{ kind: 'freeze', amount: 0, duration: 2 }],
        } satisfies Partial<SpellConfig>);
        const b = cycleBattle(content.gameplay!.deck.defaultCards, content, 17);
        b.mulligan(0, []);
        b.mulligan(1, []);
        b.start();
        b.aiEnabled = false;
        b.mana = [100, 100];
        const solan = b.hands[0].find((card) => card.id === 'solan')!;
        assert.ok(solan);
        assert.equal(b.play(0, 'solan', 1, -12, solan.uid), null);
        const template = b.units[0];
        const center = side === 0 ? 2 : -2;
        const cases = [
          { lane: 1, x: center - radius, hp: 100, inArea: true },
          { lane: 1, x: center, hp: 100, inArea: true },
          { lane: 1, x: center + radius, hp: 100, inArea: true },
          { lane: 1, x: center - radius - 1e-10, hp: 100, inArea: false },
          { lane: 1, x: center + radius + 1e-10, hp: 100, inArea: false },
          { lane: 0, x: center, hp: 100, inArea: false },
          { lane: 2, x: center, hp: 100, inArea: false },
          { lane: 1, x: center, hp: 0, inArea: false },
        ];
        b.units = ([0, 1] as const).flatMap((unitSide) =>
          cases.map((entry, index): Unit => ({
            ...structuredClone(template),
            id: unitSide * cases.length + index + 1,
            side: unitSide,
            lane: entry.lane,
            x: entry.x,
            hp: entry.hp,
            frozenUntil: undefined,
          })),
        );
        const draw = b.drawDecks![side];
        let ice = draw.hand.find((card) => card.id === 'ice');
        if (!ice) {
          const index = draw.pile.indexOf('ice');
          assert.ok(index >= 0);
          [draw.hand[0].id, draw.pile[index]] = [draw.pile[index], draw.hand[0].id];
          ice = draw.hand[0];
        }
        assert.equal(b.cast(side, 'ice', 1, center, ice.uid), null);
        const area = b.spellZones[0];
        const expected = b.units.map(
          (unit, index) =>
            cases[index % cases.length].inArea &&
            (target === 'all' || (target === 'ally' ? unit.side === side : unit.side !== side)),
        );
        assert.deepEqual(
          b.units.map((unit) => spellAffectsUnit(unit, area, b.gameplay.spells.ice)),
          expected,
        );
        updateSpells(b);
        assert.ok(
          b.units.every((unit) => unit.frozenUntil === undefined),
          'warning does not apply effects',
        );
        b.time = area.starts;
        updateSpells(b);
        assert.deepEqual(
          b.units.map((unit) => unit.frozenUntil === b.time + 2),
          expected,
          `${side}/${target}/radius=${radius}`,
        );
      }
});
