import { Battle, type Difficulty } from '../core/index';
import { HEROES, HERO_MAP, ORIGINS, ROLES, traits, type Hero } from '../data/index';
import { RULES } from '../data/rules';
import { validateGameData } from '../data/validate';
import { World } from '../rendering/World';
import { Sound } from '../services/audio';
import { loadSave, parseSave, saveGame } from '../services/save-store';
import '../style.css';
import { $ } from '../ui/dom';
import { closeModal } from '../ui/modal';
import type { ScreenContext } from '../ui/screen-context';
import { openRoster as rosterScreen } from '../ui/screens/openRoster';
import { openStory as storyScreen } from '../ui/screens/openStory';
import { pause as pauseScreen } from '../ui/screens/pause';
import { result as resultScreen } from '../ui/screens/result';
import { settings as settingsScreen } from '../ui/screens/settings';
import { renderShell } from '../ui/shell';
import { FixedStepRunner } from './fixed-step-runner';
const inputLifetime = new AbortController();
validateGameData();
let saved = parseSave(null);
try {
    saved = loadSave(localStorage);
}
catch { /* Storage may be disabled. */ }
let deck = saved.deck;
let difficulty: Difficulty = saved.difficulty;
let wins = saved.wins, mode: 'lobby' | 'battle' = 'lobby', selected: string | null = null, skillSelected = false;
let tutorial = 0, debug = false, autoPlayer = false, speed = 1, seed = 20261013, simMs = 0, frameMs: number[] = [], fps = 0, lastFrame = performance.now(), lastUi = 0, lastAudioEvent = 0, endedShown = false;
const runner = new FixedStepRunner();
let battle = new Battle(deck, difficulty, seed);
const sound = new Sound();
sound.enabled = saved.sound;
function persist() {
    try {
        saveGame(localStorage, { deck, difficulty, wins, sound: sound.enabled, quality: world.quality });
    }
    catch { /* No persistence required to play. */ }
}
$('#app').innerHTML = renderShell();
let world: World;
try {
    world = new World($('#stage'));
}
catch (e) {
    $('#app').innerHTML = `<div class="fatal"><h1>Không thể khởi tạo đồ họa 3D</h1><p>Trình duyệt cần WebGL2 và tăng tốc phần cứng. Hãy thử Chrome, Edge, Firefox hoặc Safari được cập nhật.</p><button onclick="location.reload()">Thử lại</button><details><summary>Chi tiết kỹ thuật</summary><pre></pre></details></div>`;
    $('.fatal pre').textContent = String(e);
    throw e;
}
if (saved.quality === 'low')
    world.setQuality('low');
const portraits = Object.fromEntries(HEROES.map(h => [h.id, world.portrait(h)]));
function card(h: Hero, index: number, roster = false) { return `<button class="hero-card ${roster ? 'roster-card' : ''}" data-hero="${h.id}" style="--hero-color:${ORIGINS[h.origin].color}" aria-label="${h.name}, ${h.cost} mana, ${h.ability}"><span class="card-cost">${h.cost}</span>${!roster ? `<kbd>${index + 1}</kbd>` : ''}<img src="${portraits[h.id]}" alt="Mô hình 3D ${h.name}" draggable="false"/><span class="card-shade"></span><span class="card-origin">${ORIGINS[h.origin].icon} ${ORIGINS[h.origin].name}</span><span class="card-name">${h.name}</span><span class="card-role">${ROLES[h.role].name}</span><span class="card-cooldown"></span>${roster ? '<span class="checkmark">✓</span>' : ''}</button>`; }
function renderDeck() {
    $('#hand').innerHTML = deck.map((id, i) => card(HERO_MAP[id], i)).join('');
    const counts = traits(deck);
    $('#synergies').innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 2).map(([id, n]) => { const t = { ...ORIGINS, ...ROLES }[id as keyof typeof ORIGINS] || ROLES[id as keyof typeof ROLES]; return `<div class="trait-pill" title="${t.effect}"><span>${t.icon}</span><div><b>${t.name}</b><small>${n}/2 · Kích hoạt</small></div><em>✦</em></div>`; }).join('') || '<p class="no-traits">Ghép 2 tướng cùng hệ hoặc tộc để kích hoạt cộng hưởng.</p>';
    document.querySelectorAll<HTMLButtonElement>('#hand .hero-card').forEach(button => {
        button.addEventListener('click', () => {
            if (suppressClick)
                return;
            selectCard(button.dataset.hero!);
        });
        button.addEventListener('pointerdown', e => {
            if (mode === 'battle' && battle.phase === 'playing') {
                drag = { id: button.dataset.hero!, x: e.clientX, y: e.clientY, active: false };
            }
        });
        button.addEventListener('mouseenter', () => {
            if (!drag?.active)
                showTooltip(button.dataset.hero!, button);
        });
        button.addEventListener('mouseleave', () => { $('#hero-tooltip').hidden = true; });
        button.addEventListener('focus', () => showTooltip(button.dataset.hero!, button));
        button.addEventListener('blur', () => $('#hero-tooltip').hidden = true);
    });
}
function showTooltip(id: string, el: HTMLElement) {
    if ($('#modal-root').children.length)
        return;
    const h = HERO_MAP[id], r = el.getBoundingClientRect();
    $('#hero-tooltip').innerHTML = `<span class="tooltip-origin">${ORIGINS[h.origin].name} · ${ROLES[h.role].name}</span><h3>${h.name} <small>${h.title}</small></h3><div class="stat-row"><span>♥ ${h.hp}</span><span>⚔ ${h.attack}</span><span>◎ ${h.range}m</span></div><b>✦ ${h.ability}</b><p>${h.description}</p><small>Tự kích hoạt · Hồi ${h.skillCooldown} giây</small>`;
    $('#hero-tooltip').hidden = false;
    $('#hero-tooltip').style.left = `${Math.max(12, Math.min(innerWidth - 292, r.left))}px`;
    $('#hero-tooltip').style.bottom = `${innerHeight - r.top + 10}px`;
}
function preview() { world.reset(); battle = new Battle(deck, difficulty, seed); battle.start(); battle.mana = [100, 100]; deck.slice(0, 3).forEach((id, i) => battle.play(0, id, i, -7.8 - i * .15)); battle.decks[1].slice(0, 3).forEach((id, i) => battle.play(1, id, i, 7.8 + i * .15)); battle.phase = 'ready'; battle.units.forEach(u => { u.born = -10; u.state = 'move'; }); battle.events = []; battle.mana = [5, 5]; }
function clearSelection() { selected = null; skillSelected = false; world.hoverRing.visible = false; updateSelection(); }
function updateSelection() { document.querySelectorAll<HTMLElement>('#hand .hero-card').forEach(b => b.classList.toggle('selected', b.dataset.hero === selected)); $('#pulse').classList.toggle('selected', skillSelected); $('#selection-hint').innerHTML = skillSelected ? 'Chọn chiến tuyến để gây sát thương và hồi máu đồng minh.' : selected ? `<b>${HERO_MAP[selected].name}</b> đã sẵn sàng. Chạm vùng sáng hoặc chọn đường.` : 'Chọn thẻ <kbd>1</kbd>–<kbd>4</kbd>, rồi thả vào vùng bên trái.'; $('.lane-shortcuts').hidden = mode !== 'battle' || (!selected && !skillSelected); }
function selectCard(id: string) {
    if (mode === 'lobby') {
        openRoster(id);
        return;
    }
    if (battle.phase !== 'playing')
        return;
    if (battle.mana[0] < HERO_MAP[id].cost) {
        toast(`Chưa đủ mana · ${HERO_MAP[id].name} cần ${HERO_MAP[id].cost}`);
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
function deploy(lane: number, x = -11) {
    if (mode !== 'battle')
        return;
    let error: string | null;
    if (skillSelected) {
        error = battle.pulse(0, lane);
        if (!error) {
            clearSelection();
            sound.tone('skill');
        }
    }
    else if (selected) {
        error = battle.play(0, selected, lane, x);
        if (!error) {
            sound.tone('play');
            clearSelection();
            if (tutorial === 2) {
                tutorial = 3;
                renderTutorial();
            }
        }
    }
    else
        return;
    if (error)
        toast(error);
}
let toastTimer: number;
function toast(message: string) { $('#combat-message').textContent = message; $('#combat-message').classList.add('show'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('#combat-message').classList.remove('show'), 2800); }
function renderTutorial() { const text = tutorial === 1 ? '<b>01 / 03 · Gọi người tiên phong</b><span>Chọn một thẻ tướng ở phía dưới. Con số màu xanh là mana cần dùng.</span>' : tutorial === 2 ? '<b>02 / 03 · Chọn chiến tuyến</b><span>Chạm vùng sáng bên trái để thả quân, hoặc dùng nút đường trên / giữa / dưới.</span>' : '<b>03 / 03 · Giữ vững đội hình</b><span>Tướng tự di chuyển, đánh và dùng kỹ năng. Đặt Hộ Vệ trước, Du Hiệp phía sau. Phá trụ rồi tiến vào lõi!</span><button id="tutorial-done">Đã hiểu — chiến đấu!</button>'; $('#tutorial-hint').innerHTML = text; $('#tutorial-hint').hidden = !tutorial; $('#tutorial-done')?.addEventListener('click', () => { tutorial = 0; $('#tutorial-hint').hidden = true; }); }
function startBattle(withTutorial = false) {
    closeModal();
    mode = 'battle';
    world.reset();
    battle = new Battle(deck, difficulty, ++seed);
    battle.start();
    endedShown = false;
    lastAudioEvent = 0;
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
    if (tutorial)
        renderTutorial();
    sound.unlock();
    sound.tone('play');
    updateHud();
}
function lobby() { closeModal(); mode = 'lobby'; tutorial = 0; autoPlayer = false; speed = 1; clearSelection(); document.body.classList.remove('in-battle'); $('.battle-hud').hidden = true; $('.arena-heading').hidden = false; $('#lobby-actions').hidden = false; $('.battle-actions').hidden = true; $('.mana-panel').hidden = true; $('#edit-deck').hidden = false; $('.team-note').hidden = false; $('.map-note').hidden = false; $('#tutorial-hint').hidden = true; $('#hand-caption').textContent = 'ĐỘI HÌNH XUẤT TRẬN'; $('#hand-tip').textContent = 'Chọn 4 trong 10 tướng'; renderDeck(); preview(); updateHud(); }
function formatTime(t: number) { return `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`; }
function updateHud() {
    $('#best-record').textContent = `${wins} chiến thắng · Dữ liệu lưu trên thiết bị`;
    if (mode === 'battle') {
        $('#timer').textContent = formatTime(battle.time);
        $('#phase-label').textContent = battle.time >= 180 ? 'LÕI ĐANG QUÁ TẢI' : battle.phase === 'paused' ? 'TẠM DỪNG' : 'TRANH ĐOẠT LÕI';
        for (const [side, label] of [[0, 'ally'], [1, 'enemy']] as const) {
            $(`#${label}-hp`).textContent = `${Math.ceil(battle.cores[side])} / ${battle.maxCore}`;
            $(`#${label}-health`).style.width = `${battle.cores[side] / battle.maxCore * 100}%`;
            $(`#${label}-towers`).textContent = `${battle.towers.filter(t => t.side === side && t.hp > 0).length} trụ`;
        }
        $('#mana').textContent = Math.floor(battle.mana[0]).toString();
        $('#mana-track').innerHTML = Array.from({ length: 10 }, (_, i) => `<span><i style="width:${Math.max(0, Math.min(1, battle.mana[0] - i)) * 100}%"></i></span>`).join('');
        $('#mana-regen').textContent = `+${battle.has(0, 'storm') ? '1,26' : '1,05'} / giây`;
        document.querySelectorAll<HTMLElement>('#hand .hero-card').forEach(el => { const id = el.dataset.hero!, remaining = Math.max(0, (battle.cooldowns[0][id] || 0) - battle.time); el.classList.toggle('unaffordable', battle.mana[0] < HERO_MAP[id].cost); el.style.setProperty('--cooldown', `${remaining / RULES.cardCooldown * 100}%`); });
        const energy = battle.resonance[0];
        $('#pulse-value').textContent = energy >= 100 ? 'Sẵn sàng · Chọn một chiến tuyến' : `Đang tích năng lượng · ${Math.floor(energy)}%`;
        $('#pulse-fill').style.width = `${energy}%`;
        $('#pulse').classList.toggle('charged', energy >= 100);
        $('#objective p').textContent = battle.stats[0].towers ? `${battle.stats[0].towers}/3 trụ đã phá · Tiếp tục tấn công lõi.` : 'Phá trụ một đường → đánh sập lõi đối phương.';
    }
    $('#fps-mini').textContent = `${Math.round(fps)} FPS`;
    if (debug) {
        const sorted = frameMs.slice().sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * .95)] || 0;
        $('#debug-stats').textContent = `SIMULATION  ${battle.tick} ticks / 20 Hz\nPHASE       ${battle.phase}  ${battle.debugUsed ? '[DEBUG]' : ''}\nRENDER      ${Math.round(fps)} FPS · p95 ${p95.toFixed(1)} ms\nSIM STEP    ${simMs.toFixed(2)} ms\nUNITS       ${battle.units.length} / ${battle.maxUnits}\nDRAW CALLS  ${world.stats.calls}\nTRIANGLES   ${world.stats.triangles.toLocaleString()}\nGEOMETRIES  ${world.stats.geometries}\nSEED        ${battle.seed}\nQUALITY     ${world.quality}\nAI MANA     ${battle.mana[1].toFixed(1)}\nACTIVE FX   ${world.effects.length}`;
    }
}
const screenContext: ScreenContext = {
    get deck() { return deck; }, set deck(value) { deck = value; },
    get difficulty() { return difficulty; }, set difficulty(value) { difficulty = value; },
    get wins() { return wins; }, set wins(value) { wins = value; },
    get mode() { return mode; }, set mode(value) { mode = value; },
    get battle() { return battle; }, set battle(value) { battle = value; },
    get sound() { return sound; },
    get world() { return world; },
    get endedShown() { return endedShown; }, set endedShown(value) { endedShown = value; },
    get tutorial() { return tutorial; }, set tutorial(value) { tutorial = value; },
    get accumulator() { return runner.accumulator; }, set accumulator(value) { runner.accumulator = value; },
    toast, startBattle, lobby, persist, renderDeck, preview, clearSelection, card, formatTime
};
const openStory = (tutorialStart = false) => storyScreen(screenContext, tutorialStart);
const openRoster = (focusId = deck[0]) => rosterScreen(screenContext, focusId);
const settings = () => settingsScreen(screenContext);
const pause = () => pauseScreen(screenContext);
const result = () => resultScreen(screenContext);
let drag: {
    id: string;
    x: number;
    y: number;
    active: boolean;
} | null = null, suppressClick = false;
document.addEventListener('pointermove', e => {
    if (drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
        drag.active = true;
        selected = drag.id;
        skillSelected = false;
        updateSelection();
        $('#hero-tooltip').hidden = true;
        $('#drag-ghost').hidden = false;
        $('#drag-ghost').innerHTML = `<img src="${portraits[drag.id]}" alt=""/><span>${HERO_MAP[drag.id].name}</span>`;
        $('#drag-ghost').style.transform = `translate(${e.clientX - 42}px,${e.clientY - 95}px)`;
    }
    if (selected || skillSelected)
        world.setHover(e.clientX, e.clientY, skillSelected);
}, { signal: inputLifetime.signal });
document.addEventListener('pointerup', e => {
    if (drag?.active) {
        const r = world.canvas.getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom) {
            const p = world.pick(e.clientX, e.clientY);
            if (p?.valid)
                deploy(p.lane, p.x);
            else
                toast('Thả thẻ vào vùng sáng bên trái chiến trường.');
        }
        suppressClick = true;
        window.setTimeout(() => suppressClick = false, 50);
    }
    drag = null;
    $('#drag-ghost').hidden = true;
}, { signal: inputLifetime.signal });
document.addEventListener('pointercancel', () => { drag = null; $('#drag-ghost').hidden = true; clearSelection(); }, { signal: inputLifetime.signal });
world.canvas.addEventListener('click', e => {
    if (suppressClick || mode !== 'battle' || battle.phase !== 'playing')
        return;
    const p = world.pick(e.clientX, e.clientY);
    if (!p)
        return;
    if (skillSelected)
        deploy(p.lane);
    else if (selected) {
        if (p.valid)
            deploy(p.lane, p.x);
        else
            toast('Triển khai quân ở vùng sáng bên trái.');
    }
}, { signal: inputLifetime.signal });
document.querySelectorAll<HTMLElement>('[data-lane]').forEach(b => b.onclick = () => deploy(Number(b.dataset.lane)));
$('#pulse').onclick = () => {
    if (battle.phase !== 'playing')
        return;
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
$('#settings').onclick = settings;
$('#pause').onclick = pause;
$('#nav-battle').onclick = () => {
    if (mode === 'battle')
        pause();
};
$('.brand').onclick = e => {
    e.preventDefault();
    if (mode === 'battle')
        pause();
    else
        lobby();
};
function toggleDebug() { debug = !debug; $('#debug-panel').hidden = !debug; updateHud(); }
$('#debug-toggle').onclick = toggleDebug;
$('#debug-close').onclick = toggleDebug;
$('#debug-mana').onclick = () => {
    if (mode === 'battle') {
        battle.mana[0] = 10;
        battle.resonance[0] = 100;
        battle.debugUsed = true;
        toast('Debug: mana và cộng hưởng đã đầy.');
    }
};
$('#debug-auto').onclick = () => {
    autoPlayer = !autoPlayer;
    if (autoPlayer)
        battle.debugUsed = true;
    $('#debug-auto').textContent = `Tự đấu: ${autoPlayer ? 'bật' : 'tắt'}`;
};
$('#debug-speed').onchange = () => {
    speed = Number($<HTMLSelectElement>('#debug-speed').value);
    if (speed !== 1)
        battle.debugUsed = true;
};
$('#debug-win').onclick = () => {
    if (mode === 'battle' && battle.phase === 'playing') {
        battle.cores[1] = 0;
        battle.debugUsed = true;
    }
};
$('#debug-lose').onclick = () => {
    if (mode === 'battle' && battle.phase === 'playing') {
        battle.cores[0] = 0;
        battle.debugUsed = true;
    }
};
$('#debug-export').onclick = () => { const data = { version: 'kora-war-0.1', seed: battle.seed, deck, difficulty, performance: { fps, simMs, ...world.stats }, snapshot: battle.snapshot() }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `kora-war-match-${battle.seed}.json`; a.click(); URL.revokeObjectURL(url); };
document.addEventListener('keydown', e => {
    if (e.key === 'F3') {
        e.preventDefault();
        toggleDebug();
        return;
    }
    if ($('#modal-root').children.length) {
        if (e.key === 'Tab') {
            const focusable = Array.from(document.querySelectorAll<HTMLElement>('.modal button:not([disabled]),.modal select:not([disabled]),.modal input'));
            const first = focusable[0], last = focusable.at(-1);
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }
        return;
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName))
        return;
    if (mode !== 'battle')
        return;
    if (e.key === 'Escape') {
        if (selected || skillSelected)
            clearSelection();
        else
            pause();
    }
    if (battle.phase !== 'playing')
        return;
    if ('1234'.includes(e.key))
        selectCard(deck[Number(e.key) - 1]);
    if (e.key.toLowerCase() === 'q')
        $('#pulse').click();
    const lane = ['w', 'e', 'r'].indexOf(e.key.toLowerCase());
    if (lane >= 0)
        deploy(lane);
}, { signal: inputLifetime.signal });
document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'battle' && battle.phase === 'playing')
        pause();
    lastFrame = performance.now();
    runner.reset();
}, { signal: inputLifetime.signal });
world.canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    if (mode === 'battle')
        pause();
    toast('Mất ngữ cảnh đồ họa. Hãy tải lại trang nếu hình ảnh không trở lại.');
}, { signal: inputLifetime.signal });
renderDeck();
preview();
updateHud();
let lowFrames = 0;
let frameHandle = 0;
function loop(now: number) {
    const rawDt = (now - lastFrame) / 1000, dt = Math.min(.25, rawDt);
    lastFrame = now;
    if (rawDt > 0) {
        frameMs.push(rawDt * 1000);
        if (frameMs.length > 180)
            frameMs.shift();
        fps = 1000 / (frameMs.reduce((a, b) => a + b, 0) / frameMs.length);
    }
    if (mode === 'battle' && battle.phase === 'playing') {
        const before = performance.now();
        const steps = runner.advance(dt, speed, () => {
            if (autoPlayer && battle.tick % 25 === 0)
                battle.ai(0);
            battle.step();
        }, () => battle.phase === 'playing');
        simMs = steps ? (performance.now() - before) / steps : simMs;
        for (const e of battle.events)
            if (e.id > lastAudioEvent) {
                lastAudioEvent = e.id;
                if (e.type === 'skill' && e.side === 0)
                    sound.tone('skill');
                else if (e.type === 'tower')
                    toast(e.side === 1 ? 'Đã phá trụ địch! Tiến vào lõi năng lượng.' : 'Một trụ đồng minh đã thất thủ!');
            }
        if ((battle.phase as string) === 'ended')
            result();
    }
    world.render(battle, dt, !!selected || skillSelected);
    if (now - lastUi > 160) {
        updateHud();
        lastUi = now;
    }
    if (fps < 28 && world.quality === 'high' && frameMs.length > 120) {
        lowFrames += dt;
        if (lowFrames > 5) {
            world.setQuality('low');
            toast('Đã chuyển đồ họa tiết kiệm để giữ trận đấu mượt.');
            lowFrames = 0;
        }
    }
    else
        lowFrames = 0;
    frameHandle = requestAnimationFrame(loop);
}
frameHandle = requestAnimationFrame(loop);
// Read-only diagnostics for QA; intentional mutation controls are labelled in the visible debug panel.
Object.defineProperty(window, 'aetherfall', { value: { get snapshot() { return battle.snapshot(); }, get mode() { return mode; }, get renderer() { return world.stats; } }, writable: false, configurable: true });
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        inputLifetime.abort();
        cancelAnimationFrame(frameHandle);
        clearTimeout(toastTimer);
        world.dispose();
        sound.dispose();
        delete (window as Window & {
            aetherfall?: unknown;
        }).aetherfall;
    });
}
