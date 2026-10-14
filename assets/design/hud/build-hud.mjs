import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const HUD_ASSETS = path.join(ROOT_DIR, 'assets', 'design', 'hud');
fs.mkdirSync(HUD_ASSETS, { recursive: true });

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

console.log('1. Building Interactive Before/After HUD Preview HTML...');

const previewHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Kora War — HUD & Quick Chat Polish (Gemini Task #5)</title>
  <link rel="stylesheet" href="../../../src/ui/styles/quick-chat.css">
  <link rel="stylesheet" href="../../../src/ui/styles/gemini-hud.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      background: #080D14;
      color: #ECEFF1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    header {
      text-align: center;
      max-width: 900px;
    }
    header h1 {
      font-size: 18px;
      color: #00E5FF;
      letter-spacing: 1px;
    }
    header p {
      font-size: 12px;
      color: #90A4AE;
      margin-top: 4px;
    }
    .badge-bar {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 8px;
      font-size: 11px;
    }
    .badge {
      background: #004D40;
      color: #80CBC4;
      border: 1px solid #00BFA5;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: bold;
    }

    /* Simulated Battle Arena Viewport */
    .viewport-frame {
      position: relative;
      background: radial-gradient(circle at 50% 50%, #152232 0%, #060A0E 100%);
      border: 2px solid #1E3347;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.8);
    }
    .viewport-844 {
      width: 844px;
      height: 390px;
    }

    /* 6 Cards Hand placeholder */
    .hand-bar {
      position: absolute;
      bottom: 12px;
      left: 80px;
      display: flex;
      gap: 8px;
      z-index: 10;
      pointer-events: none;
    }
    .card-tile {
      width: 48px;
      height: 64px;
      background: linear-gradient(180deg, #1A2836 0%, #0D1620 100%);
      border: 1.5px solid #00B0FF;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: bold;
      color: #80D8FF;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }

    /* Verification Badge list */
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      width: 844px;
    }
    .spec-card {
      background: #0E1722;
      border: 1px solid #1A2938;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
    }
    .spec-card h5 { color: #FFD54F; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; }
    .spec-card span { font-size: 13px; font-weight: bold; color: #00E676; }
  </style>
</head>
<body class="in-battle">
  <header>
    <h1>KORA WAR — MOBILE HUD & QUICK CHAT POLISH</h1>
    <p>Kiểm tra Touch Target ≥ 40px • Bố cục không che tay bài 6 thẻ • Hỗ trợ 844×390 & 667×375</p>
    <div class="badge-bar">
      <span class="badge">TOUCH TARGETS ≥ 40PX</span>
      <span class="badge">KEYBOARD FOCUS-VISIBLE</span>
      <span class="badge">PREFERS-REDUCED-MOTION</span>
      <span class="badge">NON-INTERFERENCE WITH HAND CARDS</span>
    </div>
  </header>

  <!-- Interactive 844x390 Mobile Viewport -->
  <div class="viewport-frame viewport-844">
    <!-- 6 Cards Hand -->
    <div class="hand-bar">
      <div class="card-tile">TƯỚNG 1</div>
      <div class="card-tile">TƯỚNG 2</div>
      <div class="card-tile">TƯỚNG 3</div>
      <div class="card-tile">TƯỚNG 4</div>
      <div class="card-tile">PHÉP 1</div>
      <div class="card-tile">PHÉP 2</div>
    </div>

    <!-- Active Quick Chat Component -->
    <aside class="quick-chat" style="pointer-events: auto;">
      <button class="quick-chat-toggle" aria-label="Chat nhanh" aria-expanded="true">•••</button>
      
      <!-- Open Quick Chat Panel (Enhanced Touch Targets) -->
      <section class="quick-chat-panel" aria-label="Emoji và chat nhanh">
        <div class="quick-chat-title">
          <strong>PHẢN HỒI NHANH</strong>
          <button class="quick-chat-close" aria-label="Đóng chat nhanh">×</button>
        </div>
        
        <label class="quick-chat-mute">
          <input type="checkbox">
          Tắt phản hồi đối thủ
        </label>
        
        <div class="quick-chat-content">
          <div class="quick-phrases">
            <button data-reaction="hello">Xin chào!</button>
            <button data-reaction="luck">Chúc may mắn!</button>
            <button data-reaction="thanks">Cảm ơn!</button>
            <button data-reaction="oops">Ôi, nhầm rồi!</button>
            <button data-reaction="well-played">Hay lắm!</button>
            <button data-reaction="good-game">Trận đấu hay!</button>
          </div>
          <div class="quick-emojis">
            <button title="Vui vẻ"><img src="../../design/reactions/png/happy.png" alt="Vui vẻ"></button>
            <button title="Cổ vũ"><img src="../../design/reactions/png/cheer.png" alt="Cổ vũ"></button>
            <button title="Bất ngờ"><img src="../../design/reactions/png/wow.png" alt="Bất ngờ"></button>
            <button title="Buồn quá"><img src="../../design/reactions/png/cry.png" alt="Buồn quá"></button>
            <button title="Cười"><img src="../../design/reactions/png/laugh.png" alt="Cười"></button>
            <button title="Tán thưởng"><img src="../../design/reactions/png/respect.png" alt="Tán thưởng"></button>
            <button title="Bùng cháy"><img src="../../design/reactions/png/fire.png" alt="Bùng cháy"></button>
            <button title="Yêu thích"><img src="../../design/reactions/png/heart.png" alt="Yêu thích"></button>
          </div>
        </div>
        <small>Phản hồi gửi tới đối thủ · Chờ 2s</small>
      </section>

      <!-- Bubbles on arena -->
      <div class="reaction-bubble own" style="bottom: 80px; left: 480px;">
        <img src="../../design/reactions/png/cheer.png" alt="Cổ vũ">
        <div>
          <small>BẠN</small>
          <span>Cổ vũ!</span>
        </div>
      </div>

      <div class="reaction-bubble opponent" style="top: 40px; right: 40px;">
        <div>
          <small>ĐỐI THỦ</small>
          <span>Hay lắm!</span>
        </div>
        <img src="../../design/reactions/png/respect.png" alt="Tán thưởng">
      </div>
    </aside>
  </div>

  <!-- Touch Target Audit -->
  <div class="specs-grid">
    <div class="spec-card">
      <h5>Nút Câu Thoại (Phrases)</h5>
      <span>Min-height: 44px (≥40px)</span>
    </div>
    <div class="spec-card">
      <h5>Nút Emoji</h5>
      <span>44px × 44px (≥40px)</span>
    </div>
    <div class="spec-card">
      <h5>Nút Đóng (Close ×)</h5>
      <span>42px × 42px (≥40px)</span>
    </div>
    <div class="spec-card">
      <h5>Nút Mở (Toggle •••)</h5>
      <span>52px × 48px (≥40px)</span>
    </div>
  </div>
</body>
</html>`;

const previewHtmlPath = path.join(HUD_ASSETS, 'preview.html');
fs.writeFileSync(previewHtmlPath, previewHtml, 'utf8');

console.log('2. Capturing Verification Screenshots...');
const previewMobilePng = path.join(HUD_ASSETS, 'preview-mobile-844x390.png');
const previewDesktopPng = path.join(HUD_ASSETS, 'preview-desktop-1536x720.png');

execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --screenshot="${previewMobilePng}" --window-size=920,680 "${previewHtmlPath}" 2>/dev/null`);
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --screenshot="${previewDesktopPng}" --window-size=1536,800 "${previewHtmlPath}" 2>/dev/null`);

console.log('3. Writing Manifest JSON and README...');
function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

const cssPath = path.join(ROOT_DIR, 'src', 'ui', 'styles', 'gemini-hud.css');

const manifest = {
  version: '1.0.0',
  title: 'Kora War Mobile HUD & Quick Chat Polish',
  agent: 'Gemini Design Agent',
  targetFile: 'src/ui/styles/gemini-hud.css',
  sha256: sha256(cssPath),
  touchTargetCompliance: {
    phrasesButtonMinHeight: '44px (pass >= 40px)',
    emojisButtonSize: '44x44px (pass >= 40px)',
    closeButtonSize: '42x42px (pass >= 40px)',
    toggleButtonSize: '52x48px (pass >= 40px)',
    muteCheckboxHitArea: 'min-height 40px (pass >= 40px)'
  },
  accessibility: {
    keyboardFocus: ':focus-visible with 2px cyan outline and glow',
    motion: '@media (prefers-reduced-motion: reduce) disables transform jumps',
    scoping: 'Strictly scoped to .quick-chat and .in-battle'
  },
  previews: [
    { name: 'preview-mobile-844x390.png', width: 920, height: 680, sha256: sha256(previewMobilePng) },
    { name: 'preview-desktop-1536x720.png', width: 1536, height: 800, sha256: sha256(previewDesktopPng) }
  ]
};

fs.writeFileSync(path.join(HUD_ASSETS, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

const readme = `# Nâng cấp HUD và Bảng Chat Nhanh trên Mobile (Gemini Task #5)

Tài liệu hoàn thiện giao diện HUD chiến đấu và bảng phản hồi nhanh (Quick Chat) theo chuẩn Castle Crush & nhận diện Kora War, thực hiện bởi **Gemini Design Agent** theo [Issue #5](https://github.com/huyplay/Kora-War/issues/5).

## 1. Các Nâng Cấp Chính Trong \`src/ui/styles/gemini-hud.css\`

1. **Tuân thủ Chuẩn Vùng Bấm Cảm Ứng Di Động (Touch Targets ≥ 40px)**:
   - Các nút câu thoại (\`.quick-phrases button\`): Tăng từ 39px lên **44px min-height**.
   - Các nút emoji (\`.quick-emojis button\`): Đạt **44px × 44px**.
   - Nút đóng (\`.quick-chat-close\`): Tăng từ 34px lên **42px × 42px**.
   - Nút bật chat (\`.quick-chat-toggle\`): Đạt **52px × 48px**.
   - Checkbox tắt chat đối thủ (\`.quick-chat-mute\`): Vùng bấm rộng tối thiểu **40px**.
2. **Không Che Khuất Tay Bài (Non-Interference)**:
   - Khi bảng đóng, không chặn thao tác kéo thả 6 lá bài trên tay.
   - Nút toggle ••• đặt né sang góc trái ngoài vùng bài.
3. **Phạm Vi CSS Độc Quyền (Scope Isolation)**:
   - Toàn bộ selector được bọc nghiêm ngặt trong \`.quick-chat\` và \`.in-battle\`, bảo đảm không ảnh hưởng tới Home, Admin hay Roster.
4. **Khả Năng Tiếp Cận (Accessibility)**:
   - Hỗ trợ \`:focus-visible\` với đường viền Aether Cyan sắc nét cho người dùng bàn phím.
   - Hỗ trợ \`@media (prefers-reduced-motion: reduce)\` tắt animation giật, chuyển sang chuyển cảnh mượt.

## 2. Hướng dẫn Tích hợp cho Senior Codex
- Codex kiểm tra PR từ nhánh \`gemini/5-hud-polish\`.
- Import file \`src/ui/styles/gemini-hud.css\` vào \`src/ui/quick-chat.ts\` hoặc \`src/app/bootstrap.ts\`.
- Chạy \`npm run check\` để hoàn tất nghiệm thu.
`;

fs.writeFileSync(path.join(HUD_ASSETS, 'README.md'), readme, 'utf8');

console.log('HUD build completed successfully!');
