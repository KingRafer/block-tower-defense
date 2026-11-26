# Changelog

## [4.8.1] — 2026-11-27
### Ditambahkan
- **Panel Developer → 🔄 Refresh & Alat**: tombol **Refresh semua pemain** dan **Bersihkan cache & refresh** (hapus cache aplikasi/service worker) dengan pesan opsional.
  Game setiap pemain mengecek perintah ini tiap ±45 detik (dan saat tab dibuka kembali), menampilkan hitung mundur 5 detik lalu memuat ulang.
  Permainan solo yang sedang di tengah wave ditunggu sampai wave selesai (maks 90 detik) agar progres tersimpan; pemain mabar menunggu sampai permainan selesai.
  Progres, akun & simpanan tidak dihapus. Pengumuman/event/harga dari panel developer juga ikut diperbarui langsung tanpa reload.

## [4.8.0] — 2026-11-26
### Ditambahkan
- **Jual unit**: jual satuan (💰 Jual, nilai sesuai kelangkaan) & **Jual Massal** per kelangkaan (opsi sisakan 1 terbaik per jenis; unit terkunci, terpasang & hasil evolusi tidak ikut).
- **Auto Jual** (Unit → ⚙️ Auto Jual): unit hasil Summon dengan kelangkaan terpilih (Biasa/Langka/Epik/Legendaris) langsung dijual bila jenisnya sudah dimiliki. Unit jenis baru selalu disimpan; Mitos & Rahasia tidak pernah dijual otomatis.
- **Unit eksklusif Beta: Penambang Emas** — kode redeem `EARLYACC` (sekali per akun, + 💎300). Setiap pukulan beliung menghasilkan emas (+$4 → +$24 per hit), cocok untuk grinding awal. Tidak bisa didapat dari Summon & tidak bisa ditukar.
- Ikon tower di bar permainan & panel tower kini memakai gambar karakter unit.
### Diubah
- **Detail unit lebih ringkas**: header kecil + tombol Pasang/Kunci/Jual di atas, statistik/trait/evolusi/skin dalam tab. Tombol **＋** di setiap kartu untuk pasang/lepas loadout cepat.
- **Gameplay HP (lanskap)**: map penuh setinggi layar; statistik & skill di kolom kiri, tombol & tower di kolom kanan; panel tower jadi kartu kecil di sisi map.

## [4.7.0] — 2026-11-26
### Diperbaiki
- **Auto skip**: mode Auto sekarang memulai wave otomatis (termasuk wave pertama) **dan** men-skip otomatis 1,5 detik setelah semua musuh wave keluar (bonus skip tetap didapat). Hitung mundur tampil di layar. Host mabar juga bisa memakai Auto.
- **Tombol Skip kadang tidak bisa diklik**: label tombol (bonus emas) tidak lagi dibuat ulang setiap 0,15 detik, sehingga klik tidak hilang.
### Diubah
- **Semua layar menu di HP muat dalam 1 layar** (potret & lanskap): header & tab menempel di atas, isi bergulir di dalam; grid unit 5 kolom, skill/toko/map/pencapaian lebih ringkas; di lanskap konten memakai 2 kolom.
- Slot skill memakai gaya seragam (navy + emas).

## [4.6.0] — 2026-11-26
### Ditambahkan
- **Unit RAHASIA** (kelangkaan baru, sangat langka): Malaikat Maut (aura sabit kehampaan) & Kaisar Kosmik (bintang jatuh berantai) — peluang Summon 0,03%, Lucky 0,15%, atau dari Toko Pass.
- **Index Unit** di menu Summon: semua 27 unit terlihat bentuknya (normal & evolusi), statistik, peluang per tarikan, dan status koleksi.
- **Misi Pass** (berlaku satu season) yang memberi XP Pass + 🎟️ Token.
- **Toko Pass**: tukar 🎟️ Token (dari klaim tier & misi pass) dengan Diamond, Koin, Kristal, Batu Evolusi, unit Legendaris/Mitos/RAHASIA acak, dan skin season — stok per season.
### Diubah
- **Tema UI serasi "Midnight & Gold"**: semua panel, tile, kartu & tombol memakai satu palet (navy + aksen emas), tidak lagi warna-warni.
- **Latar menu baru** untuk semua layar: langit sesuai jam WIB, sinar matahari berputar, bintang berkelip, 3 lapis pegunungan bersalju, kastil dengan jendela menyala, deretan pohon, kunang-kunang.
- **Menu utama di HP muat dalam 1 layar** tanpa scroll; room mabar di HP juga lebih ringkas.

## [4.5.0] — 2026-11-26
### Ditambahkan
- **6 unit baru (total 25)**: Pemanah (Biasa), Shotgunner (Langka), Ninja (Epik), Samurai & Penyihir (Legendaris), Malaikat Agung (Mitos) — lengkap dengan evolusi.
- **Karakter unit detail** (`js/chars.js`): setiap unit punya kostum, penutup kepala, wajah, perlengkapan punggung & senjata sendiri
  (topi koboi, masker gas, helm samurai, topi penyihir, sayap malaikat, jetpack, dll.), menghadap ke arah musuh, animasi senjata.
  Farm, Nuklir & Naga digambar ulang lebih detail.
### Diubah
- **Room mabar** didesain ulang: kartu pemain berwarna, pilihan map bergambar, pilihan kesulitan/mode bergaya segmen, bar MULAI menempel di bawah.
- Tampilan HP lebih rapi: tombol, kartu, tile & header lebih kecil.
### Diperbaiki
- Tata letak room rusak karena nama class bentrok dengan latar menu utama.

## [4.4.0] — 2026-11-26
### Diubah
- **Menu utama baru "Markas"**: langit hidup sesuai jam WIB (pagi/siang/senja/malam), awan bergerak, tim unit tampil di panggung (hover = statistik),
  banner Unit Unggulan dengan Summon ×1/×10 langsung + hitung mundur, kartu Event / Season Pass / Tantangan Harian / Login Harian, widget misi, tombol MAIN & MABAR besar.
- **Bonus emas Skip jauh lebih besar**: 150 + 40×wave + 15×musuh tersisa (sebelumnya 25 + 10×wave).
### Performa
- Server API dipindah ke **Singapura (sin1)**, satu region dengan database → respons jauh lebih cepat dari Indonesia.
- Canvas game tidak digambar ulang saat menu menutupi layar; efek blur latar dihapus (berat di HP).
- Umpan balik tombol instan + indikator loading; animasi layar dipercepat; sinkron mabar lebih sering (60 ms).

## [4.3.0] — 2026-11-26
### Ditambahkan
- **Aplikasi (PWA)**: tombol ⬇️ Download di menu utama — pasang di Android, iPhone/iPad, dan PC; layar penuh, ikon sendiri, bisa main solo saat offline.
- **Misi harian & mingguan** dengan hadiah 💎/🪙/✨/🔮 + XP Season Pass (dicek di server).
- **Season Pass** bulanan 30 tier: jalur gratis (unit Epik di tier 30) & Premium 💠 (skin eksklusif tier 15, unit Mitos tier 30).
- **Kode Redeem**: dibuat dari Panel Developer (hadiah, kuota, masa berlaku), sekali per akun.
### Diubah
- Menu utama lebih bersih: dock ikon (Summon, Unit, Skill, Misi, Pass, Toko, Teman, Lainnya) + badge hadiah siap diambil; menu lain dipindah ke "Lainnya".
- 💠 Permata (top up) selalu mulai dari 0 untuk semua akun.

## [4.2.0] — 2026-11-26
### Ditambahkan
- **Panel Developer** (khusus akun `rafermazaya@gmail.com`, diatur lewat env `ADMIN_EMAILS`; diperiksa di server + email Google terverifikasi):
  ringkasan statistik & pendapatan, cari/kelola pemain (beri/kurangi mata uang, beri/ubah/hapus unit, buka semua skill/skin, blokir, reset inventori),
  pengaturan game global (pengumuman, maintenance, top up on/off, event pengali koin/diamond, unit unggulan, harga & rate summon/lucky, pity, hadiah login, harga skill),
  daftar transaksi + kredit manual, riwayat trading, moderasi papan skor, log audit, alat uji di dalam permainan (uang, HP, god mode, bunuh semua, lompat wave, spawn boss).
- Skill premium harus **dibuka sekali** (🪙/💎), setelah itu bebas dipakai. Airstrike, Freeze, Repair gratis.
- Pengumuman & status maintenance tampil di menu utama.

## [4.1.0] — 2026-11-26
### Ditambahkan
- **💎 Diamond**: mata uang gratis dari bermain (wave, boss, menang, Tantangan Harian), login harian & pencapaian — untuk Summon biasa dan trading.
- **🍀 Lucky Summon** memakai 💠 Permata (top up): peluang Legendaris 9% & Mitos 2%, pity 30, 10× menjamin Legendaris.
- **10 musuh baru**: Kelelawar (terbang, kebal Demoman/Meriam/Mortir), Pencuri (mencuri uang), Kesatria Perisai, Pengamuk, Dukun (menyembuhkan), Bunglon (menghilang berkala), Peledak (stun tower saat mati), Raksasa, Nekromancer (memanggil kerangka), dan mini-boss **Golem Batu** (wave 15, 25, 35…).
- **Dukungan HP**: layout responsif portrait & landscape, ketuk dua kali untuk memasang tower/skill, panel tower model bottom sheet, tombol layar penuh (mengunci landscape), saran memutar layar, arena selalu muat di layar.
- Halaman Kebijakan Privasi & Syarat Ketentuan.

### Diubah
- **Skill tidak terbatas** — semua 10 skill gratis, hanya ada cooldown; pilih 4 di menu Skill.
- Trading memakai 💎 Diamond (Permata tidak bisa diperdagangkan).
- Ikon Kristal Trait menjadi ✨.

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
