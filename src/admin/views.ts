import type { ModelBinding } from '../data/content';
import { abilityEditor } from './ability-editor';
import { esc, input } from './html';
import type { State } from './types';
import { audioEditor } from './audio-editor';
export function renderStudioPage(state: State, section: string, hero: string, selectedAsset: string): string {
  if (section === 'audio') return audioEditor(state);
  const labels: Record<string, string> = {
    hp: 'Máu',
    attack: 'Sát thương',
    range: 'Tầm đánh',
    speed: 'Tốc độ',
    interval: 'Nhịp đánh',
    cost: 'Mana',
    skillCooldown: 'Hồi kỹ năng',
    coreHp: 'Máu lõi',
    towerHp: 'Máu trụ',
    towerDamage: 'Sát thương trụ',
    towerRange: 'Tầm trụ',
    towerCooldown: 'Hồi trụ',
    startingMana: 'Mana đầu',
    manaPerSecond: 'Mana / giây',
    cardCooldown: 'Hồi thẻ',
    overtimeAt: 'Quá tải sau (s)',
    overtimeBaseDamage: 'Sát thương quá tải',
    overtimeAcceleration: 'Gia tốc quá tải',
    winGold: 'Thắng trận',
    lossGold: 'Thua trận',
    chestCost: 'Giá rương',
    chestGold: 'Vàng trong rương',
    upgradeBase: 'Vàng nâng cấp × cấp',
    height: 'Chiều cao',
    yaw: 'Góc xoay (độ)',
    idle: 'Đứng',
    walk: 'Di chuyển',
    attackClip: 'Tấn công',
    cast: 'Kỹ năng',
    stunned: 'Choáng',
    spawn: 'Xuất hiện',
    death: 'Tử trận',
  };
  function options(assets = state.assets.filter((a) => a.kind === 'model'), value = '') {
    return (
      `<option value="">Mặc định</option>` +
      assets
        .filter((a) => !a.archived)
        .map(
          (a) => `<option value="${esc(a.id)}" ${a.id === value ? 'selected' : ''}>${esc(a.name)}</option>`,
        )
        .join('')
    );
  }
  function bindingForm(binding: ModelBinding | undefined) {
    const b = binding || { assetId: '', height: 2.2, yaw: 0, clips: {} };
    const clips = state.assets.find((a) => a.id === (b.animationAssetId || b.assetId))?.metadata.clips || [];
    return `<div class="form-grid"><label>Model GLB<select id="model-binding">${options(undefined, b.assetId)}</select></label><label>Animation GLB (cùng rig)<select id="animation-binding">${options(undefined, b.animationAssetId)}</select></label>${input(`models.${hero}.height`, 'Chiều cao', b.height)}${input(`models.${hero}.yaw`, 'Hướng model', b.yaw)}</div><div class="clip-grid">${['idle', 'walk', 'attack', 'cast', 'stunned', 'spawn', 'death'].map((s) => `<label>${labels[s === 'attack' ? 'attackClip' : s]}<select data-path="models.${hero}.clips.${s}"><option value="">Dùng idle</option>${clips.map((c) => `<option ${b.clips[s as keyof typeof b.clips] === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`).join('')}</div>`;
  }
  function content(): string {
    const c = state.draft;
    if (section === 'overview')
      return `<div class="welcome"><div><span class="eyebrow">BUILD WORLDS. BALANCE BATTLES.</span><h2>Thế giới Elyndra,<br>trong tay bạn.</h2><p>Chỉnh nội dung, xem trước asset và phát hành<br>một phiên bản thống nhất cho Kora War.</p><button class="gold" data-go="heroes">Mở Character Studio →</button></div><div class="studio-crystal">◈</div></div><div class="metrics">${[
        [c.heroes.length, 'Nhân vật'],
        [state.assets.length, 'Assets'],
        ['03', 'Chiến tuyến'],
        [state.players.length, 'Người chơi'],
      ]
        .map(([n, l]) => `<article><b>${n}</b><span>${l}</span></article>`)
        .join(
          '',
        )}</div><div class="columns"><article class="panel"><h3>Luồng phát hành</h3><ol><li>Upload model và ghi nguồn</li><li>Gán tướng, clip, map và VFX</li><li>Lưu nháp → Phát hành → Mở game</li></ol><a href="/" target="_blank" rel="noopener">Mở Kora War ↗</a></article><article class="panel"><h3>Hoạt động gần đây</h3>${auditList(state.audit.slice(0, 5))}</article></div>`;
    if (section === 'heroes') {
      const h = c.heroes.find((h) => h.id === hero)!,
        index = c.heroes.indexOf(h);
      return `<div class="character-layout"><div class="character-list">${c.heroes.map((h) => `<button data-hero="${h.id}" class="${h.id === hero ? 'active' : ''}"><span style="--tint:#${h.color.toString(16).padStart(6, '0')}">♜</span><div><b>${h.name}</b><small>${h.origin} · ${h.role}</small></div><em>${h.cost}</em></button>`).join('')}</div><div class="character-editor"><div class="columns"><div class="panel preview-panel"><div id="asset-preview"></div><span class="preview-label">3D PREVIEW · kéo để xoay</span></div><article class="panel"><span class="eyebrow">${h.origin} / ${h.role}</span><h2>${h.name}</h2><div class="form-grid">${['hp', 'attack', 'range', 'speed', 'interval', 'cost', 'skillCooldown'].map((k) => input(`heroes.${index}.${k}`, labels[k], h[k as keyof typeof h])).join('')}</div></article></div><article class="panel"><h3>Model & Animation</h3>${bindingForm(c.models[hero])}</article><article class="panel"><h3>Cơ chế · ${esc(h.ability)}</h3><div class="form-grid">${input(`heroes.${index}.ability`, 'Tên kỹ năng', h.ability, 'text')}${input(`heroes.${index}.description`, 'Mô tả', h.description, 'text')}</div><p class="muted">Hiệu ứng hỗ trợ: damage, heal, shield, slow, stun. Thay đổi theo cấu trúc dữ liệu, không chạy mã tùy ý.</p>${abilityEditor(c, hero)}</article></div></div>`;
    }
    if (section === 'assets')
      return `<div class="section-title"><div><h2>Asset Library</h2><p class="muted">Model, texture, sprite, animation và âm thanh. GLB tự chứa · tối đa 30 MB.</p></div><a href="https://modelviewer.lol/" target="_blank" rel="noopener">Khada Model Viewer ↗</a></div><div class="columns"><article class="panel"><h3>Upload asset</h3><form id="upload-form"><label>File<input type="file" id="asset-file" accept=".glb,.png,.jpg,.jpeg,.webp,.wav,.ogg" required></label><div class="form-grid"><label>Tên<input name="name" required maxlength="160"></label><label>Tác giả<input name="author" required placeholder="Riot Games"></label><label>Nguồn URL<input name="sourceUrl" type="url" required placeholder="https://modelviewer.lol/..."></label><label>Quyền sử dụng / giấy phép<input name="license" required placeholder="Giấy phép do chủ dự án cung cấp"></label></div><label class="checkbox"><input type="checkbox" name="rights" required> Tôi có quyền dùng asset này trong Kora War</label><button class="gold" type="submit">Upload vào thư viện ↑</button><progress id="upload-progress" hidden></progress></form></article><article class="panel preview-panel"><div id="asset-preview"></div><span class="preview-label">MODEL INSPECTOR</span><select id="inspect-asset">${options(state.assets, selectedAsset)}</select><select id="inspect-clip"><option>Chọn clip sau khi nạp model</option></select><div id="asset-info" class="muted"></div></article></div><div class="asset-grid">${state.assets.map((a) => `<article class="asset-card ${a.archived ? 'archived' : ''}"><button class="asset-open" data-inspect="${a.id}"><span class="asset-symbol">${a.kind === 'model' ? '⬡' : a.kind === 'audio' ? '♫' : '▧'}</span><b>${esc(a.name)}</b><small>${a.kind.toUpperCase()} · ${(a.bytes / 1024 / 1024).toFixed(2)} MB</small><small>${a.metadata.clips?.length || 0} clips · ${a.metadata.triangles?.toLocaleString() || '—'} tris</small><span>${esc(a.metadata.author)}</span></button><button class="asset-archive" data-archive="${a.id}" data-archived="${a.archived ? 0 : 1}">${a.archived ? 'Khôi phục' : 'Ẩn khỏi thư viện'}</button></article>`).join('') || '<article class="panel muted">Thư viện chưa có asset. Xuất GLB với toàn bộ animation từ Khada rồi upload tại đây.</article>'}</div>`;
    if (section === 'map')
      return `<div class="columns"><article class="panel"><span class="eyebrow">CHAPTER I / THREE LANES</span><h2>${esc(c.map.name)}</h2><div class="map-diagram"><div class="map-core">◈</div><div class="map-lanes">${[0, 1, 2].map((i) => `<div><i></i><span>LANE 0${i + 1}</span><i></i></div>`).join('')}</div><div class="map-core enemy">◈</div>${c.map.props.map((p) => `<span class="map-prop" style="left:${((p.x + 22) / 44) * 100}%;top:${((p.z + 13) / 26) * 100}%" title="${esc(p.assetId)}">⬡</span>`).join('')}</div><p class="muted">Prop là trang trí; ba lane và vùng triển khai giữ vị trí chiến đấu đã chốt.</p></article><article class="panel"><h3>Môi trường</h3><div class="form-grid">${input('map.name', 'Tên màn', c.map.name, 'text')}${input('map.background', 'Màu sương / nền', c.map.background, 'color')}${input('map.exposure', 'Exposure', c.map.exposure)}</div><h3>Texture địa hình</h3>${(
        ['stone', 'grass'] as const
      )
        .map((kind) => {
          const b = c.map.textures?.[kind];
          return `<label>${kind === 'stone' ? 'Đường đá' : 'Cỏ'}<select data-texture="${kind}">${options(
            state.assets.filter((a) => a.kind === 'image'),
            b?.assetId,
          )}</select></label>${b ? input(`map.textures.${kind}.repeat`, 'Lặp texture', b.repeat) + input(`map.textures.${kind}.tint`, 'Màu nền', b.tint, 'color') : ''}`;
        })
        .join(
          '',
        )}<label>Trụ phòng thủ<select data-path="map.towerAssetId">${options(undefined, c.map.towerAssetId)}</select></label><label>Lõi căn cứ<select data-path="map.coreAssetId">${options(undefined, c.map.coreAssetId)}</select></label><h3>Thêm prop</h3><select id="prop-asset">${options()}</select><button id="add-prop">+ Thêm vào map</button></article></div><article class="panel"><h3>Vị trí asset trên bản đồ</h3>${c.map.props.map((p, i) => `<div class="prop-row"><b>${esc(state.assets.find((a) => a.id === p.assetId)?.name || p.assetId)}</b>${['x', 'z', 'scale', 'yaw'].map((k) => input(`map.props.${i}.${k}`, k, p[k as keyof typeof p])).join('')}<button data-remove-prop="${i}">×</button></div>`).join('') || '<p class="muted">Chưa có prop nhập ngoài.</p>'}</article><article class="panel"><h3>Luật màn chơi</h3><div class="form-grid rules-grid">${['coreHp', 'towerHp', 'towerDamage', 'towerRange', 'towerCooldown', 'startingMana', 'manaPerSecond', 'cardCooldown', 'overtimeAt', 'overtimeBaseDamage', 'overtimeAcceleration'].map((k) => input(`rules.${k}`, labels[k], c.rules[k as keyof typeof c.rules])).join('')}</div></article>`;
    if (section === 'vfx')
      return `<div class="columns"><article class="panel"><span class="eyebrow">VISUAL EFFECTS</span><h2>Aether Resonance</h2><div class="vfx-preview" style="--glow:${c.vfx.ally}"><span>✧</span><i></i><i></i></div></article><article class="panel"><h3>VFX profile</h3><div class="form-grid">${input('vfx.ally', 'Đồng minh', c.vfx.ally, 'color')}${input('vfx.enemy', 'Đối thủ', c.vfx.enemy, 'color')}${input('vfx.heal', 'Hồi máu', c.vfx.heal, 'color')}${input('vfx.intensity', 'Kích thước hiệu ứng', c.vfx.intensity)}${input('vfx.spriteColumns', 'Atlas: cột', c.vfx.spriteColumns || 8)}${input('vfx.spriteRows', 'Atlas: hàng', c.vfx.spriteRows || 1)}</div><label>Sprite / atlas<select data-path="vfx.spriteAssetId">${options(
        state.assets.filter((a) => a.kind === 'image'),
        c.vfx.spriteAssetId,
      )}</select></label><p class="muted">Dùng pool giới hạn để kiểm soát hiệu ứng trên mobile.</p></article></div>`;
    if (section === 'economy')
      return `<article class="panel"><h3>Cân bằng phần thưởng</h3><div class="form-grid rules-grid">${Object.entries(
        c.economy,
      )
        .map(([k, v]) => input(`economy.${k}`, labels[k], v))
        .join(
          '',
        )}</div><p class="muted">Mỗi cấp tăng 5% HP và attack, tối đa cấp 10. Nâng cấp cần 2×cấp mảnh. Thưởng trận được server kiểm chứng.</p></article><article class="panel"><div class="section-title"><h3>Danh mục cửa hàng</h3><button id="add-item">+ Vật phẩm</button></div>${c.items.map((i, n) => `<div class="item-row">${input(`items.${n}.id`, 'ID', i.id, 'text')}${input(`items.${n}.name`, 'Tên', i.name, 'text')}<label>Tướng<select data-path="items.${n}.heroId">${c.heroes.map((h) => `<option value="${h.id}" ${h.id === i.heroId ? 'selected' : ''}>${h.name}</option>`).join('')}</select></label>${input(`items.${n}.price`, 'Vàng', i.price)}${input(`items.${n}.copies`, 'Mảnh', i.copies)}<button data-remove-item="${n}">×</button></div>`).join('')}</article>`;
    if (section === 'players')
      return `<article class="panel"><h3>Ví người chơi</h3><form id="wallet-form"><div class="form-grid"><label>Hồ sơ<select name="player">${state.players.map((p) => `<option value="${p.id}">${p.id.slice(0, 8)} · ${p.gold} vàng</option>`).join('')}</select></label><label>Điều chỉnh vàng (+/−)<input name="delta" type="number" required></label><label>Lý do<input name="reason" required minlength="3"></label></div><button class="gold">Ghi giao dịch</button></form></article><article class="panel"><table><thead><tr><th>Player ID</th><th>Vàng</th><th>Ngày tạo</th></tr></thead><tbody>${state.players.map((p) => `<tr><td>${p.id}</td><td>${p.gold}</td><td>${p.created}</td></tr>`).join('')}</tbody></table></article>`;
    return `<div class="columns"><article class="panel"><h3>Phiên bản đã phát hành</h3>${state.revisions.map((r) => `<div class="history-row"><b>Revision ${r.id}</b><time>${r.created}</time><button data-restore="${r.id}">Đưa về bản nháp</button></div>`).join('')}</article><article class="panel"><h3>Audit log</h3>${auditList(state.audit)}</article></div>`;
  }
  function auditList(rows: State['audit']) {
    return (
      rows
        .map(
          (a) =>
            `<div class="audit-row"><b>${esc(a.action)}</b><small>${a.created}</small><code>${esc(a.detail)}</code></div>`,
        )
        .join('') || '<p class="muted">Chưa có thay đổi.</p>'
    );
  }
  return content();
}
