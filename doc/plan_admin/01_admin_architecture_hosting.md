# Arsitektur Folder Web Admin & Panduan Hosting Domain / Public Link

Dokumen ini menjelaskan struktur folder baru Web Admin **Monopoly Corp / IPMC Terminal**, cara kerja build Vite, serta konfigurasi deployment jika nanti di-hosting ke domain publik (misal: `https://admin.monopolycorp.com` atau hosting VPS/cPanel/Vercel).

---

## 1. Struktur Folder Modular Admin (`admin/src/`)

Sebelumnya, seluruh logika Web Admin menumpuk di dalam 1 file `App.jsx` (~2.200 baris) yang sulit dirawat dan rawan bentrok. Sekarang struktur telah dipisah secara rapi dan modular: **Satu menu = Satu folder & file tersendiri**.

```text
admin/
├── dist/                          <-- Hasil kompilasi statis (HTML, JS, CSS) siap hosting
├── public/                        <-- Aset publik statis (favicon, logo)
├── src/
│   ├── api/                       <-- Klien HTTP & daftar endpoint API admin
│   │   ├── admin.js               <-- Objek fungsi API (overview, bank, uma, suspension, dll.)
│   │   └── http.js                <-- Request wrapper (fetch + JSON error parsing)
│   │
│   ├── components/                <-- Komponen antarmuka yang dapat digunakan ulang
│   │   ├── layout/                <-- Layout struktural utama
│   │   │   ├── AdminLayout.jsx    <-- Container utama (Sidebar diam + Main scrollable)
│   │   │   ├── Sidebar.jsx        <-- Sidebar permanen & stationary di kiri
│   │   │   └── Header.jsx         <-- Top bar judul, ticker bursa, & status realtime
│   │   ├── ui/                    <-- Komponen desain terminal
│   │   │   ├── Badge.jsx          <-- Label status (emerald, amber, rose, sky, pulse)
│   │   │   ├── Button.jsx         <-- Tombol berbagai varian & ukuran
│   │   │   ├── Card.jsx           <-- Kartu glassmorphism & CardHeader
│   │   │   ├── EmptyState.jsx     <-- Tampilan saat data kosong
│   │   │   ├── Form.jsx           <-- Field, Input, Select, Textarea, Switch, Segmented
│   │   │   ├── Modal.jsx          <-- Modal dialog dengan backdrop blur
│   │   │   ├── SearchInput.jsx    <-- Input pencarian terpadu
│   │   │   ├── StatCard.jsx       <-- Kartu metrik dengan glow aksen
│   │   │   └── Toasts.jsx         <-- Notifikasi mengambang (success, error, info)
│   │   └── ErrorBoundary.jsx      <-- Penangkal crash layar putih
│   │
│   ├── config/
│   │   ├── env.js                 <-- Konfigurasi API_URL dinamis / env
│   │   └── navigation.js          <-- Definisi grup menu sidebar & ikon
│   │
│   ├── context/
│   │   └── AdminContext.jsx       <-- State terpusat, socket realtime, & aksi mutasi
│   │
│   ├── lib/
│   │   ├── format.js              <-- Pemformat mata uang IB, persen, tanggal, sisa waktu
│   │   └── socket.js              <-- Inisialisasi Socket.io client
│   │
│   ├── pages/                     <-- HALAMAN MODULAR PER MENU
│   │   ├── dashboard/             <-- Menu: Ikhtisar Pasar
│   │   │   └── DashboardPage.jsx
│   │   ├── bank/                  <-- Menu: Bank Sentral IPMC
│   │   │   ├── BankCentralPage.jsx
│   │   │   └── SeizeAssetModal.jsx
│   │   ├── oversight/             <-- Menu: Pengawasan Bursa (UMA & Suspensi)
│   │   │   ├── UmaPage.jsx        <-- Radar UMA (Auto-engine & Manual)
│   │   │   ├── SuspensionPage.jsx <-- Suspensi Saham (Trading Halt + Countdown)
│   │   │   ├── FlagUmaModal.jsx   <-- Modal terbitkan UMA
│   │   │   └── SuspendStockModal.jsx <-- Modal pembekuan saham & preset durasi
│   │   ├── companies/             <-- Menu: Direktori Emiten & Bot Market Maker
│   │   │   └── CompaniesPage.jsx
│   │   ├── users/                 <-- Menu: Konglomerat Pemain
│   │   │   ├── UsersPage.jsx
│   │   │   └── EditUserModal.jsx
│   │   ├── macro/                 <-- Menu: Krisis Makro & Berita
│   │   │   └── MacroEventsPage.jsx
│   │   ├── transactions/          <-- Menu: Audit Transaksi
│   │   │   └── TransactionsPage.jsx
│   │   └── settings/              <-- Menu: Regulasi & IPO
│   │       └── SettingsPage.jsx
│   │
│   ├── styles/
│   │   └── index.css              <-- Design tokens Tailwind v4 & komponen terminal
│   ├── App.jsx                    <-- Router ringkas & pengait layout
│   └── main.jsx                   <-- Entrypoint React
├── .env.production                <-- Pengaturan URL backend saat di-hosting
├── package.json
└── vite.config.js
```

---

## 2. Rahasia Sidebar Diam (Stationary / Sticky)

Sesuai permintaan Anda agar sidebar **diam di tempat** saat halaman di-scroll ke bawah:
- Seluruh layar dibungkus dalam kontainer berukuran tetap: `h-screen w-screen overflow-hidden flex`.
- Sidebar memiliki ukuran tetap dan tidak dapat bergeser: `w-72 h-screen shrink-0 sticky top-0`.
- Kontainer `<main>` konten di kanan memiliki style `flex-1 h-full overflow-y-auto`.
- **Hasilnya**: Saat Anda menggulir tabel debitur atau daftar transaksi hingga ribuan baris, hanya area konten yang bergerak, sedangkan sidebar kiri tetap kokoh menempel di posisinya!

---

## 3. Cara Kerja Hosting Web Admin di Domain Publik

Web Admin ini dibuat menggunakan React + Vite. Aplikasi ini adalah **Single Page Application (SPA)** yang saat di-compile (`npm run build`) menghasilkan file statis murni di dalam folder `admin/dist/`.

### A. Alur Komunikasi Antara Web Admin & Backend Server

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     PENGUNJUNG / ADMIN          │           │       SERVER NODE.JS / API      │
│  Domain: admin.monopolycorp.com │           │  Domain: api.monopolycorp.com   │
│  (File statis dari admin/dist/) │  HTTP/WS  │  (Port 4000 di VPS/Cloud)       │
│                                 │ ────────> │                                 │
│  - React UI                     │ <──────── │  - REST API (/api/admin/...)    │
│  - Tailwind CSS                 │           │  - Socket.io (Realtime Events)  │
│  - Browser Client               │           │  - SQLite / Database            │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

### B. Pengaturan `VITE_API_URL` (Environment Variable)

Pada file `admin/src/config/env.js`:
```javascript
export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;
```

1. **Saat di Local / LAN (Pengujian)**:
   - Jika `VITE_API_URL` kosong, sistem otomatis membaca IP perangkat yang sedang membuka web admin pada port 4000 (`http://192.168.x.x:4000`).
2. **Saat di-Hosting (Produksi)**:
   - Buat file `admin/.env.production` yang berisi:
     ```env
     VITE_API_URL=https://api.monopolycorp.com
     ```
   - Saat Anda menjalankan `npm run build`, Vite akan menanamkan URL backend tersebut secara otomatis ke dalam bundle `dist/`.

---

## 4. Opsi Deployment & Konfigurasi Server Web

### Opsi 1: Menggunakan VPS (Nginx) — Paling Direkomendasikan
Jika Anda menyewa VPS Ubuntu (misal DigitalOcean, Biznet, Linode, AWS):

1. **Build Admin di Komputer Anda**:
   ```bash
   cd admin
   npm run build
   ```
2. **Unggah isi folder `admin/dist/`** ke `/var/www/monopoly_admin` di server VPS.
3. **Konfigurasi Nginx (`/etc/nginx/sites-available/monopoly_admin`)**:
   ```nginx
   server {
       listen 80;
       server_name admin.monopolycorp.com;

       root /var/www/monopoly_admin;
       index index.html;

       # Wajib untuk React SPA (mencegah 404 saat refresh halaman)
       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxy ke Backend API (Opsional bila 1 domain)
       location /api/ {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # WebSocket Socket.io
       location /socket.io/ {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
       }
   }
   ```
4. Pasang SSL gratis dengan Certbot: `sudo certbot --nginx -d admin.monopolycorp.com`.

### Opsi 2: Menggunakan Vercel / Netlify (Gratis untuk Frontend)
Jika ingin hosting frontend Web Admin gratis di Vercel:
1. Hubungkan repository GitHub ke Vercel.
2. Root Directory: `admin`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Di menu **Environment Variables**, tambahkan:
   - Key: `VITE_API_URL`
   - Value: `https://api.domain-anda.com`
6. Buat file `admin/vercel.json` untuk SPA redirect:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

---

## 5. Ringkasan Keunggulan Struktur Baru
1. **Performa Super Cepat**: Waktu build Vite hanya ~500ms, ukuran bundle terkompresi ~105 kB.
2. **Bebas Crash**: Masalah layar putih Bank Central telah tuntas diperbaiki dengan pelindung null-check `ib()` dan `safeNum()`.
3. **Pemisahan Tegas UMA vs Suspensi**: UMA peringatan tanpa henti dagang, Suspensi pembekuan total bertanggal.
4. **Navigasi Fixed**: Sidebar diam di tempat dengan indikator badge realtime bursa.
