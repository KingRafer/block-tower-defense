/* =========================================================
 * Rendering canvas: peta, tower, musuh, efek, HUD di canvas
 * ========================================================= */
'use strict';

const cv = document.getElementById('game');
let ctx = cv.getContext('2d');
let fps = 60, fpsAcc = 0, fpsFrames = 0;
/* Resolusi arena mengikuti ukuran layar (maks 2×) agar gambar tajam */
let RES = 1, resCheck = 0;
function fitRes() {
  const r = cv.getBoundingClientRect(); if (!r.width) return;
  const want = Math.min(2, Math.max(1, Math.ceil(r.width * (window.devicePixelRatio || 1) / W * 2) / 2));
  if (want !== RES || cv.width !== Math.round(W * want)) { RES = want; cv.width = Math.round(W * RES); cv.height = Math.round(H * RES); }
}

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
/* =========================================================
 * ARENA v6: medan bergaya pixel-art (rumput bertekstur, jalan tanah
 * berlis, pohon berlapis, kastil base, portal), cuaca & bayangan awan.
 * ========================================================= */
const hash2 = (a, b, i = 0) => { let h = (a * 374761393 + b * 668265263 + i * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const hexRgb2 = h => { const n = parseInt((h || '#999999').slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mixC = (c1, c2, k) => { const a = hexRgb2(c1), b = hexRgb2(c2); return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`; };
function drawMapStatic(g) {
  const th = MAP.th, isP = (c, r) => pathTiles.has(c + ',' + r);
  const grassHi = shade(th.g1, 14), grassLo = shade(th.g2, -16), dirtHi = shade(th.p1, 14), dirtLo = shade(th.p2, -22);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = c * T, y = r * T, p = isP(c, r), n = hash2(c, r);
    g.fillStyle = p ? mixC(th.p1, th.p2, n) : mixC(th.g1, th.g2, n * 0.9);
    g.fillRect(x, y, T, T);
    for (let i = 0; i < 3; i++) {
      const k = hash2(c, r, i + 1); g.fillStyle = k > 0.5 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.055)';
      g.fillRect(x + hash2(c, r, i + 9) * 34, y + hash2(c, r, i + 19) * 34, 10 + k * 10, 8 + k * 8);
    }
    if (p) {
      for (let i = 0; i < 4; i++) { const px = x + 4 + hash2(c, r, 30 + i) * (T - 8), py = y + 4 + hash2(c, r, 40 + i) * (T - 8), sz = 2 + hash2(c, r, 50 + i) * 3;
        g.fillStyle = dirtLo; g.fillRect(px, py + 1, sz + 1, sz); g.fillStyle = dirtHi; g.fillRect(px, py, sz, sz - 1); }
    } else {
      for (let i = 0; i < 7; i++) { const px = x + 2 + hash2(c, r, 60 + i) * (T - 6), py = y + 4 + hash2(c, r, 70 + i) * (T - 8);
        if (th.lava) { if (i < 2) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px, py, 6, 2); } continue; }
        g.fillStyle = grassLo; g.fillRect(px, py, 1.5, 4); g.fillRect(px + 2.5, py + 1, 1.5, 3); g.fillStyle = grassHi; g.fillRect(px + 1.2, py - 1, 1.3, 3); }
      const f = hash2(c, r, 99);
      if (!th.snow && !th.lava && !th.cactus && f > 0.72) {
        const fc = ['#fff59d', '#ffffff', '#f48fb1', '#ce93d8'][Math.floor(hash2(c, r, 98) * 4)];
        for (let i = 0; i < 3; i++) { const px = x + 6 + hash2(c, r, 80 + i) * 34, py = y + 6 + hash2(c, r, 90 + i) * 34; g.fillStyle = fc; g.fillRect(px, py, 3, 3); g.fillStyle = '#fbc02d'; g.fillRect(px + 1, py + 1, 1, 1); }
      }
      if (th.cactus && f > 0.8) { g.fillStyle = 'rgba(120,80,40,.25)'; g.fillRect(x + 8, y + 30, 26, 2); g.fillRect(x + 16, y + 26, 20, 2); }
      if (th.snow && f > 0.7) { g.fillStyle = '#ffffff'; g.fillRect(x + hash2(c, r, 5) * 40, y + hash2(c, r, 6) * 40, 2, 2); }
      if (th.ice && (c * 5 + r * 7) % 9 === 0) { g.fillStyle = '#b9e2f3'; g.fillRect(x + 6, y + 10, 30, 22); g.fillStyle = '#d6f0fb'; g.fillRect(x + 8, y + 12, 26, 4); g.fillStyle = '#ffffff'; g.fillRect(x + 10, y + 14, 10, 2); g.fillRect(x + 24, y + 25, 6, 2); }
      if (th.lava && (c * 7 + r * 3) % 11 === 0) { g.fillStyle = '#3e1a0f'; g.fillRect(x + 8, y + 16, 30, 10); g.fillStyle = '#ff6d00'; g.fillRect(x + 11, y + 19, 24, 4); g.fillStyle = '#ffd54f'; g.fillRect(x + 16, y + 20, 10, 2); }
    }
  }
  pathTiles.forEach(k => {
    const [c, r] = k.split(',').map(Number); if (c < 0 || c >= COLS) return;
    const x = c * T, y = r * T;
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], si) => {
      if (isP(c + dx, r + dy) || c + dx < 0 || c + dx >= COLS) return;
      g.fillStyle = 'rgba(40,24,12,.28)';
      if (dy === -1) g.fillRect(x, y, T, 5); if (dy === 1) g.fillRect(x, y + T - 3, T, 3); if (dx === -1) g.fillRect(x, y, 4, T); if (dx === 1) g.fillRect(x + T - 4, y, 4, T);
      g.fillStyle = th.lava ? '#2b1a14' : mixC(th.g1, th.g2, 0.5);
      for (let i = 0; i < 6; i++) {
        const t = (i + hash2(c, r, si * 10 + i) * 0.8) / 6 * T, len = 2 + hash2(c, r, si * 20 + i) * 5;
        if (dy === -1) g.fillRect(x + t, y, 3, len); if (dy === 1) g.fillRect(x + t, y + T - len, 3, len);
        if (dx === -1) g.fillRect(x, y + t, len, 3); if (dx === 1) g.fillRect(x + T - len, y + t, len, 3);
      }
    });
  });
  g.fillStyle = 'rgba(255,255,255,.13)';
  for (let i = 0; i < pathPx.length - 1; i++) {
    const a2 = pathPx[i], b2 = pathPx[i + 1], ang = Math.atan2(b2.y - a2.y, b2.x - a2.x);
    const mx = (Math.max(0, Math.min(W, a2.x)) + Math.max(0, Math.min(W, b2.x))) / 2, my = (a2.y + b2.y) / 2;
    g.save(); g.translate(mx, my); g.rotate(ang); g.beginPath(); g.moveTo(8, 0); g.lineTo(-6, -7); g.lineTo(-3, 0); g.lineTo(-6, 7); g.fill(); g.restore();
  }
  if (SET.grid) { g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g.strokeRect(c * T, r * T, T, T); }
  const prev = ctx; ctx = g; try { for (const d of deco) drawDeco(d); } finally { ctx = prev; }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.65);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, th.lava ? 'rgba(40,0,0,.38)' : 'rgba(0,10,20,.3)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function drawMap() {
  const key = MAP.id + SET.grid + RES;
  if (mapCacheKey !== key) {
    mapCache = document.createElement('canvas'); mapCache.width = W * RES; mapCache.height = H * RES;
    const mg = mapCache.getContext('2d'); mg.scale(RES, RES); drawMapStatic(mg); mapCacheKey = key;
  }
  ctx.drawImage(mapCache, 0, 0, W, H);
  if (MAP.th.lava) { ctx.fillStyle = `rgba(255,109,0,${0.06 + Math.sin(S.time * 2) * 0.04})`; ctx.fillRect(0, 0, W, H); }
  drawPortal();
  drawBase();
}
function drawDeco(d) {
  const x = d.c * T, y = d.r * T, th = MAP.th, cx = x + T / 2, n = hash2(d.c, d.r, 7);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx + 3, y + 40, 17, 6, 0, 0, 7); ctx.fill();
  if (d.type === 'tree' && th.cactus) {
    const C2 = th.tree, D2 = shade(C2, -30), L2 = shade(C2, 25);
    const arm = (ax, ay, w, h) => { ctx.fillStyle = D2; ctx.fillRect(ax - 1, ay - 1, w + 2, h + 2); ctx.fillStyle = C2; ctx.fillRect(ax, ay, w, h); ctx.fillStyle = L2; ctx.fillRect(ax + 1, ay + 1, 2, h - 2); };
    arm(cx - 5, y + 6, 10, 34); arm(cx - 15, y + 16, 8, 6); arm(cx - 15, y + 8, 6, 12); arm(cx + 7, y + 20, 8, 6); arm(cx + 11, y + 12, 6, 13);
    ctx.fillStyle = '#f48fb1'; ctx.fillRect(cx - 2, y + 3, 4, 4);
  } else if (d.type === 'tree' && th.lava) {
    ctx.fillStyle = '#1b1210'; ctx.beginPath(); ctx.moveTo(x + 8, y + 40); ctx.lineTo(x + 14, y + 14); ctx.lineTo(x + 26, y + 6); ctx.lineTo(x + 38, y + 18); ctx.lineTo(x + 41, y + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.moveTo(x + 14, y + 38); ctx.lineTo(x + 18, y + 16); ctx.lineTo(x + 26, y + 11); ctx.lineTo(x + 24, y + 38); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff6d00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 22, y + 14); ctx.lineTo(x + 28, y + 24); ctx.lineTo(x + 24, y + 34); ctx.stroke();
    ctx.fillStyle = '#ffab40'; ctx.fillRect(x + 25, y + 22, 3, 3);
  } else if (d.type === 'tree') {
    const C2 = th.tree, D2 = shade(C2, -28), L2 = shade(C2, 22), L3 = shade(C2, 40);
    ctx.fillStyle = '#4e342e'; ctx.fillRect(cx - 4, y + 24, 8, 16); ctx.fillStyle = '#6d4c41'; ctx.fillRect(cx - 4, y + 24, 3, 16);
    const blob = (bx, by, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); };
    if (th.snow || n > 0.6) {
      for (let i = 0; i < 3; i++) { const w = 30 - i * 7, ty = y + 26 - i * 9;
        ctx.fillStyle = D2; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 1, ty + 2); ctx.lineTo(cx, ty - 14); ctx.lineTo(cx + w / 2 + 1, ty + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C2; ctx.beginPath(); ctx.moveTo(cx - w / 2 + 2, ty); ctx.lineTo(cx, ty - 12); ctx.lineTo(cx + w / 2 - 2, ty); ctx.closePath(); ctx.fill();
        ctx.fillStyle = L2; ctx.beginPath(); ctx.moveTo(cx - w / 2 + 4, ty - 1); ctx.lineTo(cx - 1, ty - 11); ctx.lineTo(cx - 1, ty - 1); ctx.closePath(); ctx.fill();
        if (th.snow) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - w / 4, ty - 8, w / 2, 2); } }
    } else {
      blob(cx + 2, y + 18, 15, D2); blob(cx - 7, y + 20, 10, D2); blob(cx + 9, y + 21, 10, D2);
      blob(cx, y + 15, 14, C2); blob(cx - 8, y + 18, 9, C2); blob(cx + 8, y + 19, 9, C2);
      blob(cx - 4, y + 11, 8, L2); blob(cx - 6, y + 9, 4, L3);
      if (n > 0.3 && n < 0.45) { ctx.fillStyle = '#e53935'; ctx.fillRect(cx + 5, y + 15, 3, 3); ctx.fillRect(cx - 8, y + 21, 3, 3); }
    }
  } else {
    const R2 = th.rock, D2 = shade(R2, -35), L2 = shade(R2, 25);
    ctx.fillStyle = D2; ctx.beginPath(); ctx.moveTo(x + 9, y + 40); ctx.lineTo(x + 12, y + 24); ctx.lineTo(x + 22, y + 16); ctx.lineTo(x + 34, y + 20); ctx.lineTo(x + 40, y + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = R2; ctx.beginPath(); ctx.moveTo(x + 12, y + 38); ctx.lineTo(x + 14, y + 25); ctx.lineTo(x + 23, y + 19); ctx.lineTo(x + 32, y + 22); ctx.lineTo(x + 36, y + 38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = L2; ctx.beginPath(); ctx.moveTo(x + 15, y + 26); ctx.lineTo(x + 23, y + 20); ctx.lineTo(x + 26, y + 24); ctx.lineTo(x + 17, y + 30); ctx.closePath(); ctx.fill();
    if (th.snow) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 17, y + 18, 14, 3); }
    else if (!th.lava && !th.cactus) { ctx.fillStyle = '#558b2f'; ctx.fillRect(x + 28, y + 30, 6, 3); ctx.fillRect(x + 12, y + 34, 5, 2); }
  }
}
/* Kastil base & portal spawn (dinamis) */
function drawBase() {
  const er = exitRow(), bx = W - 62, by = er * T + T / 2, hpk = S.maxHp ? Math.max(0, S.hp / S.maxHp) : 1, tt = S.time;
  const st = '#9aa7b0', stD = '#6c7a84', stL = '#c2ccd2', rf = '#c0392b';
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(bx + 26, by + 30, 34, 9, 0, 0, 7); ctx.fill();
  const wall = (x, y, w, h) => { ctx.fillStyle = stD; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = st; ctx.fillRect(x, y, w, h); ctx.fillStyle = stL; ctx.fillRect(x, y, Math.max(2, w * 0.3), h);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = y + 6; yy < y + h; yy += 7) ctx.fillRect(x, yy, w, 1); };
  const cren = (x, y, w) => { for (let i = 0; i < w; i += 6) { ctx.fillStyle = stD; ctx.fillRect(x + i - 1, y - 6, 5, 6); ctx.fillStyle = st; ctx.fillRect(x + i, y - 5, 3, 5); } };
  wall(bx + 2, by - 18, 44, 44); cren(bx + 2, by - 18, 44);
  for (const tx of [bx - 4, bx + 38]) { wall(tx, by - 34, 14, 60); ctx.fillStyle = rf; ctx.beginPath(); ctx.moveTo(tx - 3, by - 34); ctx.lineTo(tx + 7, by - 50); ctx.lineTo(tx + 17, by - 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(rf, -30); ctx.beginPath(); ctx.moveTo(tx + 7, by - 50); ctx.lineTo(tx + 17, by - 34); ctx.lineTo(tx + 7, by - 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#263238'; ctx.fillRect(tx + 5, by - 24, 4, 7); if (hpk > 0.3) { ctx.fillStyle = `rgba(255,213,79,${0.6 + Math.sin(tt * 3 + tx) * 0.3})`; ctx.fillRect(tx + 5, by - 22, 4, 4); } }
  ctx.fillStyle = '#2b1d14'; ctx.fillRect(bx + 14, by + 4, 20, 22); ctx.beginPath(); ctx.arc(bx + 24, by + 4, 10, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#6d4c41'; for (let i = 0; i < 4; i++) ctx.fillRect(bx + 15 + i * 5, by + 2, 2, 24);
  ctx.fillStyle = '#9e9e9e'; ctx.fillRect(bx + 14, by + 10, 20, 2);
  const fx = bx + 24, fy = by - 46, wv = Math.sin(tt * 5) * 2;
  ctx.fillStyle = '#5d4037'; ctx.fillRect(fx, fy - 2, 2, 30);
  ctx.fillStyle = hpk > 0.5 ? '#ffca28' : hpk > 0.25 ? '#ff7043' : '#c62828';
  ctx.beginPath(); ctx.moveTo(fx + 2, fy); ctx.lineTo(fx + 18, fy + 3 + wv); ctx.lineTo(fx + 2, fy + 10); ctx.closePath(); ctx.fill();
  if (hpk < 0.5) for (let i = 0; i < 3; i++) { const k = ((tt * 0.5 + i / 3) % 1); ctx.fillStyle = `rgba(60,60,60,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(bx + 10 + i * 12 + k * 6, by - 20 - k * 40, 4 + k * 8, 0, 7); ctx.fill(); }
}
function drawPortal() {
  const sr = MAP.path[0][1], cy = sr * T + T / 2, tt = S.time;
  ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.ellipse(0, cy, 20, 26, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(${i % 2 ? '206,147,216' : '124,77,255'},${0.8 - i * 0.15})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, cy, 6 + i * 4, 10 + i * 4, 0, tt * (2 + i) + i, tt * (2 + i) + i + 2.2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(179,136,255,.25)'; ctx.beginPath(); ctx.ellipse(2, cy, 14, 20, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 3; i++) { const k = (tt * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(206,147,216,${1 - k})`; ctx.fillRect(4 + k * 24, cy - 10 + i * 9 + Math.sin(tt * 4 + i) * 3, 3, 3); }
}
/* Cuaca & bayangan awan */
const AMB = { list: [], map: null, t: 0 };
function drawAmbient(dt) {
  const th = MAP.th, tt = (AMB.t += Math.min(0.05, dt || 0.016));
  if (AMB.map !== MAP.id) { AMB.map = MAP.id; AMB.list = []; }
  const kind = th.lava ? 'ember' : th.snow ? 'snow' : th.cactus ? 'sand' : 'leaf', want = SET.particles === 'low' ? 10 : 26;
  while (AMB.list.length < want) AMB.list.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random(), p: Math.random() * 7 });
  if (!th.lava) {
    ctx.fillStyle = 'rgba(0,20,40,.07)';
    for (let i = 0; i < 3; i++) { const cx = ((tt * 12 + i * 420) % (W + 400)) - 200, cy = 90 + i * 190;
      ctx.beginPath(); ctx.ellipse(cx, cy, 150, 55, 0, 0, 7); ctx.ellipse(cx + 90, cy + 20, 110, 45, 0, 0, 7); ctx.fill(); }
  }
  const step = Math.min(0.05, dt || 0.016);
  for (const a of AMB.list) {
    if (kind === 'ember') { a.y -= (20 + a.s * 25) * step; a.x += Math.sin(tt * 2 + a.p) * 10 * step; }
    else if (kind === 'snow') { a.y += (18 + a.s * 22) * step; a.x += (Math.sin(tt + a.p) * 12 + 6) * step; }
    else if (kind === 'sand') { a.x += (70 + a.s * 60) * step; a.y += Math.sin(tt * 3 + a.p) * 6 * step; }
    else { a.x += (14 + a.s * 10) * step; a.y += (10 + Math.sin(tt * 2 + a.p) * 14) * step; }
    if (a.y > H + 10) a.y = -10; if (a.y < -10) a.y = H + 10; if (a.x > W + 10) a.x = -10; if (a.x < -10) a.x = W + 10;
    if (kind === 'ember') { ctx.fillStyle = `rgba(255,${120 + Math.floor(a.s * 80)},40,${0.5 + Math.sin(tt * 6 + a.p) * 0.3})`; ctx.fillRect(a.x, a.y, 2.5, 2.5); }
    else if (kind === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(a.x, a.y, 2 + a.s, 2 + a.s); }
    else if (kind === 'sand') { ctx.fillStyle = 'rgba(255,236,179,.35)'; ctx.fillRect(a.x, a.y, 8 + a.s * 6, 1.5); }
    else { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(tt * 2 + a.p); ctx.fillStyle = a.s > 1 ? 'rgba(129,199,132,.8)' : 'rgba(255,241,118,.7)'; ctx.fillRect(-2.5, -1.5, 5, 3); ctx.restore(); }
  }
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
  else if (acc === 'beanie') { ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(x, y - 26, 10, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 10.5, y - 27, 21, 4); ctx.beginPath(); ctx.arc(x, y - 37, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e1f5fe'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 6 + i * 5, y - 33, 2, 2); }
  else if (acc === 'halo') { ctx.strokeStyle = '#fff59d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 33, 9, 3, 0, 0, 7); ctx.stroke(); }
}
/* Unit digambar langsung dalam resolusi penuh (tajam di layar HP/retina) */
function pixelSprite(x, y, draw) { draw(); }
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
  if (evo) drawEvoAura(t.type, x, y, true);
  pixelSprite(x, y, () => {
    block(x - 19, y + 4, 38, 12, 6, evo ? '#37474f' : t.level >= 3 ? '#ffb300' : '#78909c');
    if (evo) { ctx.fillStyle = evoAccent(t.type); ctx.fillRect(x - 19, y - 2, 38, 2); ctx.fillStyle = '#ffd54f'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 12 + i * 11, y + 3, 3, 3); }
    const skE = evo && !sk.body ? { ...sk, body: base, gun: sk.gun || evoAccent(t.type) } : sk;
    if (t.type === 'farm') drawFarm(t, x, y, skE);
    else if (t.type === 'nuke') drawNuke(t, x, y, skE, body);
    else if (t.type === 'dragon') drawDragon(t, x, y, skE, body);
    else if (t.type === 'snowman') drawSnowman(t, x, y, skE);
    else if (t.type === 'yeti') drawYeti(t, x, y, skE);
    else drawHero(t, x, y, sk, evo, base);
  });
  if (evo) drawEvoAura(t.type, x, y, false);
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
/* Latar ikon unit sesuai tier (kelangkaan): gradien warna tier, cahaya di belakang karakter,
 * sinar untuk Legendaris ke atas dan kilau bintang untuk Rahasia/Ilahi. */
const hexRgb = h => { const n = parseInt((h || '#999999').slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
function drawTierBg(g, type) {
  const rk = RARITY[UNIT_RARITY[type]] || RARITY.common, [r, gg, b] = hexRgb(rk.color), rgba = a => `rgba(${r},${gg},${b},${a})`, rank = rk.rank;
  const rr = (x, y, w, h, rad) => { g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad); g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath(); };
  g.save(); rr(1, 1, 62, 62, 7); g.clip();
  g.fillStyle = '#161d23'; g.fillRect(0, 0, 64, 64);
  let lg = g.createLinearGradient(0, 0, 0, 64); lg.addColorStop(0, rgba(0.6)); lg.addColorStop(0.6, rgba(0.22)); lg.addColorStop(1, rgba(0.08));
  g.fillStyle = lg; g.fillRect(0, 0, 64, 64);
  if (rank >= 3) {   // sinar dari belakang karakter
    g.save(); g.translate(32, 30); g.fillStyle = rank >= 5 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.09)';
    const n = rank >= 5 ? 12 : 8;
    for (let i = 0; i < n; i++) { g.rotate(Math.PI * 2 / n); g.beginPath(); g.moveTo(0, 0); g.lineTo(-4, -50); g.lineTo(4, -50); g.closePath(); g.fill(); }
    g.restore();
  }
  const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30); rg.addColorStop(0, rank >= 3 ? 'rgba(255,255,255,.35)' : rgba(0.35)); rg.addColorStop(0.45, rgba(0.3)); rg.addColorStop(1, rgba(0));
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  if (rank >= 5) { g.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, s] of [[9, 10, 1.6], [54, 14, 1.3], [12, 48, 1.1], [52, 44, 1.5], [44, 7, 1]]) { g.fillRect(x - s, y - s / 3, s * 2, s * 0.7); g.fillRect(x - s / 3, y - s, s * 0.7, s * 2); } }
  // lantai gelap di bawah karakter
  const fl = g.createLinearGradient(0, 44, 0, 64); fl.addColorStop(0, 'rgba(0,0,0,0)'); fl.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = fl; g.fillRect(0, 44, 64, 20);
  g.restore();
  rr(1, 1, 62, 62, 7); g.strokeStyle = rgba(rank >= 3 ? 0.95 : 0.7); g.lineWidth = rank >= 3 ? 2 : 1.4; g.stroke();
}
function drawUnitIcon(canvas, type, skin, evo, bg = true) {
  const g = canvas.getContext('2d'), prev = ctx;
  g.clearRect(0, 0, canvas.width, canvas.height);
  // resolusi kanvas mengikuti ukuran tampil × devicePixelRatio agar tidak buram
  const dpr = Math.min(3, window.devicePixelRatio || 1), cw = canvas.clientWidth, chh = canvas.clientHeight;
  if (cw > 0 && chh > 0) {
    const tw = Math.round(cw * dpr), th = Math.round(chh * dpr);
    if (canvas.width !== tw || canvas.height !== th) { canvas.style.width = cw + 'px'; canvas.style.height = chh + 'px'; canvas.width = tw; canvas.height = th; }
  }
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.save(); g.scale(canvas.width / 64, canvas.height / 64); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (bg && UNIT_RARITY[type]) drawTierBg(g, type);
  ctx = g;
  try { drawTower({ type, x: 32, y: 40, level: 0, angle: -0.6, recoil: 0, evo, skin: skin || 'default', owner: null }, false); }
  finally { ctx = prev; g.restore(); }
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
  // zombie: kaki melangkah, tangan menjulur ke arah jalan, kepala & mata menyala
  const fx = e.x > (e._lx ?? e.x - 1) + 0.01 ? 1 : e.x < (e._lx ?? e.x) - 0.01 ? -1 : (e._fx || 1); e._fx = fx; e._lx = e.x;
  const walk = Math.sin(S.time * 9 + e.wob) * s * 0.08, OL = 'rgba(0,0,0,.55)';
  const skin = e.hitT > 0 ? '#ffffff' : e.boss ? '#7e57c2' : e.type === 'skeleton' ? '#eceff1' : e.type === 'golem' ? '#90a4ae' : e.hidden ? '#cfd8dc' : mixC('#9ccc65', e.color, 0.3);
  if (!e.flying) { ctx.fillStyle = shade(e.color, -45); ctx.fillRect(x - s * 0.24 + walk, y + s * 0.22 + bob * 0.3, s * 0.18, s * 0.2); ctx.fillRect(x + s * 0.06 - walk, y + s * 0.22 + bob * 0.3, s * 0.18, s * 0.2);
    ctx.fillStyle = '#3e2723'; ctx.fillRect(x - s * 0.26 + walk, y + s * 0.38 + bob * 0.3, s * 0.22, s * 0.06); ctx.fillRect(x + s * 0.04 - walk, y + s * 0.38 + bob * 0.3, s * 0.22, s * 0.06); }
  // lengan belakang
  ctx.fillStyle = shade(skin, -20); ctx.fillRect(x + fx * s * 0.1 - (fx < 0 ? s * 0.42 : 0), y - s * 0.12 + bob - walk * 0.4, s * 0.42, s * 0.12);
  block(x - s * 0.33, y - s * 0.12 + bob, s * 0.66, s * 0.42, s * 0.1, body);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - s * 0.2, y + s * 0.12 + bob, s * 0.1, s * 0.08); ctx.fillRect(x + s * 0.08, y - s * 0.02 + bob, s * 0.08, s * 0.1);
  // lengan depan menjulur
  ctx.fillStyle = skin; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
  const ax = fx > 0 ? x + s * 0.12 : x - s * 0.58; ctx.fillRect(ax, y - s * 0.02 + bob + walk * 0.4, s * 0.46, s * 0.12); ctx.strokeRect(ax, y - s * 0.02 + bob + walk * 0.4, s * 0.46, s * 0.12);
  // kepala
  block(x - s * 0.25 + fx * s * 0.04, y - s * 0.56 + bob, s * 0.5, s * 0.4, s * 0.1, skin);
  if (!e.boss && e.type !== 'skeleton' && !e.hidden && e.type !== 'golem') { ctx.fillStyle = shade(skin, -30); ctx.fillRect(x - s * 0.2 + fx * s * 0.04, y - s * 0.62 + bob, s * 0.16, s * 0.06); }
  ctx.fillStyle = e.boss || e.miniboss || enraged ? '#ffeb3b' : e.type === 'skeleton' ? '#000' : '#ff1744';
  const ex = x + fx * s * 0.08; ctx.fillRect(ex - s * 0.13, y - s * 0.5 + bob, s * 0.09, s * 0.08); ctx.fillRect(ex + s * 0.05, y - s * 0.5 + bob, s * 0.09, s * 0.08);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(ex - s * 0.08, y - s * 0.34 + bob, s * 0.18, s * 0.04);
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
  if (--resCheck <= 0) { resCheck = 30; fitRes(); }
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
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
  drawAmbient(dt);
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
