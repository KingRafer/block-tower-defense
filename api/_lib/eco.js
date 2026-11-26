/* =========================================================
 * Ekonomi di server: vault per akun (mata uang & unit),
 * trading antar teman, dan top up Midtrans.
 * Unit disimpan di collection `units` (satu dokumen per unit),
 * mata uang di users.vault dengan kontrol versi (vaultV).
 * ========================================================= */
'use strict';

const crypto = require('crypto');
const SHARED = require('../../js/shared.js');

const VAULT_KEYS = ['coins', 'gems', 'diamonds', 'skills', 'crystals', 'stones', 'skins', 'skillUses', 'pity', 'achClaimed', 'daily', 'dailyWon', 'lastClaimAt', 'pulls'];
const err = (status, message) => Object.assign(new Error(message), { status });
const rng = () => crypto.randomBytes(4).readUInt32BE(0) / 4294967296;
const unitDoc = (u, owner) => ({ _id: u.id, owner, type: u.type, trait: u.trait || null, evo: !!u.evo, xp: u.xp | 0, skin: u.skin || 'default', lock: !!u.lock, tradable: u.tradable !== false, at: u.at || Date.now() });
const docUnit = d => ({ id: d._id, type: d.type, trait: d.trait, evo: d.evo, xp: d.xp, skin: d.skin, lock: d.lock, tradable: d.tradable, at: d.at });
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));

/** Muat vault lengkap (mata uang + unit). Membuat vault baru jika belum ada. */
async function loadVault(d, user, importData) {
  if (!user.vault) {
    const now = Date.now();
    const v = SHARED.newVault(now, rng);
    if (importData && typeof importData === 'object') applyImport(v, importData, now);
    const r = await d.collection('users').updateOne({ _id: user._id, vault: null }, { $set: { vault: pick(v, VAULT_KEYS), vaultV: 1 } });
    if (r.matchedCount) await d.collection('units').insertMany(v.units.map(u => unitDoc(u, user._id)));
    user = await d.collection('users').findOne({ _id: user._id });
  }
  const units = await d.collection('units').find({ owner: user._id }).toArray();
  return { vault: SHARED.fixVault({ ...user.vault, units: units.map(docUnit) }), version: user.vaultV || 1 };
}

/** Impor progres tamu (sekali, dengan batas) — unit impor tidak bisa diperdagangkan */
function applyImport(v, im, now) {
  const cap = (x, max) => Math.max(0, Math.min(max, Math.floor(+x || 0)));
  v.coins = cap(im.coins, 50000); v.crystals = Math.max(v.crystals, cap(im.crystals, 100)); v.stones = cap(im.stones, 20);
  v.diamonds = Math.max(v.diamonds, cap(im.diamonds != null ? im.diamonds : im.gems, 2000));
  if (Array.isArray(im.skins)) v.skins = [...new Set(['default', ...im.skins.filter(s => SHARED.SKINS[s])])];
  if (im.skillUses && typeof im.skillUses === 'object')
    for (const k of Object.keys(SHARED.SKILL_SHOP)) v.skillUses[k] = Math.max(v.skillUses[k] || 0, cap(im.skillUses[k], 30));
  if (Array.isArray(im.skills)) v.skills = [...new Set([...v.skills, ...im.skills.filter(k => k in SHARED.SKILL_PRICES && !SHARED.SKILL_PRICES[k])])];
  if (Array.isArray(im.achClaimed)) v.achClaimed = im.achClaimed.filter(a => a in SHARED.ACH_REWARDS);
  if (Array.isArray(im.units) && im.units.length) {
    v.units = im.units.filter(u => u && SHARED.UNIT_RARITY[u.type]).slice(0, 80).map(u => SHARED.makeUnit(u.type, rng, now, {
      trait: SHARED.TRAITS[u.trait] ? u.trait : null, evo: !!u.evo, xp: cap(u.xp, 20000), skin: v.skins.includes(u.skin) ? u.skin : 'default',
      tradable: false, imported: true }));
    if (!v.units.length) v.units = SHARED.STARTER_UNITS.map(t => SHARED.makeUnit(t, rng, now, { tradable: false }));
  }
}

/** Simpan perubahan vault: mata uang (dengan cek versi) dan diff unit */
async function saveVault(d, userId, before, after, version) {
  const r = await d.collection('users').updateOne({ _id: userId, vaultV: version }, { $set: { vault: pick(after, VAULT_KEYS), vaultV: version + 1 } });
  if (!r.matchedCount) throw err(409, 'Data sedang diperbarui, coba lagi');
  const old = Object.fromEntries(before.units.map(u => [u.id, JSON.stringify(u)]));
  const now = new Set(after.units.map(u => u.id));
  const added = after.units.filter(u => !(u.id in old));
  const changed = after.units.filter(u => u.id in old && old[u.id] !== JSON.stringify(u));
  const removed = before.units.filter(u => !now.has(u.id)).map(u => u.id);
  if (added.length) await d.collection('units').insertMany(added.map(u => unitDoc(u, userId)));
  for (const u of changed) { const { _id, owner, ...rest } = unitDoc(u, userId); await d.collection('units').updateOne({ _id: u.id, owner: userId }, { $set: rest }); }
  if (removed.length) await d.collection('units').deleteMany({ _id: { $in: removed }, owner: userId });
}

/** Jalankan aksi ekonomi bersama di server (dengan percobaan ulang bila bentrok) */
async function runAction(d, user, action, payload) {
  const fn = SHARED.actions[action];
  if (!fn) throw err(400, 'Aksi tidak dikenal');
  for (let attempt = 0; attempt < 3; attempt++) {
    const u = await d.collection('users').findOne({ _id: user._id });
    const { vault, version } = await loadVault(d, u);
    const before = JSON.parse(JSON.stringify(vault));
    let result;
    try { result = fn(vault, payload || {}, { rng, now: Date.now(), server: true }); }
    catch (e) { throw err(e.status || 400, e.message); }
    try { await saveVault(d, user._id, before, vault, version); return { result, vault }; }
    catch (e) { if (e.status !== 409 || attempt === 2) throw e; }
  }
}

/* ======================= TRADING ======================= */
const pairKey = (x, y) => (x < y ? { a: x, b: y } : { a: y, b: x });
async function areFriends(d, x, y) { const f = await d.collection('friendships').findOne(pairKey(x, y)); return !!(f && f.status === 'accepted'); }

function cleanSide(s) {
  s = s || {};
  const units = Array.isArray(s.units) ? [...new Set(s.units.map(String))].slice(0, 8) : [];
  const diamonds = Math.max(0, Math.min(100000, Math.floor(+(s.diamonds != null ? s.diamonds : s.gems) || 0)));
  return { units, diamonds };
}
async function checkUnits(d, ids, owner) {
  if (!ids.length) return [];
  const list = await d.collection('units').find({ _id: { $in: ids }, owner }).toArray();
  if (list.length !== ids.length) throw err(409, 'Sebagian unit sudah tidak dimiliki');
  if (list.some(u => u.lock)) throw err(409, 'Ada unit yang dikunci pemiliknya');
  if (list.some(u => u.tradable === false)) throw err(409, 'Ada unit yang tidak bisa diperdagangkan');
  return list.map(docUnit);
}

async function tradeCreate(d, me, b) {
  const to = String(b.to || '');
  if (!(await areFriends(d, me._id, to))) throw err(403, 'Hanya bisa trading dengan teman');
  const give = cleanSide(b.give), want = cleanSide(b.want);
  if (!give.units.length && !give.diamonds && !want.units.length && !want.diamonds) throw err(400, 'Penawaran kosong');
  if ((await d.collection('trades').countDocuments({ from: me._id, status: 'pending' })) >= 10) throw err(429, 'Maksimal 10 penawaran aktif');
  await checkUnits(d, give.units, me._id);
  await checkUnits(d, want.units, to);
  const meV = await loadVault(d, me);
  if ((meV.vault.diamonds || 0) < give.diamonds) throw err(400, 'Diamond tidak cukup');
  const doc = { _id: 't_' + crypto.randomBytes(8).toString('hex'), from: me._id, fromName: me.name, to, give, want, status: 'pending', createdAt: Date.now() };
  await d.collection('trades').insertOne(doc);
  return { trade: doc };
}

async function moveUnits(d, ids, from, to, tag) {
  if (!ids.length) return true;
  const r = await d.collection('units').updateMany({ _id: { $in: ids }, owner: from, lock: false, tradable: true }, { $set: { owner: to, moveTag: tag } });
  return r.modifiedCount === ids.length;
}
async function revertUnits(d, ids, from, to, tag) {
  if (ids.length) await d.collection('units').updateMany({ _id: { $in: ids }, owner: to, moveTag: tag }, { $set: { owner: from } });
}
async function adjustCurrency(d, userId, key, delta) {
  for (let i = 0; i < 4; i++) {
    const u = await d.collection('users').findOne({ _id: userId });
    const { vault, version } = await loadVault(d, u);
    if ((vault[key] || 0) + delta < 0) throw err(409, (SHARED.CURRENCY[key] || {}).name + ' tidak cukup');
    const r = await d.collection('users').updateOne({ _id: userId, vaultV: version }, { $set: { 'vault': { ...pick(vault, VAULT_KEYS), [key]: (vault[key] || 0) + delta }, vaultV: version + 1 } });
    if (r.matchedCount) return true;
  }
  throw err(409, 'Gagal memperbarui saldo, coba lagi');
}
const adjustGems = (d, userId, delta) => adjustCurrency(d, userId, 'gems', delta);

async function tradeAccept(d, me, id) {
  const t = await d.collection('trades').findOne({ _id: id, to: me._id, status: 'pending' });
  if (!t) throw err(404, 'Penawaran tidak ditemukan');
  const lock = await d.collection('trades').updateOne({ _id: id, status: 'pending' }, { $set: { status: 'processing' } });
  if (!lock.matchedCount) throw err(409, 'Penawaran sedang diproses');
  const fail = async (e) => { await d.collection('trades').updateOne({ _id: id }, { $set: { status: 'failed', reason: e.message, doneAt: Date.now() } }); throw e; };
  const tag = id;
  // 1. pindahkan unit kedua pihak
  if (!(await moveUnits(d, t.give.units, t.from, t.to, tag))) { await revertUnits(d, t.give.units, t.from, t.to, tag); return fail(err(409, 'Unit pengirim sudah berubah')); }
  if (!(await moveUnits(d, t.want.units, t.to, t.from, tag))) {
    await revertUnits(d, t.give.units, t.from, t.to, tag); await revertUnits(d, t.want.units, t.to, t.from, tag);
    return fail(err(409, 'Unit kamu sudah berubah'));
  }
  // 2. pindahkan Diamond (net)
  const net = (t.give.diamonds || 0) - (t.want.diamonds || 0);   // positif: pengirim memberi Diamond ke penerima
  try {
    if (net > 0) { await adjustCurrency(d, t.from, 'diamonds', -net); await adjustCurrency(d, t.to, 'diamonds', net); }
    else if (net < 0) { await adjustCurrency(d, t.to, 'diamonds', net); await adjustCurrency(d, t.from, 'diamonds', -net); }
  } catch (e) {
    await revertUnits(d, t.give.units, t.from, t.to, tag); await revertUnits(d, t.want.units, t.to, t.from, tag);
    return fail(e);
  }
  await d.collection('trades').updateOne({ _id: id }, { $set: { status: 'done', doneAt: Date.now() } });
  return { ok: true };
}

async function tradeList(d, me) {
  const rows = await d.collection('trades').find({ $or: [{ from: me._id }, { to: me._id }] }).sort({ createdAt: -1 }).limit(30).toArray();
  const ids = [...new Set(rows.flatMap(t => [...t.give.units, ...t.want.units]))];
  const units = ids.length ? await d.collection('units').find({ _id: { $in: ids } }).toArray() : [];
  const byId = Object.fromEntries(units.map(u => [u._id, docUnit(u)]));
  const others = [...new Set(rows.map(t => (t.from === me._id ? t.to : t.from)))];
  const users = others.length ? await d.collection('users').find({ _id: { $in: others } }).toArray() : [];
  const names = Object.fromEntries(users.map(u => [u._id, u.name]));
  return {
    trades: rows.map(t => ({ id: t._id, mine: t.from === me._id, other: names[t.from === me._id ? t.to : t.from] || 'Pemain', otherId: t.from === me._id ? t.to : t.from,
      give: { diamonds: t.give.diamonds || 0, units: t.give.units.map(i => byId[i] || { id: i, missing: true }) },
      want: { diamonds: t.want.diamonds || 0, units: t.want.units.map(i => byId[i] || { id: i, missing: true }) },
      status: t.status, reason: t.reason || null, createdAt: t.createdAt })),
  };
}

/* ======================= TOP UP (MIDTRANS) ======================= */
function midtrans() {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw err(503, 'Top up belum dikonfigurasi');
  const prod = process.env.MIDTRANS_PRODUCTION === '1';
  return { key, prod, auth: 'Basic ' + Buffer.from(key + ':').toString('base64'),
    snap: prod ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    api: prod ? 'https://api.midtrans.com/v2/' : 'https://api.sandbox.midtrans.com/v2/' };
}

async function payCreate(d, me, b) {
  const pack = SHARED.TOPUP.find(p => p.id === b.pack);
  if (!pack) throw err(400, 'Paket tidak dikenal');
  const mt = midtrans();
  const orderId = 'BTD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const gems = pack.gems + pack.bonus;
  await d.collection('payments').insertOne({ _id: orderId, user: me._id, pack: pack.id, gems, price: pack.price, status: 'pending', credited: false, createdAt: Date.now() });
  const r = await fetch(mt.snap, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: mt.auth },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: pack.price },
      item_details: [{ id: pack.id, price: pack.price, quantity: 1, name: `${gems} Permata Block TD` }],
      customer_details: { first_name: me.name, email: me.email || undefined },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.token) { await d.collection('payments').updateOne({ _id: orderId }, { $set: { status: 'error' } }); throw err(502, 'Gagal membuat transaksi: ' + ((data.error_messages || [])[0] || r.status)); }
  return { orderId, token: data.token, redirectUrl: data.redirect_url };
}

/** Kreditkan Permata sekali saja untuk transaksi yang lunas */
async function applyPayStatus(d, orderId, st) {
  const paid = st.transaction_status === 'settlement' || (st.transaction_status === 'capture' && (st.fraud_status || 'accept') === 'accept');
  const failed = ['deny', 'cancel', 'expire', 'failure'].includes(st.transaction_status);
  const pay = await d.collection('payments').findOne({ _id: orderId });
  if (!pay) throw err(404, 'Transaksi tidak ditemukan');
  if (+st.gross_amount && Math.round(+st.gross_amount) !== pay.price) throw err(400, 'Nominal tidak cocok');
  if (paid) {
    const lock = await d.collection('payments').updateOne({ _id: orderId, credited: false }, { $set: { credited: true, status: 'paid', paidAt: Date.now() } });
    if (lock.matchedCount) {
      try { const u = await d.collection('users').findOne({ _id: pay.user }); await loadVault(d, u); await adjustGems(d, pay.user, pay.gems); }
      catch (e) { await d.collection('payments').updateOne({ _id: orderId }, { $set: { credited: false, status: 'pending' } }); throw e; }
    }
    return { status: 'paid', gems: pay.gems };
  }
  if (failed) await d.collection('payments').updateOne({ _id: orderId, credited: false }, { $set: { status: st.transaction_status } });
  return { status: failed ? st.transaction_status : 'pending', gems: pay.gems };
}

/** Webhook notifikasi Midtrans (verifikasi signature SHA-512) */
async function payNotify(d, body) {
  const mt = midtrans();
  const b = body || {};
  const sig = crypto.createHash('sha512').update(String(b.order_id) + String(b.status_code) + String(b.gross_amount) + mt.key).digest('hex');
  if (!b.signature_key || sig !== b.signature_key) throw err(403, 'Signature tidak valid');
  await applyPayStatus(d, String(b.order_id), b);
  return { ok: true };
}

/** Cek status langsung ke Midtrans (dipakai client setelah popup ditutup) */
async function payStatus(d, me, orderId) {
  const pay = await d.collection('payments').findOne({ _id: String(orderId), user: me._id });
  if (!pay) throw err(404, 'Transaksi tidak ditemukan');
  if (pay.credited) return { status: 'paid', gems: pay.gems };
  const mt = midtrans();
  const r = await fetch(mt.api + encodeURIComponent(pay._id) + '/status', { headers: { Accept: 'application/json', Authorization: mt.auth } });
  const st = await r.json().catch(() => ({}));
  if (!st.transaction_status) return { status: 'pending', gems: pay.gems };
  return applyPayStatus(d, pay._id, st);
}

module.exports = { saveVaultPublic: saveVault, loadVault, runAction, tradeCreate, tradeAccept, tradeList, checkUnits, payCreate, payNotify, payStatus, docUnit, applyPayStatus };
