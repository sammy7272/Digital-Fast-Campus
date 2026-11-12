// Pixel FAST multiplayer server: HTTP health endpoint + WebSocket game protocol.
// Security: origin allowlist, per-IP and global connection caps, 1 KB message cap, token-bucket rate
// limits, strict validation of every field, profanity masking, no chat is stored.
import http from 'node:http';
import { performance } from 'node:perf_hooks';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { World, send } from './world.js';
import { moderate } from './filter.js';
import { PROTOCOL_VERSION, TICK_HZ, isValidScene, cleanLook, cleanName, cleanChat, validCoord } from '../../shared/protocol.js';

// token bucket: `rate` tokens per second, up to `burst`
const bucket = (rate, burst) => ({ rate, burst, tokens: burst, at: Date.now() });
function take(b, n = 1) {
  const now = Date.now();
  b.tokens = Math.min(b.burst, b.tokens + ((now - b.at) / 1000) * b.rate); b.at = now;
  if (b.tokens < n) return false;
  b.tokens -= n; return true;
}

export function startServer(opts = {}) {
  const cfg = {
    port: opts.port ?? (Number(process.env.PORT) || 8787),
    origins: opts.origins ?? (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173').split(',').map(s => s.trim()).filter(Boolean),
    maxClients: opts.maxClients ?? (Number(process.env.MAX_CLIENTS) || 3000),
    maxPerIp: opts.maxPerIp ?? (Number(process.env.MAX_PER_IP) || 10),
    trustProxy: opts.trustProxy ?? process.env.TRUST_PROXY === '1',
    log: opts.log ?? (msg => console.log(new Date().toISOString(), msg)),
  };
  const world = new World();
  const perIp = new Map();
  let violationsTotal = 0, elu = performance.eventLoopUtilization(), busy = 0;

  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, online: world.players.size, rooms: world.rooms.size, tickMs: +world.lastTickMs.toFixed(2), busy: +busy.toFixed(3) }));
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found');
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024, perMessageDeflate: false });

  const clientIp = req => {
    if (cfg.trustProxy) { const f = req.headers['x-forwarded-for']; if (typeof f === 'string' && f) return f.split(',')[0].trim(); }
    return req.socket.remoteAddress || 'unknown';
  };
  const reject = (socket, code, text) => { socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`); socket.destroy(); };

  httpServer.on('upgrade', (req, socket, head) => {
    const path = (req.url || '').split('?')[0];
    if (path !== '/ws') return reject(socket, 404, 'Not Found');
    if (!cfg.origins.includes(req.headers.origin)) return reject(socket, 403, 'Forbidden');
    if (wss.clients.size >= cfg.maxClients) return reject(socket, 503, 'Service Unavailable');
    const ip = clientIp(req);
    if ((perIp.get(ip) || 0) >= cfg.maxPerIp) return reject(socket, 429, 'Too Many Requests');
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, ip));
  });

  wss.on('connection', (ws, ip) => {
    perIp.set(ip, (perIp.get(ip) || 0) + 1);
    const p = {
      id: null, ws, ip, name: 'Student', look: cleanLook(null), scene: 'campus', x: 0, y: 0, d: 0, m: 0,
      rev: 0, profRev: 0, seen: new Map(), profSeen: new Map(), cell: 0,
      msgs: bucket(20, 40), chats: bucket(1, 3), looks: bucket(0.5, 2), scenes: bucket(4, 8), violations: 0,
    };
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    const helloTimer = setTimeout(() => { if (!p.id) ws.close(4001, 'hello timeout'); }, 10000);
    const violation = why => {
      p.violations++; violationsTotal++;
      if (p.violations > 40) { cfg.log(`kick ${p.id || ip}: ${why}`); ws.close(1008, 'policy'); }
    };

    ws.on('message', (data, isBinary) => {
      if (isBinary) return violation('binary');
      if (!take(p.msgs)) return violation('rate');
      let m;
      try { m = JSON.parse(data.toString('utf8')); } catch { return violation('json'); }
      if (!m || typeof m !== 'object' || typeof m.t !== 'string') return violation('shape');

      if (m.t === 'hello') {
        if (p.id) return violation('double hello');
        if (m.v !== PROTOCOL_VERSION) { send(p, { t: 'err', code: 'version' }); return ws.close(4000, 'version'); }
        const nm = cleanName(m.name);
        p.name = moderate(nm).flagged ? 'Student' : nm;
        p.look = cleanLook(m.look);
        p.scene = isValidScene(m.scene) ? m.scene : 'campus';
        p.x = validCoord(m.x) ? m.x : 0; p.y = validCoord(m.y) ? m.y : 0;
        p.id = crypto.randomBytes(5).toString('hex');
        clearTimeout(helloTimer);
        world.join(p);
        send(p, { t: 'welcome', id: p.id, tick: TICK_HZ, online: world.players.size });
        return;
      }
      if (!p.id) return violation('before hello');

      switch (m.t) {
        case 'move': {
          if (!validCoord(m.x) || !validCoord(m.y)) return violation('coord');
          const d = Number.isInteger(m.d) && m.d >= 0 && m.d <= 3 ? m.d : 0;
          world.move(p, m.x, m.y, d, m.m ? 1 : 0);
          return;
        }
        case 'scene': {
          if (!take(p.scenes)) return violation('scene rate');
          if (!isValidScene(m.scene) || !validCoord(m.x) || !validCoord(m.y)) return violation('scene');
          world.setScene(p, m.scene, m.x, m.y);
          return;
        }
        case 'chat': {
          if (!take(p.chats)) { send(p, { t: 'err', code: 'slow' }); return; }
          const text = cleanChat(m.text);
          if (!text) return;
          world.chat(p, moderate(text).text);
          return;
        }
        case 'look': {
          if (!take(p.looks)) { send(p, { t: 'err', code: 'slow' }); return; }
          const nm = cleanName(m.name);
          p.name = moderate(nm).flagged ? 'Student' : nm;
          p.look = cleanLook(m.look); p.profRev++;
          return;
        }
        case 'ping': send(p, { t: 'pong', at: typeof m.at === 'number' ? m.at : 0 }); return;
        default: return violation('type');
      }
    });
    ws.on('close', () => {
      clearTimeout(helloTimer);
      if (p.id) world.leave(p);
      const n = (perIp.get(ip) || 1) - 1;
      if (n > 0) perIp.set(ip, n); else perIp.delete(ip);
    });
    ws.on('error', () => {});
  });

  const tick = setInterval(() => world.tick(), 1000 / TICK_HZ);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); }
  }, 15000);
  const stats = setInterval(() => {
    const now = performance.eventLoopUtilization(); busy = performance.eventLoopUtilization(now, elu).utilization; elu = now;   // share of time the server was busy
    const msg = JSON.stringify({ t: 'stats', online: world.players.size });
    for (const p of world.players.values()) if (p.ws.readyState === 1) p.ws.send(msg);
  }, 5000);

  return new Promise(resolve => {
    httpServer.listen(cfg.port, () => {
      const port = httpServer.address().port;
      cfg.log(`listening on :${port} (origins: ${cfg.origins.join(', ')})`);
      resolve({
        port, world,
        stats: () => ({ online: world.players.size, rooms: world.rooms.size, tickMs: world.lastTickMs, violations: violationsTotal }),
        close: () => new Promise(done => {
          clearInterval(tick); clearInterval(heartbeat); clearInterval(stats);
          for (const ws of wss.clients) ws.terminate();
          wss.close(); httpServer.close(() => done());
        }),
      });
    });
  });
}
