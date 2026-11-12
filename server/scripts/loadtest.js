// Load test: N bots walk around (10 updates/s) and chat, spread over the campus and a few floors.
// Usage: start the server with MAX_PER_IP raised, then `N=500 SECS=20 npm run load`.
import WebSocket from 'ws';

const URL = process.env.URL || 'ws://127.0.0.1:8787/ws';
const HEALTH = URL.replace(/^ws/, 'http').replace(/\/ws$/, '/health');
const N = Number(process.env.N) || 500, SECS = Number(process.env.SECS) || 20;
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';
const SCENES = [['campus', 1146, 742, 0.7], ['C:B1', 560, 300, 0.1], ['C:G', 480, 280, 0.05], ['C:3', 900, 200, 0.1], ['D:2:4', 320, 230, 0.05]];
// SPREAD=real: 40% outdoors, the rest spread over the cafe, library, corridors and classrooms (like a real day)
const REAL = process.env.SPREAD === 'real';
const pickScene = () => {
  if (REAL && Math.random() > 0.4) {
    const r = Math.random(), b = 'ABCD'[(Math.random() * 4) | 0], f = String(1 + ((Math.random() * 3) | 0));
    if (r < 0.15) return ['C:B1', 560, 300]; if (r < 0.25) return ['C:G', 480, 280];
    if (r < 0.55) return [`${b}:${f}`, 900, 200];
    return [`${b}:${f}:${1 + ((Math.random() * 12) | 0)}`, 320, 230];
  }
  let r = Math.random(); for (const s of SCENES) { if ((r -= s[3]) <= 0) return s; } return SCENES[0];
};

let open = 0, failed = 0, msgs = 0, bytes = 0, chats = 0;
const bots = [];
for (let i = 0; i < N; i++) {
  await new Promise(r => setTimeout(r, 4));
  const [scene, W, H] = pickScene();
  const b = { x: Math.random() * W, y: Math.random() * H, W, H };
  const ws = new WebSocket(URL, { headers: { origin: ORIGIN } });
  ws.on('open', () => {
    open++;
    ws.send(JSON.stringify({ t: 'hello', v: 1, name: 'Bot ' + i, look: {}, scene, x: b.x, y: b.y }));
    b.iv = setInterval(() => {
      b.x = Math.min(b.W - 1, Math.max(1, b.x + (Math.random() - 0.5) * 14));
      b.y = Math.min(b.H - 1, Math.max(1, b.y + (Math.random() - 0.5) * 14));
      ws.send(JSON.stringify({ t: 'move', x: b.x, y: b.y, d: (Math.random() * 4) | 0, m: 1 }));
      if (Math.random() < 0.01) ws.send(JSON.stringify({ t: 'chat', text: 'hello from bot ' + i }));
    }, 100);
  });
  ws.on('message', d => { msgs++; bytes += d.length; if (d.includes('"t":"chat"')) chats++; });
  ws.on('error', () => { failed++; });
  ws.on('close', () => clearInterval(b.iv));
  bots.push(ws);
}
console.log(`connecting ${N} bots...`);
const ticks = [];
const poll = setInterval(async () => { try { const j = await (await fetch(HEALTH)).json(); ticks.push(j.tickMs); } catch { /* ignore */ } }, 1000);
const t0 = Date.now(); msgs = 0; bytes = 0; chats = 0;
await new Promise(r => setTimeout(r, SECS * 1000));
clearInterval(poll);
const secs = (Date.now() - t0) / 1000;
const h = await (await fetch(HEALTH)).json();
console.log(JSON.stringify({
  bots: N, connected: open, failed, serverOnline: h.online,
  perBot: { msgsPerSec: +(msgs / secs / open).toFixed(1), kbPerSec: +(bytes / secs / open / 1024).toFixed(2) },
  chatsDelivered: chats,
  serverTickMs: { avg: +(ticks.reduce((a, b) => a + b, 0) / ticks.length).toFixed(2), max: Math.max(...ticks), budget: 100 },
}, null, 2));
for (const ws of bots) ws.terminate();
process.exit(0);
