# Roadmap Pengujian & Pengembangan Klien Mobile Flutter

Dokumen ini berisi panduan pengujian aplikasi Android (Flutter), konektivitas ke server backend, serta daftar rencana fitur klien mobile **Capital Federation**.

---

## 1. Lingkungan Perangkat & Konektivitas

- **Perangkat Fisik**: Vivo V2157 (`3466240990000FX`)
- **Versi OS**: Android 14 (API 34)
- **Framework**: Flutter 3.x + Dart
- **Port Komunikasi**:
  - Backend Node.js API: `http://localhost:4000` (atau IP LAN saat tidak terhubung USB kabel)
  - ADB Port Reverse: `adb reverse tcp:4000 tcp:4000`

### Perintah Menjalankan Aplikasi ke HP:
```bash
# 1. Pastikan port forwarding aktif agar HP bisa akses server lokal laptop
adb reverse tcp:4000 tcp:4000

# 2. Jalankan aplikasi Flutter
cd mobile
flutter run -d 3466240990000FX
```

---

## 2. Integrasi Fitur Mobile dengan Otoritas Web Admin

| Modul Mobile | Respon terhadap Tindakan Web Admin |
| :--- | :--- |
| **Peringatan UMA** | Menampilkan badge kuning `UMA` pada daftar saham dan layar detail saham. Tombol Beli/Jual **tetap aktif**. |
| **Suspensi Saham** | Menampilkan badge merah berkedip `SUSPENSI` dan menonaktifkan tombol Beli & Jual disertai peringatan batas waktu. |
| **Suku Bunga Acuan** | Nilai suku bunga fasilitas pinjaman bank di modul pinjaman langsung diperbarui via Socket.io `central_bank:rate`. |
| **Krisis Makro & Berita** | Running text news ticker di Beranda menampilkan `🚨 BREAKING: [Judul Berita]` dengan warna sesuai sentimen. |
| **Eksekusi Sita Jaminan** | Jika admin mengeksekusi jaminan, saldo atau saham debitur berkurang otomatis dan notifikasi terkirim. |
| **Ban / Pembekuan Akun** | Pemain yang dibekukan otomatis dialihkan ke layar peringatan pelanggaran. |

---

## 3. Checklist Pengujian di Perangkat Fisik
- [ ] Disclaimer kepatuhan hukum simulasi muncul saat pertama kali buka aplikasi.
- [ ] Registrasi & Login pemain baru (mendapatkan modal awal 100.000 IB).
- [ ] Navigasi 5 tab bawah (Beranda, Pasar, Bursa Aset, Portofolio, Peringkat).
- [ ] Menampilkan grafik harga saham realtime.
- [ ] Eksekusi order Beli 1 Lot (100 lembar) saham emiten.
- [ ] Eksekusi order Jual saham dari portofolio.
- [ ] Pengajuan pinjaman tunai di menu Bank Sentral.
- [ ] Menerima siaran berita makro realtime tanpa perlu refresh layar.
