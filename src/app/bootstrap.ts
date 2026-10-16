import { modeContent, competitionOf } from '../data/competition';
import { type Difficulty } from '../core/index';
import { tacticalBattle } from '../core/tactical';
import { cycleBattle } from '../core/cycle-battle';
import { quickDeploymentX } from '../core/physics/deployment-range';
import { ManaDisplay } from '../ui/mana-display';
import { HandFeedback } from '../ui/hand-feedback';
import { DefenseFeedback } from '../ui/defense-feedback';
import { gameplayOf, fitDeck, synergyDescription, type TraitId } from '../data/gameplay';
import { spellCard } from '../ui/spell-card';
import { openingHand } from '../ui/screens/opening-hand';
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
import { closeModal, modal } from '../ui/modal';
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
import '../ui/styles/home.css';
import '../ui/styles/cycle.css';
import { FixedStepRunner } from './fixed-step-runner';
import { ArenaGestures } from './arena-gestures';
import { QuickChat } from '../ui/quick-chat';
import '../ui/styles/battle-hud.css';
import '../ui/styles/energy-cards.css';
import '../ui/styles/touch-screens.css';
import '../ui/styles/mobile-hand.css';
import '../ui/styles/roster.css';
const lifetime = new Lifetime();
const inputLifetime = new AbortController();
lifetime.defer(() => inputLifetime.abort());
validateGameData();
const HEROES = gameSession.content.heroes;
const HERO_MAP = Object.fromEntries(HEROES.map((h) => [h.id, h]));
const GAMEPLAY = gameplayOf(gameSession.content);
const pvp = lifetime.own(new PvpSession());
let onlineStarted = false;
let saved = parseSave(null, GAMEPLAY, HEROES);
try {
  saved = loadSave(localStorage, GAMEPLAY, HEROES);
} catch {
  /* Storage may be disabled. */
}
let deck = saved.deck;
let spells = saved.spells;
let cardDeck = fitDeck(
  saved.cards ??
    [...new Set([...deck, ...spells, ...GAMEPLAY.deck.defaultCards])].slice(0, GAMEPLAY.deck.size),
  GAMEPLAY,
  HEROES,
);
deck = [...new Set(cardDeck.filter((id) => !isSpell(id)))];
spells = cardDeck.filter(isSpell);
let selectedUid: number | undefined;
let gestureUid: number | undefined;
let handSignature = '',
  openingKey = '';
const activeGameplay = () => (mode === 'battle' ? battle.gameplay : GAMEPLAY);
const cardInfo = (id: string) =>
  isSpell(id) ? activeGameplay().spells[id] : (mode === 'battle' ? battle.heroes : HERO_MAP)[id];
const renderSpell = (id: keyof typeof SPELLS, index: number, roster = false) =>
  spellCard(id, index, roster, activeGameplay().spells);
const spellTarget = (id: string): boolean | 'all' =>
  isSpell(id) && activeGameplay().spells[id].target === 'all'
    ? 'all'
    : isSpell(id) && activeGameplay().spells[id].target === 'ally';
let difficulty: Difficulty = saved.difficulty;
let wins = saved.wins,
  mode: 'lobby' | 'battle' = 'lobby',
  selected: string | null = null,
  skillSelected = false;
let selectionRevision = 0;
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
let battle = cycleBattle(cardDeck, gameSession.content, seed, undefined, difficulty);
const sound = new Sound();
sound.configure(gameSession.content.audio);
sound.enabled = saved.sound;
function persist() {
  try {
    saveGame(localStorage, {
      deck,
      spells,
      cards: cardDeck,
      difficulty,
      wins,
      sound: sound.enabled,
      quality: world.quality,
    });
  } catch {
    /* No persistence required to play. */
  }
}
$('#app').innerHTML = renderShell(HEROES.length);
const manaDisplay = new ManaDisplay($('.mana-panel'), $('#mana-track'), $('#mana'));
const handFeedback = lifetime.own(new HandFeedback($('#hand'), $('.draw-back'), (cue) => sound.tone(cue)));
const defenseFeedback = lifetime.own(new DefenseFeedback((cue) => sound.tone(cue)));
$('#home-roster .tile-note').textContent = `${GAMEPLAY.deck.size} thẻ · tay ${GAMEPLAY.deck.handSize} thẻ`;
if (!gameSession.wallet) {
  const pvpButton = $<HTMLButtonElement>('#pvp-open');
  pvpButton.disabled = true;
  pvpButton.title = 'Bản demo hỗ trợ luyện tập AI';
  $('.home-screen').insertAdjacentHTML('beforeend', '<span class="demo-note">BẢN DEMO · LUYỆN TẬP AI</span>');
}
const quickChat = lifetime.own(
  new QuickChat({
    send: (id) => pvp.reaction(id),
    online: () => pvp.active,
    notify: toast,
    sound: () => {
      sound.unlock();
      sound.tone('click');
    },
  }),
);
quickChat.configure(gameSession.content);
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
const renderContent = gameSession.resumeContent ?? gameSession.content;
await world.prepareContent(renderContent);
$('.arena-heading h1').textContent = gameSession.content.map.name;
const portraits = Object.fromEntries(HEROES.map((h) => [h.id, world.portrait(h)]));
function card(h: Hero, index: number, roster = false) {
  return `<button class="hero-card ${roster ? 'roster-card' : ''}" data-hero="${h.id}" style="--hero-color:${ORIGINS[h.origin].color}" aria-label="${h.name}, ${h.cost} mana, ${escapeHTML(h.ability)}"><span class="card-cost">${h.cost}</span>${!roster ? `<kbd>${index + 1}</kbd>` : ''}<img src="${portraits[h.id]}" alt="Mô hình 3D ${h.name}" draggable="false"/><span class="card-shade"></span><span class="card-origin">${ORIGINS[h.origin].icon} ${ORIGINS[h.origin].name}</span><span class="card-name">${h.name}</span><span class="card-role">${ROLES[h.role].name}</span><span class="card-cooldown"></span>${roster ? '<span class="checkmark">✓</span>' : ''}</button>`;
}
function renderDeck() {
  const cards =
    mode === 'battle' && battle.cycling
      ? battle.hands[0]
      : (mode === 'battle' ? [...deck, ...spells] : cardDeck.slice(0, GAMEPLAY.deck.handSize)).map(
          (id, i) => ({ id, uid: -i }),
        );
  handSignature = cards.map((card) => `${card.uid}:${card.id}`).join('|');
  $('#hand').classList.toggle('large-hand', cards.length > 6);
  $('#hand').style.setProperty('--hand-columns', String(Math.ceil(cards.length / 2)));
  $('#hand').style.setProperty('--hand-size', String(cards.length));
  const counts = traits([...new Set(deck)], mode === 'battle' ? battle.heroes : HERO_MAP);
  $('#synergies').innerHTML =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .filter(([id, n]) => n >= activeGameplay().synergies[id as TraitId].required)
      .map(([id, n]) => {
        const t = { ...ORIGINS, ...ROLES }[id as keyof typeof ORIGINS] || ROLES[id as keyof typeof ROLES];
        return `<div class="trait-pill" title="${escapeHTML(synergyDescription(activeGameplay(), id as TraitId))}"><span>${t.icon}</span><div><b>${t.name}</b><small>${n}/${activeGameplay().synergies[id as TraitId].required} · Kích hoạt</small></div><em>✦</em></div>`;
      })
      .join('') || '<p class="no-traits">Ghép tướng cùng hệ hoặc tộc để đạt ngưỡng cộng hưởng.</p>';
  handFeedback.reconcile(
    cards,
    (id, i) =>
      isSpell(id) ? renderSpell(id, i) : card((mode === 'battle' ? battle.heroes : HERO_MAP)[id], i),
    (button) => {
      button.addEventListener('click', () => {
        if (gestures.suppressClick) return;
        selectCard(button.dataset.hero!, Number(button.dataset.cardUid));
      });
      button.addEventListener('pointerdown', (e) => {
        gestureUid = Number(button.dataset.cardUid);
        gestures.begin(e, button.dataset.hero!);
      });
      button.addEventListener('mouseenter', () => {
        if (!gestures.active) showTooltip(button.dataset.hero!, button);
      });
      button.addEventListener('mouseleave', () => {
        $('#hero-tooltip').hidden = true;
      });
      button.addEventListener('focus', () => showTooltip(button.dataset.hero!, button));
      button.addEventListener('blur', () => ($('#hero-tooltip').hidden = true));
    },
    mode === 'battle' && battle.phase === 'playing',
  );
}
function showTooltip(id: string, el: HTMLElement) {
  if (matchMedia('(hover: none), (pointer: coarse)').matches) return;
  if ($('#modal-root').children.length) return;
  if (isSpell(id)) return;
  const h = (mode === 'battle' ? battle.heroes : HERO_MAP)[id],
    r = el.getBoundingClientRect();
  $('#hero-tooltip').innerHTML =
    `<span class="tooltip-origin">${ORIGINS[h.origin].name} · ${ROLES[h.role].name}</span><h3>${h.name} <small>${escapeHTML(h.title)}</small></h3><div class="stat-row"><span>♥ ${h.hp}</span><span>⚔ ${h.attack}</span><span>◎ ${h.range}m</span></div><b>✦ ${escapeHTML(h.ability)}</b><p>${escapeHTML(h.description)}</p><small>Tự kích hoạt · Hồi ${h.skillCooldown} giây</small>`;
  $('#hero-tooltip').hidden = false;
  $('#hero-tooltip').style.left = `${Math.max(12, Math.min(innerWidth - 292, r.left))}px`;
  $('#hero-tooltip').style.bottom = `${innerHeight - r.top + 10}px`;
}
function preview() {
  world.reset();
  battle = cycleBattle(cardDeck, gameSession.content, seed, undefined, difficulty);
}
function clearSelection() {
  selectionRevision++;
  selected = null;
  selectedUid = undefined;
  skillSelected = false;
  world.hoverRing.visible = false;
  updateSelection();
}
function updateSelection() {
  document
    .querySelectorAll<HTMLElement>('#hand .hero-card')
    .forEach((b) =>
      b.classList.toggle(
        'selected',
        b.dataset.hero === selected && (!battle.cycling || Number(b.dataset.cardUid) === selectedUid),
      ),
    );
  $('#pulse').classList.toggle('selected', skillSelected);
  $('#cancel-select').hidden = !selected && !skillSelected;
  $('#selection-hint').innerHTML = skillSelected
    ? 'Chọn chiến tuyến để gây sát thương và hồi máu đồng minh.'
    : selected
      ? `<b>${escapeHTML(cardInfo(selected).name)}</b> · ${isSpell(selected) ? 'Chạm vị trí bất kỳ trên lane để dùng phép.' : 'Vùng xanh: trước địch · Vùng vàng: thủ cuối lane.'}`
      : `Chọn thẻ 1–${activeGameplay().deck.handSize} · tướng bên trái, phép trên chiến trường.`;
  $('.lane-shortcuts').hidden = mode !== 'battle' || (!selected && !skillSelected);
}
function selectCard(id: string, uid?: number) {
  if (landscape.blocked) return;
  if (mode === 'lobby') {
    openRoster(id);
    return;
  }
  if (battle.phase !== 'playing') return;
  if (battle.cycling && !battle.hands[0].some((card) => card.id === id)) return;
  sound.unlock();
  if (battle.mana[0] < cardInfo(id).cost) {
    const waitingUid = uid ?? battle.hands[0].find((card) => card.id === id)?.uid;
    if (waitingUid !== undefined) handFeedback.wait(waitingUid);
    return;
  }
  if ((battle.cooldowns[0][id] ?? 0) > battle.time) {
    const waitingUid = uid ?? battle.hands[0].find((card) => card.id === id)?.uid;
    if (waitingUid !== undefined) handFeedback.wait(waitingUid);
    return;
  }
  const heldUid = uid ?? battle.hands[0].find((card) => card.id === id)?.uid;
  selected = selected === id && selectedUid === heldUid ? null : id;
  selectedUid = selected ? heldUid : undefined;
  skillSelected = false;
  selectionRevision++;
  updateSelection();
  if (tutorial === 1 && selected) {
    tutorial = 2;
    renderTutorial();
  }
  sound.tone('click');
}
async function deploy(
  lane: number,
  x = selected && isSpell(selected) ? 0 : quickDeploymentX(battle, 0, lane),
) {
  if (mode !== 'battle' || landscape.blocked) return;
  sound.unlock();
  let error: string | null;
  if (pvp.active) {
    const id = selected;
    const revision = selectionRevision;
    if (!id && !skillSelected) return;
    error = await pvp.command(
      skillSelected ? 'pulse' : id && isSpell(id) ? 'spell' : 'play',
      id || undefined,
      lane,
      x,
      selectedUid,
    );
    if (mode !== 'battle' || !pvp.active) return;
    if (error) toast(error);
    else {
      if (selectionRevision === revision) clearSelection();
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
    const uid = selectedUid;
    error = isSpell(selected)
      ? battle.cast(0, selected, lane, x, uid)
      : battle.play(0, selected, lane, x, uid);
    if (!error)
      gameSession.record({
        tick: battle.tick,
        type: isSpell(played) ? 'spell' : 'play',
        heroId: played,
        lane,
        x,
        cardUid: uid,
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
    remote = await gameSession.start(deck, difficulty, spells, cardDeck);
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
  handFeedback.reset();
  defenseFeedback.reset();
  world.reset();
  battle = cycleBattle(
    cardDeck,
    remote?.content || gameSession.content,
    remote?.seed || ++seed,
    undefined,
    difficulty,
  );
  battle.mulligan(1, []);
  openingKey = '';
  endedShown = false;
  lastAudioEvent = 0;
  sound.reset();
  sound.configure(battle.content.audio);
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
  renderDeck();
  updateHud();
  showOpening();
}
function showOpening() {
  if (!battle.cycling || mode !== 'battle') return;
  if (battle.phase !== 'ready') {
    if (openingKey) {
      closeModal();
      openingKey = '';
    }
    return;
  }
  const key = `${battle.mulliganDone[0]}:${battle.hands[0].map((card) => card.uid).join(',')}`;
  if (openingKey === key) return;
  openingKey = key;
  if (battle.mulliganDone[0]) {
    modal(
      '<div class="modal-content centered" id="opening-wait"><h2>Đã chốt bài</h2><p>Đang chờ đối thủ…</p><p id="opening-countdown"></p><button id="opening-leave" class="secondary">Về sảnh</button></div>',
    );
    $('#opening-leave').onclick = lobby;
    return;
  }
  openingHand(
    battle.hands[0],
    (id, i) =>
      isSpell(id) ? renderSpell(id, i) : card((mode === 'battle' ? battle.heroes : HERO_MAP)[id], i),
    async (uids) => {
      if (pvp.active) return pvp.command('mulligan', undefined, 0, 0, undefined, uids);
      const error = battle.mulligan(0, uids);
      if (!error) {
        gameSession.record({ tick: 0, type: 'mulligan', lane: 0, cards: uids });
        battle.start();
        openingKey = '';
        closeModal();
        runner.reset();
        renderDeck();
        updateHud();
      }
      return error;
    },
    toast,
    lobby,
    battle.gameplay,
  );
}
function lobby() {
  defenseFeedback.reset();
  quickChat.reset();
  quickChat.configure(gameSession.content);
  if (pvp.active) {
    void pvp
      .leave()
      .then(() => {
        onlineStarted = false;
        document.body.classList.remove('online-battle');
        if (JSON.stringify(renderContent) !== JSON.stringify(gameSession.content)) {
          location.reload();
          return;
        }
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
  handFeedback.reset();
  openingKey = '';
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
  $('#hand-tip').textContent = `${GAMEPLAY.deck.size} thẻ · tối đa ${GAMEPLAY.deck.maxCopies} bản/thẻ`;
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
  quickChat.setVisible(mode === 'battle' && ['ready', 'playing'].includes(battle.phase));
  $('#home-wins').textContent = String(wins);
  $('#wallet-gold').textContent = gameSession.wallet ? String(gameSession.wallet.gold) : '—';
  $('#best-record').textContent = `${wins} chiến thắng · Dữ liệu lưu trên thiết bị`;
  if (mode === 'battle') {
    if (
      battle.cycling &&
      handSignature !== battle.hands[0].map((card) => `${card.uid}:${card.id}`).join('|')
    ) {
      if (selectedUid && !battle.hands[0].some((card) => card.uid === selectedUid)) clearSelection();
      gestures.cancel();
      renderDeck();
    }
    if (battle.cycling && battle.cardDrawInfo[0]) {
      const info = battle.cardDrawInfo[0];
      $('#draw-count').textContent = String(info.remaining);
      $('#draw-detail').textContent = `Vòng ${info.cycle} · ${info.discarded} đã dùng`;
      $('#enemy-hand-count').textContent = String(
        battle.hands[1].length || (pvp.packet?.state?.opponentHandCount ?? battle.gameplay.deck.handSize),
      );
    }
    $('#timer').textContent = formatTime(battle.time);
    $('#phase-label').textContent =
      battle.time >= battle.content.rules.overtimeAt
        ? 'LÕI ĐANG QUÁ TẢI'
        : battle.phase === 'paused'
          ? 'TẠM DỪNG'
          : pvp.packet?.mode === 'challenge'
            ? battle.content.map.name.toUpperCase()
            : 'TRANH ĐOẠT LÕI';
    for (const [side, label] of [
      [0, 'ally'],
      [1, 'enemy'],
    ] as const) {
      $(`#${label}-hp`).textContent = String(Math.ceil(battle.cores[side]));
      $(`#${label}-hp`).setAttribute('aria-label', `${Math.ceil(battle.cores[side])} / ${battle.maxCore}`);
      $(`#${label}-health`).style.width = `${(battle.cores[side] / battle.maxCore) * 100}%`;
      $(`#${label}-towers`).textContent =
        `${battle.towers.filter((t) => t.side === side && t.hp > 0).length} trụ`;
    }
    manaDisplay.update(battle.mana[0], battle.content.rules.maxMana);
    $('#mana-regen').textContent =
      `+${(battle.content.rules.manaPerSecond * battle.buff(0, undefined, 'mana', 1)).toLocaleString('vi', { maximumFractionDigits: 2 })} / giây`;
    const heldCards = battle.cycling
      ? battle.hands[0]
      : [...deck, ...spells].map((id, uid) => ({ id, uid: -uid }));
    handFeedback.update(
      heldCards.map((card) => ({
        ...card,
        cost: cardInfo(card.id).cost,
        remaining: Math.max(0, (battle.cooldowns[0][card.id] ?? 0) - battle.time),
        cooldown: isSpell(card.id)
          ? activeGameplay().spells[card.id].cooldown
          : battle.content.rules.cardCooldown,
      })),
      battle.mana[0],
      battle.phase === 'playing' && !landscape.blocked,
    );
    const energy = battle.resonance[0];
    $('#pulse').hidden = !battle.gameplay.resonance.enabled;
    $('#pulse-value').textContent =
      energy >= battle.gameplay.resonance.cap
        ? 'Sẵn sàng · Chọn một chiến tuyến'
        : `Đang tích năng lượng · ${Math.floor((energy / battle.gameplay.resonance.cap) * 100)}%`;
    $('#pulse-fill').style.width = `${(energy / battle.gameplay.resonance.cap) * 100}%`;
    $('#pulse').classList.toggle('charged', energy >= battle.gameplay.resonance.cap);
    $('#objective p').textContent = battle.stats[0].towers
      ? `${battle.stats[0].towers}/3 trụ đã phá · Tiếp tục tấn công lõi.`
      : 'Phá trụ một đường → đánh sập lõi đối phương.';
  }
  $('#fps-mini').textContent = `${Math.round(fps)} FPS`;
  if (debug) {
    const sorted = frameMs.slice().sort((a, b) => a - b),
      p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    $('#debug-stats').textContent =
      `SIMULATION  ${battle.tick} ticks / 20 Hz\nPHASE       ${battle.phase}  ${battle.debugUsed ? '[DEBUG]' : ''}\nRENDER      ${Math.round(fps)} FPS · p95 ${p95.toFixed(1)} ms\nSIM STEP    ${simMs.toFixed(2)} ms\nUNITS       ${battle.units.length} / ${battle.maxUnits}\nDRAW CALLS  ${world.stats.calls}\nTRIANGLES   ${world.stats.triangles.toLocaleString()}\nGEOMETRIES  ${world.stats.geometries}\nSEED        ${pvp.active ? 'SERVER' : battle.seed}\nQUALITY     ${world.quality}\nAI MANA     ${battle.mana[1].toFixed(1)}\nACTIVE FX   ${world.effects.length}`;
  }
}
const screenContext: ScreenContext = {
  get gameplay() {
    return activeGameplay();
  },
  heroes: HEROES,
  heroMap: HERO_MAP,
  get cards() {
    return cardDeck;
  },
  set cards(value) {
    cardDeck = value;
  },
  get spells() {
    return spells;
  },
  set spells(value) {
    spells = value;
  },
  get matchOutcome() {
    return pvp.packet?.outcome;
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
      !(isSpell(id) ? battle.canCast(0, id, 1, 0) : [0, 1, 2].every((lane) => !!battle.canPlay(0, id, lane))),
    move: (id, x, y) => {
      if (selected !== id || skillSelected) selectionRevision++;
      selected = id;
      selectedUid = gestureUid ?? battle.hands[0].find((card) => card.id === id)?.uid;
      skillSelected = false;
      updateSelection();
      const ghost = $('#drag-ghost');
      ghost.hidden = false;
      ghost.innerHTML = isSpell(id)
        ? `<span class="spell-symbol">${escapeHTML(activeGameplay().spells[id].icon)}</span>`
        : `<img src="${portraits[id]}" alt=""/>`;
      ghost.style.transform = `translate(${x - 35}px,${y - 90}px)`;
      world.setHover(x, y, isSpell(id), isSpell(id) ? id : undefined);
    },
    drop: (id, x, y) => {
      const top = document.elementFromPoint(x, y);
      if (top !== world.canvas) {
        clearSelection();
        return;
      }
      const point = world.pick(x, y, isSpell(id), spellTarget(id));
      if (point && (isSpell(id) ? point.spellValid : point.valid)) {
        selected = id;
        selectedUid = gestureUid ?? battle.hands[0].find((card) => card.id === id)?.uid;
        skillSelected = false;
        selectionRevision++;
        deploy(point.lane, point.x);
      } else {
        toast('Ngoài vùng thả');
        feedback(document.querySelector(`[data-hero="${id}"]`), 'invalid');
        clearSelection();
      }
    },
    cancel: () => clearSelection(),
    end: () => {
      $('#drag-ghost').hidden = true;
      gestureUid = undefined;
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
const arenaGestures = lifetime.own(
  new ArenaGestures(
    world.canvas,
    world,
    () => mode === 'battle' && !landscape.blocked,
    () => {
      gestures.cancel();
      clearSelection();
    },
  ),
);
$('#zoom-in').onclick = () => world.zoomBy(1.2);
$('#zoom-out').onclick = () => world.zoomBy(1 / 1.2);
$('#zoom-reset').onclick = () => world.resetZoom();
$('#vault-shop').onclick = () => economy(screenContext, 'shop');
$('#vault-forge').onclick = () => economy(screenContext, 'forge');
$('#vault-chest').onclick = () => economy(screenContext, 'chest');
$('#home-roster').onclick = () => openRoster();
$('#home-story').onclick = () => openStory();
$('#wallet-gold').textContent = gameSession.wallet ? String(gameSession.wallet.gold) : '—';
document.addEventListener(
  'pointermove',
  (event) => {
    if (!gestures.active && (selected || skillSelected))
      world.setHover(
        event.clientX,
        event.clientY,
        skillSelected || (!!selected && isSpell(selected)),
        selected && isSpell(selected) ? selected : undefined,
      );
  },
  { signal: inputLifetime.signal },
);
world.canvas.addEventListener(
  'click',
  (e) => {
    if (
      gestures.suppressClick ||
      arenaGestures.suppressClick ||
      mode !== 'battle' ||
      battle.phase !== 'playing'
    )
      return;
    const p = world.pick(
      e.clientX,
      e.clientY,
      !!selected && isSpell(selected),
      !!selected && spellTarget(selected!),
    );
    if (!p) return;
    if (skillSelected) deploy(p.lane);
    else if (selected) {
      if (isSpell(selected) ? p.spellValid : p.valid) deploy(p.lane, p.x);
      else toast('Chọn vùng xanh trước quân địch hoặc vùng thủ cuối lane.');
    }
  },
  { signal: inputLifetime.signal },
);
document
  .querySelectorAll<HTMLElement>('[data-lane]')
  .forEach((b) => (b.onclick = () => deploy(Number(b.dataset.lane))));
$('#pulse').onclick = () => {
  if (battle.phase !== 'playing') return;
  if (battle.resonance[0] < battle.gameplay.resonance.cap) {
    toast('Gây sát thương để tích đầy Cộng Hưởng Lõi.');
    return;
  }
  skillSelected = !skillSelected;
  selected = null;
  selectionRevision++;
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
  pvpScreen(pvp, deck, spells, lobby, cardDeck);
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
    battle.mana[0] = battle.content.rules.maxMana;
    battle.resonance[0] = battle.gameplay.resonance.cap;
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
function diagnosticSnapshot() {
  return pvp.active && pvp.packet?.state ? structuredClone(pvp.packet.state) : battle.snapshot();
}
$('#debug-export').onclick = () => {
  const data = {
    version: 'kora-war-0.1',
    seed: pvp.active ? undefined : battle.seed,
    contentRevision: gameSession.revision,
    levels: battle.levels,
    commands: pvp.active ? [] : gameSession.commands,
    deck,
    spells,
    cards: cardDeck,
    online: pvp.active,
    difficulty,
    performance: { fps, simMs, ...world.stats },
    snapshot: diagnosticSnapshot(),
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
    if (/^[0-9]$/.test(e.key)) {
      const index = e.key === '0' ? 9 : Number(e.key) - 1;
      const id = battle.cycling ? battle.hands[0][index]?.id : [...deck, ...spells][index];
      if (id) selectCard(id, battle.hands[0][index]?.uid);
    }
    if (e.key.toLowerCase() === 'q') $('#pulse').click();
    const lane = ['w', 'e', 'r'].indexOf(e.key.toLowerCase());
    if (lane >= 0) deploy(lane);
  },
  { signal: inputLifetime.signal },
);
document.addEventListener(
  'visibilitychange',
  () => {
    defenseFeedback.reset();
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
pvp.onConnectionChange = (connected) => {
  const status = $('#connection-status');
  status.hidden = connected || (mode !== 'battle' && !pvp.restoring);
  status.textContent = pvp.restoring ? 'Đang nối lại phiên đấu…' : 'Đang nối lại… Trận đấu vẫn tiếp tục.';
  const waitingStatus = document.querySelector('#pvp-status');
  if (pvp.packet?.waiting && waitingStatus) waitingStatus.textContent = connected ? '' : 'Đang nối lại…';
  if (!connected && mode === 'battle') $('#combat-message').classList.remove('show');
};
pvp.onClosed = () => {
  onlineStarted = false;
  document.body.classList.remove('online-battle');
  lobby();
};
pvp.onState = (packet: PvpPacket) => {
  if (packet.waiting) {
    if (!document.querySelector('#pvp-leave')) pvpScreen(pvp, deck, spells, lobby, cardDeck);
    const clock = document.querySelector('#pvp-queue-time');
    const elapsed = `${packet.queueSeconds ?? 0}s`;
    if (clock && clock.textContent !== elapsed) clock.textContent = elapsed;
    return;
  }
  if (!packet.state || !packet.content || !packet.opponent) return;
  const joining = !onlineStarted;
  if (joining) {
    if (
      JSON.stringify(packet.content) !== JSON.stringify(renderContent) &&
      JSON.stringify(packet.content) !== JSON.stringify(modeContent(renderContent, packet.mode ?? 'friendly'))
    ) {
      // The stored room token survives reload; never surrender solely because content was published.
      location.reload();
      return;
    }
    onlineStarted = true;
    quickChat.reset();
    quickChat.configure(packet.content);
    deck = packet.loadout.deck.slice();
    spells = packet.loadout.spells.slice();
    if (packet.loadout.cards) cardDeck = packet.loadout.cards.slice();
    mode = 'battle';
    handFeedback.reset();
    defenseFeedback.reset();
    gestures.cancel();
    closeModal();
    world.reset();
    battle = packet.loadout.cards
      ? cycleBattle(cardDeck, packet.content, 1, cardDeck)
      : tacticalBattle(
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
    sound.configure(packet.content.audio);
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
    clearSelection();
    toast(
      `${competitionOf(packet.content).modes[packet.mode ?? 'friendly'].name} · ${packet.content.map.name}`,
    );
  }
  Object.assign(battle, packet.state);
  if (joining) renderDeck();
  quickChat.receive(packet.code, packet.reactions ?? []);
  showOpening();
  const countdown = document.querySelector<HTMLElement>('#opening-countdown');
  if (countdown) {
    countdown.hidden = false;
    countdown.textContent = `Tự giữ bài sau ${packet.openingSeconds ?? 0} giây`;
  }
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
        if (e.type === 'tower' && e.side === 1) toast('Đã phá trụ địch! Tiến vào lõi năng lượng.');
      }
    sound.movement(battle.units);
    if ((battle.phase as string) === 'ended') result();
  }
  if (!landscape.blocked && mode === 'battle')
    world.render(
      battle,
      dt,
      !!selected || skillSelected,
      !!selected && isSpell(selected),
      pvp.active ? 1 : speed,
    );
  defenseFeedback.update(
    battle,
    dt,
    mode === 'battle' && !landscape.blocked && !document.hidden && pvp.connected,
  );
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
$('#asset-loading').remove();
// Read-only diagnostics for QA; intentional mutation controls are labelled in the visible debug panel.
Object.defineProperty(window, 'koraWar', {
  value: {
    get snapshot() {
      return diagnosticSnapshot();
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
