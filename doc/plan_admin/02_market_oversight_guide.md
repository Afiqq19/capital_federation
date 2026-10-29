# Panduan Pengawasan Bursa: Radar UMA vs Suspensi Saham

Dokumen ini menjelaskan secara rinci perbedaan mendasar, regulasi sistem, dan cara kerja teknis antara **Radar Peringatan UMA** dan **Suspensi Saham (Trading Halt)** di dalam ekosistem Monopoly Corp / IPMC Exchange.

---

## 1. Perbedaan Mendasar UMA vs Suspensi

| Parameter | Radar UMA (Unusual Market Activity) | Suspensi Saham (Trading Halt) |
| :--- | :--- | :--- |
| **Definisi** | Penandaan peringatan resmi terhadap pergerakan harga/volume yang tidak lazim. | Pembekuan total terhadap seluruh aktivitas perdagangan saham emiten. |
| **Status Perdagangan** | **TETAP BERJALAN NORMAL**. Pemain tetap bebas pasang order Beli dan Jual. | **DIBEKUKAN / DIHENTIKAN TOTAL**. Order baru ditolak oleh matching engine. |
| **Tujuan** | Memberikan sinyal kewaspadaan kepada investor publik dan meminta konfirmasi emiten. | Mendinginkan pasar (cooling down) dari spekulasi liar atau dugaan pelanggaran berat. |
| **Metode Penetapan** | **Bisa Otomatis (Auto-Surveillance Engine)** & **Bisa Manual Otoritas**. | **Manual Otoritas Bursa** dengan batas waktu (preset / tanggal kalender). |
| **Pencabutan Status** | Otomatis bila volatilitas mereda di bawah ambang normalisasi, atau manual oleh admin. | Otomatis setelah timer tanggal berakhir, atau manual dicabut sewaktu-waktu oleh admin. |
| **Visual di Klien Mobile** | Badge Amber/Kuning `UMA` di samping kode saham & notifikasi ticker. | Badge Rose/Merah `SUSPENSI` berkedip + tombol Beli/Jual dinonaktifkan (disabled). |

---

## 2. Cara Kerja Radar UMA (Unusual Market Activity)

### A. Deteksi Otomatis (Auto-UMA Engine)
Sistem backend menjalankan service pemantau (`surveillance.service.js`) secara berkala pada bursa:
1. **Pemicu (Threshold %)**:
   - Nilai default: **15%** fluktuasi harga dalam kurun 24 jam.
   - Jika saham melompat naik atau jatuh ≥ 15% tanpa ada aksi korporasi riil, engine otomatis menetapkan `companies.is_uma = 1` dengan label `AUTO-ENGINE`.
   - Socket.io menyiarkan event `market:uma_changed` ke seluruh aplikasi mobile dan web admin.
2. **Normalisasi Otomatis (Clear Threshold %)**:
   - Nilai default: **7%**.
   - Jika dalam periode pemantauan selanjutnya deviasi harga kembali tenang di bawah ambang toleransi, status UMA dicabut secara otomatis.
3. **Pengaturan Dinamis di Web Admin**:
   - Otoritas Bursa dapat mengaktifkan/menonaktifkan Auto-UMA engine.
   - Menggeser ambang batas persentase pemicu (5% - 50%) dan ambang pemulihan (2% - 20%).

### B. Penetapan UMA Manual
Admin dapat langsung menandai saham tertentu yang terindikasi manipulasi pasar (misal: rumor gorengan saham, pump & dump, spoofing volume):
1. Buka menu **Pengawasan Bursa -> Peringatan UMA**.
2. Klik tombol **Terbitkan Radar UMA Manual**.
3. Pilih emiten dan masukkan alasan resmi.
4. Klik **Terbitkan Radar UMA** -> Sinyal langsung aktif di seluruh ekosistem game.

---

## 3. Cara Kerja Suspensi Saham (Trading Halt)

### A. Dampak ke Mesin Pencocokan Order (Matching Engine)
Saat status suspensi diterapkan pada emiten:
1. Kolom database `companies.is_suspended` diubah menjadi `1`.
2. Tanggal target disimpan pada `companies.suspended_until` (format ISO UTC).
3. API `/api/trading/order` otomatis menolak setiap transaksi dengan pesan:
   `"Perdagangan saham [SYMBOL] sedang dibekukan sementara oleh Otoritas Bursa sampai [TANGGAL]."`
4. Seluruh antrian order buku bursa (orderbook) dibekukan dan tidak dapat dicocokkan (matched).

### B. Preset Durasi & Kalender di Web Admin
Admin memiliki fleksibilitas durasi pembekuan:
- **1 Jam**: Cooling down kilat untuk menenangkan lonjakan order sesaat.
- **6 Jam**: Penghentian sesi perdagangan setengah hari.
- **24 Jam (1 Hari)**: Suspensi standar untuk meminta keterbukaan informasi emiten.
- **3 Hari**: Investigasi audit terhadap transaksi anomali.
- **7 Hari (1 Minggu)**: Sanksi berat atas keterlambatan laporan keuangan atau restrukturisasi.
- **Custom Datetime**: Memilih tanggal dan jam spesifik dari kalender bursa.

### C. Pemulihan / Pencabutan Suspensi
1. **Otomatis**: Setelah target waktu tercapai, server bursa otomatis memulihkan status perdagangan menjadi reguler.
2. **Manual**: Admin dapat menekan tombol **Cabut Suspensi (Pulihkan)** kapan saja untuk membuka kembali perdagangan lebih awal.
