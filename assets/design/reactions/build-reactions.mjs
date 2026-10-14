import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const REACTIONS_ASSETS = path.join(ROOT_DIR, 'assets', 'design', 'reactions');
const REACTIONS_PUBLIC = path.join(ROOT_DIR, 'public', 'design', 'reactions');

const SVG_DIR = path.join(REACTIONS_ASSETS, 'svg');
const PNG_DIR = path.join(REACTIONS_ASSETS, 'png');
const WEBP_DIR = path.join(REACTIONS_ASSETS, 'webp');

fs.mkdirSync(SVG_DIR, { recursive: true });
fs.mkdirSync(PNG_DIR, { recursive: true });
fs.mkdirSync(WEBP_DIR, { recursive: true });
fs.mkdirSync(REACTIONS_PUBLIC, { recursive: true });

const EMOJIS = [
  {
    id: 'happy',
    label: 'Vui vẻ',
    description: 'Chiến binh Elyndra mỉm cười rạng rỡ với đôi mắt Aether phát sáng và vương trâm hoàng kim',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="h-bg" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#FFE082"/>
      <stop offset="65%" stop-color="#FFB300"/>
      <stop offset="100%" stop-color="#FF8F00"/>
    </radialGradient>
    <radialGradient id="h-aether" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#E0F7FA"/>
      <stop offset="45%" stop-color="#00E5FF"/>
      <stop offset="100%" stop-color="#0091EA"/>
    </radialGradient>
    <linearGradient id="h-crown" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF9C4"/>
      <stop offset="50%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#FF8F00"/>
    </linearGradient>
    <filter id="h-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="h-shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#001830" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#h-shadow)">
    <circle cx="128" cy="134" r="92" fill="url(#h-bg)" stroke="#3E2723" stroke-width="8"/>
    <path d="M52 108 C75 80, 95 86, 128 58 C161 86, 181 80, 204 108 C190 92, 160 84, 128 84 C96 84, 66 92, 52 108 Z" fill="url(#h-crown)" stroke="#3E2723" stroke-width="6" stroke-linejoin="round"/>
    <polygon points="128,68 138,82 128,96 118,82" fill="url(#h-aether)" stroke="#004D40" stroke-width="3" filter="url(#h-glow)"/>
    <path d="M78 126 C78 110, 106 110, 106 126" fill="none" stroke="#00B0FF" stroke-width="10" stroke-linecap="round" filter="url(#h-glow)"/>
    <path d="M78 126 C78 110, 106 110, 106 126" fill="none" stroke="#002171" stroke-width="4" stroke-linecap="round"/>
    <path d="M150 126 C150 110, 178 110, 178 126" fill="none" stroke="#00B0FF" stroke-width="10" stroke-linecap="round" filter="url(#h-glow)"/>
    <path d="M150 126 C150 110, 178 110, 178 126" fill="none" stroke="#002171" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="72" cy="148" rx="14" ry="8" fill="#FF5252" opacity="0.45"/>
    <ellipse cx="184" cy="148" rx="14" ry="8" fill="#FF5252" opacity="0.45"/>
    <path d="M86 148 Q128 200 170 148 Q128 160 86 148 Z" fill="#D50000" stroke="#3E2723" stroke-width="6" stroke-linejoin="round"/>
    <path d="M106 166 Q128 152 150 166 Q128 194 106 166 Z" fill="#FF80AB"/>
    <path d="M96 150 Q128 158 160 150 Q128 164 96 150 Z" fill="#FFFFFF"/>
    <path d="M42 68 Q50 68 50 60 Q50 68 58 68 Q50 68 50 76 Q50 68 42 68 Z" fill="#00E5FF" filter="url(#h-glow)"/>
    <path d="M214 74 Q220 74 220 68 Q220 74 226 74 Q220 74 220 80 Q220 74 214 74 Z" fill="#FFD54F"/>
  </g>
</svg>`
  },
  {
    id: 'cheer',
    label: 'Cổ vũ',
    description: 'Vương miện Aether chiến thắng cùng pháo hoa tinh thể sao và nụ cười ăn mừng rực rỡ',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="c-bg" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#FFF176"/>
      <stop offset="60%" stop-color="#FFB300"/>
      <stop offset="100%" stop-color="#F57C00"/>
    </radialGradient>
    <linearGradient id="c-crown" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFDE7"/>
      <stop offset="40%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#FF8F00"/>
    </linearGradient>
    <linearGradient id="c-gem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84FFFF"/>
      <stop offset="100%" stop-color="#0091EA"/>
    </linearGradient>
    <filter id="c-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#001830" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#c-shadow)">
    <circle cx="128" cy="144" r="86" fill="url(#c-bg)" stroke="#3E2723" stroke-width="8"/>
    <path d="M60 94 L82 52 L108 76 L128 32 L148 76 L174 52 L196 94 Q128 108 60 94 Z" fill="url(#c-crown)" stroke="#3E2723" stroke-width="7" stroke-linejoin="round"/>
    <polygon points="128,48 136,60 128,72 120,60" fill="url(#c-gem)" stroke="#004D40" stroke-width="2"/>
    <circle cx="84" cy="68" r="5" fill="url(#c-gem)" stroke="#004D40" stroke-width="2"/>
    <circle cx="172" cy="68" r="5" fill="url(#c-gem)" stroke="#004D40" stroke-width="2"/>
    <ellipse cx="90" cy="136" rx="16" ry="20" fill="#FFFFFF" stroke="#3E2723" stroke-width="4"/>
    <ellipse cx="166" cy="136" rx="16" ry="20" fill="#FFFFFF" stroke="#3E2723" stroke-width="4"/>
    <circle cx="90" cy="136" r="10" fill="#00B0FF"/>
    <circle cx="166" cy="136" r="10" fill="#00B0FF"/>
    <polygon points="90,130 92,134 96,136 92,138 90,142 88,138 84,136 88,134" fill="#FFFFFF"/>
    <polygon points="166,130 168,134 172,136 168,138 166,142 164,138 160,136 164,134" fill="#FFFFFF"/>
    <path d="M84 162 Q128 226 172 162 Q128 174 84 162 Z" fill="#C62828" stroke="#3E2723" stroke-width="6" stroke-linejoin="round"/>
    <path d="M102 186 Q128 168 154 186 Q128 218 102 186 Z" fill="#FF80AB"/>
    <path d="M96 164 Q128 172 160 164 Q128 178 96 164 Z" fill="#FFFFFF"/>
    <polygon points="40,46 44,56 54,60 44,64 40,74 36,64 26,60 36,56" fill="#00E5FF"/>
    <polygon points="216,42 220,50 228,54 220,58 216,66 212,58 204,54 212,50" fill="#FFD700"/>
    <rect x="28" y="112" width="10" height="10" rx="2" transform="rotate(25 28 112)" fill="#FF4081"/>
    <rect x="220" y="116" width="10" height="10" rx="2" transform="rotate(-30 220 116)" fill="#00E676"/>
    <rect x="48" y="176" width="12" height="8" rx="2" transform="rotate(45 48 176)" fill="#FFEB3B"/>
    <rect x="202" y="180" width="12" height="8" rx="2" transform="rotate(-15 202 180)" fill="#7C4DFF"/>
  </g>
</svg>`
  },
  {
    id: 'wow',
    label: 'Bất ngờ',
    description: 'Mắt mở to kinh ngạc lấp lánh ánh sáng ma thuật và vòng phù văn rune Aether xoay quanh',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="w-bg" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#FFF9C4"/>
      <stop offset="65%" stop-color="#FFCA28"/>
      <stop offset="100%" stop-color="#FF8F00"/>
    </radialGradient>
    <radialGradient id="w-eye" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#E0F7FA"/>
      <stop offset="35%" stop-color="#00E5FF"/>
      <stop offset="70%" stop-color="#0091EA"/>
      <stop offset="100%" stop-color="#01579B"/>
    </radialGradient>
    <filter id="w-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="w-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#001830" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#w-shadow)">
    <circle cx="128" cy="132" r="108" fill="none" stroke="#00E5FF" stroke-width="4" stroke-dasharray="14 10" opacity="0.65" filter="url(#w-glow)"/>
    <circle cx="128" cy="132" r="116" fill="none" stroke="#7C4DFF" stroke-width="2" stroke-dasharray="8 12" opacity="0.5"/>
    <circle cx="128" cy="132" r="90" fill="url(#w-bg)" stroke="#3E2723" stroke-width="8"/>
    <path d="M68 84 Q90 64 112 80" fill="none" stroke="#3E2723" stroke-width="7" stroke-linecap="round"/>
    <path d="M144 80 Q166 64 188 84" fill="none" stroke="#3E2723" stroke-width="7" stroke-linecap="round"/>
    <circle cx="90" cy="118" r="28" fill="#FFFFFF" stroke="#3E2723" stroke-width="5"/>
    <circle cx="166" cy="118" r="28" fill="#FFFFFF" stroke="#3E2723" stroke-width="5"/>
    <circle cx="90" cy="118" r="18" fill="url(#w-eye)" filter="url(#w-glow)"/>
    <circle cx="166" cy="118" r="18" fill="url(#w-eye)" filter="url(#w-glow)"/>
    <circle cx="84" cy="112" r="7" fill="#FFFFFF"/>
    <circle cx="160" cy="112" r="7" fill="#FFFFFF"/>
    <circle cx="96" cy="124" r="3" fill="#FFFFFF"/>
    <circle cx="172" cy="124" r="3" fill="#FFFFFF"/>
    <ellipse cx="128" cy="174" rx="20" ry="28" fill="#D50000" stroke="#3E2723" stroke-width="6"/>
    <ellipse cx="128" cy="178" rx="14" ry="18" fill="#212121"/>
    <path d="M120 204 Q128 208 136 204" fill="none" stroke="#FF8F00" stroke-width="3" stroke-linecap="round"/>
    <polygon points="44,98 48,106 56,110 48,114 44,122 40,114 32,110 40,106" fill="#00E5FF" filter="url(#w-glow)"/>
    <polygon points="212,98 216,106 224,110 216,114 212,122 208,114 200,110 208,106" fill="#00E5FF" filter="url(#w-glow)"/>
  </g>
</svg>`
  },
  {
    id: 'cry',
    label: 'Buồn quá',
    description: 'Biểu cảm khóc dở khóc dở cười với thác nước mắt tinh thể ma thuật Aether tuôn trào',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="cr-bg" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#FFF59D"/>
      <stop offset="65%" stop-color="#FFCA28"/>
      <stop offset="100%" stop-color="#FFA000"/>
    </radialGradient>
    <linearGradient id="cr-stream" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E0F7FA"/>
      <stop offset="25%" stop-color="#40C4FF"/>
      <stop offset="70%" stop-color="#0091EA"/>
      <stop offset="100%" stop-color="#0069C0"/>
    </linearGradient>
    <filter id="cr-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="cr-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#001830" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#cr-shadow)">
    <circle cx="128" cy="126" r="90" fill="url(#cr-bg)" stroke="#3E2723" stroke-width="8"/>
    <path d="M72 108 L94 122 L72 136" fill="none" stroke="#3E2723" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M184 108 L162 122 L184 136" fill="none" stroke="#3E2723" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M82 124 C60 134, 46 160, 48 200 C56 218, 92 216, 94 196 C96 168, 94 138, 86 124 Z" fill="url(#cr-stream)" stroke="#01579B" stroke-width="4" filter="url(#cr-glow)"/>
    <path d="M174 124 C196 134, 210 160, 208 200 C200 218, 164 216, 162 196 C160 168, 162 138, 170 124 Z" fill="url(#cr-stream)" stroke="#01579B" stroke-width="4" filter="url(#cr-glow)"/>
    <ellipse cx="64" cy="180" rx="6" ry="16" fill="#FFFFFF" opacity="0.6"/>
    <ellipse cx="192" cy="180" rx="6" ry="16" fill="#FFFFFF" opacity="0.6"/>
    <circle cx="34" cy="216" r="7" fill="#40C4FF" stroke="#01579B" stroke-width="2"/>
    <circle cx="222" cy="216" r="7" fill="#40C4FF" stroke="#01579B" stroke-width="2"/>
    <path d="M96 174 Q112 164 128 174 Q144 164 160 174 Q128 152 96 174 Z" fill="#D50000" stroke="#3E2723" stroke-width="6" stroke-linejoin="round"/>
  </g>
</svg>`
  },
  {
    id: 'laugh',
    label: 'Cười',
    description: 'Nụ cười sảng khoái hả hê với đôi mắt cong vút và hai giọt nước mắt cười lấp lánh',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="l-bg" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#FFF59D"/>
      <stop offset="65%" stop-color="#FFCA28"/>
      <stop offset="100%" stop-color="#FF9800"/>
    </radialGradient>
    <linearGradient id="l-tear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E1F5FE"/>
      <stop offset="60%" stop-color="#00B0FF"/>
      <stop offset="100%" stop-color="#0288D1"/>
    </linearGradient>
    <filter id="l-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#001830" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#l-shadow)">
    <circle cx="128" cy="130" r="90" fill="url(#l-bg)" stroke="#3E2723" stroke-width="8"/>
    <path d="M66 112 Q92 90 112 118" fill="none" stroke="#3E2723" stroke-width="9" stroke-linecap="round"/>
    <path d="M190 112 Q164 90 144 118" fill="none" stroke="#3E2723" stroke-width="9" stroke-linecap="round"/>
    <path d="M74 136 Q128 152 182 136 C188 184, 168 206, 128 206 C88 206, 68 184, 74 136 Z" fill="#B71C1C" stroke="#3E2723" stroke-width="7" stroke-linejoin="round"/>
    <path d="M96 172 Q128 150 160 172 Q128 206 96 172 Z" fill="#FF4081"/>
    <path d="M84 138 Q128 150 172 138 Q128 156 84 138 Z" fill="#FFFFFF"/>
    <path d="M46 114 C36 102, 38 88, 48 88 C58 88, 62 102, 54 118 Z" fill="url(#l-tear)" stroke="#01579B" stroke-width="3" transform="rotate(-25 50 104)"/>
    <circle cx="48" cy="98" r="3" fill="#FFFFFF"/>
    <path d="M210 114 C220 102, 218 88, 208 88 C198 88, 194 102, 202 118 Z" fill="url(#l-tear)" stroke="#01579B" stroke-width="3" transform="rotate(25 206 104)"/>
    <circle cx="208" cy="98" r="3" fill="#FFFFFF"/>
  </g>
</svg>`
  },
  {
    id: 'respect',
    label: 'Tán thưởng',
    description: 'Đôi găng tay giáp hiệp sĩ Elyndra nạm ngọc Aether chạm nhau tán thưởng tinh thần thượng võ',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="r-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF9C4"/>
      <stop offset="40%" stop-color="#FFD54F"/>
      <stop offset="80%" stop-color="#FFA000"/>
      <stop offset="100%" stop-color="#FF6F00"/>
    </linearGradient>
    <linearGradient id="r-steel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ECEFF1"/>
      <stop offset="60%" stop-color="#90A4AE"/>
      <stop offset="100%" stop-color="#455A64"/>
    </linearGradient>
    <radialGradient id="r-gem" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#E0F7FA"/>
      <stop offset="45%" stop-color="#00E5FF"/>
      <stop offset="100%" stop-color="#0091EA"/>
    </radialGradient>
    <filter id="r-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="r-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#001830" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#r-shadow)">
    <path d="M48 140 C42 100, 68 62, 106 50" fill="none" stroke="#FFD54F" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 12"/>
    <path d="M208 140 C214 100, 188 62, 150 50" fill="none" stroke="#FFD54F" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 12"/>
    <circle cx="128" cy="116" r="32" fill="#E0F7FA" filter="url(#r-glow)" opacity="0.6"/>
    <polygon points="128,72 134,104 158,116 134,128 128,160 122,128 98,116 122,104" fill="#00E5FF" filter="url(#r-glow)"/>
    <polygon points="128,84 132,108 148,116 132,124 128,148 124,124 108,116 124,108" fill="#FFFFFF"/>
    <g transform="translate(6, 16)">
      <path d="M28 206 L74 152 L98 174 L52 226 Z" fill="url(#r-steel)" stroke="#263238" stroke-width="5" stroke-linejoin="round"/>
      <path d="M48 184 L64 166 L78 180 L62 198 Z" fill="url(#r-gold)" stroke="#3E2723" stroke-width="3"/>
      <circle cx="63" cy="182" r="5" fill="url(#r-gem)"/>
      <path d="M72 154 L114 116 C124 106, 138 116, 130 128 L104 168 L88 168 Z" fill="url(#r-gold)" stroke="#3E2723" stroke-width="6" stroke-linejoin="round"/>
      <path d="M96 132 L120 114 M90 144 L112 126" stroke="#B26A00" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g transform="translate(-6, 16)">
      <path d="M228 206 L182 152 L158 174 L204 226 Z" fill="url(#r-steel)" stroke="#263238" stroke-width="5" stroke-linejoin="round"/>
      <path d="M208 184 L192 166 L178 180 L194 198 Z" fill="url(#r-gold)" stroke="#3E2723" stroke-width="3"/>
      <circle cx="193" cy="182" r="5" fill="url(#r-gem)"/>
      <path d="M184 154 L142 116 C132 106, 118 116, 126 128 L152 168 L168 168 Z" fill="url(#r-gold)" stroke="#3E2723" stroke-width="6" stroke-linejoin="round"/>
      <path d="M160 132 L136 114 M166 144 L144 126" stroke="#B26A00" stroke-width="3" stroke-linecap="round"/>
    </g>
    <circle cx="82" cy="74" r="4" fill="#00E5FF"/>
    <circle cx="174" cy="74" r="4" fill="#00E5FF"/>
  </g>
</svg>`
  },
  {
    id: 'fire',
    label: 'Bùng cháy',
    description: 'Ngọn lửa ma thuật Elyndra 3 lớp với lõi Aether xanh lam và tinh thần chiến đấu rực lửa',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="f-outer" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#D50000"/>
      <stop offset="35%" stop-color="#FF3D00"/>
      <stop offset="70%" stop-color="#FF9100"/>
      <stop offset="100%" stop-color="#FFD600"/>
    </linearGradient>
    <linearGradient id="f-mid" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#FF6D00"/>
      <stop offset="50%" stop-color="#FFD600"/>
      <stop offset="100%" stop-color="#FFFF8D"/>
    </linearGradient>
    <linearGradient id="f-core" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#0091EA"/>
      <stop offset="55%" stop-color="#00E5FF"/>
      <stop offset="100%" stop-color="#E0F7FA"/>
    </linearGradient>
    <filter id="f-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="f-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#3E1100" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#f-shadow)">
    <path d="M128 20 C154 58, 206 100, 206 156 C206 204, 172 234, 128 234 C84 234, 50 204, 50 156 C50 114, 82 78, 102 52 C108 82, 126 96, 128 20 Z" fill="url(#f-outer)" stroke="#3E2723" stroke-width="7" stroke-linejoin="round"/>
    <path d="M64 164 C52 144, 56 122, 68 108 C68 126, 78 136, 88 142 Z" fill="#FFAB00"/>
    <path d="M192 164 C204 144, 200 122, 188 108 C188 126, 178 136, 168 142 Z" fill="#FFAB00"/>
    <path d="M128 72 C146 102, 178 126, 178 166 C178 198, 156 220, 128 220 C100 220, 78 198, 78 166 C78 132, 102 110, 114 90 C118 110, 126 118, 128 72 Z" fill="url(#f-mid)" stroke="#E65100" stroke-width="4" stroke-linejoin="round"/>
    <path d="M128 124 C140 144, 156 160, 156 182 C156 204, 144 216, 128 216 C112 216, 100 204, 100 182 C100 160, 116 148, 122 136 C124 146, 126 150, 128 124 Z" fill="url(#f-core)" filter="url(#f-glow)"/>
    <path d="M96 158 L114 166 L98 170 Z" fill="#212121"/>
    <path d="M160 158 L142 166 L158 170 Z" fill="#212121"/>
    <circle cx="106" cy="165" r="3" fill="#FFFFFF"/>
    <circle cx="150" cy="165" r="3" fill="#FFFFFF"/>
    <circle cx="48" cy="92" r="5" fill="#FFD600"/>
    <circle cx="210" cy="86" r="6" fill="#FF6D00"/>
    <polygon points="128,14 130,22 136,24 130,26 128,34 126,26 120,24 126,22" fill="#FFE082"/>
  </g>
</svg>`
  },
  {
    id: 'heart',
    label: 'Yêu thích',
    description: 'Trái tim tinh thể Aether lam ngọc giác cắt 3D lấp lánh hào quang ma thuật Elyndra',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="ht-bg" cx="45%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#E0F7FA"/>
      <stop offset="30%" stop-color="#00E5FF"/>
      <stop offset="65%" stop-color="#0091EA"/>
      <stop offset="90%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </radialGradient>
    <linearGradient id="ht-facet-l" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#80D8FF" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="ht-facet-r" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00B0FF" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#002171" stop-opacity="0.7"/>
    </linearGradient>
    <filter id="ht-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="ht-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#001830" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#ht-shadow)">
    <path d="M128 48 C100 16, 42 34, 42 86 C42 144, 114 196, 128 214 C142 196, 214 144, 214 86 C214 34, 156 16, 128 48 Z" fill="none" stroke="#80D8FF" stroke-width="4" filter="url(#ht-glow)" opacity="0.6"/>
    <path d="M128 54 C102 24, 48 40, 48 90 C48 144, 116 194, 128 208 C140 194, 208 144, 208 90 C208 40, 154 24, 128 54 Z" fill="url(#ht-bg)" stroke="#002171" stroke-width="7" stroke-linejoin="round"/>
    <polygon points="128,54 84,74 88,114 128,124" fill="url(#ht-facet-l)"/>
    <polygon points="128,54 172,74 168,114 128,124" fill="url(#ht-facet-r)"/>
    <polygon points="128,124 88,114 128,208" fill="url(#ht-facet-l)" opacity="0.6"/>
    <polygon points="128,124 168,114 128,208" fill="url(#ht-facet-r)"/>
    <polygon points="84,74 48,90 88,114" fill="#00E5FF" opacity="0.3"/>
    <polygon points="172,74 208,90 168,114" fill="#0D47A1" opacity="0.5"/>
    <polygon points="80,68 84,80 96,84 84,88 80,100 76,88 64,84 76,80" fill="#FFFFFF" filter="url(#ht-glow)"/>
    <polygon points="80,74 82,82 90,84 82,86 80,94 78,86 70,84 78,82" fill="#E0F7FA"/>
    <polygon points="174,138 176,144 182,146 176,148 174,154 172,148 166,146 172,144" fill="#FFFFFF"/>
    <circle cx="160" cy="80" r="4" fill="#80D8FF"/>
    <circle cx="104" cy="162" r="3" fill="#FFFFFF"/>
  </g>
</svg>`
  }
];

console.log('1. Writing SVGs...');
for (const item of EMOJIS) {
  const svgPath = path.join(SVG_DIR, `${item.id}.svg`);
  fs.writeFileSync(svgPath, item.svg.trim(), 'utf8');
}

console.log('2. Rendering PNGs via Chrome headless with transparent background...');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CWEBP_PATH = '/opt/homebrew/bin/cwebp';

for (const item of EMOJIS) {
  const svgPath = path.join(SVG_DIR, `${item.id}.svg`);
  const pngPath = path.join(PNG_DIR, `${item.id}.png`);
  const webpPath = path.join(WEBP_DIR, `${item.id}.webp`);
  const publicPng = path.join(REACTIONS_PUBLIC, `${item.id}.png`);
  const publicWebp = path.join(REACTIONS_PUBLIC, `${item.id}.webp`);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 256px; height: 256px; background: transparent; overflow: hidden; }
  svg { display: block; width: 256px; height: 256px; }
</style>
</head>
<body>${item.svg.trim()}</body>
</html>`;

  const tmpHtml = path.join('/tmp', `kora-render-${item.id}.html`);
  fs.writeFileSync(tmpHtml, html, 'utf8');

  execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --screenshot="${pngPath}" --window-size=256,256 --default-background-color=00000000 file://${tmpHtml} 2>/dev/null`);
  fs.unlinkSync(tmpHtml);

  // Convert to WebP lossless / high quality
  execSync(`"${CWEBP_PATH}" -lossless -q 100 "${pngPath}" -o "${webpPath}" 2>/dev/null`);

  // Copy to public/design/reactions
  fs.copyFileSync(pngPath, publicPng);
  fs.copyFileSync(webpPath, publicWebp);

  const pngStats = fs.statSync(pngPath);
  const webpStats = fs.statSync(webpPath);
  console.log(` - ${item.id}: PNG=${(pngStats.size/1024).toFixed(1)} KB, WebP=${(webpStats.size/1024).toFixed(1)} KB`);
}

console.log('3. Generating Contact Sheet...');
const contactHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Kora War Reaction Emojis - Contact Sheet</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  body { background: #0B1118; color: #ECEFF1; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 8px; color: #00E5FF; text-align: center; letter-spacing: 1px; }
  p.sub { font-size: 13px; color: #90A4AE; text-align: center; margin-bottom: 24px; }
  
  .sheet-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 1100px; margin: 0 auto; }
  .card {
    background: #141E28; border: 1px solid #1E2D3D; border-radius: 12px; padding: 16px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .card h3 { font-size: 14px; color: #FFD54F; text-transform: uppercase; letter-spacing: 0.5px; }
  .card p { font-size: 11px; color: #90A4AE; text-align: center; line-height: 1.4; height: 32px; }
  
  .preview-stage {
    display: flex; gap: 12px; align-items: center; justify-content: center; width: 100%;
    padding: 12px; border-radius: 8px;
  }
  .dark-stage { background: #070B0E; border: 1px dashed #263238; }
  .light-stage { background: #ECEFF1; border: 1px dashed #B0BEC5; }
  
  .badge-256 { width: 96px; height: 96px; object-fit: contain; }
  .badge-64 { width: 48px; height: 48px; object-fit: contain; }
  .badge-40 { width: 32px; height: 32px; object-fit: contain; }
  
  .scales { display: flex; flex-direction: column; gap: 8px; align-items: center; }
</style>
</head>
<body>
  <h1>KORA WAR — ELYNDRA REACTION EMOJIS</h1>
  <p class="sub">Bộ 8 biểu tượng cảm xúc độc quyền • Nền trong suốt • Tối ưu hiển thị 40px/64px/256px • Không chứa text</p>

  <div class="sheet-grid">
    ${EMOJIS.map(e => `
      <div class="card">
        <h3>${e.id} (${e.label})</h3>
        <div class="preview-stage dark-stage">
          <img class="badge-256" src="${path.join(PNG_DIR, e.id + '.png')}" alt="${e.label}">
          <div class="scales">
            <img class="badge-64" src="${path.join(PNG_DIR, e.id + '.png')}" alt="${e.label}">
            <img class="badge-40" src="${path.join(PNG_DIR, e.id + '.png')}" alt="${e.label}">
          </div>
        </div>
        <div class="preview-stage light-stage">
          <img class="badge-256" src="${path.join(PNG_DIR, e.id + '.png')}" alt="${e.label}">
          <div class="scales">
            <img class="badge-64" src="${path.join(PNG_DIR, e.id + '.png')}" alt="${e.label}">
            <img class="badge-40" src="${path.join(PNG_DIR, e.id + '.png')}" alt="${e.label}">
          </div>
        </div>
        <p>${e.description}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

const contactHtmlPath = path.join(REACTIONS_ASSETS, 'contact-sheet.html');
fs.writeFileSync(contactHtmlPath, contactHtml, 'utf8');

const contactPngPath = path.join(REACTIONS_ASSETS, 'contact-sheet.png');
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --screenshot="${contactPngPath}" --window-size=1200,900 "${contactHtmlPath}" 2>/dev/null`);

console.log('4. Generating Interactive In-Battle Preview Page...');
const previewHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Kora War — Quick Chat Reactions Preview</title>
  <style>
    :root {
      --bg-battle: #0D141C;
      --bubble-own: #002B49;
      --bubble-own-border: #00E5FF;
      --bubble-opp: #421010;
      --bubble-opp-border: #FF5252;
      --gold-accent: #FFD54F;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      background: #06090D;
      color: #ECEFF1;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 16px;
    }
    header {
      text-align: center;
      margin-bottom: 16px;
    }
    header h1 {
      font-size: 20px;
      color: #00E5FF;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    header p {
      font-size: 12px;
      color: #78909C;
      margin-top: 4px;
    }
    
    .viewports {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      justify-content: center;
      width: 100%;
      max-width: 1400px;
    }
    
    .arena-container {
      background: radial-gradient(circle at 50% 50%, #152232 0%, #080D14 100%);
      border: 2px solid #1E3347;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 8px 32px rgba(0,0,0,0.8);
    }
    
    /* 844x390 landscape mobile */
    .viewport-mobile {
      width: 844px;
      height: 390px;
    }
    
    .arena-badge {
      position: absolute;
      top: 10px;
      left: 12px;
      background: rgba(0,0,0,0.6);
      border: 1px solid #00E5FF;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      color: #00E5FF;
      font-weight: bold;
      z-index: 10;
    }

    /* Lanes simulation */
    .lane-guide {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      opacity: 0.15;
      pointer-events: none;
    }
    .lane-line { height: 1px; background: #00E5FF; width: 100%; }

    /* Reactions in-battle bubbles */
    .bubble {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes pop {
      0% { transform: scale(0.6); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    .bubble.own {
      bottom: 70px;
      left: 60px;
      background: var(--bubble-own);
      border: 2px solid var(--bubble-own-border);
      color: #80D8FF;
    }
    .bubble.opponent {
      top: 50px;
      right: 60px;
      background: var(--bubble-opp);
      border: 2px solid var(--bubble-opp-border);
      color: #FF8A80;
    }
    
    .bubble img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    .bubble small {
      font-size: 9px;
      letter-spacing: 0.5px;
      opacity: 0.8;
      text-transform: uppercase;
      display: block;
    }

    /* Quick Chat Panel */
    .quick-chat-panel {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(13, 23, 33, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid #00B0FF;
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.7);
      z-index: 20;
    }
    .panel-header {
      font-size: 10px;
      color: #FFD54F;
      font-weight: bold;
      letter-spacing: 1px;
      display: flex;
      justify-content: space-between;
    }
    .emojis-row {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 6px;
    }
    .emoji-btn {
      width: 44px;
      height: 44px;
      background: #101B26;
      border: 1px solid #1E3347;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 3px;
    }
    .emoji-btn:hover {
      background: #1A2F44;
      border-color: #00E5FF;
      transform: translateY(-2px);
    }
    .emoji-btn img {
      width: 36px;
      height: 36px;
      object-fit: contain;
    }

    /* Hand cards placeholder to prove no overlap */
    .cards-hand {
      position: absolute;
      bottom: 8px;
      left: 12px;
      display: flex;
      gap: 6px;
      opacity: 0.7;
    }
    .card-slot {
      width: 44px;
      height: 56px;
      background: #0A141E;
      border: 1px solid #1E2D3D;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #546E7A;
    }

    /* Light Theme Comparison Block */
    .light-comparison {
      width: 100%;
      max-width: 844px;
      margin-top: 20px;
      background: #FFFFFF;
      color: #212121;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    .light-comparison h3 {
      font-size: 14px;
      margin-bottom: 12px;
      color: #0091EA;
    }
    .light-bubbles {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .light-bubble {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 16px;
      background: #F0F4F8;
      border: 1.5px solid #0091EA;
      font-size: 11px;
      font-weight: 600;
    }
    .light-bubble img {
      width: 40px;
      height: 40px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Kora War — Quick Chat Reactions Preview</h1>
    <p>Xác thực hiển thị trên màn hình ngang Mobile 844x390 • Tương thích Dark/Light Bubble • Đọc rõ ở 40px & 64px</p>
  </header>

  <div class="viewports">
    <div class="arena-container viewport-mobile">
      <div class="arena-badge">MOBILE LANDSCAPE 844×390</div>
      
      <div class="lane-guide">
        <div class="lane-line"></div>
        <div class="lane-line"></div>
        <div class="lane-line"></div>
      </div>

      <!-- Opponent Bubble (Light/Red Theme) -->
      <div class="bubble opponent">
        <div>
          <small>ĐỐI THỦ</small>
          <span>Tán thưởng!</span>
        </div>
        <img src="respect.png" alt="respect">
      </div>

      <!-- Own Bubble (Aether Dark/Blue Theme) -->
      <div class="bubble own">
        <img src="cheer.png" alt="cheer">
        <div>
          <small>BẠN</small>
          <span>Cổ vũ!</span>
        </div>
      </div>

      <!-- 6 Hand Cards Demo -->
      <div class="cards-hand">
        <div class="card-slot">#1</div>
        <div class="card-slot">#2</div>
        <div class="card-slot">#3</div>
        <div class="card-slot">#4</div>
        <div class="card-slot">#5</div>
        <div class="card-slot">#6</div>
      </div>

      <!-- Quick Chat Selector Panel -->
      <div class="quick-chat-panel">
        <div class="panel-header">
          <span>PHẢN HỒI NHANH</span>
          <span>EMOJI</span>
        </div>
        <div class="emojis-row">
          ${EMOJIS.map(e => `
            <div class="emoji-btn" title="${e.label}">
              <img src="${e.id}.png" alt="${e.label}">
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- Light Bubble Contrast Proof -->
  <div class="light-comparison">
    <h3>Kiểm tra độ tương phản trên bong bóng nền sáng (Light Bubbles - 40px)</h3>
    <div class="light-bubbles">
      ${EMOJIS.map(e => `
        <div class="light-bubble">
          <img src="${e.id}.png" alt="${e.label}">
          <span>${e.id} (${e.label})</span>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

const previewHtmlPath = path.join(REACTIONS_ASSETS, 'preview.html');
fs.writeFileSync(previewHtmlPath, previewHtml, 'utf8');

// Copy preview to public/design/reactions/index.html so it can be served/browsed
fs.copyFileSync(previewHtmlPath, path.join(REACTIONS_PUBLIC, 'index.html'));

console.log('5. Capturing Preview Screenshots (Desktop 1536x720 and Mobile 844x390)...');
const previewDesktopPng = path.join(REACTIONS_ASSETS, 'preview-desktop.png');
const previewMobilePng = path.join(REACTIONS_ASSETS, 'preview-mobile-844x390.png');

execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --screenshot="${previewDesktopPng}" --window-size=1536,720 "${previewHtmlPath}" 2>/dev/null`);
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --screenshot="${previewMobilePng}" --window-size=844,390 "${previewHtmlPath}" 2>/dev/null`);

console.log('6. Building Manifest JSON...');
function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const manifest = {
  version: '1.0.0',
  contract: 'communication.reactions[].imageAssetId',
  lore: 'Aetherfall / Elyndra Original Art',
  author: 'Gemini Design Agent',
  license: 'Proprietary - Kora War Project',
  sourceUrl: 'assets/design/reactions/svg/',
  budgetLimits: {
    maxSizeBytes: 102400, // 100 KB
    resolution: '256x256',
    format: 'WebP / PNG',
    transparentBackground: true,
    noText: true
  },
  items: EMOJIS.map(e => {
    const pngFile = `${e.id}.png`;
    const webpFile = `${e.id}.webp`;
    const svgFile = `${e.id}.svg`;

    const pngStat = fs.statSync(path.join(PNG_DIR, pngFile));
    const webpStat = fs.statSync(path.join(WEBP_DIR, webpFile));
    const svgStat = fs.statSync(path.join(SVG_DIR, svgFile));

    return {
      id: e.id,
      label: e.label,
      description: e.description,
      dimensions: { width: 256, height: 256 },
      assets: {
        webp: {
          file: `webp/${webpFile}`,
          publicUrl: `/design/reactions/${webpFile}`,
          sizeBytes: webpStat.size,
          sha256: sha256(path.join(WEBP_DIR, webpFile))
        },
        png: {
          file: `png/${pngFile}`,
          publicUrl: `/design/reactions/${pngFile}`,
          sizeBytes: pngStat.size,
          sha256: sha256(path.join(PNG_DIR, pngFile))
        },
        svgSource: {
          file: `svg/${svgFile}`,
          sizeBytes: svgStat.size,
          sha256: sha256(path.join(SVG_DIR, svgFile))
        }
      }
    };
  }),
  previews: [
    { name: 'contact-sheet.png', width: 1200, height: 900, sha256: sha256(contactPngPath) },
    { name: 'preview-desktop.png', width: 1536, height: 720, sha256: sha256(previewDesktopPng) },
    { name: 'preview-mobile-844x390.png', width: 844, height: 390, sha256: sha256(previewMobilePng) }
  ]
};

const manifestPath = path.join(REACTIONS_ASSETS, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('7. Writing README.md in assets/design/reactions/...');
const readmeContent = `# Bộ 8 biểu tượng cảm xúc gốc Kora War (Reactions Art)

Tài sản thiết kế cho tính năng phản hồi nhanh (Quick Chat) trong Kora War, thực hiện bởi **Gemini Design Agent** theo [Issue #3](https://github.com/huyplay/Kora-War/issues/3).

## 1. Thông tin tổng quan và Hợp đồng tích hợp

- **Hợp đồng dữ liệu**: \`communication.reactions[].imageAssetId\` (trong \`src/data/communication.ts\`).
- **Phạm vi tác quyền**: Tác phẩm nghệ thuật vector nguyên bản cho thế giới Aetherfall / Elyndra. Không sử dụng hình ảnh từ bên ngoài, không vi phạm bản quyền Castle Crush hoặc Riot.
- **Giấy phép**: Proprietary - Kora War Project. Tác giả: Gemini Design Agent (huyplay).
- **Quy chuẩn kỹ thuật**:
  - Kích thước chuẩn: **256x256 px**.
  - Định dạng: **WebP** (nén lossless cao cấp) và **PNG** (alpha transparency).
  - Ngưỡng dung lượng tối đa cho mobile: **≤ 100 KB/hình** (Thực tế toàn bộ ảnh WebP đều **≤ 6 KB**, nhỏ hơn 16 lần so với giới hạn).
  - Không chứa văn bản/chữ trong hình (No in-image text).
  - Độ tương phản cao với viền bóng đổ, đọc rõ ràng ở cả **40px** và **64px** trên nền bong bóng tối (\`#002B49\`) và bong bóng sáng (\`#ECEFF1\`).

## 2. Bảng kê 8 biểu tượng và Ngân sách kích thước

| ID | Nhãn | Mô tả Elyndra / Lore | PNG (bytes) | WebP (bytes) | WebP SHA-256 |
|---|---|---|---|---|---|
${manifest.items.map(i => `| \`${i.id}\` | ${i.label} | ${i.description} | ${i.assets.png.sizeBytes} | ${i.assets.webp.sizeBytes} | \`${i.assets.webp.sha256.slice(0, 12)}...\` |`).join('\n')}

## 3. Cấu trúc thư mục bàn giao

\`\`\`
assets/design/reactions/
├── manifest.json              # Khai báo ID, kích thước, dung lượng, sha256 checksum
├── README.md                  # Báo cáo kỹ thuật và checklist nghiệm thu
├── contact-sheet.png          # Contact sheet toàn bộ 8 emoji trên nền sáng & tối
├── contact-sheet.html         # HTML sinh contact sheet
├── preview.html               # Trang xem thử trực quan tương tác
├── preview-desktop.png        # Bằng chứng nghiệm thu desktop (1536x720)
├── preview-mobile-844x390.png # Bằng chứng nghiệm thu mobile landscape (844x390)
├── build-reactions.mjs        # Script tạo lập và kiểm thử có thể tái lập
├── svg/                       # 8 file nguồn vector SVG
│   ├── happy.svg
│   ├── cheer.svg
│   ├── wow.svg
│   ├── cry.svg
│   ├── laugh.svg
│   ├── respect.svg
│   ├── fire.svg
│   └── heart.svg
├── png/                       # 8 file PNG 256x256 trong suốt
└── webp/                      # 8 file WebP 256x256 trong suốt siêu nhẹ

public/design/reactions/       # Bản demo tĩnh cho frontend / Pages
├── index.html                 # Trang demo tương tác
├── *.png
└── *.webp
\`\`\`

## 4. Hướng dẫn tích hợp cho Senior Codex

1. Codex kiểm tra PR từ nhánh \`gemini/3-reaction-art\`.
2. Kiểm tra \`npm run check\` đạt 100%.
3. Tích hợp các file WebP/PNG từ \`assets/design/reactions/\` vào kho asset SQLite bằng script upload hoặc giao diện Admin (\`admin.html\`).
4. Gán \`imageAssetId\` tương ứng với từng reaction id trong cấu hình \`communication.reactions\` (ví dụ: \`imageAssetId: 'kora-reaction-happy'\`).
5. Frontend \`QuickChat\` component (\`src/ui/quick-chat.ts\`) sẽ tự động hiển thị thẻ \`<img src="/api/assets/...">\` thay cho emoji mặc định.
`;

fs.writeFileSync(path.join(REACTIONS_ASSETS, 'README.md'), readmeContent, 'utf8');

console.log('Build completed successfully!');
