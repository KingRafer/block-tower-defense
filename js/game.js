/* =========================================================
 * Logika inti game: map, wave, tower, musuh, proyektil
 * ========================================================= */
'use strict';

let S = null;                 // state game aktif
let MAP = MAPS[0], DIFF = 'normal';
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
function newGame() {
  const D = DIFFS[DIFF];
  loadMap(MAP);
  S = {
    diff: DIFF, cash: D.cash, hp: D.hp, maxHp: D.hp, wave: 0, maxWave: D.waves,
    state: 'ready', speed: 1, autoSkip: S ? S.autoSkip : false,
    towers: [], enemies: [], projectiles: [], effects: [], texts: [], spawnQ: [],
    waveTime: 0, waveTotal: 0, earned: 0, kills: 0, bossKills: 0, leaked: false,
    placing: null, selected: null, mouse: { x: -99, y: -99, in: false },
    time: 0, autoTimer: 0, recorded: false, nextId: 1, shake: 0,
  };
  UI.refreshAll();
}

/* ---------------- WAVE ---------------- */
function buildWave(n) {
  const q = []; let t = 0;
  const add = (type, count, gap) => { for (let i = 0; i < count; i++) { q.push({ type, t }); t += gap; } t += 0.8; };
  add('normal', Math.floor(4 + n * 1.4), Math.max(0.35, 1.0 - n * 0.02));
  if (n >= ENEMY_INTRO.fast)     add('fast', Math.floor(2 + n * 0.8), 0.45);
  if (n >= ENEMY_INTRO.tank)     add('tank', Math.floor(1 + n * 0.35), 1.1);
  if (n >= ENEMY_INTRO.hidden)   add('hidden', Math.floor(2 + (n - 6) * 0.6), 0.7);
  if (n >= ENEMY_INTRO.regen)    add('regen', Math.floor(1 + (n - 8) * 0.4), 1.0);
  if (n >= ENEMY_INTRO.armored)  add('armored', Math.floor(1 + (n - 11) * 0.5), 1.2);
  if (n >= ENEMY_INTRO.splitter) add('splitter', Math.floor(1 + (n - 13) * 0.4), 1.3);
  if (n >= 18) add('fast', n, 0.25);
  if (n % 10 === 0) add('boss', Math.max(1, Math.floor(n / 10)), 4);
  return q;
}
function wavePreview(n) {
  const counts = {};
  buildWave(n).forEach(s => counts[s.type] = (counts[s.type] || 0) + 1);
  return counts;
}
function startWave() {
  if (!S || S.state !== 'ready' || S.wave >= S.maxWave) return;
  S.wave++; S.state = 'wave'; S.spawnQ = buildWave(S.wave); S.waveTime = 0; S.waveTotal = S.spawnQ.length;
  sfx('wave');
  UI.banner(S.wave % 10 === 0 ? `⚠️ BOSS WAVE ${S.wave}` : `WAVE ${S.wave}`, S.wave % 10 === 0 ? '#e040fb' : '#fff');
  UI.refreshAll();
}
function endWave() {
  const bonus = 100 + S.wave * 30; let farm = 0;
  S.towers.filter(t => t.type === 'farm').forEach(t => {
    const inc = lvl(t).income; farm += inc; addText(t.x, t.y - 26, '+$' + inc, '#ffd54f', 1.2);
  });
  S.cash += bonus + farm; S.earned += bonus + farm;
  if (farm) sfx('coin');
  checkAchievements(summary());
  if (S.wave >= S.maxWave) { S.state = 'win'; finishGame(true); return; }
  S.state = 'ready'; S.autoTimer = 3;
  UI.banner(`Wave selesai! +$${bonus + farm}`, '#ffd54f', 1200);
  UI.refreshAll();
}

/* ---------------- MUSUH ---------------- */
function spawn(type, from) {
  const d = ENEMIES[type], w = Math.max(1, S.wave);
  let hp = d.hp * (1 + w * 0.13 + Math.pow(w, 1.6) * 0.01);
  if (d.boss) hp = d.hp * Math.pow(w / 10, 2.1) * (1 + w * 0.05);
  hp *= DIFFS[S.diff].hpMul;
  const e = {
    id: S.nextId++, type, ...d, reward: Math.max(1, Math.round(d.reward * DIFFS[S.diff].reward)),
    maxHp: hp, hp, x: pathPx[0].x, y: pathPx[0].y, wp: 1, dist: 0,
    slowUntil: 0, slowF: 0, wob: Math.random() * 6, stunT: 6, summonT: 10, hitT: 0,
  };
  if (from) {
    e.x = from.x + (Math.random() - 0.5) * 14; e.y = from.y + (Math.random() - 0.5) * 14;
    e.wp = from.wp; e.dist = from.dist - Math.random() * 10;
  }
  S.enemies.push(e);
  return e;
}
function damage(e, amt, L, src) {
  if (e.dead) return;
  let a = amt;
  if (e.boss && L.bossMul) a *= L.bossMul;
  if (e.armor && !L.pierceArmor) a *= (1 - e.armor);
  a = Math.min(a, e.hp);
  e.hp -= a; e.hitT = 0.1;
  if (src) src.dmg += a;
  if (SET.dmgNum && a >= 0.5) addText(e.x + (Math.random() * 16 - 8), e.y - 22, fmtNum(a), '#fff', 0.5);
  if (e.hp <= 0.001) kill(e, src);
}
function kill(e, src) {
  e.dead = true; S.cash += e.reward; S.earned += e.reward; S.kills++;
  if (src) src.kills++;
  puff(e.x, e.y, e.color, e.boss ? 30 : 8);
  if (e.boss) { S.bossKills++; PROFILE.stats.bossKills++; S.shake = SET.shake ? 10 : 0; sfx('boom'); UI.toast('👑 Boss dikalahkan! +$' + e.reward); checkAchievements(summary()); }
  if (e.split) for (let i = 0; i < 2; i++) spawn(e.split, e);
}

/* ---------------- TOWER ---------------- */
const lvl = t => TOWERS[t.type].levels[t.level];
const countType = type => S.towers.filter(t => t.type === type).length;
const isMax = t => t.level >= TOWERS[t.type].levels.length - 1;

function placeReason(type, c, r) {
  const def = TOWERS[type];
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 'Di luar peta';
  if (pathTiles.has(c + ',' + r)) return 'Tidak bisa di jalur';
  if (c >= 19 && Math.abs(r - exitRow()) <= 1) return 'Area base';
  if (S.towers.some(t => t.c === c && t.r === r)) return 'Sudah ada tower';
  if (deco.some(d => d.c === c && d.r === r)) return 'Terhalang';
  if (countType(type) >= def.limit) return `Batas ${def.name} (${def.limit})`;
  if (S.cash < def.levels[0].cost) return 'Uang tidak cukup';
  return null;
}
function placeTower(type, c, r) {
  const why = placeReason(type, c, r);
  if (why) { sfx('error'); return null; }
  const cost = TOWERS[type].levels[0].cost;
  S.cash -= cost;
  const t = { id: S.nextId++, type, c, r, x: (c + 0.5) * T, y: (r + 0.5) * T, level: 0, cd: 0, angle: -Math.PI / 2,
              spent: cost, target: 'first', recoil: 0, dmg: 0, kills: 0, stunUntil: 0, buff: 0, gh: false };
  S.towers.push(t);
  PROFILE.stats.towersPlaced++;
  sfx('place'); puff(t.x, t.y, '#fff');
  UI.refreshAll();
  return t;
}
function upgradeTower(t) {
  if (isMax(t)) return;
  const cost = TOWERS[t.type].levels[t.level + 1].cost;
  if (S.cash < cost) { sfx('error'); return; }
  S.cash -= cost; t.spent += cost; t.level++;
  sfx('upgrade'); puff(t.x, t.y, '#ffd54f', 12);
  addText(t.x, t.y - 30, lvl(t).name + '!', '#ffd54f', 1);
  if (isMax(t)) { PROFILE.stats.maxed++; checkAchievements(summary()); }
  UI.refreshAll();
}
function sellTower(t) {
  const v = Math.floor(t.spent * SELL_RATE);
  S.cash += v; S.towers = S.towers.filter(x => x !== t);
  if (S.selected === t) S.selected = null;
  sfx('sell'); addText(t.x, t.y, '+$' + v, '#ffd54f'); puff(t.x, t.y, '#aaa');
  UI.refreshAll();
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
    S.projectiles.push({ x: mx, y: my, tx: e.x, ty: e.y, target: e, L, src: t, a: t.angle, big: t.type === 'rocketeer', trail: 0 });
    return;
  }
  sfx(t.type === 'sniper' ? 'snipe' : t.type === 'freezer' ? 'freeze' : 'shoot');
  const col = t.type === 'freezer' ? '#81d4fa' : t.type === 'sniper' ? '#fff59d' : '#ffeb3b';
  S.effects.push({ kind: 'tracer', x1: mx, y1: my, x2: e.x, y2: e.y - 8, life: t.type === 'sniper' ? 0.15 : 0.06, max: 0.15, col, w: t.type === 'sniper' ? 3 : 2 });
  S.effects.push({ kind: 'flash', x: mx, y: my, life: 0.05, max: 0.05 });
  if (L.slow) {
    const f = e.boss ? L.slow / 2 : L.slow;
    e.slowF = Math.max(S.time < e.slowUntil ? e.slowF : 0, f); e.slowUntil = S.time + 2;
  }
  damage(e, L.dmg, L, t);
}
function explode(p) {
  const R = p.L.splash * T;
  S.effects.push({ kind: 'boom', x: p.tx, y: p.ty, r: R, life: 0.35, max: 0.35 });
  sfx('boom');
  for (const e of S.enemies) {
    if (e.dead || (e.hidden && !canSeeHidden(p.src) && e !== p.target)) continue;
    if (Math.hypot(e.x - p.tx, e.y - p.ty) <= R) damage(e, p.L.dmg, p.L, p.src);
  }
}

/* ---------------- BOSS ---------------- */
function bossAbilities(e, dt) {
  e.stunT -= dt; e.summonT -= dt;
  if (e.stunT <= 0) {
    e.stunT = 8;
    const R = 2.6 * T; let hit = 0;
    for (const t of S.towers) if (Math.hypot(t.x - e.x, t.y - e.y) <= R) { t.stunUntil = S.time + 2.5; hit++; }
    S.effects.push({ kind: 'shock', x: e.x, y: e.y, r: R, life: 0.6, max: 0.6 });
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

  // Efek
  for (const f of S.effects) {
    f.life -= dt;
    if (f.kind === 'part') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 400 * dt; }
  }
  S.effects = S.effects.filter(f => f.life > 0);
  S.texts.forEach(x => { x.life -= dt; x.y -= 30 * dt; });
  S.texts = S.texts.filter(x => x.life > 0);

  if (S.hp <= 0 && S.state !== 'lose') { S.hp = 0; S.state = 'lose'; finishGame(false); }
  if (S.state === 'wave' && !S.spawnQ.length && !S.enemies.length) endWave();
}

/* ---------------- EFEK & UTIL ---------------- */
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
  return { wave: S.wave, won: S.state === 'win', hp: S.hp, maxHp: S.maxHp, diff: S.diff, earned: S.earned };
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
function finishGame(won) {
  if (S.recorded) return; S.recorded = true;
  const D = DIFFS[S.diff], key = MAP.id + '_' + S.diff;
  const cleared = won ? S.wave : Math.max(0, S.wave - 1);
  const record = cleared > (PROFILE.best[key] || 0);
  if (record) PROFILE.best[key] = cleared;

  const coins = Math.round((cleared * 12 + (won ? 250 : 0) + S.bossKills * 40) * D.coinMul * (1 + MAP.stars * 0.1));
  const xp = Math.round(cleared * 20 * D.coinMul + S.kills * 0.5 + (won ? 300 : 0));
  const lvBefore = levelFromXp(PROFILE.xp);
  PROFILE.coins += coins; PROFILE.xp += xp;
  const lvAfter = levelFromXp(PROFILE.xp);

  const st = PROFILE.stats;
  if (won) st.wins++;
  st.kills += S.kills; st.cashEarned += S.earned; st.playTime += Math.round(S.time);
  PROFILE.mapsPlayed[MAP.id] = (PROFILE.mapsPlayed[MAP.id] || 0) + 1;
  saveProfile();
  const ach = checkAchievements(summary());

  sfx(won ? 'win' : 'lose');
  Menu.endData = { won, record, coins, xp, levelUp: lvAfter > lvBefore ? lvAfter : 0, ach };
  setTimeout(() => Menu.show('end'), 900);
}
