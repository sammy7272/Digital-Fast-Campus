// Building interiors. Every room is its own small scene, built lazily the first time you enter it.
// Scene keys: "C:B1" (cafe), "C:G" (library), "D:B1" (faculty parking), "<B>:<F>" (floor corridor),
// "<B>:<F>:<n>" (classroom n on that floor).
import { hash, hx, css, mk, P, OUTLINE, pixelText, feetFree } from './util.js';
import { look, person, carV, CARS } from './sprites.js';

const ORD = ['Ground floor', '1st floor', '2nd floor', '3rd floor', '4th floor', '5th floor'];
const levels = n => Array.from({ length: n }, (_, i) => [i ? String(i) : 'G', ORD[i]]);
export const BUILDINGS = {
  C: { name: 'C Block', door: 'C-main', floors: [['B1', 'Cafe (Blue & Red)'], ['G', 'Library'], ...levels(6).slice(1)] },
  D: { name: 'D Block', door: 'D-main', floors: [['B1', 'Faculty parking'], ...levels(6)] },
  B: { name: 'B Block', door: 'B-main', floors: levels(4) },
  A: { name: 'A Block', door: 'A-main', floors: levels(4) },
};
export const ROOMS_PER_FLOOR = 12;
const ROOMS_PER_SIDE = ROOMS_PER_FLOOR / 2;
// FAST numbering: block letter + floor digit + two-digit room, e.g. C101 = C Block, 1st floor, room 01 (ground floor = 0)
export const roomName = (b, f, n) => `${b}${f === 'G' ? 0 : f}${String(n).padStart(2, '0')}`;

// ---------- room toolkit ----------
function room(W, H, floor) {
  const cv = mk(W, H), g = cv.getContext('2d'), solid = new Uint8Array(W * H);
  const img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = floor(x, y), o = (y * W + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
  g.putImageData(img, 0, 0);
  const fillMask = v => (x, y, w, h) => { for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) solid.fill(v, j * W + Math.max(0, x), j * W + Math.min(W, x + w)); };
  const r = { W, H, cv, g, solid, block: fillMask(1), open: fillMask(0), ents: [], triggers: [], spawns: {}, places: [], labels: [] };
  // a y-sorted sprite: painted once into its own small canvas
  r.sprite = (x0, y0, w, h, by, paint) => { const s = mk(w, h); paint(s.getContext('2d')); r.ents.push({ x: x0 + w / 2, y: by, w, draw: c => c.drawImage(s, x0, y0) }); };
  r.trigger = (x0, y0, x1, y1, act) => r.triggers.push({ x0, y0, x1, y1, act });
  r.done = extra => ({ outdoor: false, minimap: false, bg: cv, over: null, emit: null, W, H, solid, ents: r.ents, triggers: r.triggers, spawns: r.spawns, places: r.places, labels: r.labels, free: (x, y) => feetFree(solid, W, H, x, y), step() {}, ...extra });
  return r;
}
// back wall (seen face-on), side walls and front wall (seen from above)
function walls(r, wh, wall, trim) {
  const { g, W, H } = r, w = hx(wall);
  P(g, '#3a3440', 0, 0, W, 4); P(g, wall, 0, 4, W, wh - 4); P(g, css(w, 1.04), 0, 4, W, 2);
  P(g, trim, 0, wh - 9, W, 7); P(g, css(hx(trim), 1.2), 0, wh - 9, W, 1); P(g, css(w, 0.7), 0, wh - 2, W, 2);
  P(g, '#3a3440', 0, 0, 6, H); P(g, '#3a3440', W - 6, 0, 6, H); P(g, '#3a3440', 0, H - 6, W, 6);
  P(g, '#5a5260', 6, wh, 1, H - wh - 6); P(g, '#5a5260', W - 7, wh, 1, H - wh - 6); P(g, '#5a5260', 6, H - 7, W - 12, 1);
  r.block(0, 0, W, wh); r.block(0, 0, 7, H); r.block(W - 7, 0, 7, H); r.block(0, H - 7, W, 7);
}
function lift(r, x, wh, building) {
  const { g } = r;
  P(g, OUTLINE, x - 1, wh - 31, 26, 30); P(g, '#8c949c', x, wh - 30, 24, 28); P(g, '#c4ccd4', x + 2, wh - 26, 9, 24); P(g, '#c4ccd4', x + 13, wh - 26, 9, 24);
  P(g, '#e8eef4', x + 3, wh - 26, 2, 24); P(g, '#e8eef4', x + 14, wh - 26, 2, 24); P(g, '#ff6a4a', x + 10, wh - 29, 4, 2);
  P(g, '#8c949c', x + 26, wh - 18, 3, 5); P(g, '#5fd3a4', x + 27, wh - 17, 1, 1);
  r.trigger(x, wh, x + 24, wh + 7, { type: 'menu', building });
  r.spawns.lift = [x + 12, wh + 20];
  r.places.push({ n: 'Lift / stairs', X: x + 12, Y: wh + 4, sub: 'Choose a floor' });
}
// a door in the front (bottom) wall that leads somewhere
function frontDoor(r, x, w, act, spawn, place) {
  const { g, H } = r;
  P(g, '#3a3440', x - 2, H - 7, w + 4, 7); P(g, '#8a6a4a', x, H - 7, w, 7); P(g, '#b08a5e', x, H - 7, w, 1); P(g, '#6a6258', x, H - 10, w, 3);
  r.open(x, H - 7, w, 7);
  r.trigger(x, H - 6, x + w, H, act);
  r.spawns[spawn] = [x + w / 2, H - 22];
  if (place) r.places.push({ n: place[0], X: x + w / 2, Y: H - 10, sub: place[1] });
}
const tiles = (a, b, size, extra) => (x, y) => {
  const seam = x % size === 0 || y % size === 0, r = hash(x * 3 + 1, y * 5 + 7);
  const e = extra && extra(x, y); if (e) return e;
  return seam ? b : r < 0.04 ? [a[0] - 6, a[1] - 6, a[2] - 6] : a;
};

// ---------- C:B1 Cafe Blue + Cafe Red (one long counter, small wall between them) ----------
function cafe() {
  const W = 560, H = 300, WH = 52;
  const r = room(W, H, tiles([242, 242, 236], [214, 214, 208], 16, (x, y) => {
    const i = x >> 4, j = y >> 4;
    if (i % 3 === 1 && j % 3 === 1 && x % 16 > 2 && y % 16 > 2) return [40, 40, 46];        // black accent tiles
    if (((x + y * 2) % 140) < 3 && y > WH) return [252, 252, 250];                          // floor shine
    return null;
  }));
  const { g } = r;
  walls(r, WH, '#f2f0ea', '#d8d6d0');
  // windows along the left wall
  for (let y = 70; y < 270; y += 44) { P(g, '#3a3440', 0, y, 7, 26); P(g, '#a8d4ec', 1, y + 1, 5, 24); P(g, '#e4f4fc', 2, y + 2, 1, 22); }
  // header signs + menu boards
  const half = (x0, x1, name, sign, board) => {
    const cx = (x0 + x1) / 2;
    P(g, OUTLINE, cx - 34, 5, 68, 12); P(g, sign, cx - 33, 6, 66, 10); pixelText(g, name, cx, 7, '#ffffff');
    for (let i = 0; i < 3; i++) {
      const bx = x0 + 70 + i * 52; P(g, OUTLINE, bx - 1, 18, 48, 22); P(g, board, bx, 19, 46, 20);
      for (let l = 0; l < 4; l++) { P(g, '#f4f0e8', bx + 3, 22 + l * 4, 24, 1); P(g, '#ffd27a', bx + 34, 22 + l * 4, 8, 1); }
    }
    for (let i = 0; i < 3; i++) {                                         // drinks fridges
      const fx = x0 + 10 + i * 18; P(g, OUTLINE, fx - 1, 17, 18, 34); P(g, '#2a60c0', fx, 18, 16, 32); P(g, '#bfe4f4', fx + 2, 22, 12, 26);
      for (let s = 0; s < 4; s++) for (let b = 0; b < 4; b++) P(g, ['#d03030', '#2a60c0', '#f0b444', '#3a8a5e'][(b + s + i) % 4], fx + 3 + b * 3, 24 + s * 6, 2, 4);
    }
  };
  half(10, 272, 'CAFE BLUE', '#1f4f9f', '#7a2a32');
  half(288, 550, 'CAFE RED', '#c0302a', '#26262c');
  // staff behind the counters, then the counters
  for (const [x, c] of [[90, '#2f5a9a'], [170, '#2f5a9a'], [360, '#b8323a'], [450, '#b8323a']]) person(g, x, 58, 'down', 0, { ...look(x), top: c, top2: css(hx(c), 0.8), scarf: null });
  const counter = (x0, x1) => {
    P(g, OUTLINE, x0 - 1, 57, x1 - x0 + 2, 27); P(g, '#e8e8e2', x0, 58, x1 - x0, 7); P(g, '#ffffff', x0, 58, x1 - x0, 1);
    P(g, '#f8f8f4', x0, 65, x1 - x0, 17); P(g, '#c8c8c0', x0, 81, x1 - x0, 2);
    for (let x = x0 + 12; x < x1; x += 24) P(g, '#dcdcd4', x, 66, 1, 15);
    P(g, OUTLINE, x0 + 40, 48, 62, 11); P(g, '#cfe8f0', x0 + 41, 49, 60, 9);                      // glass display
    for (let i = 0; i < 9; i++) P(g, ['#e0a050', '#c86a3a', '#f0d080', '#8a5a3a'][i % 4], x0 + 43 + i * 6, 53, 4, 3);
    P(g, OUTLINE, x0 + 150, 48, 14, 11); P(g, '#3a3a44', x0 + 151, 49, 12, 9); P(g, '#5fd3a4', x0 + 153, 50, 8, 3);  // till
    P(g, OUTLINE, x0 + 120, 46, 12, 13); P(g, '#c0c4cc', x0 + 121, 47, 10, 11); P(g, '#ffffff', x0 + 122, 48, 2, 9); // tea urn
    r.block(x0 - 1, 57, x1 - x0 + 2, 27);
  };
  counter(22, 272); counter(288, 512);
  P(g, '#8a5a3a', 112, 65, 18, 16); P(g, '#a8744c', 112, 65, 18, 1); P(g, '#5e3c26', 128, 72, 1, 3);                // wooden counter gate
  P(g, OUTLINE, 275, 0, 10, 88); P(g, '#e8e6e0', 276, 0, 8, 84); P(g, '#ccc8c0', 276, 80, 8, 4); r.block(275, 0, 10, 88);  // the small dividing wall
  P(g, OUTLINE, 6, 34, 22, 20); P(g, '#c8202a', 7, 35, 20, 18); P(g, '#ffffff', 9, 39, 16, 2);                         // Nescafe stand
  r.block(6, 34, 22, 20);
  // pillars
  for (const [x, y] of [[171, 160], [393, 160], [171, 228], [393, 228]]) {
    r.sprite(x - 8, y - 34, 16, 38, y + 3, q => { P(q, OUTLINE, 0, 0, 16, 38); P(q, '#e8e6e0', 1, 1, 14, 6); P(q, '#f8f6f2', 1, 7, 14, 30); P(q, '#dcdad4', 11, 7, 4, 30); });
    r.block(x - 7, y - 2, 14, 5);
  }
  // tables: light wood, chairs in red / sage / white / navy, some students
  const CH = ['#d0302a', '#a8c8a0', '#f0f0ec', '#2a3a6a'];
  const table = (tx, ty, seed) => r.sprite(tx - 20, ty - 26, 40, 46, ty + 12, q => {
    const chair = (cx, cy, col) => { P(q, OUTLINE, cx - 5, cy - 6, 10, 9); P(q, col, cx - 4, cy - 5, 8, 7); P(q, css(hx(col), 1.12), cx - 4, cy - 5, 8, 2); };
    const seat = (k, cx, cy, dir) => hash(seed, k) > 0.45 && person(q, cx, cy, dir, 0, look(seed * 11 + k));
    chair(12, 12, CH[(seed + 0) % 4]); chair(28, 12, CH[(seed + 1) % 4]);
    seat(1, 12, 18, 'down'); seat(2, 28, 18, 'down');
    P(q, OUTLINE, 3, 16, 34, 14); P(q, '#f0d8a8', 4, 17, 32, 2); P(q, '#e2c48e', 4, 19, 32, 8); P(q, '#b8955e', 4, 27, 32, 2);
    if (hash(seed, 5) > 0.4) { P(q, '#ffffff', 9, 20, 5, 3); P(q, '#d04040', 24, 20, 4, 4); }
    chair(12, 38, CH[(seed + 2) % 4]); chair(28, 38, CH[(seed + 3) % 4]);
    seat(3, 12, 42, 'up'); seat(4, 28, 42, 'up');
  });
  for (const ty of [124, 194, 258]) for (const tx of ty === 258 ? [112, 232, 312, 432] : [52, 112, 232, 312, 432, 500]) { table(tx, ty, tx + ty * 3); r.block(tx - 17, ty - 12, 34, 16); }
  // queues
  for (const [x, y, s] of [[70, 98, 1], [82, 104, 2], [150, 96, 3], [330, 98, 4], [342, 104, 5], [460, 96, 6]])
    r.sprite(x - 8, y - 24, 16, 26, y, q => person(q, 8, 24, 'up', 0, look(700 + s)));
  // stairs up to C Block at both ends (bottom wall), lift to the floors
  const stairs = (x, spawn, to) => {
    P(g, '#3a3440', x - 2, H - 28, 44, 28);
    for (let y = H - 26; y < H; y++) { const t = (y - (H - 26)) / 26; P(g, css([170 + 70 * t, 166 + 70 * t, 160 + 70 * t]), x, y, 40, 1); if (y % 4 === 0) P(g, '#8a8680', x, y, 40, 1); }
    r.open(x, H - 26, 40, 26);
    r.trigger(x, H - 10, x + 40, H, { type: 'go', to: 'campus', spawn: to });
    r.spawns[spawn] = [x + 20, H - 40];
    r.places.push({ n: 'Stairs up to C Block', X: x + 20, Y: H - 20, sub: 'Back outside' });
  };
  stairs(16, 'west', 'C-west'); stairs(W - 56, 'east', 'C-east');
  lift(r, W - 34, WH, 'C');
  r.places.push({ n: 'Cafe Blue', X: 150, Y: 96, sub: 'Left counter' }, { n: 'Cafe Red', X: 410, Y: 96, sub: 'Right counter · small wall in between' });
  r.labels.push({ t: 'Cafe Blue', X: 150, Y: 112 }, { t: 'Cafe Red', X: 410, Y: 112 });
  return r.done({ title: 'C BLOCK · B1', sub: 'CAFE BLUE & CAFE RED', building: 'C' });
}

// ---------- C:G Library ----------
function library() {
  const W = 480, H = 280, WH = 48;
  const r = room(W, H, (x, y) => { const r_ = hash(x, y * 3); return ((x >> 2) + (y >> 2)) % 7 === 0 ? [84, 100, 132] : r_ < 0.08 ? [96, 112, 146] : [92, 108, 142]; });
  const { g } = r;
  walls(r, WH, '#efe6d4', '#9a6a44');
  P(g, OUTLINE, 160, 8, 160, 14); P(g, '#1f3a5f', 161, 9, 158, 12); pixelText(g, 'LIBRARY  ·  SILENCE PLEASE', 240, 11, '#f6f1de');
  for (const x of [30, 360]) { P(g, OUTLINE, x, 14, 80, 30); P(g, '#a8d4ec', x + 1, 15, 78, 28); for (let i = 1; i < 4; i++) P(g, OUTLINE, x + i * 20, 15, 1, 28); }
  const SPINE = ['#b8323a', '#2f5a9a', '#3a8a5e', '#f0b444', '#7a54a8', '#e07aa0', '#5c4834', '#e6dcc4'];
  const shelf = (x, y, w) => r.sprite(x, y - 30, w, 32, y, q => {
    P(q, OUTLINE, 0, 0, w, 32); P(q, '#6a4428', 1, 1, w - 2, 5); P(q, '#8a5a34', 1, 1, w - 2, 1);
    for (let row = 0; row < 3; row++) {
      const ry = 7 + row * 8; P(q, '#3a2414', 1, ry, w - 2, 7); P(q, '#7a4c2c', 1, ry + 7, w - 2, 1);
      for (let bx = 2; bx < w - 3; bx += 2 + (hash(bx, row + x) > 0.7 ? 1 : 0)) P(q, SPINE[Math.floor(hash(bx + x, row + y) * SPINE.length)], bx, ry + 1 + (hash(bx, y) > 0.8 ? 1 : 0), 2, 6);
    }
  });
  for (const y of [92, 140]) for (const [x, w] of [[24, 180], [276, 180]]) { shelf(x, y, w); r.block(x, y - 8, w, 9); }
  const table = (tx, ty, seed) => r.sprite(tx - 30, ty - 26, 60, 46, ty + 12, q => {
    for (const [cx, cy, dir, k] of [[14, 18, 'down', 1], [30, 18, 'down', 2], [46, 18, 'down', 3]]) { P(q, OUTLINE, cx - 5, cy - 10, 10, 8); P(q, '#3a5a8a', cx - 4, cy - 9, 8, 6); if (hash(seed, k) > 0.4) person(q, cx, cy, dir, 0, look(seed + k)); }
    P(q, OUTLINE, 2, 16, 56, 14); P(q, '#c89a64', 3, 17, 54, 2); P(q, '#b0824e', 3, 19, 54, 8); P(q, '#7a5430', 3, 27, 54, 2);
    for (const lx of [12, 44]) { P(q, '#2f7a4a', lx, 15, 6, 3); P(q, '#ffe8a0', lx + 1, 18, 4, 1); }
    P(q, '#f4f1e8', 26, 21, 8, 4); P(q, '#b8323a', 27, 21, 3, 4);
    for (const [cx, cy, k] of [[14, 44, 4], [30, 44, 5], [46, 44, 6]]) { P(q, OUTLINE, cx - 5, cy - 7, 10, 8); P(q, '#3a5a8a', cx - 4, cy - 6, 8, 6); if (hash(seed, k) > 0.5) person(q, cx, cy - 2, 'up', 0, look(seed + k)); }
  });
  for (const [tx, ty] of [[90, 196], [200, 196], [310, 196], [90, 248], [310, 248]]) { table(tx, ty, tx * 7 + ty); r.block(tx - 28, ty - 12, 56, 16); }
  // issue desk by the door + librarian, computers on the right
  person(g, 236, 218, 'down', 0, look(4242));
  P(g, OUTLINE, 200, 222, 80, 18); P(g, '#c89a64', 201, 223, 78, 4); P(g, '#9a6a44', 201, 227, 78, 12); P(g, '#2a2a30', 214, 216, 12, 7); P(g, '#5fd3a4', 215, 217, 10, 4); r.block(200, 222, 80, 18);
  for (let y = 168; y < 260; y += 26) { P(g, OUTLINE, W - 34, y, 26, 14); P(g, '#c89a64', W - 33, y + 1, 24, 12); P(g, '#2a2a30', W - 28, y - 6, 12, 8); P(g, '#7ac8f0', W - 27, y - 5, 10, 5); r.block(W - 34, y, 26, 14); }
  frontDoor(r, 226, 28, { type: 'go', to: 'campus', spawn: 'C-main' }, 'exit', ['Exit to campus', 'C Block main door']);
  lift(r, W - 40, WH, 'C');
  r.places.push({ n: 'Issue desk', X: 240, Y: 244, sub: 'Borrow and return books' });
  return r.done({ title: 'C BLOCK · G', sub: 'LIBRARY', building: 'C' });
}

// ---------- D:B1 Faculty parking ----------
function parking() {
  const W = 520, H = 260, WH = 40;
  const r = room(W, H, (x, y) => { const k = hash(x, y); if (y > 60 && y < 200 && (x % 40 === 0) && (y < 110 || y > 150)) return [214, 214, 206]; return k < 0.08 ? [96, 98, 108] : [86, 88, 98]; });
  const { g } = r;
  walls(r, WH, '#b8b8b0', '#e0b030');
  for (let x = 0; x < W; x += 16) P(g, (x >> 4) & 1 ? '#e0b030' : '#2a2a30', x, WH - 9, 16, 7);
  for (let x = 20; x < W - 40; x += 40) for (const y of [104, 196]) if (hash(x, y) > 0.25) { carV(g, x + 20, y, CARS[Math.floor(hash(y, x) * CARS.length)]); r.block(x + 15, y - 14, 10, 14); }
  for (const x of [120, 240, 360]) for (const y of [128, 160]) { P(g, OUTLINE, x - 5, y - 18, 10, 22); P(g, '#c8c8c0', x - 4, y - 17, 8, 20); P(g, '#e0b030', x - 4, y - 2, 8, 3); r.block(x - 4, y - 2, 8, 4); }
  // ramp up to campus (bottom-left)
  P(g, '#3a3440', 14, H - 30, 54, 30);
  for (let y = H - 28; y < H; y++) { const t = (y - (H - 28)) / 28; P(g, css([70 + 100 * t, 72 + 100 * t, 80 + 100 * t]), 16, y, 50, 1); }
  r.open(16, H - 28, 50, 28); r.trigger(16, H - 10, 66, H, { type: 'go', to: 'campus', spawn: 'D-ramp' }); r.spawns.ramp = [41, H - 44];
  r.places.push({ n: 'Ramp up', X: 41, Y: H - 20, sub: 'Back to campus' });
  lift(r, W - 40, WH, 'D');
  return r.done({ title: 'D BLOCK · B1', sub: 'FACULTY PARKING', building: 'D' });
}

// ---------- <B>:<F> floor corridor with classrooms ----------
function corridor(b, f) {
  const W = 120 + ROOMS_PER_SIDE * 130, H = 200, WH = 50, info = BUILDINGS[b], old = b === 'A' || b === 'B';
  const r = room(W, H, tiles(old ? [226, 214, 190] : [232, 230, 224], old ? [204, 190, 166] : [210, 208, 202], 12));
  const { g } = r;
  walls(r, WH, old ? '#efe0c0' : '#f4f2ec', old ? '#40a096' : '#9aa0a8');
  const doors = [];
  for (let i = 0; i < ROOMS_PER_SIDE; i++) {                               // classrooms on the back wall
    const x = 70 + i * 130, n = i + 1;
    P(g, OUTLINE, x - 1, WH - 33, 26, 33); P(g, '#7a5232', x, WH - 32, 24, 32); P(g, '#9a6a42', x, WH - 32, 24, 1); P(g, '#bfe4f4', x + 9, WH - 28, 6, 10); P(g, '#e0c060', x + 19, WH - 16, 2, 2);
    P(g, OUTLINE, x + 27, WH - 32, 32, 9); P(g, '#1f3a5f', x + 28, WH - 31, 30, 7);
    doors.push({ n, X: x + 12, Y: WH, top: true });
    if (i < ROOMS_PER_SIDE - 1) { P(g, OUTLINE, x + 72, WH - 36, 34, 22); P(g, '#b08a5e', x + 73, WH - 35, 32, 20); for (let k = 0; k < 4; k++) P(g, ['#f4f1e8', '#f0b444', '#8fc0dc', '#e07aa0'][k], x + 76 + k * 7, WH - 32 + (k & 1) * 4, 5, 6); }
  }
  for (let i = 0; i < ROOMS_PER_SIDE; i++) {                               // classrooms on the front wall
    const x = 130 + i * 130, n = ROOMS_PER_SIDE + i + 1;
    P(g, '#3a3440', x - 2, H - 7, 28, 7); P(g, '#7a5232', x, H - 7, 24, 7); P(g, '#9a6a42', x, H - 7, 24, 1);
    r.open(x, H - 7, 24, 7);
    doors.push({ n, X: x + 12, Y: H, top: false });
  }
  for (const d of doors) {
    const name = roomName(b, f, d.n);
    if (d.top) { pixelText(g, name, d.X + 31, WH - 32, '#f6f1de'); r.trigger(d.X - 12, WH, d.X + 12, WH + 6, { type: 'go', to: `${b}:${f}:${d.n}`, spawn: 'door' }); r.spawns['door' + d.n] = [d.X, WH + 18]; }
    else { r.trigger(d.X - 12, H - 6, d.X + 12, H, { type: 'go', to: `${b}:${f}:${d.n}`, spawn: 'door' }); r.spawns['door' + d.n] = [d.X, H - 22]; }
    r.places.push({ n: 'Classroom ' + name, X: d.X, Y: d.top ? WH + 4 : H - 10, sub: 'Walk in' });
    r.labels.push({ t: name, X: d.X, Y: d.top ? WH + 12 : H - 18 });
  }
  // water cooler, benches, stairs on the left, lift on the right
  P(g, OUTLINE, 26, WH - 26, 12, 30); P(g, '#7ac8f0', 27, WH - 25, 10, 10); P(g, '#e8e8f0', 27, WH - 15, 10, 18); r.block(26, WH, 12, 4);
  for (const x of [200, 460, 720]) r.sprite(x - 14, 120, 28, 12, 131, q => { P(q, OUTLINE, 0, 0, 28, 10); P(q, '#a06a3a', 1, 1, 26, 4); P(q, '#7a4c28', 1, 5, 26, 2); P(q, OUTLINE, 3, 7, 2, 4); P(q, OUTLINE, 23, 7, 2, 4); });
  for (const x of [200, 460, 720]) r.block(x - 14, 126, 28, 6);
  lift(r, W - 40, WH, b);
  if (f === 'G') frontDoor(r, 34, 30, { type: 'go', to: 'campus', spawn: info.door }, 'exit', ['Exit to campus', info.name + ' entrance']);
  else { r.spawns.exit = r.spawns.lift; }
  // a few students hanging out in the corridor
  for (let i = 0; i < 6; i++) { const x = 60 + hash(i, f.charCodeAt(0) + b.charCodeAt(0)) * (W - 120), y = 90 + hash(b.charCodeAt(0), i) * 70, s = i * 13 + b.charCodeAt(0); r.sprite(x - 8, y - 24, 16, 26, y, q => person(q, 8, 24, ['down', 'left', 'right', 'up'][i % 4], 0, look(s))); r.block(x - 3, y - 2, 7, 2); }
  const fname = info.floors.find(([k]) => k === f)?.[1] || f;
  return r.done({ title: `${info.name.toUpperCase()} · ${f}`, sub: fname.toUpperCase(), building: b, floor: f });
}

// ---------- <B>:<F>:<n> classroom ----------
function classroom(b, f, n) {
  const W = 320, H = 230, WH = 52, name = roomName(b, f, n), seed = b.charCodeAt(0) * 97 + n * 13 + f.charCodeAt(0);
  const r = room(W, H, tiles([214, 200, 172], [196, 182, 154], 14));
  const { g } = r;
  walls(r, WH, '#f2efe6', '#9aa0a8');
  P(g, OUTLINE, 70, 8, 150, 36); P(g, '#c8ccd2', 71, 9, 148, 34); P(g, '#fbfbf8', 73, 11, 144, 30);                       // whiteboard
  for (let i = 0; i < 6; i++) P(g, ['#2f5a9a', '#2a2a30', '#b8323a'][i % 3], 80 + hash(seed, i) * 100, 15 + i * 4, 10 + hash(i, seed) * 30, 1);
  P(g, '#8a8e96', 73, 41, 144, 2); P(g, '#2f5a9a', 190, 40, 6, 2); P(g, '#b8323a', 198, 40, 6, 2);
  P(g, OUTLINE, 232, 6, 60, 30); P(g, '#ececec', 233, 7, 58, 28); P(g, '#d8d8d8', 233, 33, 58, 2);                       // projector screen
  P(g, OUTLINE, 20, 10, 36, 12); P(g, '#f4f4f4', 21, 11, 34, 10); P(g, '#c8c8c8', 23, 18, 30, 1);                         // AC
  for (let y = 70; y < H - 20; y += 44) { P(g, '#3a3440', W - 7, y, 7, 28); P(g, '#a8d4ec', W - 6, y + 1, 5, 26); }       // windows
  pixelText(g, name, 34, 30, '#2a2433');
  // teacher desk + podium
  r.sprite(40, 54, 60, 26, 79, q => { P(q, OUTLINE, 0, 6, 60, 20); P(q, '#b0824e', 1, 7, 58, 4); P(q, '#8a5e34', 1, 11, 58, 14); P(q, '#2a2a30', 34, 0, 14, 8); P(q, '#7ac8f0', 35, 1, 12, 5); });
  r.block(40, 60, 60, 20);
  r.sprite(232, 50, 18, 30, 79, q => { P(q, OUTLINE, 0, 0, 18, 30); P(q, '#8a5e34', 1, 1, 16, 28); P(q, '#b0824e', 1, 1, 16, 3); });
  r.block(232, 70, 18, 10);
  // rows of tablet-arm chairs, some taken (students face the board)
  for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
    const x = 46 + col * 36, y = 108 + row * 24, taken = hash(seed + col, row) > 0.45;
    r.sprite(x - 9, y - 22, 20, 26, y + 2, q => {
      P(q, OUTLINE, 3, 12, 12, 12); P(q, '#2f4f8f', 4, 13, 10, 10); P(q, '#4a6aaa', 4, 13, 10, 2);
      if (taken) person(q, 9, 22, 'up', 0, look(seed * 3 + row * 7 + col));
      P(q, OUTLINE, 13, 10, 7, 6); P(q, '#d8c8a0', 14, 11, 5, 4);
    });
    r.block(x - 6, y - 4, 13, 6);
  }
  frontDoor(r, 20, 26, { type: 'go', to: `${b}:${f}`, spawn: 'door' + n }, 'door', ['Exit to corridor', `${BUILDINGS[b].name} · floor ${f}`]);
  return r.done({ title: `CLASSROOM ${name}`, sub: `${BUILDINGS[b].name.toUpperCase()} · FLOOR ${f}`, building: b, floor: f });
}

export function buildInterior(key) {
  const [b, f, n] = key.split(':');
  if (!BUILDINGS[b]) return null;
  if (key === 'C:B1') return cafe();
  if (key === 'C:G') return library();
  if (key === 'D:B1') return parking();
  if (n) return classroom(b, f, +n);
  return corridor(b, f);
}
