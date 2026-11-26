# 🧱 Block Tower Defense

Game **tower defense bergaya Roblox** (terinspirasi *Tower Defense Simulator*) yang berjalan langsung di browser.
Dibuat dengan HTML5 Canvas dan JavaScript murni, **tanpa library, tanpa build step, tanpa aset eksternal**.

![Gameplay](docs/screenshot-game.png)

## ▶️ Main Sekarang
- **Online:** https://kingrafer.github.io/block-tower-defense/ (setelah GitHub Pages aktif, lihat [Deploy](#-deploy))
- **Lokal:** clone repo ini lalu buka `index.html` di browser.

```bash
git clone https://github.com/KingRafer/block-tower-defense.git
cd block-tower-defense
# buka index.html, atau jalankan server lokal:
python3 -m http.server 8000   # lalu buka http://localhost:8000
```

## ✨ Fitur
| Kategori | Isi |
|---|---|
| 🗺️ Map | 4 map dengan tema berbeda: Padang Rumput, Gurun Pasir, Kutub Salju, Gunung Lava |
| ⚔️ Kesulitan | Mudah (20 wave), Normal (30 wave), Sulit (40 wave) |
| 🗼 Tower | 8 tower, masing-masing 4–5 level upgrade dengan nama unik |
| 🧟 Musuh | 8 jenis musuh: hidden, armor, regenerasi, pemecah, dan boss |
| 👑 Boss | Muncul tiap 10 wave, bisa **stun** tower dan **memanggil pasukan** |
| 📈 Progres | Koin, XP, dan level pemain yang tersimpan antar sesi |
| 🛒 Toko & Loadout | Buka tower baru dengan koin, bawa maksimal 6 tower per game |
| 🏅 Pencapaian | 14 pencapaian dengan hadiah koin |
| 📊 Statistik | Statistik lengkap dan tabel rekor per map/kesulitan |
| 🔊 Audio | Efek suara dan musik latar yang dibuat langsung oleh browser (WebAudio) |
| ⚙️ Pengaturan | Volume, angka damage, getaran layar, grid, FPS, kualitas partikel, auto-pause |
| 📱 Responsif | Bisa dimainkan di desktop maupun HP (sentuh) |

<p align="center">
  <img src="docs/screenshot-menu.png" width="49%" alt="Menu utama">
  <img src="docs/screenshot-loadout.png" width="49%" alt="Tower & Loadout">
</p>

## 🗼 Tower
| Tower | Harga | Buka | Peran |
|---|---|---|---|
| Scout | $200 | Default | Serba guna, deteksi hidden di Lv 2 |
| Sniper | $350 | Default | Damage besar, jangkauan sangat jauh |
| Demoman | $450 | Default | Roket ledakan area |
| Freezer | $400 | Default | Memperlambat musuh |
| Farm | $250 | Default | Uang tambahan tiap akhir wave |
| Minigunner | $1.200 | 🪙 600 | DPS sangat tinggi |
| Commander | $650 | 🪙 900 | Buff kecepatan tembak & deteksi hidden untuk tower sekitar |
| Rocketeer | $1.500 | 🪙 1.400 | Misil tembus armor, damage ekstra ke boss |

## 🧟 Musuh
| Musuh | Ciri | Mulai |
|---|---|---|
| Zombie | Musuh dasar | Wave 1 |
| Pelari | Cepat, HP kecil | Wave 3 |
| Tank | Lambat, armor 25% | Wave 5 |
| Hantu | Tersembunyi, perlu deteksi hidden | Wave 7 |
| Penyembuh | Memulihkan HP terus-menerus | Wave 9 |
| Berzirah | Armor 50% | Wave 12 |
| Pemecah | Pecah menjadi 2 musuh kecil saat mati | Wave 14 |
| Raja Zombie (boss) | Stun tower & memanggil pasukan | Tiap 10 wave |

## ⌨️ Kontrol
| Tombol | Aksi |
|---|---|
| `1`–`6` | Pilih tower dari loadout |
| Klik | Pasang / pilih tower |
| `Shift` + klik | Pasang tower berulang |
| `Q` / `E` | Upgrade tower terpilih |
| `X` / `Del` | Jual tower terpilih (kembali 60%) |
| `T` | Ganti mode target (Pertama/Terakhir/Terkuat/Terdekat) |
| `Spasi` | Mulai wave |
| `F` | Ganti kecepatan 1x/2x/3x |
| `Esc` / klik kanan | Batal / pause |

## 🗂️ Struktur Proyek
```
block-tower-defense/
├── index.html          # Halaman utama & layout HUD
├── css/style.css       # Semua styling (tema, menu, responsif)
├── js/
│   ├── config.js       # Data balancing: map, tower, musuh, kesulitan, pencapaian
│   ├── storage.js      # Simpan/muat pengaturan & profil (localStorage)
│   ├── audio.js        # Efek suara & musik prosedural (WebAudio)
│   ├── game.js         # Logika inti: wave, tower, musuh, boss, progres
│   ├── render.js       # Menggambar peta, unit, dan efek ke canvas
│   ├── ui.js           # HUD, hotbar, panel tower, tooltip, toast
│   ├── menu.js         # Semua layar menu
│   └── main.js         # Input, game loop, inisialisasi
├── docs/               # Screenshot
└── .github/workflows/  # Deploy otomatis ke GitHub Pages
```

### Menambah konten
- **Tower baru:** tambahkan entri di `TOWERS` dan `TOWER_ORDER` (`js/config.js`), lalu atur bentuk senjatanya di `drawTower` (`js/render.js`).
- **Musuh baru:** tambahkan di `ENEMIES` dan `ENEMY_INTRO`, lalu masukkan ke `buildWave` (`js/game.js`).
- **Map baru:** tambahkan di `MAPS`. Jalur ditulis sebagai titik-titik grid (20×12); titik pertama di kolom `-1` dan titik terakhir di kolom `21`.

## 🚀 Deploy
Repo ini sudah berisi workflow GitHub Actions (`.github/workflows/pages.yml`).
Aktifkan sekali di **Settings → Pages → Build and deployment → Source: GitHub Actions**. Setelah itu setiap push ke `main` otomatis ter-deploy.

## 📄 Lisensi
[MIT](LICENSE) © KingRafer
