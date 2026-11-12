// Characters, trees and vehicles, all painted in code.
import { hash, hx, css, pick, mk, P, OUTLINE } from './util.js';
import { SKINS, HAIR_COLORS, CLOTH, PANTS, BAGS, HAIRS, HEADWEAR, OUTFITS } from '../../shared/protocol.js';

// ---------- avatar options (shared by the creator UI and the random students) ----------
export { SKINS, HAIR_COLORS, HAIRS, HEADWEAR, OUTFITS, CLOTH, PANTS, BAGS };
const POOL = { m: ['short', 'side', 'curly', 'buzz'], f: ['long', 'ponytail', 'bun', 'curly'] };

// add the derived shades person() needs (computed once, not every frame)
export function dress(L) {
  return { ...L, top2: css(hx(L.top), 0.78), hair2: css(hx(L.hair), 1.35), head2: css(hx(L.headColor || '#2f5a9a'), 0.78) };
}
export function randomLook(s, gender) {
  const g = gender || (hash(s, 9) < 0.5 ? 'm' : 'f'), f = g === 'f';
  const head = f ? (hash(s, 5) < 0.35 ? 'hijab' : 'none') : (hash(s, 5) < 0.15 ? 'cap' : hash(s, 5) < 0.2 ? 'beanie' : 'none');
  return {
    gender: g, skin: pick(SKINS, hash(s, 2)), hair: pick(HAIR_COLORS.slice(0, 4), hash(s, 3)), hairStyle: pick(POOL[g], hash(s, 10)),
    headwear: head, headColor: pick(CLOTH, hash(s, 6)),
    outfit: f ? pick(['kurta', 'kurta', 'tee', 'hoodie', 'jacket'], hash(s, 11)) : pick(['tee', 'tee', 'hoodie', 'jacket', 'kurta'], hash(s, 11)),
    top: pick(CLOTH, hash(s, 1)), pants: pick(PANTS, hash(s, 4)), bag: hash(s, 7) < 0.6 ? pick(BAGS.slice(1), hash(s, 8)) : null, glasses: hash(s, 12) < 0.2,
  };
}
export const look = s => dress(randomLook(s));
export const ME = dress({ gender: 'm', skin: '#d39a6a', hair: '#1d1917', hairStyle: 'short', headwear: 'none', headColor: '#2f5a9a', outfit: 'hoodie', top: '#5fd3a4', pants: '#2c3658', bag: '#3e424c', glasses: false });

// Chibi student, feet at (x, y). dir: up/down/left/right, fr: walk frame 0..3. L must come from dress().
export function person(g, x, y, dir, fr, L) {
  x = Math.round(x); y = Math.round(y);
  const st = [0, 1, 0, -1][fr], side = dir === 'left' || dir === 'right', up = dir === 'up', down = dir === 'down', fl = dir === 'left' ? -1 : 1;
  const parts = [], det = [], hs = L.hairStyle || 'short', hw = L.headwear || 'none', hc = L.hair, kurta = L.outfit === 'kurta';
  P(g, 'rgba(20,20,30,.25)', x - 4, y - 1, 9, 2);
  // legs
  if (side) parts.push([L.pants, x - 1 + st, y - 3, 2, 3], [L.pants, x - 1 - st, y - 3, 2, 3]);
  else parts.push([L.pants, x - 2, y - 3 - (st > 0 ? 1 : 0), 2, 3], [L.pants, x + 1, y - 3 - (st < 0 ? 1 : 0), 2, 3]);
  const by = y - 7 - (fr % 2), hy = by - 7;
  // hair that hangs behind the body (long hair, ponytail seen from behind)
  if (hw !== 'hijab') {
    if (up && hs === 'long') parts.push([hc, x - 3, hy + 4, 7, 6]);
    if (up && hs === 'ponytail') parts.push([hc, x - 1, hy + 5, 3, 5]);
  }
  if (L.bag && !down) parts.push([L.bag, side ? (fl > 0 ? x - 5 : x + 3) : x - 2, by, side ? 2 : 5, 4]);
  // body + arms
  parts.push([L.top, x - 3, by, 7, kurta ? 8 - (fr % 2) : 5]);
  const arm = L.outfit === 'tee' ? L.skin : L.top2;
  if (!side) parts.push([arm, x - 4, by + 1 + st, 1, 3], [arm, x + 4, by + 1 - st, 1, 3]); else parts.push([arm, x + st * fl, by + 1, 2, 3]);
  // head
  parts.push([L.skin, x - 3, hy, 7, 7]);
  if (hw === 'hijab') {
    parts.push([L.headColor, x - 4, hy - 2, 9, 10]);
    if (down) det.push([L.skin, x - 2, hy + 1, 5, 5]); else if (side) det.push([L.skin, fl > 0 ? x : x - 3, hy + 1, 4, 5]);
  } else {
    const top = hs === 'buzz' ? 2 : 3;
    if (hs === 'curly') parts.push([hc, x - 4, hy - 2, 9, up ? 8 : 4]);
    else parts.push([hc, x - 3, hy - 1, 7, up ? (hs === 'long' ? 7 : 6) : top]);
    if (down) {
      if (hs === 'long') parts.push([hc, x - 4, hy, 2, 9], [hc, x + 3, hy, 2, 9]);
      else if (hs === 'curly') parts.push([hc, x - 4, hy, 1, 5], [hc, x + 4, hy, 1, 5]);
      else if (hs !== 'buzz') parts.push([hc, x - 3, hy, 1, 3], [hc, x + 3, hy, 1, 3]);
      if (hs === 'side') det.push([hc, x - 2, hy + 2, 3, 1]);
    } else if (side) {
      parts.push([hc, fl > 0 ? x - 3 : x + 1, hy, 3, hs === 'long' ? 9 : hs === 'buzz' ? 2 : 5]);
      if (hs === 'ponytail') parts.push([hc, fl > 0 ? x - 5 : x + 4, hy + 1, 2, 5]);
    }
    if (hs === 'bun') parts.push([hc, x - 2, hy - 4, 4, 3]);
    if (hw === 'cap') { parts.push([L.headColor, x - 4, hy - 2, 9, 3]); if (side) parts.push([L.headColor, fl > 0 ? x + 4 : x - 6, hy, 3, 1]); else if (down) det.push([L.head2, x - 3, hy + 1, 7, 1]); }
    if (hw === 'beanie') { parts.push([L.headColor, x - 3, hy - 2, 7, 4]); det.push([L.head2, x - 3, hy + 1, 7, 1]); }
  }
  for (const [, px, py, w, h] of parts) P(g, '#1a1620', px - 1, py - 1, w + 2, h + 2);
  for (const [c, px, py, w, h] of parts) P(g, c, px, py, w, h);
  for (const [c, px, py, w, h] of det) P(g, c, px, py, w, h);
  // outfit details
  if (!up) {
    if (L.outfit === 'hoodie') { P(g, L.top2, x - 3, by, 7, 1); if (down) { P(g, '#f4f1e8', x - 1, by + 1, 1, 2); P(g, '#f4f1e8', x + 1, by + 1, 1, 2); P(g, L.top2, x - 2, by + 3, 5, 1); } }
    else if (L.outfit === 'jacket') { if (down) { P(g, '#f4f1e8', x, by, 1, 5); P(g, L.top2, x - 1, by, 1, 3); P(g, L.top2, x + 1, by, 1, 3); } else P(g, L.top2, x + fl, by, 1, 5); }
    else if (L.outfit === 'tee') { if (down) { P(g, L.top, x - 4, by + 1 + st, 1, 1); P(g, L.top, x + 4, by + 1 - st, 1, 1); } }
    else if (kurta && down) { P(g, L.top2, x, by, 1, 2); P(g, L.top2, x - 3, by + 7 - (fr % 2), 7, 1); }
  }
  // face
  if (down) {
    P(g, '#1d1917', x - 2, hy + 3, 1, 2); P(g, '#1d1917', x + 2, hy + 3, 1, 2); P(g, '#f08a8a', x - 3, hy + 5); P(g, '#f08a8a', x + 3, hy + 5);
    if (L.glasses) { P(g, '#2a2a30', x - 3, hy + 3, 3, 1); P(g, '#2a2a30', x + 1, hy + 3, 3, 1); P(g, '#2a2a30', x, hy + 3); }
  } else if (side) {
    P(g, '#1d1917', x + fl * 2, hy + 3, 1, 2);
    if (L.glasses) P(g, '#2a2a30', x + fl * 2 - 1, hy + 3, 3, 1);
  }
}

// Outline every opaque pixel's empty neighbours, then lay a soft shadow ellipse underneath.
function finish(g, w, h, sx, sy, rx, ry) {
  const d = g.getImageData(0, 0, w, h).data, op = i => d[i * 4 + 3] === 255, edge = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!op(i) && ((x > 0 && op(i - 1)) || (x < w - 1 && op(i + 1)) || (y > 0 && op(i - w)) || (y < h - 1 && op(i + w)))) edge.push([x, y]);
  }
  for (const [x, y] of edge) P(g, '#1c3420', x, y);
  g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(20,40,20,.3)';
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (x * x / (rx * rx) + y * y / (ry * ry) <= 1) g.fillRect(sx + x, sy + y, 1, 1);
  g.globalCompositeOperation = 'source-over';
}
const blobber = g => (cx, cy, r, col, sd, squash = 1) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = x * x + y * y * squash;
    if (d > r * r || (d > (r - 1.5) * (r - 1.5) && hash(x + sd, y * 7 + sd) < 0.3)) continue;
    P(g, col, cx + x, cy + y);
  }
};

export function makeTree(seed, type) {
  const s = 0.8 + hash(seed, 1) * 0.45, cv = mk(40, 52), g = cv.getContext('2d'), bx = 20, by = 48, blob = blobber(g);
  if (type === 'pine') {
    P(g, '#6b4426', bx - 1, by - 8, 3, 8);
    for (let k = 0; k < 4; k++) {
      const w = Math.round((11 - k * 2.2) * s), yy = Math.round(by - 6 - k * 7 * s);
      for (let r = 0; r < 9; r++) { const hw = Math.round(w * (r + 1) / 9); P(g, '#2e6a3c', bx - hw, yy - 9 + r, hw * 2 + 1, 1); P(g, '#4c9a58', bx - hw, yy - 9 + r, Math.max(1, hw - 1), 1); }
    }
  } else {
    const R = Math.round((type === 'small' ? 7 : 11) * s);
    P(g, '#6b4426', bx - 2, by - 9, 4, 9); P(g, '#8e5e34', bx - 2, by - 9, 1, 9);
    blob(bx, by - 8 - R, R, '#2f6a2e', seed); blob(bx - 2, by - 10 - R, R - 2, '#4a8f3c', seed + 1);
    blob(bx - 4, by - 13 - R, Math.round(R / 2), '#74b450', seed + 2);
    for (let i = 0; i < 10; i++) P(g, '#a0d470', bx - 7 + hash(seed, i) * 10, by - 10 - R * 1.6 + hash(i, seed) * R);
  }
  finish(g, 40, 52, bx + 4, by - 1, 12, 3);
  return cv;
}

// The Wisdom Tree: an old banyan with hanging roots and a stone platform round the trunk.
export function makeBanyan() {
  const cv = mk(120, 100), g = cv.getContext('2d'), bx = 60, by = 92, blob = blobber(g);
  const ell = (cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (x * x / (rx * rx) + y * y / (ry * ry) <= 1) P(g, col, bx + x, cy + y); };
  ell(by - 2, 28, 9, OUTLINE); ell(by - 2, 27, 8, '#9a907c'); ell(by - 5, 27, 8, '#d8ceb8'); ell(by - 6, 22, 5, '#e8e0cc');
  for (const x of [-40, -34, -27, -21, 19, 25, 32, 39]) P(g, '#7a5a3c', bx + x, by - 48 + (x & 3), 1, 40 - (x & 3));
  for (const [x, w] of [[-7, 14], [-15, 4], [11, 4]]) { P(g, '#5e4028', bx + x, by - 50, w, 44); P(g, '#7d5a3a', bx + x, by - 50, 1, 44); }
  for (const [cx, cy, r] of [[0, -62, 30], [-27, -55, 20], [27, -55, 20], [-14, -74, 18], [14, -74, 18]]) blob(bx + cx, by + cy, r, '#2a5a2a', cx + 50, 1.3);
  for (const [cx, cy, r] of [[-2, -65, 26], [-28, -58, 16], [24, -58, 16], [-16, -77, 14], [12, -77, 14]]) blob(bx + cx, by + cy, r, '#3f7f38', cx + 90, 1.3);
  for (const [cx, cy, r] of [[-18, -80, 9], [4, -82, 8], [-32, -62, 7], [20, -66, 7]]) blob(bx + cx, by + cy, r, '#6aa84a', cx + 130, 1.3);
  for (let i = 0; i < 26; i++) P(g, '#9ccc6a', bx - 40 + hash(i, 77) * 70, by - 90 + hash(77, i) * 40);
  finish(g, 120, 100, bx + 8, by - 4, 50, 10);
  return cv;
}

export const CARS = ['#f4f4f4', '#f4f4f4', '#c8ccd2', '#c8ccd2', '#26272e', '#b02a2a', '#2f5a9a', '#e0d8c2', '#3e424c'];
export function carV(g, x, y, col) {            // pointing up/down, (x, y) = bottom centre
  const c = hx(col);
  P(g, 'rgba(0,0,0,.28)', x - 5, y - 1, 11, 3); P(g, OUTLINE, x - 5, y - 15, 10, 16);
  P(g, css(c), x - 4, y - 14, 8, 12); P(g, css(c, 0.74), x - 4, y - 3, 8, 2); P(g, css(c, 1.12), x - 3, y - 10, 6, 4);
  P(g, '#33445a', x - 3, y - 6, 6, 2); P(g, '#33445a', x - 3, y - 12, 6, 1); P(g, '#a8d0f0', x - 3, y - 6, 2, 1);
}
export function carH(g, x, y, col, f, night) {  // pointing left/right (f = +1 right)
  const c = hx(col);
  P(g, 'rgba(0,0,0,.28)', x - 8, y - 1, 17, 3); P(g, OUTLINE, x - 9, y - 10, 18, 11);
  P(g, css(c), x - 8, y - 9, 16, 6); P(g, css(c, 0.74), x - 8, y - 3, 16, 2); P(g, css(c, 1.12), x - 4, y - 9, 8, 4);
  P(g, '#33445a', x + (f > 0 ? 3 : -5), y - 9, 2, 4); P(g, '#33445a', x + (f > 0 ? -5 : 3), y - 9, 2, 4);
  P(g, '#121016', x - 6, y, 3, 1); P(g, '#121016', x + 3, y, 3, 1);
  P(g, night ? '#fff3b0' : '#f2eedc', f > 0 ? x + 8 : x - 9, y - 4, 1, 2); P(g, '#d0302a', f > 0 ? x - 9 : x + 8, y - 4, 1, 2);
}
