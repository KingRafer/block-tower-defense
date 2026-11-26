# Changelog

## [4.0.0] — 2026-11-26
### Ditambahkan
- **11 unit baru** (total 19): Gunslinger, Meriam, Pembakar, Mortir, Tesla, Laser, Racun, Railgun, Penjaga Waktu, Nuklir, Naga Api — dengan mekanik petir berantai, sinar yang memanas, racun, tembus garis, aura, jarak minimum, dan evolusi masing-masing.
- **Sistem Gacha**: semua unit didapat lewat Summon (💠 Permata), Banner Standar & Unggulan harian, pity 60, jaminan Epik di 10×, animasi kartu.
- **Inventaris unit**: setiap unit adalah item tersendiri (trait, evolusi, mastery, skin, kunci, hancurkan untuk material).
- **Trading** unit & Permata antar teman, divalidasi server (anti duplikasi, unit awal/impor tidak bisa ditukar).
- **Top up Permata** lewat Midtrans Snap (verifikasi signature, kredit sekali, cek status).
- **9 skin** kosmetik dengan aksesori.
- **10 skill** (7 baru: Dana Darurat, Radar, Overclock, Perisai Base, Meteor, Putar Waktu, Badai Petir); 4 slot, stok terbatas dibeli di Toko.
- **Toko** (Skill, Skin, Material, Top Up), hadiah login harian (Permata), Permata dari pencapaian & permainan.
- Ekonomi akun disimpan di server (`users.vault` + collection `units`, `trades`, `payments`); logika bersama di `js/shared.js`.
- Uji `test/eco.test.js` (gacha, pity, trait, klaim, trading, top up).

### Diubah
- Pemain tamu: ekonomi lokal; saat login pertama, progres tamu diimpor sekali (dengan batas).
- Profil versi lama otomatis dimigrasikan ke inventaris unit.

## [3.0.0] — 2026-11-26
### Ditambahkan
- **Backend Vercel** (`api/index.js`, satu fungsi serverless) + **MongoDB Atlas** (database `block_tower_defense`: users, friendships, rooms, relay, invites, runs).
- **Login/daftar dengan Google** (Google Identity Services, token diverifikasi server, sesi HMAC 30 hari).
- **Cloud save**: progres otomatis tersimpan ke akun dan disinkronkan antar perangkat.
- **Teman**: kode teman, permintaan pertemanan, status online, notifikasi.
- **Mabar co-op 2–4 pemain**: lobby dengan kode room, pengaturan map/kesulitan/mode oleh host, chat lobby & dalam game, undangan teman, uang & tower per pemain, hadiah kill dibagi rata, trait/evolusi/mastery tiap pemain tetap berlaku.
- Jaringan **WebRTC P2P** dengan fallback **relay server** otomatis.
- **Papan skor global** (Klasik, Endless, Harian, Mabar).
- `dev-server.js`, uji API (`test/api.test.js`) dengan MongoDB palsu.

### Diubah
- **Menu utama didesain ulang**: kartu pemain, tombol main besar (Solo/Mabar/Harian), ubin menu, latar kubus animasi, font Fredoka/Nunito.
- Tata letak HUD, hotbar, panel, dan layar menu lebih rapi dan konsisten.

## [2.2.0] — 2026-11-26
### Ditambahkan
- **Trait**: 14 trait dengan 5 kelangkaan (Biasa–Mitos), roll dengan 💎 Kristal Trait, animasi roll, tabel peluang, konfirmasi sebelum menimpa trait Epik ke atas.
- **Evolusi**: 8 bentuk evolusi dengan pengali statistik & perk unik (×3 tiap tembakan ke-4, critical, burn, freeze, bunga, ramp-up, buff+, misil ganda).
- **Mastery** tower Lv 1–20 (+2% damage/level) dari damage & kill saat bermain.
- Material **💎 Kristal Trait** & **🔮 Batu Evolusi**, didapat dari hadiah game dan **Toko Material**.
- Tampilan: aura & mahkota tower evolusi, permata warna trait, ikon terbakar/beku pada musuh, info trait/evo di hotbar, tooltip & panel.
- Layar hasil menampilkan material dan kenaikan mastery tiap tower.
- 4 pencapaian baru (total 22).

## [2.1.0] — 2026-11-26
### Ditambahkan
- Mode **Endless** (wave tanpa batas, rekor terpisah, musuh makin berat setelah wave 40).
- **Tantangan Harian**: map, kesulitan & 2 modifier acak per hari, hadiah 🪙 500, skor ×1.2.
- 8 **modifier**: Musuh Gesit, Kulit Baja, Modal Besar, Krisis, Tanpa Farm, Jarak Dekat, Base Rapuh, Malam Berkabut.
- 3 **skill pemain** (Serangan Udara, Badai Es, Perbaikan Base) dengan cooldown, terbuka di level 1/3/5.
- **Skip wave** dengan bonus uang.
- **Simpan & lanjutkan**: autosave tiap akhir wave, tombol Lanjutkan di menu utama.
- **Papan skor** lokal (15 terbaik) dan sistem poin.
- **Tips tutorial** untuk pemain baru.
- Layar menu baru: Tantangan Harian, Papan Skor, Skill.
- 4 pencapaian baru (total 18).

## [2.0.0] — 2026-11-26
### Ditambahkan
- Struktur kode modular (`css/`, `js/config|storage|audio|game|render|ui|menu|main.js`).
- Map baru **Gunung Lava** (total 4 map).
- Tower baru: **Commander** (buff) dan **Rocketeer** (anti-boss); setiap level upgrade punya nama.
- Musuh baru: **Penyembuh** (regenerasi), **Pemecah** (pecah saat mati), dan Mini.
- Kemampuan boss: stun tower di sekitar dan memanggil pasukan; bar HP boss di atas layar.
- Progres pemain: koin, XP, level.
- Menu **Tower & Loadout**: buka tower dengan koin, pilih maksimal 6 tower.
- 14 **pencapaian** dengan hadiah koin dan notifikasi.
- Statistik lengkap (win rate, waktu bermain, boss, tower level maks).
- Musik latar prosedural dan pengaturan volume terpisah.
- Pratinjau komposisi wave berikutnya, tooltip tower, alasan gagal pasang tower.
- Statistik per tower (total damage, kills), indikator buff dan stun.
- Pengaturan tambahan: FPS, kualitas partikel, auto-pause saat pindah tab.
- Tombol pintas `T` (target), `F` (kecepatan), `E`, `Del`.
- Workflow deploy GitHub Pages, LICENSE, `.editorconfig`.

### Diubah
- HUD baru dengan bar progres wave dan bar nyawa.
- Peta digambar sekali ke cache (lebih ringan).
- Menu tampil layar penuh dan responsif di HP.

## [1.1.0] — 2026-11-25
- Menu utama, pilih map (3 map), kesulitan, pause, pengaturan, statistik, efek suara.

## [1.0.0] — 2026-11-25
- Rilis pertama: 6 tower, 6 musuh, 30 wave, upgrade, jual, mode target.
