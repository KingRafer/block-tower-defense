/* Uji ekonomi server: vault, gacha, trait, evolusi, toko, klaim, trading, top up (Midtrans palsu) */
'use strict';
const path = require('path'), crypto = require('crypto'), assert = require('assert');
process.env.MONGO_MODULE = path.join(__dirname, 'fake-mongodb.js');
process.env.MONGODB_URI = 'mongodb://fake';
process.env.MONGODB_DB = 'eco_test';
process.env.SESSION_SECRET = 'test-secret-1234567890-abcdef';
process.env.DEV_AUTH = '1';
process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-TEST';
const handler = require('../api/index.js');
const SHARED = require('../js/shared.js');

// Midtrans palsu
const midStatus = {};
global.fetch = async (url, opt) => {
  if (url.includes('/snap/v1/transactions')) { const b = JSON.parse(opt.body); return { ok: true, json: async () => ({ token: 'tok-' + b.transaction_details.order_id, redirect_url: 'https://x' }) }; }
  const m = url.match(/\/v2\/(.+)\/status/);
  if (m) return { ok: true, json: async () => midStatus[decodeURIComponent(m[1])] || {} };
  throw new Error('fetch tak terduga ' + url);
};
function call(r, { method = 'POST', body = {}, query = {}, token } = {}) {
  return new Promise(resolve => {
    const req = { method, query: { r, ...query }, body, headers: token ? { authorization: 'Bearer ' + token } : {} };
    const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ status: this.statusCode, body: o }); }, end() { resolve({ status: this.statusCode }); } };
    handler(req, res);
  });
}
const act = (token, action, payload) => call('eco.act', { token, body: { action, payload } });

(async () => {
  const A = (await call('auth.dev', { body: { name: 'Ana' } })).body, B = (await call('auth.dev', { body: { name: 'Budi' } })).body;
  // vault awal + impor
  const initA = (await call('eco.init', { token: A.token, body: { import: { coins: 999999, diamonds: 50, units: [{ type: 'nuke', trait: 'dewa', evo: true, xp: 5000 }], skins: ['gold', 'xxx'] } } })).body;
  assert.strictEqual(initA.vault.coins, 50000, 'impor koin dibatasi');
  assert.strictEqual(initA.vault.diamonds, 300, 'diamond minimal awal'); assert.strictEqual(initA.vault.gems, 0, 'permata hanya dari top up');
  assert.strictEqual(initA.vault.units[0].type, 'nuke'); assert.strictEqual(initA.vault.units[0].tradable, false, 'unit impor tidak bisa diperdagangkan');
  assert.deepStrictEqual(initA.vault.skins, ['default', 'gold']);
  const initA2 = (await call('eco.init', { token: A.token, body: { import: { coins: 5 } } })).body;
  assert.strictEqual(initA2.created, false); assert.strictEqual(initA2.vault.coins, 50000, 'impor hanya sekali');
  let vB = (await call('eco.state', { method: 'GET', token: B.token })).body.vault;
  assert.strictEqual(vB.units.length, SHARED.STARTER_UNITS.length, 'unit awal');

  // gacha
  let r = await act(B.token, 'summon', { banner: 'std', count: 1 });
  assert.strictEqual(r.body.result.units.length, 1); assert.strictEqual(r.body.vault.diamonds, 250);
  assert.strictEqual((await act(B.token, 'summon', { banner: 'lucky', count: 1 })).status, 400, 'lucky butuh permata');
  r = await act(B.token, 'summon', { banner: 'feat', count: 10 });
  assert.strictEqual(r.status, 400, 'diamond kurang untuk 10x');
  // pity: GACHA.pity tarikan menjamin legendaris+
  const v = SHARED.newVault(Date.now(), Math.random); v.diamonds = 1e6;
  let gotLeg = 0; const ctx = { rng: () => 0.001, now: Date.now() };   // rng rendah = selalu common
  for (let i = 0; i < SHARED.GACHA.pity; i++) { const out = SHARED.actions.summon(v, { banner: "std", count: 1 }, ctx); if (SHARED.RARITY[SHARED.UNIT_RARITY[out.units[0].type]].rank >= 3) gotLeg++; }
  assert.strictEqual(gotLeg, 1, 'pity bekerja');
  // distribusi kasar
  const cnt = {}; const v2 = SHARED.newVault(0, Math.random); v2.diamonds = 1e9;
  for (let i = 0; i < 2000; i++) { const u = SHARED.actions.summon(v2, { banner: 'std', count: 10 }, { rng: Math.random, now: i }).units; u.forEach(x => cnt[SHARED.UNIT_RARITY[x.type]] = (cnt[SHARED.UNIT_RARITY[x.type]] || 0) + 1); }
  assert(cnt.common > cnt.rare && cnt.rare > cnt.epic && cnt.epic > cnt.legendary && cnt.legendary > cnt.mythic, 'urutan peluang');

  // trait, evolusi, toko, skin
  const unitB = vB.units[0].id;
  r = await act(B.token, 'rollTrait', { unitId: unitB });
  assert(SHARED.TRAITS[r.body.result.trait]); assert.strictEqual(r.body.vault.crystals, 2);
  assert.strictEqual((await act(B.token, 'evolve', { unitId: unitB })).status, 400, 'evolusi butuh mastery');
  assert.strictEqual((await act(B.token, 'buySkin', { skin: 'ice' })).status, 400, 'skin butuh permata');
  await call('pay.create', { token: B.token, body: { pack: 'p330' } }).then(async rr => { const o = rr.body.orderId; global.__o = o; });
  { const o = global.__o; const n = { order_id: o, status_code: '200', gross_amount: '75000.00', transaction_status: 'settlement' }; n.signature_key = crypto.createHash('sha512').update(o + '200' + '75000.00' + process.env.MIDTRANS_SERVER_KEY).digest('hex'); await call('pay.notify', { body: n }); }
  assert.strictEqual((await act(B.token, 'buySkin', { skin: 'ice' })).status, 200);
  { const lv = SHARED.newVault(0, Math.random); lv.gems = 90; const lr = SHARED.actions.summon(lv, { banner: 'lucky', count: 10 }, { rng: () => 0.001, now: 0 }); assert(lr.units.some(u => SHARED.RARITY[SHARED.UNIT_RARITY[u.type]].rank >= 3), 'lucky 10x menjamin legendaris'); }
  assert.strictEqual((await act(B.token, 'setSkin', { unitId: unitB, skin: 'ice' })).body.vault.units.find(u => u.id === unitB).skin, 'ice');

  // klaim hadiah
  r = await act(B.token, 'claim', { result: { cleared: 30, won: true, diff: 'normal', map: 'grass', mode: 'classic', bossKills: 3, duration: 900, uxp: { [unitB]: 99999 }, skillsUsed: { airstrike: 5 } } });
  assert.strictEqual(r.status, 200); assert(r.body.result.coins > 0); assert.strictEqual(r.body.result.used.airstrike, 2, 'pemakaian skill dibatasi stok');
  assert.strictEqual(r.body.vault.units.find(u => u.id === unitB).xp, 50 + 30 * 150, 'xp mastery dibatasi');
  r = await act(B.token, 'claim', { result: { cleared: 30, won: true, diff: 'hard', map: 'lava', mode: 'classic', bossKills: 3, duration: 5 } });
  assert.strictEqual(r.body.result.cleared, 0, 'durasi tidak masuk akal → tanpa hadiah wave');
  r = await act(B.token, 'evolve', { unitId: unitB });
  assert.strictEqual(r.status, 400, 'batu evolusi kurang');
  // daily login & pencapaian
  r = await act(B.token, 'dailyLogin', {}); assert.strictEqual(r.body.result.diamonds, 40);
  r = await act(B.token, 'dailyLogin', {}); assert.strictEqual(r.body.result.already, true);
  r = await act(B.token, 'achClaim', { id: 'first_game' }); assert.strictEqual(r.body.result.coins, 50);
  r = await act(B.token, 'achClaim', { id: 'first_game' }); assert.strictEqual(r.body.result.already, true);

  // trading (harus berteman)
  vB = (await call('eco.state', { method: 'GET', token: B.token })).body.vault;
  const bGacha = vB.units.find(u => u.tradable);
  assert.strictEqual((await call('trade.create', { token: A.token, body: { to: B.user.id, want: { units: [bGacha.id] } } })).status, 403, 'bukan teman');
  await call('friends.add', { token: A.token, body: { code: B.user.friendCode } });
  await call('friends.respond', { token: B.token, body: { id: A.user.id, accept: true } });
  assert.strictEqual((await call('trade.create', { token: A.token, body: { to: B.user.id, give: { units: [initA.vault.units[0].id] } } })).status, 409, 'unit impor ditolak');
  const tr = (await call('trade.create', { token: A.token, body: { to: B.user.id, give: { diamonds: 100 }, want: { units: [bGacha.id] } } })).body.trade;
  assert(tr && tr.id === undefined && tr._id);
  const list = (await call('trade.list', { method: 'GET', token: B.token })).body.trades;
  assert.strictEqual(list[0].want.units[0].id, bGacha.id);
  r = await call('trade.respond', { token: B.token, body: { id: tr._id, accept: true } });
  assert.strictEqual(r.status, 200, 'trade diterima');
  const vA2 = (await call('eco.state', { method: 'GET', token: A.token })).body.vault, vB2 = (await call('eco.state', { method: 'GET', token: B.token })).body.vault;
  assert(vA2.units.some(u => u.id === bGacha.id), 'unit pindah ke A'); assert(!vB2.units.some(u => u.id === bGacha.id), 'unit hilang dari B');
  assert.strictEqual(vA2.diamonds, initA.vault.diamonds - 100, 'diamond A berkurang'); assert.strictEqual(vB2.diamonds, vB.diamonds + 100, 'diamond B bertambah');
  r = await call('trade.respond', { token: B.token, body: { id: tr._id, accept: true } });
  assert.strictEqual(r.status, 404, 'trade tidak bisa diulang');
  // trade gagal jika unit sudah tidak dimiliki
  const tr2 = (await call('trade.create', { token: B.token, body: { to: A.user.id, want: { units: [bGacha.id] } } })).body.trade;
  await act(A.token, 'scrap', { unitIds: [bGacha.id] });
  assert.strictEqual((await call('trade.respond', { token: A.token, body: { id: tr2._id, accept: true } })).status, 409, 'unit sudah di-scrap');

  // top up
  r = await call('pay.create', { token: A.token, body: { pack: 'p330' } });
  assert.strictEqual(r.status, 200); const order = r.body.orderId;
  const before = (await call('eco.state', { method: 'GET', token: A.token })).body.vault.gems;
  const notif = { order_id: order, status_code: '200', gross_amount: '75000.00', transaction_status: 'settlement' };
  assert.strictEqual((await call('pay.notify', { body: { ...notif, signature_key: 'salah' } })).status, 403, 'signature palsu ditolak');
  notif.signature_key = crypto.createHash('sha512').update(order + '200' + '75000.00' + process.env.MIDTRANS_SERVER_KEY).digest('hex');
  assert.strictEqual((await call('pay.notify', { body: notif })).status, 200);
  assert.strictEqual((await call('pay.notify', { body: notif })).status, 200, 'notifikasi ganda aman');
  const after = (await call('eco.state', { method: 'GET', token: A.token })).body.vault.gems;
  assert.strictEqual(after - before, 330, 'permata dikreditkan sekali');
  // status via API
  const o2 = (await call('pay.create', { token: A.token, body: { pack: 'p60' } })).body.orderId;
  midStatus[o2] = { transaction_status: 'pending', gross_amount: '15000.00' };
  assert.strictEqual((await call('pay.status', { method: 'GET', token: A.token, query: { order: o2 } })).body.status, 'pending');
  midStatus[o2] = { transaction_status: 'settlement', gross_amount: '15000.00' };
  assert.strictEqual((await call('pay.status', { method: 'GET', token: A.token, query: { order: o2 } })).body.status, 'paid');
  assert.strictEqual((await call('eco.state', { method: 'GET', token: A.token })).body.vault.gems, after + 60);
  assert.strictEqual((await call('pay.status', { method: 'GET', token: B.token, query: { order: o2 } })).status, 404, 'tidak bisa cek transaksi orang lain');
  console.log('✅ Semua uji ekonomi, trading & top up lulus');
})().catch(e => { console.error('❌', e); process.exit(1); });
