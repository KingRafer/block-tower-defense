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
    me, mp, players: {}, uxpBy: {}, fxOut: [],
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
  const map = Math.floor(rnd() * MAPS.length), diff = rnd() < 0.6 ? 'normal' : 'hard';
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
function buildWave(n) {
  const q = []; let t = 0;
  const add = (type, count, gap) => { for (let i = 0; i < count; i++) { q.push({ type, t }); t += gap; } t += 0.8; };
  add('normal', Math.floor(4 + n * 1.4), Math.max(0.35, 1.0 - n * 0.02));
  if (S && S.M && S.M.earlyHidden && n >= 2 && n < ENEMY_INTRO.hidden) add('hidden', Math.floor(1 + n * 0.5), 0.8);
  if (n >= ENEMY_INTRO.fast)     add('fast', Math.floor(2 + n * 0.8), 0.45);
  if (n >= ENEMY_INTRO.tank)     add('tank', Math.floor(1 + n * 0.35), 1.1);
  if (n >= ENEMY_INTRO.hidden)   add('hidden', Math.floor(2 + (n - 6) * 0.6), 0.7);
  if (n >= ENEMY_INTRO.regen)    add('regen', Math.floor(1 + (n - 8) * 0.4), 1.0);
  if (n >= ENEMY_INTRO.armored)  add('armored', Math.floor(1 + (n - 11) * 0.5), 1.2);
  if (n >= ENEMY_INTRO.splitter) add('splitter', Math.floor(1 + (n - 13) * 0.4), 1.3);
  if (n >= 18) add('fast', Math.min(n, 60), 0.25);
  if (n > 40) add('armored', Math.floor((n - 40) * 0.8), 0.6);
  if (n % 10 === 0) add('boss', Math.max(1, Math.floor(n / 10)), 4);
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
  UI.banner(bt, bc); fxEmit(['n', bt, bc, 1600, 'wave']);
  UI.refreshAll();
}
/** Bayar bonus akhir wave + pendapatan farm */
function payWave(skipBonus = 0) {
  const bonus = 100 + Math.min(S.wave, 60) * 30; let farm = 0;
  S.towers.filter(t => t.type === 'farm').forEach(t => {
    let inc = lvl(t).income;
    if (lvl(t).perk === 'interest') inc += Math.min(400, Math.floor(pcash(t.owner) * 0.02));
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
  S.state = 'ready'; S.autoTimer = 3;
  UI.banner(`Wave selesai! +$${total}`, '#ffd54f', 1200);
  fxEmit(['n', `Wave selesai! +$${100 + Math.min(S.wave, 60) * 30}`, '#ffd54f', 1200]);
  saveGameState();
  if (S.wave === 1) tip('wave1');
  if (S.wave === 2 && levelFromXp(PROFILE.xp) >= ABILITIES[0].level) tip('ability');
  const next = wavePreview(S.wave + 1);
  if (next.hidden && S.wave + 1 <= ENEMY_INTRO.hidden + 1) tip('hidden');
  if (next.boss) tip('boss');
  UI.refreshAll();
}
/** Skip: mulai wave berikutnya saat semua musuh wave ini sudah keluar */
const canSkip = () => S && S.state === 'wave' && !S.spawnQ.length && S.enemies.length > 0 && S.wave < S.maxWave;
const skipBonusAmt = () => 25 + Math.min(S.wave, 60) * 10;
function skipWave() {
  if (isGuest()) { MP.act({ a: 'skip' }); return; }
  if (!canSkip()) return;
  const b = skipBonusAmt(), total = payWave(b);
  PROFILE.stats.skips++;
  addText(W / 2, 60, `SKIP! +$${total}`, '#ffd54f', 1.2);
  S.state = 'ready'; startWave();
  checkAchievements(summary());
}

/* ---------------- SKILL PEMAIN ---------------- */
const playerLevel = () => levelFromXp(PROFILE.xp);
function useAbility(id) {
  const a = ABILITIES.find(x => x.id === id);
  if (!a || !S || Menu.open || S.state === 'win' || S.state === 'lose') return;
  if (playerLevel() < a.level) { sfx('error'); UI.toast(`🔒 ${a.name} terbuka di level ${a.level}`); return; }
  if (S.abilityCd[id] > 0) { sfx('error'); return; }
  if (id === 'airstrike') {
    S.targeting = S.targeting ? null : 'airstrike'; S.placing = null; S.selected = null;
    sfx('click'); UI.hidePanel(); UI.renderBar(); UI.renderAbilities(); return;
  }
  PROFILE.stats.abilities++;
  if (isGuest()) { MP.act({ a: 'ability', id }); S.abilityCd[id] = a.cd; UI.renderAbilities(); checkAchievements(summary()); return; }
  execAbility(id, S.me);
}
/** Jalankan skill (di host / solo) untuk pemain pid */
function execAbility(id, pid, x, y) {
  const a = ABILITIES.find(q => q.id === id); if (!a) return;
  const cds = pid === S.me ? S.abilityCd : (S.players[pid] && (S.players[pid].abilityCd || (S.players[pid].abilityCd = {})));
  if (!cds || cds[id] > 0) return;
  if (id === 'airstrike') {
    for (let i = 0; i < 3; i++) S.strikes.push({ x: x + (i - 1) * 34, y: y + (i % 2 ? -18 : 18), t: 0.6 + i * 0.25, max: 0.6 + i * 0.25 });
    sfx('rocket');
  }
  if (id === 'freeze') {
    S.freezeT = 4;
    S.enemies.forEach(e => { e.slowUntil = S.time + 4; e.slowF = e.boss ? 0.4 : 0.8; });
    sfx('freeze'); UI.banner('🧊 BADAI ES', '#81d4fa', 1000); fxEmit(['n', '🧊 BADAI ES', '#81d4fa', 1000, 'freeze']);
  }
  if (id === 'repair') {
    const h = Math.round(S.maxHp * 0.3), before = S.hp;
    S.hp = Math.min(S.maxHp, S.hp + h);
    addText(W - 60, (exitRow() - 1) * T, '+' + Math.round(S.hp - before) + ' ❤️', '#69f0ae', 1.5);
    puff(19.5 * T, exitRow() * T, '#69f0ae', 16); sfx('upgrade');
  }
  cds[id] = a.cd;
  if (pid !== S.me) addText(W / 2, 40, `${playerName(pid)}: ${a.icon} ${a.name}`, '#fff', 1.5);
  if (pid === S.me) { checkAchievements(summary()); UI.renderAbilities(); }
}
function airstrikeAt(x, y) {
  S.targeting = null;
  PROFILE.stats.abilities++;
  if (isGuest()) { MP.act({ a: 'ability', id: 'airstrike', x: Math.round(x), y: Math.round(y) }); S.abilityCd.airstrike = ABILITIES[0].cd; UI.renderAbilities(); return; }
  execAbility('airstrike', S.me, x, y);
}
function tickCooldowns(cds, dt) { for (const k in cds) if (cds[k] > 0) cds[k] = Math.max(0, cds[k] - dt); }
function updateStrikes(dt) {
  tickCooldowns(S.abilityCd, dt);
  for (const id in S.players) if (id !== S.me && S.players[id].abilityCd) tickCooldowns(S.players[id].abilityCd, dt);
  S.freezeT = Math.max(0, S.freezeT - dt);
  for (const st of S.strikes) {
    st.t -= dt;
    if (st.t > 0) continue;
    st.done = true;
    const R = 1.4 * T, dmg = 40 + Math.min(S.wave, 80) * 18;
    S.effects.push({ kind: 'boom', x: st.x, y: st.y, r: R, life: 0.45, max: 0.45 }); fxEmit(['b', st.x | 0, st.y | 0, R | 0, 0.45]);
    if (SET.shake) S.shake = 6; sfx('boom');
    for (const e of S.enemies) if (!e.dead && Math.hypot(e.x - st.x, e.y - st.y) <= R) damage(e, dmg, { pierceArmor: true }, null);
  }
  S.strikes = S.strikes.filter(st => !st.done);
}

/* ---------------- MUSUH ---------------- */
function spawn(type, from) {
  const d = ENEMIES[type], w = Math.max(1, S.wave);
  let hp = d.hp * (1 + w * 0.13 + Math.pow(w, 1.6) * 0.01);
  if (d.boss) hp = d.hp * Math.pow(w / 10, 2.1) * (1 + w * 0.05);
  hp *= DIFFS[S.diff].hpMul * S.M.hpMul;
  const e = {
    id: S.nextId++, type, ...d, spd: d.spd * S.M.spdMul, reward: Math.max(1, Math.round(d.reward * DIFFS[S.diff].reward * S.M.rewardMul)),
    maxHp: hp, hp, x: pathPx[0].x, y: pathPx[0].y, wp: 1, dist: 0,
    slowUntil: 0, slowF: 0, wob: Math.random() * 6, stunT: 6, summonT: 10, hitT: 0,
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
  if (e.boss && L.bossMul) a *= L.bossMul;
  if (e.armor && !L.pierceArmor) a *= (1 - e.armor);
  a = Math.min(a, e.hp);
  e.hp -= a; e.hitT = 0.1;
  if (src) { src.dmg += a; addUxp(src.owner, src.type, a / 60); }
  if (SET.dmgNum && a >= 0.5 && !quiet) addText(e.x + (Math.random() * 16 - 8), e.y - 22, fmtNum(a), '#fff', 0.5);
  if (e.hp <= 0.001) kill(e, src);
}
function kill(e, src) {
  e.dead = true;
  const rw = Math.round(e.reward * (src ? lvl(src).rewardMul : 1));
  addCashAll(rw); S.kills++;
  if (src) { src.kills++; addUxp(src.owner, src.type, 1); }
  puff(e.x, e.y, e.color, e.boss ? 30 : 8);
  if (e.boss) { S.bossKills++; PROFILE.stats.bossKills++; S.shake = SET.shake ? 10 : 0; sfx('boom'); UI.toast('👑 Boss dikalahkan! +$' + e.reward); fxEmit(['k']); checkAchievements(summary()); }
  if (e.split) for (let i = 0; i < 2; i++) spawn(e.split, e);
}

/* ---------------- STATISTIK UNIT (mastery + trait + evolusi) ---------------- */
const unitOf = type => PROFILE.units[type] || (PROFILE.units[type] = { xp: 0, trait: null, evo: false });
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
           L: computeL(type, 0, u), evo: !!u.evo, trait: u.trait, shots: 0, ramp: 0, owner: pid };
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
  sfx('place'); puff(t.x, t.y, '#fff'); fxEmit(['p', t.x | 0, t.y | 0, '#fff', 8, 'place']);
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
  sfx('upgrade'); puff(t.x, t.y, '#ffd54f', 12); fxEmit(['p', t.x | 0, t.y | 0, '#ffd54f', 12, 'upgrade']);
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

function canSeeHidden(t) { return !!(lvl(t).hidden || t.gh); }
function pickTarget(t, L) {
  const R = L.range * T, seeHidden = canSeeHidden(t);
  let best = null, bv = -Infinity;
  for (const e of S.enemies) {
    if (e.dead || (e.hidden && !seeHidden)) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y);
    if (d > R) continue;
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
  if (t.type === 'demoman' || t.type === 'rocketeer') {
    sfx('rocket');
    const n = L.perk === 'double' ? 2 : 1;
    for (let i = 0; i < n; i++)
      S.projectiles.push({ x: mx + i * 8, y: my - i * 10, tx: e.x, ty: e.y, target: e, L, src: t, a: t.angle, big: t.type === 'rocketeer', trail: 0 });
    return;
  }
  sfx(t.type === 'sniper' ? 'snipe' : t.type === 'freezer' ? 'freeze' : 'shoot');
  const col = t.type === 'freezer' ? '#81d4fa' : t.type === 'sniper' ? '#fff59d' : '#ffeb3b';
  S.effects.push({ kind: 'tracer', x1: mx, y1: my, x2: e.x, y2: e.y - 8, life: t.type === 'sniper' ? 0.15 : 0.06, max: 0.15, col, w: t.type === 'sniper' ? 3 : 2 });
  fxEmit(['t', mx | 0, my | 0, e.x | 0, (e.y - 8) | 0, col, t.type === 'sniper' ? 3 : 2, t.type === 'sniper' ? 0.15 : 0.06, t.type]);
  S.effects.push({ kind: 'flash', x: mx, y: my, life: 0.05, max: 0.05 });
  if (L.slow) {
    const f = e.boss ? L.slow / 2 : L.slow;
    e.slowF = Math.max(S.time < e.slowUntil ? e.slowF : 0, f); e.slowUntil = S.time + 2;
  }
  // Perk evolusi
  let dmg = L.dmg;
  if (L.perk === 'triple' && ++t.shots % 4 === 0) { dmg *= 3; addText(e.x, e.y - 34, '×3', '#ffeb3b', 0.6); }
  if (L.perk === 'crit' && Math.random() < 0.25) { dmg *= 3; addText(e.x, e.y - 34, 'CRIT!', '#ff5252', 0.7); }
  if (L.perk === 'ramp') { t.ramp = Math.min(0.8, t.ramp + 0.04); dmg *= 1 + t.ramp; }
  if (L.perk === 'freeze' && !e.boss && Math.random() < 0.2) { e.frozenUntil = S.time + 1; addText(e.x, e.y - 34, '❄', '#81d4fa', 0.6); }
  damage(e, dmg, L, t);
}
function explode(p) {
  const R = p.L.splash * T;
  S.effects.push({ kind: 'boom', x: p.tx, y: p.ty, r: R, life: 0.35, max: 0.35 }); fxEmit(['b', p.tx | 0, p.ty | 0, R | 0, 0.35]);
  sfx('boom');
  for (const e of S.enemies) {
    if (e.dead || (e.hidden && !canSeeHidden(p.src) && e !== p.target)) continue;
    if (Math.hypot(e.x - p.tx, e.y - p.ty) <= R) {
      damage(e, p.L.dmg, p.L, p.src);
      if (p.L.perk === 'burn' && !e.dead) e.burn = { dps: p.L.dmg * 0.3, until: S.time + 3, src: p.src };
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
  if (S.state === 'ready' && S.autoSkip && S.wave > 0) { S.autoTimer -= dt; if (S.autoTimer <= 0) startWave(); }
  if (S.state === 'wave') {
    S.waveTime += dt;
    while (S.spawnQ.length && S.spawnQ[0].t <= S.waveTime) spawn(S.spawnQ.shift().type);
  }

  // Musuh
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    if (e.boss) bossAbilities(e, dt);
    e.hitT = Math.max(0, e.hitT - dt);
    if (e.burn && S.time < e.burn.until) { damage(e, e.burn.dps * dt, e.burn.src.L, e.burn.src, true); if (e.dead) continue; }
    if (e.frozenUntil && S.time < e.frozenUntil) continue;
    let move = e.spd * T * (S.time < e.slowUntil ? (1 - e.slowF) : 1) * dt;
    while (move > 0 && e.wp < pathPx.length) {
      const p = pathPx[e.wp], dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      if (d <= move) { e.x = p.x; e.y = p.y; move -= d; e.dist += d; e.wp++; }
      else { e.x += dx / d * move; e.y += dy / d * move; e.dist += move; e.dir = Math.atan2(dy, dx); move = 0; }
    }
    if (e.wp >= pathPx.length) {
      e.dead = true; S.leaked = true;
      const dmg = e.boss ? 9999 : Math.ceil(e.hp);
      S.hp -= dmg; sfx('leak'); if (SET.shake) S.shake = 8;
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
    const tg = pickTarget(t, L);
    if (!tg && t.ramp) t.ramp = Math.max(0, t.ramp - dt * 0.5);
    if (tg) {
      t.angle = Math.atan2(tg.y - t.y, tg.x - t.x);
      if (t.cd <= 0) { t.cd = L.rate * (1 - t.buff); t.recoil = 1; fire(t, L, tg); }
    }
  }

  // Proyektil
  for (const p of S.projectiles) {
    if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), mv = (p.big ? 7 : 9) * T * dt;
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
    if (a.test(PROFILE, g)) { PROFILE.achievements.push(a.id); PROFILE.coins += a.coins; got.push(a); }
  }
  got.forEach((a, i) => setTimeout(() => { sfx('achieve'); UI.toast(`🏅 ${a.name} — +${a.coins} koin`, 'gold'); }, i * 700));
  if (got.length) saveProfile();
  return got;
}
function bestKey(mapId, diff, mode) { return mapId + '_' + diff + (mode === 'endless' ? '_endless' : ''); }
function calcScore(cleared, won) {
  const mul = DIFFS[S.diff].coinMul * (1 + MAP.stars * 0.1) * (S.daily ? 1.2 : 1);
  return Math.round((cleared * 500 + S.kills * 5 + Math.max(0, S.hp) * 10 + S.bossKills * 1000 + (won ? 5000 : 0)) * mul);
}
function finishGame(won) {
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

  let coins = Math.round((cleared * 12 + (won ? 250 : 0) + S.bossKills * 40) * D.coinMul * (1 + MAP.stars * 0.1));
  let dailyReward = 0;
  if (S.daily) {
    const ds = dailyState();
    ds.best = Math.max(ds.best, cleared);
    if (won && !ds.won) { ds.won = true; dailyReward = DAILY_REWARD; coins += dailyReward; PROFILE.stats.dailyWins++; }
  }
  const xp = Math.round(cleared * 20 * D.coinMul + S.kills * 0.5 + (won ? 300 : 0));

  // Material
  const crystals = S.bossKills + Math.floor(cleared / 10) + (won ? 2 : 0) + (S.daily && won ? 3 : 0);
  const stones = (won && S.diff === 'hard' ? 1 : 0) + (S.daily && won ? 1 : 0) + (S.mode === 'endless' && cleared >= 30 ? 1 : 0) + (S.bossKills >= 3 ? 1 : 0);
  PROFILE.crystals += crystals; PROFILE.stones += stones;

  // Mastery tower
  const mastery = [];
  for (const [type, gain] of Object.entries(S.uxp)) {
    const u = unitOf(type), before = unitLevel(u.xp);
    u.xp += Math.round(gain);
    mastery.push({ type, gain: Math.round(gain), lv: unitLevel(u.xp), up: unitLevel(u.xp) > before });
  }
  mastery.sort((a, b) => b.gain - a.gain);
  const lvBefore = levelFromXp(PROFILE.xp);
  PROFILE.coins += coins; PROFILE.xp += xp;
  const lvAfter = levelFromXp(PROFILE.xp);

  // Papan skor lokal (15 terbaik)
  const score = calcScore(cleared, won);
  const run = { score, map: MAP.id, diff: S.diff, mode: S.mode, daily: !!S.daily, coop: isMP(), wave: S.wave, won, kills: S.kills, date: todayStr(), id: Date.now() };
  if (typeof Online !== 'undefined') Online.submitRun({ score, wave: S.wave, map: MAP.id, diff: S.diff, won, mode: isMP() ? 'coop' : S.daily ? 'daily' : S.mode });
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
  const unlockedSkill = ABILITIES.find(a => a.level > lvBefore && a.level <= lvAfter);
  Menu.endData = { won, record, coins, xp, levelUp: lvAfter > lvBefore ? lvAfter : 0, ach, score, rank, dailyReward, unlockedSkill, crystals, stones, mastery };
  setTimeout(() => Menu.show('end'), 900);
}

/* ---------------- TRAIT & EVOLUSI ---------------- */
function rollTraitId() {
  const total = Object.values(TRAITS).reduce((a, t) => a + t.w, 0);
  let r = Math.random() * total;
  for (const [id, t] of Object.entries(TRAITS)) { r -= t.w; if (r <= 0) return id; }
  return 'kuat1';
}
function rollTrait(type) {
  if (PROFILE.crystals < 1 || !PROFILE.unlocked.includes(type)) return null;
  PROFILE.crystals--; PROFILE.stats.rolls++;
  const id = rollTraitId();
  unitOf(type).trait = id;
  saveProfile(); checkAchievements(null);
  return id;
}
function evoStatus(type) {
  const u = unitOf(type), lv = unitLevel(u.xp);
  return { owned: PROFILE.unlocked.includes(type), done: u.evo, lvOk: lv >= EVO_REQ.level,
           stonesOk: PROFILE.stones >= EVO_REQ.stones, coinsOk: PROFILE.coins >= EVO_REQ.coins };
}
function evolve(type) {
  const st = evoStatus(type);
  if (!st.owned || st.done || !st.lvOk || !st.stonesOk || !st.coinsOk) return false;
  PROFILE.stones -= EVO_REQ.stones; PROFILE.coins -= EVO_REQ.coins; unitOf(type).evo = true;
  saveProfile(); checkAchievements(null);
  return true;
}
