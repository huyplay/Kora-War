import { icon } from './icons';
import { renderHome } from './home';
export function renderShell() {
  return `
 <header class="topbar">
  <a class="brand" href="#" aria-label="Kora War — về sảnh"><span class="brand-gem">◈</span><span>KORA WAR<small>ELYNDRA</small></span></a>
  <nav aria-label="Điều hướng"><button class="nav-item active" id="nav-battle" aria-label="Chiến trường">${icon('sword')}<span>Chiến trường</span></button><button class="nav-item" id="nav-heroes" aria-label="Tướng và đội hình">${icon('shield')}<span>Tướng & đội hình</span><em>10</em></button><button class="nav-item" id="nav-story" aria-label="Biên niên sử">${icon('book')}<span>Biên niên sử</span></button></nav>
  <div class="header-right"><span class="solo-badge"><i></i> CHƠI ĐƠN · AI</span><button class="icon-button" id="fullscreen" aria-label="Toàn màn hình">⛶</button><button class="icon-button" id="settings" aria-label="Cài đặt">${icon('settings')}</button></div>
 </header>
 <main>
  <div id="stage"><div class="vignette"></div></div>
  <div class="arena-zoom" aria-label="Thu phóng chiến trường"><button id="zoom-out" aria-label="Thu nhỏ">−</button><button id="zoom-reset" aria-label="Xem toàn sân" title="Xem toàn sân">⛶</button><button id="zoom-in" aria-label="Phóng to">+</button></div>
  ${renderHome()}
  <div class="arena-heading"><div class="eyebrow"><span class="line"></span> CHƯƠNG I <span class="line"></span></div><h1>Thung lũng Khởi Nguyên</h1><p>Nơi ánh sáng cuối cùng thức giấc</p></div>
  <section class="battle-hud" hidden aria-label="Trạng thái trận đấu">
   <div class="base-health ally"><span class="core-icon">◈</span><div><div class="base-title">LÕI BÌNH MINH <b id="ally-hp">1500</b></div><div class="hp-track"><i id="ally-health"></i></div><small>Đội của bạn <span id="ally-towers">3 trụ</span></small></div></div>
   <div class="timer-wrap"><span id="phase-label">TRANH ĐOẠT LÕI</span><strong id="timer">00:00</strong><button class="icon-button" id="pause" aria-label="Tạm dừng">${icon('pause')}</button></div>
   <div class="base-health enemy"><div><div class="base-title"><b id="enemy-hp">1500</b> LÕI HOÀNG HÔN</div><div class="hp-track"><i id="enemy-health"></i></div><small><span id="enemy-towers">3 trụ</span> Quân đoàn Hư Ảnh</small></div><span class="core-icon">◈</span></div>
  </section>
  <div class="map-note"><span class="tiny-diamond"></span> ĐẤU TRƯỜNG 3 CHIẾN TUYẾN</div>
  <aside class="objective" id="objective"><span class="objective-icon">${icon('flag')}</span><div><small>NHIỆM VỤ MỞ ĐẦU</small><strong>Đánh chiếm lõi năng lượng</strong><p>Phá trụ, mở đường đến căn cứ địch.</p></div></aside>
  <div id="combat-message" role="status" aria-live="polite"></div>
  <div id="connection-status" role="status" hidden>Đang nối lại… Trận đấu vẫn tiếp tục.</div>
  <div class="enemy-hand" aria-label="Bài trên tay đối thủ"><span></span><span></span><span></span><b id="enemy-hand-count">6</b></div>
  <div id="tutorial-hint" hidden></div>
  <div class="lane-shortcuts" hidden aria-label="Triển khai nhanh"><button data-lane="0" aria-label="Triển khai đường trên">Đường trên <kbd>W</kbd></button><button data-lane="1" aria-label="Triển khai đường giữa">Đường giữa <kbd>E</kbd></button><button data-lane="2" aria-label="Triển khai đường dưới">Đường dưới <kbd>R</kbd></button></div>
  <section class="command-deck">
   <div class="synergy-panel"><div class="section-kicker"><span>LIÊN KẾT ĐỘI HÌNH</span><button id="edit-deck" aria-label="Sửa đội hình">Chỉnh sửa ${icon('chevron')}</button></div><div id="synergies"></div><div class="team-note">14 thẻ. Ba chiến tuyến.<br><em>Một quyết định thay đổi trận chiến.</em></div></div>
   <div class="cards-area"><div class="hand-caption"><span id="hand-caption">BỘ BÀI XUẤT TRẬN</span><span id="hand-tip">14 thẻ · mỗi thẻ 1 bản</span></div><div class="hand-and-draw"><div id="hand" class="hand"></div><div class="draw-pile" aria-label="Chồng rút"><span class="draw-back">◈</span><strong id="draw-count">8</strong><small id="draw-detail">Vòng 1</small></div></div><div class="mana-panel" hidden><span class="mana-crystal">◆</span><strong id="mana">4</strong><div class="mana-track" id="mana-track"></div><span class="mana-regen" id="mana-regen">+1,05 / giây</span></div></div>
   <div class="action-panel battle-actions" hidden><button aria-label="Cộng hưởng lõi" id="pulse" class="pulse-button"><span class="pulse-symbol">✧</span><span>CỘNG HƯỞNG LÕI<small id="pulse-value">Đang tích năng lượng · 0%</small></span><kbd>Q</kbd><i id="pulse-fill"></i></button><p id="selection-hint">Chọn thẻ <kbd>1</kbd>–<kbd>6</kbd>, rồi thả vào vùng bên trái.</p><button class="text-button" id="cancel-select" aria-label="Hủy chọn" hidden>×</button></div>
  </section>
  <footer class="statusbar"><span><i class="status-dot"></i> KORA WAR · BẢN CHƠI THỬ 0.1</span><span id="best-record"></span><button id="debug-toggle" aria-label="Hiệu năng và debug">${icon('chart')} <span id="fps-mini">60 FPS</span><span class="debug-label">Hiệu năng / F3</span></button></footer>
  <div id="hero-tooltip" hidden></div><div id="drag-ghost" hidden></div>
  <aside id="debug-panel" hidden><div class="debug-title">BATTLE INSPECTOR <button id="debug-close" aria-label="Đóng debug">×</button></div><pre id="debug-stats"></pre><div class="debug-controls"><label>Tốc độ <select id="debug-speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><button id="debug-mana">+ Mana</button><button id="debug-auto">Tự đấu: tắt</button><button id="debug-win">Thử thắng</button><button id="debug-lose">Thử thua</button><button id="debug-export">Xuất trạng thái</button></div><small>Can thiệp debug đánh dấu trận thử nghiệm, không cộng chiến thắng.</small></aside>
 </main>
 <div id="modal-root"></div>`;
}
