/* =========================================================
 * Entry point: input, game loop, inisialisasi
 * ========================================================= */
'use strict';

/* ---------------- INPUT CANVAS ---------------- */
function canvasPos(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
}
function cancelAction() {
  if (S.placing || S.selected || S.targeting) { S.placing = null; S.selected = null; S.targeting = null; UI.hidePanel(); UI.renderBar(); UI.renderAbilities(); return true; }
  return false;
}
cv.addEventListener('pointermove', ev => { S.mouse = { ...canvasPos(ev), in: true }; });
cv.addEventListener('pointerleave', () => { S.mouse.in = false; });
cv.addEventListener('pointerdown', ev => {
  if (ev.button === 2 || Menu.open) return;
  const p = canvasPos(ev); S.mouse = { ...p, in: true };
  const c = Math.floor(p.x / T), r = Math.floor(p.y / T);
  if (S.targeting === 'airstrike') { airstrikeAt(p.x, p.y); return; }
  if (S.placing) {
    const t = placeTower(S.placing, c, r);
    if (t && !ev.shiftKey) { S.placing = null; UI.renderBar(); }
    return;
  }
  const t = S.towers.find(t => t.c === c && t.r === r);
  S.selected = t || null;
  if (t) { sfx('click'); UI.showPanel(t); } else UI.hidePanel();
});
cv.addEventListener('contextmenu', ev => { ev.preventDefault(); cancelAction(); });

/* ---------------- KEYBOARD ---------------- */
addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT') return;
  const k = ev.key.toLowerCase();
  if (k === 'escape') {
    if (Menu.open) { if (Menu.screen === 'pause') Menu.act('resume'); else if (Menu.screen === 'settings' && Menu.back === 'pause') Menu.go('pause'); return; }
    if (!cancelAction() && S.state !== 'win' && S.state !== 'lose') Menu.show('pause');
    return;
  }
  if (Menu.open) return;
  const n = parseInt(k, 10);
  if (n >= 1 && n <= PROFILE.loadout.length) UI.selectPlace(PROFILE.loadout[n - 1]);
  else if ((k === 'q' || k === 'e') && S.selected) upgradeTower(S.selected);
  else if ((k === 'x' || k === 'delete') && S.selected) sellTower(S.selected);
  else if (k === 't' && S.selected && $('tgtBtn')) $('tgtBtn').click();
  else if (k === ' ') { ev.preventDefault(); if (canSkip()) skipWave(); else startWave(); }
  else if (ABILITIES.some(a => a.key === k)) useAbility(ABILITIES.find(a => a.key === k).id);
  else if (k === 'f') $('speedBtn').click();
});

/* ---------------- TOMBOL HUD ---------------- */
$('startBtn').onclick = () => startWave();
$('skipWaveBtn').onclick = () => skipWave();
$('skipBtn').onclick = () => { S.autoSkip = !S.autoSkip; S.autoTimer = 3; sfx('click'); UI.updateHud(); };
$('speedBtn').onclick = () => { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1; sfx('click'); UI.updateHud(); };
$('pauseBtn').onclick = () => { if (!Menu.open && S.state !== 'win' && S.state !== 'lose') Menu.show('pause'); };
$('overlay').addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]');
  if (b && !b.disabled) Menu.act(b.dataset.act);
});

// Audio harus diaktifkan oleh interaksi pengguna pertama
addEventListener('pointerdown', () => Sound.unlock(), { once: true });
addEventListener('keydown', () => Sound.unlock(), { once: true });

// Pause otomatis saat tab tidak aktif
document.addEventListener('visibilitychange', () => {
  if (document.hidden && SET.autoPause && S && !Menu.open && S.state !== 'win' && S.state !== 'lose' && S.wave > 0) Menu.show('pause');
});

/* ---------------- GAME LOOP ---------------- */
let last = performance.now(), uiT = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!Menu.open && S.state !== 'win' && S.state !== 'lose') {
    for (let i = 0; i < S.speed; i++) update(dt);
  }
  draw(dt);
  uiT += dt;
  if (uiT > 0.15) { uiT = 0; UI.tick(); }
  requestAnimationFrame(loop);
}

/* ---------------- INIT ---------------- */
loadMap(MAP);
newGame();
Menu.show('main');
requestAnimationFrame(loop);
