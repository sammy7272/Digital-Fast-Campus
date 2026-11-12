// Rooms (one per scene), a spatial grid per room, and the snapshot tick.
// Each viewer only ever receives players within AOI_RADIUS in the same scene, and only when they changed.
import { AOI_RADIUS, CHAT_RADIUS } from '../../shared/protocol.js';

const CELL = 128;                                   // grid cell size (px); MAP_MAX 2048 -> 16x16 cells
const cellOf = (x, y) => ((x / CELL) | 0) * 32 + ((y / CELL) | 0);
const MAX_BUFFERED = 256 * 1024;                    // skip slow clients for a tick instead of queueing forever
const MAX_VISIBLE = 80;                             // in a crowd you receive only your nearest 80 people

export const canSend = p => p.ws.readyState === 1 && p.ws.bufferedAmount < MAX_BUFFERED;
export const send = (p, obj) => { if (canSend(p)) p.ws.send(JSON.stringify(obj)); };

class Room {
  constructor(key) { this.key = key; this.players = new Set(); this.cells = new Map(); }
  add(p) { this.players.add(p); p.cell = cellOf(p.x, p.y); this.bucket(p.cell).add(p); }
  remove(p) {
    this.players.delete(p);
    const s = this.cells.get(p.cell);
    if (s) { s.delete(p); if (!s.size) this.cells.delete(p.cell); }
  }
  bucket(c) { let s = this.cells.get(c); if (!s) this.cells.set(c, (s = new Set())); return s; }
  moved(p) {
    const c = cellOf(p.x, p.y);
    if (c === p.cell) return;
    const s = this.cells.get(p.cell);
    if (s) { s.delete(p); if (!s.size) this.cells.delete(p.cell); }
    p.cell = c; this.bucket(c).add(p);
  }
  // players (other than p) within r of p
  near(p, r) {
    const out = [], r2 = r * r;
    const x0 = Math.max(0, ((p.x - r) / CELL) | 0), x1 = ((p.x + r) / CELL) | 0;
    const y0 = Math.max(0, ((p.y - r) / CELL) | 0), y1 = ((p.y + r) / CELL) | 0;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const s = this.cells.get(cx * 32 + cy);
      if (s) for (const q of s) if (q !== p && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 <= r2) out.push(q);
    }
    return out;
  }
}

export class World {
  constructor() { this.rooms = new Map(); this.players = new Map(); this.lastTickMs = 0; }
  room(key) { let r = this.rooms.get(key); if (!r) this.rooms.set(key, (r = new Room(key))); return r; }
  join(p) { this.players.set(p.id, p); this.room(p.scene).add(p); }
  leave(p) {
    this.players.delete(p.id);
    const r = this.rooms.get(p.scene);
    if (r) { r.remove(p); if (!r.players.size) this.rooms.delete(p.scene); }
  }
  setScene(p, scene, x, y) {
    const old = this.rooms.get(p.scene);
    if (old) { old.remove(p); if (!old.players.size) this.rooms.delete(p.scene); }
    p.scene = scene; p.x = x; p.y = y; p.rev++;
    p.seen.clear(); p.profSeen.clear();
    this.room(scene).add(p);
  }
  move(p, x, y, d, m) {
    if (p.x === x && p.y === y && p.d === d && p.m === m) return;
    p.x = x; p.y = y; p.d = d; p.m = m; p.rev++;
    this.rooms.get(p.scene)?.moved(p);
  }
  // Chat reaches only people within CHAT_RADIUS in the same scene (and echoes to the sender).
  chat(p, text) {
    const r = this.rooms.get(p.scene);
    if (!r) return 0;
    const msg = { t: 'chat', s: p.scene, id: p.id, name: p.name, text };
    const hearers = r.near(p, CHAT_RADIUS);
    for (const q of hearers) send(q, msg);
    send(p, msg);
    return hearers.length;
  }
  tick() {
    const t0 = performance.now();
    for (const room of this.rooms.values()) {
      // encode each player's position once per tick; every viewer reuses the same string
      for (const q of room.players) if (q.segRev !== q.rev) { q.seg = `"${q.id}",${Math.round(q.x)},${Math.round(q.y)},${q.d},${q.m}`; q.segRev = q.rev; }
      const head = `{"t":"snap","s":${JSON.stringify(room.key)}`;
      for (const v of room.players) {
        if (!canSend(v)) continue;                 // state catches up next tick (seen maps untouched)
        let vis = room.near(v, AOI_RADIUS);
        if (vis.length > MAX_VISIBLE) {              // crowd: shrink the radius instead of sorting everyone
          for (let r = AOI_RADIUS * 0.75; vis.length > MAX_VISIBLE && r > 40; r *= 0.75) {
            const r2 = r * r;
            vis = vis.filter(q => (q.x - v.x) ** 2 + (q.y - v.y) ** 2 <= r2);
          }
          if (vis.length > MAX_VISIBLE) vis.length = MAX_VISIBLE;
        }
        const pos = [], now = new Set();
        let prof = null, gone = null;
        for (const q of vis) {
          now.add(q.id);
          if (v.profSeen.get(q.id) !== q.profRev) { (prof ||= []).push([q.id, q.name, q.look]); v.profSeen.set(q.id, q.profRev); }
          if (v.seen.get(q.id) !== q.rev) { pos.push(q.seg); v.seen.set(q.id, q.rev); }
        }
        for (const id of v.seen.keys()) if (!now.has(id)) { (gone ||= []).push(id); v.seen.delete(id); v.profSeen.delete(id); }
        if (!pos.length && !prof && !gone) continue;
        let msg = head;
        if (prof) msg += ',"prof":' + JSON.stringify(prof);
        if (pos.length) msg += ',"pos":[' + pos.join(',') + ']';
        if (gone) msg += ',"gone":' + JSON.stringify(gone);
        v.ws.send(msg + '}');
      }
    }
    this.lastTickMs = performance.now() - t0;
  }
}
