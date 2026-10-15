import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as THREE from 'three';
import { defaultContent, validateContent } from '../src/data/content';
import { cycleBattle } from '../src/core/cycle-battle';
import { deploymentRange, quickDeploymentX } from '../src/core/physics/deployment-range';
import { isSpell } from '../src/data/spells';
import { GameDatabase } from '../server/database';
import { PvpRooms } from '../server/pvp';
import type { Battle } from '../src/core/Battle';
import { DeploymentGuidance } from '../src/rendering/deployment-guidance';
import { portraitCamera } from '../src/rendering/portrait-camera';

function ready(content = defaultContent()) {
  const b = cycleBattle(content.gameplay!.deck.defaultCards, content, 72);
  b.mulligan(0, []);
  b.mulligan(1, []);
  b.start();
  b.aiEnabled = false;
  b.mana = [10, 10];
  return b;
}
function hero(b: Battle, side: 0 | 1 = 0) {
  return b.hands[side].find((c) => !isSpell(c.id))!;
}
function intruder(b: Battle, side: 0 | 1 = 1, x = -9, lane = 1) {
  const card = hero(b, side);
  assert.equal(b.play(side, card.id, lane, side ? 12 : -12, card.uid), null);
  const u = b.units.at(-1)!;
  u.x = u.previousX = x;
  return u;
}

test('card portraits keep an off-center head visible when a shield dominates the model bounds', () => {
  const model = new THREE.Group(),
    head = new THREE.Bone();
  head.name = 'Head';
  head.position.set(3, 2.4, 0);
  model.add(head);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 1));
  shield.position.set(-1, 1.5, 0);
  model.add(shield);
  const camera = portraitCamera(model),
    point = head.getWorldPosition(new THREE.Vector3()).project(camera);
  assert.ok(Math.abs(point.x) < 0.2 && point.y > 0 && point.y < 0.7);
  shield.geometry.dispose();
  (shield.material as THREE.Material).dispose();
});

test('frontline rejects behind-enemy deployment atomically but keeps spells and other lanes available', () => {
  const b = ready();
  intruder(b);
  assert.deepEqual(deploymentRange(b, 0, 1), { minX: -13.5, maxX: -9.6, rearDefense: false, valid: true });
  const card = hero(b),
    before = structuredClone({
      mana: b.mana,
      hands: b.hands,
      stats: b.stats,
      events: b.events,
      rng: b.rng,
      cooldowns: b.cooldowns,
    });
  assert.match(b.play(0, card.id, 1, -8, card.uid)!, /sau quân địch/);
  assert.deepEqual(
    { mana: b.mana, hands: b.hands, stats: b.stats, events: b.events, rng: b.rng, cooldowns: b.cooldowns },
    before,
  );
  assert.equal(b.canPlay(0, card.id, 0, -8, card.uid), null);
  const spell = b.hands[0].find((c) => isSpell(c.id))!;
  assert.equal(b.cast(0, spell.id, 1, -8, spell.uid), null);
  b.mana[0] = 10;
  assert.equal(b.play(0, card.id, 1, -10, card.uid), null);
});
test('the nearest living intruder defines each symmetric frontline; dead units and pushes update immediately', () => {
  const b = ready(),
    u = intruder(b);
  b.units.push(
    { ...u, id: 99, x: -11, hp: 0 },
    { ...u, id: 100, x: -7 },
    { ...u, id: 101, x: 9, side: 0, lane: 2 },
  );
  assert.equal(deploymentRange(b, 0, 1).maxX, -9.6);
  assert.equal(deploymentRange(b, 1, 2).minX, 9.6);
  u.x = -8;
  assert.equal(deploymentRange(b, 0, 1).maxX, -8.6);
  u.hp = 0;
  assert.equal(deploymentRange(b, 0, 1).maxX, -7.6);
});
test('an overwhelmed lane opens only its rear defense strip and quick buttons choose a legal position', () => {
  const b = ready();
  const enemy = intruder(b, 1, -13.3, 0),
    original = structuredClone(b.units);
  assert.deepEqual(deploymentRange(b, 0, 0), { minX: -13.5, maxX: -12.3, rearDefense: true, valid: true });
  assert.equal(quickDeploymentX(b, 0, 0), -12.3);
  const card = hero(b);
  assert.match(b.canPlay(0, card.id, 0, -11, card.uid)!, /sau quân địch/);
  assert.equal(b.play(0, card.id, 0, undefined, card.uid), null);
  assert.equal(b.units.at(-1)!.x, -12.3);
  assert.deepEqual(
    b.units.filter((u) => u.id === enemy.id),
    original,
    'rear summoning never pushes or alters the invader',
  );
  b.units.push({ ...b.units[0], id: 88, side: 0, lane: 2, x: 13.3 });
  assert.deepEqual(deploymentRange(b, 1, 2), { minX: 12.3, maxX: 13.5, rearDefense: true, valid: true });
});
test('AI uses the shared legal frontline instead of deploying behind a pushing opponent', () => {
  const b = ready();
  intruder(b, 0, 12, 1);
  b.mana = [10, 10];
  const before = new Set(b.units.map((u) => u.id));
  b.ai(1);
  const deployed = b.units.filter((u) => !before.has(u.id));
  assert.ok(deployed.length);
  for (const u of deployed) {
    const r = deploymentRange(b, 1, u.lane);
    assert.ok(u.x >= r.minX && u.x <= r.maxX);
  }
});

test('attacking any lane gate damages the same existing core after that lane tower falls', () => {
  const b = ready(),
    first = intruder(b, 1, -13.2, 0);
  b.units = [0, 1, 2].map((lane) => ({ ...first, id: lane + 1, lane, range: 1, attackCd: 0, skillCd: 999 }));
  b.towers.filter((t) => t.side === 0).forEach((t) => (t.hp = 0));
  const hp = b.cores[0];
  b.step();
  assert.ok(b.cores[0] < hp);
  assert.equal(b.cores[1], hp);
  const strikes = b.events.filter((e) => e.type === 'core');
  assert.deepEqual(strikes.map((e) => e.lane).sort(), [0, 1, 2]);
  assert.ok(strikes.every((e) => e.x === -b.gameplay.board.coreX && e.side === 0));
});
test('historical cycle snapshots without deployment policy and legacy combat keep their old rules', () => {
  const c = defaultContent();
  delete c.gameplay!.board.deployment;
  const b = ready(c);
  intruder(b);
  const card = hero(b);
  assert.equal(b.play(0, card.id, 1, -8, card.uid), null);
  const fresh = ready();
  intruder(fresh);
  fresh.gameplay.board.deployment!.enabled = false;
  assert.equal(deploymentRange(fresh, 0, 1).maxX, -5.8);
});
test('board schema 1 migrates once, preserving historical payloads, balance and locked matches', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kora-frontline-'));
  let db = new GameDatabase(dir, 'qa-only');
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const c = db.config().published;
  delete c.gameplay!.board.deployment;
  const raw = JSON.stringify(c),
    locked = ready(c);
  db.db.prepare('UPDATE config SET draft=?,published=? WHERE id=1').run(raw, raw);
  db.db.prepare('UPDATE revisions SET content=? WHERE id=1').run(raw);
  db.db
    .prepare("UPDATE rule_modules SET schema_version=1,payload=? WHERE module_id='board'")
    .run(JSON.stringify(c.gameplay!.board));
  db.db
    .prepare("UPDATE rule_module_revisions SET schema_version=1,payload=? WHERE module_id='board'")
    .run(JSON.stringify(c.gameplay!.board));
  db.close();
  db = new GameDatabase(dir, 'qa-only');
  assert.equal(db.config().revision, 2);
  assert.deepEqual(db.config().published.rules, c.rules);
  assert.equal(db.config().published.gameplay!.board.deployment!.enabled, true);
  assert.equal(db.db.prepare('SELECT content FROM revisions WHERE id=1').get()!.content, raw);
  assert.equal(locked.gameplay.board.deployment, undefined);
  db.restoreRevision(1, db.config().version);
  assert.equal(db.config().draft.gameplay!.board.deployment!.enabled, true);
  db.close();
  db = new GameDatabase(dir, 'qa-only');
  assert.equal(db.config().revision, 2);
});
test('deployment policy validates bounded clearances and rear defense against the spawn region', () => {
  for (const policy of [
    null,
    { enabled: true, clearance: -1, rearDefenseWidth: 1 },
    { enabled: true, clearance: 0.6, rearDefenseWidth: 20 },
  ]) {
    const c = defaultContent();
    Object.assign(c.gameplay!.board, { deployment: policy });
    assert.throws(() => validateContent(c), /deployment/);
  }
});
test('portrait yaw is validated independently of combat yaw', () => {
  const c = defaultContent();
  c.models.aurelia = { assetId: 'qa-model', height: 2.2, yaw: 45, portraitYaw: 180, clips: {} };
  validateContent(c);
  c.models.aurelia.portraitYaw = 361;
  assert.throws(() => validateContent(c), /Binding model/);
});
test('rendered blue/red guidance matches the authority and gold rear defense; disposal is isolated', () => {
  const b = ready();
  intruder(b);
  const fx = new DeploymentGuidance();
  fx.update(b, 1);
  const legal = fx.root.children.filter((o) => o.name === 'LegalDeployment') as THREE.Mesh[];
  let bounds = new THREE.Box3().setFromObject(legal[1]);
  assert.ok(Math.abs(bounds.min.x + 13.5) < 1e-6 && Math.abs(bounds.max.x + 9.6) < 1e-6);
  b.units[0].x = -13.3;
  fx.update(b, 2);
  bounds = new THREE.Box3().setFromObject(legal[1]);
  assert.ok(Math.abs(bounds.max.x + 12.3) < 1e-6);
  assert.equal(legal[1].userData.rearDefense, true);
  const parent = new THREE.Group();
  parent.add(fx.root);
  fx.dispose();
  assert.equal(parent.children.length, 0);
});
test('authoritative PvP rejects forged behind-enemy coordinates and retries without spending a card', () => {
  const rooms = new PvpRooms(() => 0),
    c = defaultContent(),
    loadout = { cards: c.gameplay!.deck.defaultCards, deck: [], spells: [] };
  const a = rooms.create('a', loadout, c);
  rooms.join('b', a.code, loadout);
  for (const p of ['a', 'b'])
    rooms.command(p, a.code, { id: `keep-hand-${p}`, type: 'mulligan', lane: 0, x: 0, cards: [] });
  const b = (rooms as unknown as { rooms: Map<string, { battle: Battle }> }).rooms.get(a.code)!.battle;
  b.mana = [10, 10];
  intruder(b);
  const card = hero(b),
    command = {
      id: 'forged-coordinate-01',
      type: 'play' as const,
      lane: 1,
      x: -8,
      card: card.id,
      cardUid: card.uid,
    };
  const before = rooms.state('a', a.code),
    bad = rooms.command('a', a.code, command),
    retry = rooms.command('a', a.code, command);
  assert.match(bad.error!, /sau quân địch/);
  assert.equal(retry.error, bad.error);
  assert.deepEqual(bad.state!.mana, before.state!.mana);
  assert.deepEqual(bad.state!.hands, before.state!.hands);
  assert.equal(rooms.command('a', a.code, { ...command, id: 'valid-coordinate-02', x: -11 }).error, null);
});
