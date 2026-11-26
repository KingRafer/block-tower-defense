# 🌐 Setup Fitur Online (Vercel + MongoDB + Login Google)

Fitur online: **login/daftar dengan Google**, **cloud save**, **teman**, **mabar co-op 2–4 pemain**, dan **papan skor global**.
Tanpa konfigurasi ini game tetap bisa dimainkan offline.

## Arsitektur
```
Browser ──HTTPS──▶ Vercel (/api — satu fungsi serverless) ──▶ MongoDB Atlas (database block_tower_defense)
   │
   └──── WebRTC DataChannel (P2P) ◀──▶ Browser teman   ← jalur utama saat mabar (latensi rendah)
         (jika P2P gagal, pesan otomatis lewat relay /api + MongoDB)
```
- **Host** menjalankan simulasi game, **tamu** mengirim aksi dan menerima snapshot ±10×/detik (P2P) atau ±3×/detik (relay).
- Vercel tidak mendukung server WebSocket permanen, karena itu dipakai WebRTC + relay.

## Collection MongoDB
| Collection | Isi | Index |
|---|---|---|
| `users` | akun (googleId, nama, avatar, kode teman, profil game) | `googleId` unik, `friendCode` unik |
| `friendships` | pasangan teman `{a, b, status, requester}` | `{a,b}` unik |
| `rooms` | room mabar (kode, host, pemain, map, chat) | `code` unik, TTL 6 jam |
| `relay` | pesan antar pemain sementara | TTL 2 menit |
| `invites` | undangan mabar | TTL 10 menit |
| `runs` | skor global | `{mode, score}` |
| `units` | unit milik pemain (trait, evolusi, xp, skin) | `owner` |
| `trades` | penawaran trading | `{to,status}`, `{from,status}` |
| `payments` | transaksi top up Midtrans | `{user, createdAt}` |

Mata uang akun (Permata, koin, material, stok skill) disimpan di `users.vault` dengan kontrol versi.

Index dibuat otomatis oleh server saat pertama dijalankan (`api/_lib/db.js`).

## Environment Variables (Vercel → Project → Settings → Environment Variables)
| Nama | Keterangan |
|---|---|
| `MONGODB_URI` | Connection string MongoDB Atlas (user `btd-app`, akses readWrite ke `block_tower_defense`) |
| `MONGODB_DB` | `block_tower_defense` (opsional) |
| `SESSION_SECRET` | String acak ≥ 32 karakter untuk menandatangani token login |
| `GOOGLE_CLIENT_ID` | OAuth Client ID dari Google Cloud (lihat di bawah) |
| `MIDTRANS_SERVER_KEY` | Server Key Midtrans (sandbox: `SB-Mid-server-...`) |
| `MIDTRANS_CLIENT_KEY` | Client Key Midtrans (sandbox: `SB-Mid-client-...`) |
| `MIDTRANS_PRODUCTION` | `1` untuk produksi; kosongkan untuk sandbox |

Setelah mengubah env, lakukan **Redeploy**.

## Membuat Google OAuth Client ID (±5 menit)
1. Buka **https://console.cloud.google.com/** → buat project baru (mis. *Block Tower Defense*).
2. Menu **APIs & Services → OAuth consent screen** → pilih **External** → isi nama aplikasi & email → *Save*. Di bagian *Audience/Publishing status*, klik **Publish app** agar semua akun Google bisa login.
3. Menu **APIs & Services → Credentials → Create credentials → OAuth client ID**.
4. *Application type*: **Web application**.
5. **Authorized JavaScript origins**: tambahkan domain game, contoh:
   - `https://blocktowerdefense.vercel.app`
   - (opsional untuk uji lokal) `http://localhost:3000`
6. *Authorized redirect URIs* boleh dikosongkan (login memakai popup Google Identity Services).
7. Klik **Create**, salin **Client ID** (berakhiran `.apps.googleusercontent.com`). **Client Secret tidak diperlukan.**
8. Masukkan ke Vercel sebagai `GOOGLE_CLIENT_ID`, lalu **Redeploy**.

## Top up (Midtrans)
1. Daftar/masuk **https://dashboard.midtrans.com** → pilih environment **Sandbox** untuk uji coba.
2. **Settings → Access Keys**: salin *Server Key* dan *Client Key* ke env Vercel.
3. **Settings → Payment → Notification URL**: isi `https://blocktowerdefense.vercel.app/api?r=pay.notify`.
4. Redeploy. Uji dengan simulator pembayaran sandbox Midtrans.
5. Untuk uang asli: selesaikan verifikasi bisnis Midtrans, ganti ke key **Production**, set `MIDTRANS_PRODUCTION=1`.

Permata dikreditkan sekali per transaksi (signature SHA-512 diverifikasi; client juga mengecek status langsung ke Midtrans setelah popup ditutup).

## Uji lokal
```bash
npm install
MONGODB_URI="mongodb+srv://..." SESSION_SECRET="rahasia-lokal-minimal-32-karakter" \
GOOGLE_CLIENT_ID="...apps.googleusercontent.com" DEV_AUTH=1 node dev-server.js
# buka http://localhost:3000
```
`DEV_AUTH=1` mengaktifkan tombol *Login uji coba* (tanpa Google) — **otomatis nonaktif di production**.

Uji API tanpa database sungguhan:
```bash
node test/api.test.js
node test/eco.test.js
```

## Keamanan & batasan
- Token Google diverifikasi di server (audience = `GOOGLE_CLIENT_ID`), lalu server menerbitkan token sesi bertanda tangan HMAC (berlaku 30 hari).
- IP access list Atlas dibuka `0.0.0.0/0` karena IP Vercel dinamis; akses tetap dilindungi user & password database.
- Game berjalan di browser, jadi progres/skor tidak 100% anti-cheat.
- Saat mabar, **host sebaiknya tidak memindahkan tab** ke latar belakang karena browser memperlambat game di tab yang tidak aktif.
