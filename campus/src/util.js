// Small shared helpers: deterministic noise, colours, canvases, pixel text.
export const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const hx = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
export const css = (c, f = 1) => `rgb(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0})`;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pick = (a, h) => a[Math.floor(h * a.length) % a.length];
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const P = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); };
export const OUTLINE = '#1e1a28';

// Crisp 8px pixel text (Silkscreen), thresholded so it never blurs. Font must be loaded first.
export function pixelText(g, text, cx, y, col, outline) {
  const t = mk(text.length * 8 + 8, 16), tg = t.getContext('2d');
  tg.font = '8px Silkscreen'; tg.textBaseline = 'top'; tg.fillStyle = '#fff'; tg.fillText(text, 2, 2);
  const w = Math.ceil(tg.measureText(text).width), d = tg.getImageData(0, 0, t.width, t.height).data, ox = Math.round(cx - w / 2) - 2;
  const pts = [];
  for (let j = 0; j < t.height; j++) for (let i = 0; i < t.width; i++) if (d[(j * t.width + i) * 4 + 3] > 110) pts.push([i, j]);
  if (outline) for (const [i, j] of pts) P(g, outline, ox + i - 1, y + j - 1, 3, 3);
  for (const [i, j] of pts) P(g, col, ox + i, y + j);
}

// Walkability test shared by every scene: feet box against a solid mask.
export const feetFree = (solid, W, H, x, y) => {
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, 0], [0, -2]]) {
    const i = Math.round(x + dx), j = Math.round(y + dy);
    if (i < 0 || j < 0 || i >= W || j >= H || solid[j * W + i]) return false;
  }
  return true;
};
