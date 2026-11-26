/* Uji panel developer: hak akses, kelola pemain, pengaturan global, maintenance, blokir */
'use strict';
const path = require('path'), assert = require('assert');
process.env.MONGO_MODULE = path.join(__dirname, 'fake-mongodb.js');
process.env.MONGODB_URI = 'mongodb://fake';
process.env.MONGODB_DB = 'admin_test';
process.env.SESSION_SECRET = 'test-secret-1234567890-abcdef';
process.env.DEV_AUTH = '1';
process.env.MIDTRANS_SERVER_KEY = 'SB-x';
global.fetch = async (url, opt) => ({ ok: true, json: async () => ({ token: 't', redirect_url: 'x' }) });
const handler = require('../api/index.js');
const SHARED = require('../js/shared.js');
function call(r, { method = 'POST', body = {}, query = {}, token } = {}) {
  return new Promise(resolve => {
    const req = { method, query: { r, ...query }, body, headers: token ? { authorization: 'Bearer ' + token } : {} };
    const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(o) { resolve({ status: this.statusCode, body: o }); }, end() { resolve({ status: this.statusCode }); } };
    handler(req, res);
  });
}
(async () => {
  const AD = (await call('auth.dev', { body: { name: 'Rafer', email: 'RaferMazaya@gmail.com' } })).body;
  const P = (await call('auth.dev', { body: { name: 'Pemain', email: 'orang@gmail.com' } })).body;
  assert.strictEqual(AD.user.isAdmin, true, 'email admin dikenali');
  assert.strictEqual(P.user.isAdmin, false);
  assert.strictEqual((await call('admin.stats', { method: 'GET', token: P.token })).status, 403, 'non-admin ditolak');
  const st = (await call('admin.stats', { method: 'GET', token: AD.token })).body;
  assert(st.users >= 2);
  const found = (await call('admin.search', { method: 'GET', token: AD.token, query: { q: 'orang@' } })).body.users;
  assert.strictEqual(found[0].id, P.user.id, 'cari pemain via email');
  // kelola vault
  await call('eco.state', { method: 'GET', token: P.token });
  let r = await call('admin.grant', { token: AD.token, body: { id: P.user.id, currency: 'diamonds', amount: 5000 } });
  assert.strictEqual(r.body.vault.diamonds, 5300, 'grant diamond');
  r = await call('admin.grant', { token: AD.token, body: { id: P.user.id, currency: 'coins', amount: -99 } });
  assert.strictEqual(r.body.vault.coins, 0, 'tidak bisa minus');
  r = await call('admin.unitGive', { token: AD.token, body: { id: P.user.id, type: 'dragon', trait: 'dewa', evo: true, xp: 9000, count: 2 } });
  const drag = r.body.vault.units.filter(u => u.type === 'dragon');
  assert.strictEqual(drag.length, 2); assert.strictEqual(drag[0].trait, 'dewa'); assert.strictEqual(drag[0].evo, true);
  r = await call('admin.unitEdit', { token: AD.token, body: { id: P.user.id, unitId: drag[0].id, fields: { trait: 'midas', skin: 'gold', lock: true } } });
  assert.strictEqual(r.body.vault.units.find(u => u.id === drag[0].id).trait, 'midas');
  r = await call('admin.unitDelete', { token: AD.token, body: { id: P.user.id, unitId: drag[1].id } });
  assert(!r.body.vault.units.some(u => u.id === drag[1].id));
  r = await call('admin.unlockAll', { token: AD.token, body: { id: P.user.id, what: 'all' } });
  assert.strictEqual(r.body.vault.skills.length, Object.keys(SHARED.SKILL_PRICES).length);
  assert(SHARED.UNIT_TYPES.every(t => r.body.vault.units.some(u => u.type === t)));
  // skill unlock oleh pemain biasa
  const Q = (await call('auth.dev', { body: { name: 'Qori' } })).body;
  let v = (await call('eco.state', { method: 'GET', token: Q.token })).body.vault;
  assert.deepStrictEqual(v.skills, SHARED.FREE_SKILLS, 'skill gratis awal');
  assert.strictEqual((await call('eco.act', { token: Q.token, body: { action: 'unlockSkill', payload: { skill: 'storm' } } })).status, 400, 'diamond kurang');
  await call('admin.grant', { token: AD.token, body: { id: Q.user.id, currency: 'diamonds', amount: 1000 } });
  r = await call('eco.act', { token: Q.token, body: { action: 'unlockSkill', payload: { skill: 'storm' } } });
  assert(r.body.vault.skills.includes('storm')); assert.strictEqual(r.body.vault.diamonds, 800);
  // pengaturan global
  r = await call('admin.setGlobal', { token: AD.token, body: { global: { announcement: { text: 'Event x2!', active: true }, event: { rewardMul: 2, featured: 'nuke' }, gacha: { cost1: 25, rates: { mythic: 5 } }, skillPrices: { rewind: { diamonds: 10 } } } } });
  assert.strictEqual(r.body.global.gacha.cost1, 25);
  const cfg = (await call('config', { method: 'GET' })).body.global;
  assert.strictEqual(cfg.announcement.text, 'Event x2!'); assert.strictEqual(cfg.event.featured, 'nuke');
  r = await call('eco.act', { token: Q.token, body: { action: 'summon', payload: { banner: 'std', count: 1 } } });
  assert.strictEqual(r.body.vault.diamonds, 775, 'harga gacha mengikuti pengaturan');
  r = await call('eco.act', { token: Q.token, body: { action: 'unlockSkill', payload: { skill: 'rewind' } } });
  assert.strictEqual(r.status, 200, 'harga skill mengikuti pengaturan'); assert.strictEqual(r.body.vault.diamonds, 765);
  // maintenance
  await call('admin.setGlobal', { token: AD.token, body: { global: { ...cfg, maintenance: true, maintenanceMsg: 'Update' } } });
  assert.strictEqual((await call('eco.state', { method: 'GET', token: Q.token })).status, 503, 'maintenance menahan pemain');
  assert.strictEqual((await call('eco.state', { method: 'GET', token: AD.token })).status, 200, 'admin tetap bisa masuk');
  assert.strictEqual((await call('config', { method: 'GET' })).status, 200);
  await call('admin.setGlobal', { token: AD.token, body: { global: { ...cfg, maintenance: false } } });
  // ban
  await call('admin.ban', { token: AD.token, body: { id: Q.user.id, banned: true, reason: 'cheat' } });
  r = await call('eco.state', { method: 'GET', token: Q.token });
  assert.strictEqual(r.status, 403); assert(/cheat/.test(r.body.error));
  assert.strictEqual((await call('admin.ban', { token: AD.token, body: { id: AD.user.id, banned: true } })).status, 400, 'admin tidak bisa diblokir');
  await call('admin.ban', { token: AD.token, body: { id: Q.user.id, banned: false } });
  assert.strictEqual((await call('eco.state', { method: 'GET', token: Q.token })).status, 200, 'buka blokir');
  // transaksi manual
  const ord = (await call('pay.create', { token: Q.token, body: { pack: 'p60' } })).body.orderId;
  r = await call('admin.credit', { token: AD.token, body: { orderId: ord } });
  assert.strictEqual(r.body.status, 'paid');
  assert.strictEqual((await call('eco.state', { method: 'GET', token: Q.token })).body.vault.gems, 60);
  // reset & log
  r = await call('admin.resetVault', { token: AD.token, body: { id: Q.user.id } });
  assert.strictEqual(r.body.vault.units.length, SHARED.STARTER_UNITS.length);
  const lg = (await call('admin.log', { method: 'GET', token: AD.token })).body.log;
  assert(lg.length >= 8 && lg[0].admin === 'rafermazaya@gmail.com');
  // refresh semua pemain
  assert.strictEqual((await call('admin.forceRefresh', { token: P.token, body: { mode: 'clear' } })).status, 403, 'non-admin ditolak');
  r = await call('admin.forceRefresh', { token: AD.token, body: { mode: 'clear', msg: 'Update!' } });
  assert.strictEqual(r.body.refresh.mode, 'clear'); const rv = r.body.refresh.v;
  let cf = (await call('config', { method: 'GET' })).body.global.refresh;
  assert.strictEqual(cf.v, rv); assert.strictEqual(cf.msg, 'Update!');
  await call('admin.setGlobal', { token: AD.token, body: { global: { maintenance: false } } });
  assert.strictEqual((await call('config', { method: 'GET' })).body.global.refresh.v, rv, 'simpan pengaturan global tidak menghapus perintah refresh');
  await call('admin.setGlobal', { token: AD.token, body: { global: {} } });
  console.log('✅ Semua uji panel developer lulus');
})().catch(e => { console.error('❌', e); process.exit(1); });
