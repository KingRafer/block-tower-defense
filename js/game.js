/* =========================================================
 * Logika inti game: map, wave, tower, musuh, proyektil
 * ========================================================= */
'use strict';

let S = null;                 // state game aktif
let MAP = MAPS[0], DIFF = 'normal', MODE = 'classic';
let pathPx = [], pathTiles = new Set(), deco = [];

/* ---------------- MAP ---------------- */
function computeTiles(path) {
  const set = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    let [c1, r1] = path[i]; const [c2, r2] = path[i + 1];
    const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1);
    while (c1 !== c2 || r1 !== r2) { set.add(c1 + ',' + r1); c1 += dc; r1 += dr; }
    set.add(c2 + ',' + r2);
  }
  return set;
}
function computeDeco(tiles, seed) {
  const out = [], rnd = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  for (let i = 0; i < 28; i++) {
    const c = Math.floor(rnd() * COLS), r = Math.floor(rnd() * ROWS);
    if (!tiles.has(c + ',' + r) && c < 18 && !out.some(d => d.c === c && d.r === r))
      out.push({ c, r, type: rnd() < 0.7 ? 'tree' : 'rock' });
  }
  return out;
}
function loadMap(m) {
  MAP = m;
  pathPx = m.path.map(([c, r]) => ({ x: (c + 0.5) * T, y: (r + 0.5) * T }));
  pathTiles = computeTiles(m.path);
  deco = computeDeco(pathTiles, 7 + MAPS.indexOf(m) * 13);
}
const exitRow = () => MAP.path[MAP.path.length - 1][1];

/* ---------------- GAME ---------------- */
/** Gabungkan efek beberapa modifier menjadi satu objek */
function modsAgg(ids) {
  const M = { spdMul:1, hpMul:1, cashMul:1, rewardMul:1, hpBaseMul:1, ban:[], earlyHidden:false };
  for (const id of ids) {
    const m = MODIFIERS[id]; if (!m) continue;
    for (const k of ['spdMul','hpMul','cashMul','rewardMul','hpBaseMul']) if (m[k]) M[k] *= m[k];
    if (m.ban) M.ban.push(...m.ban);
    if (m.earlyHidden) M.earlyHidden = true;
  }
  return M;
}
function newGame(opts = {}) {
  const daily = opts.daily || null, mp = opts.mp || null;
  if (daily) { MAP = MAPS[daily.map]; DIFF = daily.diff; }
  const D = DIFFS[DIFF], mods = daily ? daily.mods : [], M = modsAgg(mods);
  const mode = daily ? 'classic' : MODE;
  const me = mp ? mp.me : 'local';
  loadMap(MAP);
  const hp = Math.round(D.hp * M.hpBaseMul);
  S = {
    diff: DIFF, mode, daily, mods, M,
    cash: Math.round(D.cash * M.cashMul), hp, maxHp: hp, wave: 0,
    maxWave: daily ? DAILY_WAVES : mode === 'endless' ? Infinity : D.waves,
    state: 'ready', speed: 1, autoSkip: S ? S.autoSkip : false,
    towers: [], enemies: [], projectiles: [], effects: [], texts: [], spawnQ: [], strikes: [],
    waveTime: 0, waveTotal: 0, earned: 0, kills: 0, bossKills: 0, leaked: false,
    placing: null, selected: null, targeting: null, mouse: { x: -99, y: -99, in: false },
    time: 0, autoTimer: 0, recorded: false, nextId: 1, shake: 0, abilityCd: {}, freezeT: 0, uxp: {},
    me, mp, players: {}, uxpBy: {}, fxOut: [], skillsUsed: {}, overclockT: 0, shieldT: 0, radarT: 0, stormQ: [],
  };
  if (mp) S.autoSkip = false;
  UI.refreshAll();
}

/* ---------------- PEMAIN (solo & mabar) ---------------- */
const isGuest = () => !!(S && S.mp && S.mp.role === 'guest');
const isHost = () => !!(S && S.mp && S.mp.role === 'host');
const isMP = () => !!(S && S.mp);
const PLAYER_COLORS = ['#42a5f5', '#ef5350', '#66bb6a', '#ffca28'];
function pcash(pid) { return pid === S.me ? S.cash : (S.players[pid] ? S.players[pid].cash : 0); }
function addCash(pid, a) {
  if (pid === S.me) { S.cash += a; S.earned += a; }
  else if (S.players[pid]) { S.players[pid].cash += a; S.players[pid].earned += a; }
}
function addCashAll(a) { addCash(S.me, a); for (const id in S.players) if (id !== S.me) addCash(id, a); }
function spend(pid, a) { if (pid === S.me) S.cash -= a; else if (S.players[pid]) S.players[pid].cash -= a; }
function unitFor(type, pid) {
  const p = pid && pid !== S.me && S.players[pid];
  return p ? (p.units && p.units[type]) || { xp: 0, trait: null, evo: false } : unitOf(type);
}
function addUxp(pid, type, x) {
  if (pid === S.me) S.uxp[type] = (S.uxp[type] || 0) + x;
  else { const m = S.uxpBy[pid] || (S.uxpBy[pid] = {}); m[type] = (m[type] || 0) + x; }
}
/** Efek visual yang perlu dikirim host ke tamu */
function fxEmit(ev) { if (isHost()) S.fxOut.push(ev); }
const playerName = pid => pid === S.me ? 'Kamu' : (S.players[pid] && S.players[pid].name) || 'Pemain';
const playerColor = pid => (S.players[pid] && S.players[pid].color) || PLAYER_COLORS[0];

/* ---------------- SIMPAN & LANJUTKAN ---------------- */
function saveGameState() {
  if (!S || isMP() || S.state !== 'ready' || S.wave === 0) return;
  SaveGame.set({
    v: 2, map: MAP.id, diff: S.diff, mode: S.mode, daily: S.daily, cash: S.cash, hp: S.hp, wave: S.wave,
    kills: S.kills, earned: S.earned, bossKills: S.bossKills, time: S.time, leaked: S.leaked,
    abilityCd: S.abilityCd, autoSkip: S.autoSkip, saved: Date.now(),
    towers: S.towers.map(t => ({ type: t.type, c: t.c, r: t.r, level: t.level, spent: t.spent, target: t.target, dmg: t.dmg, kills: t.kills })),
  });
}
function loadSavedGame() {
  const g = SaveGame.get(); if (!g) return false;
  MAP = MAPS.find(m => m.id === g.map) || MAPS[0]; DIFF = g.diff; MODE = g.mode;
  newGame({ daily: g.daily });
  Object.assign(S, { cash: g.cash, hp: g.hp, wave: g.wave, kills: g.kills, earned: g.earned, bossKills: g.bossKills,
                     time: g.time, leaked: g.leaked, abilityCd: g.abilityCd || {}, autoSkip: !!g.autoSkip });
  S.towers = g.towers.map(o => { const t = Object.assign(makeTower(o.type, o.c, o.r), o); t.L = computeL(t.type, t.level); return t; });
  UI.refreshAll();
  return true;
}

/* ---------------- TANTANGAN HARIAN ---------------- */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dailyChallenge() {
  const date = todayStr();
  let seed = [...date].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1;
  const rnd = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
  for (let i = 0; i < 3; i++) rnd();
  const map = Math.floor(rnd() * BASE_MAPS), diff = rnd() < 0.6 ? 'normal' : 'hard';
  const keys = Object.keys(MODIFIERS), mods = [];
  while (mods.length < 2) {
    const k = keys[Math.floor(rnd() * keys.length)];
    if (!mods.includes(k) && !(k === 'rich' && mods.includes('poor')) && !(k === 'poor' && mods.includes('rich'))) mods.push(k);
  }
  return { date, map, diff, mods };
}
function dailyState() {
  if (PROFILE.daily.date !== todayStr()) PROFILE.daily = { date: todayStr(), won: false, best: 0 };
  return PROFILE.daily;
}

/* ---------------- TIPS ---------------- */
function tip(id) {
  if (!TIPS[id] || PROFILE.tips.includes(id)) return;
  PROFILE.tips.push(id); saveProfile();
  UI.toast('💡 ' + TIPS[id], 'tip', 7000);
}

/* ---------------- WAVE ---------------- */
/* Durasi & kepadatan wave (v4.9): jumlah musuh dibatasi, sisanya jadi lebih kuat; emas per wave tetap sebanding */
const WAVE_TUNE = { count: n => Math.round(6 + n * 2.5), duration: n => 11 + n * 1.3, hpComp: 0.92, goldComp: 1.1 };
function buildWave(n) {
  const groups = [];
  const add = (type, count, gap) => { if (count > 0) groups.push({ type, count, gap }); };
  add('normal', Math.floor(4 + n * 1.4), Math.max(0.35, 1.0 - n * 0.02));
  if (S && S.M && S.M.earlyHidden && n >= 2 && n < ENEMY_INTRO.hidden) add('hidden', Math.floor(1 + n * 0.5), 0.8);
  if (n >= ENEMY_INTRO.fast)     add('fast', Math.floor(2 + n * 0.8), 0.45);
  if (n >= ENEMY_INTRO.tank)     add('tank', Math.floor(1 + n * 0.35), 1.1);
  if (n >= ENEMY_INTRO.hidden)   add('hidden', Math.floor(2 + (n - 6) * 0.6), 0.7);
  if (n >= ENEMY_INTRO.regen)    add('regen', Math.floor(1 + (n - 8) * 0.4), 1.0);
  if (n >= ENEMY_INTRO.armored)  add('armored', Math.floor(1 + (n - 11) * 0.5), 1.2);
  if (n >= ENEMY_INTRO.splitter) add('splitter', Math.floor(1 + (n - 13) * 0.4), 1.3);
  if (n >= ENEMY_INTRO.flyer)    add('flyer', Math.floor(2 + (n - 3) * 0.6), 0.55);
  if (n >= ENEMY_INTRO.thief && n % 2 === 0) add('thief', Math.floor(1 + (n - 5) * 0.3), 0.9);
  if (n >= ENEMY_INTRO.shielded) add('shielded', Math.floor(1 + (n - 7) * 0.4), 1.1);
  if (n >= ENEMY_INTRO.berserk)  add('berserk', Math.floor(1 + (n - 9) * 0.35), 1.0);
  if (n >= ENEMY_INTRO.healer)   add('healer', Math.floor(1 + (n - 10) * 0.2), 1.6);
  if (n >= ENEMY_INTRO.stealth)  add('stealth', Math.floor(1 + (n - 12) * 0.35), 1.0);
  if (n >= ENEMY_INTRO.bomber)   add('bomber', Math.floor(1 + (n - 14) * 0.3), 1.2);
  if (n >= ENEMY_INTRO.giant)    add('giant', Math.floor(1 + (n - 16) * 0.2), 2.5);
  if (n >= ENEMY_INTRO.necro && n % 3 !== 0) add('necro', Math.floor(1 + (n - 18) * 0.15), 3);
  if (n >= 15 && n % 10 === 5) add('golem', Math.max(1, Math.floor((n - 5) / 10)), 4);
  if (n >= 18) add('fast', Math.min(n, 60), 0.25);
  if (n > 40) add('armored', Math.floor((n - 40) * 0.8), 0.6);
  if (n % 10 === 0) add('boss', Math.max(1, Math.floor(n / 10)), 4);
  // padatkan: musuh biasa dikurangi ke target jumlah, boss & golem tetap utuh
  const special = g => g.type === 'boss' || g.type === 'golem';
  const total = groups.reduce((a, g) => a + (special(g) ? 0 : g.count), 0);
  const target = WAVE_TUNE.count(n), f = total > target ? target / total : 1;
  const q = []; let t = 0, natural = 0;
  for (const g of groups) { g.keep = special(g) ? g.count : Math.max(1, Math.round(g.count * f)); natural += g.keep * g.gap + 0.8; }
  const ts = Math.min(1, WAVE_TUNE.duration(n) / natural);           // percepat jeda bila wave terlalu lama
  const m = f < 1 ? { hp: Math.pow(1 / f, WAVE_TUNE.hpComp), rw: (1 / f) * WAVE_TUNE.goldComp } : null;
  for (const g of groups) {
    const gap = Math.max(special(g) ? 1.5 : 0.18, g.gap * ts);
    for (let i = 0; i < g.keep; i++) { q.push({ type: g.type, t, m: special(g) ? null : m }); t += gap; }
    t += 0.8 * ts;
  }
  return q;
}
function wavePreview(n) {
  const counts = {};
  buildWave(n).forEach(s => counts[s.type] = (counts[s.type] || 0) + 1);
  return counts;
}
function startWave() {
  if (isGuest()) { MP.act({ a: 'start' }); return; }
  if (!S || S.state !== 'ready' || S.wave >= S.maxWave) return;
  S.wave++; S.state = 'wave'; S.spawnQ = buildWave(S.wave); S.waveTime = 0; S.waveTotal = S.spawnQ.length;
  sfx('wave');
  const bt = S.wave % 10 === 0 ? `⚠️ BOSS WAVE ${S.wave}` : `WAVE ${S.wave}`, bc = S.wave % 10 === 0 ? '#e040fb' : '#fff';
  vfxWave(S.wave, S.wave % 10 === 0); fxEmit(['n', bt, bc, 1600, 'wave']);
  UI.refreshAll();
}
/** Bonus akhir wave (dinaikkan di awal agar pembangunan tower tidak terlalu lambat) */
const WAVE_BONUS = w => 150 + Math.min(w, 60) * 35;
/** Bayar bonus akhir wave + pendapatan farm */
function payWave(skipBonus = 0) {
  const bonus = WAVE_BONUS(S.wave); let farm = 0;
  S.towers.filter(t => t.type === 'farm').forEach(t => {
    let inc = lvl(t).income;
    if (lvl(t).perk === 'interest') inc += Math.min(400, Math.floor(pcash(t.owner) * 0.02));
    inc += Skills.waveBonus(t, lvl(t).income);
    addCash(t.owner, inc);
    if (t.owner === S.me) farm += inc;
    addText(t.x, t.y - 26, '+$' + inc, '#ffd54f', 1.2); fxEmit(['x', t.x, t.y - 26, '+$' + inc, '#ffd54f', 1.2]);
  });
  addCashAll(bonus + skipBonus);
  const total = bonus + farm + skipBonus;
  if (farm || skipBonus) sfx('coin');
  return total;
}
function endWave() {
  const total = payWave();
  checkAchievements(summary());
  if (S.wave >= S.maxWave) { S.state = 'win'; finishGame(true); return; }
  S.state = 'ready'; S.autoTimer = AUTO_START_DELAY;
  UI.banner(`Wave selesai! +$${total}`, '#ffd54f', 1200);
  fxEmit(['n', `Wave selesai! +$${WAVE_BONUS(S.wave)}`, '#ffd54f', 1200]);
  saveGameState();
  if (S.wave === 1) tip('wave1');
  if (S.wave === 2) tip('ability');
  const next = wavePreview(S.wave + 1);
  if (next.hidden && S.wave + 1 <= ENEMY_INTRO.hidden + 1) tip('hidden');
  if (next.boss) tip('boss');
  UI.refreshAll();
}
const AUTO_START_DELAY = 2, AUTO_SKIP_DELAY = 1.5;
/** Skip: mulai wave berikutnya saat semua musuh wave ini sudah keluar */
const canSkip = () => S && S.state === 'wave' && !S.spawnQ.length && S.enemies.length > 0 && S.wave < S.maxWave;
/** Bonus emas skip: makin besar di wave tinggi + bonus untuk musuh yang masih tersisa */
const skipBonusAmt = () => 150 + Math.min(S.wave, 80) * 40 + Math.min(S.enemies.length, 30) * 15;
function skipWave() {
  if (isGuest()) { MP.act({ a: 'skip' }); return; }
  if (!canSkip()) return;
  const b = skipBonusAmt(), total = payWave(b);
  PROFILE.stats.skips++;
  addText(W / 2, 60, `SKIP! +$${total}`, '#ffd54f', 1.2);
  S.state = 'ready'; startWave();
  checkAchievements(summary());
}

/* ---------------- SKILL PEMAIN (stok terbatas, dibeli di toko) ---------------- */
const playerLevel = () => levelFromXp(PROFILE.xp);
const skillById = id => ABILITIES.find(a => a.id === id);
/** Sisa pemakaian skill untuk pemain ini (stok dikurangi yang sudah dipakai di game ini) */
const skillLeft = () => Infinity;   // skill tidak terbatas, hanya cooldown
const skillOwned = id => (PROFILE.vault.skills || SHARED.FREE_SKILLS).includes(id);
const equippedSkills = () => (PROFILE.skillLoadout || []).filter(id => skillById(id) && skillOwned(id)).slice(0, SKILL_SLOTS);

function useAbility(id) {
  const a = skillById(id);
  if (!a || !S || S.state === 'win' || S.state === 'lose' || (Menu.open && !isMP())) return;
  if (!skillOwned(id)) { sfx('error'); UI.toast(`🔒 ${a.name} belum dibuka — buka di menu Skill`); return; }
  if (S.abilityCd[id] > 0) { sfx('error'); return; }
  if (a.target) {
    S.targeting = S.targeting === id ? null : id; S.placing = null; S.selected = null;
    sfx('click'); UI.hidePanel(); UI.renderBar(); UI.renderAbilities(); return;
  }
  consumeSkill(a);
  if (isGuest()) { MP.act({ a: 'ability', id }); S.abilityCd[id] = a.cd; UI.renderAbilities(); return; }
  execAbility(id, S.me);
}
/** Dipanggil saat pemain mengklik peta dalam mode bidik (Serangan Udara / Meteor) */
function targetAt(x, y) {
  const id = S.targeting; S.targeting = null;
  const a = skillById(id); if (!a) return;
  consumeSkill(a);
  if (isGuest()) { MP.act({ a: 'ability', id, x: Math.round(x), y: Math.round(y) }); S.abilityCd[id] = a.cd; UI.renderAbilities(); return; }
  execAbility(id, S.me, x, y);
}
const airstrikeAt = (x, y) => { S.targeting = 'airstrike'; targetAt(x, y); };
function consumeSkill(a) {
  S.skillsUsed[a.id] = (S.skillsUsed[a.id] || 0) + 1;
  PROFILE.stats.abilities++;
  checkAchievements(summary());
}
/** Jalankan skill (di host / solo) untuk pemain pid */
function execAbility(id, pid, x, y) {
  const a = skillById(id); if (!a) return;
  const cds = pid === S.me ? S.abilityCd : (S.players[pid] && (S.players[pid].abilityCd || (S.players[pid].abilityCd = {})));
  if (!cds || cds[id] > 0) return;
  const W2 = Math.min(S.wave, 80);
  switch (id) {
    case 'airstrike':
      for (let i = 0; i < 3; i++) S.strikes.push({ x: x + (i - 1) * 34, y: y + (i % 2 ? -18 : 18), t: 0.6 + i * 0.25, max: 0.6 + i * 0.25, r: 1.4, dmg: 40 + W2 * 18 });
      sfx('rocket'); break;
    case 'meteor':
      S.strikes.push({ x, y, t: 1.1, max: 1.1, r: 2.3, dmg: 160 + W2 * 50, big: true });
      sfx('stun'); announce('☄️ METEOR!', '#ff7043'); break;
    case 'freeze':
      S.freezeT = 4;
      S.enemies.forEach(e => { e.slowUntil = S.time + 4; e.slowF = e.boss ? 0.4 : 0.8; });
      sfx('freeze'); announce('🧊 BADAI ES', '#81d4fa'); break;
    case 'repair': {
      const h = Math.round(S.maxHp * 0.3), before = S.hp;
      S.hp = Math.min(S.maxHp, S.hp + h);
      addText(W - 60, (exitRow() - 1) * T, '+' + Math.round(S.hp - before) + ' ❤️', '#69f0ae', 1.5);
      puff(19.5 * T, exitRow() * T, '#69f0ae', 16); sfx('upgrade'); break;
    }
    case 'cash': {
      const amt = 300 + W2 * 40; addCash(pid, amt);
      if (pid === S.me) addText(W / 2, 70, `+$${amt}`, '#ffd54f', 1.5);
      sfx('coin'); break;
    }
    case 'radar': S.radarT = 15; sfx('achieve'); announce('📡 RADAR AKTIF', '#b388ff'); break;
    case 'overclock': S.overclockT = 8; sfx('upgrade'); announce('⚡ OVERCLOCK', '#ffee58'); break;
    case 'shield': S.shieldT = 8; sfx('achieve'); announce('🛡️ PERISAI BASE', '#64b5f6'); break;
    case 'rewind':
      for (const e of S.enemies) if (!e.boss) placeAtDist(e, Math.max(0, e.dist - 3 * T));
      sfx('stun'); announce('🌀 PUTAR WAKTU', '#64ffda'); break;
    case 'storm':
      for (let i = 0; i < 12; i++) S.stormQ.push({ t: i * 0.22, dmg: 30 + W2 * 12 });
      sfx('stun'); announce('⛈️ BADAI PETIR', '#9fa8da'); break;
  }
  cds[id] = a.cd;
  if (pid !== S.me) addText(W / 2, 40, `${playerName(pid)}: ${a.icon} ${a.name}`, '#fff', 1.5);
  if (pid === S.me) UI.renderAbilities();
}
function announce(text, col) { UI.banner(text, col, 1000); fxEmit(['n', text, col, 1000]); }
/** Pindahkan musuh ke titik tertentu di sepanjang jalur */
function placeAtDist(e, dist) {
  let acc = 0;
  for (let i = 0; i < pathPx.length - 1; i++) {
    const a = pathPx[i], b = pathPx[i + 1], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + seg >= dist) { const k = (dist - acc) / seg; e.x = a.x + (b.x - a.x) * k; e.y = a.y + (b.y - a.y) * k; e.wp = i + 1; e.dist = dist; return; }
    acc += seg;
  }
}
function tickCooldowns(cds, dt) { for (const k in cds) if (cds[k] > 0) cds[k] = Math.max(0, cds[k] - dt); }
function updateStrikes(dt) {
  tickCooldowns(S.abilityCd, dt);
  for (const id in S.players) if (id !== S.me && S.players[id].abilityCd) tickCooldowns(S.players[id].abilityCd, dt);
  S.freezeT = Math.max(0, S.freezeT - dt); S.radarT = Math.max(0, S.radarT - dt);
  S.overclockT = Math.max(0, S.overclockT - dt); S.shieldT = Math.max(0, S.shieldT - dt);
  for (const st of S.strikes) {
    st.t -= dt;
    if (st.t > 0) continue;
    st.done = true;
    const R = (st.r || 1.4) * T, dmg = st.dmg || 40 + Math.min(S.wave, 80) * 18;
    S.effects.push({ kind: 'boom', x: st.x, y: st.y, r: R, life: st.big ? 0.8 : 0.45, max: st.big ? 0.8 : 0.45 }); fxEmit(['b', st.x | 0, st.y | 0, R | 0, st.big ? 0.8 : 0.45]);
    if (SET.shake) S.shake = st.big ? 14 : 6; sfx('boom');
    for (const e of S.enemies) if (!e.dead && Math.hypot(e.x - st.x, e.y - st.y) <= R) damage(e, dmg, { pierceArmor: true }, null);
  }
  S.strikes = S.strikes.filter(st => !st.done);
  if (S.stormQ.length) {
    for (const q of S.stormQ) q.t -= dt;
    const due = S.stormQ.filter(q => q.t <= 0);
    if (due.length) S.stormQ = S.stormQ.filter(q => q.t > 0);
    for (const q of due) {
      if (Skills.hitQueued(q)) continue;              // serangan skill unit (hujan/badai)
      const pool = S.enemies.filter(e => !e.dead);
      if (!pool.length) continue;
      const e = pool[Math.floor(Math.random() * pool.length)];
      tracer(e.x + (Math.random() - 0.5) * 40, 0, e.x, e.y - 8, '#c5cae9', 4, 0.2, 'tesla');
      damage(e, q.dmg, { pierceArmor: true }, null);
    }
  }
}

/* ---------------- MUSUH ---------------- */
function spawn(type, from) {
  const d = ENEMIES[type], w = Math.max(1, S.wave);
  let hp = d.hp * (1 + w * 0.13 + Math.pow(w, 1.6) * 0.01);
  if (d.boss) hp = d.hp * Math.pow(w / 10, 2.1) * (1 + w * 0.05);
  if (d.miniboss) hp = d.hp * Math.pow(w / 10, 1.9) * (1 + w * 0.06);
  hp *= DIFFS[S.diff].hpMul * S.M.hpMul;
  const e = {
    id: S.nextId++, type, ...d, spd: d.spd * S.M.spdMul, reward: Math.max(1, Math.round(d.reward * DIFFS[S.diff].reward * S.M.rewardMul)),
    maxHp: hp, hp, x: pathPx[0].x, y: pathPx[0].y, wp: 1, dist: 0,
    slowUntil: 0, slowF: 0, wob: Math.random() * 6, stunT: 6, summonT: 10, hitT: 0,
    shieldHp: d.shield ? hp * d.shield : 0, maxShield: d.shield ? hp * d.shield : 0, healT: 2, necroT: 3, stealthT: Math.random() * 3,
  };
  if (from) {
    e.x = from.x + (Math.random() - 0.5) * 14; e.y = from.y + (Math.random() - 0.5) * 14;
    e.wp = from.wp; e.dist = from.dist - Math.random() * 10;
  }
  if (S.freezeT > 0) { e.slowUntil = S.time + S.freezeT; e.slowF = e.boss ? 0.4 : 0.8; }
  S.enemies.push(e);
  return e;
}
function damage(e, amt, L, src, quiet) {
  if (e.dead) return;
  let a = amt;
  if ((e.boss || e.miniboss) && L.bossMul) a *= L.bossMul;
  if (e.shieldHp > 0) {     // perisai menyerap damage lebih dulu
    const sd = a * (L.pierceArmor ? 2 : 1), used = Math.min(e.shieldHp, sd);
    e.shieldHp -= used; a -= used / (L.pierceArmor ? 2 : 1); e.hitT = 0.1;
    if (e.shieldHp <= 0) { puff(e.x, e.y, '#64b5f6', 10); addText(e.x, e.y - 30, 'PERISAI PECAH', '#64b5f6', 0.8); }
    if (a <= 0) return;
  }
  if (src && !quiet) a = Skills.hitMul(src, e, a);                  // skill pasif
  if (S.time < (e.shredUntil || 0)) a *= 1 + (e.shred || 0);         // musuh terluka: damage ekstra
  if (e.armor && !L.pierceArmor) a *= (1 - e.armor);
  a = Math.min(a, e.hp);
  e.hp -= a; e.hitT = 0.1;
  if (src) { src.dmg += a; addUxp(src.owner, src.type, a / 60); }
  if (SET.dmgNum && a >= 0.5 && !quiet) addText(e.x + (Math.random() * 16 - 8), e.y - 22, fmtNum(a), '#fff', 0.5);
  if (e.hp <= 0.001) kill(e, src);
  else if (src && !quiet) Skills.afterHit(src, e);
}
function kill(e, src) {
  e.dead = true;
  const rw = Math.round(e.reward * (src ? lvl(src).rewardMul : 1));
  addCashAll(rw); S.kills++;
  if (src) { src.kills++; addUxp(src.owner, src.type, 1); Skills.onKill(src, e); }
  puff(e.x, e.y, e.color, e.boss ? 30 : 8); vfxKill(e);
  if (e.boss) { S.bossKills++; PROFILE.stats.bossKills++; S.shake = SET.shake ? 10 : 0; sfx('boom'); UI.toast('👑 Boss dikalahkan! +$' + e.reward); fxEmit(['k']); checkAchievements(summary()); }
  if (e.split) for (let i = 0; i < (e.splitN || 2); i++) spawn(e.split, e);
  if (e.bomber) {      // ledakan yang membuat tower di dekatnya pingsan
    const R = 1.7 * T;
    for (const t of S.towers) if (Math.hypot(t.x - e.x, t.y - e.y) <= R) t.stunUntil = Math.max(t.stunUntil, S.time + 1.5);
    S.effects.push({ kind: 'boom', x: e.x, y: e.y, r: R, life: 0.4, max: 0.4 }); fxEmit(['b', e.x | 0, e.y | 0, R | 0, 0.4]);
    sfx('stun');
  }
}

/* ---------------- STATISTIK UNIT (mastery + trait + evolusi) ---------------- */
const NO_UNIT = { xp: 0, trait: null, evo: false, skin: 'default' };
const unitById = id => PROFILE.vault.units.find(u => u.id === id) || null;
/** Unit yang dipakai untuk satu jenis tower: yang ada di loadout, jika tidak ada → unit terbaik milik pemain */
function unitOf(type) {
  for (const id of PROFILE.loadout) { const u = unitById(id); if (u && u.type === type) return u; }
  return PROFILE.vault.units.filter(u => u.type === type).sort((a, b) => (b.evo - a.evo) || (b.xp - a.xp))[0] || NO_UNIT;
}
const loadoutUnits = () => PROFILE.loadout.map(unitById).filter(Boolean);
const loadoutTypes = () => loadoutUnits().map(u => u.type);
/** Data unit ringkas per jenis (dikirim ke pemain lain saat mabar) */
const myUnitsMap = () => Object.fromEntries(loadoutUnits().map(u => [u.type, { xp: u.xp, trait: u.trait, evo: u.evo, skin: u.skin }]));
/** Bersihkan loadout dari unit yang sudah tidak dimiliki (mis. setelah trading) */
function cleanLoadout(prevTypes) {
  const seen = new Set();
  PROFILE.loadout = PROFILE.loadout.filter(id => { const u = unitById(id); if (!u || seen.has(u.type)) return false; seen.add(u.type); return true; });
  for (const t of prevTypes || []) {
    if (seen.has(t) || PROFILE.loadout.length >= LOADOUT_SIZE) continue;
    const u = PROFILE.vault.units.find(x => x.type === t); if (u) { PROFILE.loadout.push(u.id); seen.add(t); }
  }
  if (!PROFILE.loadout.length && PROFILE.vault.units.length) PROFILE.loadout = [PROFILE.vault.units[0].id];
}
const r2 = v => Math.round(v * 100) / 100;
/** Statistik efektif satu level tower setelah mastery, trait, dan evolusi */
function computeL(type, level, unit = unitOf(type)) {
  const L = { ...TOWERS[type].levels[level] };
  const tr = unit.trait ? TRAITS[unit.trait] : null, ev = unit.evo ? EVOS[type] : null, em = ev ? ev.mul : {};
  const dmgMul = (1 + (unitLevel(unit.xp) - 1) * MASTERY_BONUS) * (tr && tr.dmgMul || 1);
  if (L.dmg) L.dmg = r2(L.dmg * dmgMul * (em.dmg || 1));
  if (L.income) L.income = Math.round(L.income * dmgMul * (em.income || 1));
  if (L.buff) L.buff = r2(L.buff * (tr && tr.dmgMul || 1) + (em.buffAdd || 0));
  if (L.range) L.range = r2(L.range * (tr && tr.rangeMul || 1) * (em.range || 1));
  if (L.rate) L.rate = r2(L.rate * (tr && tr.rateMul || 1));
  if (L.splash) L.splash = r2(L.splash * (em.splash || 1));
  if (L.goldHit) L.goldHit = Math.round(L.goldHit * (em.goldHit || 1) * ((tr && tr.rewardMul) || 1));
  if (L.chain) L.chain += em.chainAdd || 0;
  if (L.rampMax) L.rampMax = r2(L.rampMax + (em.rampAdd || 0));
  if (L.dot) L.dot = { ...L.dot, pct: L.dot.pct * (em.dotMul || 1) };
  if (L.aura && L.slow) L.slow = r2(Math.min(0.85, L.slow + (em.slowAdd || 0)));
  if (tr && tr.hidden && L.dmg) L.hidden = true;
  if (tr && tr.pierce) L.pierceArmor = true;
  if (tr && tr.bossMul) L.bossMul = r2((L.bossMul || 1) * tr.bossMul);
  L.rewardMul = tr && tr.rewardMul || 1;
  L.perk = ev ? ev.perk : null;
  return L;
}
function costOf(type, level, pid) { const u = S && pid ? unitFor(type, pid) : unitOf(type); return Math.round(TOWERS[type].levels[level].cost * ((u.trait && TRAITS[u.trait] && TRAITS[u.trait].costMul) || 1)); }
const towerName = type => unitOf(type).evo ? EVOS[type].name : TOWERS[type].name;
const towerColor = type => unitOf(type).evo ? EVOS[type].color : TOWERS[type].color;

/* ---------------- TOWER ---------------- */
const lvl = t => t.L || TOWERS[t.type].levels[t.level];
const countType = (type, pid = S.me) => S.towers.filter(t => t.type === type && t.owner === pid).length;
const isMax = t => t.level >= TOWERS[t.type].levels.length - 1;

function placeReason(type, c, r, pid = S.me) {
  const def = TOWERS[type];
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 'Di luar peta';
  if (pathTiles.has(c + ',' + r)) return 'Tidak bisa di jalur';
  if (c >= 19 && Math.abs(r - exitRow()) <= 1) return 'Area base';
  if (S.M.ban.includes(type)) return 'Dilarang oleh modifier';
  if (S.towers.some(t => t.c === c && t.r === r)) return 'Sudah ada tower';
  if (deco.some(d => d.c === c && d.r === r)) return 'Terhalang';
  if (countType(type, pid) >= def.limit) return `Batas ${def.name} (${def.limit})`;
  if (pcash(pid) < costOf(type, 0, pid)) return 'Uang tidak cukup';
  return null;
}
function makeTower(type, c, r, pid = S.me) {
  const u = unitFor(type, pid);
  return { id: S.nextId++, type, c, r, x: (c + 0.5) * T, y: (r + 0.5) * T, level: 0, cd: 0, angle: -Math.PI / 2,
           spent: costOf(type, 0, pid), target: 'first', recoil: 0, dmg: 0, kills: 0, stunUntil: 0, buff: 0, gh: false,
           L: computeL(type, 0, u), evo: !!u.evo, trait: u.trait, skin: u.skin || 'default', shots: 0, ramp: 0, owner: pid };
}
function placeTower(type, c, r, pid = S.me) {
  if (pid === S.me && isGuest()) {
    if (placeReason(type, c, r)) { sfx('error'); return null; }
    MP.act({ a: 'place', type, c, r }); PROFILE.stats.towersPlaced++; tip('placed'); sfx('place'); return true;
  }
  const why = placeReason(type, c, r, pid);
  if (why) { if (pid === S.me) sfx('error'); return null; }
  spend(pid, costOf(type, 0, pid));
  const t = makeTower(type, c, r, pid);
  S.towers.push(t);
  if (pid === S.me) { tip('placed'); PROFILE.stats.towersPlaced++; }
  sfx('place'); puff(t.x, t.y, '#fff'); vfxPlace(t); fxEmit(['p', t.x | 0, t.y | 0, '#fff', 8, 'place']);
  UI.refreshAll();
  return t;
}
function upgradeTower(t, pid = S.me) {
  if (!t || isMax(t) || t.owner !== pid) return;
  if (pid === S.me && isGuest()) {
    if (S.cash < costOf(t.type, t.level + 1, t.owner)) { sfx('error'); return; }
    MP.act({ a: 'upgrade', id: t.id }); if (t.level + 1 >= TOWERS[t.type].levels.length - 1) PROFILE.stats.maxed++; sfx('upgrade'); return;
  }
  const cost = costOf(t.type, t.level + 1, t.owner);
  if (pcash(pid) < cost) { if (pid === S.me) sfx('error'); return; }
  spend(pid, cost); t.spent += cost; t.level++; t.L = computeL(t.type, t.level, unitFor(t.type, t.owner));
  sfx('upgrade'); puff(t.x, t.y, '#ffd54f', 12); vfxUpgrade(t); fxEmit(['p', t.x | 0, t.y | 0, '#ffd54f', 12, 'upgrade']);
  addText(t.x, t.y - 30, lvl(t).name + '!', '#ffd54f', 1); fxEmit(['x', t.x, t.y - 30, lvl(t).name + '!', '#ffd54f', 1]);
  if (isMax(t) && pid === S.me) { PROFILE.stats.maxed++; checkAchievements(summary()); }
  UI.refreshAll();
}
function sellTower(t, pid = S.me) {
  if (!t || t.owner !== pid) return;
  if (pid === S.me && isGuest()) { MP.act({ a: 'sell', id: t.id }); if (S.selected === t) S.selected = null; sfx('sell'); UI.hidePanel(); return; }
  const v = Math.floor(t.spent * SELL_RATE);
  addCash(pid, v); S.earned -= pid === S.me ? v : 0; if (S.players[pid] && pid !== S.me) S.players[pid].earned -= v;
  S.towers = S.towers.filter(x => x !== t);
  if (S.selected === t) S.selected = null;
  sfx('sell'); addText(t.x, t.y, '+$' + v, '#ffd54f'); puff(t.x, t.y, '#aaa'); fxEmit(['p', t.x | 0, t.y | 0, '#aaa', 8, 'sell']);
  UI.refreshAll();
}
function setTarget(t, mode) {
  if (!t || t.owner !== S.me) return;
  t.target = mode;
  if (isGuest()) MP.act({ a: 'target', id: t.id, mode });
}
const TARGET_MODES = ['first', 'last', 'strong', 'close'];
const TARGET_LABEL = { first: 'Pertama', last: 'Terakhir', strong: 'Terkuat', close: 'Terdekat' };

function canSeeHidden(t) { return !!(lvl(t).hidden || t.gh || S.radarT > 0); }
function pickTarget(t, L) {
  const R = L.range * T, seeHidden = canSeeHidden(t);
  let best = null, bv = -Infinity;
  for (const e of S.enemies) {
    if (e.dead || (e.hidden && !seeHidden) || (e.flying && GROUND_ONLY.has(t.type))) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y);
    if (d > R || (L.minRange && d < L.minRange * T)) continue;
    const v = t.target === 'first' ? e.dist : t.target === 'last' ? -e.dist : t.target === 'strong' ? e.hp : -d;
    if (v > bv) { bv = v; best = e; }
  }
  return best;
}
function applyBuffs() {
  for (const t of S.towers) { t.buff = 0; t.gh = false; }
  for (const c of S.towers) {
    if (c.type !== 'commander' || S.time < c.stunUntil) continue;
    const L = lvl(c), R = L.range * T;
    for (const t of S.towers) {
      if (t === c || t.type === 'commander' || t.type === 'farm') continue;
      if (Math.hypot(t.x - c.x, t.y - c.y) <= R) { t.buff = Math.max(t.buff, L.buff); if (L.grantHidden) t.gh = true; }
    }
  }
}
function fire(t, L, e) {
  const mx = t.x + Math.cos(t.angle) * 22, my = t.y - 10 + Math.sin(t.angle) * 22;
  const kind = PROJ[t.type];
  if (kind) {
    sfx(kind === 'nuke' ? 'stun' : kind === 'fire' ? 'freeze' : 'rocket');
    const n = L.perk === 'double' ? 2 : 1;
    for (let i = 0; i < n; i++)
      S.projectiles.push({ x: mx + i * 8, y: my - i * 10, tx: e.x, ty: e.y, target: kind === 'shell' || kind === 'nuke' ? null : e, L, src: t, a: t.angle,
        big: t.type === 'rocketeer' || kind === 'nuke', kind, trail: 0, sx: mx, sy: my, life: 0 });
    return;
  }
  const C = TRACER[t.type] || TRACER.default;
  sfx(C.sfx);
  if (L.line) return fireLine(t, L, e, mx, my);
  tracer(mx, my, e.x, e.y - 8, C.col, C.w, C.life, t.type);
  S.effects.push({ kind: 'flash', x: mx, y: my, life: 0.05, max: 0.05 });
  if (L.slow) applySlow(e, L.slow);
  if (L.chain) return fireChain(t, L, e);
  // Perk evolusi
  let dmg = L.dmg;
  if (L.perk === 'triple' && ++t.shots % 4 === 0) { dmg *= 3; addText(e.x, e.y - 34, '×3', '#ffeb3b', 0.6); }
  if (L.perk === 'crit' && Math.random() < 0.25) { dmg *= 3; addText(e.x, e.y - 34, 'CRIT!', '#ff5252', 0.7); }
  if (L.perk === 'ramp') { t.ramp = Math.min(0.8, t.ramp + 0.04); dmg *= 1 + t.ramp; }
  if (L.beam) { if (t.beamTarget !== e.id) { t.beamTarget = e.id; t.heat = 0; } t.heat = Math.min(L.rampMax, (t.heat || 0) + 0.06); dmg *= 1 + t.heat; }
  if (L.perk === 'freeze' && !e.boss && Math.random() < 0.2) { e.frozenUntil = S.time + 1; addText(e.x, e.y - 34, '❄', '#81d4fa', 0.6); }
  damage(e, dmg, L, t);
  if (L.goldHit) {   // Penambang Emas: setiap pukulan menghasilkan uang (teks digabung agar tidak ramai)
    const gh = Math.round(L.goldHit * Skills.goldMul(t));
    addCash(t.owner || S.me, gh); t.goldAcc = (t.goldAcc || 0) + gh;
    if (S.time - (t.goldTxt || 0) > 0.6) { addText(t.x, t.y - 34, '+$' + t.goldAcc, '#ffd54f', 0.8); fxEmit(['x', t.x, t.y - 34, '+$' + t.goldAcc, '#ffd54f', 0.8]); t.goldAcc = 0; t.goldTxt = S.time; }
  }
  if (L.dot && !e.dead) applyDot(e, L, t);
  if (L.splashHit) {      // semburan / racun mengenai musuh di sekitar target
    for (const o of S.enemies) {
      if (o === e || o.dead || (o.hidden && !canSeeHidden(t))) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) <= L.splashHit * T) { damage(o, dmg * 0.6, L, t, true); if (L.dot && !o.dead) applyDot(o, L, t); if (L.slow) applySlow(o, L.slow); }
    }
  }
}
/* Warna & suara tembakan langsung per tower */
const TRACER = {
  default: { col: '#ffeb3b', w: 2, life: 0.06, sfx: 'shoot' },
  sniper: { col: '#fff59d', w: 3, life: 0.15, sfx: 'snipe' }, freezer: { col: '#81d4fa', w: 2, life: 0.06, sfx: 'freeze' },
  flamer: { col: '#ff7043', w: 6, life: 0.1, sfx: 'shoot' }, tesla: { col: '#18ffff', w: 3, life: 0.15, sfx: 'stun' },
  laser: { col: '#ff1744', w: 4, life: 0.11, sfx: 'shoot' }, poison: { col: '#76ff03', w: 4, life: 0.12, sfx: 'freeze' },
  railgun: { col: '#82b1ff', w: 6, life: 0.25, sfx: 'snipe' }, pistol: { col: '#ffe082', w: 2, life: 0.05, sfx: 'shoot' },
  archer: { col: '#d7ccc8', w: 2, life: 0.1, sfx: 'shoot' }, shotgun: { col: '#ffcc80', w: 4, life: 0.07, sfx: 'snipe' }, ninja: { col: '#cfd8dc', w: 2, life: 0.08, sfx: 'shoot' },
  samurai: { col: '#ffffff', w: 5, life: 0.12, sfx: 'snipe' }, cosmic: { col: '#ea80fc', w: 4, life: 0.2, sfx: 'stun' }, goldminer: { col: '#ffd54f', w: 3, life: 0.07, sfx: 'shoot' }, wizard: { col: '#b388ff', w: 3, life: 0.16, sfx: 'stun' }, angel: { col: '#fff59d', w: 8, life: 0.3, sfx: 'snipe' },
};
function tracer(x1, y1, x2, y2, col, w, life, type) {
  atkFx(x1, y1, x2, y2, col, w, life, type);        // gaya serangan per unit (skills.js)
  fxEmit(['t', x1 | 0, y1 | 0, x2 | 0, y2 | 0, col, w, life, type]);
}
function applySlow(e, slow) {
  if (e.noSlow) return;
  const f = e.boss ? slow / 2 : slow;
  e.slowF = Math.max(S.time < e.slowUntil ? e.slowF : 0, f); e.slowUntil = S.time + 2;
}
function applyDot(e, L, src) {
  e.dot = { dps: L.dmg * L.dot.pct, until: S.time + L.dot.dur, src, col: L.dot.col };
}
/** Petir berantai (Tesla) */
function fireChain(t, L, first) {
  const hit = new Set([first.id]); let cur = first, dmg = L.dmg;
  const C = TRACER[t.type] || TRACER.tesla;
  if (L.perk === 'crit' && Math.random() < 0.25) { dmg *= 3; addText(first.x, first.y - 34, 'CRIT!', '#ff5252', 0.7); }
  const extra = o => { if (L.slow) applySlow(o, L.slow); if (L.dot && !o.dead) applyDot(o, L, t); if (L.perk === 'freeze' && !o.boss && Math.random() < 0.2) { o.frozenUntil = S.time + 1; addText(o.x, o.y - 34, '❄', '#81d4fa', 0.6); } };
  damage(first, dmg, L, t); extra(first);
  for (let i = 1; i < L.chain; i++) {
    let next = null, nd = L.chainRange * T;
    for (const o of S.enemies) {
      if (o.dead || hit.has(o.id) || (o.hidden && !canSeeHidden(t))) continue;
      const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d <= nd) { nd = d; next = o; }
    }
    if (!next) break;
    tracer(cur.x, cur.y - 8, next.x, next.y - 8, C.col, C.w, 0.15, t.type);
    dmg *= 0.85; damage(next, dmg, L, t); extra(next); hit.add(next.id); cur = next;
  }
}
/** Tembakan tembus garis (Railgun) */
function fireLine(t, L, e, mx, my) {
  const ang = Math.atan2(e.y - t.y, e.x - t.x), len = L.range * T, ex = t.x + Math.cos(ang) * len, ey = t.y + Math.sin(ang) * len;
  const C = TRACER[t.type] || TRACER.railgun;
  tracer(mx, my, ex, ey, C.col, C.w, C.life, t.type);
  let dmg = L.dmg;
  if (L.perk === 'crit' && Math.random() < 0.25) { dmg *= 3; addText(e.x, e.y - 34, 'CRIT!', '#ff5252', 0.7); }
  for (const o of S.enemies) {
    if (o.dead || (o.hidden && !canSeeHidden(t))) continue;
    const px = o.x - t.x, py = o.y - t.y, proj = px * Math.cos(ang) + py * Math.sin(ang);
    if (proj < 0 || proj > len) continue;
    if (Math.abs(-px * Math.sin(ang) + py * Math.cos(ang)) <= 16) { damage(o, dmg, L, t); if (L.dot && !o.dead) applyDot(o, L, t); }
  }
}
/** Aura (Penjaga Waktu): melukai & memperlambat semua musuh di dalam jangkauan */
function pulseAura(t, L) {
  let any = false;
  for (const o of S.enemies) {
    if (o.dead || (o.hidden && !canSeeHidden(t))) continue;
    if (Math.hypot(o.x - t.x, o.y - t.y) <= L.range * T) { damage(o, L.dmg, L, t, true); applySlow(o, L.slow); if (!o.dead) Skills.afterHit(t, o); any = true; }
  }
  const ac = t.type === 'reaper' ? '#b388ff' : '#64ffda';
  if (any) { S.effects.push({ kind: 'shock', x: t.x, y: t.y, r: L.range * T, life: 0.4, max: 0.4, col: ac }); fxEmit(['s', t.x | 0, t.y | 0, (L.range * T) | 0, ac, 0.4]); }
}
function explode(p) {
  const R = p.L.splash * T;
  S.effects.push({ kind: 'boom', x: p.tx, y: p.ty, r: R, life: 0.35, max: 0.35 }); fxEmit(['b', p.tx | 0, p.ty | 0, R | 0, 0.35]);
  if (p.kind === 'nuke') { S.effects.push({ kind: 'shock', x: p.tx, y: p.ty, r: R * 1.4, life: 0.8, max: 0.8, col: '#ffeb3b' }); fxEmit(['s', p.tx | 0, p.ty | 0, (R * 1.4) | 0, '#ffeb3b', 0.8]); if (SET.shake) S.shake = 14; }
  sfx('boom');
  for (const e of S.enemies) {
    if (e.dead || (e.hidden && !canSeeHidden(p.src) && e !== p.target) || (e.flying && GROUND_ONLY.has(p.src.type))) continue;
    if (Math.hypot(e.x - p.tx, e.y - p.ty) <= R) {
      damage(e, p.L.dmg, p.L, p.src);
      if (p.L.perk === 'burn' && !e.dead) e.dot = { dps: p.L.dmg * 0.3, until: S.time + 3, src: p.src, col: 'burn' };
      if (p.L.dot && !e.dead) applyDot(e, p.L, p.src);
    }
  }
}

/* ---------------- KEMAMPUAN MUSUH ---------------- */
function enemyAbilities(e, dt) {
  if (e.healer) {
    e.healT -= dt;
    if (e.healT <= 0) {
      e.healT = 2; let any = false;
      for (const o of S.enemies) {
        if (o === e || o.dead || o.boss || o.hp >= o.maxHp || Math.hypot(o.x - e.x, o.y - e.y) > 2 * T) continue;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.08); any = true;
      }
      if (any) { S.effects.push({ kind: 'shock', x: e.x, y: e.y, r: 2 * T, life: 0.5, max: 0.5, col: '#69f0ae' }); fxEmit(['s', e.x | 0, e.y | 0, (2 * T) | 0, '#69f0ae', 0.5]); }
    }
  }
  if (e.stealth) {      // siklus terlihat 3 dtk / tersembunyi 2,5 dtk
    e.stealthT -= dt;
    if (e.stealthT <= 0) { e.hidden = !e.hidden; e.stealthT = e.hidden ? 2.5 : 3; }
  }
  if (e.necro) {
    e.necroT -= dt;
    if (e.necroT <= 0) {
      e.necroT = 4;
      if (S.enemies.length < 90) { for (let i = 0; i < 2; i++) spawn('skeleton', e); S.effects.push({ kind: 'shock', x: e.x, y: e.y, r: T, life: 0.4, max: 0.4, col: '#b388ff' }); }
    }
  }
}

/* ---------------- BOSS ---------------- */
function bossAbilities(e, dt) {
  e.stunT -= dt; e.summonT -= dt;
  if (e.stunT <= 0) {
    e.stunT = 8;
    const R = 2.6 * T; let hit = 0;
    for (const t of S.towers) if (Math.hypot(t.x - e.x, t.y - e.y) <= R) { t.stunUntil = S.time + 2.5; hit++; }
    S.effects.push({ kind: 'shock', x: e.x, y: e.y, r: R, life: 0.6, max: 0.6 }); fxEmit(['s', e.x | 0, e.y | 0, R | 0, '#e040fb', 0.6]);
    if (hit) { sfx('stun'); addText(e.x, e.y - 50, 'STUN!', '#e040fb', 1); }
  }
  if (e.summonT <= 0) {
    e.summonT = 12;
    for (let i = 0; i < 3; i++) spawn(S.wave >= 20 ? 'tank' : 'normal', e);
    S.effects.push({ kind: 'shock', x: e.x, y: e.y, r: T, life: 0.4, max: 0.4, col: '#76ff03' });
  }
}

/* ---------------- UPDATE ---------------- */
function update(dt) {
  S.time += dt;
  updateStrikes(dt);
  // Auto: mulai wave berikutnya otomatis + skip otomatis begitu semua musuh wave sudah keluar
  if (S.autoSkip && !isGuest()) {
    if (S.state === 'ready' && S.wave < S.maxWave) { S.autoTimer -= dt; if (S.autoTimer <= 0) startWave(); }
    else if (canSkip()) { S.autoSkipT = (S.autoSkipT == null ? AUTO_SKIP_DELAY : S.autoSkipT) - dt; if (S.autoSkipT <= 0) { S.autoSkipT = null; skipWave(); } }
    else S.autoSkipT = null;
  }
  if (S.state === 'wave') {
    S.waveTime += dt;
    while (S.spawnQ.length && S.spawnQ[0].t <= S.waveTime) {
      const sq = S.spawnQ.shift(), e = spawn(sq.type);
      if (e && sq.m) { e.hp *= sq.m.hp; e.maxHp *= sq.m.hp; e.shieldHp *= sq.m.hp; e.maxShield *= sq.m.hp; e.reward = Math.max(1, Math.round(e.reward * sq.m.rw)); e.elite = sq.m.hp > 1.6; if (e.elite) e.size *= 1.12; }
    }
  }

  // Musuh
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    if (e.boss) bossAbilities(e, dt);
    e.hitT = Math.max(0, e.hitT - dt);
    enemyAbilities(e, dt);
    if (e.dot && S.time < e.dot.until) { damage(e, e.dot.dps * dt, e.dot.src.L || {}, e.dot.src, true); if (e.dead) continue; }
    if (e.frozenUntil && S.time < e.frozenUntil) continue;
    let move = e.spd * T * (S.time < e.slowUntil && !e.noSlow ? (1 - e.slowF) : 1) * (e.berserk && e.hp < e.maxHp * 0.5 ? 2 : 1) * dt;
    while (move > 0 && e.wp < pathPx.length) {
      const p = pathPx[e.wp], dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      if (d <= move) { e.x = p.x; e.y = p.y; move -= d; e.dist += d; e.wp++; }
      else { e.x += dx / d * move; e.y += dy / d * move; e.dist += move; e.dir = Math.atan2(dy, dx); move = 0; }
    }
    if (e.wp >= pathPx.length) {
      e.dead = true; S.leaked = true;
      let dmg = S.shieldT > 0 ? 0 : e.boss ? 9999 : Math.ceil(e.hp);
      if (e.thief) {
        const steal = 60 + Math.min(S.wave, 80) * 15;
        addCash(S.me, -Math.min(S.cash, steal)); for (const id in S.players) if (id !== S.me) addCash(id, -Math.min(S.players[id].cash, steal));
        addText(W - 80, (exitRow() - 1) * T, `-$${steal} dicuri!`, '#ff8a80', 1.5); fxEmit(['x', W - 80, (exitRow() - 1) * T, `-$${steal} dicuri!`, '#ff8a80', 1.5]);
        dmg = Math.ceil(dmg * 0.3);
      }
      if (S.godMode) dmg = 0;
      S.hp -= dmg; sfx(dmg ? 'leak' : 'freeze'); if (SET.shake && dmg) S.shake = 8;
      addText(W - 60, (exitRow() + 0.5) * T, '-' + dmg, '#ef5350', 1.2);
    }
  }
  S.enemies = S.enemies.filter(e => !e.dead);

  // Tower
  applyBuffs();
  for (const t of S.towers) {
    if (t.type === 'farm' || t.type === 'commander') continue;
    t.recoil = Math.max(0, t.recoil - dt * 6);
    if (S.time < t.stunUntil) continue;
    const L = lvl(t); t.cd -= dt;
    if (L.aura) { if (t.cd <= 0) { t.cd = L.rate * Skills.rateMul(t); pulseAura(t, L); } continue; }
    const tg = pickTarget(t, L);
    if (!tg && t.ramp) t.ramp = Math.max(0, t.ramp - dt * 0.5);
    if (tg) {
      t.angle = Math.atan2(tg.y - t.y, tg.x - t.x);
      if (t.cd <= 0) { t.cd = L.rate * (1 - t.buff) * (S.overclockT > 0 ? 0.5 : 1) * Skills.rateMul(t); t.recoil = 1; fire(t, L, tg); }
    }
  }

  // Proyektil
  for (const p of S.projectiles) {
    if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), mv = (p.kind === 'nuke' ? 4 : p.kind === 'shell' ? 6 : p.big ? 7 : 9) * T * dt;
    p.trail -= dt;
    if (p.trail <= 0) { p.trail = 0.03; S.effects.push({ kind: 'smoke', x: p.x, y: p.y, life: 0.4, max: 0.4 }); }
    if (d <= mv) { p.done = true; explode(p); }
    else { p.x += dx / d * mv; p.y += dy / d * mv; p.a = Math.atan2(dy, dx); }
  }
  S.projectiles = S.projectiles.filter(p => !p.done);

  updateEffects(dt);

  if (S.hp <= 0 && S.state !== 'lose') { S.hp = 0; S.state = 'lose'; finishGame(false); }
  if (S.state === 'wave' && !S.spawnQ.length && !S.enemies.length) endWave();
}

/* ---------------- EFEK & UTIL ---------------- */
function updateEffects(dt) {
  for (const f of S.effects) {
    if (f.delay > 0) { f.delay -= dt; continue; }   // efek benturan menunggu proyektil tiba
    f.life -= dt;
    if (f.kind === 'part') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 400 * dt; }
  }
  S.effects = S.effects.filter(f => f.life > 0);
  S.texts.forEach(x => { x.life -= dt; x.y -= 30 * dt; });
  S.texts = S.texts.filter(x => x.life > 0);
}
function puff(x, y, col, n = 8) {
  if (SET.quality === 'low') n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++)
    S.effects.push({ kind: 'part', x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160 - 60, col, life: 0.5, max: 0.5, s: 4 + Math.random() * 5 });
}
function addText(x, y, txt, col, life = 0.8) { S.texts.push({ x, y, txt, col, life, max: life }); }
function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return n >= 10 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();
}

/* ---------------- PROGRESI ---------------- */
function summary() {
  return { wave: S.wave, won: S.state === 'win', hp: S.hp, maxHp: S.maxHp, diff: S.diff, earned: S.earned, mode: S.mode, daily: !!S.daily, mp: isMP() };
}
function checkAchievements(g) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (PROFILE.achievements.includes(a.id)) continue;
    if (a.test(PROFILE, g)) { PROFILE.achievements.push(a.id); got.push(a); }
  }
  if (got.length) saveProfile();
  got.forEach((a, i) => setTimeout(() => {
    Eco.act('achClaim', { id: a.id }).then(r => { if (!r.already) { sfx('achieve'); UI.toast(`🏅 ${a.name} — +${r.coins} 🪙 +${r.diamonds} 💎`, 'gold'); } }).catch(() => {});
  }, i * 700));
  return got;
}
function bestKey(mapId, diff, mode) { return mapId + '_' + diff + (mode === 'endless' ? '_endless' : ''); }
function calcScore(cleared, won) {
  const mul = DIFFS[S.diff].coinMul * (1 + MAP.stars * 0.1) * (S.daily ? 1.2 : 1);
  return Math.round((cleared * 500 + S.kills * 5 + Math.max(0, S.hp) * 10 + S.bossKills * 1000 + (won ? 5000 : 0)) * mul);
}
/** Data hasil permainan yang diklaim ke ekonomi (server atau lokal) */
function claimPayload(won, abandoned) {
  const cleared = won ? S.wave : Math.max(0, S.wave - 1);
  const uxp = {};
  for (const [type, gain] of Object.entries(S.uxp)) { const u = unitOf(type); if (u.id) uxp[u.id] = Math.round(gain); }
  return { result: { cleared, won, diff: S.diff, map: MAP.id, mode: S.mode, daily: !!S.daily, bossKills: S.bossKills, kills: S.kills,
    duration: Math.round(S.time), uxp, abandoned: !!abandoned } };
}
/** Saat keluar di tengah permainan: hanya kurangi stok skill yang terpakai */
function abandonGame() {
  /* skill tidak terbatas — tidak ada yang perlu dikurangi saat keluar */
}
async function finishGame(won) {
  if (S.recorded) return; S.recorded = true;
  SaveGame.clear();
  const D = DIFFS[S.diff];
  const cleared = won ? S.wave : Math.max(0, S.wave - 1);
  let record = false;
  if (isHost()) MP.broadcastEnd(won);
  if (!S.daily && !isMP()) {
    const key = bestKey(MAP.id, S.diff, S.mode);
    record = cleared > (PROFILE.best[key] || 0);
    if (record) PROFILE.best[key] = cleared;
  }
  if (S.daily) { const ds = dailyState(); ds.best = Math.max(ds.best, cleared); if (won && !ds.won) { ds.won = true; PROFILE.stats.dailyWins++; } }

  // Hadiah: dihitung oleh modul ekonomi (server jika login)
  let rw = { coins: 0, crystals: 0, stones: 0, gems: 0, mastery: [], dailyReward: 0 };
  const prevTypes = loadoutTypes();
  try { rw = await Eco.act('claim', claimPayload(won)); }
  catch (e) { UI.toast('⚠️ Hadiah gagal disimpan: ' + e.message, '', 5000); }
  cleanLoadout(prevTypes);
  const mastery = (rw.mastery || []).sort((a, b) => b.gain - a.gain);

  const xp = Math.round(cleared * 20 * D.coinMul + S.kills * 0.5 + (won ? 300 : 0));
  const lvBefore = levelFromXp(PROFILE.xp);
  PROFILE.xp += xp;
  const lvAfter = levelFromXp(PROFILE.xp);

  // Papan skor lokal (15 terbaik)
  const score = calcScore(cleared, won);
  const run = { score, map: MAP.id, diff: S.diff, mode: S.mode, daily: !!S.daily, coop: isMP(), wave: S.wave, won, kills: S.kills, date: todayStr(), id: Date.now() };
  if (typeof Online !== 'undefined' && !S.devUsed) Online.submitRun({ score, wave: S.wave, map: MAP.id, diff: S.diff, won, mode: isMP() ? 'coop' : S.daily ? 'daily' : S.mode });
  PROFILE.runs.push(run);
  PROFILE.runs.sort((a, b) => b.score - a.score);
  PROFILE.runs = PROFILE.runs.slice(0, 15);
  const rank = PROFILE.runs.findIndex(r => r.id === run.id) + 1;

  const st = PROFILE.stats;
  if (won) st.wins++;
  st.kills += S.kills; st.cashEarned += S.earned; st.playTime += Math.round(S.time);
  PROFILE.mapsPlayed[MAP.id] = (PROFILE.mapsPlayed[MAP.id] || 0) + 1;
  saveProfile();
  const ach = checkAchievements(summary());

  sfx(won ? 'win' : 'lose');
  Menu.endData = { won, record, coins: rw.coins || 0, xp, diamonds: rw.diamonds || 0, levelUp: lvAfter > lvBefore ? lvAfter : 0, ach, score, rank,
    dailyReward: rw.dailyReward || 0, lan: rw.lan || 0, chest: rw.chest || null, firstWin: !!rw.firstWin, lgPts: rw.lgPts || 0, chestFull: !rw.chest && (won || cleared >= 10) && (PROFILE.vault.chests || []).length >= SHARED.CHEST_SLOTS, crystals: rw.crystals || 0, stones: rw.stones || 0, mastery, used: rw.used || {} };
  setTimeout(() => Menu.show('end'), 600);
}

/* ---------------- EKONOMI (lokal untuk tamu, server untuk akun) ---------------- */
const Eco = {
  remote() { return typeof Online !== 'undefined' && Online.loggedIn && Online.vaultReady; },
  async act(action, payload) {
    if (typeof Online !== 'undefined' && Online.loggedIn && !Online.vaultReady) throw new Error('Data akun masih dimuat, coba lagi sebentar');
    if (this.remote()) {
      const r = await Online.api('eco.act', { action, payload });
      this.apply(r.vault);
      return r.result;
    }
    const res = SHARED.actions[action](PROFILE.vault, payload || {}, { rng: Math.random, now: Date.now(), server: false, profileXp: PROFILE.xp });
    saveProfile();
    return res;
  },
  apply(vault) {
    const prev = loadoutTypes();
    PROFILE.vault = vault; cleanLoadout(prev);
    Storage.save('btd_profile', PROFILE);
  },
};
function evoStatus(u) {
  const lv = unitLevel(u.xp), v = PROFILE.vault;
  return { done: u.evo, lvOk: lv >= EVO_REQ.level, stonesOk: v.stones >= EVO_REQ.stones, coinsOk: v.coins >= EVO_REQ.coins };
}
