/* =========================================================
 * Block Tower Defense — logika ekonomi bersama
 * Dipakai di browser (window.SHARED) dan server (require).
 * Semua aksi ekonomi (gacha, trait, evolusi, toko, hadiah)
 * berjalan lewat fungsi yang sama di kedua sisi.
 * ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SHARED = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- KELANGKAAN ---------------- */
  const RARITY = {
    common:    { name: 'Biasa',      color: '#9e9e9e', rank: 0 },
    rare:      { name: 'Langka',     color: '#42a5f5', rank: 1 },
    epic:      { name: 'Epik',       color: '#ab47bc', rank: 2 },
    legendary: { name: 'Legendaris', color: '#ffb300', rank: 3 },
    mythic:    { name: 'Mitos',      color: '#ff1744', rank: 4 },
  };
  const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

  /* ---------------- UNIT ---------------- */
  const UNIT_RARITY = {
    scout: 'common', sniper: 'common', farm: 'common', pistol: 'common',
    demoman: 'rare', freezer: 'rare', cannon: 'rare', flamer: 'rare', mortar: 'rare',
    minigun: 'epic', commander: 'epic', tesla: 'epic', laser: 'epic', poison: 'epic',
    rocketeer: 'legendary', railgun: 'legendary', warden: 'legendary',
    nuke: 'mythic', dragon: 'mythic',
  };
  const UNIT_TYPES = Object.keys(UNIT_RARITY);
  const STARTER_UNITS = ['scout', 'sniper', 'demoman', 'farm'];

  const UNIT_MAX_LV = 20;
  const unitXpFor = lv => 40 * (lv - 1) * (lv - 1);
  const unitLevel = xp => Math.min(UNIT_MAX_LV, 1 + Math.floor(Math.sqrt((xp || 0) / 40)));
  const MASTERY_BONUS = 0.02;

  /* ---------------- TRAIT ---------------- */
  const TRAITS = {
    kuat1:     { name: 'Kuat I',       icon: '💪', rarity: 'common',    w: 20,  dmgMul: 1.05,  desc: '+5% damage' },
    cepat1:    { name: 'Cepat I',      icon: '⚡', rarity: 'common',    w: 20,  rateMul: 0.95, desc: 'Cooldown −5%' },
    jangkau1:  { name: 'Jangkauan I',  icon: '🎯', rarity: 'common',    w: 20,  rangeMul: 1.05, desc: '+5% range' },
    kuat2:     { name: 'Kuat II',      icon: '💪', rarity: 'rare',      w: 8,   dmgMul: 1.12,  desc: '+12% damage' },
    cepat2:    { name: 'Cepat II',     icon: '⚡', rarity: 'rare',      w: 8,   rateMul: 0.9,  desc: 'Cooldown −10%' },
    jangkau2:  { name: 'Jangkauan II', icon: '🎯', rarity: 'rare',      w: 5,   rangeMul: 1.12, desc: '+12% range' },
    hemat:     { name: 'Hemat',        icon: '🏷️', rarity: 'rare',      w: 4,   costMul: 0.85, desc: 'Harga pasang & upgrade −15%' },
    kuat3:     { name: 'Kuat III',     icon: '💪', rarity: 'epic',      w: 3,   dmgMul: 1.2,   desc: '+20% damage' },
    mataelang: { name: 'Mata Elang',   icon: '👁️', rarity: 'epic',      w: 3,   rangeMul: 1.08, hidden: true, desc: 'Deteksi hidden sejak Lv 0, +8% range' },
    penembus:  { name: 'Penembus',     icon: '🛡️', rarity: 'epic',      w: 2.5, dmgMul: 1.08, pierce: true, desc: 'Tembus armor, +8% damage' },
    pemburu:   { name: 'Pemburu Raja', icon: '👑', rarity: 'epic',      w: 2.5, bossMul: 1.35, desc: '+35% damage ke boss' },
    midas:     { name: 'Midas',        icon: '💰', rarity: 'legendary', w: 1.5, dmgMul: 1.1, rewardMul: 1.3, desc: 'Hadiah kill +30%, +10% damage' },
    berserker: { name: 'Berserker',    icon: '🔥', rarity: 'legendary', w: 2,   dmgMul: 1.25, rateMul: 0.85, desc: '+25% damage, cooldown −15%' },
    dewa:      { name: 'Dewa Perang',  icon: '🌟', rarity: 'mythic',    w: 0.5, dmgMul: 1.4, rateMul: 0.8, rangeMul: 1.15, hidden: true, desc: '+40% damage, cooldown −20%, +15% range, deteksi hidden' },
  };
  const EVO_REQ = { level: 10, stones: 3, coins: 1000 };

  /* ---------------- MATERIAL, SKIN, SKILL, TOP UP ---------------- */
  const MATERIALS = {
    crystals: { name: 'Kristal Trait', icon: '✨', price: 200, desc: 'Dipakai untuk roll trait unit.' },
    stones:   { name: 'Batu Evolusi',  icon: '🔮', price: 900, desc: 'Dipakai untuk evolusi unit.' },
  };
  /* Skin kosmetik untuk unit (dibeli dengan Permata) */
  const SKINS = {
    default: { name: 'Standar',   price: 0,   icon: '⬜' },
    gold:    { name: 'Emas',      price: 300, icon: '🥇', body: '#ffc107', head: '#ffe082', gun: '#b8860b', acc: 'crown', glow: '#ffd54f' },
    neon:    { name: 'Neon',      price: 250, icon: '💡', body: '#00e5ff', head: '#e0f7fa', gun: '#ff00e5', acc: 'band',  glow: '#00e5ff' },
    shadow:  { name: 'Bayangan',  price: 250, icon: '🌑', body: '#263238', head: '#455a64', gun: '#7c4dff', acc: 'hood',  glow: '#7c4dff' },
    ice:     { name: 'Kristal Es', price: 200, icon: '❄️', body: '#81d4fa', head: '#e1f5fe', gun: '#0288d1', acc: 'spike', glow: '#b3e5fc' },
    lava:    { name: 'Lava',      price: 200, icon: '🌋', body: '#bf360c', head: '#ff7043', gun: '#3e2723', acc: 'horn',  glow: '#ff6d00' },
    santa:   { name: 'Santa',     price: 350, icon: '🎅', body: '#d32f2f', head: '#ffe0b2', gun: '#2e7d32', acc: 'santa' },
    ninja:   { name: 'Ninja',     price: 300, icon: '🥷', body: '#212121', head: '#212121', gun: '#c62828', acc: 'band',  eyes: '#fff' },
    robot:   { name: 'Robot',     price: 400, icon: '🤖', body: '#90a4ae', head: '#cfd8dc', gun: '#37474f', acc: 'antenna', eyes: '#00e676' },
    rainbow: { name: 'Pelangi',   price: 600, icon: '🌈', rainbow: true, acc: 'halo', glow: '#ffffff' },
  };
  /* Mata uang:
   *  diamonds 💎 — gratis dari bermain (Summon biasa, skill premium, trading)
   *  gems 💠     — hanya dari top up (Lucky Summon, skin) */
  const CURRENCY = {
    diamonds: { name: 'Diamond', icon: '💎' }, gems: { name: 'Permata', icon: '💠' },
    coins: { name: 'Koin', icon: '🪙' }, crystals: { name: 'Kristal Trait', icon: '✨' }, stones: { name: 'Batu Evolusi', icon: '🔮' },
  };
  /* Paket penggunaan skill. currency: 'coins' atau 'diamonds' */
  const SKILL_SHOP = {
    airstrike: { uses: 3, price: 300, currency: 'coins' },
    freeze:    { uses: 3, price: 300, currency: 'coins' },
    repair:    { uses: 3, price: 400, currency: 'coins' },
    cash:      { uses: 3, price: 250, currency: 'coins' },
    radar:     { uses: 3, price: 350, currency: 'coins' },
    overclock: { uses: 3, price: 500, currency: 'coins' },
    shield:    { uses: 3, price: 600, currency: 'coins' },
    meteor:    { uses: 3, price: 40,  currency: 'diamonds' },
    rewind:    { uses: 3, price: 40,  currency: 'diamonds' },
    storm:     { uses: 3, price: 60,  currency: 'diamonds' },
  };
  const STARTER_SKILLS = { airstrike: 2, freeze: 2, repair: 1 };
  /* Harga membuka skill (sekali bayar, lalu bebas dipakai tanpa batas) */
  const SKILL_PRICES = {
    airstrike: null, freeze: null, repair: null,          // gratis sejak awal
    cash: { coins: 800 }, radar: { coins: 1200 }, overclock: { coins: 2000 }, shield: { coins: 2500 },
    meteor: { diamonds: 300 }, rewind: { diamonds: 300 }, storm: { diamonds: 500 },
  };
  const FREE_SKILLS = Object.keys(SKILL_PRICES).filter(k => !SKILL_PRICES[k]);

  /* Pengaturan global yang bisa diubah dari panel developer */
  const DEFAULTS = {};
  const EVENT = { rewardMul: 1, diamondMul: 1, featured: null };
  /* Paket top up Permata (harga dalam Rupiah) */
  const TOPUP = [
    { id: 'p60',   gems: 60,   bonus: 0,   price: 15000 },
    { id: 'p330',  gems: 300,  bonus: 30,  price: 75000 },
    { id: 'p1090', gems: 980,  bonus: 110, price: 229000, tag: 'Populer' },
    { id: 'p2240', gems: 1980, bonus: 260, price: 449000 },
    { id: 'p5600', gems: 4880, bonus: 720, price: 1099000, tag: 'Terbaik' },
  ];

  /* ---------------- GACHA ---------------- */
  const GACHA = {
    cost1: 50, cost10: 450, pity: 60,
    rates: { common: 55, rare: 30, epic: 11, legendary: 3.5, mythic: 0.5 },
    banners: {
      std:   { name: 'Banner Standar', currency: 'diamonds', desc: 'Semua unit tersedia. Pakai 💎 Diamond yang didapat dari bermain.' },
      feat:  { name: 'Banner Unggulan', currency: 'diamonds', desc: 'Peluang 50% unit unggulan saat dapat Legendaris/Mitos. Berganti setiap hari.' },
      lucky: { name: '🍀 Lucky Summon', currency: 'gems', desc: 'Pakai 💠 Permata (top up). Peluang Legendaris & Mitos jauh lebih tinggi, pity lebih cepat, 10× menjamin Legendaris.' },
    },
  };
  /* Lucky Summon (Permata hasil top up) */
  const LUCKY = { cost1: 10, cost10: 90, pity: 30, rates: { common: 25, rare: 37, epic: 27, legendary: 9, mythic: 2 } };
  const unitsOfRarity = r => UNIT_TYPES.filter(t => UNIT_RARITY[t] === r);
  function dayStr(now) { const d = new Date(now + 7 * 3600e3); return d.toISOString().slice(0, 10); } // zona WIB
  function featuredUnit(now) {
    if (EVENT.featured && UNIT_RARITY[EVENT.featured]) return EVENT.featured;
    const pool = [...unitsOfRarity('legendary'), ...unitsOfRarity('mythic')];
    const s = dayStr(now).split('-').reduce((a, x) => a * 31 + +x, 7);
    return pool[s % pool.length];
  }
  const SCRAP = { common: { coins: 15 }, rare: { coins: 40 }, epic: { coins: 100, crystals: 1 }, legendary: { coins: 300, stones: 1 }, mythic: { coins: 1000, stones: 3 } };

  /* ---------------- HADIAH ---------------- */
  const MAP_STARS = { grass: 1, desert: 2, snow: 3, lava: 4 };
  const DIFF_INFO = { easy: { waves: 20, coinMul: 0.6 }, normal: { waves: 30, coinMul: 1.0 }, hard: { waves: 40, coinMul: 1.8 } };
  const DAILY_WAVES = 20, DAILY_REWARD = 500;
  const ACH_REWARDS = {
    first_game: 50, first_win: 200, kills_100: 100, kills_2000: 400, boss_1: 150, boss_10: 500, wave_20: 150, max_tower: 150,
    towers_100: 200, perfect: 500, hard_win: 1000, all_maps: 800, collector: 300, rich: 300, endless_40: 800, daily_1: 300,
    skills_25: 200, skipper: 150, trait_1: 50, trait_leg: 400, evo_1: 300, mastery_20: 500, gacha_10: 150, trade_1: 200,
  };
  const ACH_DIAMONDS = 30;
  const DAILY_LOGIN = [40, 40, 60, 60, 80, 100, 200];   // Diamond hari ke-1..7 (berulang)

  /* ---------------- VAULT ---------------- */
  function newVault(now, rng) {
    const v = { coins: 0, gems: 0, diamonds: 300, crystals: 3, stones: 0, units: [], skins: ['default'], skillUses: { ...STARTER_SKILLS }, skills: [...FREE_SKILLS],
      pity: { std: 0, feat: 0, lucky: 0 }, achClaimed: [], daily: { day: '', streak: 0 }, dailyWon: '', lastClaimAt: 0, pulls: 0, missions: null, pass: null };
    STARTER_UNITS.forEach(t => v.units.push(makeUnit(t, rng, now, { tradable: false })));
    return v;
  }
  /** Lengkapi vault lama (sebelum ada Diamond / Lucky) */
  function fixVault(v) {
    if (v.diamonds == null) v.diamonds = 300;
    if (!Array.isArray(v.skills)) v.skills = [...new Set([...FREE_SKILLS, ...Object.keys(v.skillUses || {}).filter(k => v.skillUses[k] > 0)])];
    v.pity = { std: 0, feat: 0, lucky: 0, ...(v.pity || {}) };
    if (!v.missions || typeof v.missions !== 'object') v.missions = {};
    if (v.pass && typeof v.pass !== 'object') v.pass = null;
    return v;
  }
  function makeUnit(type, rng, now, extra) {
    const id = 'u' + Math.floor(now).toString(36) + Math.floor(rng() * 36 ** 6).toString(36).padStart(6, '0');
    return { id, type, trait: null, evo: false, xp: 0, skin: 'default', lock: false, tradable: true, at: now, ...(extra || {}) };
  }
  const err = (msg, status = 400) => Object.assign(new Error(msg), { status });
  const findUnit = (v, id) => { const u = v.units.find(x => x.id === id); if (!u) throw err('Unit tidak ditemukan', 404); return u; };
  function pay(v, currency, amount) {
    if ((v[currency] || 0) < amount) throw err((CURRENCY[currency] ? CURRENCY[currency].name : 'Material') + ' tidak cukup');
    v[currency] -= amount;
  }
  function weighted(rng, table) {
    const total = Object.values(table).reduce((a, w) => a + w, 0);
    let r = rng() * total;
    for (const [k, w] of Object.entries(table)) { r -= w; if (r <= 0) return k; }
    return Object.keys(table)[0];
  }
  function rewardsFor(res) {
    const D = DIFF_INFO[res.diff] || DIFF_INFO.normal, stars = MAP_STARS[res.map] || 1;
    const c = res.cleared, won = res.won, boss = res.bossKills;
    return {
      coins: Math.round((c * 12 + (won ? 250 : 0) + boss * 40) * D.coinMul * (1 + stars * 0.1) * EVENT.rewardMul) + (res.dailyFirstWin ? DAILY_REWARD : 0),
      crystals: boss + Math.floor(c / 10) + (won ? 2 : 0) + (res.daily && won ? 3 : 0),
      stones: (won && res.diff === 'hard' ? 1 : 0) + (res.daily && won ? 1 : 0) + (res.mode === 'endless' && c >= 30 ? 1 : 0) + (boss >= 3 ? 1 : 0),
      diamonds: Math.round((c * 3 + boss * 15 + (won ? 60 : 0) + (res.daily && won ? 50 : 0)) * EVENT.diamondMul),
    };
  }


  /* ---------------- MISI HARIAN & MINGGUAN ---------------- */
  // stat: games, waves, bosses, wins, hardWins, summons
  const MISSIONS = {
    daily: [
      { id: 'd_play',   name: 'Mainkan 3 permainan',   stat: 'games',   target: 3,  reward: { diamonds: 30, pxp: 150 } },
      { id: 'd_wave',   name: 'Selesaikan 25 wave',    stat: 'waves',   target: 25, reward: { coins: 300, pxp: 150 } },
      { id: 'd_boss',   name: 'Kalahkan 2 boss',       stat: 'bosses',  target: 2,  reward: { diamonds: 40, pxp: 200 } },
      { id: 'd_win',    name: 'Menangkan 1 permainan', stat: 'wins',    target: 1,  reward: { diamonds: 50, pxp: 250 } },
      { id: 'd_summon', name: 'Summon 5 kali',         stat: 'summons', target: 5,  reward: { crystals: 2, pxp: 100 } },
      { id: 'd_all',    name: 'Selesaikan semua misi harian', stat: 'dailyDone', target: 5, reward: { diamonds: 60, stones: 1, pxp: 300 } },
    ],
    weekly: [
      { id: 'w_win',    name: 'Menang 10 kali',             stat: 'wins',     target: 10,  reward: { diamonds: 200, stones: 2, pxp: 800 } },
      { id: 'w_wave',   name: 'Selesaikan 300 wave',        stat: 'waves',    target: 300, reward: { coins: 3000, pxp: 800 } },
      { id: 'w_boss',   name: 'Kalahkan 25 boss',           stat: 'bosses',   target: 25,  reward: { diamonds: 250, pxp: 800 } },
      { id: 'w_hard',   name: 'Menang 3 kali di Sulit',     stat: 'hardWins', target: 3,   reward: { stones: 3, crystals: 5, pxp: 1000 } },
      { id: 'w_summon', name: 'Summon 40 kali',             stat: 'summons',  target: 40,  reward: { diamonds: 150, pxp: 600 } },
    ],
  };
  function weekStr(now) { const d = new Date(now + 7 * 3600e3), dow = (d.getUTCDay() + 6) % 7; return dayStr(now - dow * 864e5); }
  function rollMissions(v, now) {
    const m = v.missions || (v.missions = {}), day = dayStr(now), wk = weekStr(now);
    if (m.day !== day) { m.day = day; m.d = {}; m.dc = []; }
    if (m.week !== wk) { m.week = wk; m.w = {}; m.wc = []; }
    return m;
  }
  function bumpMissions(v, now, inc) {
    const m = rollMissions(v, now);
    for (const [k, n] of Object.entries(inc)) if (n > 0) { m.d[k] = (m.d[k] || 0) + n; m.w[k] = (m.w[k] || 0) + n; }
  }
  function missionProgress(v, now, kind, def) {
    const m = rollMissions(v, now);
    if (def.stat === 'dailyDone') return m.dc.filter(id => id !== 'd_all').length;
    return (kind === 'daily' ? m.d : m.w)[def.stat] || 0;
  }

  /* ---------------- SEASON PASS (reset tiap bulan) ---------------- */
  const PASS = { tiers: 30, xpPerTier: 600, premiumCost: 300 /* 💠 */ };
  const seasonStr = now => dayStr(now).slice(0, 7);
  function seasonName(season) {
    const [y, mo] = season.split('-').map(Number);
    return 'Season ' + ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][mo - 1] + ' ' + y;
  }
  function passReward(track, tier, season) {
    const idx = season.split('-').reduce((a, x) => a * 13 + +x, 3);
    const skins = Object.keys(SKINS).filter(k => k !== 'default'), mythics = unitsOfRarity('mythic'), epics = unitsOfRarity('epic');
    if (track === 'f') {
      if (tier === 30) return { unit: epics[idx % epics.length], diamonds: 150 };
      if (tier % 10 === 0) return { stones: 2, diamonds: 100 };
      if (tier % 5 === 0) return { diamonds: 100 };
      return [{ coins: 400 }, { diamonds: 30 }, { crystals: 1 }][tier % 3];
    }
    if (tier === 30) return { unit: mythics[idx % mythics.length], premiumUnit: true };
    if (tier === 15) return { skin: skins[idx % skins.length] };
    if (tier % 5 === 0) return { diamonds: 200, stones: 1 };
    return [{ diamonds: 60 }, { coins: 800 }, { crystals: 2, diamonds: 30 }][tier % 3];
  }
  function rollPass(v, now) {
    const s = seasonStr(now);
    if (!v.pass || v.pass.season !== s) v.pass = { season: s, xp: 0, premium: false, f: [], p: [] };
    return v.pass;
  }
  const passTier = p => Math.min(PASS.tiers, Math.floor(p.xp / PASS.xpPerTier));
  function giveReward(v, rw, rng, now) {
    const got = {};
    for (const k of ['coins', 'diamonds', 'gems', 'crystals', 'stones']) if (rw[k]) { v[k] = (v[k] || 0) + rw[k]; got[k] = rw[k]; }
    if (rw.skin) { if (v.skins.includes(rw.skin)) { v.diamonds += 300; got.diamonds = (got.diamonds || 0) + 300; got.skinDup = rw.skin; } else { v.skins.push(rw.skin); got.skin = rw.skin; } }
    if (rw.unit && UNIT_RARITY[rw.unit]) { const u = makeUnit(rw.unit, rng || Math.random, now, { tradable: !!rw.premiumUnit }); v.units.push(u); got.unit = u; }
    return got;
  }

  /* ---------------- AKSI ---------------- */
  /* Setiap aksi: (vault, payload, ctx{rng, now, server}) → hasil. Vault diubah langsung. */
  const actions = {
    summon(v, p, ctx) {
      const banner = GACHA.banners[p.banner] ? p.banner : 'std', n = p.count === 10 ? 10 : 1;
      const lucky = banner === 'lucky', cfg = lucky ? LUCKY : GACHA;
      pay(v, lucky ? 'gems' : 'diamonds', n === 10 ? cfg.cost10 : cfg.cost1);
      bumpMissions(v, ctx.now, { summons: n });
      const featured = featuredUnit(ctx.now), out = [];
      for (let i = 0; i < n; i++) {
        v.pity[banner] = (v.pity[banner] || 0) + 1;
        let r = weighted(ctx.rng, cfg.rates);
        if (v.pity[banner] >= cfg.pity && RARITY[r].rank < 3) r = 'legendary';
        const minLast = lucky ? 3 : 2;   // 10×: Lucky menjamin Legendaris, biasa menjamin Epik
        if (n === 10 && i === 9 && !out.some(u => RARITY[UNIT_RARITY[u.type]].rank >= minLast) && RARITY[r].rank < minLast) { r = lucky ? 'legendary' : 'epic'; if (lucky) v.pity[banner] = 0; }
        if (RARITY[r].rank >= 3) v.pity[banner] = 0;
        let pool = unitsOfRarity(r), type = pool[Math.floor(ctx.rng() * pool.length)];
        if (banner === 'feat' && RARITY[r].rank >= 3 && ctx.rng() < 0.5) type = featured;
        const u = makeUnit(type, ctx.rng, ctx.now + i);
        v.units.push(u); out.push(u);
      }
      v.pulls = (v.pulls || 0) + n;
      return { units: out, pity: v.pity[banner] };
    },
    rollTrait(v, p, ctx) {
      const u = findUnit(v, p.unitId);
      pay(v, 'crystals', 1);
      const id = weighted(ctx.rng, Object.fromEntries(Object.entries(TRAITS).map(([k, t]) => [k, t.w])));
      u.trait = id;
      return { unitId: u.id, trait: id };
    },
    evolve(v, p) {
      const u = findUnit(v, p.unitId);
      if (u.evo) throw err('Unit sudah berevolusi');
      if (unitLevel(u.xp) < EVO_REQ.level) throw err(`Butuh Mastery Lv ${EVO_REQ.level}`);
      if (v.stones < EVO_REQ.stones) throw err('Batu Evolusi tidak cukup');
      pay(v, 'coins', EVO_REQ.coins); v.stones -= EVO_REQ.stones;
      u.evo = true;
      return { unitId: u.id };
    },
    buyMaterial(v, p) {
      const m = MATERIALS[p.key], n = Math.max(1, Math.min(50, p.n | 0));
      if (!m) throw err('Item tidak dikenal');
      pay(v, 'coins', m.price * n); v[p.key] = (v[p.key] || 0) + n;
      return { key: p.key, n };
    },
    buySkill(v, p) {
      const s = SKILL_SHOP[p.skill], packs = Math.max(1, Math.min(10, p.packs | 0));
      if (!s) throw err('Skill tidak dikenal');
      pay(v, s.currency, s.price * packs);
      v.skillUses[p.skill] = (v.skillUses[p.skill] || 0) + s.uses * packs;
      return { skill: p.skill, uses: v.skillUses[p.skill] };
    },
    unlockSkill(v, p) {
      if (!(p.skill in SKILL_PRICES)) throw err('Skill tidak dikenal');
      if (v.skills.includes(p.skill)) throw err('Skill sudah terbuka');
      const price = SKILL_PRICES[p.skill] || {};
      for (const [cur, n] of Object.entries(price)) if ((v[cur] || 0) < n) throw err((CURRENCY[cur] || {}).name + ' tidak cukup');
      for (const [cur, n] of Object.entries(price)) v[cur] -= n;
      v.skills.push(p.skill);
      return { skill: p.skill };
    },
    buySkin(v, p) {
      const s = SKINS[p.skin];
      if (!s || p.skin === 'default') throw err('Skin tidak dikenal');
      if (v.skins.includes(p.skin)) throw err('Skin sudah dimiliki');
      pay(v, 'gems', s.price); v.skins.push(p.skin);
      return { skin: p.skin };
    },
    setSkin(v, p) {
      const u = findUnit(v, p.unitId);
      if (!v.skins.includes(p.skin)) throw err('Skin belum dimiliki');
      u.skin = p.skin;
      return { unitId: u.id, skin: p.skin };
    },
    lock(v, p) { const u = findUnit(v, p.unitId); u.lock = !!p.lock; return { unitId: u.id, lock: u.lock }; },
    scrap(v, p) {
      const ids = Array.isArray(p.unitIds) ? p.unitIds.slice(0, 50) : [];
      const units = ids.map(id => findUnit(v, id));
      if (units.some(u => u.lock)) throw err('Ada unit yang terkunci');
      if (v.units.length - units.length < 1) throw err('Harus menyisakan minimal 1 unit');
      const got = { coins: 0, crystals: 0, stones: 0 };
      for (const u of units) for (const [k, n] of Object.entries(SCRAP[UNIT_RARITY[u.type]] || {})) got[k] += n;
      v.units = v.units.filter(u => !ids.includes(u.id));
      for (const k in got) v[k] = (v[k] || 0) + got[k];
      return got;
    },
    /* Hadiah akhir permainan. Nilai dibatasi agar tidak bisa dimanipulasi berlebihan. */
    claim(v, p, ctx) {
      const r = p.result || {};
      const diff = DIFF_INFO[r.diff] ? r.diff : 'normal';
      const maxWave = r.mode === 'endless' ? 500 : r.daily ? DAILY_WAVES : DIFF_INFO[diff].waves;
      let cleared = Math.max(0, Math.min(maxWave, r.cleared | 0));
      const won = !!r.won && r.mode !== 'endless' && cleared >= maxWave;
      const duration = Math.max(0, +r.duration || 0);
      if (ctx.server) {   // durasi minimal masuk akal & jeda antar klaim
        const sinceLast = (ctx.now - (v.lastClaimAt || 0)) / 1000;
        cleared = Math.min(cleared, Math.floor(Math.min(duration, sinceLast + 30) / 6));
      }
      const bossKills = Math.max(0, Math.min(r.bossKills | 0, Math.ceil(cleared / 10) * 4));
      const used = {};
      for (const [k, n] of Object.entries(r.skillsUsed || {})) {
        const take = Math.max(0, Math.min(n | 0, v.skillUses[k] || 0));
        if (take) { v.skillUses[k] -= take; used[k] = take; }
      }
      v.lastClaimAt = ctx.now;
      if (r.abandoned) return { abandoned: true, used };
      const today = dayStr(ctx.now), dailyFirstWin = !!(r.daily && won && v.dailyWon !== today);
      if (dailyFirstWin) v.dailyWon = today;
      const rw = rewardsFor({ ...r, diff, cleared, won, bossKills, dailyFirstWin });
      for (const k in rw) v[k] = (v[k] || 0) + rw[k];
      bumpMissions(v, ctx.now, { games: 1, waves: cleared, bosses: bossKills, wins: won ? 1 : 0, hardWins: won && diff === 'hard' ? 1 : 0 });
      const pxp = Math.min(1500, cleared * 8 + bossKills * 20 + (won ? 150 : 0));
      rollPass(v, ctx.now).xp += pxp;
      const mastery = [];
      for (const [id, g] of Object.entries(r.uxp || {})) {
        const u = v.units.find(x => x.id === id); if (!u) continue;
        const gain = Math.max(0, Math.min(Math.round(g), 50 + cleared * 150));
        const before = unitLevel(u.xp); u.xp += gain;
        mastery.push({ unitId: id, type: u.type, gain, lv: unitLevel(u.xp), up: unitLevel(u.xp) > before });
      }
      return { ...rw, pxp, dailyFirstWin, dailyReward: dailyFirstWin ? DAILY_REWARD : 0, mastery, used, cleared };
    },
    dailyLogin(v, p, ctx) {
      const today = dayStr(ctx.now);
      if (v.daily.day === today) return { already: true, streak: v.daily.streak };
      const yest = dayStr(ctx.now - 864e5);
      v.daily.streak = v.daily.day === yest ? v.daily.streak + 1 : 1;
      v.daily.day = today;
      const diamonds = DAILY_LOGIN[(v.daily.streak - 1) % DAILY_LOGIN.length];
      v.diamonds = (v.diamonds || 0) + diamonds;
      return { diamonds, streak: v.daily.streak };
    },
    missionClaim(v, p, ctx) {
      const kind = p.kind === 'weekly' ? 'weekly' : 'daily', def = MISSIONS[kind].find(x => x.id === p.id);
      if (!def) throw err('Misi tidak dikenal');
      const m = rollMissions(v, ctx.now), claimed = kind === 'daily' ? m.dc : m.wc;
      if (claimed.includes(def.id)) throw err('Hadiah misi sudah diambil');
      if (missionProgress(v, ctx.now, kind, def) < def.target) throw err('Misi belum selesai');
      claimed.push(def.id);
      const { pxp, ...rw } = def.reward;
      if (pxp) rollPass(v, ctx.now).xp += pxp;
      return { ...giveReward(v, rw, ctx.rng, ctx.now), pxp: pxp || 0, id: def.id };
    },
    passBuy(v, p, ctx) {
      const ps = rollPass(v, ctx.now);
      if (ps.premium) throw err('Pass Premium sudah aktif');
      pay(v, 'gems', PASS.premiumCost); ps.premium = true;
      return { premium: true };
    },
    passClaim(v, p, ctx) {
      const ps = rollPass(v, ctx.now), lv = passTier(ps), out = [];
      const tracks = ps.premium ? ['f', 'p'] : ['f'];
      for (let t = 1; t <= lv; t++) for (const tr of tracks) {
        if (p.tier !== 'all' && (p.tier !== t || p.track !== tr)) continue;
        if (ps[tr].includes(t)) continue;
        ps[tr].push(t); out.push({ tier: t, track: tr, got: giveReward(v, passReward(tr, t, ps.season), ctx.rng, ctx.now) });
      }
      if (!out.length) throw err(p.tier === 'all' ? 'Tidak ada hadiah yang bisa diambil' : 'Hadiah belum bisa diambil');
      return { claimed: out };
    },
    achClaim(v, p) {
      if (!(p.id in ACH_REWARDS)) throw err('Pencapaian tidak dikenal');
      if (v.achClaimed.includes(p.id)) return { already: true };
      v.achClaimed.push(p.id); v.coins += ACH_REWARDS[p.id]; v.diamonds = (v.diamonds || 0) + ACH_DIAMONDS;
      return { coins: ACH_REWARDS[p.id], diamonds: ACH_DIAMONDS };
    },
  };

  for (const k of Object.keys(actions)) { const fn = actions[k]; actions[k] = (v, p, ctx) => fn(fixVault(v), p, ctx); }

  /* ---------------- PENGATURAN GLOBAL (panel developer) ---------------- */
  const clone = o => JSON.parse(JSON.stringify(o));
  Object.assign(DEFAULTS, { gacha: clone({ cost1: GACHA.cost1, cost10: GACHA.cost10, pity: GACHA.pity, rates: GACHA.rates }), lucky: clone(LUCKY),
    dailyLogin: [...DAILY_LOGIN], skillPrices: clone(SKILL_PRICES), event: clone(EVENT), pass: { premiumCost: PASS.premiumCost } });
  const num = (x, min, max, d) => { const n = +x; return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d; };
  /** Terapkan pengaturan global (dipakai server & client agar selalu sama). Nilai tidak valid diabaikan. */
  function applyGlobal(g) {
    g = g || {};
    const G = g.gacha || {}, L = g.lucky || {}, D = DEFAULTS;
    GACHA.cost1 = num(G.cost1, 1, 1e6, D.gacha.cost1); GACHA.cost10 = num(G.cost10, 1, 1e7, D.gacha.cost10); GACHA.pity = num(G.pity, 1, 1000, D.gacha.pity);
    LUCKY.cost1 = num(L.cost1, 1, 1e6, D.lucky.cost1); LUCKY.cost10 = num(L.cost10, 1, 1e7, D.lucky.cost10); LUCKY.pity = num(L.pity, 1, 1000, D.lucky.pity);
    for (const r of RARITY_ORDER) {
      GACHA.rates[r] = num(G.rates && G.rates[r], 0, 1000, D.gacha.rates[r]);
      LUCKY.rates[r] = num(L.rates && L.rates[r], 0, 1000, D.lucky.rates[r]);
    }
    const dl = Array.isArray(g.dailyLogin) && g.dailyLogin.length === 7 ? g.dailyLogin : D.dailyLogin;
    dl.forEach((x, i) => { DAILY_LOGIN[i] = num(x, 0, 1e5, D.dailyLogin[i]); });
    for (const k of Object.keys(SKILL_PRICES)) {
      const sp = g.skillPrices && g.skillPrices[k];
      SKILL_PRICES[k] = sp === null ? null : sp && typeof sp === 'object'
        ? Object.fromEntries(Object.entries(sp).filter(([c, n]) => ['coins', 'diamonds', 'gems'].includes(c) && +n > 0).map(([c, n]) => [c, num(n, 1, 1e7, 1)]))
        : clone(D.skillPrices[k]);
    }
    PASS.premiumCost = num((g.pass || {}).premiumCost, 1, 1e5, D.pass.premiumCost);
    const E = g.event || {};
    EVENT.rewardMul = num(E.rewardMul, 0, 20, 1); EVENT.diamondMul = num(E.diamondMul, 0, 20, 1);
    EVENT.featured = UNIT_RARITY[E.featured] ? E.featured : null;
  }

  return {
    RARITY, RARITY_ORDER, UNIT_RARITY, UNIT_TYPES, STARTER_UNITS, UNIT_MAX_LV, unitXpFor, unitLevel, MASTERY_BONUS,
    TRAITS, EVO_REQ, MATERIALS, SKINS, SKILL_SHOP, STARTER_SKILLS, TOPUP, GACHA, LUCKY, CURRENCY, unitsOfRarity, featuredUnit, dayStr, SCRAP,
    MAP_STARS, DIFF_INFO, DAILY_WAVES, DAILY_REWARD, ACH_REWARDS, ACH_DIAMONDS, DAILY_LOGIN, rewardsFor,
    newVault, makeUnit, fixVault, actions, SKILL_PRICES, FREE_SKILLS, EVENT, DEFAULTS, applyGlobal,
    MISSIONS, missionProgress, rollMissions, PASS, rollPass, passTier, passReward, seasonName, seasonStr, giveReward,
  };
});
