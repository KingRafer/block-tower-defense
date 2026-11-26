/* Uji API dengan MongoDB palsu: node test/api.test.js */
'use strict';
const path = require('path');
process.env.MONGO_MODULE = path.join(__dirname, 'fake-mongodb.js');
process.env.MONGODB_URI = 'mongodb://fake';
process.env.SESSION_SECRET = 'test-secret-1234567890-abcdef';
process.env.DEV_AUTH = '1';
const handler = require('../api/index.js');
const assert = require('assert');

function call(r, { method = 'POST', body = {}, query = {}, token } = {}) {
  return new Promise(resolve => {
    const req = { method, query: { r, ...query }, body, headers: token ? { authorization: 'Bearer ' + token } : {} };
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, body: o }); }, end() { resolve({ status: this.statusCode, body: null }); } };
    handler(req, res);
  });
}

(async () => {
  const A = (await call('auth.dev', { body: { name: 'Alice' } })).body, B = (await call('auth.dev', { body: { name: 'Bobby' } })).body;
  assert(A.token && B.token, 'login dev');
  assert.strictEqual((await call('me', { method: 'GET' })).status, 401, 'tanpa token ditolak');
  assert.strictEqual((await call('me', { method: 'GET', token: A.token + 'x' })).status, 401, 'token palsu ditolak');

  // profil
  await call('profile.save', { token: A.token, body: { profile: { xp: 500, coins: 10 }, updatedAt: Date.now(), level: 3 } });
  const pg = await call('profile.get', { method: 'GET', token: A.token });
  assert.strictEqual(pg.body.profile.xp, 500, 'profil tersimpan');

  // teman
  const add = await call('friends.add', { token: A.token, body: { code: B.user.friendCode } });
  assert.strictEqual(add.body.accepted, false);
  assert.strictEqual((await call('friends.add', { token: A.token, body: { code: B.user.friendCode } })).status, 409);
  let fb = (await call('friends.list', { method: 'GET', token: B.token })).body;
  assert.strictEqual(fb.incoming.length, 1, 'permintaan masuk');
  const pres = (await call('presence', { token: B.token, body: {} })).body;
  assert.strictEqual(pres.requests, 1, 'notif permintaan');
  await call('friends.respond', { token: B.token, body: { id: A.user.id, accept: true } });
  fb = (await call('friends.list', { method: 'GET', token: B.token })).body;
  assert.strictEqual(fb.friends.length, 1, 'berteman');
  assert.strictEqual(fb.friends[0].online, true, 'online');

  // room
  const room = (await call('room.create', { token: A.token, body: { map: 1, diff: 'hard' } })).body.room;
  assert(room.code && room.code.length === 5);
  await call('invite.send', { token: A.token, body: { to: B.user.id, room: room.code } });
  const inv = (await call('presence', { token: B.token, body: {} })).body.invites;
  assert.strictEqual(inv[0].room, room.code, 'undangan diterima');
  const j = await call('room.join', { token: B.token, body: { code: room.code.toLowerCase() } });
  assert.strictEqual(j.body.room.players.length, 2, 'join');
  assert.strictEqual((await call('room.start', { token: B.token, body: { code: room.code } })).status, 403, 'non-host tidak bisa start');
  await call('room.chat', { token: B.token, body: { code: room.code, text: 'halo <b>' } });
  await call('room.start', { token: A.token, body: { code: room.code } });
  const rg = (await call('room.get', { method: 'GET', token: B.token, query: { code: room.code } })).body.room;
  assert.strictEqual(rg.state, 'playing'); assert.strictEqual(rg.chat[0].t, 'halo b');

  // relay
  await call('relay.send', { token: A.token, body: { room: room.code, msgs: [{ to: B.user.id, d: { t: 'snap', n: 1 } }, { to: B.user.id, d: { t: 'snap', n: 2 } }] } });
  const pol = (await call('relay.poll', { method: 'GET', token: B.token, query: { room: room.code } })).body.msgs;
  assert.deepStrictEqual(pol.map(m => m.d.n), [1, 2], 'relay berurutan');
  assert.strictEqual((await call('relay.poll', { method: 'GET', token: B.token, query: { room: room.code } })).body.msgs.length, 0, 'relay terhapus');
  const C = (await call('auth.dev', { body: { name: 'Carol' } })).body;
  assert.strictEqual((await call('relay.send', { token: C.token, body: { room: room.code, msgs: [] } })).status, 403, 'bukan anggota');

  // leaderboard
  await call('lb.submit', { token: A.token, body: { score: 1000, wave: 10, mode: 'classic' } });
  await call('lb.submit', { token: A.token, body: { score: 2000, wave: 12, mode: 'classic' } });
  await call('lb.submit', { token: B.token, body: { score: 1500, wave: 11, mode: 'classic' } });
  const lb = (await call('lb.get', { method: 'GET', query: { mode: 'classic' } })).body.top;
  assert.deepStrictEqual(lb.map(x => x.score), [2000, 1500], 'leaderboard unik per pemain');

  await call('room.leave', { token: A.token, body: { code: room.code } });
  const after = (await call('room.get', { method: 'GET', token: B.token, query: { code: room.code } })).body.room;
  assert.strictEqual(after.host, B.user.id); assert.strictEqual(after.state, 'closed', 'host keluar saat main → closed');
  assert.strictEqual((await call('nope', {})).status, 404);
  console.log('✅ Semua uji API lulus');
})().catch(e => { console.error('❌', e); process.exit(1); });
