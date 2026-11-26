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
const isTouch = ev => ev.pointerType && ev.pointerType !== 'mouse';
cv.addEventListener('pointermove', ev => { if (!isTouch(ev)) S.mouse = { ...canvasPos(ev), in: true }; });
cv.addEventListener('pointerleave', ev => { if (!isTouch(ev)) S.mouse.in = false; });
let pendingTap = null;   // HP: ketuk pertama = pratinjau, ketuk kedua di petak sama = konfirmasi
cv.addEventListener('pointerdown', ev => {
  if (ev.button === 2 || Menu.open) return;
  const p = canvasPos(ev); S.mouse = { ...p, in: true };
  const c = Math.floor(p.x / T), r = Math.floor(p.y / T);
  if (isTouch(ev) && (S.placing || S.targeting)) {
    const key = S.targeting ? Math.round(p.x / 24) + ',' + Math.round(p.y / 24) : c + ',' + r;
    if (pendingTap !== key) { pendingTap = key; if (!PROFILE.tips.includes('tap2')) { PROFILE.tips.push('tap2'); UI.toast('👆 Ketuk sekali lagi di tempat yang sama untuk konfirmasi', 'tip', 3500); } return; }
    pendingTap = null;
  }
  if (S.targeting) { targetAt(p.x, p.y); return; }
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
  if (ev.target.tagName === 'INPUT') {
    if (ev.target.id === 'chatIn' && ev.key === 'Enter') { MP.chat(ev.target.value); ev.target.value = ''; ev.target.blur(); }
    if (ev.target.id === 'chatIn' && ev.key === 'Escape') ev.target.blur();
    return;
  }
  const k = ev.key.toLowerCase();
  if (k === 'escape') {
    if (Menu.open) { if (Menu.screen === 'pause') Menu.act('resume'); else if (Menu.screen === 'settings' && Menu.back === 'pause') Menu.go('pause'); return; }
    if (!cancelAction() && S.state !== 'win' && S.state !== 'lose') Menu.show('pause');
    return;
  }
  if (Menu.open) return;
  const n = parseInt(k, 10);
  const lt = loadoutTypes();
  if (n >= 1 && n <= lt.length) UI.selectPlace(lt[n - 1]);
  else if ((k === 'q' || k === 'e') && S.selected) upgradeTower(S.selected);
  else if ((k === 'x' || k === 'delete') && S.selected) sellTower(S.selected);
  else if (k === 't' && S.selected && $('tgtBtn')) $('tgtBtn').click();
  else if (k === ' ') { ev.preventDefault(); if (canSkip()) skipWave(); else startWave(); }
  else if (SKILL_KEYS.includes(k) && equippedSkills()[SKILL_KEYS.indexOf(k)]) useAbility(equippedSkills()[SKILL_KEYS.indexOf(k)]);
  else if (k === 'f' && !isGuest()) $('speedBtn').click();
  else if (k === 'enter' && isMP()) { ev.preventDefault(); $('chatIn').focus(); }
});

/* ---------------- TOMBOL HUD ---------------- */
$('startBtn').onclick = () => startWave();
$('skipWaveBtn').onclick = () => skipWave();
$('skipBtn').onclick = () => {
  if (isGuest()) return;
  S.autoSkip = !S.autoSkip; S.autoTimer = S.wave === 0 ? 0.6 : AUTO_START_DELAY; S.autoSkipT = null; sfx('click');
  UI.toast(S.autoSkip ? '🔁 Auto ON: wave dimulai & di-skip otomatis' : 'Auto OFF'); UI.updateHud();
};
$('speedBtn').onclick = () => {
  if (isGuest()) return; S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1; sfx('click'); UI.updateHud(); };
$('fsBtn').onclick = async () => {
  try {
    if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {}); }
    else await document.exitFullscreen();
  } catch (e) { UI.toast('Layar penuh tidak didukung di browser ini'); }
};
if (!document.documentElement.requestFullscreen) $('fsBtn').style.display = 'none';
$('rotateClose').onclick = () => { document.body.classList.add('no-rotate-hint'); };
$('pauseBtn').onclick = () => { if (!Menu.open && S.state !== 'win' && S.state !== 'lose') Menu.show('pause'); };
$('overlay').addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]');
  if (b && !b.disabled && !b.classList.contains('busy')) { Menu.lastBtn = b; Menu.act(b.dataset.act); }
});

// Audio harus diaktifkan oleh interaksi pengguna pertama
addEventListener('pointerdown', () => Sound.unlock(), { once: true });
addEventListener('keydown', () => Sound.unlock(), { once: true });

// Simpan ke cloud saat tab ditutup / disembunyikan
addEventListener('pagehide', () => Online.flush());
document.addEventListener('visibilitychange', () => { if (document.hidden) Online.flush(); });

// Pause otomatis saat tab tidak aktif
document.addEventListener('visibilitychange', () => {
  if (document.hidden && SET.autoPause && S && !isMP() && !Menu.open && S.state !== 'win' && S.state !== 'lose' && S.wave > 0) Menu.show('pause');
});

/* ---------------- GAME LOOP ---------------- */
let last = performance.now(), uiT = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.state !== 'win' && S.state !== 'lose') {
    if (isGuest()) MP.guestTick(dt);
    else if (!Menu.open || isMP()) for (let i = 0; i < S.speed; i++) update(dt);
  }
  MP.tick(dt);
  // saat menu menutupi layar (bukan mabar), canvas tidak perlu digambar ulang → hemat CPU/GPU
  if (!Menu.open || isMP()) draw(dt);
  const ing = !Menu.open; if (document.body.classList.contains('ingame') !== ing) document.body.classList.toggle('ingame', ing);
  uiT += dt;
  if (uiT > 0.15) { uiT = 0; UI.tick(); }
  requestAnimationFrame(loop);
}
setInterval(() => { if (Menu.screen === 'main') Menu.tickCd(); }, 1000);

/* ---------------- INIT ---------------- */
loadMap(MAP);
newGame();
Menu.show('main');
Online.init();
requestAnimationFrame(loop);
