/* =========================================================
 * Panel developer (admin) — hanya untuk email di ADMIN_EMAILS
 * (default: rafermazaya@gmail.com). Semua aksi dicatat di
 * collection `adminlog`.
 * ========================================================= */
'use strict';

const crypto = require('crypto');
const SHARED = require('../../js/shared.js');
const eco = require('./eco');

const err = (status, message) => Object.assign(new Error(message), { status });
const rng = () => crypto.randomBytes(4).readUInt32BE(0) / 4294967296;
const CURRENCIES = ['coins', 'diamonds', 'gems', 'crystals', 'stones'];

function adminEmails() {
  return (process.env.ADMIN_EMAILS || 'rafermazaya@gmail.com').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
function isAdmin(u) {
  return !!(u && u.email && u.emailVerified !== false && adminEmails().includes(String(u.email).toLowerCase()));
}

/* ---------- pengaturan global (cache singkat per instance) ---------- */
let globalCache = null, globalAt = 0;
async function getGlobal(d, fresh) {
  if (!fresh && globalCache && Date.now() - globalAt < 15000) return globalCache;
  const doc = await d.collection('settings').findOne({ _id: 'global' });
  globalCache = (doc && doc.value) || {}; globalAt = Date.now();
  SHARED.applyGlobal(globalCache);
  return globalCache;
}
function cleanGlobal(g) {
  g = g || {};
  const out = {
    announcement: { text: String((g.announcement || {}).text || '').slice(0, 300), color: /^#[0-9a-f]{6}$/i.test((g.announcement || {}).color) ? g.announcement.color : '#ffcc33', active: !!(g.announcement || {}).active },
    maintenance: !!g.maintenance, maintenanceMsg: String(g.maintenanceMsg || '').slice(0, 200),
    topupEnabled: g.topupEnabled !== false,
    gacha: g.gacha || {}, lucky: g.lucky || {}, dailyLogin: g.dailyLogin, skillPrices: g.skillPrices || {}, event: g.event || {},
  };
  SHARED.applyGlobal(out);          // validasi: nilai salah otomatis kembali ke default
  out.gacha = { cost1: SHARED.GACHA.cost1, cost10: SHARED.GACHA.cost10, pity: SHARED.GACHA.pity, rates: { ...SHARED.GACHA.rates } };
  out.lucky = JSON.parse(JSON.stringify(SHARED.LUCKY));
  out.dailyLogin = [...SHARED.DAILY_LOGIN];
  out.skillPrices = JSON.parse(JSON.stringify(SHARED.SKILL_PRICES));
  out.event = { ...SHARED.EVENT };
  return out;
}

/** Ubah vault seorang pemain (dengan kontrol versi) */
async function mutateVault(d, userId, fn) {
  for (let i = 0; i < 3; i++) {
    const u = await d.collection('users').findOne({ _id: userId });
    if (!u) throw err(404, 'Pemain tidak ditemukan');
    const { vault } = await eco.loadVault(d, u);
    const before = JSON.parse(JSON.stringify(vault));
    const res = fn(vault);
    try { await eco.saveVaultPublic(d, userId, before, vault, u.vaultV || 1); return { res, vault }; }
    catch (e) { if (e.status !== 409 || i === 2) throw e; }
  }
}
async function log(d, admin, action, target, detail) {
  await d.collection('adminlog').insertOne({ _id: 'l_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), at: Date.now(), admin: admin.email, action, target: target || null, detail: detail || null });
}
const userRow = u => ({ id: u._id, name: u.name, email: u.email || '', friendCode: u.friendCode, level: u.level || 1, banned: !!u.banned,
  lastSeen: u.lastSeen || 0, createdAt: u.createdAt || 0, avatar: u.avatar || '', online: u.lastSeen && Date.now() - u.lastSeen < 70000 });

/* ---------- rute admin ---------- */
const routes = {
  'admin.stats': async (req, d) => {
    const now = Date.now(), day = now - 864e5;
    const pays = await d.collection('payments').find({ status: 'paid' }).toArray();
    return {
      users: await d.collection('users').countDocuments({}),
      online: await d.collection('users').countDocuments({ lastSeen: { $gt: now - 70000 } }),
      newToday: await d.collection('users').countDocuments({ createdAt: { $gt: day } }),
      units: await d.collection('units').countDocuments({}),
      trades: await d.collection('trades').countDocuments({ status: 'done' }),
      rooms: await d.collection('rooms').countDocuments({}),
      banned: await d.collection('users').countDocuments({ banned: true }),
      paidCount: pays.length, revenue: pays.reduce((a, p) => a + (p.price || 0), 0),
      paidToday: pays.filter(p => (p.paidAt || 0) > day).reduce((a, p) => a + (p.price || 0), 0),
    };
  },
  'admin.search': async (req, d) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    let rows = await d.collection('users').find({}).sort({ lastSeen: -1 }).limit(400).toArray();
    if (q) rows = rows.filter(u => [u.name, u.email, u.friendCode, u._id].some(x => String(x || '').toLowerCase().includes(q)));
    return { users: rows.slice(0, 50).map(userRow) };
  },
  'admin.user': async (req, d) => {
    const u = await d.collection('users').findOne({ _id: String(req.query.id) });
    if (!u) throw err(404, 'Pemain tidak ditemukan');
    const { vault } = await eco.loadVault(d, u);
    const prof = u.profile || {};
    return { user: userRow(u), vault, profile: { xp: prof.xp || 0, stats: prof.stats || {}, achievements: (prof.achievements || []).length } };
  },
  'admin.grant': async (req, d, admin) => {
    const b = req.body || {}, cur = String(b.currency), amount = Math.trunc(+b.amount || 0);
    if (!CURRENCIES.includes(cur) || !amount || Math.abs(amount) > 1e9) throw err(400, 'Mata uang / jumlah tidak valid');
    const { vault } = await mutateVault(d, String(b.id), v => { v[cur] = Math.max(0, (v[cur] || 0) + amount); });
    await log(d, admin, 'grant', b.id, { cur, amount });
    return { vault };
  },
  'admin.unitGive': async (req, d, admin) => {
    const b = req.body || {};
    if (!SHARED.UNIT_RARITY[b.type]) throw err(400, 'Jenis unit tidak dikenal');
    const n = Math.max(1, Math.min(50, b.count | 0 || 1));
    const { vault } = await mutateVault(d, String(b.id), v => {
      for (let i = 0; i < n; i++) v.units.push(SHARED.makeUnit(b.type, rng, Date.now() + i, {
        trait: SHARED.TRAITS[b.trait] ? b.trait : null, evo: !!b.evo, xp: Math.max(0, Math.min(1e6, +b.xp || 0)),
        skin: SHARED.SKINS[b.skin] ? b.skin : 'default', tradable: b.tradable !== false }));
    });
    await log(d, admin, 'unitGive', b.id, { type: b.type, n, trait: b.trait, evo: !!b.evo });
    return { vault };
  },
  'admin.unitEdit': async (req, d, admin) => {
    const b = req.body || {}, f = b.fields || {};
    const { vault } = await mutateVault(d, String(b.id), v => {
      const u = v.units.find(x => x.id === b.unitId); if (!u) throw err(404, 'Unit tidak ditemukan');
      if ('trait' in f) u.trait = SHARED.TRAITS[f.trait] ? f.trait : null;
      if ('evo' in f) u.evo = !!f.evo;
      if ('xp' in f) u.xp = Math.max(0, Math.min(1e6, +f.xp || 0));
      if ('skin' in f && SHARED.SKINS[f.skin]) u.skin = f.skin;
      if ('lock' in f) u.lock = !!f.lock;
      if ('tradable' in f) u.tradable = !!f.tradable;
    });
    await log(d, admin, 'unitEdit', b.id, { unitId: b.unitId, f });
    return { vault };
  },
  'admin.unitDelete': async (req, d, admin) => {
    const b = req.body || {};
    const { vault } = await mutateVault(d, String(b.id), v => { v.units = v.units.filter(x => x.id !== b.unitId); });
    await log(d, admin, 'unitDelete', b.id, { unitId: b.unitId });
    return { vault };
  },
  'admin.unlockAll': async (req, d, admin) => {
    const b = req.body || {};
    const { vault } = await mutateVault(d, String(b.id), v => {
      if (b.what === 'skills' || b.what === 'all') v.skills = Object.keys(SHARED.SKILL_PRICES);
      if (b.what === 'skins' || b.what === 'all') v.skins = Object.keys(SHARED.SKINS);
      if (b.what === 'units' || b.what === 'all') for (const t of SHARED.UNIT_TYPES) if (!v.units.some(u => u.type === t)) v.units.push(SHARED.makeUnit(t, rng, Date.now()));
    });
    await log(d, admin, 'unlockAll', b.id, { what: b.what });
    return { vault };
  },
  'admin.ban': async (req, d, admin) => {
    const b = req.body || {};
    const target = await d.collection('users').findOne({ _id: String(b.id) });
    if (!target) throw err(404, 'Pemain tidak ditemukan');
    if (isAdmin(target)) throw err(400, 'Tidak bisa memblokir admin');
    await d.collection('users').updateOne({ _id: target._id }, { $set: { banned: !!b.banned, bannedReason: String(b.reason || '').slice(0, 200) } });
    await log(d, admin, b.banned ? 'ban' : 'unban', b.id, { reason: b.reason });
    return { ok: true };
  },
  'admin.resetVault': async (req, d, admin) => {
    const id = String((req.body || {}).id);
    const u = await d.collection('users').findOne({ _id: id });
    if (!u) throw err(404, 'Pemain tidak ditemukan');
    await d.collection('units').deleteMany({ owner: id });
    await d.collection('users').updateOne({ _id: id }, { $set: { vault: null, vaultV: (u.vaultV || 1) + 1 } });
    await log(d, admin, 'resetVault', id);
    return { vault: (await eco.loadVault(d, await d.collection('users').findOne({ _id: id }))).vault };
  },
  'admin.getGlobal': async (req, d) => ({ global: cleanGlobal(await getGlobal(d, true)), defaults: SHARED.DEFAULTS, units: SHARED.UNIT_TYPES }),
  'admin.setGlobal': async (req, d, admin) => {
    const g = cleanGlobal((req.body || {}).global);
    await d.collection('settings').deleteOne({ _id: 'global' });
    await d.collection('settings').insertOne({ _id: 'global', value: g, updatedAt: Date.now(), by: admin.email });
    globalCache = g; globalAt = Date.now(); SHARED.applyGlobal(g);
    await log(d, admin, 'setGlobal', null, { keys: Object.keys(g) });
    return { global: g };
  },
  'admin.payments': async (req, d) => {
    const rows = await d.collection('payments').find({}).sort({ createdAt: -1 }).limit(80).toArray();
    const ids = [...new Set(rows.map(p => p.user))];
    const users = ids.length ? await d.collection('users').find({ _id: { $in: ids } }).toArray() : [];
    const names = Object.fromEntries(users.map(u => [u._id, u.name]));
    return { payments: rows.map(p => ({ id: p._id, user: p.user, name: names[p.user] || '?', gems: p.gems, price: p.price, status: p.status, credited: !!p.credited, at: p.createdAt })) };
  },
  'admin.credit': async (req, d, admin) => {
    const id = String((req.body || {}).orderId);
    const p = await d.collection('payments').findOne({ _id: id });
    if (!p) throw err(404, 'Transaksi tidak ditemukan');
    const r = await eco.applyPayStatus(d, id, { transaction_status: 'settlement' });
    await log(d, admin, 'manualCredit', p.user, { orderId: id });
    return r;
  },
  'admin.trades': async (req, d) => {
    const rows = await d.collection('trades').find({}).sort({ createdAt: -1 }).limit(60).toArray();
    return { trades: rows.map(t => ({ id: t._id, from: t.fromName || t.from, to: t.to, status: t.status, give: t.give, want: t.want, at: t.createdAt, reason: t.reason || null })) };
  },
  'admin.lb': async (req, d) => {
    const mode = String(req.query.mode || 'classic');
    const rows = await d.collection('runs').find({ mode }).sort({ score: -1 }).limit(50).toArray();
    return { runs: rows.map(r => ({ id: r._id, name: r.name, score: r.score, wave: r.wave, map: r.map, at: r.at })) };
  },
  'admin.lbDelete': async (req, d, admin) => {
    const id = String((req.body || {}).id);
    await d.collection('runs').deleteOne({ _id: id });
    await log(d, admin, 'lbDelete', null, { id });
    return { ok: true };
  },
  'admin.log': async (req, d) => ({ log: await d.collection('adminlog').find({}).sort({ at: -1 }).limit(60).toArray() }),
};

module.exports = { routes, isAdmin, getGlobal, cleanGlobal };
