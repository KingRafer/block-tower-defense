/* =========================================================
 * Block Tower Defense — API (satu fungsi serverless Vercel)
 * Rute dipilih lewat query ?r=<nama>, contoh: /api?r=friends.list
 * ========================================================= */
'use strict';

const crypto = require('crypto');
const { db } = require('./_lib/db');
const { signSession, verifySession, verifyGoogleToken } = require('./_lib/auth');

const ONLINE_MS = 70 * 1000;          // dianggap online jika heartbeat < 70 dtk
const MAX_PLAYERS = 4;
const MAX_PROFILE_BYTES = 200 * 1024;
const MAX_RELAY_BYTES = 96 * 1024;

const err = (status, message) => Object.assign(new Error(message), { status });
const rid = (n = 12) => crypto.randomBytes(n).toString('hex');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randCode = n => Array.from(crypto.randomBytes(n), b => CODE_CHARS[b % CODE_CHARS.length]).join('');
const cleanName = s => String(s || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);

function publicUser(u) {
  if (!u) return null;
  return { id: u._id, name: u.name, avatar: u.avatar || '', level: u.level || 1, friendCode: u.friendCode,
           online: !!u.lastSeen && Date.now() - u.lastSeen < ONLINE_MS, roomCode: u.roomCode || null };
}

async function createUser(d, fields) {
  for (let i = 0; i < 5; i++) {
    const doc = { _id: 'u_' + rid(10), friendCode: randCode(6), level: 1, xp: 0, profile: null, profileUpdatedAt: 0,
                  createdAt: Date.now(), lastSeen: Date.now(), ...fields };
    try { await d.collection('users').insertOne(doc); return doc; }
    catch (e) { if (e.code !== 11000) throw e; if (fields.googleId && await d.collection('users').findOne({ googleId: fields.googleId })) return d.collection('users').findOne({ googleId: fields.googleId }); }
  }
  throw err(500, 'Gagal membuat akun');
}

async function requireUser(req, d) {
  const h = req.headers.authorization || '';
  const uid = verifySession(h.startsWith('Bearer ') ? h.slice(7) : '');
  if (!uid) throw err(401, 'Silakan login dulu');
  const u = await d.collection('users').findOne({ _id: uid });
  if (!u) throw err(401, 'Akun tidak ditemukan');
  return u;
}

async function getRoomFor(d, code, uid) {
  const room = await d.collection('rooms').findOne({ code: String(code || '').toUpperCase() });
  if (!room) throw err(404, 'Room tidak ditemukan');
  if (uid && !room.players.some(p => p.id === uid)) throw err(403, 'Kamu bukan anggota room ini');
  return room;
}
const pairKey = (x, y) => (x < y ? { a: x, b: y } : { a: y, b: x });

/* ---------------- HANDLER ---------------- */
const routes = {
  /* Konfigurasi publik untuk client */
  'config': async () => ({ googleClientId: process.env.GOOGLE_CLIENT_ID || '', devAuth: devAuthEnabled() }),

  /* Login / daftar dengan Google (akun dibuat otomatis saat login pertama) */
  'auth.google': async (req, d) => {
    const g = await verifyGoogleToken(req.body && req.body.credential);
    let user = await d.collection('users').findOne({ googleId: g.sub });
    let isNew = false;
    if (!user) { user = await createUser(d, { googleId: g.sub, email: g.email, name: cleanName(g.name) || 'Pemain', avatar: g.picture }); isNew = true; }
    else await d.collection('users').updateOne({ _id: user._id }, { $set: { avatar: g.picture, email: g.email, lastSeen: Date.now() } });
    return { token: signSession(user._id), user: publicUser(user), isNew };
  },

  /* Login uji coba lokal (hanya aktif jika DEV_AUTH=1 dan bukan production) */
  'auth.dev': async (req, d) => {
    if (!devAuthEnabled()) throw err(403, 'Tidak tersedia');
    const name = cleanName(req.body && req.body.name) || 'Tester';
    let user = await d.collection('users').findOne({ devName: name });
    if (!user) user = await createUser(d, { devName: name, name });
    return { token: signSession(user._id), user: publicUser(user), isNew: false };
  },

  'me': async (req, d, u) => ({ user: publicUser(u) }),

  'me.update': async (req, d, u) => {
    const name = cleanName(req.body && req.body.name);
    if (name.length < 3) throw err(400, 'Nama minimal 3 karakter');
    await d.collection('users').updateOne({ _id: u._id }, { $set: { name } });
    return { user: publicUser({ ...u, name }) };
  },

  /* Simpan progres di cloud */
  'profile.get': async (req, d, u) => ({ profile: u.profile || null, updatedAt: u.profileUpdatedAt || 0 }),

  'profile.save': async (req, d, u) => {
    const p = req.body && req.body.profile;
    if (!p || typeof p !== 'object') throw err(400, 'Profil tidak valid');
    const json = JSON.stringify(p);
    if (json.length > MAX_PROFILE_BYTES) throw err(413, 'Profil terlalu besar');
    const updatedAt = Math.min(Number(req.body.updatedAt) || Date.now(), Date.now() + 60000);
    const xp = Math.max(0, Number(p.xp) || 0);
    const level = Math.max(1, Math.min(999, Number(req.body.level) || 1));
    await d.collection('users').updateOne({ _id: u._id }, { $set: { profile: p, profileUpdatedAt: updatedAt, xp, level } });
    return { ok: true, updatedAt };
  },

  /* Heartbeat: status online, room aktif, undangan & permintaan teman baru */
  'presence': async (req, d, u) => {
    const roomCode = req.body && req.body.roomCode ? String(req.body.roomCode).toUpperCase().slice(0, 8) : null;
    await d.collection('users').updateOne({ _id: u._id }, { $set: { lastSeen: Date.now(), roomCode } });
    const invites = await d.collection('invites').find({ to: u._id }).sort({ createdAt: -1 }).limit(5).toArray();
    if (invites.length) await d.collection('invites').deleteMany({ _id: { $in: invites.map(i => i._id) } });
    const requests = await d.collection('friendships').countDocuments({ b: u._id, status: 'pending', requester: { $ne: u._id } })
                   + await d.collection('friendships').countDocuments({ a: u._id, status: 'pending', requester: { $ne: u._id } });
    return { invites: invites.map(i => ({ from: i.fromName, fromId: i.from, room: i.room })), requests };
  },

  /* ---------- Teman ---------- */
  'friends.list': async (req, d, u) => {
    const rows = await d.collection('friendships').find({ $or: [{ a: u._id }, { b: u._id }] }).toArray();
    const otherIds = rows.map(r => (r.a === u._id ? r.b : r.a));
    const users = otherIds.length ? await d.collection('users').find({ _id: { $in: otherIds } }).toArray() : [];
    const byId = Object.fromEntries(users.map(x => [x._id, x]));
    const friends = [], incoming = [], outgoing = [];
    for (const r of rows) {
      const other = publicUser(byId[r.a === u._id ? r.b : r.a]);
      if (!other) continue;
      if (r.status === 'accepted') friends.push(other);
      else if (r.requester === u._id) outgoing.push(other);
      else incoming.push(other);
    }
    friends.sort((x, y) => (y.online - x.online) || x.name.localeCompare(y.name));
    return { friends, incoming, outgoing, myCode: u.friendCode };
  },

  'friends.add': async (req, d, u) => {
    const code = String(req.body && req.body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const other = await d.collection('users').findOne({ friendCode: code });
    if (!other) throw err(404, 'Kode teman tidak ditemukan');
    if (other._id === u._id) throw err(400, 'Itu kode kamu sendiri');
    const key = pairKey(u._id, other._id);
    const exist = await d.collection('friendships').findOne(key);
    if (exist) {
      if (exist.status === 'accepted') throw err(409, 'Sudah berteman');
      if (exist.requester !== u._id) {   // dia sudah mengirim permintaan → langsung terima
        await d.collection('friendships').updateOne(key, { $set: { status: 'accepted', since: Date.now() } });
        return { ok: true, accepted: true, user: publicUser(other) };
      }
      throw err(409, 'Permintaan sudah dikirim');
    }
    await d.collection('friendships').insertOne({ ...key, requester: u._id, status: 'pending', createdAt: Date.now() });
    return { ok: true, accepted: false, user: publicUser(other) };
  },

  'friends.respond': async (req, d, u) => {
    const key = pairKey(u._id, String(req.body && req.body.id));
    const row = await d.collection('friendships').findOne(key);
    if (!row || row.status !== 'pending' || row.requester === u._id) throw err(404, 'Permintaan tidak ditemukan');
    if (req.body.accept) await d.collection('friendships').updateOne(key, { $set: { status: 'accepted', since: Date.now() } });
    else await d.collection('friendships').deleteOne(key);
    return { ok: true };
  },

  'friends.remove': async (req, d, u) => {
    await d.collection('friendships').deleteOne(pairKey(u._id, String(req.body && req.body.id)));
    return { ok: true };
  },

  'invite.send': async (req, d, u) => {
    const to = String(req.body && req.body.to), room = await getRoomFor(d, req.body && req.body.room, u._id);
    const fr = await d.collection('friendships').findOne(pairKey(u._id, to));
    if (!fr || fr.status !== 'accepted') throw err(403, 'Hanya bisa mengundang teman');
    await d.collection('invites').insertOne({ _id: 'i_' + rid(8), to, from: u._id, fromName: u.name, room: room.code, createdAt: new Date() });
    return { ok: true };
  },

  /* ---------- Room mabar ---------- */
  'room.create': async (req, d, u) => {
    const b = req.body || {};
    for (let i = 0; i < 5; i++) {
      const room = { _id: 'r_' + rid(8), code: randCode(5), host: u._id, state: 'lobby',
        players: [{ id: u._id, name: u.name, avatar: u.avatar || '', level: u.level || 1, joinedAt: Date.now() }],
        map: Number(b.map) || 0, diff: ['easy', 'normal', 'hard'].includes(b.diff) ? b.diff : 'normal',
        mode: b.mode === 'endless' ? 'endless' : 'classic', chat: [], createdAt: Date.now(), updatedAt: new Date() };
      try { await d.collection('rooms').insertOne(room); return { room }; }
      catch (e) { if (e.code !== 11000) throw e; }
    }
    throw err(500, 'Gagal membuat room');
  },

  'room.join': async (req, d, u) => {
    const room = await getRoomFor(d, req.body && req.body.code);
    if (room.players.some(p => p.id === u._id)) return { room };
    if (room.state !== 'lobby') throw err(409, 'Permainan di room ini sudah dimulai');
    if (room.players.length >= MAX_PLAYERS) throw err(409, 'Room penuh');
    const player = { id: u._id, name: u.name, avatar: u.avatar || '', level: u.level || 1, joinedAt: Date.now() };
    await d.collection('rooms').updateOne({ _id: room._id }, { $push: { players: player }, $set: { updatedAt: new Date() } });
    return { room: { ...room, players: [...room.players, player] } };
  },

  'room.get': async (req, d, u) => ({ room: await getRoomFor(d, req.query.code, u._id) }),

  'room.leave': async (req, d, u) => {
    const room = await getRoomFor(d, req.body && req.body.code, u._id);
    const rest = room.players.filter(p => p.id !== u._id);
    if (!rest.length || room.host === u._id && room.state === 'lobby' && rest.length === 0) {
      await d.collection('rooms').deleteOne({ _id: room._id });
    } else {
      const host = room.host === u._id ? rest[0].id : room.host;
      await d.collection('rooms').updateOne({ _id: room._id }, { $set: { players: rest, host, updatedAt: new Date(), ...(room.host === u._id && room.state === 'playing' ? { state: 'closed' } : {}) } });
    }
    return { ok: true };
  },

  'room.update': async (req, d, u) => {
    const room = await getRoomFor(d, req.body && req.body.code, u._id);
    if (room.host !== u._id) throw err(403, 'Hanya host');
    const b = req.body, set = { updatedAt: new Date() };
    if (b.map !== undefined) set.map = Math.max(0, Math.min(20, Number(b.map) || 0));
    if (['easy', 'normal', 'hard'].includes(b.diff)) set.diff = b.diff;
    if (['classic', 'endless'].includes(b.mode)) set.mode = b.mode;
    await d.collection('rooms').updateOne({ _id: room._id }, { $set: set });
    return { ok: true };
  },

  'room.chat': async (req, d, u) => {
    const room = await getRoomFor(d, req.body && req.body.code, u._id);
    const text = String(req.body.text || '').replace(/[<>]/g, '').trim().slice(0, 140);
    if (!text) return { ok: true };
    const chat = [...(room.chat || []), { n: u.name, t: text, at: Date.now() }].slice(-30);
    await d.collection('rooms').updateOne({ _id: room._id }, { $set: { chat, updatedAt: new Date() } });
    return { ok: true };
  },

  'room.start': async (req, d, u) => {
    const room = await getRoomFor(d, req.body && req.body.code, u._id);
    if (room.host !== u._id) throw err(403, 'Hanya host yang bisa memulai');
    await d.collection('rooms').updateOne({ _id: room._id }, { $set: { state: 'playing', startedAt: Date.now(), updatedAt: new Date() } });
    return { ok: true };
  },

  /* ---------- Relay pesan antar pemain (signaling WebRTC & cadangan) ---------- */
  'relay.send': async (req, d, u) => {
    const b = req.body || {};
    const room = await getRoomFor(d, b.room, u._id);
    const msgs = Array.isArray(b.msgs) ? b.msgs.slice(0, 40) : [];
    if (JSON.stringify(msgs).length > MAX_RELAY_BYTES) throw err(413, 'Pesan terlalu besar');
    const ids = new Set(room.players.map(p => p.id));
    const ts = Date.now().toString(36);
    const docs = msgs.filter(m => ids.has(m.to) && m.to !== u._id)
      .map((m, i) => ({ _id: ts + String(i).padStart(2, '0') + rid(3), room: room.code, to: m.to, from: u._id, d: m.d, createdAt: new Date() }));
    if (docs.length) await d.collection('relay').insertMany(docs);
    return { ok: true, n: docs.length };
  },

  'relay.poll': async (req, d, u) => {
    const code = String(req.query.room || '').toUpperCase();
    const msgs = await d.collection('relay').find({ room: code, to: u._id }).sort({ _id: 1 }).limit(100).toArray();
    if (msgs.length) await d.collection('relay').deleteMany({ _id: { $in: msgs.map(m => m._id) } });
    return { msgs: msgs.map(m => ({ from: m.from, d: m.d })) };
  },

  /* ---------- Papan skor global ---------- */
  'lb.submit': async (req, d, u) => {
    const b = req.body || {};
    const run = { _id: 'g_' + rid(8), user: u._id, name: u.name, avatar: u.avatar || '',
      score: Math.max(0, Math.min(5e7, Math.round(Number(b.score) || 0))), wave: Math.max(0, Math.min(10000, Number(b.wave) || 0)),
      map: String(b.map || '').slice(0, 20), diff: String(b.diff || '').slice(0, 10), won: !!b.won,
      mode: ['classic', 'endless', 'daily', 'coop'].includes(b.mode) ? b.mode : 'classic', at: Date.now() };
    await d.collection('runs').insertOne(run);
    return { ok: true };
  },

  'lb.get': async (req, d) => {
    const mode = ['classic', 'endless', 'daily', 'coop'].includes(req.query.mode) ? req.query.mode : 'classic';
    const rows = await d.collection('runs').find({ mode }).sort({ score: -1 }).limit(50).toArray();
    const seen = new Set(), top = [];
    for (const r of rows) { if (seen.has(r.user)) continue; seen.add(r.user); top.push({ name: r.name, avatar: r.avatar, score: r.score, wave: r.wave, map: r.map, diff: r.diff, won: r.won, at: r.at }); if (top.length >= 20) break; }
    return { mode, top };
  },
};

const PUBLIC = new Set(['config', 'auth.google', 'auth.dev', 'lb.get']);
function devAuthEnabled() { return process.env.DEV_AUTH === '1' && process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production'; }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const route = String((req.query && req.query.r) || '');
  const fn = routes[route];
  try {
    if (!fn) throw err(404, 'Rute tidak dikenal');
    if (typeof req.body === 'string') { try { req.body = JSON.parse(req.body); } catch (e) { req.body = {}; } }
    const d = route === 'config' ? null : await db();
    const user = PUBLIC.has(route) ? null : await requireUser(req, d);
    const out = await fn(req, d, user);
    res.status(200).json(out);
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(route, e);
    res.status(status).json({ error: status >= 500 && !e.status ? 'Server error' : e.message });
  }
};
