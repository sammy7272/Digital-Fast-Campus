// Multiplayer client: connection, reconnect with backoff, snapshot handling, smoothing, chat.
// Everything received is validated again here before it is drawn (never trust the wire).
import { PROTOCOL_VERSION, SEND_HZ, DIRS, cleanLook, cleanName, cleanChat, validCoord } from '../../shared/protocol.js';
import { dress } from './sprites.js';

export function createNet(url, { onStatus = () => {}, onChat = () => {} } = {}) {
  const remotes = new Map();                   // id -> { name, look, x, y, tx, ty, d, m, t, bubble }
  let ws = null, myId = null, retry = 0, retryTimer = 0, started = false, state = 'offline', online = 0;
  let me = { name: 'Student', look: null, scene: 'campus', x: 0, y: 0 };
  let lastSent = '', lastSentAt = 0;

  const setState = s => { state = s; onStatus(state, online); };
  const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const remote = id => {
    let r = remotes.get(id);
    if (!r) remotes.set(id, (r = { name: 'Student', look: dress(cleanLook(null)), x: NaN, y: NaN, tx: 0, ty: 0, d: 0, m: 0, t: 0, bubble: null }));
    return r;
  };

  function connect() {
    if (!url || !started) return;
    clearTimeout(retryTimer);
    setState('connecting');
    try { ws = new WebSocket(url); } catch { return scheduleRetry(); }
    ws.onopen = () => { retry = 0; send({ t: 'hello', v: PROTOCOL_VERSION, name: me.name, look: me.look, scene: me.scene, x: me.x, y: me.y }); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } handle(m); };
    ws.onclose = e => {
      ws = null; myId = null; remotes.clear();
      if (e.code === 4000) { setState('outdated'); return; }        // protocol changed: needs a page refresh
      setState('offline'); scheduleRetry();
    };
    ws.onerror = () => {};
  }
  function scheduleRetry() {
    const wait = Math.min(15000, 1000 * 2 ** retry++) * (0.75 + Math.random() * 0.5);
    retryTimer = setTimeout(connect, wait);
  }
  function handle(m) {
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'welcome': myId = typeof m.id === 'string' ? m.id : null; online = m.online | 0; lastSent = ''; setState('online'); break;
      case 'stats': online = m.online | 0; onStatus(state, online); break;
      case 'snap': {
        if (m.s !== me.scene) return;                               // a late message from the scene we just left
        if (Array.isArray(m.prof)) for (const p of m.prof) {
          if (!Array.isArray(p) || typeof p[0] !== 'string' || p[0] === myId) continue;
          const r = remote(p[0]); r.name = cleanName(p[1]); r.look = dress(cleanLook(p[2]));
        }
        if (Array.isArray(m.pos)) for (let i = 0; i + 4 < m.pos.length; i += 5) {
          const [id, x, y, d, mv] = m.pos.slice(i, i + 5);
          if (typeof id !== 'string' || id === myId || !validCoord(x) || !validCoord(y)) continue;
          const r = remote(id);
          if (!Number.isFinite(r.x) || Math.hypot(x - r.x, y - r.y) > 120) { r.x = x; r.y = y; }   // first sight or teleport
          r.tx = x; r.ty = y; r.d = d >= 0 && d <= 3 ? d | 0 : 0; r.m = mv ? 1 : 0;
        }
        if (Array.isArray(m.gone)) for (const id of m.gone) remotes.delete(id);
        break;
      }
      case 'chat': {
        if (m.s !== me.scene) return;
        const text = cleanChat(m.text);
        if (!text) return;
        const self = m.id === myId, name = self ? me.name : cleanName(m.name);
        if (!self && remotes.has(m.id)) remotes.get(m.id).bubble = { text, until: performance.now() + 6000 };
        onChat({ name, text, self });
        break;
      }
      case 'err': if (m.code === 'slow') onChat({ system: true, text: 'Slow down a little - you are sending messages too fast.' }); break;
    }
  }

  return {
    remotes,
    get state() { return state; },
    get online() { return online; },
    get enabled() { return !!url; },
    start(profile) { me = { ...me, ...profile }; if (!started) { started = true; connect(); } },
    setProfile(name, look) { me.name = name; me.look = look; send({ t: 'look', name, look }); },
    setScene(scene, x, y) { me.scene = scene; me.x = x; me.y = y; remotes.clear(); lastSent = ''; send({ t: 'scene', scene, x: Math.round(x), y: Math.round(y) }); },
    // called every frame; sends at most SEND_HZ times a second and only when something changed
    update(x, y, dir, moving) {
      me.x = x; me.y = y;
      const now = performance.now();
      if (now - lastSentAt < 1000 / SEND_HZ || state !== 'online') return;
      const d = Math.max(0, DIRS.indexOf(dir)), key = `${Math.round(x)},${Math.round(y)},${d},${moving ? 1 : 0}`;
      if (key === lastSent) return;
      lastSent = key; lastSentAt = now;
      send({ t: 'move', x: Math.round(x), y: Math.round(y), d, m: moving ? 1 : 0 });
    },
    chat(text) { const t = cleanChat(text); if (t && state === 'online') { send({ t: 'chat', text: t }); return true; } return false; },
    // smooth other players toward their latest known position
    step() {
      for (const r of remotes.values()) {
        if (!Number.isFinite(r.x)) continue;
        r.x += (r.tx - r.x) * 0.25; r.y += (r.ty - r.y) * 0.25;
        if (r.m) r.t++;
        if (r.bubble && performance.now() > r.bubble.until) r.bubble = null;
      }
    },
  };
}
