// Pixel FAST: FAST-NUCES Islamabad (H-11/4), painted in code.
// Layout traced from satellite imagery on a 10 m grid, names from OpenStreetMap (see data/).
// All coordinates below are in "campus metres": x/y in a frame rotated so the campus walls are axis aligned
// (x = 183..415 runs Gate-4 road -> east road, y = 127..484 runs north road -> south road).
// The map shows it turned 90 deg so the Gate 4 road is on top: screen X = (484 - y) * S, screen Y = (x - 183) * S.
(async () => {
  const $ = s => document.querySelector(s);
  const S = 3.2, LV = 9;                                       // px per metre, px per storey
  const W = Math.round(358 * S), H = Math.round(232 * S);
  const MX = y => Math.round((484 - y) * S), MY = x => Math.round((x - 183) * S);
  const hash = (x, y) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const hx = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  const css = (c, f = 1) => `rgb(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0})`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const P = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); };
  await document.fonts.load('8px Silkscreen');

  // ---------- ground ----------
  const C = { GRASS: 0, ROAD: 1, SIDE: 2, PAVE: 3, PATH: 4, PARK: 5, LAWN: 6, FIELD: 7, TRACK: 8, DIRT: 9, TURF: 10, CB: 11, CT: 12, HEDGE: 13, WATER: 14, RING: 15, WALL: 16, PLANT: 17, RAMP: 18, STAIR: 19 };
  const grid = new Uint8Array(W * H), solid = new Uint8Array(W * H), bid = new Int16Array(W * H).fill(-1);
  const R = (c, X0, Y0, X1, Y1) => {
    X0 = clamp(X0, 0, W); X1 = clamp(X1, 0, W); Y0 = clamp(Y0, 0, H); Y1 = clamp(Y1, 0, H);
    for (let y = Y0; y < Y1; y++) grid.fill(c, y * W + X0, y * W + X1);
  };
  const RR = (c, x0, y0, x1, y1) => R(c, MX(y1), MY(x0), MX(y0), MY(x1));      // rect in campus metres
  const DR = (c, x, y, r0, r1 = -1) => {                                        // disc / ring in campus metres
    const cx = MX(y), cy = MY(x), a = r0 * S, b = r1 * S, n = Math.ceil(a);
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const d = Math.hypot(i, j), X = cx + i, Y = cy + j;
      if (d <= a && d > b && X >= 0 && Y >= 0 && X < W && Y < H) grid[Y * W + X] = c;
    }
  };
  // roads, sidewalks, boundary wall
  RR(C.ROAD, 183, 127, 200, 484); RR(C.ROAD, 400, 127, 415, 484); RR(C.ROAD, 183, 127, 415, 136); RR(C.ROAD, 183, 470, 415, 484);
  RR(C.SIDE, 200, 136, 203, 470); RR(C.SIDE, 397, 136, 400, 470); RR(C.SIDE, 200, 136, 400, 138); RR(C.SIDE, 200, 467, 400, 470);
  R(C.WALL, MX(468), MY(202), MX(137), MY(203.3)); R(C.WALL, MX(468), MY(396.7), MX(137), MY(398));
  R(C.WALL, MX(137) - 4, MY(202), MX(137), MY(398)); R(C.WALL, MX(468), MY(202), MX(468) + 4, MY(398));
  // inside
  RR(C.PATH, 203, 138, 211, 467);                                   // walk along the Gate-4 wall
  RR(C.ROAD, 357, 138, 368, 234);                                   // internal road
  RR(C.PARK, 347, 234, 389, 296);                                   // covered (solar) parking
  RR(C.PATH, 368, 296, 374, 467);                                   // service lane
  RR(C.PATH, 205, 140, 243, 232); RR(C.PATH, 274, 140, 357, 162);   // aprons around B and A
  RR(C.PATH, 239, 186, 357, 221);                                   // front lawn walkways
  for (const [x0, x1] of [[242, 276], [280, 317], [322, 355]]) { RR(C.HEDGE, x0, 194, x1, 212); RR(C.LAWN, x0 + 0.6, 194.6, x1 - 0.6, 211.4); }
  DR(C.PATH, 264.5, 203, 7.5); DR(C.RING, 264.5, 203, 6.5, 5); DR(C.LAWN, 264.5, 203, 5); DR(C.PLANT, 264.5, 203, 1.2);
  DR(C.PATH, 340, 203, 7.5); DR(C.RING, 340, 203, 6.5, 5); DR(C.LAWN, 340, 203, 5); DR(C.PLANT, 340, 203, 1.2);
  DR(C.PATH, 319.5, 203, 3.6); DR(C.WATER, 319.5, 203, 2.6);
  RR(C.PATH, 259, 229, 264, 296); RR(C.PATH, 259, 291, 357, 296);    // paths round the CS lawn
  RR(C.HEDGE, 264, 235, 344, 291); RR(C.LAWN, 264.6, 235.6, 343.4, 290.4);
  RR(C.PAVE, 241, 229, 259, 467);                                   // paved promenade in front of C and D
  RR(C.PAVE, 200, 318, 241, 329); RR(C.PATH, 259, 318, 314, 328);    // Gate 4 walkway
  RR(C.PARK, 208, 404, 241, 466);                                   // parking
  RR(C.ROAD, 368, 226, 400, 236); RR(C.PATH, 374, 304, 400, 312); RR(C.PARK, 243, 459, 255, 470);   // Gates 1, 2, 3
  RR(C.PATH, 312, 314, 351, 355); RR(C.CB, 314, 316, 349, 333); RR(C.CT, 314, 333.6, 349, 353);
  DR(C.TRACK, 309, 408, 50); DR(C.FIELD, 309, 408, 48.5);
  RR(C.DIRT, 299, 406.6, 319, 409.4);                                // cricket pitch
  RR(C.DIRT, 369, 359, 388, 397); RR(C.TURF, 364, 408, 387, 446);
  RR(C.RAMP, 242, 388, 252, 400);                                   // D basement ramp (faculty parking)
  RR(C.STAIR, 242, 233, 250, 242);                                  // C basement stairs (cafe)
  for (let y = 300; y < 466; y += 22) RR(C.PLANT, 255, y, 258, y + 6);   // promenade planters
  for (let i = 0; i < grid.length; i++) { const c = grid[i]; if (c === C.WALL || c === C.HEDGE || c === C.WATER || c === C.PLANT) solid[i] = 2; }

  // ---------- buildings (plan rects in campus metres; walls extruded up, facades face the viewer) ----------
  const BLD = [
    { name: 'C Block', style: 'new', fl: 6, r: [[211, 229, 239, 318]], doors: [[273, 7]], label: [225, 273] },
    { name: 'D Block', style: 'new', fl: 6, r: [[210, 328, 240, 404]], doors: [[366, 6]], bsmt: [392, 400], label: [225, 366] },
    { name: 'B Block', style: 'old', roof: 'slate', fl: 4, r: [[212, 163, 238, 228], [212, 163, 274, 186]], doors: [[205, 4]], dome: [236, 190], label: [225, 196] },
    { name: 'A Block', style: 'old', roof: 'solar', fl: 4, r: [[283, 162, 358, 191]], doors: [[296, 4], [338, 4]], dome: [317, 186], label: [320, 176] },
    { style: 'plain', fl: 2, r: [[348, 322, 363, 351]] },
    { style: 'plain', fl: 1, r: [[250, 148, 274, 157]] },
    { style: 'plain', fl: 1, r: [[207, 450, 217, 466]] }, { style: 'plain', fl: 1, r: [[230, 458, 246, 467]] }, { style: 'plain', fl: 1, r: [[260, 459, 274, 467]] },
  ];
  BLD.forEach((b, i) => {
    b.id = i; b.H = b.fl * LV + 5;
    b.rects = b.r.map(([x0, y0, x1, y1]) => [MX(y1), MY(x0), MX(y0), MY(x1)]);
    b.X0 = Math.min(...b.rects.map(r => r[0])); b.X1 = Math.max(...b.rects.map(r => r[2]));
    b.PY0 = Math.min(...b.rects.map(r => r[1])); b.PY1 = Math.max(...b.rects.map(r => r[3]));
    b.doorsX = (b.doors || []).map(([y, w]) => [MX(y) - b.X0 - w * S / 2, w * S]);
    if (b.bsmt) b.bsmtX = [MX(b.bsmt[1]) - b.X0, MX(b.bsmt[0]) - b.X0];
  });
  const inB = (b, x, py) => { for (const r of b.rects) if (x >= r[0] && x < r[2] && py >= r[1] && py < r[3]) return true; return false; };
  function eachPixel(b, cb) {                       // cb(x, screenY, 1=roof|2=wall, planY|elevation)
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
  const CRX = MX(408), CRY = MY(309);              // cricket ground centre (px)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = grid[y * W + x], r = hash(x, y);
    let k;
    switch (c) {
      case C.GRASS: {
        const p = hash(x >> 4, y >> 4) < 0.3 ? -7 : hash((x + 8) >> 4, (y + 8) >> 4) < 0.25 ? 6 : 0;
        k = [111 + p, 176 + p, 74 + p];
        if (r < 0.06) k = [92, 152, 60];
        if (hash(x, y - 1) < 0.018) k = [76, 132, 52]; else if (hash(x, y) < 0.018) k = [150, 206, 98];   // grass tufts
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
      case C.STAIR: { const t = (y - MY(242)) / ((MY(250) - MY(242)) || 1); k = ((y >> 1) & 1) ? [110 + 100 * t, 104 + 100 * t, 98 + 96 * t] : [86 + 80 * t, 82 + 78 * t, 76 + 76 * t]; break; }
      default: k = [111, 176, 74];
    }
    put(D, x, y, k);
  }
  const mark = (X0, Y0, X1, Y1, c) => { for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (x >= 0 && y >= 0 && x < W && y < H) put(D, x, y, c); };
  const WH_ = [244, 244, 236], YEL = [236, 210, 120];
  // lane dashes on the four roads
  const yTop = MY(191.5), yBot = MY(407.5), xL = MX(477), xR = MX(131.5);
  for (let x = 0; x < W; x += 18) { mark(x, yTop, x + 9, yTop + 2, YEL); mark(x, yBot, x + 9, yBot + 2, YEL); }
  for (let y = 0; y < H; y += 18) { mark(xL, y, xL + 2, y + 9, YEL); mark(xR, y, xR + 2, y + 9, YEL); }
  for (let x = MX(329); x < MX(318); x += 6) mark(x, MY(185), x + 3, MY(199), WH_);          // zebra at Gate 4
  // parking stalls: covered lot rows and the D-side lot
  for (const [x0, x1] of [[349, 356], [361, 368], [371, 378], [381, 388]]) for (let y = 236; y < 295; y += 2.6) mark(MX(y), MY(x0), MX(y) + 1, MY(x1), [214, 214, 206]);
  for (const x0 of [210, 232]) for (let y = 405; y < 450; y += 2.6) mark(MX(y), MY(x0), MX(y) + 1, MY(x0 + 7), [214, 214, 206]);
  // court lines
  const box = (x0, y0, x1, y1, c) => { mark(MX(y1), MY(x0), MX(y0), MY(x0) + 1, c); mark(MX(y1), MY(x1) - 1, MX(y0), MY(x1), c); mark(MX(y1), MY(x0), MX(y1) + 1, MY(x1), c); mark(MX(y0) - 1, MY(x0), MX(y0), MY(x1), c); };
  box(315, 317, 348, 332, WH_); box(315, 334.5, 348, 352, WH_); mark(MX(324.5), MY(315), MX(324.5) + 1, MY(348), WH_); mark(MX(343.3), MY(315), MX(343.3) + 1, MY(348), WH_);
  for (const yy of [319.5, 329.5]) { const cx = MX(yy), cy = MY(331.5); for (let a = 0; a < 360; a += 3) put(D, Math.round(cx + 9 * Math.cos(a * Math.PI / 180)), Math.round(cy + 9 * Math.sin(a * Math.PI / 180)), [226, 120, 70]); }
  box(365, 409, 386, 445, WH_); mark(MX(427.5), MY(365), MX(427.5) + 1, MY(386), WH_);
  for (const x of [300.5, 317.5]) mark(MX(409.4), MY(x), MX(406.6), MY(x) + 1, WH_);
  // building shadows (cast right), dithered at the soft edge
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) {
    if (solid[y * W + x] !== 1 || solid[y * W + x + 1] === 1) continue;
    const len = Math.round(BLD[bid[y * W + x]].H * 0.32);
    for (let k = 1; k <= len && x + k < W && solid[y * W + x + k] !== 1; k++) {
      if (k > len - 3 && (x + k + y) & 1) continue;
      const o = (y * W + x + k) * 4; D[o] *= 0.7; D[o + 1] *= 0.72; D[o + 2] *= 0.8;
    }
  }
  // shade under the skybridge
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
      if (door) return [[64, 84, 100]];
      if (r >= 2 && r <= 5 && k >= 3 && k <= 5 && u > 2 && u < w - 3) return [r === 2 ? [140, 176, 200] : [76, 100, 120], hash(x >> 3, e >> 3) > 0.6 ? LIT : null];
      return [PW];
    }
    // new white blocks C / D: end towers with tall black slits, green curtain glass in the middle
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
    const solarOK = d >= 4 && (b.style === 'new' || b.roof === 'solar');
    if (solarOK) {
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
  // crisp dark outline around every building silhouette
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = bid[y * W + x]; if (id < 0) continue;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || bid[y * W + x - 1] !== id || bid[y * W + x + 1] !== id || bid[(y - 1) * W + x] !== id || bid[(y + 1) * W + x] !== id) put(D, x, y, OUT);
  }
  bg.putImageData(img, 0, 0);

  // ---------- props baked into the map ----------
  function pixelText(g, text, cx, y, col, outline) {
    const t = mk(text.length * 8 + 8, 16), tg = t.getContext('2d');
    tg.font = '8px Silkscreen'; tg.textBaseline = 'top'; tg.fillStyle = '#fff'; tg.fillText(text, 2, 2);
    const w = Math.ceil(tg.measureText(text).width), d = tg.getImageData(0, 0, t.width, t.height).data, ox = Math.round(cx - w / 2) - 2;
    const pts = [];
    for (let j = 0; j < t.height; j++) for (let i = 0; i < t.width; i++) if (d[(j * t.width + i) * 4 + 3] > 110) pts.push([i, j]);
    if (outline) for (const [i, j] of pts) P(g, outline, ox + i - 1, y + j - 1, 3, 3);
    for (const [i, j] of pts) P(g, col, ox + i, y + j);
  }
  const blockSolid = (X0, Y0, w, h) => { for (let y = Y0; y < Y0 + h; y++) for (let x = X0; x < X0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < H) solid[y * W + x] = 2; };
  // teal domes
  for (const b of BLD) if (b.dome) {
    const x = MX(b.dome[1]), y = MY(b.dome[0]) - b.H, r = 10;
    P(bg, '#1e1a28', x - r - 2, y - 10, 2 * r + 5, 11); P(bg, '#f0dfb8', x - r - 1, y - 9, 2 * r + 3, 9); P(bg, '#c8b48a', x - r - 1, y - 2, 2 * r + 3, 1);
    for (let i = -r + 1; i < r; i += 4) P(bg, '#40a096', x + i, y - 7, 2, 4);
    for (let j = -r - 1; j <= 0; j++) for (let i = -r - 1; i <= r + 1; i++) {
      const q = i * i + j * j * 1.3;
      if (q > (r + 1) * (r + 1)) continue;
      P(bg, q > r * r ? '#1e1a28' : i < -r / 3 && j < -r / 3 ? '#a6e4dc' : i > r / 3 ? '#2a7a74' : '#44aaa2', x + i, y - 10 + j);
    }
    P(bg, '#1e1a28', x - 1, y - 10 - r - 6, 3, 6); P(bg, '#f2c84b', x, y - 10 - r - 5, 1, 4);
  }
  // spiral staircase tower beside B
  { const X0 = MX(228) , X1 = MX(222), yb = MY(243), h = 50;
    for (let y = yb - h; y < yb; y++) for (let x = X0; x < X1; x++) {
      const e = yb - y, u = x - X0, edge = u === 0 || u === X1 - X0 - 1 || y === yb - h;
      P(bg, edge ? '#1e1a28' : ((u + e) % 8 < 2) ? '#8a4632' : ((u + e) % 8 < 3) ? '#5a3026' : (u < (X1 - X0) / 2 ? '#e8d4a8' : '#cdb88c'), x, y);
      solid[y * W + x] = 1;
    }
    P(bg, '#40a096', X0, yb - h + 1, X1 - X0, 3); }
  // blue water tanks on B, AC units on the flat roofs
  const roofKit = (b, n, fn) => {
    for (let k = 0, placed = 0; k < 80 && placed < n; k++) {
      const px = Math.round(b.X0 + 8 + hash(b.id, k) * (b.X1 - b.X0 - 16)), py = Math.round(b.PY0 + 8 + hash(k, b.id) * (b.PY1 - b.PY0 - 16));
      if (![[-7, -7], [7, 7], [-7, 7], [7, -7]].every(([dx, dy]) => inB(b, px + dx, py + dy))) continue;
      fn(px, py - b.H); placed++;
    }
  };
  roofKit(BLD[2], 6, (x, y) => { P(bg, 'rgba(0,0,0,.3)', x - 2, y + 1, 9, 2); P(bg, '#1e1a28', x - 4, y - 6, 9, 8); P(bg, '#2f6fb5', x - 3, y - 5, 7, 6); P(bg, '#5b98d8', x - 3, y - 5, 7, 2); P(bg, '#9cc8f0', x - 2, y - 5, 2, 1); });
  for (const b of BLD.slice(4)) roofKit(b, 2, (x, y) => { P(bg, '#1e1a28', x - 5, y - 4, 10, 6); P(bg, '#9aa0aa', x - 4, y - 3, 8, 4); P(bg, '#dfe2e8', x - 4, y - 3, 8, 1); P(bg, '#5a5e68', x - 1, y - 2, 3, 2); });
  // signs
  { const X = MX(273), Y = MY(239) - 13; P(bg, '#1e1a28', X - 28, Y - 1, 56, 11); P(bg, '#1f3a5f', X - 27, Y, 54, 9); pixelText(bg, 'LIBRARY', X, Y, '#f6f1de'); }
  pixelText(bg, 'CAFE', MX(237.5), MY(250) + 2, '#f6f1de', '#7a1a20');
  // Gate 4 pillars, guard booths at the gates
  const pillar = (X, Y) => { P(bg, '#1e1a28', X - 1, Y - 18, 10, 26); P(bg, '#efe6d2', X, Y - 17, 8, 24); P(bg, '#40a096', X, Y - 17, 8, 2); P(bg, '#bdb2a0', X, Y + 3, 8, 4); blockSolid(X, Y, 8, 8); };
  const gates = [[329, 318, MY(200), 'GATE 4'], [236, 226, MY(397), 'GATE 1'], [312, 304, MY(397), 'GATE 2']];
  for (const [y0, y1, Y] of gates) { pillar(MX(y0) - 8, Y); pillar(MX(y1), Y); }
  for (const Y of [MY(243) - 8, MY(255)]) pillar(MX(468) - 3, Y);                     // Gate 3 (south wall)
  const booth = (X, Y) => { P(bg, '#1e1a28', X - 1, Y - 17, 20, 19); P(bg, '#f0ebe0', X, Y - 16, 18, 6); P(bg, '#e3dccc', X, Y - 10, 18, 11); P(bg, '#4a6a88', X + 3, Y - 8, 7, 5); P(bg, '#8fb8d8', X + 3, Y - 8, 7, 1); blockSolid(X, Y - 6, 18, 7); };
  booth(MX(316), MY(205) + 6); booth(MX(242), MY(394)); booth(MX(463), MY(262));
  // parked cars: along the outer roads, in the covered lot and the D-side lot; motorbikes in the bike area
  const CARS = ['#f4f4f4', '#f4f4f4', '#c8ccd2', '#c8ccd2', '#26272e', '#b02a2a', '#2f5a9a', '#e0d8c2', '#3e424c'];
  function carV(g, x, y, col) {                 // car pointing up/down, (x,y) = bottom centre
    const c = hx(col);
    P(g, 'rgba(0,0,0,.28)', x - 5, y - 1, 11, 3); P(g, '#1e1a28', x - 5, y - 15, 10, 16);
    P(g, css(c), x - 4, y - 14, 8, 12); P(g, css(c, 0.74), x - 4, y - 3, 8, 2); P(g, css(c, 1.12), x - 3, y - 10, 6, 4);
    P(g, '#33445a', x - 3, y - 6, 6, 2); P(g, '#33445a', x - 3, y - 12, 6, 1); P(g, '#a8d0f0', x - 3, y - 6, 2, 1);
  }
  function carH(g, x, y, col, f, night) {        // car pointing left/right (f = +1 right)
    const c = hx(col);
    P(g, 'rgba(0,0,0,.28)', x - 8, y - 1, 17, 3); P(g, '#1e1a28', x - 9, y - 10, 18, 11);
    P(g, css(c), x - 8, y - 9, 16, 6); P(g, css(c, 0.74), x - 8, y - 3, 16, 2); P(g, css(c, 1.12), x - 4, y - 9, 8, 4);
    P(g, '#33445a', x + (f > 0 ? 3 : -5), y - 9, 2, 4); P(g, '#33445a', x + (f > 0 ? -5 : 3), y - 9, 2, 4);
    P(g, '#121016', x - 6, y, 3, 1); P(g, '#121016', x + 3, y, 3, 1);
    P(g, night ? '#fff3b0' : '#f2eedc', f > 0 ? x + 8 : x - 9, y - 4, 1, 2); P(g, '#d0302a', f > 0 ? x - 9 : x + 8, y - 4, 1, 2);
  }
  const hidden = (X0, Y0, w, h) => { for (let y = Y0; y < Y0 + h; y++) for (let x = X0; x < X0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < H && solid[y * W + x] === 1) return true; return false; };
  const parkV = (x, y, seed) => { if (hidden(x - 5, y - 15, 11, 17)) return; carV(bg, x, y, CARS[Math.floor(hash(seed, 3) * CARS.length)]); blockSolid(x - 4, y - 8, 8, 8); };
  for (const [x0, x1] of [[349, 356], [361, 368], [371, 378], [381, 388]]) for (let y = 237.3; y < 294; y += 2.6) if (hash(y * 10, x0) > 0.25) parkV(MX(y) - 4, MY(x1) - 2, y * 7 + x0);
  for (const x0 of [210, 232]) for (let y = 406.3; y < 449; y += 2.6) if (hash(y * 10, x0) > 0.3) parkV(MX(y) - 4, MY(x0 + 7) - 2, y * 5 + x0);
  for (let y = 140; y < 466; y += 3.2) if (hash(y * 10, 1) > 0.45 && (y < 314 || y > 333) && (y < 448 || y > 466)) parkV(MX(y) - 4, MY(199.5), y * 3);
  for (let y = 140; y < 466; y += 3.2) if (hash(y * 10, 2) > 0.5) parkV(MX(y) - 4, MY(401.5) + 14, y * 9);
  for (let x = MX(449); x < MX(425); x += 5) for (let y = MY(222); y < MY(246); y += 12) if (hash(x, y) > 0.2) {
    const col = CARS[Math.floor(hash(y, x) * CARS.length)];
    P(bg, '#1e1a28', x - 1, y - 7, 4, 9); P(bg, col, x, y - 6, 2, 4); P(bg, '#2a2a30', x, y - 2, 2, 3); blockSolid(x - 1, y - 3, 4, 3);
  }
  // benches along the lawns
  for (const [x, y] of [[259.5, 250], [259.5, 270], [300, 293.5], [330, 293.5], [278, 216.5], [310, 216.5], [246, 300], [246, 350]]) {
    const X = MX(y), Y = MY(x);
    P(bg, '#2a1d14', X - 6, Y - 5, 13, 7); P(bg, '#a06a3a', X - 5, Y - 4, 11, 2); P(bg, '#7a4c28', X - 5, Y - 1, 11, 1); P(bg, '#2a1d14', X - 4, Y, 1, 2); P(bg, '#2a1d14', X + 4, Y, 1, 2);
    blockSolid(X - 5, Y - 2, 11, 2);
  }
  const emitCv = mk(W, H); emitCv.getContext('2d').putImageData(emit, 0, 0);

  // overhead: skybridge (floors 3-4), Gate 4 beam, solar canopies over the covered parking
  const over = mk(W, H), og = over.getContext('2d');
  { const X0 = MX(328), X1 = MX(318), top = MY(216) - 41, front = MY(234) - 41, bot = MY(234) - 23;
    P(og, '#1e1a28', X0, top - 1, X1 - X0, bot - top + 2); P(og, '#d8d8d2', X0, top, X1 - X0, front - top); P(og, '#f4f4ee', X0, top, X1 - X0, 2);
    for (let x = X0; x < X1; x++) P(og, x % 5 === 0 ? '#1e5040' : '#3c8868', x, front, 1, bot - front - 2);
    P(og, '#7ec8a4', X0, front, X1 - X0, 1); P(og, '#bab8b0', X0, bot - 2, X1 - X0, 2); }
  for (const [y0, y1, Yl, text] of gates) { const X0 = MX(y0) - 9, X1 = MX(y1) + 9, Y = Yl - 22; P(og, '#1e1a28', X0, Y, X1 - X0, 12); P(og, '#1f3a5f', X0 + 1, Y + 1, X1 - X0 - 2, 10); pixelText(og, text, (X0 + X1) / 2, Y + 2, '#f6f1de'); }
  for (const [x0, x1] of [[349, 356], [361, 368], [371, 378], [381, 388]]) {
    const X0 = MX(295), X1 = MX(235), Y0 = MY(x0) - 14, Y1 = MY(x1) - 14;
    P(og, '#1e1a28', X0 - 1, Y0 - 1, X1 - X0 + 2, Y1 - Y0 + 2);
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) P(og, (x - X0) % 7 === 0 ? '#1a2a5a' : y === Y0 ? '#7aa0e0' : ((y - Y0) % 5 === 0 ? '#24408a' : '#3460b8'), x, y);
    for (let x = X0 + 6; x < X1; x += 40) { P(og, '#1e1a28', x, Y1, 2, 14); blockSolid(x, Y1 + 12, 2, 2); }
  }

  // ---------- trees + lamps (y-sorted with people) ----------
  function makeTree(seed, type) {
    const s = 0.8 + hash(seed, 1) * 0.45, cv = mk(40, 52), g = cv.getContext('2d'), bx = 20, by = 48;
    const blob = (cx, cy, r, col, sd) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d > r * r || (d > (r - 1.5) * (r - 1.5) && hash(x + sd, y * 7 + sd) < 0.3)) continue;
        P(g, col, cx + x, cy + y);
      }
    };
    if (type === 'pine') {
      P(g, '#6b4426', bx - 1, by - 8, 3, 8);
      for (let k = 0; k < 4; k++) {
        const w = Math.round((11 - k * 2.2) * s), yy = Math.round(by - 6 - k * 7 * s);
        for (let r = 0; r < 9; r++) { const hw = Math.round(w * (r + 1) / 9); P(g, '#2e6a3c', bx - hw, yy - 9 + r, hw * 2 + 1, 1); P(g, '#4c9a58', bx - hw, yy - 9 + r, Math.max(1, hw - 1), 1); }
      }
    } else {
      const Rr = Math.round((type === 'small' ? 7 : 11) * s);
      P(g, '#6b4426', bx - 2, by - 9, 4, 9); P(g, '#8e5e34', bx - 2, by - 9, 1, 9);
      blob(bx, by - 8 - Rr, Rr, '#2f6a2e', seed); blob(bx - 2, by - 10 - Rr, Rr - 2, '#4a8f3c', seed + 1);
      blob(bx - 4, by - 13 - Rr, Math.round(Rr / 2), '#74b450', seed + 2);
      for (let i = 0; i < 10; i++) P(g, '#a0d470', bx - 7 + hash(seed, i) * 10, by - 10 - Rr * 1.6 + hash(i, seed) * Rr);
    }
    // outline the sprite, then lay the soft ground shadow underneath
    const id = g.getImageData(0, 0, 40, 52), d = id.data, op = i => d[i * 4 + 3] === 255;
    const edge = [];
    for (let y = 0; y < 52; y++) for (let x = 0; x < 40; x++) {
      const i = y * 40 + x;
      if (!op(i) && ((x > 0 && op(i - 1)) || (x < 39 && op(i + 1)) || (y > 0 && op(i - 40)) || (y < 51 && op(i + 40)))) edge.push([x, y]);
    }
    for (const [x, y] of edge) P(g, '#1c3420', x, y);
    g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(20,40,20,.3)';
    for (let y = -3; y <= 3; y++) for (let x = -12; x <= 12; x++) if (x * x / 144 + y * y / 9 <= 1) g.fillRect(bx + x + 4, by + y - 1, 1, 1);
    return cv;
  }
  function makeBanyan() {
    const cv = mk(120, 100), g = cv.getContext('2d'), bx = 60, by = 92;
    const blob = (cx, cy, r, col, sd) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y * 1.3; if (d > r * r || (d > (r - 2) * (r - 2) && hash(x + sd, y * 5 + sd) < 0.3)) continue; P(g, col, cx + x, cy + y); } };
    const ell = (cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (x * x / (rx * rx) + y * y / (ry * ry) <= 1) P(g, col, bx + x, cy + y); };
    ell(by - 2, 28, 9, '#1e1a28'); ell(by - 2, 27, 8, '#9a907c'); ell(by - 5, 27, 8, '#d8ceb8'); ell(by - 6, 22, 5, '#e8e0cc');   // stone platform
    for (const x of [-40, -34, -27, -21, 19, 25, 32, 39]) P(g, '#7a5a3c', bx + x, by - 48 + (x & 3), 1, 40 - (x & 3));            // aerial roots
    for (const [x, w] of [[-7, 14], [-15, 4], [11, 4]]) { P(g, '#5e4028', bx + x, by - 50, w, 44); P(g, '#7d5a3a', bx + x, by - 50, 1, 44); }
    for (const [cx, cy, r] of [[0, -62, 30], [-27, -55, 20], [27, -55, 20], [-14, -74, 18], [14, -74, 18]]) blob(bx + cx, by + cy, r, '#2a5a2a', cx + 50);
    for (const [cx, cy, r] of [[-2, -65, 26], [-28, -58, 16], [24, -58, 16], [-16, -77, 14], [12, -77, 14]]) blob(bx + cx, by + cy, r, '#3f7f38', cx + 90);
    for (const [cx, cy, r] of [[-18, -80, 9], [4, -82, 8], [-32, -62, 7], [20, -66, 7]]) blob(bx + cx, by + cy, r, '#6aa84a', cx + 130);
    for (let i = 0; i < 26; i++) P(g, '#9ccc6a', bx - 40 + hash(i, 77) * 70, by - 90 + hash(77, i) * 40);
    const d = g.getImageData(0, 0, 120, 100).data, op = i => d[i * 4 + 3] === 255, edge = [];
    for (let y = 0; y < 100; y++) for (let x = 0; x < 120; x++) { const i = y * 120 + x; if (!op(i) && ((x > 0 && op(i - 1)) || (x < 119 && op(i + 1)) || (y > 0 && op(i - 120)) || (y < 99 && op(i + 120)))) edge.push([x, y]); }
    for (const [x, y] of edge) P(g, '#1c3420', x, y);
    g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(20,40,20,.3)';
    for (let y = -10; y <= 10; y++) for (let x = -50; x <= 50; x++) if (x * x / 2500 + y * y / 100 <= 1) g.fillRect(bx + x + 8, by + y - 4, 1, 1);
    return cv;
  }
  const TS = []; for (let i = 0; i < 12; i++) TS.push(makeTree(i * 31 + 7, i < 7 ? 'round' : i < 10 ? 'pine' : 'small'));
  const ok = (X, Y, r) => {
    for (const [dx, dy] of [[0, 0], [-r, 0], [r, 0], [0, -r], [0, r]]) {
      const x = X + dx, y = Y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || solid[y * W + x] || grid[y * W + x] !== C.GRASS) return false;
    }
    return true;
  };
  const trees = [], addTree = (X, Y, spr) => { trees.push({ X, Y, spr }); blockSolid(X - 1, Y - 1, 3, 2); };
  // denser where the satellite shows tree belts: inside the walls, the band south of the front lawn, the east strip
  const density = (x, y) => (x > 368 && x < 397) ? 0.6 : (y > 214 && y < 236 && x > 239 && x < 357) ? 0.75 : (x < 211 || y < 142 || y > 462) ? 0.5 : 0.18;
  for (let Y = 6; Y < H; Y += 12) for (let X = 6; X < W; X += 12) {
    const jx = Math.round(X + (hash(X, Y) - 0.5) * 8), jy = Math.round(Y + (hash(Y, X) - 0.5) * 8);
    const x = jy / S + 183, y = 484 - jx / S;
    if (hash(X * 3, Y * 7) < density(x, y) && ok(jx, jy, 6) && ok(jx, jy - 12, 3)) addTree(jx, jy, TS[Math.floor(hash(X, Y * 3) * TS.length)]);
  }
  { const X = MX(243), Y = MY(279);                                   // the Wisdom Tree
    for (let i = trees.length - 1; i >= 0; i--) if (Math.abs(trees[i].X - X) < 50 && Math.abs(trees[i].Y - Y) < 30) trees.splice(i, 1);
    trees.push({ X, Y, spr: makeBanyan(), ox: 60, oy: 92 }); blockSolid(X - 24, Y - 8, 48, 10); }
  const lamps = [], addLamp = (x, y) => {
    const X = MX(y), Y = MY(x);
    for (let k = 0; k < 20; k++) if (Y - k >= 0 && solid[(Y - k) * W + X] === 1) return;   // never stand on or in front of a wall
    lamps.push({ X, Y }); blockSolid(X, Y - 1, 1, 2);
  };
  for (let y = 236; y < 466; y += 18) addLamp(258.5, y);
  for (let y = 236; y < 296; y += 15) addLamp(259.5, y + 6);
  for (let x = 262; x < 312; x += 12) addLamp(x, 317.5);
  for (let y = 190; y < 356; y += 20) addLamp(238.5, y);
  for (let y = 142; y < 466; y += 24) addLamp(204, y);

  // ---------- moving cars: two loops around the campus (left-hand traffic, never tilted) ----------
  const laneT = [MY(186.5), MY(196)], laneB = [MY(411.5), MY(403)], laneL = [MX(480.5), MX(473.5)], laneR = [MX(129.5), MX(134)];
  const loops = [
    { pts: [[laneL[0], laneT[0]], [laneR[0], laneT[0]], [laneR[0], laneB[0]], [laneL[0], laneB[0]]], v: 0.8 },   // clockwise, outer lanes
    { pts: [[laneL[1], laneT[1]], [laneL[1], laneB[1]], [laneR[1], laneB[1]], [laneR[1], laneT[1]]], v: 0.65 },  // counter-clockwise, inner lanes
  ];
  for (const L of loops) { L.cum = [0]; for (let i = 1; i <= 4; i++) { const a = L.pts[i - 1], b = L.pts[i % 4]; L.cum.push(L.cum[i - 1] + Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1])); } L.len = L.cum[4]; }
  const cars = [];
  loops.forEach((L, li) => { for (let i = 0; i < 8; i++) cars.push({ L, s: (i + hash(i, li) * 0.4) * L.len / 8, col: CARS[Math.floor(hash(i, 40 + li) * CARS.length)], x: 0, y: 0, dx: 1, dy: 0 }); });
  function stepCar(c) {
    c.s = (c.s + c.L.v) % c.L.len;
    let i = 0; while (c.s >= c.L.cum[i + 1]) i++;
    const a = c.L.pts[i], b = c.L.pts[(i + 1) % 4], t = (c.s - c.L.cum[i]) / (c.L.cum[i + 1] - c.L.cum[i]);
    c.x = a[0] + (b[0] - a[0]) * t; c.y = a[1] + (b[1] - a[1]) * t + 5; c.dx = Math.sign(b[0] - a[0]); c.dy = Math.sign(b[1] - a[1]);
  }

  // ---------- chibi students ----------
  const pick = (a, h) => a[Math.floor(h * a.length) % a.length];
  const SKIN = ['#f7d4b0', '#ebb88e', '#d39a6a', '#b0764a', '#8a5836'], HAIR = ['#1d1917', '#2b1d14', '#3a2a1f', '#5c3b25'];
  const TOP = ['#f4f1e8', '#b8323a', '#2f5a9a', '#3a8a5e', '#e07aa0', '#f0b444', '#4c4c58', '#8fc0dc', '#7a54a8', '#e6dcc4'], BOT = ['#2c3658', '#3c3c44', '#f4f1e8', '#5c4834', '#1e1e24'];
  const look = s => { const t = pick(TOP, hash(s, 1)); return { skin: pick(SKIN, hash(s, 2)), hair: pick(HAIR, hash(s, 3)), top: t, top2: css(hx(t), 0.78), pants: pick(BOT, hash(s, 4)), scarf: hash(s, 5) < 0.3 ? pick(['#e07aa0', '#2f5a9a', '#f4f1e8', '#3a8a5e', '#b8323a'], hash(s, 6)) : null, bag: hash(s, 7) < 0.6 ? pick(['#3e424c', '#b8323a', '#2f5a9a', '#5c4834'], hash(s, 8)) : null }; };
  function person(g, x, y, dir, fr, L) {
    x = Math.round(x); y = Math.round(y);
    const st = [0, 1, 0, -1][fr], side = dir === 'left' || dir === 'right', fl = dir === 'left' ? -1 : 1, parts = [];
    P(g, 'rgba(20,20,30,.25)', x - 4, y - 1, 9, 2);
    if (side) parts.push([L.pants, x - 1 + st, y - 3, 2, 3], [L.pants, x - 1 - st, y - 3, 2, 3]);
    else parts.push([L.pants, x - 2, y - 3 - (st > 0 ? 1 : 0), 2, 3], [L.pants, x + 1, y - 3 - (st < 0 ? 1 : 0), 2, 3]);
    const by = y - 7 - (fr % 2), hy = by - 7, hc = L.scarf || L.hair;
    if (L.bag && dir !== 'down') parts.push([L.bag, side ? (fl > 0 ? x - 4 : x + 2) : x - 2, by, side ? 2 : 5, 4]);
    parts.push([L.top, x - 3, by, 7, 5]);
    if (!side) parts.push([L.top2, x - 4, by + 1 + st, 1, 3], [L.top2, x + 4, by + 1 - st, 1, 3]); else parts.push([L.top2, x + st * fl, by + 1, 2, 3]);
    parts.push([L.skin, x - 3, hy, 7, 7]);                            // big chibi head
    if (dir === 'up') parts.push([hc, x - 3, hy - 1, 7, L.scarf ? 8 : 6]);
    else if (side) parts.push([hc, x - 3, hy - 1, 7, 3], [hc, fl > 0 ? x - 3 : x + 1, hy, 3, L.scarf ? 7 : 5]);
    else parts.push([hc, x - 3, hy - 1, 7, 3], [hc, x - 3, hy, 1, L.scarf ? 7 : 4], [hc, x + 3, hy, 1, L.scarf ? 7 : 4]);
    for (const [, px, py, w, h] of parts) P(g, '#1a1620', px - 1, py - 1, w + 2, h + 2);
    for (const [c, px, py, w, h] of parts) P(g, c, px, py, w, h);
    if (dir === 'down') { P(g, '#1d1917', x - 2, hy + 3, 1, 2); P(g, '#1d1917', x + 2, hy + 3, 1, 2); P(g, '#f08a8a', x - 3, hy + 5); P(g, '#f08a8a', x + 3, hy + 5); }
    else if (side) P(g, '#1d1917', x + fl * 2, hy + 3, 1, 2);
  }
  const WALKC = new Set([C.PAVE, C.PATH, C.LAWN, C.FIELD, C.TRACK, C.CB, C.CT, C.TURF]);
  const free = (x, y, npc) => {
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, 0], [0, -2]]) {
      const xx = Math.round(x + dx), yy = Math.round(y + dy);
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || solid[yy * W + xx] || (npc && !WALKC.has(grid[yy * W + xx]))) return false;
    }
    return true;
  };
  const npcs = [];
  for (let k = 0; npcs.length < 80 && k < 30000; k++) {
    const x = hash(k, 900) * W, y = hash(k, 901) * H;
    if (free(x, y, true)) npcs.push({ x, y, dx: 0, dy: 0, timer: 0, t: 0, dir: 'down', look: look(k) });
  }
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function stepNpc(n) {
    if (--n.timer <= 0) { const d = Math.random() < 0.3 ? [0, 0] : DIRS[Math.floor(Math.random() * 4)]; n.dx = d[0] * 0.4; n.dy = d[1] * 0.4; n.timer = 60 + Math.random() * 260; }
    if (!n.dx && !n.dy) return;
    if (free(n.x + n.dx, n.y + n.dy, true)) { n.x += n.dx; n.y += n.dy; n.t++; } else n.timer = 0;
    n.dir = n.dx > 0 ? 'right' : n.dx < 0 ? 'left' : n.dy > 0 ? 'down' : 'up';
  }

  // ---------- places ----------
  const at2 = (x, y) => [MX(y), MY(x)];
  const PLACES = [
    ['Gate 4', 207, 323, 'Main pedestrian gate on the H-11 service road'],
    ['C Block · Library', 242, 273, 'Library on the ground floor · 6 floors'],
    ['Cafe', 246, 244, 'Basement of C Block · stairs down'],
    ['D Block', 242, 366, '6 floors'],
    ['Faculty Parking', 248, 386, 'Basement of D Block · ramp down'],
    ['Skybridge', 222, 323, 'Links C and D Blocks'],
    ['B Block', 240, 214, 'Spiral staircase by the front lawn'],
    ['A Block', 320, 193, 'Teal dome over the front lawn'],
    ['Front Lawn', 300, 203, 'Sunken circles and the fountain'],
    ['CS Lawn', 304, 263, ''],
    ['Cricket Ground', 309, 408, ''],
    ['Courts', 331, 334, 'Basketball and tennis'],
    ['Covered Parking', 368, 265, 'Solar canopies'],
    ['Parking', 236, 437, 'Cars and bikes'],
    ['Turf', 375, 427, 'Futsal turf'],
    ['Wisdom Tree', 283, 243, 'The old banyan at the corner of the CS lawn'],
    ['Gate 1', 392, 231, 'East gate · cars to the covered parking'],
    ['Gate 2', 392, 308, 'East gate'],
    ['Gate 3', 249, 462, 'South gate by the parking'],
  ].map(([n, x, y, sub]) => { const [X, Y] = at2(x, y); return { n, X, Y, sub }; });
  const LABELS = [
    ...BLD.filter(b => b.label).map(b => { const [X, Y] = at2(...b.label); return { t: b.name, X, Y: Y - b.H - 4 }; }),
    ...[['Gate 4', 190, 323], ['Cafe ↓', 246, 237], ['Faculty Parking ↓', 247, 394], ['Cricket Ground', 300, 392], ['CS Lawn', 280, 250], ['Front Lawn', 300, 194], ['Courts', 331, 340], ['Parking', 225, 420], ['Gate 1', 407, 231], ['Gate 2', 407, 308], ['Gate 3', 249, 477]]
      .map(([t, x, y]) => { const [X, Y] = at2(x, y); return { t, X, Y }; }),
  ];
  LABELS.push({ t: 'Wisdom Tree', X: MX(243), Y: MY(279) - 100 });

  // ---------- Cafe: the basement under C Block, its own indoor scene (walk onto the stairs to enter) ----------
  const cafe = (() => {
    const CW = 320, CH = 210, cvs = mk(CW, CH), g = cvs.getContext('2d'), sol = new Uint8Array(CW * CH);
    const block = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < CW && j < CH) sol[j * CW + i] = 1; };
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const t = ((x >> 4) + (y >> 4)) & 1, r = hash(x + 7000, y);
      P(g, t ? (r < 0.05 ? '#dcb88c' : '#e8c89c') : (r < 0.05 ? '#c08a64' : '#cc9670'), x, y);
    }
    // back wall with wood wainscot; side and front walls
    P(g, '#2c2230', 0, 0, CW, 5); P(g, '#f3e6c8', 0, 5, CW, 27); P(g, '#e2d2b0', 0, 30, CW, 2); P(g, '#8a5a3a', 0, 32, CW, 12); P(g, '#a8744c', 0, 32, CW, 2); P(g, '#5e3c26', 0, 43, CW, 2);
    for (let x = 8; x < CW; x += 16) P(g, '#7a4c30', x, 34, 1, 9);
    P(g, '#2c2230', 0, 0, 7, CH); P(g, '#2c2230', CW - 7, 0, 7, CH); P(g, '#2c2230', 0, CH - 6, CW, 6); P(g, '#4a3a40', 7, 45, 2, CH - 51); P(g, '#4a3a40', CW - 9, 45, 2, CH - 51);
    block(0, 0, 264, 46); block(304, 0, CW - 304, 46); block(0, 0, 9, CH); block(CW - 9, 0, 9, CH); block(0, CH - 6, CW, 6);
    // stairs up to the campus (daylight at the top)
    for (let y = 0; y < 46; y++) { const t = 1 - y / 46; P(g, css([150 + 100 * t, 140 + 100 * t, 128 + 100 * t]), 264, y, 40, 1); if (y % 5 === 0) P(g, '#6a5a50', 264, y, 40, 1); }
    P(g, '#fff6d8', 266, 0, 36, 3); P(g, '#2c2230', 262, 0, 2, 46); P(g, '#2c2230', 304, 0, 2, 46);
    P(g, '#1e1a28', 236, 10, 26, 12); P(g, '#2f8f4f', 237, 11, 24, 10); pixelText(g, 'EXIT', 249, 12, '#f6f1de');
    // menu board, posters, clock
    P(g, '#5e3c26', 58, 7, 104, 23); P(g, '#26262c', 60, 9, 100, 19); pixelText(g, 'CAFE', 110, 10, '#ffd27a');
    for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) { P(g, '#e8e8e0', 66 + c * 32, 20 + r * 4, 14, 1); P(g, '#ffd27a', 84 + c * 32, 20 + r * 4, 4, 1); }
    P(g, '#1e1a28', 186, 9, 18, 18); P(g, '#5fd3a4', 187, 10, 16, 16); P(g, '#f0b444', 191, 14, 8, 8);
    P(g, '#1e1a28', 208, 9, 18, 18); P(g, '#e07aa0', 209, 10, 16, 16); P(g, '#f4f1e8', 213, 13, 8, 10);
    P(g, '#1e1a28', 170, 11, 9, 9); P(g, '#f4f1e8', 171, 12, 7, 7); P(g, '#1e1a28', 174, 13, 1, 3); P(g, '#1e1a28', 174, 15, 2, 1);
    // baristas behind the counter, then the counter itself
    person(g, 96, 50, 'down', 0, look(321)); person(g, 140, 50, 'down', 0, look(333));
    P(g, '#1e1a28', 29, 45, 163, 25); P(g, '#c88a54', 30, 46, 161, 8); P(g, '#e0a868', 30, 46, 161, 2); P(g, '#7a4a2a', 30, 54, 161, 14); P(g, '#4a2c18', 30, 67, 161, 2);
    for (let x = 40; x < 190; x += 20) P(g, '#6a3e22', x, 56, 1, 10);
    P(g, '#1e1a28', 36, 34, 17, 14); P(g, '#9aa0aa', 37, 35, 15, 12); P(g, '#d8dce2', 37, 35, 15, 2); P(g, '#d03030', 40, 39, 2, 2); P(g, '#3a3a44', 44, 41, 6, 4);
    P(g, '#1e1a28', 66, 40, 54, 11); P(g, '#c8eef6', 67, 41, 52, 9); for (let i = 0; i < 8; i++) P(g, ['#e0a050', '#c86a3a', '#f0d080'][i % 3], 69 + i * 6, 45, 4, 3);
    P(g, '#1e1a28', 155, 39, 15, 11); P(g, '#3a3a44', 156, 40, 13, 9); P(g, '#5fd3a4', 158, 41, 9, 3);
    for (const x of [126, 132]) { P(g, '#f8f8f0', x, 44, 3, 3); P(g, '#7a4a2a', x + 1, 44, 1, 1); }
    block(29, 46, 163, 24);
    // water cooler and plants
    P(g, '#1e1a28', 213, 33, 11, 25); P(g, '#7ac8f0', 214, 34, 9, 9); P(g, '#e8e8f0', 214, 43, 9, 14); P(g, '#3a7ad0', 216, 47, 2, 2); block(213, 46, 11, 12);
    const plant = (x, y) => {
      P(g, '#1e1a28', x - 5, y - 7, 11, 8); P(g, '#c86a3a', x - 4, y - 6, 9, 6); P(g, '#e08a54', x - 4, y - 6, 9, 1);
      for (let i = 0; i < 26; i++) { const a = hash(x + i, y) * 6.28, r = hash(i, x + y) * 7; P(g, i % 3 ? '#3f8f3c' : '#6ab04c', x + Math.cos(a) * r, y - 12 + Math.sin(a) * r * 0.8, 2, 2); }
      block(x - 5, y - 6, 11, 6);
    };
    plant(18, 64); plant(18, 200); plant(300, 200); plant(232, 64);
    // warm ceiling lights
    g.globalCompositeOperation = 'lighter';
    for (const [x, y] of [[80, 100], [190, 100], [80, 165], [190, 165], [285, 130]]) { const gr = g.createRadialGradient(x, y, 0, x, y, 46); gr.addColorStop(0, 'rgba(255,200,120,.16)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(x - 46, y - 46, 92, 92); }
    g.globalCompositeOperation = 'source-over';
    // tables with students (separate sprites so the player sorts in front of / behind them)
    const items = [];
    const table = seed => {
      const t = mk(48, 40), q = t.getContext('2d'), cx = 24, cy = 30;
      for (const dx of [-15, 15]) { P(q, '#1e1a28', cx + dx - 4, cy - 9, 9, 11); P(q, '#a0663a', cx + dx - 3, cy - 8, 7, 9); P(q, '#c88a54', cx + dx - 3, cy - 8, 7, 2); }
      for (const [dx, dir, k] of [[-15, 'right', 1], [15, 'left', 2]]) if (hash(seed, k) > 0.35) person(q, cx + dx, cy, dir, 0, look(seed * 7 + k));
      P(q, '#1e1a28', cx - 10, cy - 12, 21, 12); P(q, '#e0a868', cx - 9, cy - 11, 19, 2); P(q, '#c88a54', cx - 9, cy - 9, 19, 5); P(q, '#7a4a2a', cx - 9, cy - 4, 19, 3);
      P(q, '#1e1a28', cx - 7, cy - 1, 2, 3); P(q, '#1e1a28', cx + 5, cy - 1, 2, 3);
      P(q, '#f8f8f0', cx - 6, cy - 10, 3, 2); P(q, '#f8f8f0', cx + 3, cy - 10, 3, 2); if (hash(seed, 3) > 0.5) P(q, '#d04040', cx - 2, cy - 11, 4, 3);
      return t;
    };
    const spots = [[56, 100], [112, 100], [168, 100], [224, 100], [282, 104], [56, 150], [112, 150], [168, 150], [224, 150], [282, 154], [84, 194], [196, 194]];
    for (const [tx, ty] of spots) { items.push({ x: tx - 24, y: ty - 30, by: ty, cv: table(tx * 3 + ty) }); block(tx - 19, ty - 6, 38, 6); }
    for (const [x, y, sd] of [[92, 80, 501], [108, 84, 502], [124, 82, 503]]) {      // queue at the counter
      const t = mk(16, 26); person(t.getContext('2d'), 8, 24, 'up', 0, look(sd)); items.push({ x: x - 8, y: y - 24, by: y, cv: t }); block(x - 3, y - 2, 7, 2);
    }
    const free = (x, y) => { for (const [dx, dy] of [[-3, 0], [3, 0], [0, 0], [0, -2]]) { const i = Math.round(x + dx), j = Math.round(y + dy); if (i < 0 || j < 0 || i >= CW || j >= CH || sol[j * CW + i]) return false; } return true; };
    return { W: CW, H: CH, cv: cvs, items, free, spawn: [284, 64], exitX0: 266, exitX1: 302, exitY: 44 };
  })();

  // ---------- player, camera, input ----------
  const [sx0, sy0] = at2(214, 323);
  const me = { x: sx0, y: sy0, tx: null, ty: null, dir: 'down', t: 0, stuck: 0, look: { skin: '#d39a6a', hair: '#1d1917', top: '#5fd3a4', top2: '#3e9e78', pants: '#2c3658', scarf: null, bag: '#3e424c' } };
  const cv = $('#c'), ctx = cv.getContext('2d');
  let dpr = 1, zoom = innerWidth > 1400 ? 3 : 2;
  const scale = () => Math.max(1, Math.round(zoom * dpr));
  const resize = () => { dpr = devicePixelRatio || 1; cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); };
  addEventListener('resize', resize); resize();
  const pkHour = () => +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' }).format(new Date());
  let night = pkHour() < 6 || pkHour() >= 18, nightT = night ? 1 : 0, camX = 0, camY = 0;
  const nightBtn = $('#nightBtn'), syncBtn = () => { nightBtn.textContent = night ? 'Day' : 'Night'; };
  nightBtn.onclick = () => { night = !night; syncBtn(); nightBtn.blur(); }; syncBtn();
  const keys = new Set();
  addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase(); keys.add(k);
    if (k === 'n') { night = !night; syncBtn(); }
    if (k === '+' || k === '=') zoom = Math.min(6, zoom + 1);
    if (k === '-') zoom = Math.max(1, zoom - 1);
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom + (e.deltaY < 0 ? 1 : -1), 1, 6); }, { passive: false });
  cv.addEventListener('click', e => { const s = scale(); me.tx = camX + e.clientX * dpr / s; me.ty = camY + e.clientY * dpr / s; me.stuck = 0; });
  const clock = $('#clock'), tick = () => { clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' }).format(new Date()) + ' PKT'; };
  tick(); setInterval(tick, 10000);
  const nearestFree = (x, y) => { for (let r = 0; r < 160; r += 2) for (let a = 0; a < 16; a++) { const xx = x + Math.cos(a * Math.PI / 8) * r, yy = y + Math.sin(a * Math.PI / 8) * r; if (free(xx, yy)) return [xx, yy]; } return [x, y]; };
  const gotoSel = $('#goto');
  PLACES.forEach((p, i) => { const o = document.createElement('option'); o.value = i; o.textContent = p.n; gotoSel.append(o); });
  gotoSel.onchange = () => {
    const p = PLACES[+gotoSel.value];
    if (p && p.n === 'Cafe') { scene = 'cafe'; [me.x, me.y] = cafe.spawn; fade = 1; }
    else if (p) { scene = 'campus'; [me.x, me.y] = nearestFree(p.X, p.Y); }
    me.tx = null; gotoSel.value = ''; gotoSel.blur();
  };
  const mini = $('#mini'), MW = 440, MH = Math.round(MW * H / W);
  mini.width = MW; mini.height = MH;
  const mctx = mini.getContext('2d');
  mini.addEventListener('click', e => { const r = mini.getBoundingClientRect(); [me.x, me.y] = nearestFree((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H); me.tx = null; });
  const nearEl = $('#near'); let lastNear = null;

  // ---------- scenes (campus / cafe) ----------
  let scene = 'campus', fade = 0, armed = true;     // armed: the stairs only trigger again after you stop once
  const walk = (x, y) => scene === 'cafe' ? cafe.free(x, y) : free(x, y);
  function drawFade() {
    if (fade <= 0) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(10,8,16,${fade})`; ctx.fillRect(0, 0, cv.width, cv.height);
    fade = Math.max(0, fade - 0.05);
  }
  function drawCafe(moving) {
    const s = scale(), vw = cv.width / s, vh = cv.height / s;
    camX = vw >= cafe.W ? (cafe.W - vw) / 2 : clamp(me.x - vw / 2, 0, cafe.W - vw);
    camY = vh >= cafe.H ? (cafe.H - vh) / 2 : clamp(me.y - 8 - vh / 2, 0, cafe.H - vh);
    camX = Math.round(camX * s) / s; camY = Math.round(camY * s) / s;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#14101a'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cafe.cv, 0, 0);
    const list = cafe.items.map(it => ({ y: it.by, f: () => ctx.drawImage(it.cv, it.x, it.y) }));
    list.push({ y: me.y, f: () => person(ctx, me.x, me.y, me.dir, moving ? Math.floor(me.t / 7) % 4 : 0, me.look) });
    list.sort((a, b) => a.y - b.y).forEach(o => o.f());
    if (lastNear !== 'cafe') { lastNear = 'cafe'; nearEl.classList.remove('hidden'); nearEl.innerHTML = '<b></b><small></small>'; nearEl.firstChild.textContent = 'Cafe · C Block basement'; nearEl.lastChild.textContent = 'Take the stairs (top right) back up to campus'; }
    drawFade();
  }

  // ---------- frame ----------
  const dark = mk(8, 8), dg = dark.getContext('2d');
  function frame() {
    let vx = 0, vy = 0;
    if (keys.has('arrowleft') || keys.has('a')) vx--;
    if (keys.has('arrowright') || keys.has('d')) vx++;
    if (keys.has('arrowup') || keys.has('w')) vy--;
    if (keys.has('arrowdown') || keys.has('s')) vy++;
    if (vx || vy) me.tx = null;
    else if (me.tx !== null) { const dx = me.tx - me.x, dy = me.ty - me.y, d = Math.hypot(dx, dy); if (d < 1.5 || me.stuck > 25) me.tx = null; else { vx = dx / d; vy = dy / d; } }
    const moving = !!(vx || vy);
    if (moving) {
      const sp = (keys.has('shift') ? 2.4 : 1.2) / Math.hypot(vx, vy), ox = me.x, oy = me.y;
      if (walk(me.x + vx * sp, me.y)) me.x += vx * sp;
      if (walk(me.x, me.y + vy * sp)) me.y += vy * sp;
      me.stuck = Math.abs(me.x - ox) + Math.abs(me.y - oy) < 0.2 ? me.stuck + 1 : 0;
      me.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up'); me.t++;
    }
    if (!armed && !moving) armed = true;
    if (scene === 'campus' && armed && grid[Math.round(me.y) * W + Math.round(me.x)] === C.STAIR) { scene = 'cafe'; [me.x, me.y] = cafe.spawn; me.tx = null; me.dir = 'down'; fade = 1; }
    else if (scene === 'cafe' && me.y < cafe.exitY && me.x > cafe.exitX0 && me.x < cafe.exitX1) { scene = 'campus'; [me.x, me.y] = nearestFree(MX(237.5), MY(254)); me.tx = null; me.dir = 'down'; fade = 1; armed = false; }
    cars.forEach(stepCar); npcs.forEach(stepNpc);
    nightT += ((night ? 1 : 0) - nightT) * 0.06;
    const isN = nightT > 0.5;
    if (scene === 'cafe') { drawCafe(moving); requestAnimationFrame(frame); return; }

    const s = scale(), vw = cv.width / s, vh = cv.height / s;
    camX = vw >= W ? (W - vw) / 2 : clamp(me.x - vw / 2, 0, W - vw);
    camY = vh >= H ? (H - vh) / 2 : clamp(me.y - 8 - vh / 2, 0, H - vh);
    camX = Math.round(camX * s) / s; camY = Math.round(camY * s) / s;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#3d6b34'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s); ctx.imageSmoothingEnabled = false;
    const sx = Math.max(0, Math.floor(camX)), sy = Math.max(0, Math.floor(camY));
    const sw = Math.min(W - sx, Math.ceil(vw) + 2), sh = Math.min(H - sy, Math.ceil(vh) + 2);
    ctx.drawImage(base, sx, sy, sw, sh, sx, sy, sw, sh);

    const L = camX - 24, Rr = camX + vw + 24, T = camY - 10, B = camY + vh + 56, list = [];
    for (const t of trees) if (t.X > L - 50 && t.X < Rr + 50 && t.Y > T && t.Y < B + 40) list.push({ k: 0, o: t, y: t.Y });
    for (const l of lamps) if (l.X > L && l.X < Rr && l.Y > T && l.Y < B) list.push({ k: 1, o: l, y: l.Y });
    for (const c of cars) if (c.x > L && c.x < Rr && c.y > T && c.y < B) list.push({ k: 2, o: c, y: c.y });
    for (const n of npcs) if (n.x > L && n.x < Rr && n.y > T && n.y < B) list.push({ k: 3, o: n, y: n.y });
    list.push({ k: 4, y: me.y });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      const o = e.o;
      if (e.k === 0) ctx.drawImage(o.spr, o.X - (o.ox || 20), o.Y - (o.oy || 48));
      else if (e.k === 1) { P(ctx, 'rgba(0,0,0,.22)', o.X - 2, o.Y - 1, 6, 2); P(ctx, '#1e1a28', o.X - 1, o.Y - 17, 3, 17); P(ctx, '#5a5a66', o.X, o.Y - 16, 1, 16); P(ctx, '#1e1a28', o.X - 3, o.Y - 19, 7, 3); P(ctx, isN ? '#fff6c8' : '#d8d2bc', o.X - 2, o.Y - 18, 5, 1); }
      else if (e.k === 2) { if (o.dx) carH(ctx, Math.round(o.x), Math.round(o.y), o.col, o.dx, isN); else carV(ctx, Math.round(o.x), Math.round(o.y), o.col); }
      else if (e.k === 3) person(ctx, o.x, o.y, o.dir, (o.dx || o.dy) ? Math.floor(o.t / 9) % 4 : 0, o.look);
      else {
        person(ctx, me.x, me.y, me.dir, moving ? Math.floor(me.t / 7) % 4 : 0, me.look);
        const bob = Math.floor(performance.now() / 300) % 2, X = Math.round(me.x), Y = Math.round(me.y);
        P(ctx, '#1a1620', X - 3, Y - 26 + bob, 7, 4); P(ctx, '#5fd3a4', X - 2, Y - 25 + bob, 5, 2); P(ctx, '#5fd3a4', X - 1, Y - 23 + bob, 3, 1);
      }
    }
    ctx.drawImage(over, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.globalAlpha = 0.35; person(ctx, me.x, me.y, me.dir, moving ? Math.floor(me.t / 7) % 4 : 0, me.look); ctx.globalAlpha = 1;   // see yourself under canopies/bridge

    if (nightT > 0.02) {
      const w = Math.ceil(vw) + 2, h = Math.ceil(vh) + 2, fx = Math.floor(camX), fy = Math.floor(camY);
      if (dark.width !== w || dark.height !== h) { dark.width = w; dark.height = h; }
      dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, w, h);
      dg.fillStyle = `rgba(14,18,48,${0.68 * nightT})`; dg.fillRect(0, 0, w, h);
      dg.globalCompositeOperation = 'destination-out';
      const glow = [];
      for (const e of list) {
        if (e.k === 1) glow.push([e.o.X, e.o.Y - 12, 44]);
        else if (e.k === 2) glow.push([e.o.x + e.o.dx * 16, e.o.y + e.o.dy * 16 - 4, 15]);
      }
      for (const [x, y, r] of glow) { const gr = dg.createRadialGradient(x - fx, y - fy, 0, x - fx, y - fy, r); gr.addColorStop(0, 'rgba(0,0,0,.92)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); dg.fillStyle = gr; dg.fillRect(x - fx - r, y - fy - r, r * 2, r * 2); }
      ctx.drawImage(dark, fx, fy);
      if (isN) ctx.drawImage(emitCv, sx, sy, sw, sh, sx, sy, sw, sh);
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, r] of glow) { const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 0.7); gr.addColorStop(0, `rgba(255,196,120,${0.22 * nightT})`); gr.addColorStop(1, 'rgba(255,196,120,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.globalCompositeOperation = 'source-over';
    }

    // labels
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fs = Math.round(12 * dpr);
    ctx.font = `${fs}px "Pixelify Sans", monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (const l of LABELS) {
      if (l.X < camX || l.X > camX + vw || l.Y < camY || l.Y > camY + vh) continue;
      const X = Math.round((l.X - camX) * s), Y = Math.round((l.Y - camY) * s), tw = ctx.measureText(l.t).width + 14 * dpr, th = fs + 8 * dpr;
      ctx.fillStyle = '#1a1620'; ctx.fillRect(X - tw / 2 - 2 * dpr, Y - th / 2 - 2 * dpr, tw + 4 * dpr, th + 4 * dpr);
      ctx.fillStyle = '#fbf3dc'; ctx.fillRect(X - tw / 2, Y - th / 2, tw, th);
      ctx.fillStyle = '#2a2433'; ctx.fillText(l.t, X, Y);
    }
    let best = null, bd = 40;
    for (const p of PLACES) { const d = Math.hypot(p.X - me.x, p.Y - me.y); if (d < bd) { bd = d; best = p; } }
    if (best !== lastNear) {
      lastNear = best; nearEl.classList.toggle('hidden', !best);
      if (best) { nearEl.innerHTML = '<b></b><small></small>'; nearEl.firstChild.textContent = best.n; nearEl.lastChild.textContent = best.sub; }
    }
    const k = MW / W;
    mctx.drawImage(base, 0, 0, MW, MH);
    mctx.strokeStyle = '#5fd3a4'; mctx.lineWidth = 2; mctx.strokeRect(camX * k, camY * k, vw * k, vh * k);
    mctx.fillStyle = '#0a0c14'; mctx.fillRect(me.x * k - 5, me.y * k - 5, 10, 10);
    mctx.fillStyle = '#5fd3a4'; mctx.fillRect(me.x * k - 3, me.y * k - 3, 6, 6);
    drawFade();
    requestAnimationFrame(frame);
  }
  $('#loading').remove();
  frame();
})().catch(err => { const l = document.querySelector('#loading'); if (l) l.textContent = 'Could not build the campus: ' + err.message; console.error(err); });
