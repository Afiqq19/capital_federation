# 🏦 CAPITAL FEDERATION - Multi-Platform Stock Market & Business Tycoon Game

Proyek simulasi ekonomi konglomerasi finansial multi-platform yang terdiri dari:
1. **Backend Server** (Node.js + Express + Socket.io + SQLite ACID)
2. **Web Admin Dashboard** (React.js + Vite + Tailwind CSS)
3. **Aplikasi Pengguna Klien** (Flutter Android APK / Web / Desktop)

---

## 🚀 Fitur Utama & Kepatuhan Regulasi

### 1. Kepatuhan Hukum & Informasi Dasar
* **Mata Uang Virtual:** IndoBucks (IB)
* **Satuan Saham:** 1 Lot = 100 Lembar
* **Disclaimer Wajib (OJK / UU ITE):** Pop-up peringatan kepatuhan hukum muncul otomatis pada instalasi/peluncuran perdana aplikasi.

### 2. 100 Perusahaan Bot (Seeding Economy)
* Terdapat **100 emiten bot** di 6 sektor industri:
  * **Teknologi** (20 emiten)
  * **Properti** (20 emiten)
  * **Keuangan** (20 emiten)
  * **F&B** (15 emiten)
  * **Energi** (15 emiten)
  * **Manufaktur** (10 emiten)
* **Status Bot:** 
  * `SEHAT`: Membagikan dividen rutin kepada pemegang saham.
  * `KRITIS`: Target akuisisi mayoritas (Takeover 51%-100%) dengan diskon 30% dari valuasi.
* **Algoritma Intervensi Bot:** Jika pasar jatuh melewati ambang batas (default: 35%), Bot Bank Sentral otomatis melakukan aksi beli penyelamatan pasar.

### 3. Web Admin Dashboard ("Bank Sentral & Tuhan Ekonomi")
* **Akses:** `http://localhost:5173`
* **Fitur:**
  * **Ikhtisar Pasar:** Metrik realtime volume perdagangan, suku bunga, dan emiten aktif.
  * **Manajemen 100 Bot:** Toggle status Sehat vs Kritis, search & filter per sektor, pemicu intervensi likuiditas darurat.
  * **Pusat Intervensi Makro & Injeksi Berita:**
    * Pemicu Event Makro (Resesi -18%, Ledakan Properti +22%, Ledakan AI +28%, Krisis Energi +20%).
    * Injeksi Berita Finansial (News Injection) yang langsung disiarkan ke *News Ticker* aplikasi klien.
  * **Kebijakan Bank Sentral:** Slider suku bunga pinjaman, syarat minimal IPO (IB 5.000.000 & Level 10), tingkat inflasi, dan batas intervensi bot.
  * **Manajemen Pemain:** Audit kekayaan dan fitur pembekuan akun (Anti-Fraud).
  * **Log Transaksi Anti-Fraud:** Audit trail seluruh aktivitas jual, beli, dividen, dan akuisisi.

### 4. Aplikasi Klien Pengguna (Flutter Mobile)
* **Fase Onboarding:**
  * Pendaftaran nama PT & pemilihan sektor industri.
  * **Modal Awal IB 100.000** suntikan dari "Investor Malaikat".
* **5 Struktur Navigasi Utama:**
  1. **Beranda (Dasbor PT):** Status PT, level operasional, upgrade bisnis (Marketing, SDM, Kapasitas), saldo tunai, dan *News Ticker*.
  2. **Pasar (Bursa Saham):** Daftar 100 emiten, grafik candlestick real-time, terminal order Beli & Jual (1 Lot = 100 lembar).
  3. **Bursa Aset (Lelang & Akuisisi):** Negosiasi akuisisi emiten krisis (51% s/d 100%) dan lelang bank sitaan.
  4. **Portofolio (Aset & Pinjaman Bank):** Saldo kas, valuasi saham, P/L %, pengajuan pinjaman bank sentral, dan dana talangan kebangkrutan (*Bailout IB 50.000* + buff *Survivor Krisis*).
  5. **Peringkat (Sosial & Top 100):** Leaderboard Top 100 Taipan (sorotan khusus bingkai "9 Naga" untuk Top 9) dan ruang Chat Global bursa.

---

## 🛠️ Cara Menjalankan Project

### 1. Backend Server (Port 4000)
```bash
cd backend
npm install
node ./src/server.js
```
*API Base URL:* `http://localhost:4000`

### 2. Web Admin (Port 5173)
```bash
cd admin
npm install
npm run dev
```
*Buka browser:* `http://localhost:5173`

### 3. Aplikasi Flutter (Mobile / Web / Desktop)
```bash
cd mobile
flutter run
```
*Pilih target device: Android Phone / Emulator, Chrome/Edge, atau Windows Desktop.*
