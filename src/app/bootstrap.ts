import { type Difficulty } from '../core/index';
import { tacticalBattle } from '../core/tactical';
import { SPELLS, isSpell } from '../data/spells';
import { PvpSession, type PvpPacket } from '../services/pvp-session';
import { pvpScreen } from '../ui/screens/pvp';
import { ORIGINS, ROLES, traits, type Hero } from '../data/index';
import { validateGameData } from '../data/validate';
import { CardGesture } from '../engine/input/card-gesture';
import { Lifetime } from '../engine/lifecycle';
import { World } from '../rendering/World';
import { Sound } from '../services/audio';
import { gameSession } from '../services/game-session';
import { LandscapeController } from '../services/landscape';
import { loadSave, parseSave, saveGame } from '../services/save-store';
import '../style.css';
import { $, escapeHTML } from '../ui/dom';
import { closeModal } from '../ui/modal';
import { feedback } from '../ui/motion';
import type { ScreenContext } from '../ui/screen-context';
import { economy } from '../ui/screens/economy';
import { openRoster as rosterScreen } from '../ui/screens/openRoster';
import { openStory as storyScreen } from '../ui/screens/openStory';
import { pause as pauseScreen } from '../ui/screens/pause';
import { result as resultScreen } from '../ui/screens/result';
import { settings as settingsScreen } from '../ui/screens/settings';
import { renderShell } from '../ui/shell';
import '../ui/styles/economy.css';
import '../ui/styles/landscape.css';
import '../ui/styles/tactical.css';
import { FixedStepRunner } from './fixed-step-runner';
const lifetime = new Lifetime();
const inputLifetime = new AbortController();
lifetime.defer(() => inputLifetime.abort());
validateGameData();
const HEROES = gameSession.content.heroes;
const HERO_MAP = Object.fromEntries(HEROES.map((h) => [h.id, h]));
const RULES = gameSession.content.rules;
const pvp = lifetime.own(new PvpSession());
let onlineStarted = false;
let saved = parseSave(null);
try {
  saved = loadSave(localStorage);
} catch {
  /* Storage may be disabled. */
}
let deck = saved.deck;
let spells = saved.spells;
const cardInfo = (id: string) => (isSpell(id) ? SPELLS[id] : HERO_MAP[id]);
let difficulty: Difficulty = saved.difficulty;
let wins = saved.wins,
  mode: 'lobby' | 'battle' = 'lobby',
  selected: string | null = null,
  skillSelected = false;
let tutorial = 0,
  debug = false,
  autoPlayer = false,
  speed = 1,
  seed = 20261013,
  simMs = 0,
  frameMs: number[] = [],
  fps = 0,
  lastFrame = performance.now(),
  lastUi = 0,
  lastAudioEvent = 0,
  endedShown = false;
const runner = new FixedStepRunner();
let battle = tacticalBattle(deck, spells, gameSession.content, seed, undefined, undefined, difficulty);
const sound = new Sound();
sound.configure(gameSession.content.audio);
sound.enabled = saved.sound;
function persist() {
  try {
    saveGame(localStorage, { deck, spells, difficulty, wins, sound: sound.enabled, quality: world.quality });
  } catch {
    /* No persistence required to play. */
  }
}
$('#app').innerHTML = renderShell();
let world: World;
try {
  world = new World($('#stage'));
} catch (e) {
  $('#app').innerHTML =
    `<div class="fatal"><h1>Không thể khởi tạo đồ họa 3D</h1><p>Trình duyệt cần WebGL2 và tăng tốc phần cứng. Hãy thử Chrome, Edge, Firefox hoặc Safari được cập nhật.</p><button onclick="location.reload()">Thử lại</button><details><summary>Chi tiết kỹ thuật</summary><pre></pre></details></div>`;
  $('.fatal pre').textContent = String(e);
  throw e;
}
lifetime.own(world);
lifetime.own(sound);
if (saved.quality === 'low') world.setQuality('low');
$('#app').insertAdjacentHTML(
  'beforeend',
  '<div id="asset-loading" role="status">◈ Đang kết nối lõi Aether…</div>',
);
await world.prepareContent(gameSession.content);
$('#asset-loading').remove();
$('.arena-heading h1').textContent = gameSession.content.map.name;
const portraits = Object.fromEntries(HEROES.map((h) => [h.id, world.portrait(h)]));
function card(h: Hero, index: number, roster = false) {
  return `<button class="hero-card ${roster ? 'roster-card' : ''}" data-hero="${h.id}" style="--hero-color:${ORIGINS[h.origin].color}" aria-label="${h.name}, ${h.cost} mana, ${escapeHTML(h.ability)}"><span class="card-cost">${h.cost}</span>${!roster ? `<kbd>${index + 1}</kbd>` : ''}<img src="${portraits[h.id]}" alt="Mô hình 3D ${h.name}" draggable="false"/><span class="card-shade"></span><span class="card-origin">${ORIGINS[h.origin].icon} ${ORIGINS[h.origin].name}</span><span class="card-name">${h.name}</span><span class="card-role">${ROLES[h.role].name}</span><span class="card-cooldown"></span>${roster ? '<span class="checkmark">✓</span>' : ''}</button>`;
}
function renderDeck() {
  $('#hand').innerHTML =
    deck.map((id, i) => card(HERO_MAP[id], i)).join('') +
    spells
      .map((id, i) => {
        const s = SPELLS[id];
        return `<button class="hero-card spell-card" data-hero="${id}" style="--hero-color:${s.color}" aria-label="${s.name}, ${s.cost} mana. ${s.description}"><span class="card-cost">${s.cost}</span><kbd>${i + 5}</kbd><span class="spell-symbol">${s.icon}</span><small>${s.cooldown}s</small><span class="card-name">${s.name}</span><span class="card-cooldown"></span></button>`;
      })
      .join('');
  const counts = traits(deck);
  $('#synergies').innerHTML =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n >= 2)
      .map(([id, n]) => {
        const t = { ...ORIGINS, ...ROLES }[id as keyof typeof ORIGINS] || ROLES[id as keyof typeof ROLES];
        return `<div class="trait-pill" title="${t.effect}"><span>${t.icon}</span><div><b>${t.name}</b><small>${n}/2 · Kích hoạt</small></div><em>✦</em></div>`;
      })
      .join('') || '<p class="no-traits">Ghép 2 tướng cùng hệ hoặc tộc để kích hoạt cộng hưởng.</p>';
  document.querySelectorAll<HTMLButtonElement>('#hand .hero-card').forEach((button) => {
    button.addEventListener('click', () => {
      if (gestures.suppressClick) return;
      selectCard(button.dataset.hero!);
    });
    button.addEventListener('pointerdown', (e) => gestures.begin(e, button.dataset.hero!));
    button.addEventListener('mouseenter', () => {
      if (!gestures.active) showTooltip(button.dataset.hero!, button);
    });
    button.addEventListener('mouseleave', () => {
      $('#hero-tooltip').hidden = true;
    });
    button.addEventListener('focus', () => showTooltip(button.dataset.hero!, button));
    button.addEventListener('blur', () => ($('#hero-tooltip').hidden = true));
  });
}
function showTooltip(id: string, el: HTMLElement) {
  if ($('#modal-root').children.length) return;
  if (isSpell(id)) return;
  const h = HERO_MAP[id],
    r = el.getBoundingClientRect();
  $('#hero-tooltip').innerHTML =
    `<span class="tooltip-origin">${ORIGINS[h.origin].name} · ${ROLES[h.role].name}</span><h3>${h.name} <small>${escapeHTML(h.title)}</small></h3><div class="stat-row"><span>♥ ${h.hp}</span><span>⚔ ${h.attack}</span><span>◎ ${h.range}m</span></div><b>✦ ${escapeHTML(h.ability)}</b><p>${escapeHTML(h.description)}</p><small>Tự kích hoạt · Hồi ${h.skillCooldown} giây</small>`;
  $('#hero-tooltip').hidden = false;
  $('#hero-tooltip').style.left = `${Math.max(12, Math.min(innerWidth - 292, r.left))}px`;
  $('#hero-tooltip').style.bottom = `${innerHeight - r.top + 10}px`;
}
function preview() {
  world.reset();
  battle = tacticalBattle(deck, spells, gameSession.content, seed, undefined, undefined, difficulty);
  battle.start();
  battle.mana = [100, 100];
  deck.slice(0, 3).forEach((id, i) => battle.play(0, id, i, -7.8 - i * 0.15));
  battle.decks[1].slice(0, 3).forEach((id, i) => battle.play(1, id, i, 7.8 + i * 0.15));
  battle.phase = 'ready';
  battle.units.forEach((u) => {
    u.born = -10;
    u.state = 'move';
  });
  battle.events = [];
  battle.mana = [4, 4];
}
function clearSelection() {
  selected = null;
  skillSelected = false;
  world.hoverRing.visible = false;
  updateSelection();
}
function updateSelection() {
  document
    .querySelectorAll<HTMLElement>('#hand .hero-card')
    .forEach((b) => b.classList.toggle('selected', b.dataset.hero === selected));
  $('#pulse').classList.toggle('selected', skillSelected);
  $('#selection-hint').innerHTML = skillSelected
    ? 'Chọn chiến tuyến để gây sát thương và hồi máu đồng minh.'
    : selected
      ? `<b>${cardInfo(selected).name}</b> · ${isSpell(selected) ? 'Chạm vị trí bất kỳ trên lane để dùng phép.' : 'Chạm vùng sáng hoặc chọn đường để thả quân.'}`
      : 'Chọn thẻ 1–6 · tướng bên trái, phép trên chiến trường.';
  $('.lane-shortcuts').hidden = mode !== 'battle' || (!selected && !skillSelected);
}
function selectCard(id: string) {
  if (landscape.blocked) return;
  if (mode === 'lobby') {
    openRoster(id);
    return;
  }
  if (battle.phase !== 'playing') return;
  sound.unlock();
  if (battle.mana[0] < cardInfo(id).cost) {
    toast(`Chưa đủ mana · ${cardInfo(id).name} cần ${cardInfo(id).cost}`);
    return;
  }
  selected = selected === id ? null : id;
  skillSelected = false;
  updateSelection();
  if (tutorial === 1 && selected) {
    tutorial = 2;
    renderTutorial();
  }
  sound.tone('click');
}
async function deploy(lane: number, x = selected && isSpell(selected) ? 0 : -11) {
  if (mode !== 'battle' || landscape.blocked) return;
  sound.unlock();
  let error: string | null;
  if (pvp.active) {
    const id = selected;
    if (!id && !skillSelected) return;
    error = await pvp.command(
      skillSelected ? 'pulse' : id && isSpell(id) ? 'spell' : 'play',
      id || undefined,
      lane,
      x,
    );
    if (error) toast(error);
    else {
      clearSelection();
      sound.tone('play');
    }
    return;
  }
  if (skillSelected) {
    error = battle.pulse(0, lane);
    if (!error) {
      gameSession.record({ tick: battle.tick, type: 'pulse', lane });
      clearSelection();
      sound.tone('skill');
    }
  } else if (selected) {
    const played = selected;
    error = isSpell(selected) ? battle.cast(0, selected, lane, x) : battle.play(0, selected, lane, x);
    if (!error)
      gameSession.record({
        tick: battle.tick,
        type: isSpell(played) ? 'spell' : 'play',
        heroId: played,
        lane,
        x,
      });
    if (!error) feedback(document.querySelector(`#hand [data-hero="${played}"]`), 'deploy');
    if (!error) {
      sound.tone('play');
      clearSelection();
      if (tutorial === 2) {
        tutorial = 3;
        renderTutorial();
      }
    }
  } else return;
  if (error) toast(error);
}
let toastTimer: number;
function toast(message: string) {
  $('#combat-message').textContent = message;
  $('#combat-message').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => $('#combat-message').classList.remove('show'), 2800);
}
function renderTutorial() {
  const text =
    tutorial === 1
      ? '<b>01 / 03 · Gọi người tiên phong</b><span>Chọn một thẻ tướng ở phía dưới. Con số màu xanh là mana cần dùng.</span>'
      : tutorial === 2
        ? '<b>02 / 03 · Chọn chiến tuyến</b><span>Chạm vùng sáng bên trái để thả quân, hoặc dùng nút đường trên / giữa / dưới.</span>'
        : '<b>03 / 03 · Giữ vững đội hình</b><span>Tướng tự di chuyển, đánh và dùng kỹ năng. Đặt Hộ Vệ trước, Du Hiệp phía sau. Phá trụ rồi tiến vào lõi!</span><button id="tutorial-done">Đã hiểu — chiến đấu!</button>';
  $('#tutorial-hint').innerHTML = text;
  $('#tutorial-hint').hidden = !tutorial;
  $('#tutorial-done')?.addEventListener('click', () => {
    tutorial = 0;
    $('#tutorial-hint').hidden = true;
  });
}
let starting = false;
async function startBattle(withTutorial = false) {
  if (pvp.active) return;
  if (pvp.restoring) {
    toast('Đang kiểm tra phòng đang chơi…');
    return;
  }
  if (starting) return;
  if (landscape.blocked) return;
  sound.unlock();
  starting = true;
  let remote;
  try {
    remote = await gameSession.start(deck, difficulty, spells);
  } catch (e) {
    toast(e instanceof Error ? e.message : String(e));
    starting = false;
    return;
  }
  starting = false;
  if (landscape.blocked) return;
  gestures.cancel();
  closeModal();
  clearTimeout(toastTimer);
  $('#combat-message').classList.remove('show');
  $('#combat-message').textContent = '';
  mode = 'battle';
  world.reset();
  battle = tacticalBattle(
    deck,
    spells,
    remote?.content || gameSession.content,
    remote?.seed || ++seed,
    undefined,
    undefined,
    difficulty,
  );
  battle.start();
  endedShown = false;
  lastAudioEvent = 0;
  sound.reset();
  runner.reset();
  autoPlayer = false;
  speed = 1;
  tutorial = withTutorial ? 1 : 0;
  clearSelection();
  document.body.classList.add('in-battle');
  $('.battle-hud').hidden = false;
  $('.arena-heading').hidden = true;
  $('#lobby-actions').hidden = true;
  $('.battle-actions').hidden = false;
  $('.mana-panel').hidden = false;
  $('#edit-deck').hidden = true;
  $('.team-note').hidden = true;
  $('.map-note').hidden = true;
  $('#hand-caption').textContent = 'THẺ TRIỂN KHAI';
  $('#hand-tip').textContent = 'Kéo thả hoặc chọn thẻ + chạm';
  $('#objective p').textContent = 'Phá trụ một đường → đánh sập lõi đối phương.';
  $<HTMLSelectElement>('#debug-speed').value = '1';
  $('#debug-auto').textContent = 'Tự đấu: tắt';
  $('#tutorial-hint').hidden = true;
  if (tutorial) renderTutorial();
  sound.unlock();
  sound.tone('play');
  updateHud();
}
function lobby() {
  if (pvp.active) {
    void pvp
      .leave()
      .then(() => {
        onlineStarted = false;
        document.body.classList.remove('online-battle');
        lobby();
      })
      .catch((e) => toast(String(e)));
    return;
  }
  closeModal();
  clearTimeout(toastTimer);
  $('#combat-message').classList.remove('show');
  $('#combat-message').textContent = '';
  mode = 'lobby';
  tutorial = 0;
  autoPlayer = false;
  speed = 1;
  clearSelection();
  document.body.classList.remove('in-battle');
  $('.battle-hud').hidden = true;
  $('.arena-heading').hidden = false;
  $('#lobby-actions').hidden = false;
  $('.battle-actions').hidden = true;
  $('.mana-panel').hidden = true;
  $('#edit-deck').hidden = false;
  $('.team-note').hidden = false;
  $('.map-note').hidden = false;
  $('#tutorial-hint').hidden = true;
  $('#hand-caption').textContent = 'ĐỘI HÌNH XUẤT TRẬN';
  $('#hand-tip').textContent = '4 tướng + 2 phép';
  renderDeck();
  preview();
  updateHud();
}
function formatTime(t: number) {
  return `${Math.floor(t / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(t % 60)
    .toString()
    .padStart(2, '0')}`;
}
function updateHud() {
  $('#wallet-gold').textContent = gameSession.wallet ? String(gameSession.wallet.gold) : '—';
  $('#best-record').textContent = `${wins} chiến thắng · Dữ liệu lưu trên thiết bị`;
  if (mode === 'battle') {
    $('#timer').textContent = formatTime(battle.time);
    $('#phase-label').textContent =
      battle.time >= 180 ? 'LÕI ĐANG QUÁ TẢI' : battle.phase === 'paused' ? 'TẠM DỪNG' : 'TRANH ĐOẠT LÕI';
    for (const [side, label] of [
      [0, 'ally'],
      [1, 'enemy'],
    ] as const) {
      $(`#${label}-hp`).textContent = `${Math.ceil(battle.cores[side])} / ${battle.maxCore}`;
      $(`#${label}-health`).style.width = `${(battle.cores[side] / battle.maxCore) * 100}%`;
      $(`#${label}-towers`).textContent =
        `${battle.towers.filter((t) => t.side === side && t.hp > 0).length} trụ`;
    }
    $('#mana').textContent = Math.floor(battle.mana[0]).toString();
    $('#mana-track').innerHTML = Array.from(
      { length: 10 },
      (_, i) => `<span><i style="width:${Math.max(0, Math.min(1, battle.mana[0] - i)) * 100}%"></i></span>`,
    ).join('');
    $('#mana-regen').textContent =
      `+${(battle.content.rules.manaPerSecond * (battle.has(0, 'storm') ? 1.2 : 1)).toLocaleString('vi', { maximumFractionDigits: 2 })} / giây`;
    document.querySelectorAll<HTMLElement>('#hand .hero-card').forEach((el) => {
      const id = el.dataset.hero!,
        remaining = Math.max(0, (battle.cooldowns[0][id] || 0) - battle.time);
      el.classList.toggle('unaffordable', battle.mana[0] < cardInfo(id).cost);
      el.style.setProperty(
        '--cooldown',
        `${(remaining / (isSpell(id) ? SPELLS[id].cooldown : RULES.cardCooldown)) * 100}%`,
      );
    });
    const energy = battle.resonance[0];
    $('#pulse-value').textContent =
      energy >= 100 ? 'Sẵn sàng · Chọn một chiến tuyến' : `Đang tích năng lượng · ${Math.floor(energy)}%`;
    $('#pulse-fill').style.width = `${energy}%`;
    $('#pulse').classList.toggle('charged', energy >= 100);
    $('#objective p').textContent = battle.stats[0].towers
      ? `${battle.stats[0].towers}/3 trụ đã phá · Tiếp tục tấn công lõi.`
      : 'Phá trụ một đường → đánh sập lõi đối phương.';
  }
  $('#fps-mini').textContent = `${Math.round(fps)} FPS`;
  if (debug) {
    const sorted = frameMs.slice().sort((a, b) => a - b),
      p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    $('#debug-stats').textContent =
      `SIMULATION  ${battle.tick} ticks / 20 Hz\nPHASE       ${battle.phase}  ${battle.debugUsed ? '[DEBUG]' : ''}\nRENDER      ${Math.round(fps)} FPS · p95 ${p95.toFixed(1)} ms\nSIM STEP    ${simMs.toFixed(2)} ms\nUNITS       ${battle.units.length} / ${battle.maxUnits}\nDRAW CALLS  ${world.stats.calls}\nTRIANGLES   ${world.stats.triangles.toLocaleString()}\nGEOMETRIES  ${world.stats.geometries}\nSEED        ${battle.seed}\nQUALITY     ${world.quality}\nAI MANA     ${battle.mana[1].toFixed(1)}\nACTIVE FX   ${world.effects.length}`;
  }
}
const screenContext: ScreenContext = {
  heroes: HEROES,
  heroMap: HERO_MAP,
  get spells() {
    return spells;
  },
  set spells(value) {
    spells = value;
  },
  get online() {
    return pvp.active;
  },
  get deck() {
    return deck;
  },
  set deck(value) {
    deck = value;
  },
  get difficulty() {
    return difficulty;
  },
  set difficulty(value) {
    difficulty = value;
  },
  get wins() {
    return wins;
  },
  set wins(value) {
    wins = value;
  },
  get mode() {
    return mode;
  },
  set mode(value) {
    mode = value;
  },
  get battle() {
    return battle;
  },
  set battle(value) {
    battle = value;
  },
  get sound() {
    return sound;
  },
  get world() {
    return world;
  },
  get endedShown() {
    return endedShown;
  },
  set endedShown(value) {
    endedShown = value;
  },
  get tutorial() {
    return tutorial;
  },
  set tutorial(value) {
    tutorial = value;
  },
  get accumulator() {
    return runner.accumulator;
  },
  set accumulator(value) {
    runner.accumulator = value;
  },
  toast,
  startBattle,
  lobby,
  persist,
  renderDeck,
  preview,
  clearSelection,
  card,
  formatTime,
  claimReward: () => (pvp.active ? Promise.resolve(0) : gameSession.reward(battle)),
};
const openStory = (tutorialStart = false) => storyScreen(screenContext, tutorialStart);
const openRoster = (focusId = deck[0]) => rosterScreen(screenContext, focusId);
const settings = () => settingsScreen(screenContext);
const pause = () => pauseScreen(screenContext);
const result = () => resultScreen(screenContext);
const gestures = lifetime.own(
  new CardGesture({
    canStart: (id) =>
      mode === 'battle' &&
      battle.phase === 'playing' &&
      !landscape.blocked &&
      !(isSpell(id) ? battle.canCast(0, id, 1, 0) : battle.canPlay(0, id, 1)),
    move: (id, x, y) => {
      selected = id;
      skillSelected = false;
      updateSelection();
      const ghost = $('#drag-ghost');
      ghost.hidden = false;
      ghost.innerHTML = isSpell(id)
        ? `<span class="spell-symbol">${SPELLS[id].icon}</span>`
        : `<img src="${portraits[id]}" alt=""/>`;
      ghost.style.transform = `translate(${x - 35}px,${y - 90}px)`;
      world.setHover(x, y, isSpell(id));
    },
    drop: (id, x, y) => {
      const top = document.elementFromPoint(x, y);
      if (top !== world.canvas) {
        clearSelection();
        return;
      }
      const point = world.pick(x, y);
      if (point && (isSpell(id) ? point.spellValid : point.valid)) {
        selected = id;
        deploy(point.lane, point.x);
      } else {
        toast('Thả quân vào vùng sáng');
        feedback(document.querySelector(`[data-hero="${id}"]`), 'invalid');
        clearSelection();
      }
    },
    cancel: () => clearSelection(),
    end: () => {
      $('#drag-ghost').hidden = true;
    },
  }),
);
const landscape = lifetime.own(
  new LandscapeController(() => {
    gestures.cancel();
    if (!pvp.active) pause();
    runner.reset();
  }),
);
$('#fullscreen').onclick = () => void landscape.fullscreen();
$('#vault-shop').onclick = () => economy(screenContext, 'shop');
$('#vault-forge').onclick = () => economy(screenContext, 'forge');
$('#vault-chest').onclick = () => economy(screenContext, 'chest');
$('#wallet-gold').textContent = gameSession.wallet ? String(gameSession.wallet.gold) : '—';
document.addEventListener(
  'pointermove',
  (event) => {
    if (!gestures.active && (selected || skillSelected))
      world.setHover(event.clientX, event.clientY, skillSelected || (!!selected && isSpell(selected)));
  },
  { signal: inputLifetime.signal },
);
world.canvas.addEventListener(
  'click',
  (e) => {
    if (gestures.suppressClick || mode !== 'battle' || battle.phase !== 'playing') return;
    const p = world.pick(e.clientX, e.clientY);
    if (!p) return;
    if (skillSelected) deploy(p.lane);
    else if (selected) {
      if (isSpell(selected) ? p.spellValid : p.valid) deploy(p.lane, p.x);
      else toast('Triển khai quân ở vùng sáng bên trái.');
    }
  },
  { signal: inputLifetime.signal },
);
document
  .querySelectorAll<HTMLElement>('[data-lane]')
  .forEach((b) => (b.onclick = () => deploy(Number(b.dataset.lane))));
$('#pulse').onclick = () => {
  if (battle.phase !== 'playing') return;
  if (battle.resonance[0] < 100) {
    toast('Gây sát thương để tích đầy Cộng Hưởng Lõi.');
    return;
  }
  skillSelected = !skillSelected;
  selected = null;
  updateSelection();
};
$('#cancel-select').onclick = clearSelection;
$('#start').onclick = () => openStory();
$('#tutorial-open').onclick = () => openStory(true);
$('#nav-story').onclick = () => openStory();
$('#nav-heroes').onclick = () => openRoster();
$('#edit-deck').onclick = () => openRoster();
$('#pvp-open').onclick = () => {
  if (pvp.restoring) {
    toast('Đang kiểm tra phòng đang chơi…');
    return;
  }
  sound.unlock();
  pvpScreen(pvp, deck, spells, lobby);
};
$('#settings').onclick = settings;
$('#pause').onclick = pause;
$('#nav-battle').onclick = () => {
  if (mode === 'battle') pause();
};
$('.brand').onclick = (e) => {
  e.preventDefault();
  if (mode === 'battle') pause();
  else lobby();
};
function toggleDebug() {
  debug = !debug;
  $('#debug-panel').hidden = !debug;
  updateHud();
}
$('#debug-toggle').onclick = toggleDebug;
$('#debug-close').onclick = toggleDebug;
$('#debug-mana').onclick = () => {
  if (!pvp.active && mode === 'battle') {
    battle.mana[0] = 10;
    battle.resonance[0] = 100;
    battle.debugUsed = true;
    toast('Debug: mana và cộng hưởng đã đầy.');
  }
};
$('#debug-auto').onclick = () => {
  if (pvp.active) return;
  autoPlayer = !autoPlayer;
  if (autoPlayer) battle.debugUsed = true;
  $('#debug-auto').textContent = `Tự đấu: ${autoPlayer ? 'bật' : 'tắt'}`;
};
$('#debug-speed').onchange = () => {
  if (pvp.active) return;
  speed = Number($<HTMLSelectElement>('#debug-speed').value);
  if (speed !== 1) battle.debugUsed = true;
};
$('#debug-win').onclick = () => {
  if (!pvp.active && mode === 'battle' && battle.phase === 'playing') {
    battle.cores[1] = 0;
    battle.debugUsed = true;
  }
};
$('#debug-lose').onclick = () => {
  if (!pvp.active && mode === 'battle' && battle.phase === 'playing') {
    battle.cores[0] = 0;
    battle.debugUsed = true;
  }
};
$('#debug-export').onclick = () => {
  const data = {
    version: 'kora-war-0.1',
    seed: battle.seed,
    contentRevision: gameSession.revision,
    levels: battle.levels,
    commands: pvp.active ? [] : gameSession.commands,
    deck,
    spells,
    online: pvp.active,
    difficulty,
    performance: { fps, simMs, ...world.stats },
    snapshot: battle.snapshot(),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `kora-war-match-${battle.seed}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'F3') {
      e.preventDefault();
      toggleDebug();
      return;
    }
    if ($('#modal-root').children.length) {
      if (e.key === 'Tab') {
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.modal button:not([disabled]),.modal select:not([disabled]),.modal input',
          ),
        );
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
    if (mode !== 'battle' || landscape.blocked) return;
    if (e.key === 'Escape') {
      if (selected || skillSelected) clearSelection();
      else pause();
    }
    if (battle.phase !== 'playing') return;
    if (/^[1-6]$/.test(e.key)) selectCard([...deck, ...spells][Number(e.key) - 1]);
    if (e.key.toLowerCase() === 'q') $('#pulse').click();
    const lane = ['w', 'e', 'r'].indexOf(e.key.toLowerCase());
    if (lane >= 0) deploy(lane);
  },
  { signal: inputLifetime.signal },
);
document.addEventListener(
  'visibilitychange',
  () => {
    if (document.hidden && !pvp.active && mode === 'battle' && battle.phase === 'playing') pause();
    lastFrame = performance.now();
    runner.reset();
  },
  { signal: inputLifetime.signal },
);
world.canvas.addEventListener(
  'webglcontextlost',
  (e) => {
    e.preventDefault();
    if (mode === 'battle') pause();
    toast('Mất ngữ cảnh đồ họa. Hãy tải lại trang nếu hình ảnh không trở lại.');
  },
  { signal: inputLifetime.signal },
);
renderDeck();
preview();
updateHud();
pvp.onError = toast;
pvp.onClosed = () => {
  onlineStarted = false;
  document.body.classList.remove('online-battle');
  lobby();
};
pvp.onState = (packet: PvpPacket) => {
  if (packet.waiting) {
    if (!document.querySelector('#pvp-leave')) pvpScreen(pvp, deck, spells, lobby);
    return;
  }
  if (!packet.state || !packet.content || !packet.opponent) return;
  if (!onlineStarted) {
    if (JSON.stringify(packet.content) !== JSON.stringify(gameSession.content)) {
      toast('Nội dung phòng khác phiên bản. Tải lại trang để đồng bộ.');
      void pvp.leave().catch((e) => toast(String(e)));
      return;
    }
    onlineStarted = true;
    deck = packet.loadout.deck.slice();
    spells = packet.loadout.spells.slice();
    mode = 'battle';
    gestures.cancel();
    closeModal();
    world.reset();
    battle = tacticalBattle(
      deck,
      spells,
      packet.content,
      packet.seed,
      packet.opponent.deck,
      packet.opponent.spells,
    );
    battle.aiEnabled = false;
    endedShown = false;
    lastAudioEvent = 0;
    sound.reset();
    runner.reset();
    tutorial = 0;
    document.body.classList.add('in-battle', 'online-battle');
    $('.battle-hud').hidden = false;
    $('.arena-heading').hidden = true;
    $('#lobby-actions').hidden = true;
    $('.battle-actions').hidden = false;
    $('.mana-panel').hidden = false;
    $('#edit-deck').hidden = true;
    $('.team-note').hidden = true;
    $('.map-note').hidden = true;
    renderDeck();
    clearSelection();
    toast('PvP bắt đầu · đội bạn luôn ở bên trái');
  }
  Object.assign(battle, packet.state);
  updateHud();
  if (battle.phase === 'ended') result();
};
void pvp.restore();
let lowFrames = 0;
let frameHandle = 0;
function loop(now: number) {
  const rawDt = (now - lastFrame) / 1000,
    dt = Math.min(0.25, rawDt);
  lastFrame = now;
  if (rawDt > 0 && rawDt < 0.25 && !document.hidden) {
    frameMs.push(rawDt * 1000);
    if (frameMs.length > 180) frameMs.shift();
    fps = 1000 / (frameMs.reduce((a, b) => a + b, 0) / frameMs.length);
  }
  if (mode === 'battle' && battle.phase === 'playing' && !landscape.blocked) {
    const before = performance.now();
    const steps = pvp.active
      ? 0
      : runner.advance(
          dt,
          speed,
          () => {
            if (autoPlayer && battle.tick % 25 === 0) battle.ai(0);
            battle.step();
          },
          () => battle.phase === 'playing',
        );
    simMs = steps ? (performance.now() - before) / steps : simMs;
    for (const e of battle.events)
      if (e.id > lastAudioEvent) {
        lastAudioEvent = e.id;
        sound.event(e);
        if (e.type === 'tower')
          toast(
            e.side === 1 ? 'Đã phá trụ địch! Tiến vào lõi năng lượng.' : 'Một trụ đồng minh đã thất thủ!',
          );
      }
    sound.movement(battle.units);
    if ((battle.phase as string) === 'ended') result();
  }
  if (!landscape.blocked)
    world.render(battle, dt, !!selected || skillSelected, !!selected && isSpell(selected));
  if (now - lastUi > 160) {
    updateHud();
    lastUi = now;
  }
  if (!document.hidden && rawDt < 0.25 && fps < 28 && world.quality === 'high' && frameMs.length > 120) {
    lowFrames += dt;
    if (lowFrames > 5) {
      world.setQuality('low');
      toast('Đã chuyển đồ họa tiết kiệm để giữ trận đấu mượt.');
      lowFrames = 0;
    }
  } else lowFrames = 0;
  frameHandle = requestAnimationFrame(loop);
}
frameHandle = requestAnimationFrame(loop);
// Read-only diagnostics for QA; intentional mutation controls are labelled in the visible debug panel.
Object.defineProperty(window, 'koraWar', {
  value: {
    get snapshot() {
      return battle.snapshot();
    },
    get mode() {
      return mode;
    },
    get renderer() {
      return world.stats;
    },
  },
  writable: false,
  configurable: true,
});
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    inputLifetime.abort();
    cancelAnimationFrame(frameHandle);
    clearTimeout(toastTimer);
    lifetime.dispose();
    delete (
      window as Window & {
        koraWar?: unknown;
      }
    ).koraWar;
  });
}
