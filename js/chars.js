/* =========================================================
 * Karakter unit detail (gaya balok Roblox)
 * Setiap unit punya kostum, penutup kepala, wajah, perlengkapan
 * punggung dan senjata sendiri. Skin pemain mengganti warna.
 * ========================================================= */
'use strict';

/* hat: penutup kepala • face: wajah • outfit: detail baju • back: punggung • weapon: senjata */
const CHARS = {
  scout:     { shirt: '#43a047', pants: '#8d6e63', hat: 'cap', hatC: '#2e7d32', outfit: ['belt', 'pockets'], back: 'backpack', backC: '#795548', weapon: 'rifle' },
  sniper:    { shirt: '#6d4c41', pants: '#4e342e', hat: 'boonie', hatC: '#827717', face: 'scope', outfit: ['bandolier', 'belt'], back: 'ghillie', weapon: 'sniper' },
  pistol:    { shirt: '#a1887f', pants: '#3e2723', hat: 'cowboy', hatC: '#6d4c41', face: 'scarf', faceC: '#c62828', outfit: ['vest', 'belt', 'star'], weapon: 'revolvers' },
  archer:    { shirt: '#2e7d32', pants: '#5d4037', hat: 'robin', hatC: '#1b5e20', outfit: ['belt', 'strap'], back: 'quiver', weapon: 'bow' },
  farm:      { special: true },
  demoman:   { shirt: '#c62828', pants: '#37474f', hat: 'beanie', hatC: '#263238', face: 'eyepatch', outfit: ['grenades', 'belt'], weapon: 'launcher' },
  freezer:   { shirt: '#4fc3f7', pants: '#0277bd', hat: 'parka', hatC: '#29b6f6', face: 'goggles', faceC: '#80deea', outfit: ['zip'], back: 'cryotank', weapon: 'cryo' },
  cannon:    { shirt: '#455a64', pants: '#263238', hat: 'tricorn', hatC: '#212121', face: 'beard', faceC: '#5d4037', outfit: ['coat', 'belt'], weapon: 'handcannon' },
  flamer:    { shirt: '#ff7043', pants: '#5d4037', hat: 'helmet', hatC: '#e65100', face: 'gasmask', outfit: ['stripes'], back: 'fueltanks', weapon: 'flamethrower' },
  mortar:    { shirt: '#6b7f3a', pants: '#4e5b2a', hat: 'army', hatC: '#556b2f', outfit: ['vestArmy', 'belt'], back: 'shells', weapon: 'mortar' },
  shotgun:   { shirt: '#5d4037', pants: '#263238', hat: 'capBack', hatC: '#d84315', face: 'shades', outfit: ['jacket'], weapon: 'shotgun' },
  minigun:   { shirt: '#546e7a', pants: '#37474f', hat: 'bandana', hatC: '#d32f2f', face: 'stubble', outfit: ['vestHeavy', 'ammobelt'], weapon: 'minigun', bulky: true },
  commander: { shirt: '#3949ab', pants: '#1a237e', hat: 'officer', hatC: '#1a237e', face: 'mustache', outfit: ['coat', 'medals', 'belt'], back: 'cape', backC: '#b71c1c', weapon: 'flag' },
  tesla:     { shirt: '#eceff1', pants: '#455a64', hat: 'mad', hatC: '#eeeeee', face: 'goggles', faceC: '#ffd54f', outfit: ['labcoat'], back: 'battery', weapon: 'teslastaff' },
  laser:     { shirt: '#eceff1', pants: '#b71c1c', hat: 'visorhelm', hatC: '#fafafa', face: 'visor', faceC: '#ff1744', outfit: ['armor'], weapon: 'laser' },
  poison:    { shirt: '#33691e', pants: '#212121', hat: 'plague', hatC: '#212121', face: 'beak', outfit: ['coat', 'vials'], back: 'toxtank', weapon: 'sprayer' },
  ninja:     { shirt: '#263238', pants: '#212121', hat: 'ninja', hatC: '#212121', face: 'ninjamask', faceC: '#212121', outfit: ['sash'], back: 'katanaBack', weapon: 'shuriken' },
  rocketeer: { shirt: '#8e24aa', pants: '#4a148c', hat: 'pilot', hatC: '#6d4c41', face: 'grin', outfit: ['harness'], back: 'jetpack', weapon: 'rocketpod' },
  railgun:   { shirt: '#3949ab', pants: '#1a237e', hat: 'visorhelm', hatC: '#283593', face: 'visor', faceC: '#82b1ff', outfit: ['armor', 'core'], weapon: 'railgun', bulky: true },
  warden:    { shirt: '#26a69a', pants: '#004d40', hat: 'chrono', hatC: '#00695c', face: 'glow', faceC: '#64ffda', outfit: ['robe'], weapon: 'hourstaff', robe: true },
  samurai:   { shirt: '#b71c1c', pants: '#212121', hat: 'kabuto', hatC: '#212121', face: 'menpo', outfit: ['samuraiArmor'], weapon: 'katana' },
  wizard:    { shirt: '#5e35b1', pants: '#311b92', hat: 'wizard', hatC: '#4527a0', face: 'beard', faceC: '#eeeeee', outfit: ['robe', 'runes'], weapon: 'wizstaff', robe: true },
  angel:     { shirt: '#fffde7', pants: '#fff8e1', hat: 'halo', hatC: '#ffd54f', face: 'serene', outfit: ['robe', 'goldtrim'], back: 'wings', weapon: 'holyspear', robe: true },
  nuke:      { special: true },
  dragon:    { special: true },
};
/* Tinggi penutup kepala (untuk mahkota evolusi) */
const HAT_TOP = { cowboy: 37, wizard: 50, kabuto: 40, officer: 34, mad: 33, plague: 36, robin: 36, halo: 40, chrono: 33, beanie: 35, ninja: 32 };

/* ---------- helper gambar ---------- */
const OL = 'rgba(0,0,0,.55)';
function R(x, y, w, h, c, o = true) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); if (o) { ctx.strokeStyle = OL; ctx.lineWidth = 1.1; ctx.strokeRect(x, y, w, h); } }
function C(x, y, r, c, o = true) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); if (o) { ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke(); } }
function P(pts, c, o = true) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); if (o) { ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke(); } }
const time = () => (typeof S !== 'undefined' && S ? S.time : performance.now() / 1000);

/* ---------- bagian tubuh ---------- */
function drawBack(sp, x, y, shirt, sk) {
  const c = sk.gun || sp.backC, tt = time();
  switch (sp.back) {
    case 'backpack': R(x - 15, y - 8, 6, 11, c || '#795548'); R(x - 15, y - 8, 6, 3, shade(c || '#795548', 25)); break;
    case 'ghillie': for (let i = 0; i < 6; i++) R(x - 14 + (i % 3) * 3, y - 10 + (i >> 1) * 4, 4, 5, i % 2 ? '#558b2f' : '#827717', false); break;
    case 'quiver': ctx.save(); ctx.translate(x - 11, y - 4); ctx.rotate(-0.35); R(-3, -8, 6, 14, '#6d4c41'); for (let i = 0; i < 3; i++) { R(-2 + i * 2, -13, 1.5, 6, '#d7ccc8', false); P([-2.5 + i * 2, -13, 0 + i * 2, -16, 1 + i * 2, -13], i === 1 ? '#e53935' : '#fafafa', false); } ctx.restore(); break;
    case 'cryotank': R(x - 16, y - 10, 7, 14, '#b3e5fc'); R(x - 16, y - 12, 7, 3, '#607d8b'); R(x - 14, y - 6, 3, 6, '#e1f5fe', false); break;
    case 'fueltanks': R(x - 17, y - 10, 5, 14, '#d32f2f'); R(x - 13, y - 10, 5, 14, '#c62828'); R(x - 17, y - 12, 9, 3, '#424242'); break;
    case 'shells': for (let i = 0; i < 3; i++) { R(x - 16 + i * 3, y - 9, 3, 9, '#8d6e63'); C(x - 14.5 + i * 3, y - 9, 1.5, '#bdbdbd', false); } break;
    case 'cape': { const w = Math.sin(tt * 3) * 2; P([x - 9, y - 9, x + 3, y - 9, x - 2 + w, y + 10, x - 15 + w, y + 9], c || '#b71c1c'); break; }
    case 'battery': R(x - 16, y - 10, 7, 13, '#37474f'); R(x - 15, y - 8, 5, 3, '#00e676', false); R(x - 15, y - 4, 5, 3, '#ffeb3b', false); break;
    case 'toxtank': R(x - 16, y - 11, 7, 14, '#558b2f'); C(x - 12.5, y - 4, 2, '#ccff90', false); break;
    case 'katanaBack': ctx.save(); ctx.translate(x - 8, y - 4); ctx.rotate(0.7); R(-1.5, -16, 3, 22, '#212121'); R(-2.5, -18, 5, 2, '#ffd54f'); R(-1.5, -24, 3, 6, '#b71c1c'); ctx.restore(); break;
    case 'jetpack': { R(x - 17, y - 11, 8, 15, '#90a4ae'); R(x - 17, y - 11, 8, 3, '#cfd8dc'); const f = 3 + Math.sin(tt * 30) * 2; P([x - 16, y + 4, x - 10, y + 4, x - 13, y + 8 + f], '#ffb300', false); P([x - 15, y + 4, x - 11, y + 4, x - 13, y + 6 + f / 2], '#fff59d', false); break; }
    case 'wings': {
      const fl = Math.sin(tt * 4) * 3;
      for (const s of [-1, 1]) {
        P([x - 2, y - 8, x + s * 22, y - 22 - fl, x + s * 26, y - 10 - fl, x + s * 20, y - 2, x + s * 12, y + 4], '#fffde7');
        ctx.strokeStyle = 'rgba(255,213,79,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + s * 20, y - 14 - fl); ctx.moveTo(x, y - 4); ctx.lineTo(x + s * 18, y - 4); ctx.stroke();
      }
      break;
    }
  }
}
function drawBody(sp, x, y, shirt, pants, skin) {
  const boot = shade(pants, -40);
  if (sp.robe) { P([x - 9, y - 8, x + 9, y - 8, x + 12, y + 10, x - 12, y + 10], shirt); R(x - 12, y + 8, 24, 2, shade(shirt, -35), false); }
  else { R(x - 7, y + 3, 6, 7, pants); R(x + 1, y + 3, 6, 7, pants); R(x - 7, y + 8, 6, 3, boot); R(x + 1, y + 8, 6, 3, boot); }
  const bw = sp.bulky ? 22 : 18;
  R(x - bw / 2, y - 8, bw, 12, shirt);
  R(x - bw / 2, y - 8, bw, 2, shade(shirt, 30), false);
  R(x - 12, y - 7, 4, 9, shade(shirt, -20)); R(x - 12, y + 1, 4, 3, skin); // lengan belakang
  for (const o of sp.outfit || []) {
    switch (o) {
      case 'belt': R(x - bw / 2, y + 1, bw, 3, '#3e2723', false); R(x - 2, y + 1, 4, 3, '#ffd54f'); break;
      case 'pockets': R(x - 7, y - 5, 4, 3, shade(shirt, -25), false); R(x + 3, y - 5, 4, 3, shade(shirt, -25), false); break;
      case 'bandolier': ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 2); ctx.stroke(); for (let i = 0; i < 4; i++) R(x - 6 + i * 4, y - 6 + i * 2.5, 2, 3, '#ffca28', false); break;
      case 'vest': R(x - 9, y - 8, 5, 12, '#5d4037', false); R(x + 4, y - 8, 5, 12, '#5d4037', false); break;
      case 'star': P([x + 6, y - 6, x + 7, y - 4, x + 9, y - 4, x + 7.5, y - 2.5, x + 8, y - 0.5, x + 6, y - 1.5, x + 4, y - 0.5, x + 4.5, y - 2.5, x + 3, y - 4, x + 5, y - 4], '#ffd54f', false); break;
      case 'strap': ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 2); ctx.stroke(); break;
      case 'grenades': ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 2); ctx.stroke(); C(x - 3, y - 4, 2.2, '#558b2f'); C(x + 3, y - 1, 2.2, '#558b2f'); break;
      case 'zip': R(x - 0.5, y - 8, 1, 12, '#e1f5fe', false); R(x - 9, y - 8, 18, 3, '#ffffff', false); break;
      case 'coat': P([x - 3, y - 8, x, y - 2, x + 3, y - 8], '#ffffff', false); R(x - 0.5, y - 2, 1, 6, shade(shirt, -40), false); break;
      case 'stripes': R(x - 9, y - 2, 18, 2, '#fff59d', false); R(x - 9, y + 1, 18, 1.5, '#9e9e9e', false); break;
      case 'vestArmy': R(x - 8, y - 7, 16, 9, '#4e5b2a'); R(x - 6, y - 4, 4, 3, '#3b4520', false); R(x + 2, y - 4, 4, 3, '#3b4520', false); break;
      case 'jacket': R(x - 9, y - 8, 4, 12, '#3e2723', false); R(x + 5, y - 8, 4, 12, '#3e2723', false); R(x - 5, y - 8, 10, 12, '#fafafa', false); R(x - 3, y - 6, 6, 4, '#e53935', false); break;
      case 'vestHeavy': R(x - 10, y - 8, 20, 10, '#37474f'); R(x - 8, y - 6, 16, 2, '#263238', false); R(x - 8, y - 2, 16, 2, '#263238', false); break;
      case 'ammobelt': for (let i = 0; i < 6; i++) R(x - 10 + i * 3.5, y - 9 + i * 2, 2.5, 3.5, '#ffca28', false); break;
      case 'medals': R(x + 2, y - 6, 2, 3, '#e53935', false); R(x + 5, y - 6, 2, 3, '#1e88e5', false); C(x + 3, y - 2, 1.3, '#ffd54f', false); C(x + 6, y - 2, 1.3, '#ffd54f', false); R(x - 9, y - 8, 3, 2, '#ffd54f', false); R(x + 6, y - 8, 3, 2, '#ffd54f', false); break;
      case 'labcoat': R(x - 9, y - 8, 4, 14, '#fafafa'); R(x + 5, y - 8, 4, 14, '#fafafa'); R(x - 5, y - 8, 10, 12, '#80cbc4', false); R(x - 1, y - 8, 2, 7, '#d32f2f', false); R(x + 5.5, y - 5, 3, 3, '#90caf9', false); break;
      case 'armor': R(x - 7, y - 7, 14, 8, shade(shirt, -15)); R(x - 5, y - 6, 10, 2, 'rgba(255,255,255,.5)', false); R(x - 12, y - 9, 5, 5, shade(shirt, -25)); R(x + 7, y - 9, 5, 5, shade(shirt, -25)); break;
      case 'core': { const g = 0.6 + Math.sin(time() * 5) * 0.4; ctx.globalAlpha *= g; C(x, y - 3, 2.6, '#82b1ff', false); ctx.globalAlpha /= g; break; }
      case 'vials': for (let i = 0; i < 3; i++) R(x - 7 + i * 3, y - 1, 2, 4, ['#76ff03', '#ffeb3b', '#e040fb'][i], false); break;
      case 'sash': R(x - 9, y, 18, 3, '#c62828', false); R(x + 6, y + 2, 2, 6, '#c62828', false); P([x - 3, y - 8, x, y - 4, x + 3, y - 8], '#455a64', false); break;
      case 'harness': R(x - 6, y - 8, 2, 12, '#3e2723', false); R(x + 4, y - 8, 2, 12, '#3e2723', false); R(x - 6, y - 2, 12, 2, '#3e2723', false); break;
      case 'robe': R(x - 1, y - 8, 2, 16, shade(shirt, 40), false); R(x - 9, y - 1, 18, 2, '#ffd54f', false); break;
      case 'runes': { const tt = time(); for (let i = 0; i < 3; i++) C(x - 6 + i * 6, y + 6 + Math.sin(tt * 3 + i) * 0.6, 1, '#b388ff', false); break; }
      case 'goldtrim': R(x - 9, y - 8, 18, 1.5, '#ffd54f', false); R(x - 12, y + 8, 24, 2, '#ffd54f', false); break;
      case 'samuraiArmor': for (let i = 0; i < 3; i++) R(x - 9, y - 7 + i * 3.6, 18, 2.6, i % 2 ? '#212121' : '#d32f2f', false); R(x - 13, y - 9, 6, 7, '#212121'); R(x + 7, y - 9, 6, 7, '#212121'); R(x - 13, y - 9, 6, 2, '#d32f2f', false); R(x + 7, y - 9, 6, 2, '#d32f2f', false); break;
    }
  }
}
function drawHead(sp, x, y, skin, sk) {
  R(x - 8, y - 24, 16, 15, skin);
  R(x - 8, y - 24, 16, 3, shade(skin, 28), false);
  const eye = sk.eyes || '#1a1a1a', fc = sp.faceC || '#212121';
  const eyes = (c = eye) => { R(x - 4, y - 19, 3, 4, '#fff', false); R(x + 2, y - 19, 3, 4, '#fff', false); R(x - 3, y - 18, 2, 2.5, c, false); R(x + 3, y - 18, 2, 2.5, c, false); };
  const mouth = () => R(x - 1, y - 13, 5, 1.5, '#6d4c41', false);
  switch (sp.face) {
    case 'scope': eyes(); C(x + 4, y - 17, 3, 'rgba(0,0,0,0)'); ctx.strokeStyle = '#212121'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 3.5, y - 17, 2.8, 0, 7); ctx.stroke(); R(x - 1, y - 13, 4, 1.5, '#6d4c41', false); break;
    case 'scarf': eyes(); R(x - 8, y - 13, 16, 5, fc); P([x + 4, y - 10, x + 9, y - 6, x + 3, y - 7], fc, false); break;
    case 'eyepatch': R(x + 2, y - 19, 3, 4, '#fff', false); R(x + 3, y - 18, 2, 2.5, eye, false); R(x - 5, y - 19, 5, 5, '#111'); ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 8, y - 21); ctx.lineTo(x + 8, y - 17); ctx.stroke(); R(x - 2, y - 13, 6, 1.5, '#6d4c41', false); break;
    case 'goggles': C(x - 2.5, y - 17.5, 3, fc); C(x + 4, y - 17.5, 3, fc); R(x - 8, y - 18.5, 16, 1.5, '#424242', false); C(x - 3, y - 18.5, 0.9, '#fff', false); C(x + 3.5, y - 18.5, 0.9, '#fff', false); mouth(); break;
    case 'beard': eyes(); P([x - 8, y - 14, x + 8, y - 14, x + 6, y - 5, x, y - 2, x - 6, y - 5], fc); R(x - 1, y - 13, 5, 1.5, shade(fc, -60), false); break;
    case 'gasmask': R(x - 7, y - 20, 14, 6, '#37474f'); C(x - 3, y - 17, 2.2, '#ff8a65'); C(x + 4, y - 17, 2.2, '#ff8a65'); C(x + 1, y - 11, 3.4, '#455a64'); C(x + 1, y - 11, 1.6, '#263238', false); break;
    case 'shades': R(x - 6, y - 19, 6, 3, '#111'); R(x + 1, y - 19, 6, 3, '#111'); R(x - 8, y - 18.5, 16, 1, '#111', false); R(x - 5, y - 19, 2, 1, 'rgba(255,255,255,.7)', false); R(x - 1, y - 13, 6, 1.5, '#6d4c41', false); break;
    case 'stubble': eyes(); R(x - 7, y - 14, 14, 4, 'rgba(60,40,30,.35)', false); R(x - 1, y - 13, 5, 1.5, '#4e342e', false); R(x - 5, y - 21, 4, 1.2, '#3e2723', false); R(x + 2, y - 21, 4, 1.2, '#3e2723', false); break;
    case 'mustache': eyes(); P([x - 5, y - 14, x + 6, y - 14, x + 8, y - 12, x, y - 13, x - 7, y - 12], '#5d4037', false); break;
    case 'visor': { const g = 0.75 + Math.sin(time() * 4) * 0.25; R(x - 8, y - 20, 16, 5, '#111'); ctx.globalAlpha *= g; R(x - 7, y - 19, 14, 3, fc, false); ctx.globalAlpha /= g; break; }
    case 'beak': C(x - 2, y - 18, 2.6, '#cfd8dc'); C(x + 4, y - 18, 2.6, '#cfd8dc'); C(x - 2, y - 18, 1.2, '#b71c1c', false); C(x + 4, y - 18, 1.2, '#b71c1c', false); P([x - 2, y - 15, x + 6, y - 15, x + 16, y - 8, x + 3, y - 10], '#d7ccc8'); break;
    case 'ninjamask': R(x - 8, y - 24, 16, 15, fc); R(x - 6, y - 20, 12, 5, skin, false); R(x - 4, y - 19, 3, 3, '#fff', false); R(x + 2, y - 19, 3, 3, '#fff', false); R(x - 3, y - 18, 2, 2, '#111', false); R(x + 3, y - 18, 2, 2, '#111', false); break;
    case 'grin': eyes(); R(x - 2, y - 14, 7, 2.5, '#fff', true); break;
    case 'glow': { const g = 0.7 + Math.sin(time() * 3) * 0.3; R(x - 8, y - 24, 16, 15, 'rgba(0,40,40,.55)', false); ctx.globalAlpha *= g; R(x - 4, y - 18, 3, 2, fc, false); R(x + 2, y - 18, 3, 2, fc, false); ctx.globalAlpha /= g; break; }
    case 'menpo': eyes('#b71c1c'); R(x - 8, y - 15, 16, 6, '#b71c1c'); R(x - 6, y - 13, 12, 1, '#212121', false); R(x - 4, y - 15, 1, 6, '#ffd54f', false); R(x + 3, y - 15, 1, 6, '#ffd54f', false); break;
    case 'serene': R(x - 4, y - 18, 3, 1.3, '#5d4037', false); R(x + 2, y - 18, 3, 1.3, '#5d4037', false); R(x, y - 13, 3, 1.3, '#d48c8c', false); R(x - 7, y - 15, 2, 1.5, 'rgba(255,138,128,.5)', false); R(x + 5, y - 15, 2, 1.5, 'rgba(255,138,128,.5)', false); break;
    default: eyes(); mouth();
  }
}
function drawHat(sp, x, y, sk) {
  const c = sp.hatC || '#333', d = shade(c, -35), l = shade(c, 30), tt = time();
  switch (sp.hat) {
    case 'cap': R(x - 9, y - 30, 18, 6, c); R(x + 1, y - 26, 12, 3, d); C(x - 2, y - 27.5, 1.3, '#fff', false); break;
    case 'capBack': R(x - 9, y - 30, 18, 6, c); R(x - 14, y - 26, 10, 3, d); R(x + 3, y - 28, 3, 2, '#fff', false); break;
    case 'boonie': R(x - 8, y - 31, 16, 6, c); R(x - 12, y - 26, 24, 3, d); for (let i = 0; i < 4; i++) R(x - 10 + i * 6, y - 32, 2, 3, '#558b2f', false); break;
    case 'cowboy': R(x - 7, y - 35, 14, 9, c); R(x - 7, y - 29, 14, 2, '#3e2723', false); P([x - 15, y - 26, x + 15, y - 26, x + 13, y - 23, x - 13, y - 23], d); R(x - 4, y - 36, 8, 2, l, false); break;
    case 'robin': P([x - 9, y - 26, x + 9, y - 26, x + 3, y - 36, x - 12, y - 30], c); P([x + 2, y - 33, x + 10, y - 40, x + 4, y - 31], '#e53935'); R(x - 9, y - 27, 18, 2, d, false); break;
    case 'beanie': R(x - 9, y - 31, 18, 7, c); R(x - 9, y - 26, 18, 3, d); C(x, y - 33, 2.6, '#e53935'); break;
    case 'parka': R(x - 11, y - 30, 22, 7, c); R(x - 11, y - 30, 3, 20, c); R(x + 8, y - 30, 3, 20, c); for (let i = 0; i < 7; i++) C(x - 9 + i * 3, y - 24, 1.8, '#fafafa', false); break;
    case 'tricorn': P([x - 13, y - 26, x + 13, y - 26, x + 8, y - 33, x, y - 30, x - 8, y - 33], c); R(x - 12, y - 27, 24, 1.5, '#ffd54f', false); P([x - 2, y - 30, x + 2, y - 30, x, y - 27], '#fafafa', false); break;
    case 'helmet': R(x - 10, y - 31, 20, 7, c); R(x - 11, y - 26, 22, 2.5, d); R(x - 2, y - 33, 4, 3, '#ffd54f'); break;
    case 'army': R(x - 10, y - 31, 20, 7, c); R(x - 12, y - 26, 24, 2.5, d); R(x - 9, y - 29, 18, 1, '#3b4520', false); break;
    case 'bandana': R(x - 9, y - 28, 18, 5, c); R(x - 13, y - 27, 5, 2, c); R(x - 14, y - 25, 4, 2, c); for (let i = 0; i < 3; i++) C(x - 5 + i * 5, y - 25.5, 0.8, '#fff', false); break;
    case 'officer': R(x - 9, y - 31, 18, 6, c); R(x - 10, y - 33, 20, 3, l); R(x + 1, y - 26, 12, 2.5, '#111'); R(x - 9, y - 27, 18, 1.5, '#ffd54f', false); C(x, y - 29, 1.8, '#ffd54f'); break;
    case 'mad': for (let i = 0; i < 5; i++) C(x - 8 + i * 4, y - 27 - (i % 2) * 2, 3.2, c, false); C(x - 10, y - 21, 3, c, false); C(x + 10, y - 21, 3, c, false); R(x - 8, y - 24, 16, 2, '#424242', false); C(x - 3, y - 25, 2.5, '#ffd54f'); C(x + 3, y - 25, 2.5, '#ffd54f'); break;
    case 'visorhelm': R(x - 10, y - 30, 20, 8, c); R(x - 10, y - 24, 3, 14, c); R(x + 7, y - 24, 3, 14, c); R(x - 2, y - 33, 4, 3, shade(c, -30)); R(x - 9, y - 30, 18, 2, l, false); break;
    case 'plague': R(x - 7, y - 36, 14, 10, c); R(x - 13, y - 27, 26, 3, d); R(x - 7, y - 29, 14, 2, '#5d4037', false); break;
    case 'ninja': R(x - 9, y - 28, 18, 5, c); R(x - 8, y - 25, 16, 2, '#c62828', false); { const w = Math.sin(tt * 6) * 2; R(x - 15, y - 25 + w * 0.3, 7, 2, '#c62828', false); R(x - 17, y - 22 + w * 0.5, 6, 2, '#c62828', false); } break;
    case 'pilot': R(x - 9, y - 30, 18, 6, c); R(x - 10, y - 24, 3, 9, c); R(x + 7, y - 24, 3, 9, c); C(x - 3, y - 27, 2.4, '#80deea'); C(x + 3, y - 27, 2.4, '#80deea'); R(x - 9, y - 27.5, 18, 1, '#3e2723', false); break;
    case 'chrono': P([x - 11, y - 9, x - 10, y - 30, x, y - 34, x + 10, y - 30, x + 11, y - 9, x + 8, y - 9, x + 8, y - 26, x - 8, y - 26, x - 8, y - 9], c); C(x, y - 29, 2.6, '#ffd54f'); ctx.strokeStyle = '#004d40'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 29); ctx.lineTo(x, y - 31); ctx.moveTo(x, y - 29); ctx.lineTo(x + 1.5, y - 29); ctx.stroke(); break;
    case 'kabuto': R(x - 10, y - 30, 20, 7, c); R(x - 12, y - 24, 4, 8, c); R(x + 8, y - 24, 4, 8, c); R(x - 10, y - 25, 20, 2, '#b71c1c', false);
      P([x - 1, y - 30, x - 10, y - 40, x - 6, y - 31], '#ffd54f'); P([x + 1, y - 30, x + 10, y - 40, x + 6, y - 31], '#ffd54f'); C(x, y - 31, 2, '#ffd54f'); break;
    case 'wizard': { const b = Math.sin(tt * 2) * 1.5; P([x - 13, y - 25, x + 13, y - 25, x + 3, y - 44, x + 11 + b, y - 50, x - 3, y - 42], c); R(x - 13, y - 27, 26, 3, d);
      for (const [sx, sy] of [[-3, -33], [3, -38], [-6, -29]]) P([x + sx, y + sy - 1.5, x + sx + 0.6, y + sy, x + sx + 1.8, y + sy, x + sx + 0.8, y + sy + 0.8, x + sx + 1.2, y + sy + 2, x + sx, y + sy + 1.2, x + sx - 1.2, y + sy + 2, x + sx - 0.8, y + sy + 0.8, x + sx - 1.8, y + sy, x + sx - 0.6, y + sy], '#ffd54f', false); break; }
    case 'halo': { R(x - 9, y - 27, 18, 4, '#ffe082', false); const h = Math.sin(tt * 2.5) * 1.5; ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y - 34 + h, 10, 3, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,245,157,.5)'; ctx.lineWidth = 5; ctx.stroke(); break; }
  }
}
/* ---------- senjata (koordinat lokal: bahu di 0,0, arah depan = +x) ---------- */
function drawWeapon(sp, t, shirt, skin, sk) {
  const rc = (t.recoil || 0) * 4, g = sk.gun, tt = time(), w = sp.weapon;
  if (w !== 'flag' && w !== 'hourstaff' && w !== 'teslastaff') { R(-2, -2, 9, 4, shirt); R(6, -2, 4, 4, skin); }
  switch (w) {
    case 'rifle': R(-3 - rc, -1, 7, 4, '#6d4c41'); R(4 - rc, -2.5, 14, 5, g || '#37474f'); R(18 - rc, -1.2, 8, 2.4, '#263238'); R(9 - rc, 2, 3, 5, '#212121'); R(10 - rc, -5, 4, 2.5, '#212121'); break;
    case 'sniper': R(-5 - rc, -1, 9, 4, '#5d4037'); R(4 - rc, -2.5, 12, 5, g || '#3e2723'); R(16 - rc, -1, 18, 2.2, '#212121'); R(32 - rc, -1.6, 3, 3.2, '#212121'); R(7 - rc, -7, 10, 3.5, '#111'); C(17 - rc, -5.3, 1.6, '#4fc3f7', false); R(10 - rc, -3.5, 2, 1.5, '#111', false); break;
    case 'revolvers': for (const oy of [0, 6]) { R(4 - rc, oy - 2, 10, 3, g || '#9e9e9e'); R(7 - rc, oy - 2.5, 4, 4, '#757575'); R(4 - rc, oy + 0.5, 3, 4, '#6d4c41'); } break;
    case 'bow': { ctx.strokeStyle = g || '#6d4c41'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(8, 0, 12, -1.25, 1.25); ctx.stroke();
      const pull = Math.max(0, 1 - (t.recoil || 0) * 2) * 3; ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(8 + 12 * Math.cos(-1.25), 12 * Math.sin(-1.25)); ctx.lineTo(8 - pull, 0); ctx.lineTo(8 + 12 * Math.cos(1.25), 12 * Math.sin(1.25)); ctx.stroke();
      if ((t.recoil || 0) < 0.3) { R(6 - pull, -0.6, 18, 1.2, '#d7ccc8', false); P([24 - pull, -2, 28 - pull, 0, 24 - pull, 2], '#90a4ae', false); P([5 - pull, -2, 8 - pull, 0, 5 - pull, 2], '#e53935', false); } break; }
    case 'launcher': R(-6 - rc, -4.5, 26, 9, g || '#33691e'); R(-6 - rc, -4.5, 26, 2, '#558b2f', false); R(2 - rc, -5, 2, 10, '#1b5e20', false); R(13 - rc, -5, 2, 10, '#1b5e20', false); R(4 - rc, 4, 3, 5, '#212121');
      if ((t.recoil || 0) < 0.2) P([20 - rc, -3.5, 26 - rc, 0, 20 - rc, 3.5], '#e53935'); break;
    case 'cryo': R(2 - rc, -3.5, 14, 7, g || '#4fc3f7'); R(16 - rc, -2.5, 6, 5, '#e1f5fe'); R(5 - rc, -4.5, 6, 1.5, '#0277bd', false); { const a = 0.4 + Math.sin(tt * 6) * 0.3; ctx.globalAlpha *= a; C(23 - rc, 0, 2.4, '#e1f5fe', false); ctx.globalAlpha /= a; } break;
    case 'handcannon': R(-1 - rc, -5, 22, 10, g || '#212121'); R(20 - rc, -6, 4, 12, '#424242'); R(4 - rc, -5.5, 2, 11, '#ffd54f', false); R(13 - rc, -5.5, 2, 11, '#ffd54f', false); C(-2 - rc, 0, 3, '#424242'); break;
    case 'flamethrower': R(2 - rc, -2.5, 16, 5, g || '#616161'); R(18 - rc, -3.5, 5, 7, '#ff7043'); R(6 - rc, 2.5, 3, 4, '#424242'); { const f = 1.5 + Math.sin(tt * 25) * 0.8; C(25 - rc, 0, f, '#ffab40', false); C(25 - rc, 0, f / 2, '#fff59d', false); } break;
    case 'mortar': R(0, -5, 18, 10, g || '#4e342e'); R(15, -6, 4, 12, '#3e2723'); R(3, -5.5, 2, 11, '#8d6e63', false); break;
    case 'shotgun': R(-4 - rc, -1, 8, 4, '#6d4c41'); R(4 - rc, -2.5, 10, 5, g || '#37474f'); R(14 - rc, -2.5, 14, 2, '#263238'); R(14 - rc, -0.2, 14, 2, '#263238'); R(13 - rc * 1.6, 2, 8, 3, '#8d6e63'); break;
    case 'minigun': { R(-2 - rc, -6, 11, 12, g || '#37474f'); const sp = (t.recoil || 0) > 0 ? tt * 40 : 0; for (let i = 0; i < 3; i++) { const o = Math.sin(sp + i * 2.1) * 3; R(9 - rc, o - 1, 18, 2.4, i === 1 ? '#455a64' : '#263238'); } R(25 - rc, -4.5, 3, 9, '#212121'); R(1 - rc, 5, 4, 5, '#ffca28', false); break; }
    case 'flag': { R(-2, -2, 6, 4, shirt); R(3, -2, 4, 4, skin); R(5, -30, 2.2, 36, '#eceff1'); const wv = Math.sin(tt * 5); P([7, -30, 22, -28 + wv, 21, -21 + wv, 7, -22], sk.gun || '#e53935'); R(9, -27 + wv * 0.5, 3, 3, '#ffd54f', false); C(6, -31, 1.8, '#ffd54f'); break; }
    case 'teslastaff': { R(-2, -2, 6, 4, shirt); R(3, -2, 4, 4, skin); R(5, -28, 2.5, 34, '#607d8b'); for (let i = 0; i < 4; i++) R(3.5, -24 + i * 4, 5.5, 2, '#ff8f00', false);
      const p = 4 + (t.recoil || 0) * 3; C(6.3, -31, p, g || '#18ffff'); C(6.3, -31, p / 2, '#e0f7fa', false);
      if ((t.recoil || 0) > 0.3 || Math.sin(tt * 9) > 0.85) { ctx.strokeStyle = '#e0f7fa'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(6, -31); ctx.lineTo(13, -37); ctx.lineTo(10, -40); ctx.lineTo(16, -44); ctx.stroke(); } break; }
    case 'laser': R(2 - rc, -3, 17, 6, g || '#eceff1'); R(2 - rc, -0.5, 17, 1.5, '#ff1744', false); R(19 - rc, -2, 4, 4, '#b71c1c'); R(6 - rc, 3, 3, 4, '#424242'); { const a = 0.5 + Math.sin(tt * 8) * 0.4; ctx.globalAlpha *= a; C(24 - rc, 0, 2.4, '#ff8a80', false); ctx.globalAlpha /= a; } break;
    case 'sprayer': R(2 - rc, -3.5, 11, 7, g || '#558b2f'); C(7 - rc, -4, 2, '#ccff90'); R(13 - rc, -1.5, 11, 3, '#424242'); { const d = (tt * 2) % 1; C(25 - rc, d * 5, 1.4, '#76ff03', false); } break;
    case 'shuriken': { ctx.save(); ctx.translate(13 - rc, 0); ctx.rotate(tt * ((t.recoil || 0) > 0 ? 25 : 3)); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); P([0, -1.5, 6, 0, 0, 1.5], g || '#cfd8dc'); } C(0, 0, 1.4, '#455a64', false); ctx.restore(); break; }
    case 'rocketpod': R(-3 - rc, -7, 20, 11, g || '#4a148c'); R(-3 - rc, -7, 20, 2, '#7b1fa2', false); for (const oy of [-4, 0]) { R(17 - rc, oy - 1, 3, 3, '#212121'); if ((t.recoil || 0) < 0.3) P([20 - rc, oy - 1.5, 24 - rc, oy + 0.5, 20 - rc, oy + 2.5], '#ff5252', false); } break;
    case 'railgun': { R(-2 - rc, -3.5, 34, 7, g || '#1a237e'); for (let i = 0; i < 4; i++) R(5 + i * 6 - rc, -5, 2.5, 10, '#283593'); const a = 0.5 + Math.sin(tt * 6) * 0.4; ctx.globalAlpha *= a; R(4 - rc, -0.8, 28, 1.6, '#82b1ff', false); ctx.globalAlpha /= a; R(4 - rc, 3.5, 4, 5, '#212121'); break; }
    case 'hourstaff': { R(-2, -2, 6, 4, shirt); R(3, -2, 4, 4, skin); R(5, -30, 2.2, 38, '#5d4037'); R(1.5, -38, 9, 2, '#ffd54f'); R(1.5, -30, 9, 2, '#ffd54f'); P([2.5, -36, 9.5, -36, 6, -33], '#80cbc4'); P([2.5, -30, 9.5, -30, 6, -33], '#80cbc4'); const s = (tt % 2) / 2; P([4, -30, 8, -30, 6, -30 - s * 3], '#ffd54f', false); break; }
    case 'katana': { const sw = (t.recoil || 0) > 0.05 ? -t.recoil * 1.6 : 0; ctx.rotate(sw); R(-4, -1.5, 8, 3, '#311b92'); for (let i = 0; i < 3; i++) R(-3 + i * 2.5, -1.5, 1, 3, '#ffd54f', false); R(4, -3.5, 2, 7, '#ffd54f');
      P([6, -1.3, 30, -1.8, 33, 0, 6, 1.3], g || '#eceff1'); R(7, -0.4, 22, 0.8, '#ffffff', false);
      if ((t.recoil || 0) > 0.4) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, -0.2, 1.4); ctx.stroke(); } break; }
    case 'wizstaff': { R(-6, -1.5, 30, 3, '#6d4c41'); R(20, -3, 3, 6, '#ffd54f'); const p = 0.7 + Math.sin(tt * 4) * 0.3; ctx.globalAlpha *= 0.35 * p; C(28, 0, 7, g || '#b388ff', false); ctx.globalAlpha /= 0.35 * p; C(28, 0, 4, g || '#7c4dff'); C(27, -1.2, 1.4, '#ede7f6', false);
      for (let i = 0; i < 3; i++) { const a = tt * 3 + i * 2.1; C(28 + Math.cos(a) * 7, Math.sin(a) * 7, 0.9, '#e1bee7', false); } break; }
    case 'holyspear': { R(-8, -1.3, 34, 2.6, g || '#ffd54f'); R(-8, -1.3, 34, 0.8, '#fff8e1', false); P([26, -3.5, 36, 0, 26, 3.5], '#fffde7'); R(24, -4, 2, 8, '#ffb300');
      const p = 0.6 + Math.sin(tt * 3) * 0.4; ctx.globalAlpha *= 0.4 * p; C(33, 0, 6, '#fff59d', false); ctx.globalAlpha /= 0.4 * p; break; }
  }
}

/** Gambar karakter lengkap untuk tower humanoid */
function drawHero(t, x, y, sk, evo, base) {
  const sp = CHARS[t.type] || CHARS.scout;
  const face = Math.cos(t.angle || 0) >= 0 ? 1 : -1;
  const shirt = sk.rainbow ? `hsl(${(time() * 90 + x) % 360},80%,55%)` : (sk.body || (evo ? base : sp.shirt || base));
  const pants = sk.body ? shade(sk.body, -45) : sp.pants || '#37474f';
  const skin = sk.rainbow ? '#fff8e1' : (sk.head || '#f5cf68');
  const spx = sk.acc ? { ...sp, hat: null } : sp;
  // badan & kepala dicerminkan sesuai arah hadap
  ctx.save(); ctx.translate(x, 0); ctx.scale(face, 1); ctx.translate(-x, 0);
  drawBack(sp, x, y, shirt, sk);
  drawBody(sp, x, y, shirt, pants, skin);
  drawHead(sp, x, y, skin, sk);
  drawHat(spx, x, y, sk);
  ctx.restore();
  if (sk.acc) drawAccessory(sk.acc, x, y, sk);
  if (evo) { const top = HAT_TOP[spx.hat] || 30, b = Math.sin(time() * 3) * 1.5; ctx.fillStyle = '#ffd600'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 7, y - top - 2 + b); ctx.lineTo(x - 7, y - top - 8 + b); ctx.lineTo(x - 3.5, y - top - 5 + b); ctx.lineTo(x, y - top - 10 + b); ctx.lineTo(x + 3.5, y - top - 5 + b); ctx.lineTo(x + 7, y - top - 8 + b); ctx.lineTo(x + 7, y - top - 2 + b); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // senjata mengikuti arah bidik
  const aim = sp.weapon === 'flag' || sp.weapon === 'hourstaff' || sp.weapon === 'teslastaff' ? 0
    : t.type === 'mortar' ? -Math.PI / 2.6 * face + (face < 0 ? Math.PI : 0) : (t.angle || 0);
  ctx.save(); ctx.translate(x + 3 * face, y - 4); ctx.rotate(aim);
  if (face < 0 && !['flag', 'hourstaff', 'teslastaff'].includes(sp.weapon)) ctx.scale(1, -1);
  if (face < 0 && ['flag', 'hourstaff', 'teslastaff'].includes(sp.weapon)) ctx.scale(-1, 1);
  drawWeapon(sp, t, shirt, skin, sk);
  ctx.restore();
}

/* ---------- unit khusus ---------- */
function drawFarm(t, x, y, sk) {
  const wall = sk.body || '#c62828', roof = sk.gun || '#5d4037', tt = time();
  // ladang kecil
  for (let i = 0; i < 3; i++) { R(x - 20 + i * 5, y + 5, 3, 6, '#8d6e63', false); R(x - 20 + i * 5, y + 1 + Math.sin(tt * 2 + i) * 0.5, 3, 4, '#7cb342', false); }
  // silo
  R(x + 12, y - 22, 9, 30, '#b0bec5'); P([x + 12, y - 22, x + 16.5, y - 29, x + 21, y - 22], '#78909c'); R(x + 12, y - 14, 9, 1.5, '#78909c', false); R(x + 12, y - 4, 9, 1.5, '#78909c', false);
  // lumbung
  R(x - 15, y - 14, 26, 22, wall); R(x - 15, y - 14, 26, 2, shade(wall, 30), false);
  P([x - 18, y - 13, x - 2, y - 28, x + 14, y - 13], roof); for (let i = 0; i < 3; i++) R(x - 12 + i * 2, y - 16 - i * 3.5, 20 - i * 4.5, 1, shade(roof, 25), false);
  R(x - 8, y - 4, 12, 12, '#fff8e1'); ctx.strokeStyle = wall; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 8, y - 4); ctx.lineTo(x + 4, y + 8); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 8, y + 8); ctx.stroke();
  R(x - 5, y - 21, 6, 5, '#fff8e1'); R(x - 2.5, y - 21, 1, 5, wall, false);
  const k = (tt * 1.5) % 1; ctx.save(); ctx.globalAlpha *= 1 - k; outlinedText('$', x - 2, y - 30 - k * 10, 12, '#ffd54f'); ctx.restore();
}
function drawNuke(t, x, y, sk, body) {
  const tt = time();
  R(x - 15, y - 16, 30, 24, body); R(x - 15, y - 16, 30, 3, shade(body, 30), false);
  for (let i = 0; i < 5; i++) P([x - 15 + i * 6, y + 5, x - 11 + i * 6, y + 5, x - 15 + i * 6 + 6, y + 8, x - 15 + i * 6 + 2, y + 8], i % 2 ? '#212121' : '#ffd600', false);
  C(x, y - 5, 7.5, '#ffeb3b'); ctx.fillStyle = '#212121'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.arc(x, y - 5, 6.5, k * 2.09 - 0.5, k * 2.09 + 0.5); ctx.fill(); } C(x, y - 5, 1.6, '#ffeb3b', false);
  const lift = (t.recoil || 0) * 3;
  R(x - 5, y - 36 - lift, 10, 18, '#bdbdbd'); P([x - 5, y - 36 - lift, x, y - 44 - lift, x + 5, y - 36 - lift], '#e53935'); R(x - 8, y - 22 - lift, 3, 5, '#757575'); R(x + 5, y - 22 - lift, 3, 5, '#757575');
  const bl = Math.sin(tt * 6) > 0; C(x - 11, y - 12, 1.6, bl ? '#ff1744' : '#4a0000', false); C(x + 11, y - 12, 1.6, bl ? '#4a0000' : '#ff1744', false);
}
function drawDragon(t, x, y, sk, body) {
  const tt = time(), fl = Math.sin(tt * 5) * 5, wing = sk.gun || shade(body, -50), belly = '#ffcc80';
  for (const s of [-1, 1]) { P([x + s * 6, y - 8, x + s * 25, y - 24 - fl, x + s * 23, y - 13 - fl / 2, x + s * 19, y - 6, x + s * 11, y - 2], wing);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + s * 6, y - 8); ctx.lineTo(x + s * 23, y - 13 - fl / 2); ctx.stroke(); }
  P([x - 10, y + 4, x - 20, y + 10, x - 25, y + 4, x - 20, y + 6], body);
  R(x - 12, y - 10, 24, 17, body); R(x - 7, y - 6, 14, 12, belly, false); for (let i = 0; i < 3; i++) R(x - 6, y - 4 + i * 3.5, 12, 1, shade(belly, -40), false);
  R(x - 10, y + 6, 6, 5, shade(body, -30)); R(x + 4, y + 6, 6, 5, shade(body, -30));
  ctx.save(); ctx.translate(x, y - 14); ctx.rotate(t.angle || 0);
  R(2, -7, 20, 13, body); R(18, -3, 8, 8, body); P([4, -7, 2, -15, 8, -7], '#fff8e1'); P([10, -7, 9, -14, 14, -7], '#fff8e1');
  R(12, -5, 4, 3.5, '#ffeb3b'); R(14, -4.5, 1.5, 2.5, '#111', false); R(22, 3, 4, 2, '#fff', false); R(24, -1, 2, 1.5, '#111', false);
  if ((t.recoil || 0) > 0.2) { C(30, 1, 3 + t.recoil * 3, '#ff6d00', false); C(30, 1, 1.5 + t.recoil * 1.5, '#fff59d', false); }
  ctx.restore();
}
