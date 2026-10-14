import { createServer, type IncomingMessage } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GameDatabase } from './database';
import { importAsset } from './assets';
import { startMatch, finishMatch, buyItem, openChest, upgradeCard } from './game-service';
import { assetServiceStatus, syncManagedAsset, readManagedAsset } from './asset-service';
import { PvpRooms } from './pvp';

async function body(req: IncomingMessage, limit = 1024 * 1024) {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > limit) throw new Error('Request quá lớn.');
    parts.push(part);
  }
  return Buffer.concat(parts);
}
const cookies = (req: IncomingMessage) =>
  Object.fromEntries((req.headers.cookie || '').split(';').map((s) => s.trim().split('=')));
export function createGameServer(store: GameDatabase, staticDir = resolve('dist')) {
  const pvp = new PvpRooms();
  const attempts = new Map<string, { count: number; until: number }>();
  return createServer(async (req, res) => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(data));
    };
    const cookie = (name: string, token: string, age: number) =>
      res.setHeader(
        'Set-Cookie',
        `${name}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.KORA_SECURE_COOKIE === '1' ? '; Secure' : ''}`,
      );
    const admin = () => {
      if (!store.subject(cookies(req).kw_admin || '', 'admin'))
        throw new Error('AUTH: Cần đăng nhập quản trị.');
    };
    const player = () => {
      const id = store.subject(cookies(req).kw_player || '', 'player');
      if (!id) throw new Error('AUTH: Cần khởi tạo hồ sơ.');
      return id;
    };
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const path = url.pathname;
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'same-origin');
      if (!['GET', 'HEAD'].includes(req.method || '')) {
        const origin = req.headers.origin;
        if (
          origin &&
          ![
            'http://127.0.0.1:5173',
            'http://localhost:5173',
            'http://127.0.0.1:4173',
            'http://localhost:4173',
            `http://${req.headers.host}`,
            process.env.KORA_ORIGIN,
          ].includes(origin)
        )
          throw new Error('Origin không được phép.');
        if (req.headers['x-kora-request'] !== '1') throw new Error('Thiếu request header.');
      }
      if (path === '/api/health') return send(200, { ok: true });
      if (path === '/api/content' && req.method === 'GET') {
        const c = store.config();
        return send(200, {
          revision: c.revision,
          content: c.published,
          assets: store.assets().filter((a) => JSON.stringify(c.published).includes(String(a.id))),
        });
      }
      if (path === '/api/admin/login' && req.method === 'POST') {
        const key = req.socket.remoteAddress || 'local',
          now = Date.now(),
          prior = attempts.get(key);
        if (prior && prior.until > now && prior.count >= 10)
          return send(429, { error: 'Thử lại sau 10 phút.' });
        const input = JSON.parse((await body(req, 4096)).toString());
        if (
          typeof input.password !== 'string' ||
          input.password.length > 200 ||
          !store.login(input.password)
        ) {
          attempts.set(key, { count: prior && prior.until > now ? prior.count + 1 : 1, until: now + 600000 });
          return send(401, { error: 'Mật khẩu không đúng.' });
        }
        attempts.delete(key);
        cookie('kw_admin', store.session('admin', 'admin'), 28800);
        return send(200, { ok: true });
      }
      if (path.startsWith('/api/admin/')) {
        admin();
        if (path === '/api/admin/logout' && req.method === 'POST') {
          store.db.prepare('DELETE FROM sessions WHERE token=?').run(cookies(req).kw_admin || '');
          cookie('kw_admin', '', 0);
          return send(200, { ok: true });
        }
        if (path === '/api/admin/state' && req.method === 'GET')
          return send(200, {
            ...store.config(),
            assets: store.assets(true),
            players: store.db.prepare('SELECT * FROM players ORDER BY created DESC LIMIT 100').all(),
            audit: store.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 50').all(),
            revisions: store.db.prepare('SELECT id,created FROM revisions ORDER BY id DESC LIMIT 50').all(),
            assetService: await assetServiceStatus(),
            assetSyncPending: Number(
              store.db.prepare('SELECT count(*) AS n FROM asset_sync_pending').get()!.n,
            ),
          });
        if (path === '/api/admin/assets' && req.method === 'POST') {
          const metadata = JSON.parse(decodeURIComponent(String(req.headers['x-asset-metadata'] || '')));
          const asset = importAsset(store, await body(req, 30 * 1024 * 1024), metadata);
          return send(201, { ...asset, storageSync: await syncManagedAsset(store, asset.id) });
        }
        if (path === '/api/admin/player' && req.method === 'GET')
          return send(200, store.wallet(url.searchParams.get('id') || ''));
        if (path === '/api/admin/rule-modules' && req.method === 'GET')
          return send(200, {
            version: store.config().version,
            modules: store.ruleModules.status(),
            draft: store.ruleModules.read('draft'),
            published: store.ruleModules.read('published'),
          });
        const input = JSON.parse((await body(req)).toString());
        if (path.startsWith('/api/admin/rule-modules/') && req.method === 'PUT')
          return send(
            200,
            store.saveRuleModule(
              {
                id: path.slice('/api/admin/rule-modules/'.length),
                schemaVersion: input.schemaVersion,
                data: input.data,
              },
              input.version,
            ),
          );
        if (path === '/api/admin/assets/archive' && req.method === 'POST') {
          if (typeof input.archived !== 'boolean') throw new Error('Trạng thái ẩn không hợp lệ.');
          store.archiveAsset(input.id, input.archived);
          await syncManagedAsset(store, input.id);
          return send(200, { ok: true });
        }
        if (path === '/api/admin/draft' && req.method === 'PUT')
          return send(200, store.saveDraft(input.content, input.version));
        if (path === '/api/admin/publish' && req.method === 'POST')
          return send(200, store.publish(input.version));
        if (path === '/api/admin/restore' && req.method === 'POST') {
          return send(200, store.restoreRevision(input.revision, input.version));
        }
        if (path === '/api/admin/wallet' && req.method === 'POST') {
          if (
            !Number.isSafeInteger(input.delta) ||
            Math.abs(input.delta) > 1000000 ||
            typeof input.reason !== 'string' ||
            input.reason.length < 3 ||
            input.reason.length > 200
          )
            throw new Error('Cần số vàng và lý do hợp lệ.');
          const result = store.trade(input.player, `admin-${randomUUID()}`, () => ({
            delta: input.delta,
            reason: `Admin: ${input.reason}`,
          }));
          store.audit('wallet.adjust', { player: input.player, delta: input.delta, reason: input.reason });
          return send(200, result);
        }
        return send(404, { error: 'Không có endpoint.' });
      }
      if (path === '/api/player' && req.method === 'POST') {
        let id = store.subject(cookies(req).kw_player || '', 'player');
        if (!id) {
          id = store.player();
          cookie('kw_player', store.session('player', id), 90 * 86400);
        }
        return send(200, store.wallet(id));
      }
      if (path === '/api/player' && req.method === 'GET') return send(200, store.wallet(player()));
      if (path.startsWith('/api/pvp/')) {
        const id = player();
        if (path === '/api/pvp/current' && req.method === 'GET') return send(200, pvp.current(id));
        if (path === '/api/pvp/state' && req.method === 'GET')
          return send(
            200,
            pvp.state(id, url.searchParams.get('code') || '', url.searchParams.get('metadata') === '1'),
          );
        if (req.method !== 'POST') return send(405, { error: 'Method không hợp lệ.' });
        const input = JSON.parse((await body(req, 4096)).toString());
        if (path === '/api/pvp/create') return send(201, pvp.create(id, input, store.config().published));
        if (path === '/api/pvp/join') return send(200, pvp.join(id, input.code, input));
        if (path === '/api/pvp/command') return send(200, pvp.command(id, input.code, input.command));
        if (path === '/api/pvp/leave') return send(200, pvp.leave(id, input.code));
        return send(404, { error: 'Không có endpoint.' });
      }
      if (path.startsWith('/api/game/') && req.method === 'POST') {
        const id = player(),
          input = JSON.parse((await body(req)).toString());
        if (path === '/api/game/start')
          return send(200, startMatch(store, id, input.deck, input.difficulty, input.spells, input.cards));
        if (path === '/api/game/finish')
          return send(200, finishMatch(store, id, input.id, input.commands, input.debug));
        if (typeof input.request !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(input.request))
          throw new Error('Thiếu mã giao dịch.');
        let result;
        if (path === '/api/game/buy') result = buyItem(store, id, input.item, input.request);
        else if (path === '/api/game/chest') result = openChest(store, id, input.request);
        else if (path === '/api/game/upgrade') result = upgradeCard(store, id, input.hero, input.request);
        else return send(404, { error: 'Không có endpoint.' });
        return send(200, { result, wallet: store.wallet(id) });
      }
      if (path.startsWith('/api/assets/') && req.method === 'GET') {
        const asset = store.asset(path.slice('/api/assets/'.length));
        if (!asset) return send(404, { error: 'Không có asset.' });
        const file = join(store.directory, asset.path as string);
        res.writeHead(200, {
          'Content-Type': asset.kind === 'model' ? 'model/gltf-binary' : mime(file),
          'Cache-Control': 'public,max-age=31536000,immutable',
          'Content-Length': asset.bytes as number,
        });
        res.end((await readManagedAsset(store, String(asset.id))) || readFileSync(file));
        return;
      }
      if (path.startsWith('/api/')) return send(404, { error: 'Không có endpoint.' });
      const relative =
        path === '/'
          ? 'index.html'
          : path === '/admin' || path === '/admin/'
            ? 'admin.html'
            : decodeURIComponent(path).replace(/^\/+/, '');
      const file = resolve(staticDir, relative);
      if (!file.startsWith(resolve(staticDir) + requireSeparator()) || !existsSync(file))
        return send(404, { error: 'Không tìm thấy trang. Chạy npm run build trước.' });
      res.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-cache' });
      res.end(readFileSync(file));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Lỗi server';
      send(message.startsWith('AUTH:') ? 401 : message.startsWith('CONFLICT:') ? 409 : 400, {
        error: message,
      });
    }
  });
}
function requireSeparator() {
  return process.platform === 'win32' ? '\\' : '/';
}
function mime(file: string) {
  return (
    (
      {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
        '.glb': 'model/gltf-binary',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.svg': 'image/svg+xml',
      } as Record<string, string>
    )[extname(file)] || 'application/octet-stream'
  );
}
