// Shared by the browser client and the multiplayer server: the single source of truth for
// limits, valid scenes and avatar options, plus the sanitisers both sides run on untrusted input.

export const PROTOCOL_VERSION = 1;
export const TICK_HZ = 10;            // server snapshot rate
export const SEND_HZ = 10;            // client position update rate (max)
export const AOI_RADIUS = 340;        // px: you only receive players this close (same scene) ~ one screen
export const CHAT_RADIUS = 96;        // px (~30 m outdoors): chat only reaches people this close
export const NAME_MAX = 18;
export const CHAT_MAX = 160;
export const MAP_MAX = 2048;          // every scene is smaller than this (px)
export const DIRS = ['down', 'up', 'left', 'right'];

// ---------- scenes ----------
export const FLOORS = {
  A: ['G', '1', '2', '3'],
  B: ['G', '1', '2', '3'],
  C: ['B1', 'G', '1', '2', '3', '4', '5'],
  D: ['B1', 'G', '1', '2', '3', '4', '5'],
};
export const ROOMS_PER_FLOOR = 12;
// Which floors have classrooms (C:B1 is the cafe, C:G the library, D:B1 faculty parking).
export const hasClassrooms = (b, f) => !(f === 'B1' || (b === 'C' && f === 'G'));
export function isValidScene(key) {
  if (key === 'campus') return true;
  if (typeof key !== 'string' || key.length > 12) return false;
  const m = /^([ABCD]):(B1|G|[1-5])(?::(\d{1,2}))?$/.exec(key);
  if (!m) return false;
  const [, b, f, n] = m;
  if (!FLOORS[b].includes(f)) return false;
  if (n === undefined) return true;
  const i = Number(n);
  return hasClassrooms(b, f) && String(i) === n && i >= 1 && i <= ROOMS_PER_FLOOR;
}

// ---------- avatar options ----------
export const SKINS = ['#f7d4b0', '#ebb88e', '#d39a6a', '#b0764a', '#8a5836'];
export const HAIR_COLORS = ['#1d1917', '#3a2a1f', '#5c3b25', '#8a5a33', '#c9a26b', '#7a1a20'];
export const HAIRS = [['short', 'Short'], ['side', 'Side part'], ['curly', 'Curly'], ['buzz', 'Buzz'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun']];
export const HEADWEAR = [['none', 'None'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['hijab', 'Hijab']];
export const OUTFITS = [['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['jacket', 'Jacket'], ['kurta', 'Kurta']];
export const CLOTH = ['#f4f1e8', '#26262c', '#b8323a', '#2f5a9a', '#3a8a5e', '#e07aa0', '#f0b444', '#8fc0dc', '#7a54a8', '#e6dcc4', '#5fd3a4', '#c86a3a'];
export const PANTS = ['#2c3658', '#3c3c44', '#1e1e24', '#5c4834', '#e6dcc4', '#f4f1e8', '#3a5a3a'];
export const BAGS = [null, '#3e424c', '#b8323a', '#2f5a9a', '#5c4834', '#f0b444'];

export const DEFAULT_LOOK = Object.freeze({
  gender: 'm', skin: SKINS[2], hair: HAIR_COLORS[0], hairStyle: 'short', headwear: 'none', headColor: CLOTH[3],
  outfit: 'hoodie', top: CLOTH[10], pants: PANTS[0], bag: BAGS[1], glasses: false,
});
const keysOf = list => list.map(([k]) => k);
const pickValid = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

// Returns a look containing only known fields with allowed values (anything else falls back to default).
export function cleanLook(o) {
  const L = o && typeof o === 'object' ? o : {};
  const d = DEFAULT_LOOK;
  return {
    gender: pickValid(L.gender, ['m', 'f'], d.gender),
    skin: pickValid(L.skin, SKINS, d.skin),
    hair: pickValid(L.hair, HAIR_COLORS, d.hair),
    hairStyle: pickValid(L.hairStyle, keysOf(HAIRS), d.hairStyle),
    headwear: pickValid(L.headwear, keysOf(HEADWEAR), d.headwear),
    headColor: pickValid(L.headColor, CLOTH, d.headColor),
    outfit: pickValid(L.outfit, keysOf(OUTFITS), d.outfit),
    top: pickValid(L.top, CLOTH, d.top),
    pants: pickValid(L.pants, PANTS, d.pants),
    bag: pickValid(L.bag, BAGS, d.bag),
    glasses: L.glasses === true,
  };
}

// Strip control / invisible / bidi-override characters, collapse whitespace.
const BAD_CHARS = /[\u0000-\u001f\u007f-\u009f­؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁯ㅤ﻿ﾠ￰-￿]/g;
export function cleanText(s, max) {
  if (typeof s !== 'string') return '';
  return s.slice(0, max * 4).replace(BAD_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// Names: letters (any script, so Urdu works), digits, space and a little punctuation.
export function cleanName(s) {
  const n = cleanText(s, NAME_MAX * 2).replace(/[^\p{L}\p{M}\p{N} ._'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return n || 'Student';
}
export const cleanChat = s => cleanText(s, CHAT_MAX);

// Positions must be finite numbers inside the scene bounds.
export const validCoord = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAP_MAX;
