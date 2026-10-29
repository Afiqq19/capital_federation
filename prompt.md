# 📜 MASTER BLUEPRINT & PROMPT PENGEMBANGAN: MONOPOLY CORP (REPUBLIK KONOHA EDITION)

Dokumen ini adalah acuan arsitektur sistem, aturan game (*game logic*), *world-building*, dan roadmap teknis pemecahan struktur file untuk platform **Monopoly Corp** (Klien Mobile Flutter, Backend Express, dan Web Admin).

---

## 📌 BAGIAN 1: STANDAR PENGEMBANGAN & ATURAN POKOK SISTEM

1. **Tech Stack & Lingkungan Kerja**:
   - **Backend:** Node.js (Express, SQLite `backend/data/monopoly.db`, Socket.io) ➔ Port `4000`.
   - **Web Admin:** React.js 19 + Vite + Tailwind CSS v4 ➔ Port `5173`.
   - **Aplikasi Mobile:** Flutter (Android) ➔ Target: Perangkat Fisik Vivo V2157 (`3466240990000FX`, Android 14 API 34).
   - **Koneksi USB / Reverse:** Wajib `adb reverse tcp:4000 tcp:4000` saat menggunakan koneksi kabel USB ke laptop.

2. **Aturan Struktur Modular (Anti-Monolith)**:
   - **Admin:** Satu menu/fitur = Satu folder dan file tersendiri di `admin/src/pages/<menu>/`. Tidak diperkenankan lagi menulis ribuan baris di satu file `App.jsx`.
   - **Mobile Flutter:** Satu fitur baru = Satu modul folder di `mobile/lib/features/<nama_fitur>/` (`ipo/`, `corporate_deals/`, `court_commercial/`, `macro_konoha/`). Tidak diperkenankan lagi menambah ribuan baris di `home_tab.dart`.

3. **Aturan Sidebar Web Admin (Stationary)**:
   - Sidebar wajib **DIAM/PERMANEN** di sisi kiri saat halaman konten di-scroll (`h-screen overflow-hidden flex` dengan container `<main>` yang `overflow-y-auto`).

4. **Aturan Pengawasan Bursa (Market Surveillance)**:
   - **Radar UMA (Unusual Market Activity):** Peringatan pasar, perdagangan saham **TETAP BERJALAN**. Mendukung auto-engine (volatilitas ekstrem) dan manual admin.
   - **Suspensi Saham:** Perdagangan saham **DIBEKUKAN TOTAL** sampai tanggal yang ditentukan (countdown) atau dicabut manual oleh admin/pelunasan denda.

5. **Indeks Rencana & Dokumentasi Resmi (Folder `doc/`)**:
   - [01_admin_architecture_hosting.md](file:///e:/projeck_web/monopoly_corp/doc/plan_admin/01_admin_architecture_hosting.md): Arsitektur folder & panduan hosting domain publik.
   - [02_market_oversight_guide.md](file:///e:/projeck_web/monopoly_corp/doc/plan_admin/02_market_oversight_guide.md): Panduan teknis Radar UMA vs Suspensi Bursa.
   - [03_konoha_macro_and_court_oversight.md](file:///e:/projeck_web/monopoly_corp/doc/plan_admin/03_konoha_macro_and_court_oversight.md): Kontrol makroekonomi Konoha & pengawasan Pengadilan Niaga.
   - [01_mobile_roadmap.md](file:///e:/projeck_web/monopoly_corp/doc/plan_mobile/01_mobile_roadmap.md): Roadmap pengujian Flutter ke HP fisik Vivo.
   - [02_konoha_ipo_court_architecture.md](file:///e:/projeck_web/monopoly_corp/doc/plan_mobile/02_konoha_ipo_court_architecture.md): Blueprint E-IPO Bookbuilding berjadwal & Pengadilan Niaga (PNAK).

---

## 🏛️ BAGIAN 2: WORLD-BUILDING & NOMENKLATUR RESMI (REPUBLIK KONOHA)

Untuk menjaga orisinalitas, kepatuhan hukum (*disclaimer game simulasi fiktif*), serta menambah keseruan bermain (*gamification*), seluruh instrumen ekonomi tidak menggunakan nama persis dunia nyata, melainkan bertempat di **Negara Republik Konoha**.

### 2.1 Kamus Istilah Resmi Konoha:
| Istilah Dunia Nyata | Nomenklatur Game (Republik Konoha) | Keterangan & Peran |
| :--- | :--- | :--- |
| **IHSG** (Indeks Harga Saham Gabungan) | **IPMC** (*Indeks Pasar Modal Konoha*) | Indeks agregat pergerakan seluruh saham emiten di Konoha. |
| **Bank Indonesia (BI)** | **BSK** (*Bank Sentral Konoha*) | Otoritas moneter: mengatur suku bunga acuan, cetak uang, & fasilitas pinjaman likuiditas. |
| **OJK / Bursa Efek Indonesia (BEI)** | **OPFK / Komite Pengawas Bursa IPMC** | Pengawas pasar modal: berhak menerbitkan status **UMA** dan ketuk palu **Suspensi**. |
| **Mata Uang Rupiah (IDR)** | **IB** (*Indigo Billion / Ichi-Ban Konoha*) | Satuan mata uang resmi negara Konoha dalam game (Murni fiktif, no withdrawal). |
| **Pengadilan Niaga** | **PNAK** (*Pengadilan Niaga & Arbitrase Korporasi Konoha*) | Pengadilan resmi untuk perkara kepailitan (PKPU), sita jaminan, dan sengketa saham. |
| **Kemenkumham / Notaris** | **Balai Notariat & Registrasi Korporasi Konoha** | Menerbitkan nomor registrasi sah untuk Akta Pendirian PT dan Akta Jual Beli Saham. |

### 2.2 Dampak Siklus Perekonomian Negara Konoha (*Macro Engine*):
Portal Web Admin memiliki kendali makro untuk mengatur iklim ekonomi Konoha:
1. **Zaman Kemakmuran (Economic Boom):**
   - Penjualan semua PT naik +30%, omzet melimpah, deviden tinggi, pasar IPMC serentak hijau (*Bullish*).
2. **Kondisi Normal / Stabil:**
   - Pertumbuhan ekonomi standar, inflasi terkendali di 3.0%, suku bunga BSK 6.5%.
3. **Resesi Ekonomi Konoha:**
   - Daya beli pasar menurun, beban operasional PT meningkat +20%, risiko kredit macet naik.
4. **Krisis Moneter & Finansial Konoha:**
   - Suku bunga BSK dinaikkan ke 15%–20%, emiten dengan fundamental di bawah 50 terancam status **KRITIS**, pasar saham IPMC anjlok (*Crash / Bearish*).

---

## 🎮 BAGIAN 3: GAME DESIGN DOCUMENT (GDD) KLIEN PENGGUNA

### 3.1 Informasi Dasar & Kepatuhan Hukum
- **Mata Uang Virtual:** IndoBucks / Indigo Billion (IB) Republik Konoha.
- **Satuan Saham:** 1 Lot = 100 Lembar.
- **Disclaimer Wajib:** Halaman awal aplikasi menampilkan *pop-up* disclaimer: "Monopoly Corp adalah simulasi pasar modal dan konglomerasi fiktif di Republik Konoha. Mata uang IB tidak bernilai riil dan tidak dapat dicairkan (no withdrawal) dalam bentuk apa pun."

### 3.2 Fase Onboarding (Pengguna Baru)
- **Pembuatan Entitas:** Pemain baru mendaftarkan nama PT dan sektor industri (Teknologi, Properti, Keuangan, F&B, dll.).
- **Modal Awal:** Saldo kas pribadi awal IB 10.000.000 sebagai dana tabungan awal.
- **Tutorial Wajib:** Pemain diarahkan membeli 1 Lot saham dari perusahaan bot yang stabil untuk memahami konsep dividen dan *capital gain*.

### 3.3 Struktur Navigasi Utama (5 Bottom Menu)
1. **A. Beranda (Dasbor PT):**
   - Status PT, level operasional, nilai fundamental, dan manajemen upgrade bisnis (Marketing, R&D, SDM, Kapasitas).
   - Kas Pribadi vs Kas PT.
   - News Ticker siaran berita ekonomi makro Konoha realtime.
2. **B. Pasar (Bursa Saham IPMC):**
   - Daftar emiten terdaftar (Bot dan PT Pemain yang sudah IPO).
   - Trading interface grafik candlestick & orderbook 5-level realtime.
   - Tombol Beli & Jual (1 Lot = 100 Lembar).
3. **C. Bursa Aset (Lelang Bank BSK & Akuisisi):**
   - Pasar Negosiasi P2P / B2B untuk akuisisi atau divestasi saham.
   - Lelang Bank BSK untuk aset sitaan dari pemain pailit.
4. **D. Portofolio (Aset & Fasilitas BSK):**
   - Saldo tunai, nilai portofolio saham, laba/rugi (P/L), dan riwayat dividen.
   - Pengajuan pinjaman tunai BSK dengan agunan aset PT/saham dan Credit Score.
5. **E. Peringkat (Leaderboard & Komunitas):**
   - Top 100 Konglomerat Republik Konoha berdasarkan net worth aset.
   - Chat global & status taipan "9 Naga".

### 3.4 Mekanik Hukuman, Pailit & Status Blue Chip
- **Gagal Bayar (Default):** Jika cicilan pinjaman BSK tidak dibayar saat jatuh tempo, debitur diseret ke Pengadilan Niaga Konoha (PNAK) untuk sita eksekusi jaminan.
- **Bailout (Dana Talangan):** Pemain bangkrut mendapat talangan IB 50.000 dan gelar "Survivor Krisis" (Maksimal 3 kali).
- **Status Blue Chip:** Pemain dengan performa finansial unggul dan tanpa gagal bayar mendapat badge eksklusif, bunga pinjaman terendah, dan diskon biaya bursa.

---

## 📈 BAGIAN 4: SISTEM PRE-IPO, BOOKBUILDING & PENJATAHAN SELEKTIF (ALLOTMENT)

```
[ Pendirian PT (100% Saham Pendiri) ]
             ↓
[ Registrasi E-IPO Berjadwal ]
  • Tanggal Registrasi / Buka Bookbuilding
  • Tanggal Seleksi Penjatahan (Allotment)
  • Tanggal Pencatatan Resmi di Bursa IPMC (Listing Day)
  • Kuota Publik Wajib: Minimal 10%
  • Kuota Mitra Strategis Korporasi: 10% - 40%
  • Sisa Saham Pendiri: 50% - 80%
             ↓
[ Masa Penawaran Awal (Bookbuilding by Other Companies) ]
  • PT lain (PT B, C, D) mengajukan penawaran beli saham pra-IPO
             ↓
[ Seleksi Mitra oleh Emiten (Hak Prerogatif Pendiri) ]
  • Pendiri mereview skor fundamental & kemampuan kas PT penawar
  • Menolak PT yang sedang krisis / tidak sehat
  • Menyetujui PT unggulan (Uang kas PT mereka masuk ke Kas PT Kita!)
             ↓
[ Hari Pencatatan Resmi di Bursa IPMC (Listing Day) ]
  • Saham mulai aktif diperdagangkan di pasar reguler
  • Porsi publik 10% diperebutkan oleh investor ritel
```

---

## ⚖️ BAGIAN 5: PENGADILAN NIAGA & ARBITRASE KORPORASI KONOHA (PNAK)

### 5.1 Fungsi Utama Pengadilan Niaga:
1. **Perkara Kepailitan & PKPU:** Gagal bayar pinjaman Bank Sentral Konoha (BSK). Putusan: Restrukturisasi atau lelang paksa sita jaminan.
2. **Sengketa Saham & Pembatalan Akuisisi:** Gugatan pembatalan akuisisi ilegal atau manipulasi pasar modal.
3. **Gugatan Wanprestasi Perjanjian Jual Beli Saham:** Pelanggaran klausul Akta Perjanjian Jual Beli Saham.
4. **Sidang Pelanggaran Regulasi Bursa (Insider Trading / Goreng Saham):** Vonis denda ganti rugi yang disita ke kas negara Konoha.

### 5.2 Nuansa UI Ruang Sidang Virtual di Mobile:
- Ruang Sidang Virtual bertema kayu mahoni gelap dengan simbol timbangan keadilan emas ⚖️.
- Berita Acara Perkara & Putusan Hakim Konoha (lengkap dengan ketukan palu 3x & stempel pengadilan).
- Riwayat Perkara Aktif & Riwayat Vonis Pengadilan.

---

## 📁 BAGIAN 6: ARSITEKTUR KODE MODULAR (ANTI-MONOLITH)

### 6.1 Struktur Folder Mobile Flutter:
```
mobile/lib/
├── features/
│   ├── ipo/                              # [BARU] Modul E-IPO & Bookbuilding
│   │   ├── screens/
│   │   │   ├── ipo_catalog_screen.dart   # Katalog penawaran IPO aktif di Konoha
│   │   │   └── ipo_manage_screen.dart    # Dashboard seleksi calon investor oleh pendiri
│   │   ├── widgets/
│   │   │   ├── ipo_registration_form.dart# Formulir pendaftaran jadwal & porsi IPO
│   │   │   ├── ipo_bidding_dialog.dart   # Dialog PT lain menawar saham pra-IPO
│   │   │   └── ipo_allotment_card.dart   # Kartu seleksi calon pemegang saham
│   │   └── models/
│   │       └── ipo_offering_model.dart
│   │
│   ├── corporate_deals/                  # [BARU] Modul Jual-Beli Saham P2P & B2B
│   │   ├── widgets/
│   │   │   ├── formal_deed_modal.dart    # Modal Akta Perjanjian Notaris Resmi
│   │   │   ├── p2p_negotiation_sheet.dart# Bottom sheet pilihan P2P & B2B
│   │   │   └── buyback_modal.dart        # Modal Buyback Saham oleh Kas PT
│   │   └── services/
│   │       └── deed_generator.dart       # Generator nomor akta & klausul hukum
│   │
│   ├── court_commercial/                 # [BARU] Modul Pengadilan Niaga Konoha (PNAK)
│   │   ├── screens/
│   │   │   └── court_room_screen.dart    # Layar utama ruang sidang pengadilan
│   │   ├── widgets/
│   │   │   ├── bankruptcy_case_card.dart # Kartu perkara pailit & sengketa
│   │   │   └── verdict_certificate.dart  # Akta Putusan Hakim Niaga
│   │   └── models/
│   │       └── court_case_model.dart
│   │
│   └── macro_konoha/                     # [BARU] Modul Indikator Negara Konoha
│       └── widgets/
│           └── konoha_status_header.dart # Banner indikator kesehatan ekonomi Konoha
│
├── screens/                              # 5 Layar Tab Utama
├── services/                             # ApiService & SocketService
└── providers/                            # GameProvider
```

### 6.2 Struktur Backend Express & Database:
1. **Tabel Baru Database SQLite (`backend/data/monopoly.db`):**
   - `ipo_bids`: Mencatat penawaran saham dari PT lain selama masa bookbuilding (`id`, `ipo_id`, `bidder_company_id`, `bidder_user_id`, `pct_requested`, `bid_price`, `status`).
   - `court_cases`: Mencatat perkara pengadilan niaga (`id`, `plaintiff_name`, `defendant_name`, `case_type`, `claim_amount`, `verdict_status`, `verdict_notes`).
   - `macro_konoha_indicators`: Status ekonomi (`economic_state`, `inflation_rate`, `bsk_rate`, `gdp_growth`).
2. **Pemisahan File Routes Backend:**
   - `backend/src/routes/ipo.routes.js`
   - `backend/src/routes/court.routes.js`
   - `backend/src/routes/corporate.routes.js`

---

## 🎯 BAGIAN 7: TAHAPAN EKSEKUSI BERIKUTNYA

1. **Langkah 1:** Buat struktur folder modular di mobile (`features/ipo/`, `features/corporate_deals/`, `features/court_commercial/`).
2. **Langkah 2:** Pindahkan modal Akta Perjanjian dari `home_tab.dart` ke file widget independen `formal_deed_modal.dart`.
3. **Langkah 3:** Tambahkan tabel `ipo_bids` dan `court_cases` di backend dan buat route modularnya.
4. **Langkah 4:** Bangun antarmuka E-IPO Bookbuilding dengan penentuan tanggal listing dan seleksi investor mitra.
5. **Langkah 5:** Bangun layar Pengadilan Niaga Konoha (PNAK) untuk mengadili kasus kepailitan dan sengketa korporasi.

---

## 📢 BAGIAN 8: SISTEM PENGADUAN PNAK & SIARAN BERITA OTOMATIS (TERBARU & LIVE)

### 8.1 Alur Pengaduan Interaktif PNAK di Aplikasi Mobile:
1. Pemain membuka tab **Bursa Aset** lalu menekan tombol emas **⚖️ PNAK Konoha**.
2. Di pojok bawah layar tersedia Floating Action Button emas: **`+ AJUKAN PENGADUAN / GUGATAN`**.
3. Membuka formulir resmi `FileLawsuitSheet`:
   - **Kategori Perkara**: Sengketa Akta Saham / Wanprestasi, Permohonan PKPU BSK, atau Laporan Manipulasi Pasar & Goreng Saham.
   - **Pihak Tergugat**: Nama pemain atau PT lawan yang dituntut.
   - **Pokok Perkara / Judul**: Alasan sengketa (misal pembatalan akta sepihak).
   - **Nilai Kerugian**: Pilihan cepat chip nominal mulai dari ratusan juta hingga **20 Triliun IB**.
   - **Biaya Registrasi Panitera**: IB 250.000 ditarik dari Kas Pribadi penggugat.
4. Setelah menekan **`TANDATANGANI & DAFTARKAN KE PNAK`**:
   - Gugatan tercatat resmi dengan nomor perkara register unik (contoh: `097/Pdt.Sus-Sengketa/2026/PNAK`).
   - Berita Acara Registrasi PNAK langsung muncul.

### 8.2 Siaran Berita Otomatis & Breaking News Broadcast:
Semua peristiwa penting korporasi otomatis masuk ke tabel database `news` dan dipancarkan serentak via WebSocket (`market:breaking_news` & `market:news_broadcast`):
1. **Sanksi Bursa**: Pengumuman UMA (Unusual Market Activity) & Suspensi Perdagangan dari Otoritas Pengawas Finansial Konoha (OPFK).
2. **Pendaftaran Gugatan PNAK**: Siaran breaking news instan saat pemain menggugat lawan (misal tuntutan 20 Triliun IB).
3. **Vonis Hakim Niaga**: Pengumuman ketukan palu hakim (Pailit, Sita Aset, atau Mediasi Restrukturisasi).
4. **Transaksi Blok Saham Jumbo**: Penjualan saham negosiasi porsi besar (misal 30% senilai 20 Triliun IB) langsung mengudara ke ticker berjalan di beranda seluruh pemain.

---

## 🤝 BAGIAN 9: SISTEM PASAR NEGOSIASI P2P, DUAL-SIGNATURE ESCROW & PASAR GLOBAL PRIVATE PLACEMENT

### 9.1 Analisis & Perbaikan Masalah Kepemilikan Saham:
- **Penyebab Sebelumnya:** Endpoint `/api/company/negotiation/deal` belum terpasang secara transaksional di database backend sehingga saat penjual menekan tombol, persentase saham dan kepemilikan di DB tidak terpotong.
- **Solusi Arsitektur Baru:** Pemindahan hak saham dan uang tunai wajib menggunakan transaksi SQLite terintegrasi antara saldo Kas Pribadi penjual, saldo pembeli, porsi kepemilikan pendiri (`founder_shares_sold`), serta pembaruan tabel `company_shareholders` (Cap Table).

### 9.2 Alur Transaksi Negosiasi P2P: Dual-Signature & Escrow Saham
Transaksi tidak boleh langsung cair secara sepihak tanpa persetujuan pihak pembeli:
1. **Pihak Pertama (Penjual) Membuat Draft Akta:**
   - Memilih menjual sekian % saham (misal 5%) ke Pemain Target tertentu (contoh: `ajel`).
   - Menetapkan harga per lembar dan total nilai kesepakatan.
   - Penjual menandatangani Akta pertama kali.
   - **Saham Otomatis Masuk Rekening Bersama (Escrow Lock):** 5% saham penjual dikunci sementara di sistem escrow agar tidak bisa dijual ganda.
   - Status Perjanjian: `PENDING_BUYER_SIGNATURE` (Menunggu Tanda Tangan Pembeli).
2. **Pihak Kedua (Pembeli) Menerima Permintaan di Tab "Tawaran Masuk (P2P Inbox)":**
   - Pembeli menerima notifikasi dan membaca draft Akta Notaris.
   - Jika Pembeli setuju: Menekan tombol **`✍️ TANDATANGANI & BAYAR`**.
     - Saldo kas pembeli terpotong sesuai nilai akta.
     - Dana tunai langsung cair masuk ke Kas Pribadi Penjual.
     - Saham di escrow resmi dialihkan ke portofolio pembeli.
     - Akta terbit sah dengan 2 Meterai Digital dan otomatis tersimpan di **Brankas Akta** kedua pemain.
   - Jika Pembeli menolak: Menekan tombol **`❌ TOLAK TAWARAN`**, saham di escrow dikembalikan ke penjual.

### 9.3 Klausul Wanprestasi, Pembatalan Sepihak, & Room Sidang Live PNAK:
- **Klausul Pasal 7 Akta:** *"Pembatalan sepihak setelah penandatanganan kesepakatan atau wanprestasi pembayaran dikenakan sanksi ganti rugi penalti 10% - 20% dari total nilai transaksi."*
- **Aksi Cepat Gugat PNAK:**
  - Jika terjadi pembatalan sepihak atau ingkar janji, pihak yang dirugikan memiliki tombol **`⚖️ GUGAT WANPRESTASI KE PNAK`** langsung dari riwayat akta.
  - Sidang arbitrase PNAK akan memproses klaim penalti tersebut secara live interaktif.

#### Alur Room Sidang Live PNAK (Interactive Courtroom):
1. **Panggilan Sidang & Penjadwalan:**
   - Perkara dijadwalkan secara resmi (misal: *Hari Sidang Jam 10:00 WIB*).
   - Penggugat & Tergugat mendapatkan banner notifikasi: *"Panggilan Sidang PNAK: Hadir tepat waktu di Ruang Sidang Digital"*.
2. **Presensi Kehadiran di Room Sidang:**
   - Di dalam Room Sidang, terdapat status presensi visual kedua belah pihak:
     - Penggugat: `[ 🟢 HADIR ]` / `[ 🔴 BELUM MASUK ]`
     - Tergugat: `[ 🟢 HADIR ]` / `[ 🔴 BELUM MASUK ]`
   - Tersedia tombol konfirmasi: **`[ 🟢 SAYA HADIR DI PERSIDANGAN ]`**.
3. **Mekanisme Putusan Berdasarkan Kehadiran (Verstek & Gugur):**
   - **Toleransi Window Waktu:** Diberikan batas toleransi waktu (misal countdown 3 - 5 menit di game atau window 1 jam).
   - **Skenario A (Penggugat Hadir, Tergugat MANGKIR):**
     - Hakim Majelis memutus **PUTUSAN VERSTEK**.
     - Karena Tergugat tidak hadir untuk membantah dalil, **Penggugat otomatis MENANG MUTLAK**!
     - Hakim mengetok palu: Denda penalti 20% disita dari rekening Tergugat dan **langsung cair ke Kas Pribadi Penggugat**.
   - **Skenario B (Tergugat Hadir, Penggugat MANGKIR):**
     - Gugatan dinyatakan **GUGUR DEMI HUKUM** karena Penggugat tidak serius membuktikan gugatannya.
   - **Skenario C (Kedua Pihak Sama-sama MANGKIR / TIDAK HADIR):**
     - Perkara dinyatakan **BATAL & TIDAK DAPAT DITERIMA (NO)**.
   - **Skenario D (Kedua Pihak HADIR):**
     - Berlangsung sesi adu argumen singkat / mediasi di Room Chat Sidang.
     - Tergugat bisa menawarkan damai atau membela diri.
     - Hakim / Panitera memutus besaran denda ganti rugi yang adil.
4. **Ketuk Palu & Auto-Exit Room:**
   - Begitu palu vonis diketok tiga kali (**`GAVEL HIT`**), muncul Berita Acara Putusan Resmi.
   - Tampil timer countdown 60 detik (*"Sidang Selesai. Ruang Sidang akan ditutup otomatis dalam 60 detik..."*).
   - Seluruh peserta otomatis keluar dari room dan kembali ke menu utama.

### 9.4 Pasar Negosiasi Global (Private Placement Directory) & Pembelian Parsial:
Untuk penjualan ke pasar bebas / global (siapapun boleh beli tanpa harus P2P spesifik):
1. **Fitur Listing Penjualan:**
   - Pemilik PT me-listing penjualan porsi saham (misal Syafiq menjual paket 10% PT. Syafiq Makmur Tbk.).
   - Opsi: **`Izinkan Pembelian Parsial / Eceran (Minimal 1%)`**.
2. **Mekanisme Pembelian Parsial oleh Pemain Lain:**
   - Pemain lain (misal si `ajel`) membuka Katalog Penawaran Global dan melihat listing 10% milik Syafiq.
   - Jika uang modal si `ajel` hanya mampu membeli 1%, ia dapat memilih porsi **`1%`**.
   - Sistem menghitung tagihan proporsional:
     - Duit 1% ditarik dari kas `ajel` dan langsung cair ke kas Syafiq.
     - Kepemilikan Syafiq berkurang 1%, dan `ajel` menerima 1% saham.
     - Terbit Akta Notaris Parsial antara Syafiq dan `ajel`.
     - **Sisa listing Syafiq otomatis tersisa 9%** di katalog global untuk dibeli pemain atau konsorsium lain sampai tuntas 10%.

---

## 📑 BAGIAN 10: ARSITEKTUR 4 TAB TERPADU PASAR NEGOSIASI & PNAK

Untuk menjaga navigasi tetap rapi, bersih, dan mudah digunakan di layar mobile, menu **Bursa Aset / Deals** dibagi menjadi 4 Sub-Tab utama:

1. **TAB 1: 🌐 KATALOG PENAWARAN GLOBAL (Private Placement Marketplace)**
   - Menampilkan seluruh paket saham pendiri yang sedang dijual bebas ke pasar.
   - Dilengkapi filter sektor, porsi saham, valuasi emiten, dan tombol **`BELI / IKUT AMBIL PORSI`** (dengan fitur beli parsial).
2. **TAB 2: 📥 TAWARAN MASUK P2P (Inbox Transaksi Saya)**
   - Menampilkan penawaran saham khusus yang ditujukan dari pemain tertentu ke nama kita.
   - Tempat membaca draf Akta Notaris dan menekan tombol **`✍️ TANDATANGANI & BAYAR`** atau **`❌ TOLAK TAWARAN`**.
3. **TAB 3: 🗄️ BRANKAS AKTA TERSIMPAN (Corporate Legal Vault)**
   - Arsip resmi seluruh Akta Jual-Beli Saham yang sudah sah ditandatangani kedua belah pihak.
   - Dilengkapi Nomor Akta, stempel meterai digital, serta tombol darurat **`⚖️ GUGAT WANPRESTASI KE PNAK`** jika salah satu pihak mangkir.
4. **TAB 4: 🏛️ RUANG SIDANG PNAK & ROOM SIDANG LIVE**
   - Menampilkan daftar register perkara niaga aktif.
   - Tombol masuk ke **`ROOM SIDANG LIVE`** (Presensi Hadir, Putusan Verstek, Ketuk Palu Vonis, dan Eksekusi Sita Dana Ganti Rugi).

---

## 🏛️ BAGIAN 11: PENGEMBANGAN PORTAL ADMIN WEB (OTORITAS NEGARA & REGULATOR)

### 11.1 Tombol Sita Perusahaan (Sita Eksekusi PNAK & Bank Sentral BSK):
- **Lokasi:** Di halaman **Direktori Emiten** (`CompaniesPage.jsx`) dan **Pengadilan Niaga** (`CourtOversightPage.jsx`).
- **Aksi Admin:** Tombol **`[ ⚖️ SITA PERUSAHAAN ]`** pada setiap baris perusahaan.
- **Dampak Sitaan:**
  - Status emiten berubah menjadi `SEIZED` (Disita Negara).
  - Kepemilikan pengendali dibekukan dan dialihkan ke Balai Harta Peninggalan / Kas Negara Konoha.
  - Siaran Breaking News bursa otomatis mengumumkan sita eksekusi negara.

### 11.2 Menu Baru: Brankas Akta Notaris & Kontrak P2P (`DeedRegistryPage.jsx`):
- Menampilkan seluruh dokumen hukum korporasi yang terdaftar di Republik Konoha:
  - Nomor Register Akta Notaris PNAK.
  - Para Pihak (Penjual vs Pembeli / P2P).
  - Porsi Saham & Valuasi Kesepakatan.
  - Status: *Draft Menunggu Tanda Tangan*, *Sah & Aktif*, *Sengketa Wanprestasi*, atau *Batal Demi Hukum*.
  - Riwayat stempel meterai digital resmi.

### 11.3 Menu Baru: Brankas Kas Negara & Keuangan Otoritas (`TreasuryVaultPage.jsx`):
Dashboard transparan penerimaan keuangan Otoritas Konoha (PNAK, OPFK, BSK):
1. **Sumber Penerimaan Kas Negara:**
   - **Biaya Pendaftaran Sidang PNAK:** IB 250.000 per perkara gugatan.
   - **Bea Meterai Digital Korporasi:** IB 10.000 per akta perjanjian.
   - **Pajak & Bea Transaksi Saham:** 0.1% dari transaksi bursa & pelepasan saham pendiri.
   - **Uang Denda & Sitaan PNAK:** Uang denda spekulan goreng saham dan sitaan wanprestasi.
2. **Total Saldo Kas Negara (Sovereign Wealth Fund):**
   - Menampilkan total kas likuid negara yang terkumpul secara real-time.

### 11.4 Saran Kegunaan Uang Sitaan & Perusahaan yang Disita (Game Mechanics):
1. **Dana Talangan Krisis Ekonomi (Stimulus Bailout Fund):**
   - Saat ekonomi Konoha mengalami resesi atau krisis likuiditas, Admin dapat menyuntikkan dana kas negara untuk *bailout* emiten sekarat agar bursa IPMC tidak anjlok.
2. **Balai Lelang Negara (State Public Auction):**
   - Perusahaan yang disita negara dilelang murah di tab **"Lelang Bank Sitaan"** di aplikasi mobile. Pemain berlomba menawar (bidding). Uang hasil lelang kembali masuk memperbesar Kas Negara.
3. **Konversi Menjadi BUMN Konoha (State-Owned Enterprise):**
   - Perusahaan sitaan dijadikan BUMN yang menghasilkan setoran laba dividen rutin setiap siklus 5 menit ke Kas Negara.
4. **Dividen Kemakmuran Rakyat / BLT Stimulus Ekonomi:**
   - Admin dapat membagikan surplus kas negara sebagai dividen nasional ke seluruh pemain, meningkatkan daya beli masyarakat untuk memborong produk emiten pemain.

### 11.5 Halaman Suspensi Saham: Direktori Seluruh Emiten & Aksi Langsung (`SuspensionPage.jsx`):
- **Perbaikan Masalah Saat Ini:** Tabel suspensi saat ini hanya menampilkan saham yang *sudah* dibekukan, sehingga admin kesulitan membekukan saham lain secara cepat.
- **Peningkatan Baru:**
  - Ditambahkan Tab / Tabel **"Semua Emiten Tercatat (Daftar Intervensi Cepat)"**.
  - Admin dapat langsung mencari simbol emiten apa saja dan menekan tombol:
    - **`[ 🔴 SUSPENSI SEKARANG ]`**: Menentukan durasi pembekuan dan alasan resmi bursa.
    - **`[ ⚠️ LABEL UMA ]`**: Menandai pergerakan liar tanpa membekukan perdagangan.
    - **`[ 🟢 CABUT SUSPENSI ]`**: Mengaktifkan kembali perdagangan secara instan.

---

## 12. SINKRONISASI STATUS UMA (UNUSUAL MARKET ACTIVITY) PADA MOBILE APK & WEB ADMIN

### 12.1 Latar Belakang Masalah
Pada Web Admin Otoritas Bursa Konoha (IPMC), terdapat 44 emiten yang masuk radar **UMA (Unusual Market Activity)** karena fluktuasi harga tidak wajar. Namun di aplikasi mobile, emiten tersebut masih berstatus **SEHAT**. Hal ini membingungkan pemain karena tidak mendapat peringatan risiko pergerakan liar.

### 12.2 Spesifikasi Status UMA di Mobile APK:
1. **Badge Status Visual:**
   - Emiten yang masuk radar UMA menampilkan badge oranye/amber **`⚠️ UMA`** (kontras tinggi terhadap dark theme).
   - Tampil di seluruh daftar saham (`market_tab.dart`), layar detail emiten (`stock_detail_screen.dart`), dan kartu portofolio konglomerasi (`home_tab.dart`).
2. **Kartu Peringatan Pengawasan Bursa (UMA Radar Banner):**
   - Di halaman `stock_detail_screen.dart`, jika emiten berstatus UMA, muncul kartu banner interaktif berwarna oranye:
     - *"⚠️ EMITEN DALAM PENGAWASAN KHUSUS (UMA) - Pergerakan harga di luar kewajaran. Otoritas bursa sedang melakukan penelaahan atas transaksi emiten ini."*
3. **Sinkronisasi Real-Time:**
   - Server memancarkan event socket `company:status_changed` dan payload ticker menyertakan properti `isUma: 1` atau `0`, `umaReason`, dan `umaAt`.

---

## 13. REGULASI PERUSAHAAN SITAAN (CONFISCATED ASSET LOCK) & PENEBUSAN HAK MILIK

### 13.1 Larangan Pembagian Dividen & Omzet untuk PT yang Disita:
- **Aturan Tegas Otoritas Finansial:** PT yang telah dieksekusi sita oleh Pengadilan Niaga (PNAK) atau Kas Negara **TIDAK BOLEH** menghasilkan pendapatan, omzet bisnis harian, maupun dividen bagi mantan pemiliknya.
- **Implementasi Mesin Simulasi (`simulation.js`):**
  - Loop `generateCompanyRevenue()` secara otomatis memeriksa `is_seized == 1`. Jika disita, aliran omzet harian dibekukan menjadi 0.
  - Distribusi dividen perseroan mengecualikan saham/perusahaan yang berstatus `is_seized == 1` atau `status == 'SEIZED'`.
- **Pemblokiran Penarikan Kas (HTTP 403):**
  - Tombol tarik kas perseroan ke rekening pribadi dikunci dengan status `🔒 Rekening Dibekukan Negara`. Percobaan penarikan via API ditolak dengan pesan: *"Perseroan sedang dalam status SITAAN NEGARA / PNAK. Seluruh aset finansial dibekukan!"*.

### 13.2 Visual Kunci Merah (Confiscated Red Lock) di Aplikasi Mobile:
1. **Layar Detail Saham & Bursa:**
   - Badge status merah terang berkedip: **`🔴 DISITA PNAK`**.
   - Banner Peringatan Sitaan:
     - *"ASET PERSEROAN DISITA NEGARA - Perseroan disita akibat wanprestasi/gugatan hukum PNAK. Operasional dan dividen dibekukan total."*
2. **Layar Beranda Konglomerasi Pemilik (`home_tab.dart`):**
   - Header entitas menampilkan kartu peringatan merah tua dengan border crimson menyala.
   - Tombol Aksi Utama: **`[ 🔓 TEBUS PERUSAHAAN (BAYAR SANKSI & BANK) ]`**.

### 13.3 Mekanisme Penebusan Aset Sitaan (Redemption System):
Agar pemilik dapat memulihkan kepemilikan dan membuka kembali rekening perseroan, pemilik wajib melunasi **3 Komponen Kewajiban**:
$$\text{Total Biaya Penebusan} = \text{Denda Sanksi PNAK} + \text{Pokok Utang Bank Sentral} + \text{Bunga Pinjaman Bank}$$

- **Rincian Komponen:**
  1. **Denda Sanksi PNAK:** Nilai ganti rugi/denda eksekusi perkara wanprestasi (minimal IB 100.000.000). Uang ini disetorkan langsung memperbesar Kas Likuid Negara Konoha (`state_treasury_ledger`).
  2. **Pokok Pinjaman Bank Sentral:** Seluruh utang modal aktif yang belum lunas.
  3. **Bunga Pinjaman Bank Sentral:** Akumulasi bunga utang pinjaman.
- **Eksekusi Penebusan (`POST /api/seizure/:id/redeem`):**
  - Sistem memeriksa kecukupan Saldo Kas Pribadi pemilik.
  - Jika cukup, saldo dipotong secara atomik:
    - Sanksi PNAK dialirkan ke Brankas Kas Negara.
    - Pokok dan bunga pinjaman bank dinyatakan **LUNAS** (`status = 'PAID'`).
    - Flag sitaan dicabut (`is_seized = 0, status = 'HEALTHY'`).
    - Mesin bursa memancarkan sentimen pemulihan (rally bullish).

---

## 14. SISTEM KAS NEGARA (SOVEREIGN WEALTH VAULT) & INTEGRITAS SALDO

### 14.1 Penjelasan Saldo Kas Negara Tidak Berkurang:
- **Analisis Akar Masalah:**
  - Formula akuntansi di backend sebenarnya sudah benar menghitung pengeluaran:
    $$\text{Saldo Kas Likuid} = \text{Cadangan Devisa Dasar} + \text{Total Penerimaan} - \text{Total Pengeluaran}$$
  - Riwayat mutasi berhasil mencatat pengeluaran (misal: `-IB 200.000.000` untuk Dividen Kemakmuran Rakyat).
  - Namun, pada antarmuka Web Admin (`TreasuryVaultPage.jsx` & `StatCard.jsx`), terdapat kelas CSS `truncate` yang memotong teks angka panjang. Angka `IB 50.793.370.000` ditampilkan sebagai `IB 50.793.3...`. Saat kas berkurang 200 juta menjadi `IB 50.593.370.000`, 9 digit pertama tetap terlihat sama (`IB 50.7...` / `IB 50.5...`), sehingga pengguna merasa saldo tidak berubah.
- **Penyempurnaan Tampilan Web Admin:**
  1. Menggunakan formatter cerdas kedaulatan (`ibShort`):
     - Menampilkan angka utama yang terbaca jelas: `IB 50,79 M` atau `IB 50,79 T`.
     - Menghapus pemotongan titik-titik `...` yang membingungkan.
     - Menyertakan rincian nominal lengkap di bawah nilai utama: `IB 50.793.370.000`.
  2. **Live Socket Synchronizer (`treasury:updated`):**
     - Setiap kali tombol `[ Suntik Bailout Emiten ]` atau `[ Bagi Dividen Nasional ]` dieksekusi, server menyiarkan socket update sehingga kartu saldo dan riwayat kas negara langsung ter-refresh seketika tanpa perlu reload halaman.

---

## 15. MEKANISME BURSA: AUTO REJECTION BAWAH (ARB -35.00%) & STRATEGI REBOUND KE ARA (+35.00%)

### 15.1 Penyesuaian Batas Penurunan Harian Menjadi ARB -35.00% (Simetris):
- **Sirkuit Pemutus Simetris Pasar Modal:**
  - Batas penurunan maksimum harian diselaraskan dengan batas kenaikan maksimum, yaitu simetris sebesar **-35.00%** (Auto Rejection Bawah) dan **+35.00%** (Auto Rejection Atas).
  - Formula Circuit Breaker di Mesin Simulasi (`simulation.js` & `stock_detail_screen.dart`):
    $$\text{Harga ARB} = \max\left(50, \text{Round}(\text{Harga Acuan} \times 0.65)\right) \quad (-35.00\%)$$
    $$\text{Harga ARA} = \text{Round}(\text{Harga Acuan} \times 1.35) \quad (+35.00\%)$$
  - Jika tekanan jual (*panic sell*) terjadi, harga saham dapat turun menukik hingga menyentuh lantai -35.00%. Di level ini, sirkuit pemutus bursa IPMC mengunci penurunan harga sehingga saham tidak dapat anjlok lebih dalam dari -35.00% dalam satu hari perdagangan.

### 15.2 Cara Membalikkan Saham ARB (-35%) Menjadi Keuntungan Rebound Hingga ARA (+35%):
Terdapat 3 pemicu fundamental yang dapat membalikkan tren (*bullish turnaround*):
1. **Akumulasi & Volume Beli Masif Pemain (Buy the Dip):**
   - Ketika pemain membeli saham emiten yang sedang ARB dalam volume besar (ribuan lot), transaksi tersebut mengirimkan sinyal akumulasi beli ke mesin pasar (`simulationEngine.stockTrends`).
   - Sinyal ini membalikkan tren negatif menjadi *rally impulse*, mendorong harga merangkak naik meninggalkan lantai -35% menuju zona hijau.
2. **Suntikan Bailout Kas Negara (State Bailout Injection):**
   - Admin melalui Web Otoritas Kas Negara dapat memilih emiten yang terpuruk dan mengeksekusi **`[ Suntik Bailout Emiten ]`**.
   - Tindakan ini menyuntikkan modal segar ke emiten, menghapus status UMA/krisis, dan secara instan memicu lonjakan harga ke batas **Auto Rejection Atas (ARA +35.00%)**.
3. **Sentimen Berita & Kebijakan Suku Bunga Makro:**
   - Penurunan suku bunga acuan oleh Bank Sentral ke level rendah (misal 3.5% - 5.0%) meningkatkan likuiditas pasar, merangsang konglomerat memborong saham dan mendorong pergerakan indeks ke level tertinggi harian (+35% ARA).

---



## 16. MEKANISME AKUISISI KONTROL (M&A), AKTA NOTARIS RESMI & SINKRONISASI STRUKTUR PEMEGANG SAHAM (CAP TABLE)

### 16.1 Koreksi Struktur Pemegang Saham (Cap Table 70% vs 51% Bug Resolution):
- **Akar Masalah:**
  Sebelumnya, saat pemain mengakuisisi 51% saham emiten krisis (misal `TECH04` / PT. Siber Proteksi Aman Tbk.), sistem backend hanya menambahkan lot ke tabel `portfolios` pembeli, namun tabel registri pemegang saham (`company_shareholders`) tidak diperbarui. Akibatnya, pada tampilan struktur pemegang saham, pendiri lama (`ajel`) masih tercatat menguasai 70% saham, dan pembeli baru tidak tercantum dalam daftar pemegang saham.
- **Standar Penyelesaian & Sinkronisasi DB:**
  - Setiap transaksi akuisisi M&A kini secara atomik merombak tabel `company_shareholders`:
    1. **Pengakuisisi Baru (Pembeli):** Diberi porsi sesuai penawaran (misal **51.0%** / 5.100.000 lembar) dengan gelar resmi **`[Username] (Pemegang Saham Pengendali Baru)`**.
    2. **Pemilik/Pendiri Lama:** Porsi kepemilikannya dipotong sebesar persentase yang diambil alih. Jika awalnya memiliki 70%, kini menjadi:
       $$\text{Porsi Sisa} = 70.0\% - 51.0\% = 19.0\% \quad (\text{Mantan Pendiri})$$
    3. **Konsorsium & Publik Ritel:** Sisa persentase disebar proporsional ke pemegang saham institusi dan publik sehingga total penjumlahan tepat **100.0%**.
  - Jika penjual adalah pemain nyata, dana hasil akuisisi langsung dikreditkan ke saldo Kas Pribadi penjual, dan sistem memancarkan notifikasi/event balance update.

### 16.2 Formulir Pembelian / Pengambilalihan Saham Resmi (Formulir M&A):
- Saat pemain menekan tombol **`[ 🤝 AKUISISI KONTROL ]`** di tab **Bursa Aset & Akuisisi**, antarmuka tidak lagi hanya menampilkan slider sederhana, melainkan menampilkan **Formulir Resmi Pengambilalihan & Restrukturisasi M&A**:
  1. **Kop & Nomor Registrasi Notariat:** Diterbitkan oleh Notariat Niaga & Balai Restrukturisasi Konoha.
  2. **Identitas Para Pihak:**
     - **Pihak Penjual (Pemilik Lama):** Nama pemain pemilik sebelumnya atau *Konsorsium Kurator Niaga Konoha*.
     - **Pihak Pembeli (Pengakuisisi):** Nama pengguna konglomerat pembeli.
  3. **Target Emiten:** Nama PT, Simbol, Sektor, Status KRITIS, dan kupon diskon penyelamatan krisis 30%.
  4. **Porsi Hak Suara:** Slider fleksibel 51% s/d 100% lengkap dengan konversi volume lembar dan lot.
  5. **Rincian Keuangan & Pajak:**
     - Nilai transaksi saham setelah diskon.
     - Bea Meterai Digital & Notariat Niaga (IB 50.000).
     - Total pembayaran kas pribadi yang transparan.
  6. **Klausul Kesepakatan & Tanda Tangan:**
     - Checkbox komitmen hukum dan tombol utama: **`[ 🖋️ TANDATANGANI AKTA & AKUISISI KONTROL ]`**.

### 16.3 Penerbitan Akta Notaris Digital (`deal_deeds`) & Sinkronisasi Web Admin:
- Transaksi akuisisi menghasilkan dokumen hukum resmi yang disimpan ke tabel **`deal_deeds`**:
  - Kolom lengkap: `deed_number` (contoh: `AKTA-MA/2026/04/7421`), `seller_user_id`, `seller_name`, `buyer_user_id`, `buyer_name`, `company_name`, `percentage_transferred`, `shares_transferred`, `price_per_share`, dan `total_price_ib`.
  - Bea meterai disetorkan langsung ke Brankas Kas Negara (`state_treasury_ledger`).
  - Akta ini secara otomatis muncul dan dapat dibuka di:
    - **Web Admin Otoritas Bursa:** Menu *Brankas Akta Notaris* (`DeedRegistryPage.jsx`).
    - **Aplikasi Mobile:** Tab *Brankas Akta Notaris* (`CorporateDealsScreen`).

### 16.4 Tanda Berhasil (Sertifikat Akuisisi Resmi M&A):
- Begitu transaksi berhasil dieksekusi, sistem memunculkan dialog modal megah berbingkai emas:
  - **Lencana Notariat:** *"AKTA RESMI DISAHKAN NOTARIS — Pengalihan Saham Pengendali (M&A) Berhasil"*.
  - Rincian Nomor Akta, Penjual, Pembeli, Volume Saham, dan Pengesahan Meterai Kas Negara.
  - Dua tombol navigasi cepat:
    - **`[ 📜 Buka Akta di Brankas ]`**: Membuka salinan digital akta langsung di brankas dokumen.
    - **`[ 🏢 Buka Beranda ]`**: Langsung kembali ke Beranda untuk mengelola operasional perseroan baru yang diakuisisi.

---

## 17. REKOMENDASI KEDAULATAN BEBAS PELANGGARAN HAK CIPTA & UU ITE (PENGGANTIAN MONOPOLY, REPUBLIK KONOHA, BUMN)

### 17.1 Analisis Risiko Hukum & Regulasi Digital Internasional:
1. **Risiko Merek "Monopoly":**
   - Merek dagang *Monopoly* terdaftar secara internasional dan dimiliki oleh **Hasbro, Inc.** di bawah Kelas Niza 9 (video game, software) dan 28 (board game).
   - Menggunakan nama "Monopoly" untuk game komersial atau di app store publik (Google Play / App Store) menimbulkan risiko gugatan pelanggaran merek dagang, surat somasi (*Cease and Desist*), dan pemblokiran/penghapusan aplikasi (DMCA takedown).
2. **Risiko Nama "Republik Konoha":**
   - "Konoha" (*Konohagakure*) adalah hak cipta dan merek dagang milik Masashi Kishimoto / Shueisha Inc. (serial Naruto).
   - Di Indonesia, "Konoha" berkonotasi sindiran politik (*satirical slang*). Bila digunakan dalam platform digital komersial yang melibatkan simulasi lembaga negara, sengketa kredit macet, dan penyitaan pengadilan, dapat memicu risiko di bawah **UU ITE (Pasal 27 & 28)** terkait disinformasi, pencemaran nama baik, atau pelecehan simbol lembaga.
3. **Risiko Nama Lembaga Riil "BUMN", "BEI", "Kementerian ESDM":**
   - BUMN (Badan Usaha Milik Negara) diatur ketat dalam UU No. 19/2003. BEI (Bursa Efek Indonesia) dan OJK adalah entitas regulator resmi Indonesia.
   - Penggunaan nama riil instansi pemerintah dapat menimbulkan kebingungan konsumen (*regulatory confusion*) atau dianggap sebagai penipuan investasi/sekuritas tanpa izin OJK.

### 17.2 Matriks Rekomendasi Worldbuilding Kedaulatan Orisinal (100% Legal & Safe):

| Komponen Sistem | Nama Lama (Beresiko) | Rekomendasi Nama Orisinal (Bebas Hak Cipta & UU ITE) | Keterangan & Makna Worldbuilding |
| :--- | :--- | :--- | :--- |
| **Judul Game Global** | Monopoly Corp / Monopoly | **`Indigo Tycoon: Sovereign Market`** (Alt: *Apex Conglomerate: Corporate War*) | Selaras dengan mata uang `IB` (*Indigo Billion*). Terkesan futuristik, prestisius, dan bebas dari hak cipta Hasbro. |
| **Negara / Federasi** | Republik Konoha | **`Republik Federasi Indigo`** (Singkatan: **`RFI`** / *Indigopolis*) | Negara fiksi berdaulat yang mandiri dan tidak menyinggung entitas politik nyata mana pun. |
| **Badan Usaha Negara** | BUMN Konoha | **`BUMF`** (*Badan Usaha Milik Federasi*) / **`PEN`** (*Perseroan Ekuitas Negara*) | Istilah orisinal yang berwibawa dan tidak melanggar UU No. 19/2003 tentang BUMN Indonesia. |
| **Bank Sentral** | BSK (Bank Sentral Konoha) | **`BIF`** (*Bank Sentral Indigo Federasi*) | Otoritas moneter pengendali suku bunga acuan dan pengawas likuiditas perbankan fiktif. |
| **Bursa Efek** | BEI Simulator / IPMC | **`IPMC`** (*Indigo Prime Monetary & Capital Exchange*) | Bursa efek fiksi berteknologi tinggi dengan matching order modern. |
| **Pengadilan Niaga** | PNAK (Pengadilan Niaga Konoha) | **`PNAF`** (*Pengadilan Niaga & Arbitrase Federasi*) | Lembaga yudisial arbitrase persidangan kepailitan, sita jaminan, dan wanprestasi. |
| **Mata Uang Virtual** | IndoBucks / IB | **`Indigo Billion (IB)`** & **`Indigo Credits (IDG)`** | Poin virtual edukasi pasar modal tanpa nilai tukar riil (Bebas UU Perjudian). |

---

## 18. KONSTITUSI GAME (LEX MERCATORIA: 10 PASAL PASAR MODAL & REGULASI DIGITAL)

Diimplementasikan pada Web Admin (`admin/src/pages/legal/LegalConstitutionPage.jsx`) dan Aplikasi Mobile (`mobile/lib/screens/game_constitution_screen.dart`).

### 18.1 Teks Kodifikasi 10 Pasal Pasar Modal Game (Lex Mercatoria):
- **Pasal 1: Kedaulatan Saham & Pengendalian Perseroan (M&A 51%)**  
  Setiap konglomerat yang berhasil mengakuisisi minimum 51.0% porsi saham berhak atas status Pemegang Saham Pengendali (PSP). Struktur kepemilikan pendiri awal didilusi secara proporsional (contoh: 70% didilusi 51% menyisakan 19%). Pengendali berhak mengarahkan fundamental bot dan menerima dividen mayoritas.
- **Pasal 2: Batas Volatilitas Harian Simetris (ARA +35% & ARB -35%)**  
  Pergerakan harga saham dibatasi sirkuit pemutus simetris untuk menjaga stabilitas bursa. Kenaikan harga harian maksimal dibatasi +35.00% (Auto Rejection Atas) dan penurunan harga harian maksimal dibatasi -35.00% (Auto Rejection Bawah). Order di luar batas ini ditolak otomatis oleh sistem bursa IPMC.
- **Pasal 3: Pengawasan Pasar & Radar UMA (Unusual Market Activity)**  
  Penandaan resmi terhadap pergerakan harga atau volume di luar kebiasaan. Status UMA bukan merupakan suspensi; perdagangan saham tetap berjalan normal.
- **Pasal 4: Suspensi Perdagangan (Trading Halt)**  
  Tindakan intervensi tertinggi Otoritas Bursa berupa pembekuan total perdagangan emiten yang terindikasi kecurangan, gagal bayar kredit, atau kepailitan. Seluruh order dibekukan hingga status dicabut.
- **Pasal 5: Pajak Bursa 0.10% & Bea Meterai Sah Digital**  
  Setiap eksekusi penjualan saham dikenakan Pajak Transaksi Bursa sebesar 0.10% yang langsung disetor ke Brankas Kas Negara. Setiap akta pengalihan blok saham atau M&A wajib dilekatkan Bea Meterai Digital lunas senilai IB 10.000.
- **Pasal 6: Kepailitan & Eksekusi Sita Jaminan PNAF**  
  Pengadilan Niaga & Arbitrase Federasi (PNAF) berwenang mengeksekusi sita jaminan atas perseroan debitur yang berstatus kredit macet (NPL) atas permohonan Bank Sentral Indigo Federasi (BIF).
- **Pasal 7: Restriksi Dividen Perseroan Sitaan**  
  Perseroan yang berada dalam status sita Pengadilan Niaga dibekukan aliran dividen dan omzet bisnisnya. Seluruh hak keuangan dialihkan ke brankas penampungan negara hingga kewajiban diselesaikan.
- **Pasal 8: Pemulihan Status Sita & Pelunasan Tripartit**  
  Penebusan status sita mewajibkan debitur melunasi 3 unsur kewajiban: (1) Pokok pinjaman Bank Sentral BIF, (2) Bunga utang berjalan, dan (3) Uang sanksi denda pemulihan sita ke Kas Negara Federasi.
- **Pasal 9: Validitas Akta Notariat & Penalti Wanprestasi 20%**  
  Setiap transaksi pengalihan saham non-bursa (P2P) yang dituangkan dalam Akta Notaris berkekuatan hukum tetap. Pembatalan sepihak dikenakan penalti wanprestasi 20% dari nilai transaksi.
- **Pasal 10: Injeksi Likuiditas & Dana Talangan Darurat (Bailout Kas Negara)**  
  Kas Negara Federasi berhak mengucurkan dana talangan (*bailout*) kepada emiten strategis yang terancam likuidasi guna menstabilkan indeks bursa dan memicu rebound harga ke batas ARA (+35%).

### 18.2 Deklarasi Kepatuhan Hukum & Bebas Perjudian (Anti-Gambling Disclaimer):
1. **Pernyataan Simulasi Edukatif Murni:** Platform game ini murni media edukasi dan hiburan strategi bisnis. Seluruh aktivitas perdagangan dan perbankan berjalan di lingkungan terisolasi.
2. **Ketiadaan Nilai Nyata & Larangan Cash-Out (UU ITE Pasal 27 Ayat 2):** Mata uang virtual `IB` dan `IDG` tidak memiliki nilai tukar terhadap Rupiah (IDR) atau mata uang resmi lainnya. Sistem **TIDAK MEMILIKI FITUR WITHDRAWAL / PENARIKAN UANG ASLI** dalam bentuk apa pun.
3. **Kepatuhan Privasi Data (UU PDP):** Platform hanya memproses data akun game teknis (Username, hashed password). Tidak ada pengumpulan informasi sensitif perbankan riil, nomor kartu kredit, atau KTP/NIK pengguna.

---

---

## 19. 4 PILAR KEBIJAKAN EKONOMI STRATEGIS NEGARA (SOVEREIGN EXPANSION)

### 19.1 Eksekutif Analisis & Sirkulasi Moneter Kedaulatan (*Sovereign Circular Economy*)
Dalam game simulasi konglomerasi, terdapat 2 risiko struktural:
1. **Penyakit Likuiditas Konglomerat (Idle Wealth Trap):** Pemain senior yang sudah kaya raya memiliki puluhan miliar IB di rekening, namun tidak ada instrumen penyerapan dana selain membeli saham acak di bursa. Uang mengendap tanpa fungsi makroekonomi.
2. **Penyakit Kepailitan Permanen Pemula (Insolvency Death Spiral):** Pemain pemula yang salah mengelola beban operasional atau terkena penurunan harga saham langsung terjerumus ke defisit kas PT (-50.000.000 IB) dan frustrasi meninggalkan game karena merasa tidak ada jalan keluar.

Melalui 4 pilar ini, website admin bertindak sebagai **Pemerintah Berdaulat & Bank Sentral**, menciptakan aliran uang tertutup yang dinamis:

```
                      +------------------------------------------+
                      |         BRANKAS KAS NEGARA (TREASURY)    |
                      |  Saldo Cadangan Devisa: IB 500+ Miliar   |
                      +-----+------------------------------+-----+
                            |                              ^
          Dana Tender       |                              |  Setoran Pajak & Bea
          & Subsidi         |                              |  + Penjualan Obligasi
                            v                              |
    +-----------------------+-----+                  +-----+-----------------------+
    |    PERSEROAN (PT) PEMAIN    |                  |  KAS PRIBADI PEMAIN KAYA    |
    | - Memenangkan Mega-Tender   |                  | - Membeli Obligasi Negara   |
    | - Menerima Tax Holiday (5%) |                  | - Menerima Kupon Bunga Rutin|
    | - Omzet Bisnis per 25 Menit |                  | - Likuiditas Terserap Aman  |
    +---------------+-------------+                  +-------------+---------------+
                    |                                              ^
                    |            Gaji, Dividen & Transaksi         |
                    +----------------------------------------------+
```

---

### 19.2 Pilar 1: Surat Utang Negara (Obligasi Pemerintah / Sovereign Bonds - ORI & SBR)
Pemerintah (Web Admin) menerbitkan **Surat Berharga Negara (SBN) Federasi** yang dapat dibeli oleh pemain melalui tab Bank Sentral / Investasi di aplikasi ponsel.
- **Nama Seri:** ORI (Obligasi Republik Indigo) dan SBR (Sovereign Bond Retail).
- **Fungsi Utama:** Menyerap kelebihan uang dari kas pribadi konglomerat ke Brankas Kas Negara, sekaligus memberikan imbal hasil pasif (*coupon yield*) yang dijamin 100% oleh negara tanpa risiko fluktuasi harga saham bursa.
- **Parameter & Logika Operasional:**
  - **Nominal Per Unit:** IB 1.000.000 per unit (pembelian kelipatan 1 unit).
  - **Minimum Pembelian:** IB 5.000.000 (5 unit).
  - **Maksimum Pembelian Per Akun:** IB 500.000.000 (500 unit).
  - **Tingkat Kupon Bunga:** Ditentukan Admin di web (misal: **6.0% s/d 9.5% p.a.**).
  - **Pembayaran Kupon:** Dibayar otomatis setiap 25 menit (sinkron dengan siklus arus kas) langsung ke Kas Pribadi pemain.
  - **Jatuh Tempo (Maturity Tenor):** 3 hari, 7 hari, atau 14 hari game. Saat jatuh tempo, pokok investasi dikembalikan 100% dari Kas Negara ke rekening pemain.

---

### 19.3 Pilar 2: Subsidi & Tax Holiday Sektoral Dinamis
Pemerintah memiliki otoritas memberikan **kebijakan fiskal terarah** untuk menggairahkan sektor industri tertentu (contoh: Sektor Teknologi, Energi Hijau, Infrastruktur, Properti, atau Finansial).
- **Fungsi Utama:** Mendorong perputaran modal, memicu pemain membuka PT atau mengakuisisi saham di sektor yang sedang mendapatkan subsidi pemerintah, dan memicu *bull-run* sektoral di bursa saham.
- **Tiga Bentuk Insentif Sektoral:**
  1. **Tax Holiday (Diskon PPh Badan):** Pemotongan tarif pajak penghasilan dari normal 10% menjadi **3% s/d 5%** khusus untuk emiten di sektor yang ditunjuk selama masa promosi (misal 24 jam).
  2. **Subsidi Operasional Langsung (Cash Grant):** Pengurangan beban operasional dasar PT di sektor tersebut sebesar **50% per siklus** yang disubsidi langsung dari saldo Kas Negara.
  3. **Pengumuman Breaking News:** Begitu Admin mengaktifkan subsidi di web, seluruh bursa menerima siaran berita resmi: *"KEMENKEU RESMI TERBITKAN TAX HOLIDAY SEKTOR TEKNOLOGI — Insentif Fiskal Aktif Selama 24 Jam!"*.

---

### 19.4 Pilar 3: Tender Pengadaan Proyek Pemerintah (Mega-Projects Procurement)
Kas Negara membuka lelang proyek bernilai tinggi (*Mega-Projects*) untuk dikerjakan oleh PT milik pemain.
- **Fungsi Utama:** Menjadi puncak pencapaian (*end-game goal*) bagi konglomerat yang telah menaikkan level PT, riset R&D, dan kapasitas staf ke tingkat tinggi.
- **Contoh Paket Tender:**
  - 🌐 **Tender Proyek Nasional 1:** Pembangunan Infrastruktur Jaringan Satelit & Fiber Optic (Sektor Teknologi, Nilai Kontrak: **IB 150.000.000**).
  - ⚡ **Tender Proyek Nasional 2:** Konstruksi Pembangkit Listrik Tenaga Surya Federasi (Sektor Energi, Nilai Kontrak: **IB 250.000.000**).
  - 🏢 **Tender Proyek Nasional 3:** Revitalisasi Kawasan Finansial Ibukota (Sektor Properti/Finansial, Nilai Kontrak: **IB 500.000.000**).
- **Alur Mekanisme Bidding & Kualifikasi:**
  1. **Kualifikasi Minimum:** Level PT >= 2 atau 3, Riset R&D >= Level 2, Kapasitas SDM >= 10 Staf.
  2. **Jendela Pengajuan Proposal (Bidding Window):** Dibuka selama durasi tertentu (countdown timer).
  3. **Pemberian Kontrak:**
     - **Mode Otomatis:** Sistem menilai berdasarkan skor fundamental + level PT tertinggi.
     - **Mode Seleksi Admin:** Web Admin meninjau daftar perusahaan pelamar dan memilih pemenang secara manual.
  4. **Pencairan Pembayaran:** Dana kontrak dicairkan dari Brankas Kas Negara bertahap per siklus arus kas atau sekaligus ke Kas PT pemenang, mendongkrak omzet perseroan secara masif.

---

### 19.5 Pilar 4: Pemutihan Utang & Restrukturisasi Kredit Debitur Macet
Mekanisme penyelamatan (*financial safety net*) bagi pemain yang terlilit pinjaman macet di Bank Sentral BCF dan terancam penyitaan aset oleh Pengadilan Niaga PNAK.
- **Fungsi Utama:** Mencegah pemain putus asa dan meninggalkan game (*anti-churn mechanism*), sekaligus memberikan pengalaman realistis restrukturisasi perbankan modern.
- **Dua Bentuk Kebijakan Restrukturisasi:**
  1. **Program Pemutihan Denda Bunga Massal (Mass Debt Penalty Waiver):**
     - Web Admin dapat menekan tombol: *"Laksanakan Pemutihan Denda Nasional"*.
     - Seluruh denda keterlambatan (penalti bunga menunggak) dihapuskan 100%, sehingga sisa kewajiban debitur kembali murni hanya pokok pinjaman.
  2. **Restrukturisasi Tenor & Pemotongan Pokok (Debt Haircut 25% - 50%):**
     - Debitur yang perusahaannya pailit dapat mengajukan restrukturisasi kredit:
       - Tenor pinjaman diperpanjang (tambah 14 hari game).
       - Bunga pinjaman diturunkan menjadi 2.0% p.a.
       - Subsidi pemotongan pokok (dana talangan restrukturisasi dialokasikan dari Kas Negara).
     - Selama masa restrukturisasi, rekening PT kembali aktif (*unfrozen*) sehingga pemilik dapat melanjutkan operasional bisnisnya.

---

### 19.6 Matriks Skema Database (Tabel Baru di `backend/src/db.js`)
1. `sovereign_bonds`: Master seri obligasi negara (kode ORI/SBR, kuota emisi, kupon bunga %, tenor, jatuh tempo).
2. `user_bond_holdings`: Portofolio kepemilikan surat utang pemain (unit dimiliki, total investasi IB, kupon berjalan).
3. `sector_subsidies`: Kebijakan diskon PPh Badan & subsidi operasional per sektor industri.
4. `government_tenders`: Katalog tender mega-proyek pengadaan pemerintah beserta nilai kontrak & syarat PT.
5. `tender_bids`: Daftar pengajuan proposal tender dari PT pemain.
6. `debt_relief_records`: Audit log pemutihan denda bunga dan restrukturisasi kredit debitur.

---

### 19.7 Spesifikasi Endpoint API & WebSocket
- **Obligasi Negara:** `GET /api/bonds/active`, `POST /api/bonds/order`, `GET /api/bonds/my-holdings/:userId`, `POST /api/bonds/admin/issue`, `POST /api/bonds/admin/redeem/:bondId`.
- **Subsidi Sektor:** `GET /api/subsidies/status`, `POST /api/subsidies/toggle`, `POST /api/subsidies/batch-save`.
- **Tender Proyek:** `GET /api/tenders/list`, `POST /api/tenders/bid`, `POST /api/tenders/admin/create`, `POST /api/tenders/admin/award`.
- **Restrukturisasi Utang:** `POST /api/admin/bank/mass-penalty-waiver`, `POST /api/admin/bank/restructure-loan`, `GET /api/bank/relief-history/:userId`.
- **WebSocket Broadcast:** `bonds:issued`, `subsidies:updated`, `tender:announced`, `tender:awarded`, `debt_relief:executed`.

---

### 19.8 Status Implementasi Full-Stack (100% SELESAI & AKTIF)
- [x] **Database SQLite (`backend/src/db.js`):**
  - [x] Tabel `sovereign_bonds`, `user_bond_holdings`, `sector_subsidies`, `government_tenders`, `tender_bids`, `debt_relief_records`.
  - [x] Auto-seeding untuk ORI-026 & SBR-015, 6 sektor industri, serta tender Fiber Optic (IB 150M) & PLTS (IB 250M).
- [x] **Backend API Routes & Engine (`backend/src/`):**
  - [x] `bonds.routes.js`, `subsidies.routes.js`, `tenders.routes.js`, dan penambahan di `bank.routes.js`.
  - [x] `simulation.js`: Auto-distribusi kupon obligasi berkala per siklus kas negara, penerapan diskon PPh Badan Tax Holiday & hibah operasional tunai.
- [x] **Web Admin Dashboard (`admin/src/`):**
  - [x] `SovereignBondsPage.jsx`: Penerbitan & pelunasan SBN (ORI/SBR), tracking kuota emisi & beban kupon.
  - [x] `SectorSubsidiesPage.jsx`: 1-klik Tax Holiday per sektor, atur hibah operasional, broadcast breaking news.
  - [x] `GovernmentTendersPage.jsx`: Buka mega-tender baru, evaluasi proposal pelamar, putuskan pemenang tender.
  - [x] `BankCentralPage.jsx`: Pemutihan denda bunga massal 100% dan modal restrukturisasi kredit debitur.
  - [x] Navigasi sidebar terintegrasi & lulus build Vite (`npm run build` 0 error).
- [x] **Mobile Flutter APK (`mobile/lib/`):**
  - [x] `api_service.dart` & `socket_service.dart`: Integrasi REST API dan event real-time WebSocket.
  - [x] `game_provider.dart`: State management untuk obligasi, subsidi sektoral, dan tender mega-proyek.
  - [x] `sovereign_bonds_modal.dart`: Dialog pembelian SBN & portofolio kupon imbal hasil pasif.
  - [x] `government_tenders_modal.dart`: Dialog katalog tender mega-proyek & pengajuan bidding PT konglomerat.
  - [x] `home_tab.dart`: Dual action button SBN & Tender, status Tax Holiday di kartu arus kas.
  - [x] `market_tab.dart`: Badge `SUBSIDI PPh 5%` pada emiten di sektor penerima insentif pemerintah.
  - [x] Lulus verifikasi Flutter analyzer (`flutter analyze` 0 error).





