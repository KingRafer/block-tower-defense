/* =========================================================
 * Rendering canvas: peta, tower, musuh, efek, HUD di canvas
 * ========================================================= */
'use strict';

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
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
function drawTower(t, ghost) {
  const def = TOWERS[t.type], x = t.x, y = t.y;
  const stunned = !ghost && S.time < t.stunUntil;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 16, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  block(x - 19, y + 4, 38, 12, 6, t.level >= 3 ? '#ffb300' : '#78909c');
  if (t.type === 'farm') {
    block(x - 16, y - 14, 32, 22, 10, '#c62828');
    ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.moveTo(x - 20, y - 24); ctx.lineTo(x, y - 38); ctx.lineTo(x + 20, y - 24); ctx.fill();
    outlinedText('$', x, y - 1, 14, '#ffd54f');
  } else if (t.type === 'commander') {
    block(x - 11, y - 6, 22, 14, 5, def.color);
    block(x - 8, y - 22, 16, 14, 5, '#fdd835');
    block(x - 10, y - 30, 20, 6, 3, '#1a237e');
    ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 22, 3, 3); ctx.fillRect(x + 2, y - 22, 3, 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 12, y - 40, 2, 30);
    ctx.fillStyle = '#e53935'; ctx.fillRect(x + 14, y - 40, 12, 8);
  } else {
    block(x - 11, y - 6, 22, 14, 5, def.color);
    block(x - 8, y - 22, 16, 14, 5, '#fdd835');
    ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 22, 3, 3); ctx.fillRect(x + 2, y - 22, 3, 3);
    ctx.save(); ctx.translate(x, y - 8); ctx.rotate(t.angle);
    const rc = t.recoil * 4;
    const G = { sniper: [30, 6], minigun: [24, 9], demoman: [18, 10], rocketeer: [26, 12], freezer: [18, 7] }[t.type] || [18, 6];
    ctx.fillStyle = t.type === 'freezer' ? '#4fc3f7' : t.type === 'rocketeer' ? '#4a148c' : '#263238';
    ctx.fillRect(4 - rc, -G[1] / 2, G[0], G[1]);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.strokeRect(4 - rc, -G[1] / 2, G[0], G[1]);
    ctx.restore();
  }
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(x - 14 + i * 8, y + 18, 6, 6);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x - 14 + i * 8, y + 18, 6, 6);
  }
  if (!ghost && t.buff > 0) outlinedText('▲', x + 17, y - 18, 11, '#7c4dff');
  if (stunned) { outlinedText('💫', x, y - 34 + Math.sin(S.time * 8) * 2, 16, '#fff'); }
}

/* ---------------- MUSUH ---------------- */
function drawEnemy(e) {
  const s = e.size * T, x = e.x, y = e.y, bob = Math.sin(S.time * 10 + e.wob) * 2;
  ctx.globalAlpha = e.hidden ? 0.45 : 1;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.35, s * 0.45, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  const body = e.hitT > 0 ? '#ffffff' : e.color;
  block(x - s * 0.35, y - s * 0.1 + bob, s * 0.7, s * 0.45, s * 0.12, body);
  block(x - s * 0.25, y - s * 0.55 + bob, s * 0.5, s * 0.38, s * 0.1, e.boss ? '#9c27b0' : shade(e.color, 30));
  ctx.fillStyle = e.boss ? '#ffeb3b' : '#b71c1c';
  ctx.fillRect(x - s * 0.14, y - s * 0.5 + bob, s * 0.09, s * 0.09); ctx.fillRect(x + s * 0.05, y - s * 0.5 + bob, s * 0.09, s * 0.09);
  if (e.armor) { ctx.fillStyle = 'rgba(176,190,197,.85)'; ctx.fillRect(x - s * 0.27, y - s * 0.72 + bob, s * 0.54, s * 0.12); }
  if (e.boss) { ctx.fillStyle = '#ffd600'; for (let i = 0; i < 3; i++) ctx.fillRect(x - s * 0.22 + i * s * 0.17, y - s * 0.86 + bob, s * 0.1, s * 0.14); }
  if (e.regen) outlinedText('+', x + s * 0.4, y - s * 0.4 + bob, 13, '#69f0ae');
  ctx.globalAlpha = 1;
  if (S.time < e.slowUntil) { ctx.fillStyle = 'rgba(129,212,250,.35)'; ctx.fillRect(x - s * 0.4, y - s * 0.7 + bob, s * 0.8, s * 1.05); }
  if (!e.boss) {
    const bw = Math.max(30, s), pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#000'; ctx.fillRect(x - bw / 2 - 1, y - s * 0.85 - 1, bw + 2, 7);
    ctx.fillStyle = pct > 0.5 ? '#66bb6a' : pct > 0.25 ? '#ffca28' : '#ef5350';
    ctx.fillRect(x - bw / 2, y - s * 0.85, bw * pct, 5);
  }
}
function drawBossBar() {
  const bosses = S.enemies.filter(e => e.boss);
  bosses.slice(0, 2).forEach((b, i) => {
    const bw = 420, x = W / 2 - bw / 2, y = 14 + i * 34, pct = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - 4, y - 4, bw + 8, 26);
    ctx.fillStyle = '#4a148c'; ctx.fillRect(x, y, bw, 18);
    ctx.fillStyle = '#e040fb'; ctx.fillRect(x, y, bw * pct, 18);
    outlinedText(`👑 ${b.name} — ${fmtNum(b.hp)} / ${fmtNum(b.maxHp)}`, W / 2, y + 14, 13, '#fff');
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
    const L = p.big ? 18 : 14;
    ctx.fillStyle = p.big ? '#6a1b9a' : '#424242'; ctx.fillRect(-L / 2, -3, L, 6);
    ctx.fillStyle = '#ff7043'; ctx.fillRect(-L / 2 - 4, -2, 4, 4);
    ctx.restore();
  }
  for (const f of S.effects) {
    const k = f.life / f.max;
    ctx.globalAlpha = Math.max(0, k);
    if (f.kind === 'tracer') { ctx.strokeStyle = f.col; ctx.lineWidth = f.w; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); }
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
    ctx.beginPath(); ctx.arc(st.x, st.y, 1.4 * T * (1 - k * 0.6), 0, 7); ctx.stroke();
    ctx.fillStyle = `rgba(255,82,82,${0.15 + k * 0.25})`; ctx.fill();
  }
  if (S.targeting === 'airstrike' && S.mouse.in) {
    ring(S.mouse.x, S.mouse.y, 1.4 * T + 34, 'rgba(255,82,82,.18)', 'rgba(255,82,82,.9)');
    outlinedText('✈️ Klik untuk menjatuhkan bom', S.mouse.x, S.mouse.y - 1.4 * T - 44, 13, '#ff8a80');
  }
  if (S.freezeT > 0) { ctx.fillStyle = `rgba(129,212,250,${Math.min(0.18, S.freezeT * 0.06)})`; ctx.fillRect(0, 0, W, H); }

  for (const x of S.texts) { ctx.globalAlpha = Math.min(1, x.life / x.max * 2); outlinedText(x.txt, x.x, x.y, 15, x.col); }
  ctx.globalAlpha = 1;
  drawBossBar();
  if (S.state === 'ready' && S.autoSkip && S.wave > 0) outlinedText(`Wave berikutnya dalam ${Math.ceil(S.autoTimer)}...`, W / 2, H - 16, 18, '#fff');

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
