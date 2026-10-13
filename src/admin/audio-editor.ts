import { defaultAudio, SOUND_CUES } from '../data/media';
import { esc, input } from './html';
import type { State } from './types';

export function audioEditor(state: State) {
  const audio = (state.draft.audio ||= defaultAudio());
  const labels = {
    click: 'Chạm UI',
    play: 'Triệu hồi',
    hit: 'Va chạm',
    skill: 'Thi triển phép',
    tower: 'Trụ',
    core: 'Lõi',
    death: 'Tử trận',
    footstep: 'Bước chân',
    win: 'Chiến thắng',
    lose: 'Thất bại',
    attack: 'Tấn công',
    cast: 'Kỹ năng',
  };
  const row = (path: string, cue: keyof typeof labels, binding?: import('../data/media').SoundBinding) =>
    `<div class="sound-row"><b>${labels[cue]}</b><label>Âm thanh<select data-sound="${path}"><option value="">Mặc định</option>${state.assets
      .filter((a) => a.kind === 'audio' && !a.archived)
      .map(
        (a) =>
          `<option value="${a.id}" ${a.id === binding?.assetId ? 'selected' : ''}>${esc(a.name)}</option>`,
      )
      .join(
        '',
      )}</select></label>${binding ? `${input(`${path}.volume`, 'Âm lượng 0–1', binding.volume)}${input(`${path}.rate`, 'Tốc độ 0.5–2', binding.rate)}${input(`${path}.cooldownMs`, 'Giãn cách (ms)', binding.cooldownMs)}<button type="button" data-listen="${binding.assetId}" data-listen-path="${path}">▶ Nghe</button>` : ''}</div>`;
  return `<article class="panel"><span class="eyebrow">AUDIO MIXER</span><h2>Âm thanh Elyndra</h2><div class="form-grid">${input('audio.master', 'Tổng 0–1', audio.master)}${input('audio.effects', 'Chiến đấu 0–1', audio.effects)}${input('audio.ui', 'Giao diện 0–1', audio.ui)}${input('audio.maxVoices', 'Số tiếng đồng thời', audio.maxVoices)}</div><p class="muted">WAV PCM / Ogg Vorbis hoặc Opus · tối đa 15 giây. Bước chân và va chạm có giãn cách để giữ tiếng rõ trên mobile.</p></article><article class="panel"><h3>Âm thanh hệ thống & công trình</h3>${SOUND_CUES.map((cue) => row(`audio.cues.${cue}`, cue, audio.cues[cue])).join('')}</article><article class="panel"><h3>Âm thanh từng nhân vật</h3>${state.draft.heroes.map((h) => `<details><summary>${h.name} · ${h.origin}</summary>${(['attack', 'cast', 'death', 'footstep'] as const).map((cue) => row(`audio.heroes.${h.id}.${cue}`, cue, audio.heroes[h.id]?.[cue])).join('')}</details>`).join('')}</article><audio id="sound-preview" controls hidden></audio>`;
}
