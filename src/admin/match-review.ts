import { api } from '../services/api';
import { esc } from './html';
import type { FairPlayPolicy, MatchReviewSummary, MatchReviewDetail } from '../data/fair-play';

export function matchReviewPage() {
  return `<article class="panel"><span class="eyebrow">SERVER EVIDENCE · MANUAL REVIEW</span><h2>Lịch sử trận & kiểm duyệt</h2><p>Cảnh báo hỗ trợ rà soát, không phải kết luận gian lận. Các quyết định đều cần lý do và được ghi audit.</p>
  <form id="match-filter" class="form-grid"><label>Loại trận<select name="kind"><option value="pvp">PvP</option><option value="ai">Luyện tập AI</option></select></label><label>ID người chơi<input name="player" maxlength="100" placeholder="ID đầy đủ" /></label><label>ID trận<input name="id" maxlength="100" /></label><label>Trạng thái<select name="status"><option value="">Tất cả</option><option value="active">Đang chơi (PvP)</option><option value="finished">Đã kết thúc</option><option value="void">Hủy do server</option><option value="unverified">Chưa xác minh (AI)</option></select></label><label>Chế độ<select name="mode"><option value="">Tất cả</option>${['ranked', 'casual', 'challenge', 'friendly', 'story', 'normal', 'hard'].map((m) => `<option>${m}</option>`).join('')}</select></label><button type="submit">Tìm trận</button></form>
  <p id="match-status" role="status"></p><div id="match-list"></div><div class="review-pagination"><button id="matches-prev">← Trước</button><span id="matches-count"></span><button id="matches-next">Sau →</button></div></article>
  <div id="match-detail"></div><article class="panel"><h3>Chính sách cảnh báo & giới hạn khóa</h3><p>Áp dụng trực tiếp khi lưu, tách khỏi cấu hình combat. Trận mới khóa ngưỡng cảnh báo tại lúc bắt đầu. Không tự động khóa hoặc trừ điểm.</p><form id="fairplay-policy"><div id="fairplay-fields" class="form-grid"></div><button type="submit">Lưu chính sách kiểm duyệt</button><p id="policy-status" role="status"></p></form></article>`;
}
export function wireMatchReview(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('#match-filter');
  if (!form) return;
  const status = root.querySelector<HTMLElement>('#match-status')!,
    list = root.querySelector<HTMLElement>('#match-list')!,
    detail = root.querySelector<HTMLElement>('#match-detail')!;
  let offset = 0,
    total = 0,
    generation = 0,
    detailGeneration = 0,
    policyVersion = 0;
  let selected: MatchReviewDetail | undefined;
  const report = (error: unknown) => {
    if (status.isConnected) status.textContent = error instanceof Error ? error.message : String(error);
  };
  const load = async () => {
    const request = ++generation,
      params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
    params.set('offset', String(offset));
    status.textContent = 'Đang tải…';
    try {
      const result = await api<{ matches: MatchReviewSummary[]; total: number; limit: number }>(
        '/api/admin/matches?' + params,
      );
      if (request !== generation || !list.isConnected) return;
      total = result.total;
      status.textContent = '';
      list.innerHTML = `<div class="module-table-scroll"><table class="review-table"><thead><tr><th>Trận / thời điểm</th><th>Người chơi</th><th>Chế độ</th><th>Trạng thái</th><th>Rà soát</th><th></th></tr></thead><tbody>${result.matches.map((m) => `<tr><td><code>${esc(m.id)}</code><small>${esc(new Date(m.started).toLocaleString('vi-VN'))} · rev ${m.revision}</small></td><td>${m.players.map((p) => `<code>${esc(p)}</code>`).join('<br>')}</td><td>${esc(m.mode)}${m.automation ? '<small>Đối thủ máy dự phòng</small>' : ''}</td><td>${esc(m.status)}</td><td>${m.alert ? '⚑ Cần xem · ' : ''}${esc(m.review)}</td><td><button data-review-id="${esc(m.id)}" data-kind="${m.kind}">Chi tiết</button></td></tr>`).join('') || '<tr><td colspan="6">Không có trận phù hợp.</td></tr>'}</tbody></table></div>`;
      root.querySelector('#matches-count')!.textContent =
        `${total ? offset + 1 : 0}–${Math.min(offset + result.limit, total)} / ${total}`;
      (root.querySelector('#matches-prev') as HTMLButtonElement).disabled = offset === 0;
      (root.querySelector('#matches-next') as HTMLButtonElement).disabled = offset + result.limit >= total;
      list
        .querySelectorAll<HTMLButtonElement>('[data-review-id]')
        .forEach((b) => (b.onclick = () => void open(b.dataset.kind!, b.dataset.reviewId!)));
    } catch (error) {
      if (request === generation) report(error);
    }
  };
  const open = async (kind: string, id: string) => {
    const request = ++detailGeneration;
    detail.textContent = 'Đang tải chi tiết…';
    try {
      const data = await api<MatchReviewDetail>(
        `/api/admin/match?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`,
      );
      if (request !== detailGeneration || !detail.isConnected) return;
      selected = data;
      renderDetail();
    } catch (error) {
      report(error);
    }
  };
  const renderDetail = () => {
    const d = selected!;
    detail.innerHTML = `<article class="panel review-detail"><div class="section-title"><div><h3>Chi tiết ${esc(d.id)}</h3><p>${esc(d.kind)} · ${esc(d.mode)} · revision ${d.revision} · ${esc(d.status)}</p></div><button id="review-export">Xuất hồ sơ JSON</button></div>
    <div class="review-alerts">${d.alerts.map((a) => `<p>⚑ ${esc(a)}</p>`).join('') || '<p>Không vượt ngưỡng cảnh báo hiện có. Điều này không chứng minh trận không có gian lận.</p>'}</div>
    ${d.automation ? `<p class="muted">Đối thủ máy dự phòng · sau ${d.automation.waitSeconds.toFixed(1)}s · ${esc(d.automation.difficulty)} · Elo đối chiếu ${d.automation.rating}. Không có tài khoản/xếp hạng riêng.</p>` : ''}<h4>Kết quả gốc</h4><pre>${esc(JSON.stringify(d.result, null, 2))}</pre><h4>Tổng kết server</h4><pre>${esc(JSON.stringify(d.evidence.summary, null, 2))}</pre>
    <details><summary>Bộ bài và cấu hình trận đã khóa</summary><pre>${esc(JSON.stringify(d.loadouts, null, 2))}</pre><pre>${esc(JSON.stringify(d.content, null, 2))}</pre></details>
    <h4>Nhật ký lệnh</h4><p>${d.evidence.available ? `${d.evidence.entries.length} lệnh được lưu${d.evidence.truncated ? ' · đã chạm giới hạn, không đầy đủ' : ''}. Hiển thị 200 lệnh cuối; xuất JSON để xem tất cả.` : 'Trận này chưa có nhật ký lệnh. AI chỉ có kết quả đã được server xác minh; trận PvP cũ không được dựng lại bằng chứng.'}</p>
    <div class="review-evidence"><table><thead><tr><th>Tick / người chơi</th><th>Lệnh</th><th>Kết quả</th></tr></thead><tbody>${d.evidence.entries
      .slice(-200)
      .map(
        (e) =>
          `<tr><td>${e.tick}<small>${esc(e.player)}</small></td><td><code>${esc(JSON.stringify(e.command))}</code></td><td>${e.error ? esc(e.error) : 'Chấp nhận'}</td></tr>`,
      )
      .join('')}</tbody></table></div>
    <h4>Khóa PvP hiện tại</h4>${d.bans.map((b) => `<p>${esc(b.player)} · đến ${esc(new Date(b.until).toLocaleString('vi-VN'))} · ${esc(b.reason)}</p>`).join('') || '<p>Không có khóa còn hiệu lực.</p>'}
    ${
      d.kind === 'pvp'
        ? `<form id="moderation-form"><h3>Xử lý thủ công</h3><p>Hủy kết quả hoàn tác đúng phần Elo đã cộng/trừ, giảm số trận/thắng hạng; không tính lại các trận sau. Không sửa kết quả gốc. Khóa chỉ chặn trận PvP mới; trận đang chạy tiếp tục.</p><div class="form-grid"><label>Thao tác<select name="action"><option value="note">Ghi chú</option><option value="flag">Đánh dấu cần điều tra</option><option value="clear">Đã xem / không xử lý</option><option value="void">Hủy kết quả & hoàn tác Elo</option><option value="ban">Khóa PvP có thời hạn</option><option value="unban">Gỡ khóa PvP</option></select></label><label>Người chơi (khi khóa/gỡ)<select name="player">${d.players
            .filter((_, side) => side !== d.automation?.side)
            .map((p) => `<option>${esc(p)}</option>`)
            .join(
              '',
            )}</select></label><label>Thời hạn khóa (giờ)<input name="hours" type="number" min="1" step="1" value="24" /></label><label>Lý do<textarea name="reason" required minlength="5" maxlength="1000" rows="3"></textarea></label></div><label class="checkbox"><input name="confirmed" type="checkbox" required>Tôi đã xem bằng chứng và xác nhận thao tác đã chọn cho trận này.</label><button type="submit" class="gold">Ghi nhận xử lý</button><p id="moderation-status" role="status"></p></form>`
        : ''
    }
    <h4>Lịch sử xử lý</h4>${d.actions.map((a) => `<div class="review-action"><strong>${esc(a.action)}</strong> · ${esc(a.actor)} · ${esc(new Date(a.created).toLocaleString('vi-VN'))}<p>${esc(a.reason)}</p><pre>${esc(JSON.stringify(a.detail, null, 2))}</pre></div>`).join('') || '<p>Chưa có thao tác.</p>'}</article>`;
    detail.querySelector<HTMLButtonElement>('#review-export')!.onclick = () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `kora-review-${d.id}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const moderation = detail.querySelector<HTMLFormElement>('#moderation-form');
    let pending: { key: string; request: string } | undefined;
    if (moderation)
      moderation.onsubmit = (event) => {
        event.preventDefault();
        const fields = new FormData(moderation),
          action = String(fields.get('action'));
        const payload = {
          match: d.id,
          action,
          reason: String(fields.get('reason')),
          ...(['ban', 'unban'].includes(action) ? { player: String(fields.get('player')) } : {}),
          ...(action === 'ban' ? { hours: Number(fields.get('hours')) } : {}),
        };
        const key = JSON.stringify(payload);
        if (!pending || pending.key !== key) pending = { key, request: crypto.randomUUID() };
        const button = moderation.querySelector('button')!,
          message = moderation.querySelector('#moderation-status')!;
        button.disabled = true;
        void api('/api/admin/moderation', 'POST', { ...payload, request: pending.request })
          .then(async () => {
            if (!moderation.isConnected) return;
            await open(d.kind, d.id);
            await load();
          })
          .catch((error) => {
            if (message.isConnected) message.textContent = String(error);
          })
          .finally(() => (button.disabled = false));
      };
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    offset = 0;
    void load();
  };
  root.querySelector<HTMLButtonElement>('#matches-prev')!.onclick = () => {
    offset = Math.max(0, offset - 25);
    void load();
  };
  root.querySelector<HTMLButtonElement>('#matches-next')!.onclick = () => {
    if (offset + 25 < total) offset += 25;
    void load();
  };
  const policyForm = root.querySelector<HTMLFormElement>('#fairplay-policy')!,
    policyStatus = root.querySelector<HTMLElement>('#policy-status')!;
  const labels: Record<Exclude<keyof FairPlayPolicy, 'enabled'>, string> = {
    rejectedCommandThreshold: 'Lệnh bị từ chối / người / trận',
    shortMatchSeconds: 'Trận ngắn hơn (giây)',
    repeatPairWindowHours: 'Cửa sổ cặp đối thủ (giờ)',
    repeatPairThreshold: 'Số trận cùng cặp',
    maximumBanHours: 'Thời hạn khóa tối đa (giờ)',
  };
  void api<{ policy: FairPlayPolicy; version: number }>('/api/admin/fairplay/policy')
    .then(({ policy, version }) => {
      if (!policyForm.isConnected) return;
      policyVersion = version;
      root.querySelector('#fairplay-fields')!.innerHTML =
        `<label class="checkbox"><input type="checkbox" name="enabled" ${policy.enabled ? 'checked' : ''}>Bật cảnh báo</label>${Object.entries(
          labels,
        )
          .map(
            ([key, label]) =>
              `<label>${label}<input type="number" name="${key}" min="1" step="1" value="${policy[key as keyof FairPlayPolicy]}" required /></label>`,
          )
          .join('')}`;
    })
    .catch(report);
  policyForm.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(policyForm),
      policy = {
        enabled: data.get('enabled') === 'on',
        ...Object.fromEntries(Object.keys(labels).map((k) => [k, Number(data.get(k))])),
      };
    const button = policyForm.querySelector('button')!;
    button.disabled = true;
    void api<{ version: number }>('/api/admin/fairplay/policy', 'PUT', { policy, version: policyVersion })
      .then((result) => {
        policyVersion = result.version;
        if (policyStatus.isConnected) policyStatus.textContent = 'Đã lưu chính sách kiểm duyệt.';
      })
      .catch((error) => {
        if (policyStatus.isConnected) policyStatus.textContent = String(error);
      })
      .finally(() => (button.disabled = false));
  };
  void load();
}
