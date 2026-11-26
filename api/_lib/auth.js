/* Autentikasi: verifikasi token Google & token sesi (HMAC) */
'use strict';

const crypto = require('crypto');

const SESSION_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw Object.assign(new Error('SESSION_SECRET belum diatur (min. 16 karakter)'), { status: 500 });
  return s;
}
const b64 = buf => Buffer.from(buf).toString('base64url');

function signSession(userId) {
  const payload = b64(JSON.stringify({ u: String(userId), e: Date.now() + SESSION_DAYS * 864e5 }));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expect = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig || ''), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return p.e > Date.now() ? p.u : null;
  } catch (e) { return null; }
}

/** Verifikasi ID token dari Google Identity Services lewat endpoint tokeninfo */
async function verifyGoogleToken(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw Object.assign(new Error('GOOGLE_CLIENT_ID belum diatur'), { status: 500 });
  if (typeof credential !== 'string' || credential.length > 4096) throw Object.assign(new Error('Token tidak valid'), { status: 400 });
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) throw Object.assign(new Error('Token Google ditolak'), { status: 401 });
  const info = await r.json();
  const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  if (info.aud !== clientId || !issOk || Number(info.exp) * 1000 < Date.now())
    throw Object.assign(new Error('Token Google tidak cocok'), { status: 401 });
  return { sub: info.sub, email: info.email, name: info.name || info.given_name || 'Pemain', picture: info.picture || '' };
}

module.exports = { signSession, verifySession, verifyGoogleToken };
