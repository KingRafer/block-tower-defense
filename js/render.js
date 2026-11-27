/* =========================================================
 * Rendering canvas: peta, tower, musuh, efek, HUD di canvas
 * ========================================================= */
'use strict';

const cv = document.getElementById('game');
let ctx = cv.getContext('2d');
let fps = 60, fpsAcc = 0, fpsFrames = 0;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, v));
  return `rgb(${cl((n >> 16) + amt)},${cl((n >> 8 & 255) + amt)},${cl((n & 255) + amt)})`;
}
/** Balok gaya Roblox: muka atas + sisi depan + outline */
function block(x, y, w, h, depth, color) {
  ctx.fillStyle = shade(color, -55); ctx.fillRect(x, y + h - depth, w, depth * 2);
  ctx.fillStyle = color; ctx.fillRect(x, y - depth, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y - depth, w, 4);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.strokeRect(x, y - depth, w, h + depth);
}
function ring(x, y, r, fill, stroke, dash = true) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; if (dash) ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
}
function outlinedText(txt, x, y, size, col, align = 'center') {
  ctx.font = `900 ${size}px "Segoe UI",Arial`; ctx.textAlign = align;
  ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = '#000'; ctx.strokeText(txt, x, y);
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
}

/* ---------------- PETA ---------------- */
let mapCache = null, mapCacheKey = '';
function drawMapStatic(g) {
  const th = MAP.th;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const isP = pathTiles.has(c + ',' + r);
    g.fillStyle = isP ? ((c + r) % 2 ? th.p1 : th.p2) : ((c + r) % 2 ? th.g1 : th.g2);
    g.fillRect(c * T, r * T, T, T);
    if (isP) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(c * T + 6, r * T + 6, 10, 6); g.fillRect(c * T + 28, r * T + 30, 12, 6); }
    else if (th.lava && (c * 7 + r * 3) % 11 === 0) { g.fillStyle = '#ff6d00'; g.fillRect(c * T + 12, r * T + 14, 18, 6); g.fillRect(c * T + 20, r * T + 20, 8, 14); }
    if (SET.grid) { g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; g.strokeRect(c * T, r * T, T, T); }
  }
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 2;
  pathTiles.forEach(k => {
    const [c, r] = k.split(',').map(Number); if (c < 0 || c >= COLS) return;
    const x = c * T, y = r * T; g.beginPath();
    if (!pathTiles.has((c + 1) + ',' + r)) { g.moveTo(x + T, y); g.lineTo(x + T, y + T); }
    if (!pathTiles.has((c - 1) + ',' + r)) { g.moveTo(x, y); g.lineTo(x, y + T); }
    if (!pathTiles.has(c + ',' + (r + 1))) { g.moveTo(x, y + T); g.lineTo(x + T, y + T); }
    if (!pathTiles.has(c + ',' + (r - 1))) { g.moveTo(x, y); g.lineTo(x + T, y); }
    g.stroke();
  });
  // panah arah jalur
  g.fillStyle = 'rgba(255,255,255,.18)';
  for (let i = 0; i < pathPx.length - 1; i++) {
    const a = pathPx[i], b = pathPx[i + 1], ang = Math.atan2(b.y - a.y, b.x - a.x);
    const mx = (Math.max(0, Math.min(W, a.x)) + Math.max(0, Math.min(W, b.x))) / 2, my = (a.y + b.y) / 2;
    g.save(); g.translate(mx, my); g.rotate(ang); g.beginPath(); g.moveTo(8, 0); g.lineTo(-6, -7); g.lineTo(-6, 7); g.fill(); g.restore();
  }
}
function drawMap() {
  const key = MAP.id + SET.grid;
  if (mapCacheKey !== key) {
    mapCache = document.createElement('canvas'); mapCache.width = W; mapCache.height = H;
    drawMapStatic(mapCache.getContext('2d')); mapCacheKey = key;
  }
  ctx.drawImage(mapCache, 0, 0);
  // portal spawn
  const sy = MAP.path[0][1] * T, pulse = 0.5 + Math.sin(S.time * 4) * 0.2;
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, sy + 4, 12, T - 8);
  ctx.fillStyle = `rgba(171,71,188,${pulse})`; ctx.fillRect(0, sy + 8, 8, T - 16);
  // base
  const bx = 19 * T + 2, by = (exitRow() - 1) * T + 6;
  block(bx - 6, by, T + 4, T * 2 - 10, 10, '#90a4ae');
  block(bx + 2, by - 14, T - 12, 22, 6, '#e53935');
  ctx.fillStyle = '#fff'; ctx.fillRect(bx + 14, by - 40, 2, 24);
  ctx.fillStyle = '#e53935'; ctx.fillRect(bx + 16, by - 40, 14, 9);
  outlinedText('BASE', bx + 16, by + 42, 11, '#fff');
  for (const d of deco) drawDeco(d);
}
function drawDeco(d) {
  const x = d.c * T, y = d.r * T, th = MAP.th;
  if (d.type === 'tree' && th.cactus) { block(x + 18, y + 8, 12, 32, 4, th.tree); block(x + 8, y + 16, 8, 12, 3, th.tree); block(x + 32, y + 12, 8, 12, 3, th.tree); }
  else if (d.type === 'tree' && th.lava) { block(x + 10, y + 18, 28, 22, 8, '#5d4037'); ctx.fillStyle = th.tree; ctx.fillRect(x + 16, y + 8, 16, 6); }
  else if (d.type === 'tree') {
    block(x + 19, y + 26, 10, 18, 4, '#6d4c41'); block(x + 8, y + 12, 32, 22, 10, th.tree);
    if (th.snow) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y + 2, 32, 6); }
  } else block(x + 10, y + 20, 28, 18, 8, th.rock);
}

/* ---------------- TOWER ---------------- */
/* Bentuk senjata per tower: [panjang, lebar, warna] */
const GUNS = {
  sniper: [30, 6, '#263238'], minigun: [24, 9, '#263238'], demoman: [18, 10, '#263238'], rocketeer: [26, 12, '#4a148c'],
  freezer: [18, 7, '#4fc3f7'], pistol: [14, 5, '#3e2723'], cannon: [22, 12, '#212121'], flamer: [18, 9, '#ff7043'],
  mortar: [14, 14, '#4e342e'], laser: [22, 6, '#b71c1c'], poison: [16, 9, '#558b2f'], railgun: [32, 5, '#1a237e'],
};
function drawAccessory(acc, x, y, sk) {
  ctx.fillStyle = sk.gun || '#ffd600';
  if (acc === 'crown') { ctx.fillStyle = '#ffd600'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 8 + i * 6, y - 31 - (i === 1 ? 3 : 0), 4, 6); }
  else if (acc === 'band') { ctx.fillRect(x - 9, y - 22, 18, 3); ctx.fillRect(x + 8, y - 22, 6, 2); }
  else if (acc === 'hood') { ctx.fillStyle = sk.body; ctx.fillRect(x - 10, y - 30, 20, 6); ctx.fillRect(x - 10, y - 30, 3, 14); ctx.fillRect(x + 7, y - 30, 3, 14); }
  else if (acc === 'spike') { ctx.fillStyle = '#e1f5fe'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 9 + i * 7, y - 27); ctx.lineTo(x - 6 + i * 7, y - 36); ctx.lineTo(x - 3 + i * 7, y - 27); ctx.fill(); } }
  else if (acc === 'horn') { ctx.fillStyle = '#212121'; ctx.fillRect(x - 10, y - 33, 4, 7); ctx.fillRect(x + 6, y - 33, 4, 7); }
  else if (acc === 'santa') { ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.moveTo(x - 9, y - 27); ctx.lineTo(x + 9, y - 27); ctx.lineTo(x + 12, y - 38); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 10, y - 28, 20, 3); ctx.fillRect(x + 10, y - 40, 4, 4); }
  else if (acc === 'antenna') { ctx.fillStyle = '#90a4ae'; ctx.fillRect(x - 1, y - 36, 2, 9); ctx.fillStyle = '#00e676'; ctx.fillRect(x - 2, y - 38, 4, 4); }
  else if (acc === 'halo') { ctx.strokeStyle = '#fff59d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 33, 9, 3, 0, 0, 7); ctx.stroke(); }
}
/* ---------- gaya pixel untuk unit ----------
 * Unit digambar ke kanvas kecil (½ resolusi) lalu diperbesar tanpa smoothing,
 * diberi garis tepi gelap 1px agar serasi dengan latar pixel-art. */
const PIX = { sc: 0.5, bx: 64, top: 84, bot: 30, a: null, b: null, hard: false };
function pixelSprite(x, y, draw) {
  const w = Math.ceil(PIX.bx * 2 * PIX.sc), h = Math.ceil((PIX.top + PIX.bot) * PIX.sc);
  if (!PIX.a) { PIX.a = document.createElement('canvas'); PIX.b = document.createElement('canvas'); }
  const A = PIX.a, B = PIX.b;
  if (A.width !== w + 2 || A.height !== h + 2) { A.width = B.width = w + 2; A.height = B.height = h + 2; }
  const ga = A.getContext('2d'), gb = B.getContext('2d'), main = ctx;
  ga.setTransform(1, 0, 0, 1, 0, 0); ga.clearRect(0, 0, A.width, A.height); ga.globalAlpha = 1;
  ga.setTransform(PIX.sc, 0, 0, PIX.sc, 1 + (PIX.bx - x) * PIX.sc, 1 + (PIX.top - y) * PIX.sc);
  ctx = ga;
  try { draw(); } finally { ctx = main; }
  if (PIX.hard) {   // ikon menu: alpha dibuat tegas (tanpa anti-alias)
    const im = ga.getImageData(0, 0, A.width, A.height), d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0;
    ga.putImageData(im, 0, 0);
  }
  gb.setTransform(1, 0, 0, 1, 0, 0); gb.clearRect(0, 0, B.width, B.height); gb.globalAlpha = 1;
  gb.globalCompositeOperation = 'source-over';
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) gb.drawImage(A, dx, dy);
  gb.globalCompositeOperation = 'source-in'; gb.fillStyle = '#141a1f'; gb.fillRect(0, 0, B.width, B.height);
  gb.globalCompositeOperation = 'source-over'; gb.drawImage(A, 0, 0);
  const sm = main.imageSmoothingEnabled; main.imageSmoothingEnabled = false;
  main.drawImage(B, x - PIX.bx - 1 / PIX.sc, y - PIX.top - 1 / PIX.sc, B.width / PIX.sc, B.height / PIX.sc);
  main.imageSmoothingEnabled = sm;
}
function drawTower(t, ghost) {
  const unit = ghost ? unitOf(t.type) : t;
  const evo = !!unit.evo, sk = SKINS[(ghost ? unit.skin : t.skin) || 'default'] || SKINS.default;
  const base = evo ? EVOS[t.type].color : TOWERS[t.type].color;
  const body = sk.rainbow ? `hsl(${(S.time * 90 + t.x) % 360},80%,55%)` : (sk.body || base);
  const head = sk.rainbow ? '#fff8e1' : (sk.head || '#fdd835'), x = t.x, y = t.y;
  const stunned = !ghost && S.time < t.stunUntil;
  const glow = sk.glow || (evo ? '#ffd54f' : null);
  if (glow) {
    const pr = 22 + Math.sin(S.time * 3 + t.x) * 3;
    ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.3; ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(x, y + 10, pr + 6, pr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = ghost ? 0.65 : 1;
  }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 16, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (!ghost && isMP() && t.owner) { ctx.strokeStyle = playerColor(t.owner); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 14, 22, 9, 0, 0, Math.PI * 2); ctx.stroke(); }
  pixelSprite(x, y, () => {
    block(x - 19, y + 4, 38, 12, 6, t.level >= 3 ? '#ffb300' : '#78909c');
    if (t.type === 'farm') drawFarm(t, x, y, sk);
    else if (t.type === 'nuke') drawNuke(t, x, y, sk, body);
    else if (t.type === 'dragon') drawDragon(t, x, y, sk, body);
    else drawHero(t, x, y, sk, evo, base);
  });
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(x - 14 + i * 8, y + 18, 6, 6);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x - 14 + i * 8, y + 18, 6, 6);
  }
  const tr = !ghost && t.trait && TRAITS[t.trait];
  if (tr) { ctx.fillStyle = RARITY[tr.rarity].color; ctx.save(); ctx.translate(x + 18, y + 21); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(-4, -4, 8, 8); ctx.restore(); }
  if (!ghost && (t.buff > 0 || S.overclockT > 0)) outlinedText(S.overclockT > 0 ? '⚡' : '▲', x + 17, y - 18, 11, S.overclockT > 0 ? '#ffee58' : '#7c4dff');
  if (stunned) { outlinedText('💫', x, y - 34 + Math.sin(S.time * 8) * 2, 16, '#fff'); }
}

/** Gambar tower di kanvas kecil (untuk kartu unit di menu) */
function drawUnitIcon(canvas, type, skin, evo) {
  const g = canvas.getContext('2d'), prev = ctx;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.save(); g.scale(canvas.width / 64, canvas.height / 64); g.imageSmoothingEnabled = false;
  ctx = g; PIX.hard = true;
  try { drawTower({ type, x: 32, y: 40, level: 0, angle: -0.6, recoil: 0, evo, skin: skin || 'default', owner: null }, false); }
  finally { ctx = prev; PIX.hard = false; g.restore(); }
}

/* ---------------- MUSUH ---------------- */
function drawEnemy(e) {
  const s = e.size * T, x = e.x, bob = Math.sin(S.time * 10 + e.wob) * 2;
  const fly = e.flying ? 14 + Math.sin(S.time * 6 + e.wob) * 3 : 0, y = e.y - fly;
  ctx.globalAlpha = e.hidden ? 0.45 : 1;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, e.y + s * 0.35, s * 0.45 * (fly ? 0.7 : 1), s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  const enraged = e.berserk && e.hp < e.maxHp * 0.5;
  const body = e.hitT > 0 ? '#ffffff' : enraged ? '#ff1744' : e.color;
  if (e.flying) {      // sayap
    const flap = Math.sin(S.time * 18 + e.wob) * 6;
    ctx.fillStyle = shade(e.color, -20);
    ctx.beginPath(); ctx.moveTo(x - s * 0.3, y); ctx.lineTo(x - s * 0.95, y - s * 0.35 - flap); ctx.lineTo(x - s * 0.35, y + s * 0.15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + s * 0.3, y); ctx.lineTo(x + s * 0.95, y - s * 0.35 - flap); ctx.lineTo(x + s * 0.35, y + s * 0.15); ctx.fill();
  }
  block(x - s * 0.35, y - s * 0.1 + bob, s * 0.7, s * 0.45, s * 0.12, body);
  block(x - s * 0.25, y - s * 0.55 + bob, s * 0.5, s * 0.38, s * 0.1, e.boss ? '#9c27b0' : e.type === 'skeleton' ? '#fafafa' : shade(e.color, 30));
  ctx.fillStyle = e.boss || e.miniboss ? '#ffeb3b' : enraged ? '#ffeb3b' : e.type === 'skeleton' ? '#000' : '#b71c1c';
  ctx.fillRect(x - s * 0.14, y - s * 0.5 + bob, s * 0.09, s * 0.09); ctx.fillRect(x + s * 0.05, y - s * 0.5 + bob, s * 0.09, s * 0.09);
  if (e.armor) { ctx.fillStyle = 'rgba(176,190,197,.85)'; ctx.fillRect(x - s * 0.27, y - s * 0.72 + bob, s * 0.54, s * 0.12); }
  if (e.boss) { ctx.fillStyle = '#ffd600'; for (let i = 0; i < 3; i++) ctx.fillRect(x - s * 0.22 + i * s * 0.17, y - s * 0.86 + bob, s * 0.1, s * 0.14); }
  if (e.miniboss) { ctx.fillStyle = '#546e7a'; ctx.fillRect(x - s * 0.5, y - s * 0.05 + bob, s * 0.16, s * 0.3); ctx.fillRect(x + s * 0.34, y - s * 0.05 + bob, s * 0.16, s * 0.3); }
  if (e.thief) { ctx.fillStyle = '#212121'; ctx.fillRect(x - s * 0.27, y - s * 0.48 + bob, s * 0.54, s * 0.1); outlinedText('$', x + s * 0.4, y - s * 0.05 + bob, 11, '#ffd54f'); }
  if (e.bomber) { ctx.fillStyle = '#212121'; ctx.fillRect(x - 1, y - s * 0.8 + bob, 2, s * 0.22); ctx.fillStyle = Math.sin(S.time * 20) > 0 ? '#ffeb3b' : '#ff5722'; ctx.fillRect(x - 2.5, y - s * 0.86 + bob, 5, 5); }
  if (e.necro) { ctx.fillStyle = '#4e342e'; ctx.fillRect(x + s * 0.4, y - s * 0.7 + bob, 3, s * 0.9); ctx.fillStyle = '#b388ff'; ctx.beginPath(); ctx.arc(x + s * 0.4 + 1.5, y - s * 0.72 + bob, 4, 0, 7); ctx.fill(); }
  if (e.healer) outlinedText('✚', x, y - s * 0.78 + bob, 12, '#69f0ae');
  if (e.regen) outlinedText('+', x + s * 0.4, y - s * 0.4 + bob, 13, '#69f0ae');
  if (e.shieldHp > 0) { ctx.strokeStyle = 'rgba(100,181,246,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - s * 0.15 + bob, s * 0.55, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (e.dot && S.time < e.dot.until) outlinedText(e.dot.col === 'poison' ? '☠' : '🔥', x - s * 0.45, y - s * 0.3 + bob, 12, e.dot.col === 'poison' ? '#76ff03' : '#fff');
  if (e.frozenUntil && S.time < e.frozenUntil) { ctx.fillStyle = 'rgba(179,229,252,.7)'; ctx.fillRect(x - s * 0.42, y - s * 0.75 + bob, s * 0.84, s * 1.1); }
  if (S.time < e.slowUntil && !e.noSlow) { ctx.fillStyle = 'rgba(129,212,250,.35)'; ctx.fillRect(x - s * 0.4, y - s * 0.7 + bob, s * 0.8, s * 1.05); }
  if (!e.boss) {
    const bw = Math.max(30, s), pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#000'; ctx.fillRect(x - bw / 2 - 1, y - s * 0.85 - 1, bw + 2, 7);
    ctx.fillStyle = pct > 0.5 ? '#66bb6a' : pct > 0.25 ? '#ffca28' : '#ef5350';
    ctx.fillRect(x - bw / 2, y - s * 0.85, bw * pct, 5);
    if (e.maxShield > 0 && e.shieldHp > 0) { ctx.fillStyle = '#64b5f6'; ctx.fillRect(x - bw / 2, y - s * 0.85 - 5, bw * Math.min(1, e.shieldHp / e.maxShield), 3); }
  }
}
function drawBossBar() {
  const bosses = S.enemies.filter(e => e.boss || e.miniboss);
  bosses.slice(0, 2).forEach((b, i) => {
    const bw = 420, x = W / 2 - bw / 2, y = 14 + i * 34, pct = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - 4, y - 4, bw + 8, 26);
    ctx.fillStyle = '#4a148c'; ctx.fillRect(x, y, bw, 18);
    ctx.fillStyle = '#e040fb'; ctx.fillRect(x, y, bw * pct, 18);
    outlinedText(`${b.boss ? '👑' : '🗿'} ${b.name} — ${fmtNum(b.hp)} / ${fmtNum(b.maxHp)}`, W / 2, y + 14, 13, '#fff');
  });
}

/* ---------------- FRAME ---------------- */
function draw(dt) {
  ctx.save();
  if (S.shake > 0) { ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake); S.shake *= 0.85; if (S.shake < 0.5) S.shake = 0; }
  drawMap();

  const sel = S.selected;
  if (SET.range && sel && sel.type !== 'farm') {
    const isCmd = sel.type === 'commander';
    ring(sel.x, sel.y, lvl(sel).range * T, isCmd ? 'rgba(124,77,255,.15)' : 'rgba(255,255,255,.15)', isCmd ? 'rgba(124,77,255,.8)' : 'rgba(255,255,255,.7)');
  }

  const objs = [];
  for (const t of S.towers) objs.push({ y: t.y, f: () => drawTower(t) });
  for (const e of S.enemies) objs.push({ y: e.y, f: () => drawEnemy(e) });
  objs.sort((a, b) => a.y - b.y).forEach(o => o.f());
  if (sel) { ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 3; ctx.strokeRect(sel.c * T + 2, sel.r * T + 2, T - 4, T - 4); }

  for (const p of S.projectiles) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    if (p.kind === 'fire') { ctx.fillStyle = '#ff6d00'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(2, 0, 3.5, 0, 7); ctx.fill(); }
    else if (p.kind === 'shell') { ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); }
    else if (p.kind === 'nuke') { ctx.fillStyle = '#9e9e9e'; ctx.fillRect(-12, -5, 24, 10); ctx.fillStyle = '#e53935'; ctx.fillRect(8, -5, 6, 10); ctx.fillStyle = '#ffeb3b'; ctx.fillRect(-16, -3, 4, 6); }
    else {
      const L = p.big ? 18 : 14;
      ctx.fillStyle = p.big ? '#6a1b9a' : '#424242'; ctx.fillRect(-L / 2, -3, L, 6);
      ctx.fillStyle = '#ff7043'; ctx.fillRect(-L / 2 - 4, -2, 4, 4);
    }
    ctx.restore();
  }
  for (const f of S.effects) {
    const k = f.life / f.max;
    ctx.globalAlpha = Math.max(0, k);
    if (f.kind === 'atk') drawAtkFx(f);
    else if (f.kind === 'imp') drawImpactFx(f);
    else if (f.kind === 'tracer') { ctx.strokeStyle = f.col; ctx.lineWidth = f.w; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); }
    else if (f.kind === 'flash') { ctx.fillStyle = '#fff59d'; ctx.beginPath(); ctx.arc(f.x, f.y, 6, 0, 7); ctx.fill(); }
    else if (f.kind === 'boom') {
      ctx.fillStyle = '#ff9800'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - k * 0.5), 0, 7); ctx.fill();
      ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.5 * (1.2 - k * 0.5), 0, 7); ctx.fill();
    } else if (f.kind === 'shock') {
      ctx.strokeStyle = f.col || '#e040fb'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.8), 0, 7); ctx.stroke();
    } else if (f.kind === 'smoke') { ctx.fillStyle = 'rgba(160,160,160,.6)'; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + (1 - k) * 5, 0, 7); ctx.fill(); }
    else if (f.kind === 'part') { ctx.fillStyle = f.col; ctx.fillRect(f.x, f.y, f.s, f.s); }
  }
  ctx.globalAlpha = 1;

  // Pratinjau penempatan
  if (S.placing && S.mouse.in) {
    const c = Math.floor(S.mouse.x / T), r = Math.floor(S.mouse.y / T);
    const why = placeReason(S.placing, c, r), ok = !why, def = TOWERS[S.placing];
    ctx.fillStyle = ok ? 'rgba(255,255,255,.3)' : 'rgba(244,67,54,.4)'; ctx.fillRect(c * T, r * T, T, T);
    if (def.levels[0].range) ring((c + 0.5) * T, (r + 0.5) * T, def.levels[0].range * T,
      ok ? 'rgba(255,255,255,.12)' : 'rgba(244,67,54,.12)', ok ? 'rgba(255,255,255,.6)' : 'rgba(244,67,54,.7)');
    ctx.globalAlpha = 0.65;
    drawTower({ type: S.placing, x: (c + 0.5) * T, y: (r + 0.5) * T, level: 0, angle: -Math.PI / 2, recoil: 0 }, true);
    ctx.globalAlpha = 1;
    if (why) outlinedText(why, (c + 0.5) * T, r * T - 8, 13, '#ff8a80');
  }

  // Skill: penanda serangan udara & bidikan
  for (const st of S.strikes) {
    const k = 1 - st.t / st.max;
    ctx.strokeStyle = 'rgba(255,82,82,.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(st.x, st.y, (st.r || 1.4) * T * (1 - k * 0.6), 0, 7); ctx.stroke();
    if (st.big) { const my = st.y - 300 * (1 - k); ctx.fillStyle = '#ff7043'; ctx.beginPath(); ctx.arc(st.x + 80 * (1 - k), my, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(st.x + 80 * (1 - k), my, 7, 0, 7); ctx.fill(); }
    ctx.fillStyle = `rgba(255,82,82,${0.15 + k * 0.25})`; ctx.fill();
  }
  if (S.targeting && S.mouse.in) {
    ring(S.mouse.x, S.mouse.y, S.targeting === 'meteor' ? 2.3 * T : 1.4 * T + 34, 'rgba(255,82,82,.18)', 'rgba(255,82,82,.9)');
    outlinedText(S.targeting === 'meteor' ? '☄️ Klik untuk menjatuhkan meteor' : '✈️ Klik untuk menjatuhkan bom', S.mouse.x, S.mouse.y - 1.4 * T - 44, 13, '#ff8a80');
  }
  if (S.shieldT > 0) { ctx.strokeStyle = `rgba(100,181,246,${0.5 + Math.sin(S.time * 8) * 0.3})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(19.5 * T, exitRow() * T, 60, 0, 7); ctx.stroke(); }
  if (S.radarT > 0) { ctx.strokeStyle = 'rgba(179,136,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, H / 2, (S.time * 300) % 600, 0, 7); ctx.stroke(); }
  if (S.freezeT > 0) { ctx.fillStyle = `rgba(129,212,250,${Math.min(0.18, S.freezeT * 0.06)})`; ctx.fillRect(0, 0, W, H); }

  for (const x of S.texts) { ctx.globalAlpha = Math.min(1, x.life / x.max * 2); outlinedText(x.txt, x.x, x.y, 15, x.col); }
  ctx.globalAlpha = 1;
  drawBossBar();
  if (S.autoSkip && S.state === 'ready' && S.wave < S.maxWave) outlinedText(`Wave berikutnya dalam ${Math.max(1, Math.ceil(S.autoTimer))}...`, W / 2, H - 16, 18, '#fff');
  else if (S.autoSkip && S.autoSkipT != null && canSkip()) outlinedText(`Auto skip dalam ${Math.max(1, Math.ceil(S.autoSkipT))}... (+$${skipBonusAmt()})`, W / 2, H - 16, 18, '#ffd54f');

  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.5) { fps = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
  if (SET.fps) outlinedText(fps + ' FPS', 8, H - 10, 12, '#fff', 'left');
  ctx.restore();
}

/** Mini preview peta untuk menu pilih map */
function drawPreview(c, m) {
  const g = c.getContext('2d'), ts = c.width / COLS, tiles = computeTiles(m.path);
  for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) {
    const p = tiles.has(x + ',' + r);
    g.fillStyle = p ? m.th.p1 : ((x + r) % 2 ? m.th.g1 : m.th.g2);
    g.fillRect(x * ts, r * ts, ts + 0.5, ts + 0.5);
  }
  const e = m.path[m.path.length - 1];
  g.fillStyle = '#e53935'; g.fillRect(19 * ts, (e[1] - 1) * ts, ts, ts * 2);
  g.fillStyle = '#ab47bc'; g.fillRect(0, m.path[0][1] * ts, ts / 2, ts);
}
