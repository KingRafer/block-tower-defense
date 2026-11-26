/* Uji panel developer: hak akses, kelola pemain, pengaturan global, maintenance, blokir */
'use strict';
const path = require('path'), assert = require('assert');
process.env.MONGO_MODULE = path.join(__dirname, 'fake-mongodb.js');
process.env.MONGODB_URI = 'mongodb://fake';
process.env.MONGODB_DB = 'feat_test';
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
  const AD = (await call('auth.dev', { body: { name: 'Rafer', email: 'rafermazaya@gmail.com' } })).body;
  const P = (await call('auth.dev', { body: { name: 'Pemain' } })).body;
  const act = (action, payload, tok = P.token) => call('eco.act', { token: tok, body: { action, payload } });
  let v = (await call('eco.state', { method: 'GET', token: P.token })).body.vault;
  assert.strictEqual(v.gems, 0, 'permata awal 0');
  // misi: belum selesai
  assert.strictEqual((await act('missionClaim', { kind: 'daily', id: 'd_summon' })).status, 400);
  await act('summon', { banner: 'std', count: 1 }); await act('summon', { banner: 'std', count: 1 });
  await call('admin.grant', { token: AD.token, body: { id: P.user.id, currency: 'diamonds', amount: 1000 } });
  await act('summon', { banner: 'std', count: 10 });
  let r = await act('missionClaim', { kind: 'daily', id: 'd_summon' });
  assert.strictEqual(r.status, 200, 'misi summon selesai'); assert.strictEqual(r.body.result.pxp, 100);
  assert.strictEqual((await act('missionClaim', { kind: 'daily', id: 'd_summon' })).status, 400, 'tidak bisa diklaim 2x');
  assert.strictEqual(r.body.vault.pass.xp, 100);
  assert.strictEqual(r.body.vault.missions.w.summons, 12, 'progres mingguan');
  // pass: belum cukup XP
  assert.strictEqual((await act('passClaim', { tier: 'all' })).status, 400);
  assert.strictEqual((await act('passBuy', {})).status, 400, 'permata kurang');
  // kode redeem
  r = await call('admin.codeCreate', { token: AD.token, body: { code: 'rilis-2026', rewards: { gems: 400, diamonds: 100, unit: 'dragon' }, maxUses: 1 } });
  assert.strictEqual(r.body.code._id, 'RILIS2026');
  assert.strictEqual((await call('redeem', { token: P.token, body: { code: 'salah' } })).status, 404);
  r = await call('redeem', { token: P.token, body: { code: 'rilis2026' } });
  assert.strictEqual(r.status, 200); assert.strictEqual(r.body.vault.gems, 400); assert(r.body.vault.units.some(u => u.type === 'dragon'));
  assert.strictEqual((await call('redeem', { token: P.token, body: { code: 'RILIS2026' } })).status, 409, 'sekali per akun');
  assert.strictEqual((await call('redeem', { token: AD.token, body: { code: 'RILIS2026' } })).status, 410, 'kuota habis');
  assert.strictEqual((await call('admin.codes', { method: 'GET', token: AD.token })).body.codes[0].uses, 1);
  // pass premium + klaim semua
  r = await act('passBuy', {}); assert.strictEqual(r.body.vault.gems, 100); assert.strictEqual(r.body.vault.pass.premium, true);
  // simulasikan XP pass (vault diubah langsung lewat game): 5 tier
  const DB = require(process.env.MONGO_MODULE); // fake db: tambah xp
  const users = new DB.MongoClient().db('feat_test').collection('users');
  const u = await users.findOne({ _id: P.user.id }); u.vault.pass.xp = SHARED.PASS.xpPerTier * 5;
  await users.updateOne({ _id: P.user.id }, { $set: { vault: u.vault } });
  r = await act('passClaim', { tier: 'all' });
  assert.strictEqual(r.body.result.claimed.length, 10, '5 tier gratis + 5 premium');
  assert.strictEqual((await act('passClaim', { tier: 'all' })).status, 400, 'tidak ada lagi');
  // hadiah klaim permainan menambah misi & pass
  r = await act('claim', { result: { diff: 'normal', cleared: 3, bossKills: 0, duration: 600, mode: 'classic' } });
  assert.strictEqual(r.body.vault.missions.d.games, 1); assert(r.body.result.pxp > 0);
  console.log('✅ Semua uji misi, season pass & kode redeem lulus');
})().catch(e => { console.error('❌', e); process.exit(1); });
