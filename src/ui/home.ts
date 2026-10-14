import { icon } from './icons';

/** The home is a separate screen; its crest is vector art, sharp at every viewport size. */
export function renderHome() {
  return `<section class="home-screen" aria-label="Sảnh Kora War">
    <div class="home-banner left" aria-hidden="true"><span>◈</span></div><div class="home-banner right" aria-hidden="true"><span>◈</span></div>
    <aside class="home-column home-journey">
      <div class="home-heading"><span>ELYNDRA</span><h2>Người Kết Nối</h2></div>
      <button class="home-tile chapter-tile" id="home-story"><span class="tile-art">${icon('book')}</span><small>CHƯƠNG I</small><strong>Khởi Nguyên</strong><span class="tile-note">Tiếp bước hành trình ${icon('chevron')}</span></button>
      <div class="home-record"><span>✦</span><div><strong id="home-wins">0</strong><small>CHIẾN THẮNG LUYỆN TẬP</small></div></div>
    </aside>
    <div class="home-center">
      <span class="home-kicker">CUỘC CHIẾN LÕI NĂNG LƯỢNG</span>
      <svg class="aether-crest" viewBox="0 0 420 390" role="img" aria-label="Huy hiệu lõi Aether">
        <defs>
          <linearGradient id="crest-gold" x2=".7" y2="1"><stop stop-color="#fff1bb"/><stop offset=".38" stop-color="#b5833d"/><stop offset=".65" stop-color="#f2d697"/><stop offset="1" stop-color="#614722"/></linearGradient>
          <linearGradient id="crest-face" x2=".8" y2="1"><stop stop-color="#586286"/><stop offset=".5" stop-color="#282a46"/><stop offset="1" stop-color="#11172c"/></linearGradient>
          <linearGradient id="crest-gem" x2=".6" y2="1"><stop stop-color="#bcfbff"/><stop offset=".35" stop-color="#2ebce2"/><stop offset="1" stop-color="#154d9e"/></linearGradient>
          <radialGradient id="crest-halo"><stop stop-color="#69d8ff" stop-opacity=".28"/><stop offset="1" stop-color="#69d8ff" stop-opacity="0"/></radialGradient>
        </defs>
        <circle cx="210" cy="185" r="177" fill="url(#crest-halo)"/>
        <g fill="url(#crest-gold)" stroke="#5c442e" stroke-width="2">
          <path d="M150 130 36 73 63 139 121 178 46 158 75 208 128 223 75 226 105 260 153 254Z"/>
          <path d="M270 130 384 73 357 139 299 178 374 158 345 208 292 223 345 226 315 260 267 254Z"/>
          <path d="m184 104 26-85 26 85Z"/><path d="m146 121-19-72 63 53M274 121l19-72-63 53"/>
          <path d="m210 66 103 64-14 131-89 97-89-97-14-131Z"/>
        </g>
        <path d="m210 83 87 55-13 116-74 82-74-82-13-116Z" fill="url(#crest-face)" stroke="#ffe5a0" stroke-width="2"/>
        <path d="m210 106 68 42-12 99-56 65-56-65-12-99Z" fill="none" stroke="#9292b2" stroke-opacity=".45"/>
        <g class="crest-crystal"><path d="m210 117 46 58-12 67-34 38-34-38-12-67Z" fill="url(#crest-gem)" stroke="#b5f5ff" stroke-width="3"/>
          <path d="m210 117 17 68-17 95-17-95Z" fill="#99eeff" opacity=".6"/><path d="m164 175 29 10 17-68M256 175l-29 10 17 57M176 242l17-57" fill="none" stroke="#e0ffff" stroke-opacity=".7" stroke-width="2"/></g>
        <path d="m100 269 110 19 110-19-12 44-98 23-98-23Z" fill="#354c88" stroke="url(#crest-gold)" stroke-width="4"/>
        <text x="210" y="314" fill="#fff0c9" font-size="19" font-weight="700" text-anchor="middle" letter-spacing="5">AETHERFALL</text>
      </svg>
      <h1>KORA WAR</h1><p>Bảo vệ ánh sáng của Elyndra</p>
      <div id="lobby-actions" class="home-actions"><button class="home-battle" id="start">LUYỆN TẬP ${icon('sword')}</button><button class="home-pvp" id="pvp-open">PvP · Đấu bạn bè ${icon('chevron')}</button><button class="text-button" id="tutorial-open">${icon('info')} Cách chơi</button></div>
    </div>
    <aside class="home-column home-vault" aria-label="Kho Aether">
      <button class="home-wallet" id="vault-shop" aria-label="Cửa hàng"><span>◉</span><b id="wallet-gold">—</b><small>VÀNG</small><i>+</i></button>
      <button class="home-tile chest-tile" id="vault-chest" aria-label="Rương Aether"><span class="chest-art" aria-hidden="true"><i>◈</i></span><strong>Rương Aether</strong><span class="tile-note">Khám phá kho báu ${icon('chevron')}</span></button>
      <button class="home-tile deck-tile" id="home-roster"><span class="deck-art" aria-hidden="true">${icon('shield')}</span><strong>Bộ bài & tướng</strong><span class="tile-note">14 thẻ · tay 6 thẻ ${icon('chevron')}</span></button>
      <button class="home-forge" id="vault-forge" aria-label="Nâng cấp tướng">⚒ <span>Lò rèn · Nâng cấp</span>${icon('chevron')}</button>
    </aside>
    <div class="home-footer"><span>✦ THUNG LŨNG KHỞI NGUYÊN</span><span>BA CHIẾN TUYẾN · MỘT LÕI AETHER</span></div>
  </section>`;
}
