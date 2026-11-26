# Changelog

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
