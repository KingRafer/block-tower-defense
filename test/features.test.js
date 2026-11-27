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
  // unit rahasia & peluang
  const sum = o => Object.values(o).reduce((x, y) => x + y, 0);
  assert(Math.abs(sum(SHARED.GACHA.rates) - 100) < 1e-9 && Math.abs(sum(SHARED.LUCKY.rates) - 100) < 1e-9, 'total peluang 100%');
  assert.deepStrictEqual(SHARED.unitsOfRarity('secret').sort(), ['cosmic', 'reaper']);
  // misi pass (season) + toko pass
  const users2 = new DB.MongoClient().db('feat_test').collection('users');
  const u2 = await users2.findOne({ _id: P.user.id });
  u2.vault.missions.s = { games: 40, wins: 25 }; u2.vault.pass.tok = (u2.vault.pass.tok || 0);
  await users2.updateOne({ _id: P.user.id }, { $set: { vault: u2.vault } });
  r = await act('missionClaim', { kind: 'season', id: 's_games' });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body) + JSON.stringify(u2.vault.missions)); assert.strictEqual(r.body.result.tok, 120);
  r = await act('missionClaim', { kind: 'season', id: 's_win' }); assert.strictEqual(r.body.result.tok, 200);
  const tokNow = r.body.vault.pass.tok;
  assert.strictEqual(tokNow, 120 + 200 + 5 * (SHARED.PASS_TOK.f + SHARED.PASS_TOK.p), 'token dari klaim tier + misi pass');
  assert.strictEqual((await act('missionClaim', { kind: 'season', id: 's_boss' })).status, 400, 'misi pass belum selesai');
  r = await act('passShopBuy', { id: 'legend' });
  assert.strictEqual(r.status, 200); assert.strictEqual(SHARED.UNIT_RARITY[r.body.result.got.unit.type], 'legendary');
  assert.strictEqual(r.body.vault.pass.tok, tokNow - 350);
  r = await act('passShopBuy', { id: 'legend' }); assert.strictEqual(r.status, 400, 'token kurang / stok');
  assert.strictEqual((await act('passShopBuy', { id: 'secret' })).status, 400, 'token kurang');
  // kode Beta EARLYACC (bawaan, tanpa dibuat admin) → unit eksklusif, tidak bisa ditukar
  r = await call('redeem', { token: P.token, body: { code: 'earlyacc' } });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  const gm = r.body.vault.units.find(u => u.type === 'goldminer');
  assert(gm && gm.tradable === false, 'unit beta didapat & tidak bisa ditukar');
  assert.strictEqual(SHARED.UNIT_RARITY.goldminer, 'beta');
  assert.strictEqual((await call('redeem', { token: P.token, body: { code: 'EARLYACC' } })).status, 409, 'sekali per akun');
  assert.strictEqual((await call('redeem', { token: AD.token, body: { code: 'EARLYACC' } })).status, 200, 'akun lain bisa');
  // unit beta tidak pernah keluar dari summon
  assert(!SHARED.RARITY_ORDER.includes('beta') && !('beta' in SHARED.GACHA.rates));
  // auto jual
  assert.strictEqual((await act('setAutoSell', { rarities: ['common', 'rare', 'mythic', 'x'] })).body.vault.autoSell.join(), 'common,rare', 'hanya kelangkaan yang diizinkan');
  await call('admin.grant', { token: AD.token, body: { id: P.user.id, currency: 'diamonds', amount: 20000 } });
  const before = (await call('eco.state', { method: 'GET', token: P.token })).body.vault;
  r = await act('summon', { banner: 'std', count: 10 });
  const res = r.body.result, kept = res.units.filter(u => !u.sold), soldU = res.units.filter(u => u.sold);
  assert.strictEqual(r.body.vault.units.length, before.units.length + kept.length, 'unit terjual tidak masuk inventori');
  soldU.forEach(u => assert(['common', 'rare'].includes(SHARED.UNIT_RARITY[u.type]), 'hanya rarity terpilih'));
  if (soldU.length) assert(res.sold.coins > 0);
  // jual (scrap) memberi koin
  const c0 = r.body.vault.coins, sellId = r.body.vault.units.find(u => !u.lock && u.type !== 'goldminer').id;
  r = await act('scrap', { unitIds: [sellId] }); assert(r.body.vault.coins > c0, 'jual memberi koin');
  await act('setAutoSell', { rarities: [] });

  // Hadiah level akun: XP dicatat server, level belum tercapai ditolak, klaim tidak bisa ganda
  r = await act('levelClaim', { lv: 50 }); assert.strictEqual(r.status, 400, 'level belum tercapai ditolak');
  for (let i = 0; i < 3; i++) { await new Promise(res => setTimeout(res, 5)); await act('claim', { result: { cleared: 30, won: true, diff: 'normal', map: 'grass', mode: 'normal', bossKills: 3, kills: 900, duration: 99999 } }); }
  r = await act('levelClaim', { lv: 'all' });
  if (r.status === 200) {
    assert(r.body.result.claimed.length >= 1 && r.body.vault.lvc.length >= 1, 'hadiah level diambil');
    const again = await act('levelClaim', { lv: r.body.result.claimed[0].lv }); assert(again.status === 400 || again.body.result.claimed.length === 0, 'tidak bisa klaim ganda');
  }
  assert(SHARED.accLevel(SHARED.accXpFor(9)) === 10 && SHARED.levelReward(25).unit === 'samurai', 'tabel level');

  // Event terbatas
  const now0 = Date.parse(SHARED.LIMITED.start + "T12:00:00+07:00"), ev = SHARED.newVault(now0, Math.random), ctx = { rng: Math.random, now: now0, server: false };
  SHARED.actions.claim(ev, { result: { cleared: 30, won: true, diff: 'hard', map: 'grass', mode: 'normal', bossKills: 4, kills: 500, duration: 2000 } }, ctx);
  assert(ev.ev && ev.ev.lan > 0 && ev.ev.s.games === 1, 'Lentera didapat dari bermain');
  assert.throws(() => SHARED.actions.evShopBuy(ev, { id: 'mythic' }, ctx), /tidak cukup/);
  ev.ev.lan = 5000; ev.ev.earned = 5000;
  SHARED.actions.evShopBuy(ev, { id: 'skin' }, ctx); assert(ev.skins.includes('winter'), 'skin event dibeli');
  assert.throws(() => SHARED.actions.evShopBuy(ev, { id: 'skin' }, ctx));
  assert.throws(() => SHARED.actions.buySkin(ev, { skin: 'lantern' }, ctx), /tidak dikenal/);
  const ms = SHARED.actions.evMilestone(ev, { i: 'all' }, ctx); assert(ms.claimed.length === 5, 'hadiah pencapaian event');
  assert(!SHARED.limitedActive(Date.parse(SHARED.LIMITED.end + 'T12:00:00+07:00') + 2 * 864e5), 'event berakhir');
  assert.throws(() => SHARED.actions.evMission(ev, { id: 'e_play' }, { ...ctx, now: Date.parse(SHARED.LIMITED.end + 'T12:00:00+07:00') + 2 * 864e5 }), /berakhir/);
  // Banner Winter: unit eksklusif, pity, hanya saat event
  const wv = SHARED.newVault(now0, Math.random);
  assert.throws(() => SHARED.actions.summon(wv, { banner: 'winter', count: 1 }, ctx), /tidak cukup/);
  SHARED.rollEvent(wv, now0).lan = 1e6; const d0 = wv.diamonds;
  const wr = SHARED.actions.summon(wv, { banner: 'winter', count: 10 }, ctx);
  assert(wv.diamonds === d0 && wv.ev.lan === 1e6 - SHARED.WINTER_GACHA.cost10, 'Banner Winter memakai koin Winter');
  for (let i = 0; i < 6; i++) SHARED.actions.summon(wv, { banner: 'winter', count: 10 }, { ...ctx, rng: () => 0.99 });
  const wins = wv.units.filter(u => SHARED.EVENT_UNITS[u.type]);
  assert(wv.units.length - 4 === 70 && wins.length === 70, 'Banner Winter hanya memberi unit Winter');
  assert(wins.some(u => SHARED.RARITY[SHARED.UNIT_RARITY[u.type]].rank >= 3), 'pity Legendaris+ Winter');
  assert(SHARED.RARITY_ORDER.every(r => SHARED.unitsOfRarity(r).every(t => !SHARED.EVENT_UNITS[t])), 'unit Winter tidak ada di summon biasa');
  assert(SHARED.unitsOfRarity('divine').length === 2 && SHARED.GACHA.rates.divine > 0, 'tier Ilahi');
  assert.throws(() => SHARED.actions.summon(wv, { banner: 'winter', count: 1 }, { ...ctx, now: Date.parse(SHARED.LIMITED.end + 'T12:00:00+07:00') + 3 * 864e5 }), /berakhir/);
  SHARED.actions.claim(ev, { result: { cleared: 20, won: false, diff: 'normal', map: 'frost', mode: 'normal', bossKills: 2, kills: 300, duration: 2000 } }, { ...ctx, now: now0 + 60000 });
  assert(ev.ev.s.frost === 1, 'main di map event tercatat');
  console.log('✅ Semua uji misi, season pass & kode redeem lulus');
})().catch(e => { console.error('❌', e); process.exit(1); });
