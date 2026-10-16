import { wireMatchReview } from './match-review';
import { validateContent } from '../data/content';
import { DEFAULT_ENGAGE } from '../data/abilities';
import { api } from '../services/api';
import { esc } from './html';
import { AssetPreview } from './preview';
import './studio.css';
import { type State, sections } from './types';
import { renderStudioPage } from './views';
import { modelPartsEditor } from './model-parts';
const root = document.querySelector<HTMLDivElement>('#studio')!;
let state: State,
  section = 'overview',
  hero = 'solan',
  selectedAsset = '',
  dirty = false,
  preview: AssetPreview | undefined;
function render() {
  document.querySelector<HTMLAudioElement>('#sound-preview')?.pause();
  preview?.dispose();
  preview = undefined;
  root.innerHTML = `<aside><a class="studio-brand" href="/">◈ <b>KORA WAR</b><small>CONTENT STUDIO</small></a><nav>${sections.map(([id, icon, name]) => `<button data-section="${id}" class="${section === id ? 'active' : ''}"><i>${icon}</i>${name}</button>`).join('')}</nav><div class="sidebar-footer"><span class="live-dot"></span> ${state.assetService?.available ? 'PostgreSQL assets · ' + esc(state.assetService.storage) : 'SQLite · Local workspace'}<small>Gameplay config · SQLite</small><small>Revision ${state.revision}</small><button id="logout">Đăng xuất ↗</button></div></aside><main><header><div><small>WORKSPACE / ${esc(sections.find((s) => s[0] === section)?.[2])}</small><h1>${esc(sections.find((s) => s[0] === section)?.[2])}</h1></div><div class="header-actions"><span id="dirty">${dirty ? '● Chưa lưu' : '✓ Đã lưu'}</span><button id="save">Lưu bản nháp</button><button id="publish" class="gold">Phát hành ↗</button></div></header><div id="notice" role="status"></div><div class="page">${renderStudioPage(state, section, hero, selectedAsset)}</div></main>`;
  document.querySelectorAll<HTMLButtonElement>('[data-section]').forEach(
    (b) =>
      (b.onclick = () => {
        section = b.dataset.section!;
        render();
      }),
  );
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-path]').forEach(
    (el) =>
      (el.onchange = () => {
        try {
          readField(el);
          if (el.dataset.path!.startsWith('abilities.')) syncAbilityJSON();
          markDirty();
          if (el.dataset.path!.startsWith('models.') && state.draft.models[hero])
            void task(() => refreshModelPreview());
        } catch (e) {
          notice(e);
        }
      }),
  );
  document.querySelectorAll<HTMLTextAreaElement>('[data-json]').forEach(
    (el) =>
      (el.onchange = () => {
        try {
          setPath(el.dataset.json!, JSON.parse(el.value));
          const prefix = el.dataset.json!;
          document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-path]').forEach((field) => {
            if (!field.dataset.path!.startsWith(prefix + '.')) return;
            const value = field.dataset
              .path!.split('.')
              .reduce<unknown>(
                (v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined),
                state.draft,
              );
            field.value = value === undefined ? '' : String(value);
          });
          document.querySelectorAll<HTMLInputElement>('[data-bool]').forEach((field) => {
            if (field.dataset.bool!.startsWith(prefix + '.'))
              field.checked = Boolean(
                field.dataset
                  .bool!.split('.')
                  .reduce<unknown>(
                    (v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined),
                    state.draft,
                  ),
              );
          });
          markDirty();
        } catch {
          notice('JSON chưa hợp lệ; nội dung này chưa được áp dụng.');
        }
      }),
  );
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-path]').forEach((el) => {
    el.oninput = () => {
      readField(el);
      if (el.dataset.path!.startsWith('abilities.')) syncAbilityJSON();
      markDirty();
    };
  });
  document.querySelectorAll<HTMLTextAreaElement>('[data-json]').forEach((el) => {
    el.oninput = () => {
      el.dataset.edited = 'true';
      markDirty();
    };
  });
  $('#save').onclick = () => void task(save);
  $('#publish').onclick = () =>
    void task(async () => {
      await save();
      await api('/api/admin/publish', 'POST', { version: state.version });
      await load();
      notice('Đã phát hành. Game nạp phiên bản này ở lần mở tiếp theo.');
    });
  $('#logout').onclick = () =>
    void task(async () => {
      await api('/api/admin/logout', 'POST', {});
      login();
    });
  wire();
}
function $(selector: string) {
  return document.querySelector<HTMLElement>(selector)!;
}
function readField(el: HTMLInputElement | HTMLSelectElement) {
  if (el.dataset.path!.startsWith('models.') && !state.draft.models[hero]) return;
  setPath(
    el.dataset.path!,
    el instanceof HTMLInputElement && el.type === 'number'
      ? el.value === ''
        ? undefined
        : Number(el.value)
      : el.value,
  );
}
function setPath(path: string, value: unknown) {
  const keys = path.split('.');
  let target: unknown = state.draft;
  for (const k of keys.slice(0, -1)) {
    const parent = target as Record<string, unknown>;
    parent[k] ||= {};
    target = parent[k];
  }
  if (!target) return;
  if (value === '' || value === undefined) delete (target as Record<string, unknown>)[keys.at(-1)!];
  else (target as Record<string, unknown>)[keys.at(-1)!] = value;
}
function syncAbilityJSON() {
  const field = document.querySelector<HTMLTextAreaElement>(`[data-json="abilities.${hero}"]`);
  if (field) {
    field.value = JSON.stringify(state.draft.abilities[hero], null, 2);
    delete field.dataset.edited;
  }
}
function markDirty() {
  dirty = true;
  $('#dirty').textContent = '● Chưa lưu';
}
function notice(message: unknown) {
  const el = $('#notice');
  if (el) {
    el.textContent = message instanceof Error ? message.message : String(message);
    el.classList.add('visible');
  }
}
async function task(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    notice(e);
  }
}
async function refreshModelPreview(rebuildParts = true) {
  const current = preview,
    selectedHero = hero,
    binding = state.draft.models[hero];
  if (!current || !binding) return;
  const names = await current.show(structuredClone(binding));
  const parts = document.querySelector<HTMLElement>('#model-parts');
  if (!names || current !== preview || selectedHero !== hero || !parts || !rebuildParts) return;
  parts.innerHTML = modelPartsEditor(names, binding.hiddenMaterials);
  parts.querySelectorAll<HTMLInputElement>('[data-model-part]').forEach((field) => {
    field.onchange = () => {
      const hidden = new Set(binding.hiddenMaterials ?? []),
        name = field.dataset.modelPart!;
      if (field.checked) hidden.delete(name);
      else hidden.add(name);
      binding.hiddenMaterials = [...hidden].sort();
      markDirty();
      void task(() => refreshModelPreview(false));
    };
  });
}
async function load() {
  state = await api<State>('/api/admin/state');
  dirty = false;
  render();
}
async function save() {
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-path]').forEach(readField);
  document
    .querySelectorAll<HTMLInputElement>('[data-bool]')
    .forEach((el) => setPath(el.dataset.bool!, el.checked));
  document
    .querySelectorAll<HTMLTextAreaElement>('[data-card-list]')
    .forEach((el) => setPath(el.dataset.cardList!, el.value.split(/[\s,]+/).filter(Boolean)));
  for (const field of Array.from(document.querySelectorAll<HTMLTextAreaElement>('[data-json]'))) {
    if (!field.dataset.edited) continue;
    try {
      setPath(field.dataset.json!, JSON.parse(field.value));
    } catch {
      throw new Error('JSON kỹ năng chưa hợp lệ. Sửa trước khi lưu hoặc phát hành.');
    }
  }
  validateContent(state.draft);
  const updated = await api<Pick<State, 'version' | 'draft' | 'revision' | 'ruleModules'>>(
    '/api/admin/draft',
    'PUT',
    {
      content: state.draft,
      version: state.version,
    },
  );
  Object.assign(state, updated);
  document.querySelectorAll<HTMLTextAreaElement>('[data-json]').forEach((el) => {
    delete el.dataset.edited;
  });
  dirty = false;
  if (section === 'gameplay') {
    const manifest = document.querySelector('#config-modules');
    if (manifest) {
      const open = manifest.hasAttribute('open');
      const holder = document.createElement('div');
      holder.innerHTML = renderStudioPage(state, section, hero, selectedAsset);
      const next = holder.querySelector('#config-modules');
      if (next) {
        next.toggleAttribute('open', open);
        manifest.replaceWith(next);
      }
    }
  }
  $('#dirty').textContent = '✓ Đã lưu';
  notice('Đã lưu bản nháp.');
}
function wire() {
  wireMatchReview(root);
  const addTier = document.querySelector<HTMLButtonElement>('#add-rank-tier');
  if (addTier)
    addTier.onclick = () => {
      const tiers = state.draft.competition!.rating.tiers;
      tiers.push({ name: `Bậc ${tiers.length + 1}`, minimum: (tiers.at(-1)?.minimum ?? 0) + 200 });
      dirty = true;
      render();
    };

  const addEngage = document.querySelector<HTMLButtonElement>('#add-engage');
  if (addEngage)
    addEngage.onclick = () => {
      state.draft.abilities[hero].engage = { ...DEFAULT_ENGAGE, enabled: false };
      dirty = true;
      render();
    };
  document.querySelectorAll<HTMLTextAreaElement>('[data-card-list]').forEach((el) => {
    el.onchange = () => {
      setPath(el.dataset.cardList!, el.value.split(/[\s,]+/).filter(Boolean));
      markDirty();
    };
  });
  const effectList = (path: string) =>
    path.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown>)[k], state.draft) as unknown[];
  document.querySelectorAll<HTMLButtonElement>('[data-config-add]').forEach((button) => {
    button.onclick = () => {
      effectList(button.dataset.configAdd!).push(
        button.dataset.effectType === 'spell'
          ? { kind: 'damage', amount: 25 }
          : { kind: 'attack', amount: 1.1 },
      );
      dirty = true;
      render();
    };
  });
  document.querySelectorAll<HTMLButtonElement>('[data-config-remove]').forEach((button) => {
    button.onclick = () => {
      effectList(button.dataset.configRemove!).splice(Number(button.dataset.index), 1);
      dirty = true;
      render();
    };
  });
  document.querySelectorAll<HTMLSelectElement>('[data-vfx-spell]').forEach((el) => {
    el.onchange = () => {
      setPath(
        `vfx.spellSprites.${el.dataset.vfxSpell}`,
        el.value ? { assetId: el.value, columns: 8, rows: 1, fps: 12 } : undefined,
      );
      dirty = true;
      render();
    };
  });
  document.querySelectorAll<HTMLSelectElement>('[data-vfx-event]').forEach((el) => {
    el.onchange = () => {
      setPath(
        `vfx.eventSprites.${el.dataset.vfxEvent}`,
        el.value ? { assetId: el.value, columns: 8, rows: 1, fps: 12 } : undefined,
      );
      dirty = true;
      render();
    };
  });
  document.querySelectorAll<HTMLSelectElement>('[data-texture]').forEach((el) => {
    el.onchange = () => {
      setPath(
        `map.textures.${el.dataset.texture}`,
        el.value ? { assetId: el.value, repeat: 1, tint: '#ffffff' } : undefined,
      );
      dirty = true;
      render();
    };
  });
  document.querySelectorAll<HTMLSelectElement>('[data-surface-map]').forEach((el) => {
    el.onchange = () => {
      setPath(`map.textures.${el.dataset.surfaceMap}.${el.dataset.channel}`, el.value || undefined);
      dirty = true;
      render();
    };
  });
  document.querySelectorAll<HTMLSelectElement>('[data-sound]').forEach((el) => {
    el.onchange = () => {
      setPath(
        el.dataset.sound!,
        el.value ? { assetId: el.value, volume: 0.6, rate: 1, cooldownMs: 100 } : undefined,
      );
      dirty = true;
      render();
    };
  });
  document.querySelectorAll<HTMLButtonElement>('[data-listen]').forEach((el) => {
    el.onclick = () => {
      const audio = document.querySelector<HTMLAudioElement>('#sound-preview')!;
      audio.src = `/api/assets/${el.dataset.listen}`;
      const binding = el.dataset
        .listenPath!.split('.')
        .reduce(
          (value: unknown, key) => (value as Record<string, unknown>)[key],
          state.draft,
        ) as import('../data/media').SoundBinding;
      const profile = state.draft.audio!;
      const cue = el.dataset.listenPath!.split('.').at(-1)!;
      audio.volume = Math.max(
        0,
        Math.min(
          1,
          binding.volume *
            profile.master *
            (['click', 'win', 'lose'].includes(cue) ? profile.ui : profile.effects),
        ),
      );
      audio.playbackRate = binding.rate;
      audio.preservesPitch = false;
      audio.hidden = false;
      void task(() => audio.play());
    };
  });
  document.querySelectorAll<HTMLElement>('[data-archive]').forEach(
    (b) =>
      (b.onclick = () =>
        void task(async () => {
          await api('/api/admin/assets/archive', 'POST', {
            id: b.dataset.archive,
            archived: b.dataset.archived === '1',
          });
          await load();
          notice('Đã cập nhật trạng thái asset.');
        })),
  );
  document.querySelectorAll<HTMLInputElement>('[data-bool]').forEach(
    (el) =>
      (el.onchange = () => {
        setPath(el.dataset.bool!, el.checked);
        syncAbilityJSON();
        markDirty();
      }),
  );
  const addEffect = $('#add-effect');
  if (addEffect)
    addEffect.onclick = () => {
      state.draft.abilities[hero].effects.push({
        kind: 'damage',
        amount: 25,
        targets: { group: 'nearEnemies' },
      });
      dirty = true;
      render();
    };
  document.querySelectorAll<HTMLElement>('[data-remove-effect]').forEach(
    (b) =>
      (b.onclick = () => {
        state.draft.abilities[hero].effects.splice(Number(b.dataset.removeEffect), 1);
        dirty = true;
        render();
      }),
  );
  document.querySelectorAll<HTMLElement>('[data-go]').forEach(
    (b) =>
      (b.onclick = () => {
        section = b.dataset.go!;
        render();
      }),
  );
  document.querySelectorAll<HTMLElement>('[data-hero]').forEach(
    (b) =>
      (b.onclick = () => {
        hero = b.dataset.hero!;
        render();
      }),
  );
  if ($('#asset-preview')) {
    const b =
      section === 'heroes'
        ? state.draft.models[hero]
        : selectedAsset
          ? { assetId: selectedAsset, height: 2.2, yaw: 0, clips: {} }
          : undefined;
    if (
      section === 'heroes' ||
      !selectedAsset ||
      state.assets.find((a) => a.id === selectedAsset)?.kind === 'model'
    )
      preview = new AssetPreview($('#asset-preview'));
    if (b && preview)
      void task(() => (section === 'heroes' ? refreshModelPreview() : preview!.show(structuredClone(b))));
  }
  const model = document.querySelector<HTMLSelectElement>('#model-binding');
  if (model)
    model.onchange = () => {
      if (model.value) state.draft.models[hero] = { assetId: model.value, height: 2.2, yaw: 0, clips: {} };
      else delete state.draft.models[hero];
      dirty = true;
      render();
    };
  const animation = document.querySelector<HTMLSelectElement>('#animation-binding');
  if (animation)
    animation.onchange = () => {
      const b = state.draft.models[hero];
      if (!b) return;
      b.animationAssetId = animation.value || undefined;
      dirty = true;
      render();
    };
  document.querySelectorAll<HTMLElement>('[data-inspect]').forEach(
    (b) =>
      (b.onclick = () => {
        selectedAsset = b.dataset.inspect!;
        render();
      }),
  );
  const inspect = document.querySelector<HTMLSelectElement>('#inspect-asset');
  if (inspect)
    inspect.onchange = () => {
      selectedAsset = inspect.value;
      render();
    };
  if (selectedAsset && section === 'assets') {
    const a = state.assets.find((a) => a.id === selectedAsset);
    if (a) {
      if (a.kind === 'audio') {
        $('#asset-preview').innerHTML = `<audio controls src="/api/assets/${a.id}"></audio>`;
      } else if (a.kind === 'image') {
        $('#asset-preview').innerHTML =
          `<img class="texture-preview" src="/api/assets/${a.id}" alt="${esc(a.name)}">`;
      }
      $('#inspect-clip').innerHTML = (a.metadata.clips || [])
        .map((c) => `<option>${esc(c)}</option>`)
        .join('');
      $('#inspect-clip').onchange = (e) => preview?.clip((e.target as HTMLSelectElement).value);
      $('#asset-info').textContent = `${a.metadata.author} · ${a.metadata.license}`;
    }
  }
  const upload = document.querySelector<HTMLFormElement>('#upload-form');
  if (upload)
    upload.onsubmit = (e) => {
      e.preventDefault();
      void task(async () => {
        const file = document.querySelector<HTMLInputElement>('#asset-file')!.files?.[0];
        if (!file) return;
        if (file.size > 30 * 1024 * 1024) throw new Error('File tối đa 30 MB.');
        const form = new FormData(upload),
          metadata = {
            name: form.get('name'),
            author: form.get('author'),
            sourceUrl: form.get('sourceUrl'),
            license: form.get('license'),
            rightsConfirmed: true,
          };
        const progress = document.querySelector<HTMLProgressElement>('#upload-progress')!;
        progress.hidden = false;
        const response = await fetch('/api/admin/assets', {
          method: 'POST',
          headers: {
            'X-Kora-Request': '1',
            'X-Asset-Metadata': encodeURIComponent(JSON.stringify(metadata)),
          },
          body: file,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        selectedAsset = result.id;
        await load();
        notice(
          result.storageSync === 'pending'
            ? 'Đã lưu local; đồng bộ PostgreSQL/storage đang chờ. Dùng assets:sync để thử lại.'
            : 'Upload hoàn tất. Chọn asset để xem clip và gán vào tướng/map.',
        );
      });
    };
  const addProp = $('#add-prop');
  if (addProp)
    addProp.onclick = () => {
      const id = (document.querySelector('#prop-asset') as HTMLSelectElement).value;
      if (!id) return;
      state.draft.map.props.push({ assetId: id, x: 0, z: -8, scale: 1, yaw: 0 });
      dirty = true;
      render();
    };
  document.querySelectorAll<HTMLElement>('[data-remove-prop]').forEach(
    (b) =>
      (b.onclick = () => {
        state.draft.map.props.splice(Number(b.dataset.removeProp), 1);
        dirty = true;
        render();
      }),
  );
  const addItem = $('#add-item');
  if (addItem)
    addItem.onclick = () => {
      state.draft.items.push({
        id: `item-${Date.now()}`,
        name: 'Mảnh Aether',
        price: 40,
        heroId: 'solan',
        copies: 2,
      });
      dirty = true;
      render();
    };
  document.querySelectorAll<HTMLElement>('[data-remove-item]').forEach(
    (b) =>
      (b.onclick = () => {
        state.draft.items.splice(Number(b.dataset.removeItem), 1);
        dirty = true;
        render();
      }),
  );
  const wallet = document.querySelector<HTMLFormElement>('#wallet-form');
  if (wallet)
    wallet.onsubmit = (e) => {
      e.preventDefault();
      void task(async () => {
        const form = new FormData(wallet);
        await api('/api/admin/wallet', 'POST', {
          player: form.get('player'),
          delta: Number(form.get('delta')),
          reason: form.get('reason'),
        });
        await load();
        notice('Đã ghi giao dịch và audit log.');
      });
    };
  document.querySelectorAll<HTMLElement>('[data-restore]').forEach(
    (b) =>
      (b.onclick = () =>
        void task(async () => {
          await api('/api/admin/restore', 'POST', {
            revision: Number(b.dataset.restore),
            version: state.version,
          });
          await load();
          notice('Đã khôi phục vào bản nháp.');
        })),
  );
}
function login() {
  preview?.dispose();
  root.innerHTML = `<div class="login"><div class="login-art"><span>◈</span><h1>KORA WAR</h1><p>CONTENT STUDIO</p></div><form id="login-form"><span class="eyebrow">LOCAL WORKSPACE</span><h2>Chào mừng trở lại.</h2><p class="muted">Đăng nhập để quản lý thế giới Kora War.</p><label>Tài khoản<input value="admin" readonly autocomplete="username"></label><label>Mật khẩu<input name="password" type="password" required autocomplete="current-password"></label><button class="gold">Đăng nhập →</button><p id="login-error" role="alert"></p><small class="muted">Thông tin khởi tạo nằm trong .data/admin-setup.txt</small></form></div>`;
  document.querySelector<HTMLFormElement>('#login-form')!.onsubmit = (e) => {
    e.preventDefault();
    const password = new FormData(e.currentTarget as HTMLFormElement).get('password');
    void api('/api/admin/login', 'POST', { password })
      .then(load)
      .catch((e) => {
        $('#login-error').textContent = e.message;
      });
  };
}
void load().catch(login);
window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
  }
});
if (import.meta.hot) import.meta.hot.dispose(() => preview?.dispose());
