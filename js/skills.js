/* =========================================================
 * Variasi serangan + skill pasif & aktif tiap unit
 * - ATK_STYLE: bentuk proyektil & efek benturan (visual saja,
 *   damage tetap dihitung instan oleh game.js)
 * - UNIT_SKILLS: 1 pasif (selalu aktif) + 1 aktif (terbuka di
 *   level upgrade 2, dipakai lewat panel tower / tombol F)
 * ========================================================= */
'use strict';

/* p = proyektil • imp = efek benturan */
const ATK_STYLE = {
  scout:     { p: 'bullet',  col: '#ffe082', imp: 'spark' },
  pistol:    { p: 'bullet2', col: '#ffe082', imp: 'spark' },
  sniper:    { p: 'snipe',   col: '#fff59d', imp: 'pierce' },
  archer:    { p: 'arrow',   col: '#d7ccc8', imp: 'pierce' },
  shotgun:   { p: 'pellets', col: '#ffcc80', imp: 'spark' },
  minigun:   { p: 'bullet',  col: '#ffd54f', imp: 'spark' },
  freezer:   { p: 'ice',     col: '#b3e5fc', imp: 'ice' },
  flamer:    { p: 'flame',   col: '#ff7043', imp: 'fire' },
  tesla:     { p: 'bolt',    col: '#18ffff', imp: 'electric' },
  laser:     { p: 'laser',   col: '#ff1744', imp: 'fire' },
  poison:    { p: 'gas',     col: '#9ccc65', imp: 'poison' },
  railgun:   { p: 'rail',    col: '#82b1ff', imp: 'electric' },
  ninja:     { p: 'shuriken',col: '#cfd8dc', imp: 'slash' },
  samurai:   { p: 'slash',   col: '#ffffff', imp: 'slash' },
  wizard:    { p: 'orb',     col: '#b388ff', imp: 'magic' },
  angel:     { p: 'holy',    col: '#fff59d', imp: 'holy' },
  cosmic:    { p: 'star',    col: '#ea80fc', imp: 'magic' },
  goldminer: { p: 'pick',    col: '#ffd54f', imp: 'gold' },
};

/** Efek serangan (visual) — dipakai host & tamu mabar */
function atkFx(x1, y1, x2, y2, col, w, life, type) {
  const st = ATK_STYLE[type];
  if (!st || SET.quality === 'low') { S.effects.push({ kind: 'tracer', x1, y1, x2, y2, life, max: 0.15, col, w }); return; }
  const travel = { arrow: 0.16, shuriken: 0.16, orb: 0.2, star: 0.22, ice: 0.14, gas: 0.2, pick: 0.06 }[st.p] || 0.1;
  S.effects.push({ kind: 'atk', p: st.p, x1, y1, x2, y2, col: st.col || col, w, life: travel, max: travel, a: Math.atan2(y2 - y1, x2 - x1), seed: Math.random() * 6.28 });
  S.effects.push({ kind: 'imp', imp: st.imp, x: x2, y: y2, col: st.col || col, delay: travel * 0.85, life: 0.28, max: 0.28 });
  if (st.p === 'pellets') for (let i = 0; i < 4; i++) S.effects.push({ kind: 'atk', p: 'pellet', x1, y1, x2: x2 + (Math.random() - 0.5) * 26, y2: y2 + (Math.random() - 0.5) * 26, col: st.col, w: 2, life: 0.09, max: 0.09, a: 0 });
}

/** Gambar efek serangan (dipanggil dari render.js) */
function drawAtkFx(f) {
  const k = 1 - f.life / f.max;                         // 0 → 1 selama perjalanan
  const x = f.x1 + (f.x2 - f.x1) * k, y = f.y1 + (f.y2 - f.y1) * k;
  ctx.save();
  switch (f.p) {
    case 'bullet': case 'bullet2': case 'pellet': {
      const len = f.p === 'pellet' ? 6 : 12; ctx.strokeStyle = f.col; ctx.lineWidth = f.p === 'bullet2' ? 2 : 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - Math.cos(f.a) * len, y - Math.sin(f.a) * len); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); break; }
    case 'snipe': case 'rail': case 'laser': {
      const fade = 1 - k; ctx.globalAlpha = fade; ctx.strokeStyle = f.col; ctx.lineWidth = f.p === 'rail' ? 7 : f.p === 'laser' ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      if (f.p === 'rail') { ctx.strokeStyle = f.col; ctx.lineWidth = 1; for (let i = 0.15; i < 1; i += 0.15) { const px = f.x1 + (f.x2 - f.x1) * i, py = f.y1 + (f.y2 - f.y1) * i; ctx.beginPath(); ctx.arc(px, py, 5 * fade + 2, 0, 7); ctx.stroke(); } }
      break; }
    case 'arrow': {
      ctx.translate(x, y); ctx.rotate(f.a); ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.fillStyle = '#cfd8dc'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -3); ctx.lineTo(2, 3); ctx.fill();
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-15, -3); ctx.lineTo(-10, 0); ctx.lineTo(-15, 3); ctx.fill(); break; }
    case 'shuriken': {
      ctx.translate(x, y); ctx.rotate(k * 18 + f.seed); ctx.fillStyle = f.col; ctx.strokeStyle = '#37474f'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 2 : 7, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); break; }
    case 'orb': case 'star': {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10); g.addColorStop(0, '#fff'); g.addColorStop(0.4, f.col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
      for (let i = 1; i <= 4; i++) { const tk = Math.max(0, k - i * 0.06), tx = f.x1 + (f.x2 - f.x1) * tk, ty = f.y1 + (f.y2 - f.y1) * tk; ctx.globalAlpha = 0.5 - i * 0.1; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(tx, ty, 5 - i, 0, 7); ctx.fill(); }
      if (f.p === 'star') { ctx.globalAlpha = 1; ctx.translate(x, y); ctx.rotate(k * 8); ctx.fillStyle = '#fff59d'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.5 : 6, a = i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); }
      break; }
    case 'ice': {
      ctx.translate(x, y); ctx.rotate(f.a); ctx.fillStyle = f.col; ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -3.5); ctx.lineTo(-8, 0); ctx.lineTo(0, 3.5); ctx.closePath(); ctx.fill(); ctx.stroke(); break; }
    case 'flame': case 'gas': {
      for (let i = 0; i < 6; i++) { const t2 = Math.min(1, k + i * 0.08), px = f.x1 + (f.x2 - f.x1) * t2 + Math.sin(f.seed + i * 2) * 4 * t2, py = f.y1 + (f.y2 - f.y1) * t2 + Math.cos(f.seed + i * 3) * 4 * t2;
        ctx.globalAlpha = 0.75 * (1 - k * 0.5); ctx.fillStyle = f.p === 'flame' ? ['#ffeb3b', '#ff9800', '#ff5722'][i % 3] : ['#c5e1a5', '#9ccc65', '#7cb342'][i % 3];
        ctx.beginPath(); ctx.arc(px, py, 3 + t2 * 5, 0, 7); ctx.fill(); }
      break; }
    case 'bolt': {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f.x1, f.y1);
      const n = 6; for (let i = 1; i < n; i++) { const t2 = i / n; ctx.lineTo(f.x1 + (f.x2 - f.x1) * t2 + (Math.random() - 0.5) * 12, f.y1 + (f.y2 - f.y1) * t2 + (Math.random() - 0.5) * 12); }
      ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); break; }
    case 'slash': {
      ctx.globalAlpha = 1 - k; ctx.translate(f.x2, f.y2); ctx.rotate(f.seed); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 14 + k * 6, -0.9, 0.9); ctx.stroke(); ctx.strokeStyle = '#ffcdd2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 10 + k * 6, -0.7, 0.7); ctx.stroke(); break; }
    case 'holy': {
      ctx.globalAlpha = 1 - k; const g = ctx.createLinearGradient(f.x2, f.y2 - 80, f.x2, f.y2); g.addColorStop(0, 'rgba(255,253,231,0)'); g.addColorStop(1, 'rgba(255,245,157,.9)');
      ctx.fillStyle = g; ctx.fillRect(f.x2 - 9, f.y2 - 80, 18, 80);
      ctx.strokeStyle = f.col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); break; }
    case 'pick': {
      ctx.globalAlpha = 1 - k; for (let i = 0; i < 5; i++) { const a = f.seed + i * 1.25, r = 6 + k * 12; ctx.fillStyle = i % 2 ? '#ffd54f' : '#fff8e1'; ctx.fillRect(f.x2 + Math.cos(a) * r - 1.5, f.y2 + Math.sin(a) * r - 1.5, 3, 3); } break; }
  }
  ctx.restore();
}
/** Efek benturan */
function drawImpactFx(f) {
  if (f.delay > 0) return;
  const k = 1 - f.life / f.max, x = f.x, y = f.y;
  ctx.save(); ctx.globalAlpha = 1 - k;
  switch (f.imp) {
    case 'spark': for (let i = 0; i < 5; i++) { const a = i * 1.26 + x, r = 3 + k * 10; ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); } break;
    case 'pierce': ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 4 + k * 10, 0, 7); ctx.stroke(); break;
    case 'ice': ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, r = 4 + k * 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); } break;
    case 'fire': ctx.fillStyle = '#ff9800'; ctx.beginPath(); ctx.arc(x, y, 4 + k * 9, 0, 7); ctx.fill(); ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(x, y, 2 + k * 4, 0, 7); ctx.fill(); break;
    case 'electric': ctx.strokeStyle = '#e0f7fa'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, r = 6 + k * 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.5 + 3, y + Math.sin(a) * r * 0.5); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); } break;
    case 'poison': ctx.fillStyle = '#9ccc65'; for (let i = 0; i < 4; i++) { const a = i * 1.57 + k; ctx.beginPath(); ctx.arc(x + Math.cos(a) * k * 10, y + Math.sin(a) * k * 10 - k * 6, 3, 0, 7); ctx.fill(); } break;
    case 'slash': ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, y - 10 + k * 4); ctx.lineTo(x + 10, y + 10 - k * 4); ctx.stroke(); break;
    case 'magic': for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 3, r = 4 + k * 14; ctx.fillStyle = i % 2 ? f.col : '#fff'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 0, 7); ctx.fill(); } break;
    case 'holy': ctx.strokeStyle = '#fff59d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 6 + k * 16, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,253,231,.6)'; ctx.beginPath(); ctx.arc(x, y, 5 * (1 - k), 0, 7); ctx.fill(); break;
    case 'gold': ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('$', x - 3 + k * 6, y - k * 14); break;
  }
  ctx.restore();
}

/* =========================================================
 * SKILL UNIT
 * ========================================================= */
const UNIT_SKILLS = {
  scout:     { passive: { name: 'Bidikan Fokus', kind: 'focus', step: 0.08, max: 0.4, desc: '+8% damage tiap tembakan beruntun ke target yang sama (maks +40%).' },
               active:  { name: 'Rentetan', icon: '🔥', kind: 'rapid', mul: 3, dur: 5, cd: 35, desc: 'Menembak 3× lebih cepat selama 5 detik.' } },
  pistol:    { passive: { name: 'Tangan Cepat', kind: 'crit', ch: 0.15, mul: 2, desc: '15% peluang tembakan ganda (2× damage).' },
               active:  { name: 'Hujan Peluru', icon: '💥', kind: 'rapid', mul: 2.5, dur: 6, cd: 30, desc: 'Menembak 2,5× lebih cepat selama 6 detik.' } },
  sniper:    { passive: { name: 'Headshot', kind: 'firstStrike', mul: 2, desc: 'Tembakan pertama ke setiap musuh memberi 2× damage.' },
               active:  { name: 'Peluru Penembus', icon: '🎯', kind: 'pierce', mul: 6, cd: 40, desc: 'Tembakan 6× damage yang menembus semua musuh dalam satu garis.' } },
  archer:    { passive: { name: 'Panah Tajam', kind: 'shred', ch: 0.25, pct: 0.15, dur: 3, desc: '25% peluang melukai: musuh menerima +15% damage dari semua tower selama 3 detik.' },
               active:  { name: 'Hujan Panah', icon: '🏹', kind: 'rain', n: 6, mul: 1.5, r: 1, cd: 35, desc: '6 panah jatuh di musuh dalam jangkauan (1,5× damage, area).' } },
  farm:      { passive: { name: 'Panen Melimpah', kind: 'waveGold', pct: 0.1, desc: 'Pendapatan akhir wave +10%.' },
               active:  { name: 'Panen Kilat', icon: '🌾', kind: 'cash', mul: 1, cd: 60, desc: 'Langsung mendapat uang sebesar pendapatan per wave.' } },
  goldminer: { passive: { name: 'Urat Emas', kind: 'luckyGold', ch: 0.1, mul: 5, desc: '10% peluang pukulan menghasilkan emas 5×.' },
               active:  { name: 'Demam Emas', icon: '💰', kind: 'goldRush', mul: 3, dur: 6, cd: 45, desc: 'Emas per pukulan 3× & memukul 2× lebih cepat selama 6 detik.' } },
  demoman:   { passive: { name: 'Gegar', kind: 'stunHit', ch: 0.1, dur: 0.6, desc: '10% peluang membuat musuh pingsan 0,6 detik.' },
               active:  { name: 'Bom Cluster', icon: '💣', kind: 'rain', n: 4, mul: 2, r: 1.2, cd: 35, desc: '4 ledakan besar di musuh dalam jangkauan (2× damage).' } },
  freezer:   { passive: { name: 'Dingin Menusuk', kind: 'shred', ch: 1, pct: 0.1, dur: 2, desc: 'Musuh yang terkena menerima +10% damage selama 2 detik.' },
               active:  { name: 'Zona Beku', icon: '❄️', kind: 'freezeArea', dur: 2.5, cd: 40, desc: 'Membekukan semua musuh dalam jangkauan 2,5 detik (boss setengahnya).' } },
  cannon:    { passive: { name: 'Peluru Berat', kind: 'stunHit', ch: 0.15, dur: 0.5, desc: '15% peluang membuat musuh pingsan 0,5 detik.' },
               active:  { name: 'Salvo', icon: '💥', kind: 'rain', n: 5, mul: 1.8, r: 1.1, cd: 40, desc: '5 peluru meriam sekaligus (1,8× damage, area).' } },
  flamer:    { passive: { name: 'Bakar Habis', kind: 'execute', th: 0.25, mul: 1.5, desc: '+50% damage ke musuh dengan HP di bawah 25%.' },
               active:  { name: 'Badai Api', icon: '🔥', kind: 'blast', mul: 5, r: 2.2, center: 'self', cd: 35, desc: 'Ledakan api di sekitar tower (5× damage) & membakar.' } },
  mortar:    { passive: { name: 'Presisi', kind: 'bossDmg', mul: 1.3, desc: '+30% damage ke boss & mini-boss.' },
               active:  { name: 'Bombardir', icon: '🎆', kind: 'rain', n: 8, mul: 1.5, r: 1.3, cd: 45, desc: '8 peluru artileri menghujani musuh dalam jangkauan.' } },
  shotgun:   { passive: { name: 'Jarak Dekat', kind: 'close', mul: 1.4, near: 1.3, desc: '+40% damage ke musuh dalam jarak 1,3 petak.' },
               active:  { name: 'Ledakan Pendorong', icon: '💨', kind: 'knock', back: 1.5, mul: 2, cd: 35, desc: 'Mendorong musuh dalam jangkauan mundur 1,5 petak (2× damage).' } },
  minigun:   { passive: { name: 'Laras Panas', kind: 'focus', step: 0.03, max: 0.5, desc: '+3% damage tiap tembakan beruntun ke target sama (maks +50%).' },
               active:  { name: 'Overdrive', icon: '⚙️', kind: 'rapid', mul: 2, dur: 6, cd: 40, desc: 'Menembak 2× lebih cepat selama 6 detik.' } },
  commander: { passive: { name: 'Moral Tinggi', kind: 'aura', desc: 'Tower yang mendapat buff Commander juga +10% damage.' },
               active:  { name: 'Serbu!', icon: '📯', kind: 'rally', mul: 1.6, dur: 8, cd: 50, desc: 'Tower dalam jangkauan menembak 60% lebih cepat selama 8 detik.' } },
  tesla:     { passive: { name: 'Kejut', kind: 'stunHit', ch: 0.1, dur: 0.5, desc: '10% peluang membuat musuh pingsan 0,5 detik.' },
               active:  { name: 'Badai Listrik', icon: '⚡', kind: 'storm', hits: 10, mul: 2, cd: 40, desc: '10 sambaran petir ke musuh dalam jangkauan (2× damage).' } },
  laser:     { passive: { name: 'Lensa Panas', kind: 'execute', th: 0.3, mul: 1.5, desc: '+50% damage ke musuh dengan HP di bawah 30%.' },
               active:  { name: 'Sinar Fokus', icon: '🔴', kind: 'pierce', mul: 15, cd: 35, desc: 'Sinar 15× damage yang menembus satu garis.' } },
  poison:    { passive: { name: 'Korosif', kind: 'shred', ch: 1, pct: 0.2, dur: 3, desc: 'Musuh yang terkena menerima +20% damage selama 3 detik.' },
               active:  { name: 'Awan Racun', icon: '☠️', kind: 'blast', mul: 3, r: 2, center: 'target', cd: 40, desc: 'Awan racun besar (3× damage) yang juga meracuni & memperlambat.' } },
  ninja:     { passive: { name: 'Serangan Bayangan', kind: 'crit', ch: 0.2, mul: 2.5, desc: '20% peluang critical 2,5× damage.' },
               active:  { name: 'Seribu Shuriken', icon: '🌀', kind: 'storm', hits: 14, mul: 1.5, cd: 35, desc: '14 shuriken ke musuh dalam jangkauan.' } },
  rocketeer: { passive: { name: 'Pemburu Raja', kind: 'bossDmg', mul: 1.3, desc: '+30% damage ke boss & mini-boss.' },
               active:  { name: 'Misil Pintar', icon: '🚀', kind: 'rain', n: 6, mul: 2.5, r: 1.2, cd: 45, desc: '6 misil ke musuh terkuat dalam jangkauan (2,5× damage).' } },
  railgun:   { passive: { name: 'Muatan Penuh', kind: 'firstStrike', mul: 2, desc: 'Tembakan pertama ke setiap musuh memberi 2× damage.' },
               active:  { name: 'Tembakan Gauss', icon: '⚡', kind: 'pierce', mul: 8, cd: 40, desc: 'Tembakan 8× damage yang menembus satu garis.' } },
  warden:    { passive: { name: 'Distorsi Waktu', kind: 'shred', ch: 1, pct: 0.1, dur: 1, desc: 'Musuh dalam aura menerima +10% damage.' },
               active:  { name: 'Henti Waktu', icon: '⏳', kind: 'freezeArea', dur: 3, cd: 55, desc: 'Menghentikan semua musuh dalam jangkauan 3 detik.' } },
  samurai:   { passive: { name: 'Tebasan Akhir', kind: 'execute', th: 0.3, mul: 2, desc: '2× damage ke musuh dengan HP di bawah 30%.' },
               active:  { name: 'Seribu Tebasan', icon: '⚔️', kind: 'blast', mul: 6, r: 2.2, center: 'self', cd: 35, desc: 'Tebasan berputar ke semua musuh di sekitar (6× damage).' } },
  wizard:    { passive: { name: 'Mana Meluap', kind: 'crit', ch: 0.15, mul: 2, desc: '15% peluang sihir 2× damage.' },
               active:  { name: 'Meteor Arkana', icon: '☄️', kind: 'blast', mul: 8, r: 1.6, center: 'target', cd: 45, desc: 'Meteor sihir di target (8× damage, area).' } },
  angel:     { passive: { name: 'Cahaya Suci', kind: 'bossDmg', mul: 1.4, desc: '+40% damage ke boss & mini-boss.' },
               active:  { name: 'Berkah Surga', icon: '✨', kind: 'heal', hp: 15, mul: 3, cd: 60, desc: 'Memulihkan 15 nyawa base & cahaya suci 3× damage ke semua musuh dalam jangkauan.' } },
  nuke:      { passive: { name: 'Radiasi', kind: 'shred', ch: 1, pct: 0.25, dur: 4, desc: 'Musuh yang terkena menerima +25% damage selama 4 detik.' },
               active:  { name: 'Peluncuran Darurat', icon: '☢️', kind: 'blast', mul: 2, r: 3, center: 'target', cd: 60, desc: 'Meluncurkan hulu ledak tambahan seketika (2× damage, area sangat luas).' } },
  dragon:    { passive: { name: 'Napas Naga', kind: 'execute', th: 0.2, mul: 2, desc: '2× damage ke musuh dengan HP di bawah 20%.' },
               active:  { name: 'Lautan Api', icon: '🐉', kind: 'rain', n: 8, mul: 1.5, r: 1.3, cd: 40, desc: '8 bola api menghujani musuh dalam jangkauan.' } },
  reaper:    { passive: { name: 'Penuai', kind: 'killGold', gold: 10, desc: '+$10 setiap musuh yang dibunuh.' },
               active:  { name: 'Panen Jiwa', icon: '💀', kind: 'reap', th: 0.35, mul: 5, cd: 50, desc: 'Musuh (bukan boss) dalam jangkauan dengan HP < 35% langsung mati; sisanya terkena 5× damage.' } },
  cosmic:    { passive: { name: 'Gravitasi', kind: 'slowHit', ch: 0.3, slow: 0.5, desc: '30% peluang memperlambat musuh 50%.' },
               active:  { name: 'Lubang Hitam', icon: '🌌', kind: 'blackhole', back: 2.5, mul: 4, cd: 55, desc: 'Menarik musuh dalam jangkauan mundur 2,5 petak & memberi 4× damage.' } },
};
const SKILL_UNLOCK_LV = 2;   // skill aktif terbuka di level upgrade ini

const Skills = {
  of: t => UNIT_SKILLS[t.type] || {},
  /** Pengali damage dari skill pasif (hanya serangan langsung) */
  hitMul(t, e, a) {
    const p = this.of(t).passive; if (!p) return a;
    switch (p.kind) {
      case 'crit': if (Math.random() < p.ch) { a *= p.mul; addText(e.x, e.y - 36, 'CRIT', '#ff8a80', 0.5); } break;
      case 'focus': if (t.focusId !== e.id) { t.focusId = e.id; t.focusN = 0; } t.focusN = Math.min(p.max, (t.focusN || 0) + p.step); a *= 1 + t.focusN; break;
      case 'firstStrike': if (!e.struck || !e.struck[t.id]) { (e.struck = e.struck || {})[t.id] = 1; a *= p.mul; addText(e.x, e.y - 36, 'HEADSHOT', '#fff59d', 0.6); } break;
      case 'execute': if (e.hp < e.maxHp * p.th) a *= p.mul; break;
      case 'bossDmg': if (e.boss || e.miniboss) a *= p.mul; break;
      case 'close': if (Math.hypot(e.x - t.x, e.y - t.y) <= p.near * T) a *= p.mul; break;
    }
    if (t.buff > 0) a *= 1.1;                                       // pasif Commander (Moral Tinggi)
    return a;
  },
  /** Efek setelah serangan langsung */
  afterHit(t, e) {
    const p = this.of(t).passive; if (!p || e.dead) return;
    if (p.kind === 'shred' && Math.random() < p.ch) { e.shred = Math.max(S.time < (e.shredUntil || 0) ? e.shred : 0, p.pct); e.shredUntil = S.time + p.dur; }
    if (p.kind === 'stunHit' && !e.boss && Math.random() < p.ch) { e.frozenUntil = Math.max(e.frozenUntil || 0, S.time + p.dur); addText(e.x, e.y - 36, '💫', '#fff', 0.5); }
    if (p.kind === 'slowHit' && Math.random() < p.ch) applySlow(e, p.slow);
  },
  onKill(t, e) { const p = this.of(t).passive; if (p && p.kind === 'killGold') { addCash(t.owner || S.me, p.gold); addText(e.x, e.y - 20, '+$' + p.gold, '#ffd54f', 0.6); } },
  waveBonus(t, income) { const p = this.of(t).passive; return p && p.kind === 'waveGold' ? Math.round(income * p.pct) : 0; },
  goldMul(t) { const p = this.of(t).passive; let m = S.time < (t.goldRushUntil || 0) ? (this.of(t).active || {}).mul || 1 : 1; if (p && p.kind === 'luckyGold' && Math.random() < p.ch) { m *= p.mul; addText(t.x, t.y - 46, 'JACKPOT!', '#ffd54f', 0.7); } return m; },
  /** Pengali jeda tembakan (lebih kecil = lebih cepat) */
  rateMul(t) {
    let m = 1;
    if (S.time < (t.rapidUntil || 0)) m /= t.rapidMul || 1;
    if (S.time < (t.rallyUntil || 0)) m /= t.rallyMul || 1;
    return m;
  },
  ready(t) { return t.level >= SKILL_UNLOCK_LV && S.time >= (t.skCd || 0); },
  left(t) { return Math.max(0, Math.ceil((t.skCd || 0) - S.time)); },

  /** Gunakan skill aktif tower (host / solo) */
  use(t, pid = S.me) {
    const sk = this.of(t).active; if (!t || !sk) return false;
    if (t.owner !== pid) return false;
    if (pid === S.me && isGuest()) { if (t.level < SKILL_UNLOCK_LV || (t.skLeft || 0) > 0) { sfx('error'); return false; } MP.act({ a: 'skill', id: t.id }); sfx('upgrade'); return true; }
    if (t.level < SKILL_UNLOCK_LV) { if (pid === S.me) { sfx('error'); UI.toast(`🔒 Skill aktif terbuka di level ${SKILL_UNLOCK_LV}`); } return false; }
    if (!this.ready(t)) { if (pid === S.me) sfx('error'); return false; }
    const L = lvl(t), R = (L.range || 2) * T, base = L.dmg || 10;
    const inRange = (r = R, x = t.x, y = t.y) => S.enemies.filter(e => !e.dead && Math.hypot(e.x - x, e.y - y) <= r && (!e.hidden || canSeeHidden(t)));
    const target = () => inRange().sort((a, b) => b.dist - a.dist)[0];
    const boom = (x, y, r, col) => { S.effects.push({ kind: 'boom', x, y, r, life: 0.45, max: 0.45 }); fxEmit(['b', x | 0, y | 0, r | 0, 0.45]); if (col) { S.effects.push({ kind: 'shock', x, y, r, col, life: 0.5, max: 0.5 }); fxEmit(['s', x | 0, y | 0, r | 0, col, 0.5]); } };
    let used = true;
    switch (sk.kind) {
      case 'rapid': t.rapidUntil = S.time + sk.dur; t.rapidMul = sk.mul; break;
      case 'goldRush': t.goldRushUntil = S.time + sk.dur; t.rapidUntil = S.time + sk.dur; t.rapidMul = 2; break;
      case 'cash': { const v = Math.round((L.income || 100) * sk.mul); addCash(pid, v); addText(t.x, t.y - 40, '+$' + v, '#ffd54f', 1.2); fxEmit(['x', t.x, t.y - 40, '+$' + v, '#ffd54f', 1.2]); sfx('coin'); break; }
      case 'pierce': { const e = target(); if (!e) { used = false; break; }
        const ang = Math.atan2(e.y - t.y, e.x - t.x), ex = t.x + Math.cos(ang) * R * 1.4, ey = t.y + Math.sin(ang) * R * 1.4;
        for (const o of S.enemies) { if (o.dead) continue; const px = o.x - t.x, py = o.y - t.y, along = px * Math.cos(ang) + py * Math.sin(ang); if (along < 0 || along > R * 1.4) continue; if (Math.abs(-px * Math.sin(ang) + py * Math.cos(ang)) <= 20) damage(o, base * sk.mul, { ...L, pierceArmor: true }, t); }
        tracer(t.x, t.y - 10, ex, ey, '#fff', 9, 0.4, t.type === 'laser' ? 'laser' : 'railgun'); sfx('snipe'); break; }
      case 'rain': { const list = inRange(); if (!list.length) { used = false; break; }
        const pool = list.sort((a, b) => b.hp - a.hp);
        for (let i = 0; i < sk.n; i++) { const e = pool[i % pool.length]; S.stormQ.push({ t: i * 0.12, x: e.x + (Math.random() - 0.5) * 20, y: e.y + (Math.random() - 0.5) * 20, r: sk.r * T, dmg: base * sk.mul, src: t, L }); }
        sfx('rocket'); break; }
      case 'blast': { const c = sk.center === 'self' ? t : target(); if (!c) { used = false; break; }
        const r = sk.r * T, col = t.type === 'poison' ? '#9ccc65' : t.type === 'wizard' ? '#b388ff' : t.type === 'samurai' ? '#ffffff' : '#ff9800';
        for (const o of inRange(r, c.x, c.y)) { damage(o, base * sk.mul, { ...L, pierceArmor: true }, t); if (!o.dead && L.dot) applyDot(o, L, t); if (!o.dead && t.type === 'poison') applySlow(o, 0.4); }
        boom(c.x, c.y, r, col); sfx('boom'); break; }
      case 'freezeArea': { const list = inRange(R * (t.type === 'warden' ? 1.4 : 1)); for (const o of list) o.frozenUntil = Math.max(o.frozenUntil || 0, S.time + (o.boss ? sk.dur / 2 : sk.dur));
        S.effects.push({ kind: 'shock', x: t.x, y: t.y, r: R, col: '#81d4fa', life: 0.6, max: 0.6 }); fxEmit(['s', t.x | 0, t.y | 0, R | 0, '#81d4fa', 0.6]); sfx('freeze'); break; }
      case 'rally': for (const o of S.towers) if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) <= R) { o.rallyUntil = S.time + sk.dur; o.rallyMul = sk.mul; puff(o.x, o.y, '#ffd54f', 6); }
        S.effects.push({ kind: 'shock', x: t.x, y: t.y, r: R, col: '#ffd54f', life: 0.6, max: 0.6 }); fxEmit(['s', t.x | 0, t.y | 0, R | 0, '#ffd54f', 0.6]); sfx('upgrade'); break;
      case 'storm': { const list = inRange(); if (!list.length) { used = false; break; }
        for (let i = 0; i < sk.hits; i++) { const e = list[Math.floor(Math.random() * list.length)]; S.stormQ.push({ t: i * 0.09, x: e.x, y: e.y, r: 0.5 * T, dmg: base * sk.mul, src: t, L, bolt: t.type }); }
        sfx('stun'); break; }
      case 'knock': { const list = inRange(); for (const o of list) { damage(o, base * sk.mul, L, t); if (!o.dead && !o.boss) placeAtDist(o, Math.max(0, o.dist - sk.back * T)); }
        S.effects.push({ kind: 'shock', x: t.x, y: t.y, r: R, col: '#ffcc80', life: 0.4, max: 0.4 }); fxEmit(['s', t.x | 0, t.y | 0, R | 0, '#ffcc80', 0.4]); sfx('boom'); break; }
      case 'heal': S.hp = Math.min(S.maxHp || S.hp + sk.hp, S.hp + sk.hp); for (const o of inRange()) damage(o, base * sk.mul, { ...L, pierceArmor: true }, t);
        S.effects.push({ kind: 'shock', x: t.x, y: t.y, r: R, col: '#fff59d', life: 0.7, max: 0.7 }); fxEmit(['s', t.x | 0, t.y | 0, R | 0, '#fff59d', 0.7]); addText(t.x, t.y - 44, '+' + sk.hp + ' ❤️', '#a5d6a7', 1.2); sfx('upgrade'); break;
      case 'reap': for (const o of inRange()) { if (!o.boss && !o.miniboss && o.hp < o.maxHp * sk.th) { damage(o, o.hp + 1, { pierceArmor: true }, t); puff(o.x, o.y, '#7c4dff', 8); } else damage(o, base * sk.mul, { ...L, pierceArmor: true }, t); }
        S.effects.push({ kind: 'shock', x: t.x, y: t.y, r: R, col: '#7c4dff', life: 0.6, max: 0.6 }); fxEmit(['s', t.x | 0, t.y | 0, R | 0, '#7c4dff', 0.6]); sfx('stun'); break;
      case 'blackhole': { const list = inRange(); for (const o of list) { damage(o, base * sk.mul, { ...L, pierceArmor: true }, t); if (!o.dead && !o.boss) placeAtDist(o, Math.max(0, o.dist - sk.back * T)); }
        S.effects.push({ kind: 'shock', x: t.x, y: t.y, r: R, col: '#ea80fc', life: 0.8, max: 0.8 }); fxEmit(['s', t.x | 0, t.y | 0, R | 0, '#ea80fc', 0.8]); sfx('stun'); break; }
      default: used = false;
    }
    if (!used) { if (pid === S.me) { sfx('error'); UI.toast('Tidak ada musuh dalam jangkauan'); } return false; }
    t.skCd = S.time + sk.cd; t.recoil = 1;
    addText(t.x, t.y - 52, sk.icon + ' ' + sk.name, '#ffd54f', 1.2); fxEmit(['x', t.x, t.y - 52, sk.icon + ' ' + sk.name, '#ffd54f', 1.2]);
    if (pid === S.me) { PROFILE.stats.unitSkills = (PROFILE.stats.unitSkills || 0) + 1; }
    UI.refreshAll && UI.refreshAll();
    return true;
  },
  /** Proses antrian serangan bertahap (hujan / badai) — dipanggil tiap frame dari stormQ di game.js */
  hitQueued(q) {
    if (!q.src) return false;
    if (q.bolt) { atkFx(q.x, q.y - 120, q.x, q.y, '#18ffff', 3, 0.15, q.bolt === 'ninja' ? 'ninja' : 'tesla'); fxEmit(['t', q.x | 0, (q.y - 120) | 0, q.x | 0, q.y | 0, '#18ffff', 3, 0.15, q.bolt === 'ninja' ? 'ninja' : 'tesla']); }
    else { S.effects.push({ kind: 'boom', x: q.x, y: q.y, r: q.r, life: 0.35, max: 0.35 }); fxEmit(['b', q.x | 0, q.y | 0, q.r | 0, 0.35]); }
    for (const o of S.enemies) if (!o.dead && Math.hypot(o.x - q.x, o.y - q.y) <= q.r) { damage(o, q.dmg, { ...q.L, pierceArmor: true }, q.src); if (!o.dead && q.L.dot) applyDot(o, q.L, q.src); }
    return true;
  },
};
