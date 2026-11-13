// Pixel FAST: scene manager, game loop, camera, input and HUD.
import './style.css';
import { clamp, mk, P } from './util.js';
import { person, ME, dress } from './sprites.js';
import { loadAvatar, openCreator } from './avatar.js';
import { buildCampus } from './campus.js';
import { buildInterior, BUILDINGS } from './interiors.js';
import { createNet } from './net.js';
import { DIRS, CHAT_RADIUS, CHAT_MAX, cleanLook } from '../../shared/protocol.js';

const $ = s => document.querySelector(s);
await document.fonts.load('8px Silkscreen');
await document.fonts.load('12px "Pixelify Sans"');

// ---------- scenes (built lazily, cached) ----------
const cache = new Map();
const getScene = key => {
  if (!cache.has(key)) cache.set(key, key === 'campus' ? buildCampus() : buildInterior(key));
  return cache.get(key);
};
let scene = getScene('campus'), sceneKey = 'campus';
const me = { x: 0, y: 0, tx: null, ty: null, dir: 'down', t: 0, stuck: 0, look: ME, name: '' };
[me.x, me.y] = scene.spawns.start;
let fade = 0, armed = true, menuOpen = false, creatorOpen = false;

function go(key, spawn) {
  const s = getScene(key);
  if (!s) return;
  scene = s; sceneKey = key;
  [me.x, me.y] = s.spawns[spawn] || s.spawns.lift || s.spawns.start || [s.W / 2, s.H / 2];
  me.tx = null; me.dir = 'down'; fade = 1; armed = false; lastNear = undefined;
  net.setScene(key, me.x, me.y);
  syncHud();
}

// ---------- canvas, camera, input ----------
const cv = $('#c'), ctx = cv.getContext('2d');
let dpr = 1, zoom = 3, zoomT = 3, camX = 0, camY = 0;
const minZoom = () => Math.max(cv.width / scene.W, cv.height / scene.H) / dpr;   // fully zoomed out = the whole map, never the void around it
const scale = () => zoom * dpr;
const resize = () => { dpr = devicePixelRatio || 1; cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); };
addEventListener('resize', resize); resize();
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || menuOpen || creatorOpen) { if (e.key === 'Escape' && menuOpen) closeMenu(); return; }
  if (e.key === 'Enter' && net.state === 'online') { e.preventDefault(); chatInput.focus(); return; }
  const k = e.key.toLowerCase(); keys.add(k);
  if (k === 'n' && scene.outdoor) toggleNight();
  if (k === '+' || k === '=') zoomT *= 1.25;
  if (k === '-') zoomT /= 1.25;
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
cv.addEventListener('wheel', e => { e.preventDefault(); zoomT *= Math.exp(-clamp(e.deltaY, -120, 120) * 0.0018); }, { passive: false });
cv.addEventListener('click', e => { const s = scale(); me.tx = camX + e.clientX * dpr / s; me.ty = camY + e.clientY * dpr / s; me.stuck = 0; });

// ---------- HUD ----------
const pkHour = () => +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' }).format(new Date());
let night = pkHour() < 6 || pkHour() >= 18, nightT = night ? 1 : 0;
const nightBtn = $('#nightBtn'), floorsBtn = $('#floorsBtn'), exitBtn = $('#exitBtn');
function toggleNight() { night = !night; nightBtn.textContent = night ? 'Day' : 'Night'; }
nightBtn.textContent = night ? 'Day' : 'Night';
nightBtn.onclick = () => { toggleNight(); nightBtn.blur(); };
const clock = $('#clock'), tick = () => { clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' }).format(new Date()) + ' PKT'; };
tick(); setInterval(tick, 10000);

function syncHud() {
  $('#title b').textContent = scene.title; $('#title span').textContent = scene.sub;
  nightBtn.classList.toggle('hidden', !scene.outdoor);
  floorsBtn.classList.toggle('hidden', !scene.building);
  exitBtn.classList.toggle('hidden', scene.outdoor);
  $('#mini').classList.toggle('hidden', !scene.minimap);
  $('#hint').textContent = scene.outdoor ? 'WASD / arrows or click to walk · Shift run · scroll zoom · N night · walk into a door to enter'
    : 'Walk into doors to enter rooms · Lift for other floors · Esc closes menus';
}
floorsBtn.onclick = () => { floorsBtn.blur(); openMenu(scene.building); };
exitBtn.onclick = () => { exitBtn.blur(); const b = scene.building; go('campus', b ? BUILDINGS[b].door : 'start'); };

// ---------- multiplayer + proximity chat ----------
// VITE_WS_URL (e.g. wss://pixel-fast.fly.dev/ws) points the client at the server; without it the game runs solo.
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? `ws://${location.hostname}:8787/ws` : '');
const netEl = $('#net'), chatEl = $('#chat'), chatLog = $('#chatLog'), chatInput = $('#chatInput'), chatHint = $('#chatHint');
const net = createNet(WS_URL, {
  onStatus(state, online) {
    netEl.dataset.state = state;
    netEl.textContent = state === 'online' ? `${online} online` : state === 'connecting' ? 'Connecting…' : state === 'outdated' ? 'New version - refresh' : WS_URL ? 'Reconnecting…' : 'Solo mode';
    chatInput.disabled = state !== 'online';
    chatInput.placeholder = state === 'online' ? 'Say something to people near you…' : WS_URL ? 'Chat is reconnecting…' : 'Chat needs the multiplayer server';
  },
  onChat: addChat,
});
function addChat({ name, text, self, system }) {
  const line = document.createElement('div');
  line.className = system ? 'sys' : self ? 'me' : '';
  if (!system) { const b = document.createElement('b'); b.textContent = name + ': '; line.append(b); }
  line.append(document.createTextNode(text));               // text only, never HTML
  chatLog.append(line);
  while (chatLog.childElementCount > 40) chatLog.firstElementChild.remove();
  chatLog.scrollTop = chatLog.scrollHeight;
  if (self) me.bubble = { text, until: performance.now() + 6000 };
}
chatInput.maxLength = CHAT_MAX;
const sendChat = () => { if (net.chat(chatInput.value)) chatInput.value = ''; };
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
  if (e.key === 'Escape') chatInput.blur();
  e.stopPropagation();
});
$('#chatSend').onclick = sendChat;
chatEl.classList.toggle('hidden', !WS_URL);
netEl.dataset.state = 'offline';
netEl.textContent = WS_URL ? 'Connecting…' : 'Solo mode';
chatInput.disabled = true;

// speech bubble in screen space; (X, Y) = just above the head
function bubble(text, X, Y) {
  const f = Math.round(11 * dpr), lh = Math.round(13 * dpr), maxW = 170 * dpr, pad = 6 * dpr;
  ctx.font = `${f}px "Pixelify Sans", monospace`;
  const lines = [];
  let cur = '';
  for (const w of text.split(' ')) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  lines.push(cur);
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].slice(0, -1) + '…'; }
  const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width))) + pad * 2, h = lines.length * lh + pad;
  const bx = Math.round(X - w / 2), by = Math.round(Y - h - 8 * dpr);
  ctx.fillStyle = '#1a1620'; ctx.fillRect(bx - 2 * dpr, by - 2 * dpr, w + 4 * dpr, h + 4 * dpr); ctx.fillRect(X - 4 * dpr, by + h, 8 * dpr, 5 * dpr);
  ctx.fillStyle = '#fbf3dc'; ctx.fillRect(bx, by, w, h); ctx.fillRect(X - 2 * dpr, by + h, 4 * dpr, 3 * dpr);
  ctx.fillStyle = '#2a2433'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, X, by + pad / 2 + i * lh));
  ctx.textBaseline = 'middle';
}

// floor menu
const menu = $('#menu');
function openMenu(b) {
  const info = BUILDINGS[b]; if (!info) return;
  menuOpen = true; keys.clear(); me.tx = null;
  menu.querySelector('h2').textContent = info.name;
  const list = menu.querySelector('.floors'); list.replaceChildren();
  for (const [f, label] of [...info.floors].reverse()) {
    const btn = document.createElement('button');
    btn.className = 'panel floor'; btn.innerHTML = '<b></b><span></span>';
    btn.firstChild.textContent = f; btn.lastChild.textContent = label;
    if (sceneKey === `${b}:${f}`) btn.classList.add('here');
    btn.onclick = () => { closeMenu(); if (sceneKey !== `${b}:${f}`) go(`${b}:${f}`, 'lift'); };
    list.append(btn);
  }
  $('#menuExit').classList.toggle('hidden', scene.outdoor);
  $('#menuExit').onclick = () => { closeMenu(); go('campus', info.door); };
  menu.classList.remove('hidden');
  list.querySelector('button')?.focus();
}
function closeMenu() { menuOpen = false; menu.classList.add('hidden'); armed = false; }
$('#menuClose').onclick = closeMenu;

// go-to list (campus places + a few indoor favourites)
const gotoSel = $('#goto'), campus = getScene('campus');
const GOTO = [
  ...campus.places.filter((p, i, a) => a.findIndex(q => q.n === p.n) === i).map(p => ({ n: p.n, key: 'campus', pos: [p.X, p.Y] })),
  { n: 'Cafe (C Block B1)', key: 'C:B1', spawn: 'west' }, { n: 'Library (C Block G)', key: 'C:G', spawn: 'exit' },
];
GOTO.forEach((p, i) => { const o = document.createElement('option'); o.value = i; o.textContent = p.n; gotoSel.append(o); });
gotoSel.onchange = () => {
  const p = GOTO[+gotoSel.value];
  if (p) {
    if (p.key !== 'campus') go(p.key, p.spawn);
    else { if (sceneKey !== 'campus') go('campus', 'start'); [me.x, me.y] = nearestFree(scene, ...p.pos); fade = 1; armed = false; }
  }
  gotoSel.value = ''; gotoSel.blur();
};
function nearestFree(s, x, y) {
  for (let r = 0; r < 160; r += 2) for (let a = 0; a < 16; a++) { const xx = x + Math.cos(a * Math.PI / 8) * r, yy = y + Math.sin(a * Math.PI / 8) * r; if (s.free(xx, yy)) return [xx, yy]; }
  return [x, y];
}

// minimap (campus only)
const mini = $('#mini'), MW = 440, MH = Math.round(MW * campus.H / campus.W);
mini.width = MW; mini.height = MH;
const mctx = mini.getContext('2d');
mini.addEventListener('click', e => { if (scene !== campus) return; const r = mini.getBoundingClientRect(); [me.x, me.y] = nearestFree(campus, (e.clientX - r.left) / r.width * campus.W, (e.clientY - r.top) / r.height * campus.H); me.tx = null; });
const nearEl = $('#near'); let lastNear;

// ---------- frame ----------
const dark = mk(8, 8), dg = dark.getContext('2d');
const inRect = (t, x, y) => x >= t.x0 && x < t.x1 && y >= t.y0 && y < t.y1;
function frame() {
  // movement
  let vx = 0, vy = 0;
  if (!menuOpen && !creatorOpen) {
    if (keys.has('arrowleft') || keys.has('a')) vx--;
    if (keys.has('arrowright') || keys.has('d')) vx++;
    if (keys.has('arrowup') || keys.has('w')) vy--;
    if (keys.has('arrowdown') || keys.has('s')) vy++;
    if (vx || vy) me.tx = null;
    else if (me.tx !== null) { const dx = me.tx - me.x, dy = me.ty - me.y, d = Math.hypot(dx, dy); if (d < 1.5 || me.stuck > 25) me.tx = null; else { vx = dx / d; vy = dy / d; } }
  }
  const moving = !!(vx || vy);
  if (moving) {
    const sp = (keys.has('shift') ? 2.4 : 1.2) / Math.hypot(vx, vy), ox = me.x, oy = me.y;
    if (scene.free(me.x + vx * sp, me.y)) me.x += vx * sp;
    if (scene.free(me.x, me.y + vy * sp)) me.y += vy * sp;
    me.stuck = Math.abs(me.x - ox) + Math.abs(me.y - oy) < 0.2 ? me.stuck + 1 : 0;
    me.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up'); me.t++;
  }
  // doors: a trigger fires once you walk into it; it re-arms after you have stopped outside all triggers
  const hit = scene.triggers.find(t => inRect(t, me.x, me.y));
  if (!hit && !moving) armed = true;
  if (hit && armed && !menuOpen && !creatorOpen) {
    armed = false;
    if (hit.act.type === 'menu') openMenu(hit.act.building); else go(hit.act.to, hit.act.spawn);
  }
  net.update(me.x, me.y, me.dir, moving); net.step();
  scene.step();
  nightT += ((night ? 1 : 0) - nightT) * 0.06;
  const isN = scene.outdoor && nightT > 0.5;

  // camera: smooth zoom, clamped so the map always fills the screen
  const mn = minZoom();
  zoomT = clamp(zoomT, mn, Math.max(mn, 8)); zoom += (zoomT - zoom) * 0.2;
  if (Math.abs(zoomT - zoom) < 0.002) zoom = zoomT; if (zoom < mn) zoom = mn;
  const s = scale(), vw = cv.width / s, vh = cv.height / s, W = scene.W, H = scene.H;
  camX = vw >= W ? (W - vw) / 2 : clamp(me.x - vw / 2, 0, W - vw);
  camY = vh >= H ? (H - vh) / 2 : clamp(me.y - 8 - vh / 2, 0, H - vh);
  camX = Math.round(camX * s) / s; camY = Math.round(camY * s) / s;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = scene.outdoor ? '#3d6b34' : '#14101a'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s); ctx.imageSmoothingEnabled = false;
  const sx = Math.max(0, Math.floor(camX)), sy = Math.max(0, Math.floor(camY));
  const sw = Math.min(W - sx, Math.ceil(vw) + 2), sh = Math.min(H - sy, Math.ceil(vh) + 2);
  ctx.drawImage(scene.bg, sx, sy, sw, sh, sx, sy, sw, sh);

  // y-sorted entities in view
  const L = camX - 70, R = camX + vw + 70, T = camY - 10, B = camY + vh + 110, list = [];
  for (const e of scene.ents) if (e.x > L && e.x < R && e.y > T && e.y < B) list.push(e);
  for (const r of net.remotes.values()) if (Number.isFinite(r.x) && r.x > L && r.x < R && r.y > T && r.y < B)
    list.push({ x: r.x, y: r.y, draw: c => person(c, r.x, r.y, DIRS[r.d], r.m ? Math.floor(r.t / 7) % 4 : 0, r.look) });
  const meEnt = { x: me.x, y: me.y, draw: c => person(c, me.x, me.y, me.dir, moving ? Math.floor(me.t / 7) % 4 : 0, me.look) };
  list.push(meEnt);
  list.sort((a, b) => a.y - b.y);
  // things standing behind a building (their feet are under its roof/walls) are drawn first, then the building over them
  const hiddenSet = scene.behind ? new Set(list.filter(e => scene.behind(e.x, e.y))) : null;
  if (hiddenSet && hiddenSet.size) {
    for (const e of list) if (hiddenSet.has(e)) e.draw(ctx, isN);
    ctx.drawImage(scene.occ, sx, sy, sw, sh, sx, sy, sw, sh);
  }
  for (const e of list) if (!hiddenSet || !hiddenSet.has(e)) e.draw(ctx, isN);
  const X = Math.round(me.x), Y = Math.round(me.y), bob = Math.floor(performance.now() / 300) % 2;
  P(ctx, '#1a1620', X - 3, Y - 26 + bob, 7, 4); P(ctx, '#5fd3a4', X - 2, Y - 25 + bob, 5, 2); P(ctx, '#5fd3a4', X - 1, Y - 23 + bob, 3, 1);
  if (scene.over) ctx.drawImage(scene.over, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.globalAlpha = 0.35; meEnt.draw(ctx); ctx.globalAlpha = 1;          // see yourself behind trees / under canopies

  // night (outdoors only)
  if (scene.outdoor && nightT > 0.02) {
    const w = Math.ceil(vw) + 2, h = Math.ceil(vh) + 2, fx = Math.floor(camX), fy = Math.floor(camY);
    if (dark.width !== w || dark.height !== h) { dark.width = w; dark.height = h; }
    dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, w, h);
    dg.fillStyle = `rgba(14,18,48,${0.68 * nightT})`; dg.fillRect(0, 0, w, h);
    dg.globalCompositeOperation = 'destination-out';
    const glow = list.filter(e => e.light).map(e => e.light());
    for (const [x, y, r] of glow) { const gr = dg.createRadialGradient(x - fx, y - fy, 0, x - fx, y - fy, r); gr.addColorStop(0, 'rgba(0,0,0,.92)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); dg.fillStyle = gr; dg.fillRect(x - fx - r, y - fy - r, r * 2, r * 2); }
    ctx.drawImage(dark, fx, fy);
    if (isN && scene.emit) ctx.drawImage(scene.emit, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of glow) { const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 0.7); gr.addColorStop(0, `rgba(255,196,120,${0.22 * nightT})`); gr.addColorStop(1, 'rgba(255,196,120,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    ctx.globalCompositeOperation = 'source-over';
  }

  // labels (screen space)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fs = Math.round(12 * dpr);
  ctx.font = `${fs}px "Pixelify Sans", monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (const l of scene.labels) {
    if (l.X < camX || l.X > camX + vw || l.Y < camY || l.Y > camY + vh) continue;
    const LX = Math.round((l.X - camX) * s), LY = Math.round((l.Y - camY) * s), tw = ctx.measureText(l.t).width + 14 * dpr, th = fs + 8 * dpr;
    ctx.fillStyle = '#1a1620'; ctx.fillRect(LX - tw / 2 - 2 * dpr, LY - th / 2 - 2 * dpr, tw + 4 * dpr, th + 4 * dpr);
    ctx.fillStyle = '#fbf3dc'; ctx.fillRect(LX - tw / 2, LY - th / 2, tw, th);
    ctx.fillStyle = '#2a2433'; ctx.fillText(l.t, LX, LY);
  }
  const tag = (name, x, y, col) => {                     // name tag over a student
    const NX = Math.round((x - camX) * s), NY = Math.round((y - 31 - camY) * s), tw = ctx.measureText(name).width + 10 * dpr, th = fs + 6 * dpr;
    ctx.fillStyle = 'rgba(16,19,31,.85)'; ctx.fillRect(NX - tw / 2, NY - th / 2, tw, th); ctx.fillStyle = col; ctx.fillText(name, NX, NY);
  };
  const now = performance.now(), bubbles = [];
  let hearers = 0;
  for (const r of net.remotes.values()) {
    if (!Number.isFinite(r.x)) continue;
    if (Math.hypot(r.x - me.x, r.y - me.y) <= CHAT_RADIUS) hearers++;
    if (r.x < camX - 20 || r.x > camX + vw + 20 || r.y < camY || r.y > camY + vh + 40) continue;
    tag(r.name, r.x, r.y, '#fbf3dc');
    if (r.bubble) bubbles.push([r.bubble.text, r.x, r.y]);
  }
  if (me.name) tag(me.name, me.x, me.y, '#5fd3a4');
  if (me.bubble && now < me.bubble.until) bubbles.push([me.bubble.text, me.x, me.y]); else me.bubble = null;
  for (const [t, x, y] of bubbles) bubble(t, Math.round((x - camX) * s), Math.round((y - 38 - camY) * s));
  ctx.font = `${fs}px "Pixelify Sans", monospace`;
  if (net.state === 'online') {
    const msg = hearers ? `${hearers} ${hearers === 1 ? 'person' : 'people'} close enough to hear you` : 'Nobody is close enough to hear you - walk up to someone';
    if (chatHint.textContent !== msg) chatHint.textContent = msg;
  } else if (chatHint.textContent) chatHint.textContent = '';
  // "near" card
  let best = null, bd = 40;
  for (const p of scene.places) { const d = Math.hypot(p.X - me.x, p.Y - me.y); if (d < bd) { bd = d; best = p; } }
  if (best !== lastNear) {
    lastNear = best; nearEl.classList.toggle('hidden', !best);
    if (best) { nearEl.innerHTML = '<b></b><small></small>'; nearEl.firstChild.textContent = best.n; nearEl.lastChild.textContent = best.sub; }
  }
  // minimap
  if (scene.minimap) {
    const k = MW / W;
    mctx.drawImage(scene.bg, 0, 0, MW, MH);
    mctx.strokeStyle = '#5fd3a4'; mctx.lineWidth = 2; mctx.strokeRect(camX * k, camY * k, vw * k, vh * k);
    mctx.fillStyle = '#0a0c14'; mctx.fillRect(me.x * k - 5, me.y * k - 5, 10, 10);
    mctx.fillStyle = '#5fd3a4'; mctx.fillRect(me.x * k - 3, me.y * k - 3, 6, 6);
  }
  if (fade > 0) { ctx.fillStyle = `rgba(10,8,16,${fade})`; ctx.fillRect(0, 0, cv.width, cv.height); fade = Math.max(0, fade - 0.05); }
  requestAnimationFrame(frame);
}
// ---------- avatar ----------
const meBtn = $('#meBtn'), meCv = meBtn.querySelector('canvas'), meG = meCv.getContext('2d');
function setAvatar(look, name) {
  me.look = look; me.name = name; meBtn.querySelector('span').textContent = name;
  if (net.state === 'online') net.setProfile(name, cleanLook(look));
  net.start({ name, look: cleanLook(look), scene: sceneKey, x: me.x, y: me.y });   // no-op after the first call
  meG.clearRect(0, 0, meCv.width, meCv.height); person(meG, 8, 23, 'down', 0, look);
}
const avatarDone = (look, name) => { setAvatar(look, name); creatorOpen = false; fade = 0.6; };
function editAvatar() { creatorOpen = true; keys.clear(); me.tx = null; openCreator(loadAvatar(), avatarDone); }
meBtn.onclick = () => { meBtn.blur(); editAvatar(); };
const saved = loadAvatar();
if (saved) setAvatar(dress(saved), saved.name); else editAvatar();
syncHud();
if (import.meta.env.DEV) window.__pf = { go, openMenu, me, net, get key() { return sceneKey; }, get zoom() { return [zoom, zoomT, minZoom(), dpr, cv.width]; } };   // dev-only test hook, stripped from builds
$('#loading').remove();
frame();
