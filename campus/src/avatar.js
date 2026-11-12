// "Make your student": the avatar creator shown on first visit (and from the HUD later).
// The choice is kept in this browser only (localStorage), which is all a personal avatar needs.
import { mk } from './util.js';
import { person, dress, randomLook, SKINS, HAIR_COLORS, HAIRS, HEADWEAR, OUTFITS, CLOTH, PANTS, BAGS } from './sprites.js';

const KEY = 'pf.avatar.v1';
export function loadAvatar() {
  try { const a = JSON.parse(localStorage.getItem(KEY)); return a && a.skin ? a : null; } catch { return null; }
}
function saveAvatar(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* private mode: just keep it for this session */ } }

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export function openCreator(current, onDone) {
  const root = document.getElementById('avatar');
  let a = { name: '', ...(current || randomLook(Date.now() % 9973, 'm')) };
  let dir = 0, tab = 'look', raf = 0;
  const DIRS = ['down', 'right', 'up', 'left'];

  root.replaceChildren();
  // preview
  const left = el('div', 'av-left'), pv = mk(32, 32), pg = pv.getContext('2d');
  pv.className = 'av-preview'; pv.setAttribute('aria-label', 'Avatar preview');
  const turn = el('div', 'av-turn'), tl = el('button', 'panel', '◀'), tr = el('button', 'panel', '▶');
  tl.setAttribute('aria-label', 'Turn left'); tr.setAttribute('aria-label', 'Turn right');
  tl.onclick = () => { dir = (dir + 3) % 4; }; tr.onclick = () => { dir = (dir + 1) % 4; };
  turn.append(tl, tr); left.append(pv, turn);
  // form
  const right = el('div', 'av-right');
  right.append(el('h2', null, 'Make your student'));
  const nameRow = el('label', 'av-field'); nameRow.append(el('span', null, 'Name'));
  const name = el('input', 'panel'); name.maxLength = 18; name.placeholder = 'Your name'; name.value = a.name || '';
  name.oninput = () => { a.name = name.value; }; nameRow.append(name);
  const gRow = el('div', 'av-field'); gRow.append(el('span', null, 'I am a'));
  const gSeg = el('div', 'av-seg');
  for (const [g, label] of [['m', 'Boy'], ['f', 'Girl']]) {
    const b = el('button', 'panel', label); b.dataset.g = g;
    b.onclick = () => { if (a.gender === g) return; const r = randomLook(Math.random() * 1e6 | 0, g); a = { ...a, gender: g, hairStyle: r.hairStyle, headwear: r.headwear, outfit: r.outfit }; render(); };
    gSeg.append(b);
  }
  gRow.append(gSeg);
  const tabs = el('div', 'av-tabs');
  for (const [t, label] of [['look', 'Look'], ['outfit', 'Outfit'], ['extras', 'Extras']]) { const b = el('button', 'panel', label); b.dataset.t = t; b.onclick = () => { tab = t; render(); }; tabs.append(b); }
  const body = el('div', 'av-body');
  const foot = el('div', 'av-foot'), shuffle = el('button', 'panel', 'Shuffle'), go = el('button', 'panel av-go', 'Enter campus →');
  shuffle.onclick = () => { a = { ...randomLook(Math.random() * 1e6 | 0, a.gender), name: a.name }; render(); };
  go.onclick = () => {
    a.name = (a.name || '').trim().slice(0, 18) || 'Student';
    saveAvatar(a); cancelAnimationFrame(raf); root.classList.add('hidden'); onDone(dress(a), a.name);
  };
  foot.append(shuffle, go);
  right.append(nameRow, gRow, tabs, body, el('p', 'av-note', 'Your look is saved on this device.'), foot);
  root.append(left, right);

  const swatches = (title, list, key) => {
    const box = el('div', 'av-group'); box.append(el('h4', null, title));
    const row = el('div', 'av-swatches');
    for (const c of list) {
      const b = el('button', 'av-sw' + (a[key] === c ? ' on' : ''));
      b.style.background = c || 'repeating-linear-gradient(45deg,#2a2433 0 4px,#3a3444 4px 8px)';
      b.setAttribute('aria-label', c || 'none'); b.setAttribute('aria-pressed', a[key] === c);
      b.onclick = () => { a[key] = c; render(); };
      row.append(b);
    }
    box.append(row); return box;
  };
  const choices = (title, list, key) => {
    const box = el('div', 'av-group'); box.append(el('h4', null, title));
    const row = el('div', 'av-choices');
    for (const [v, label] of list) { const b = el('button', 'panel' + (a[key] === v ? ' on' : ''), label); b.setAttribute('aria-pressed', a[key] === v); b.onclick = () => { a[key] = v; render(); }; row.append(b); }
    box.append(row); return box;
  };
  function render() {
    for (const b of gSeg.children) b.classList.toggle('on', b.dataset.g === a.gender);
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.t === tab);
    body.replaceChildren();
    if (tab === 'look') body.append(swatches('Skin', SKINS, 'skin'), choices('Hair', HAIRS, 'hairStyle'), swatches('Hair colour', HAIR_COLORS, 'hair'));
    else if (tab === 'outfit') body.append(choices('Fit', OUTFITS, 'outfit'), swatches('Top colour', CLOTH, 'top'), swatches('Bottom colour', PANTS, 'pants'));
    else body.append(choices('Headwear', HEADWEAR, 'headwear'), swatches('Headwear colour', CLOTH, 'headColor'), swatches('Bag', BAGS, 'bag'), choices('Glasses', [[false, 'No'], [true, 'Yes']], 'glasses'));
  }
  let t = 0;
  const loop = () => {
    t++;
    pg.clearRect(0, 0, 32, 32); pg.fillStyle = '#2b3550'; pg.fillRect(0, 24, 32, 8); pg.fillStyle = '#34405e'; pg.fillRect(0, 24, 32, 1);
    person(pg, 16, 29, DIRS[dir], Math.floor(t / 10) % 4, dress(a));
    raf = requestAnimationFrame(loop);
  };
  render(); loop();
  root.classList.remove('hidden');
  name.focus();
}
