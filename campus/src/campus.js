// The outdoor campus scene: FAST-NUCES Islamabad (H-11/4).
// Layout traced from satellite imagery on a 10 m grid; names from OpenStreetMap (tools/data/fast.json).
// Coordinates are "campus metres" in a frame rotated so the walls are axis aligned
// (x = 183..415 runs Gate-4 road -> east road, y = 127..484 runs north road -> south road).
// The map is shown turned so the Gate 4 road is on top: screen X = (484 - y) * S, screen Y = (x - 183) * S.
import { hash, hx, mul, css, clamp, mk, P, OUTLINE, pixelText, feetFree } from './util.js';
import { look, person, makeTree, makeBanyan, CARS, carV, carH } from './sprites.js';

export function buildCampus() {
  const S = 3.2, LV = 9;
  const W = Math.round(358 * S), H = Math.round(232 * S);
  const MX = y => Math.round((484 - y) * S), MY = x => Math.round((x - 183) * S);
  const at2 = (x, y) => [MX(y), MY(x)];

  // ---------- ground ----------
  const C = { GRASS: 0, ROAD: 1, SIDE: 2, PAVE: 3, PATH: 4, PARK: 5, LAWN: 6, FIELD: 7, TRACK: 8, DIRT: 9, TURF: 10, CB: 11, CT: 12, HEDGE: 13, WATER: 14, RING: 15, WALL: 16, PLANT: 17, RAMP: 18 };
  const grid = new Uint8Array(W * H), solid = new Uint8Array(W * H), bid = new Int16Array(W * H).fill(-1);
  const R = (c, X0, Y0, X1, Y1) => {
    X0 = clamp(X0, 0, W); X1 = clamp(X1, 0, W); Y0 = clamp(Y0, 0, H); Y1 = clamp(Y1, 0, H);
    for (let y = Y0; y < Y1; y++) grid.fill(c, y * W + X0, y * W + X1);
  };
  const RR = (c, x0, y0, x1, y1) => R(c, MX(y1), MY(x0), MX(y0), MY(x1));
  const DR = (c, x, y, r0, r1 = -1) => {
    const cx = MX(y), cy = MY(x), a = r0 * S, b = r1 * S, n = Math.ceil(a);
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const d = Math.hypot(i, j), X = cx + i, Y = cy + j;
      if (d <= a && d > b && X >= 0 && Y >= 0 && X < W && Y < H) grid[Y * W + X] = c;
    }
  };
  RR(C.ROAD, 183, 127, 200, 484); RR(C.ROAD, 400, 127, 415, 484); RR(C.ROAD, 183, 127, 415, 136); RR(C.ROAD, 183, 470, 415, 484);
  RR(C.SIDE, 200, 136, 203, 470); RR(C.SIDE, 397, 136, 400, 470); RR(C.SIDE, 200, 136, 400, 138); RR(C.SIDE, 200, 467, 400, 470);
  R(C.WALL, MX(468), MY(202), MX(137), MY(203.3)); R(C.WALL, MX(468), MY(396.7), MX(137), MY(398));
  R(C.WALL, MX(137) - 4, MY(202), MX(137), MY(398)); R(C.WALL, MX(468), MY(202), MX(468) + 4, MY(398));
  RR(C.PATH, 203, 138, 211, 467);
  RR(C.ROAD, 357, 138, 368, 234);
  RR(C.PARK, 347, 234, 389, 296);
  RR(C.PATH, 368, 296, 374, 467);
  RR(C.PATH, 205, 140, 243, 240); RR(C.PATH, 274, 140, 357, 162);
  RR(C.PATH, 239, 186, 357, 221);
  for (const [x0, x1] of [[242, 276], [280, 317], [322, 355]]) { RR(C.HEDGE, x0, 194, x1, 212); RR(C.LAWN, x0 + 0.6, 194.6, x1 - 0.6, 211.4); }
  for (const cx of [264.5, 340]) { DR(C.PATH, cx, 203, 7.5); DR(C.RING, cx, 203, 6.5, 5); DR(C.LAWN, cx, 203, 5); DR(C.PLANT, cx, 203, 1.2); }
  DR(C.PATH, 319.5, 203, 3.6); DR(C.WATER, 319.5, 203, 2.6);
  RR(C.PATH, 259, 229, 264, 296); RR(C.PATH, 259, 291, 357, 296);
  RR(C.HEDGE, 264, 235, 344, 291); RR(C.LAWN, 264.6, 235.6, 343.4, 290.4);
  RR(C.PAVE, 239, 229, 259, 467);
  RR(C.PAVE, 200, 318, 241, 329); RR(C.PATH, 259, 318, 314, 328);
  RR(C.PARK, 208, 404, 241, 466);
  RR(C.ROAD, 368, 226, 400, 236); RR(C.PATH, 374, 304, 400, 312); RR(C.PARK, 243, 459, 255, 470);   // Gates 1, 2, 3
  RR(C.PATH, 312, 314, 351, 355); RR(C.CB, 314, 316, 349, 333); RR(C.CT, 314, 333.6, 349, 353);
  DR(C.TRACK, 309, 408, 50); DR(C.FIELD, 309, 408, 48.5);
  RR(C.DIRT, 299, 406.6, 319, 409.4);
  RR(C.DIRT, 369, 359, 388, 397); RR(C.TURF, 364, 408, 387, 446);
  RR(C.RAMP, 242, 388, 252, 400);                                   // D basement ramp (faculty parking)
  for (let y = 300; y < 466; y += 22) RR(C.PLANT, 255, y, 258, y + 6);
  for (let i = 0; i < grid.length; i++) { const c = grid[i]; if (c === C.WALL || c === C.HEDGE || c === C.WATER || c === C.PLANT) solid[i] = 2; }

  // ---------- buildings: plan rects in campus metres, walls extruded up, facades face the viewer ----------
  // doors: [campus y of door centre, width m]; key = building code used by the interiors
  const BLD = [
    { key: 'C', name: 'C Block', style: 'new', fl: 6, r: [[211, 240, 239, 318]], doors: [[279, 6], [315, 3], [243, 3]], label: [225, 279] },
    { key: 'D', name: 'D Block', style: 'new', fl: 6, r: [[210, 328, 240, 404]], doors: [[366, 6]], bsmt: [392, 400], label: [225, 366] },
    { key: 'B', name: 'B Block', style: 'old', roof: 'slate', fl: 4, r: [[212, 163, 238, 228], [212, 163, 274, 186]], doors: [[205, 4]], dome: [236, 190], label: [225, 196] },
    { key: 'A', name: 'A Block', style: 'old', roof: 'solar', fl: 4, r: [[283, 162, 358, 191]], doors: [[176, 4]], dome: [317, 186], label: [320, 176] },
    { style: 'plain', fl: 2, r: [[348, 322, 363, 351]] },
    { style: 'plain', fl: 1, r: [[250, 148, 274, 157]] },
    { style: 'plain', fl: 1, r: [[207, 450, 217, 466]] }, { style: 'plain', fl: 1, r: [[230, 458, 246, 467]] }, { style: 'plain', fl: 1, r: [[260, 459, 274, 467]] },
  ];
  BLD.forEach((b, i) => {
    b.id = i; b.H = b.fl * LV + 5;
    b.rects = b.r.map(([x0, y0, x1, y1]) => [MX(y1), MY(x0), MX(y0), MY(x1)]);
    b.X0 = Math.min(...b.rects.map(r => r[0])); b.X1 = Math.max(...b.rects.map(r => r[2]));
    b.PY0 = Math.min(...b.rects.map(r => r[1])); b.PY1 = Math.max(...b.rects.map(r => r[3]));
    b.doorsX = (b.doors || []).map(([y, w]) => [MX(y) - b.X0 - Math.round(w * S / 2), Math.round(w * S)]);
    if (b.bsmt) b.bsmtX = [MX(b.bsmt[1]) - b.X0, MX(b.bsmt[0]) - b.X0];
  });
  const inB = (b, x, py) => { for (const r of b.rects) if (x >= r[0] && x < r[2] && py >= r[1] && py < r[3]) return true; return false; };
  // bottom edge (facade base) of a building at screen column X
  const baseAt = (b, X) => { let best = -1; for (const r of b.rects) if (X >= r[0] && X < r[2]) best = Math.max(best, r[3]); return best; };
  function eachPixel(b, cb) {
    for (let x = b.X0; x < b.X1; x++) {
      const edges = [];
      for (let py = b.PY0; py < b.PY1; py++) if (inB(b, x, py) && !inB(b, x, py + 1)) edges.push(py);
      for (let sy = Math.max(0, b.PY0 - b.H); sy < b.PY1; sy++) {
        if (inB(b, x, sy + b.H)) { cb(x, sy, 1, sy + b.H); continue; }
        let best = -1;
        for (const py of edges) if (py >= sy && py < sy + b.H && py > best) best = py;
        if (best >= 0) cb(x, sy, 2, best - sy);
      }
    }
  }
  for (const b of BLD) eachPixel(b, (x, y) => { solid[y * W + x] = 1; bid[y * W + x] = b.id; });

  // ---------- paint the ground ----------
  const base = mk(W, H), bg = base.getContext('2d');
  const img = bg.createImageData(W, H), D = img.data, emit = bg.createImageData(W, H), E = emit.data;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 255 : grid[y * W + x];
  const put = (A, x, y, c) => { const o = (y * W + x) * 4; A[o] = c[0]; A[o + 1] = c[1]; A[o + 2] = c[2]; A[o + 3] = 255; };
  const CRX = MX(408), CRY = MY(309);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = grid[y * W + x], r = hash(x, y);
    let k;
    switch (c) {
      case C.GRASS: {
        const p = hash(x >> 4, y >> 4) < 0.3 ? -7 : hash((x + 8) >> 4, (y + 8) >> 4) < 0.25 ? 6 : 0;
        k = [111 + p, 176 + p, 74 + p];
        if (r < 0.06) k = [92, 152, 60];
        if (hash(x, y - 1) < 0.018) k = [76, 132, 52]; else if (hash(x, y) < 0.018) k = [150, 206, 98];
        if (r > 0.9985) k = hash(x, y + 7) > 0.5 ? [250, 246, 232] : hash(x, y + 9) > 0.5 ? [246, 206, 86] : [236, 128, 150];
        break;
      }
      case C.LAWN: k = ((x >> 3) & 1) ? [122, 194, 82] : [108, 178, 70]; if (r < 0.05) k = mul(k, 0.92); break;
      case C.FIELD: { const d = Math.hypot(x - CRX, y - CRY); k = ((d / 7) | 0) & 1 ? [128, 188, 86] : [114, 172, 74]; if (r < 0.05) k = mul(k, 0.93); break; }
      case C.TURF: k = ((x >> 4) & 1) ? [76, 168, 84] : [64, 150, 72]; break;
      case C.TRACK: k = r < 0.15 ? [184, 136, 94] : [200, 152, 106]; break;
      case C.DIRT: k = r < 0.15 ? [200, 172, 120] : [216, 188, 134]; break;
      case C.CB: k = [74, 112, 182]; break;
      case C.CT: k = [72, 148, 104]; break;
      case C.ROAD: {
        k = r < 0.1 ? [66, 70, 84] : r > 0.97 ? [52, 56, 68] : [60, 64, 78];
        const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
        if (n.some(v => v !== C.ROAD && v !== C.PARK && v !== 255)) k = [184, 180, 170];
        break;
      }
      case C.SIDE: k = (x % 7 === 0 || y % 7 === 0) ? [186, 180, 168] : [210, 204, 192]; break;
      case C.PAVE: { const row = y >> 2; k = (y % 4 === 0 || (x + (row & 1) * 4) % 8 === 0) ? [190, 142, 112] : r < 0.07 ? [208, 160, 128] : [222, 176, 142]; break; }
      case C.PATH: k = (x % 10 === 0 || y % 10 === 0) ? [206, 200, 186] : r < 0.05 ? [220, 214, 200] : [232, 226, 212]; break;
      case C.PARK: k = r < 0.08 ? [104, 106, 118] : [94, 96, 108]; break;
      case C.HEDGE: k = at(x, y - 1) !== C.HEDGE ? [128, 186, 84] : r < 0.4 ? [80, 142, 62] : [58, 112, 50]; break;
      case C.WATER: k = at(x, y - 1) !== C.WATER ? [46, 110, 160] : hash(x >> 1, y) < 0.05 ? [190, 232, 248] : [92, 176, 220]; break;
      case C.RING: k = (((Math.atan2(y, x) * 40) | 0) & 1) ? [196, 108, 78] : [210, 122, 88]; break;
      case C.WALL: k = at(x, y + 1) !== C.WALL ? [168, 160, 146] : at(x, y - 1) !== C.WALL ? [250, 246, 236] : [234, 228, 214]; break;
      case C.PLANT: k = (at(x - 1, y) !== C.PLANT || at(x + 1, y) !== C.PLANT || at(x, y - 1) !== C.PLANT || at(x, y + 1) !== C.PLANT) ? [150, 112, 84] : r < 0.12 ? (r < 0.06 ? [240, 120, 150] : [248, 214, 90]) : r < 0.5 ? [86, 150, 62] : [64, 122, 50]; break;
      case C.RAMP: { const t = (y - MY(242)) / ((MY(252) - MY(242)) || 1); k = (x === MX(400) || x === MX(388) - 1) ? [150, 146, 136] : [40 + 50 * t, 42 + 50 * t, 50 + 50 * t]; break; }
      default: k = [111, 176, 74];
    }
    put(D, x, y, k);
  }
  const mark = (X0, Y0, X1, Y1, c) => { for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (x >= 0 && y >= 0 && x < W && y < H) put(D, x, y, c); };
  const WH_ = [244, 244, 236], YEL = [236, 210, 120];
  const yTop = MY(191.5), yBot = MY(407.5), xL = MX(477), xR = MX(131.5);
  for (let x = 0; x < W; x += 18) { mark(x, yTop, x + 9, yTop + 2, YEL); mark(x, yBot, x + 9, yBot + 2, YEL); }
  for (let y = 0; y < H; y += 18) { mark(xL, y, xL + 2, y + 9, YEL); mark(xR, y, xR + 2, y + 9, YEL); }
  for (let x = MX(329); x < MX(318); x += 6) mark(x, MY(185), x + 3, MY(199), WH_);
  for (const [x0, x1] of [[349, 356], [361, 368], [371, 378], [381, 388]]) for (let y = 236; y < 295; y += 2.6) mark(MX(y), MY(x0), MX(y) + 1, MY(x1), [214, 214, 206]);
  for (const x0 of [210, 232]) for (let y = 405; y < 450; y += 2.6) mark(MX(y), MY(x0), MX(y) + 1, MY(x0 + 7), [214, 214, 206]);
  const box = (x0, y0, x1, y1, c) => { mark(MX(y1), MY(x0), MX(y0), MY(x0) + 1, c); mark(MX(y1), MY(x1) - 1, MX(y0), MY(x1), c); mark(MX(y1), MY(x0), MX(y1) + 1, MY(x1), c); mark(MX(y0) - 1, MY(x0), MX(y0), MY(x1), c); };
  box(315, 317, 348, 332, WH_); box(315, 334.5, 348, 352, WH_); mark(MX(324.5), MY(315), MX(324.5) + 1, MY(348), WH_); mark(MX(343.3), MY(315), MX(343.3) + 1, MY(348), WH_);
  for (const yy of [319.5, 329.5]) { const cx = MX(yy), cy = MY(331.5); for (let a = 0; a < 360; a += 3) put(D, Math.round(cx + 9 * Math.cos(a * Math.PI / 180)), Math.round(cy + 9 * Math.sin(a * Math.PI / 180)), [226, 120, 70]); }
  box(365, 409, 386, 445, WH_); mark(MX(427.5), MY(365), MX(427.5) + 1, MY(386), WH_);
  for (const x of [300.5, 317.5]) mark(MX(409.4), MY(x), MX(406.6), MY(x) + 1, WH_);
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) {             // building shadows, dithered edge
    if (solid[y * W + x] !== 1 || solid[y * W + x + 1] === 1) continue;
    const len = Math.round(BLD[bid[y * W + x]].H * 0.32);
    for (let k = 1; k <= len && x + k < W && solid[y * W + x + k] !== 1; k++) {
      if (k > len - 3 && (x + k + y) & 1) continue;
      const o = (y * W + x + k) * 4; D[o] *= 0.7; D[o + 1] *= 0.72; D[o + 2] *= 0.8;
    }
  }
  for (let y = MY(216); y < MY(234); y++) for (let x = MX(328); x < MX(318); x++) if ((x + y) & 1 || y > MY(220)) { const o = (y * W + x) * 4; D[o] *= 0.8; D[o + 1] *= 0.8; D[o + 2] *= 0.86; }

  // ---------- paint the buildings ----------
  const NW = hx('#f2f0e8'), OW = hx('#e2cc9c'), PW = hx('#e8e2d4'), TEAL = hx('#40a096'), OUT = [30, 26, 40];
  const LIT = hx('#ffe2a0'), LITC = hx('#d6ecff'), LITG = hx('#c8f0d4');
  function wallPx(b, x, e) {
    const u = x - b.X0, w = b.X1 - b.X0, Hh = b.H;
    const door = b.doorsX.find(([u0, dw]) => u >= u0 && u < u0 + dw);
    if (b.style === 'old') {
      if (e < 2) return [[150, 128, 92]];
      if (e >= Hh - 2) return [[246, 232, 196]];
      if (e >= Hh - 4) return [TEAL];
      const f = Math.floor((e - 2) / LV), r = (e - 2) % LV;
      if (door && f === 0) return r < 7 ? [[64, 92, 104], LIT] : [[48, 150, 120]];
      if (r === 0 && f > 0) return [[196, 172, 128]];
      if (u % 30 < 2) return [[246, 230, 196]];
      if (f === 0) {
        const k = u % 12, inArch = r >= 1 && (r === 7 ? k >= 4 && k <= 7 : r === 6 ? k >= 3 && k <= 8 : r < 6 && k >= 2 && k <= 9);
        if (inArch) return [[92, 70, 52], hash(x >> 3, 7) > 0.6 ? LIT : null];
      } else {
        const k = u % 9;
        if (r >= 2 && r <= 6 && k >= 3 && k <= 6) return [r === 2 ? [110, 150, 168] : k === 3 ? [86, 120, 138] : [64, 92, 110], hash((x / 9) | 0, f * 13) > 0.55 ? LIT : null];
        if (r === 7 && k >= 2 && k <= 7) return [TEAL];
      }
      return [e < 5 ? mul(OW, 0.9) : hash(x, e) < 0.05 ? mul(OW, 0.94) : OW];
    }
    if (b.style === 'plain') {
      if (e < 2) return [[150, 146, 136]];
      if (e >= Hh - 2) return [[250, 248, 242]];
      const r = (e - 2) % LV, k = u % 8;
      if (r >= 2 && r <= 5 && k >= 3 && k <= 5 && u > 2 && u < w - 3) return [r === 2 ? [140, 176, 200] : [76, 100, 120], hash(x >> 3, e >> 3) > 0.6 ? LIT : null];
      return [PW];
    }
    if (e < 2) return [[156, 154, 146]];
    if (e < 5) return [[212, 210, 202]];
    if (e >= Hh - 2) return [[255, 255, 250]];
    if (e === Hh - 3) return [[214, 212, 204]];
    const f = Math.floor((e - 5) / LV), r = (e - 5) % LV, tw = 30, tower = u < tw || u >= w - tw;
    if (b.bsmtX && e < 13 && u >= b.bsmtX[0] && u < b.bsmtX[1]) return [e > 10 ? (((u >> 2) & 1) ? [236, 196, 44] : [30, 30, 36]) : [24, 26, 30]];
    if (door && e < LV + 4) { const [u0, dw] = door; return [u === u0 || u === u0 + dw - 1 || e === LV + 3 ? [96, 104, 112] : u % 5 === 0 ? [48, 62, 72] : [70, 110, 132], LIT]; }
    if (f === 2 && r === 0) return [[214, 212, 204]];
    if (f === 2 && r === 1) return [[190, 188, 180]];
    if (u === tw || u === w - tw - 1) return [[206, 204, 196]];
    if (tower) {
      if ((u % 6 === 2 || u % 6 === 3) && u >= 4 && u < w - 4 && e >= 8 && e < Hh - 5) return [u % 6 === 2 ? [52, 58, 70] : [32, 36, 46], hash(x, f) > 0.62 ? LITC : null];
      return [NW];
    }
    const m = (u - tw) / (w - 2 * tw), green = (m > 0.18 && m < 0.36) || (m > 0.64 && m < 0.82);
    if (green && f >= 2) {
      if (r === 0 || u % 4 === 0) return [[30, 80, 64]];
      return [r === 1 ? [126, 206, 168] : u % 4 === 1 ? [84, 164, 128] : [60, 136, 104], hash(x >> 2, f) > 0.5 ? LITG : null];
    }
    if (f === 0 && r === 1) return [(u & 1) ? [120, 124, 132] : [222, 220, 212]];
    const k = u % 7;
    if (k >= 2 && k <= 4 && r >= 2 && r <= 6) return [r === 2 ? [150, 186, 214] : k === 2 ? [70, 92, 116] : [52, 66, 86], hash((x / 7) | 0, f * 7) > 0.55 ? LIT : null];
    if (r === 7 && k >= 1 && k <= 5) return [[255, 255, 252]];
    return [hash(x, e) < 0.05 ? [232, 230, 222] : NW];
  }
  function roofPx(b, x, py) {
    let d = 4;
    for (let k = 0; k < 4; k++) if (!inB(b, x - k - 1, py) || !inB(b, x + k + 1, py) || !inB(b, x, py - k - 1) || !inB(b, x, py + k + 1)) { d = k; break; }
    const roof = b.style === 'old' ? (b.roof === 'slate' ? [96, 104, 122] : [222, 204, 160]) : b.style === 'plain' ? [200, 196, 188] : [210, 212, 210];
    if (d === 0) return b.style === 'old' ? [250, 236, 200] : [252, 252, 248];
    if (d === 1) return b.style === 'old' && b.roof === 'slate' ? TEAL : mul(roof, 1.06);
    if (d === 2 && !inB(b, x, py - 3)) return mul(roof, 0.82);
    const lx = x - b.X0, ly = py - b.PY0;
    if (b.roof === 'slate') { const t = (lx + ly) % 14; return t === 0 ? [140, 148, 166] : t === 1 ? [70, 76, 92] : hash(x, py) < 0.06 ? [88, 96, 114] : roof; }
    if (d >= 4 && (b.style === 'new' || b.roof === 'solar')) {
      const cx = (lx - 5) % 9, cy = (ly - 5) % 7, band = Math.floor((ly - 5) / 7) % 4 === 3;
      if (!band && cx >= 0 && cx < 8 && cy >= 0 && cy < 6) {
        const dark = b.style === 'new';
        if (cy === 0) return dark ? [76, 92, 132] : [96, 128, 188];
        return cx === 4 ? (dark ? [26, 32, 52] : [36, 52, 104]) : (dark ? [36, 44, 70] : [52, 76, 140]);
      }
    }
    return hash(x, py) < 0.06 ? mul(roof, 0.95) : (lx % 12 === 0 || ly % 12 === 0) ? mul(roof, 0.95) : roof;
  }
  for (const b of BLD) eachPixel(b, (x, y, kind, v) => {
    if (kind === 1) put(D, x, y, roofPx(b, x, v));
    else { const [c, g] = wallPx(b, x, v); put(D, x, y, c); if (g) put(E, x, y, g); }
  });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = bid[y * W + x]; if (id < 0) continue;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || bid[y * W + x - 1] !== id || bid[y * W + x + 1] !== id || bid[(y - 1) * W + x] !== id || bid[(y + 1) * W + x] !== id) put(D, x, y, OUT);
  }
  bg.putImageData(img, 0, 0);

  // ---------- props baked into the map ----------
  const blockSolid = (X0, Y0, w, h) => { for (let y = Y0; y < Y0 + h; y++) for (let x = X0; x < X0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < H) solid[y * W + x] = 2; };
  const hidden = (X0, Y0, w, h) => { for (let y = Y0; y < Y0 + h; y++) for (let x = X0; x < X0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < H && solid[y * W + x] === 1) return true; return false; };
  for (const b of BLD) if (b.dome) {
    const x = MX(b.dome[1]), y = MY(b.dome[0]) - b.H, r = 10;
    P(bg, OUTLINE, x - r - 2, y - 10, 2 * r + 5, 11); P(bg, '#f0dfb8', x - r - 1, y - 9, 2 * r + 3, 9); P(bg, '#c8b48a', x - r - 1, y - 2, 2 * r + 3, 1);
    for (let i = -r + 1; i < r; i += 4) P(bg, '#40a096', x + i, y - 7, 2, 4);
    for (let j = -r - 1; j <= 0; j++) for (let i = -r - 1; i <= r + 1; i++) {
      const q = i * i + j * j * 1.3;
      if (q > (r + 1) * (r + 1)) continue;
      P(bg, q > r * r ? OUTLINE : i < -r / 3 && j < -r / 3 ? '#a6e4dc' : i > r / 3 ? '#2a7a74' : '#44aaa2', x + i, y - 10 + j);
    }
    P(bg, OUTLINE, x - 1, y - 10 - r - 6, 3, 6); P(bg, '#f2c84b', x, y - 10 - r - 5, 1, 4);
  }
  { const X0 = MX(228), X1 = MX(222), yb = MY(243), h = 50;                  // spiral staircase beside B
    for (let y = yb - h; y < yb; y++) for (let x = X0; x < X1; x++) {
      const e = yb - y, u = x - X0, edge = u === 0 || u === X1 - X0 - 1 || y === yb - h;
      P(bg, edge ? OUTLINE : ((u + e) % 8 < 2) ? '#8a4632' : ((u + e) % 8 < 3) ? '#5a3026' : (u < (X1 - X0) / 2 ? '#e8d4a8' : '#cdb88c'), x, y);
      solid[y * W + x] = 1;
    }
    P(bg, '#40a096', X0, yb - h + 1, X1 - X0, 3); }
  const roofKit = (b, n, fn) => {
    for (let k = 0, placed = 0; k < 80 && placed < n; k++) {
      const px = Math.round(b.X0 + 8 + hash(b.id, k) * (b.X1 - b.X0 - 16)), py = Math.round(b.PY0 + 8 + hash(k, b.id) * (b.PY1 - b.PY0 - 16));
      if (![[-7, -7], [7, 7], [-7, 7], [7, -7]].every(([dx, dy]) => inB(b, px + dx, py + dy))) continue;
      fn(px, py - b.H); placed++;
    }
  };
  roofKit(BLD[2], 6, (x, y) => { P(bg, 'rgba(0,0,0,.3)', x - 2, y + 1, 9, 2); P(bg, OUTLINE, x - 4, y - 6, 9, 8); P(bg, '#2f6fb5', x - 3, y - 5, 7, 6); P(bg, '#5b98d8', x - 3, y - 5, 7, 2); P(bg, '#9cc8f0', x - 2, y - 5, 2, 1); });
  for (const b of BLD.slice(4)) roofKit(b, 2, (x, y) => { P(bg, OUTLINE, x - 5, y - 4, 10, 6); P(bg, '#9aa0aa', x - 4, y - 3, 8, 4); P(bg, '#dfe2e8', x - 4, y - 3, 8, 1); P(bg, '#5a5e68', x - 1, y - 2, 3, 2); });
  // door canopies + mats so building entrances read clearly
  for (const b of BLD) if (b.key) for (const [u0, dw] of b.doorsX) {
    const X = b.X0 + u0, Y = baseAt(b, X);
    P(bg, OUTLINE, X - 2, Y - LV - 7, dw + 4, 3); P(bg, b.style === 'old' ? '#40a096' : '#5fd3a4', X - 1, Y - LV - 6, dw + 2, 1);
    P(bg, '#8a8478', X, Y, dw, 3); P(bg, '#6a655c', X + 1, Y + 1, dw - 2, 1);
  }
  const pillar = (X, Y) => { P(bg, OUTLINE, X - 1, Y - 18, 10, 26); P(bg, '#efe6d2', X, Y - 17, 8, 24); P(bg, '#40a096', X, Y - 17, 8, 2); P(bg, '#bdb2a0', X, Y + 3, 8, 4); blockSolid(X, Y, 8, 8); };
  const gates = [[329, 318, MY(200), 'GATE 4'], [236, 226, MY(397), 'GATE 1'], [312, 304, MY(397), 'GATE 2']];
  for (const [y0, y1, Y] of gates) { pillar(MX(y0) - 8, Y); pillar(MX(y1), Y); }
  for (const Y of [MY(243) - 8, MY(255)]) pillar(MX(468) - 3, Y);
  const booth = (X, Y) => { P(bg, OUTLINE, X - 1, Y - 17, 20, 19); P(bg, '#f0ebe0', X, Y - 16, 18, 6); P(bg, '#e3dccc', X, Y - 10, 18, 11); P(bg, '#4a6a88', X + 3, Y - 8, 7, 5); P(bg, '#8fb8d8', X + 3, Y - 8, 7, 1); blockSolid(X, Y - 6, 18, 7); };
  booth(MX(316), MY(205) + 6); booth(MX(242), MY(394)); booth(MX(463), MY(262));
  const parkV = (x, y, seed) => { if (hidden(x - 5, y - 15, 11, 17)) return; carV(bg, x, y, CARS[Math.floor(hash(seed, 3) * CARS.length)]); blockSolid(x - 4, y - 8, 8, 8); };
  for (const [x0, x1] of [[349, 356], [361, 368], [371, 378], [381, 388]]) for (let y = 237.3; y < 294; y += 2.6) if (hash(y * 10, x0) > 0.25) parkV(MX(y) - 4, MY(x1) - 2, y * 7 + x0);
  for (const x0 of [210, 232]) for (let y = 406.3; y < 449; y += 2.6) if (hash(y * 10, x0) > 0.3) parkV(MX(y) - 4, MY(x0 + 7) - 2, y * 5 + x0);
  for (let y = 140; y < 466; y += 3.2) if (hash(y * 10, 1) > 0.45 && (y < 314 || y > 333)) parkV(MX(y) - 4, MY(199.5), y * 3);
  for (let y = 140; y < 466; y += 3.2) if (hash(y * 10, 2) > 0.5 && (y < 222 || y > 240) && (y < 300 || y > 316)) parkV(MX(y) - 4, MY(401.5) + 14, y * 9);
  for (let x = MX(449); x < MX(425); x += 5) for (let y = MY(222); y < MY(246); y += 12) if (hash(x, y) > 0.2) {
    P(bg, OUTLINE, x - 1, y - 7, 4, 9); P(bg, CARS[Math.floor(hash(y, x) * CARS.length)], x, y - 6, 2, 4); P(bg, '#2a2a30', x, y - 2, 2, 3); blockSolid(x - 1, y - 3, 4, 3);
  }
  for (const [x, y] of [[259.5, 250], [259.5, 270], [300, 293.5], [330, 293.5], [278, 216.5], [310, 216.5], [246, 300], [246, 350]]) {
    const X = MX(y), Y = MY(x);
    P(bg, '#2a1d14', X - 6, Y - 5, 13, 7); P(bg, '#a06a3a', X - 5, Y - 4, 11, 2); P(bg, '#7a4c28', X - 5, Y - 1, 11, 1); P(bg, '#2a1d14', X - 4, Y, 1, 2); P(bg, '#2a1d14', X + 4, Y, 1, 2);
    blockSolid(X - 5, Y - 2, 11, 2);
  }
  const emitCv = mk(W, H); emitCv.getContext('2d').putImageData(emit, 0, 0);
  // occluder: the building pixels alone, drawn over anything standing behind a building (e.g. cars on the road behind C/D)
  const occ = mk(W, H);
  { const src = bg.getImageData(0, 0, W, H), d = src.data; for (let i = 0; i < W * H; i++) if (bid[i] < 0) d[i * 4 + 3] = 0; occ.getContext('2d').putImageData(src, 0, 0); }
  const behind = (x, y) => { const X = Math.round(x), Y = Math.round(y); return X >= 0 && Y >= 0 && X < W && Y < H && bid[Y * W + X] >= 0; };

  // overhead: skybridge, gate beams, solar canopies
  const over = mk(W, H), og = over.getContext('2d');
  { const X0 = MX(328), X1 = MX(318), top = MY(216) - 41, front = MY(234) - 41, bot = MY(234) - 23;
    P(og, OUTLINE, X0, top - 1, X1 - X0, bot - top + 2); P(og, '#d8d8d2', X0, top, X1 - X0, front - top); P(og, '#f4f4ee', X0, top, X1 - X0, 2);
    for (let x = X0; x < X1; x++) P(og, x % 5 === 0 ? '#1e5040' : '#3c8868', x, front, 1, bot - front - 2);
    P(og, '#7ec8a4', X0, front, X1 - X0, 1); P(og, '#bab8b0', X0, bot - 2, X1 - X0, 2); }
  for (const [y0, y1, Yl, text] of gates) { const X0 = MX(y0) - 9, X1 = MX(y1) + 9, Y = Yl - 22; P(og, OUTLINE, X0, Y, X1 - X0, 12); P(og, '#1f3a5f', X0 + 1, Y + 1, X1 - X0 - 2, 10); pixelText(og, text, (X0 + X1) / 2, Y + 2, '#f6f1de'); }
  for (const [x0, x1] of [[349, 356], [361, 368], [371, 378], [381, 388]]) {
    const X0 = MX(295), X1 = MX(235), Y0 = MY(x0) - 14, Y1 = MY(x1) - 14;
    P(og, OUTLINE, X0 - 1, Y0 - 1, X1 - X0 + 2, Y1 - Y0 + 2);
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) P(og, (x - X0) % 7 === 0 ? '#1a2a5a' : y === Y0 ? '#7aa0e0' : ((y - Y0) % 5 === 0 ? '#24408a' : '#3460b8'), x, y);
    for (let x = X0 + 6; x < X1; x += 40) { P(og, OUTLINE, x, Y1, 2, 14); blockSolid(x, Y1 + 12, 2, 2); }
  }

  // ---------- entities: trees, lamps, cars, people ----------
  const ents = [];
  const TS = []; for (let i = 0; i < 12; i++) TS.push(makeTree(i * 31 + 7, i < 7 ? 'round' : i < 10 ? 'pine' : 'small'));
  const ok = (X, Y, r) => {
    for (const [dx, dy] of [[0, 0], [-r, 0], [r, 0], [0, -r], [0, r]]) {
      const x = X + dx, y = Y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || solid[y * W + x] || grid[y * W + x] !== C.GRASS) return false;
    }
    return true;
  };
  const tree = (X, Y, spr, ox = 20, oy = 48) => ({ x: X, y: Y, w: spr.width, draw: c => c.drawImage(spr, X - ox, Y - oy) });
  const density = (x, y) => (x > 368 && x < 397) ? 0.6 : (y > 214 && y < 236 && x > 239 && x < 357) ? 0.75 : (x < 211 || y < 142 || y > 462) ? 0.5 : 0.18;
  const banyan = [MX(243), MY(279)];
  for (let Y = 6; Y < H; Y += 12) for (let X = 6; X < W; X += 12) {
    const jx = Math.round(X + (hash(X, Y) - 0.5) * 8), jy = Math.round(Y + (hash(Y, X) - 0.5) * 8);
    const x = jy / S + 183, y = 484 - jx / S;
    if (Math.abs(jx - banyan[0]) < 50 && Math.abs(jy - banyan[1]) < 30) continue;
    if (hash(X * 3, Y * 7) < density(x, y) && ok(jx, jy, 6) && ok(jx, jy - 12, 3)) { ents.push(tree(jx, jy, TS[Math.floor(hash(X, Y * 3) * TS.length)])); blockSolid(jx - 1, jy - 1, 3, 2); }
  }
  ents.push(tree(banyan[0], banyan[1], makeBanyan(), 60, 92)); blockSolid(banyan[0] - 24, banyan[1] - 8, 48, 10);
  const addLamp = (x, y) => {
    const X = MX(y), Y = MY(x);
    for (let k = 0; k < 20; k++) if (Y - k >= 0 && solid[(Y - k) * W + X] === 1) return;
    blockSolid(X, Y - 1, 1, 2);
    ents.push({ x: X, y: Y, w: 8, light: () => [X, Y - 12, 44], draw: (c, n) => { P(c, 'rgba(0,0,0,.22)', X - 2, Y - 1, 6, 2); P(c, OUTLINE, X - 1, Y - 17, 3, 17); P(c, '#5a5a66', X, Y - 16, 1, 16); P(c, OUTLINE, X - 3, Y - 19, 7, 3); P(c, n ? '#fff6c8' : '#d8d2bc', X - 2, Y - 18, 5, 1); } });
  };
  for (let y = 236; y < 466; y += 18) addLamp(258.5, y);
  for (let y = 236; y < 296; y += 15) addLamp(259.5, y + 6);
  for (let x = 262; x < 312; x += 12) addLamp(x, 317.5);
  for (let y = 190; y < 356; y += 20) addLamp(238.5, y);
  for (let y = 142; y < 466; y += 24) addLamp(204, y);

  const laneT = [MY(186.5), MY(196)], laneB = [MY(411.5), MY(403)], laneL = [MX(480.5), MX(473.5)], laneR = [MX(129.5), MX(134)];
  const loops = [
    { pts: [[laneL[0], laneT[0]], [laneR[0], laneT[0]], [laneR[0], laneB[0]], [laneL[0], laneB[0]]], v: 0.8 },
    { pts: [[laneL[1], laneT[1]], [laneL[1], laneB[1]], [laneR[1], laneB[1]], [laneR[1], laneT[1]]], v: 0.65 },
  ];
  for (const L of loops) { L.cum = [0]; for (let i = 1; i <= 4; i++) { const a = L.pts[i - 1], b = L.pts[i % 4]; L.cum.push(L.cum[i - 1] + Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1])); } L.len = L.cum[4]; }
  const cars = [];
  loops.forEach((L, li) => { for (let i = 0; i < 8; i++) {
    const c = { L, s: (i + hash(i, li) * 0.4) * L.len / 8, col: CARS[Math.floor(hash(i, 40 + li) * CARS.length)], x: 0, y: 0, dx: 1, dy: 0, w: 20 };
    c.light = () => [c.x + c.dx * 16, c.y + c.dy * 16 - 4, 15];
    c.draw = (g, n) => c.dx ? carH(g, Math.round(c.x), Math.round(c.y), c.col, c.dx, n) : carV(g, Math.round(c.x), Math.round(c.y), c.col);
    cars.push(c); ents.push(c);
  } });
  const stepCar = c => {
    c.s = (c.s + c.L.v) % c.L.len;
    let i = 0; while (c.s >= c.L.cum[i + 1]) i++;
    const a = c.L.pts[i], b = c.L.pts[(i + 1) % 4], t = (c.s - c.L.cum[i]) / (c.L.cum[i + 1] - c.L.cum[i]);
    c.x = a[0] + (b[0] - a[0]) * t; c.y = a[1] + (b[1] - a[1]) * t + 5; c.dx = Math.sign(b[0] - a[0]); c.dy = Math.sign(b[1] - a[1]);
  };

  const WALKC = new Set([C.PAVE, C.PATH, C.LAWN, C.FIELD, C.TRACK, C.CB, C.CT, C.TURF]);
  const free = (x, y) => feetFree(solid, W, H, x, y);
  const npcFree = (x, y) => free(x, y) && WALKC.has(grid[Math.round(y) * W + Math.round(x)]) && WALKC.has(grid[Math.round(y) * W + Math.round(x - 3)]) && WALKC.has(grid[Math.round(y) * W + Math.round(x + 3)]);
  const npcs = [];
  for (let k = 0; npcs.length < 80 && k < 30000; k++) {
    const x = hash(k, 900) * W, y = hash(k, 901) * H;
    if (npcFree(x, y)) {
      const n = { x, y, dx: 0, dy: 0, timer: 0, t: 0, dir: 'down', look: look(k), w: 10 };
      n.draw = g => person(g, n.x, n.y, n.dir, (n.dx || n.dy) ? Math.floor(n.t / 9) % 4 : 0, n.look);
      npcs.push(n); ents.push(n);
    }
  }
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const stepNpc = n => {
    if (--n.timer <= 0) { const d = Math.random() < 0.3 ? [0, 0] : DIRS[Math.floor(Math.random() * 4)]; n.dx = d[0] * 0.4; n.dy = d[1] * 0.4; n.timer = 60 + Math.random() * 260; }
    if (!n.dx && !n.dy) return;
    if (npcFree(n.x + n.dx, n.y + n.dy)) { n.x += n.dx; n.y += n.dy; n.t++; } else n.timer = 0;
    n.dir = n.dx > 0 ? 'right' : n.dx < 0 ? 'left' : n.dy > 0 ? 'down' : 'up';
  };

  // ---------- doors (triggers), spawns, places, labels ----------
  const triggers = [], spawns = { start: at2(214, 323) };
  const doorAt = (b, i) => { const [u0, dw] = b.doorsX[i], X = b.X0 + u0, Y = baseAt(b, X); return { X0: X, X1: X + dw, Y }; };
  const addDoor = (b, i, act, spawnName) => {
    const d = doorAt(b, i);
    triggers.push({ x0: d.X0, x1: d.X1, y0: d.Y, y1: d.Y + 8, act });
    spawns[spawnName] = [(d.X0 + d.X1) / 2, d.Y + 18];
  };
  const [Cb, Db, Bb, Ab] = BLD;
  addDoor(Cb, 0, { type: 'menu', building: 'C' }, 'C-main');
  addDoor(Cb, 1, { type: 'go', to: 'C:B1', spawn: 'west' }, 'C-west');
  addDoor(Cb, 2, { type: 'go', to: 'C:B1', spawn: 'east' }, 'C-east');
  addDoor(Db, 0, { type: 'menu', building: 'D' }, 'D-main');
  addDoor(Bb, 0, { type: 'menu', building: 'B' }, 'B-main');
  addDoor(Ab, 0, { type: 'menu', building: 'A' }, 'A-main');
  triggers.push({ x0: MX(398), x1: MX(390), y0: MY(242), y1: MY(247), act: { type: 'go', to: 'D:B1', spawn: 'ramp' } });
  spawns['D-ramp'] = [MX(394), MY(255)];

  const places = [
    ['Gate 4', 207, 323, 'Main pedestrian gate on the H-11 service road'],
    ['C Block', 243, 279, 'Main entrance · pick a floor (Library is on G)'],
    ['Cafe entrance', 243, 315, 'C Block · stairs down to the cafe (B1)'],
    ['Cafe entrance', 243, 243, 'C Block · stairs down to the cafe (B1)'],
    ['D Block', 244, 366, 'Main entrance · pick a floor'],
    ['Faculty Parking', 248, 394, 'Ramp down to D Block basement'],
    ['Skybridge', 222, 323, 'Links C and D Blocks'],
    ['B Block', 241, 205, 'Entrance · pick a floor'],
    ['A Block', 361, 176, 'Entrance · pick a floor'],
    ['Front Lawn', 300, 203, 'Sunken circles and the fountain'],
    ['CS Lawn', 304, 263, ''],
    ['Wisdom Tree', 283, 243, 'The old banyan at the corner of the CS lawn'],
    ['Cricket Ground', 309, 408, ''],
    ['Courts', 331, 334, 'Basketball and tennis'],
    ['Covered Parking', 368, 265, 'Solar canopies'],
    ['Parking', 236, 437, 'Cars and bikes'],
    ['Turf', 375, 427, 'Futsal turf'],
    ['Gate 1', 392, 231, 'East gate · cars to the covered parking'],
    ['Gate 2', 392, 308, 'East gate'],
    ['Gate 3', 249, 462, 'South gate by the parking'],
  ].map(([n, x, y, sub]) => { const [X, Y] = at2(x, y); return { n, X, Y, sub }; });
  const labels = [
    ...BLD.filter(b => b.label).map(b => { const [X, Y] = at2(...b.label); return { t: b.name, X, Y: Y - b.H - 4 }; }),
    ...[['Gate 4', 190, 323], ['Faculty Parking ↓', 247, 394], ['Cricket Ground', 300, 392], ['CS Lawn', 280, 250], ['Front Lawn', 300, 194], ['Courts', 331, 340], ['Parking', 225, 420], ['Gate 1', 407, 231], ['Gate 2', 407, 308], ['Gate 3', 249, 477]]
      .map(([t, x, y]) => { const [X, Y] = at2(x, y); return { t, X, Y }; }),
    { t: 'Wisdom Tree', X: banyan[0], Y: banyan[1] - 100 },
  ];

  return {
    id: 'campus', title: 'FAST NUCES', sub: 'ISLAMABAD CAMPUS', outdoor: true, minimap: true,
    W, H, bg: base, over, emit: emitCv, occ, behind, ents, free, triggers, spawns, places, labels,
    step() { cars.forEach(stepCar); npcs.forEach(stepNpc); },
  };
}
