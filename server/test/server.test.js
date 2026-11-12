import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { startServer } from '../src/server.js';
import { moderate } from '../src/filter.js';
import { isValidScene, cleanLook, cleanName, cleanChat, DEFAULT_LOOK, PROTOCOL_VERSION, CHAT_MAX } from '../../shared/protocol.js';

const ORIGIN = 'http://localhost:5173';
let srv;
before(async () => { srv = await startServer({ port: 0, origins: [ORIGIN], maxPerIp: 50, log: () => {} }); });
after(async () => { await srv.close(); });

// ---------- helpers ----------
function client(origin = ORIGIN, path = '/ws') {
  const ws = new WebSocket(`ws://127.0.0.1:${srv.port}${path}`, { headers: { origin } });
  const msgs = [];
  ws.on('message', d => msgs.push(JSON.parse(d.toString())));
  const c = {
    ws, msgs,
    open: () => new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); ws.once('unexpected-response', (_, r) => rej(new Error('HTTP ' + r.statusCode))); }),
    send: o => ws.send(JSON.stringify(o)),
    waitFor: (pred, ms = 1500) => new Promise((res, rej) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const hit = msgs.find(pred);
        if (hit) { clearInterval(iv); res(hit); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout waiting for message')); }
      }, 20);
    }),
    close: () => ws.close(),
  };
  return c;
}
async function join(name, scene, x, y, look = DEFAULT_LOOK) {
  const c = client(); await c.open();
  c.send({ t: 'hello', v: PROTOCOL_VERSION, name, look, scene, x, y });
  c.id = (await c.waitFor(m => m.t === 'welcome')).id;
  return c;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const seenIds = c => new Set(c.msgs.filter(m => m.t === 'snap' && m.pos).flatMap(m => m.pos.filter((_, i) => i % 5 === 0)));

// ---------- shared validation ----------
test('scene keys: only real floors and rooms are accepted', () => {
  for (const k of ['campus', 'C:B1', 'C:G', 'C:5', 'C:1:12', 'D:B1', 'A:3:1', 'B:G:7']) assert.equal(isValidScene(k), true, k);
  for (const k of ['A:4', 'A:B1', 'C:G:1', 'C:B1:3', 'C:1:13', 'C:1:0', 'C:1:01', 'E:1', '', null, 'campus ', '__proto__', 'C:1:1:1']) assert.equal(isValidScene(k), false, String(k));
});
test('looks: unknown fields and values fall back to defaults', () => {
  const l = cleanLook({ skin: 'red', top: '#b8323a', evil: '<script>', glasses: 'yes', bag: null });
  assert.equal(l.skin, DEFAULT_LOOK.skin); assert.equal(l.top, '#b8323a'); assert.equal(l.glasses, false); assert.equal(l.bag, null);
  assert.equal('evil' in l, false);
  assert.deepEqual(cleanLook('nope'), { ...DEFAULT_LOOK });
});
test('names and chat are sanitised', () => {
  assert.equal(cleanName('<script>alert(1)</script>'), 'scriptalert1script');
  assert.equal(cleanName('  Ali‮ Khan  '), 'Ali Khan');
  assert.equal(cleanName('عائشہ'), 'عائشہ');
  assert.equal(cleanName(''), 'Student');
  assert.equal(cleanName('x'.repeat(50)).length, 18);
  assert.equal(cleanChat('hi\u0000​there\n\n  you'), 'hithere you');
  assert.equal(cleanChat('a'.repeat(500)).length, CHAT_MAX);
});
test('profanity is masked, normal words are not', () => {
  assert.deepEqual(moderate('you are a b1tch'), { text: 'you are a *****', flagged: true });
  assert.equal(moderate('chutiyaaa yaar').text, '********* yaar');
  assert.equal(moderate('class at 10 in C101').flagged, false);
});

// ---------- server ----------
test('rejects other origins and unknown paths', async () => {
  await assert.rejects(client('https://evil.example').open(), /403/);
  await assert.rejects(client(ORIGIN, '/nope').open(), /404/);
});

test('players only see people near them, in the same scene', async () => {
  const a = await join('Ali', 'campus', 100, 100);
  const b = await join('Bilal', 'campus', 150, 100);       // near
  const c = await join('Chand', 'campus', 1000, 700);      // far
  const e = await join('Esha', 'C:B1', 100, 100);          // same spot, different scene
  await sleep(350);
  const seen = seenIds(a);
  assert.equal(seen.has(b.id), true, 'sees nearby player');
  assert.equal(seen.has(c.id), false, 'does not see far player');
  assert.equal(seen.has(e.id), false, 'does not see other scene');
  const prof = a.msgs.filter(m => m.prof).flatMap(m => m.prof).find(p => p[0] === b.id);
  assert.equal(prof[1], 'Bilal');
  for (const x of [a, b, c, e]) x.close();
});

test('chat only reaches people within chat range', async () => {
  const a = await join('Ayesha', 'campus', 400, 300);
  const near = await join('Near', 'campus', 450, 300);     // 50 px away -> hears
  const mid = await join('Mid', 'campus', 650, 300);       // 250 px: visible but too far to hear
  const other = await join('Other', 'C:1', 400, 300);      // other scene
  await sleep(150);
  a.send({ t: 'chat', text: 'salaam everyone' });
  const got = await near.waitFor(m => m.t === 'chat');
  assert.equal(got.text, 'salaam everyone'); assert.equal(got.id, a.id); assert.equal(got.name, 'Ayesha');
  await a.waitFor(m => m.t === 'chat');                    // sender gets the echo
  await sleep(200);
  assert.equal(mid.msgs.some(m => m.t === 'chat'), false, 'out of range');
  assert.equal(other.msgs.some(m => m.t === 'chat'), false, 'other scene');
  for (const x of [a, near, mid, other]) x.close();
});

test('leaving a scene sends "gone" to people who could see you', async () => {
  const a = await join('A', 'campus', 700, 200);
  const b = await join('B', 'campus', 720, 200);
  await sleep(300);
  assert.equal(seenIds(a).has(b.id), true);
  b.send({ t: 'scene', scene: 'C:B1', x: 50, y: 60 });
  const g = await a.waitFor(m => m.t === 'snap' && m.gone && m.gone.includes(b.id));
  assert.ok(g);
  a.close(); b.close();
});

test('untrusted profile data is cleaned before others see it', async () => {
  const a = await join('Viewer', 'campus', 300, 600);
  const b = client(); await b.open();
  b.send({ t: 'hello', v: PROTOCOL_VERSION, name: '<img src=x onerror=alert(1)>', look: { skin: 'url(javascript:1)', hairStyle: 'mohawk' }, scene: 'campus', x: 320, y: 600 });
  const bid = (await b.waitFor(m => m.t === 'welcome')).id;
  const snap = await a.waitFor(m => m.prof && m.prof.some(p => p[0] === bid));
  const [, name, look] = snap.prof.find(p => p[0] === bid);
  assert.equal(name, 'img srcx onerroral');                // tags stripped, then cut to 18 characters
  assert.equal(look.skin, DEFAULT_LOOK.skin); assert.equal(look.hairStyle, DEFAULT_LOOK.hairStyle);
  a.close(); b.close();
});

test('chat is rate limited', async () => {
  const a = await join('Spam', 'campus', 900, 100);
  for (let i = 0; i < 6; i++) a.send({ t: 'chat', text: 'msg ' + i });
  await a.waitFor(m => m.t === 'err' && m.code === 'slow');
  await sleep(100);
  assert.ok(a.msgs.filter(m => m.t === 'chat').length <= 3);
  a.close();
});

test('bad input is rejected: wrong version, oversize, garbage', async () => {
  const v = client(); await v.open();
  v.send({ t: 'hello', v: 999 });
  await v.waitFor(m => m.t === 'err' && m.code === 'version');
  const big = client(); await big.open();
  const closed = new Promise(r => big.ws.on('close', code => r(code)));
  big.ws.send('x'.repeat(5000));
  assert.equal(await closed, 1009);                        // message too big
  const g = await join('G', 'campus', 10, 10);
  g.send({ t: 'move', x: 'NaN', y: -5 }); g.send({ t: 'scene', scene: 'Z:9', x: 1, y: 1 }); g.ws.send('not json');
  await sleep(100);
  assert.equal(g.ws.readyState, WebSocket.OPEN, 'a few bad messages are tolerated');
  assert.ok(srv.stats().violations >= 3);
  g.close();
});

test('health endpoint reports status', async () => {
  const r = await fetch(`http://127.0.0.1:${srv.port}/health`);
  const j = await r.json();
  assert.equal(j.ok, true); assert.equal(typeof j.online, 'number');
});
