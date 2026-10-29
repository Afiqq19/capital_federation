# 📱 PLAN MOBILE: REPUBLIK KONOHA, E-IPO BOOKBUILDING & PENGADILAN NIAGA (PNAK)

Dokumen ini merupakan perencanaan teknis modul klien mobile (Flutter) untuk implementasi:
1. Nomenklatur & Lore **Republik Konoha**.
2. Sistem **E-IPO Bookbuilding Berjadwal & Penjatahan Strategis (Allotment)**.
3. Modul **Pengadilan Niaga & Arbitrase Korporasi Konoha (PNAK)**.
4. **Refaktorisasi Modular Arsitektur Folder** (Anti-Monolith).

---

## 🏛️ 1. Nomenklatur Resmi Republik Konoha di Klien Mobile

Semua tampilan UI yang sebelumnya menggunakan nama dunia nyata disesuaikan dengan nomenklatur Konoha:

| Tampilan Lama | Nomenklatur Baru (Konoha) | Penjelasan UI |
| :--- | :--- | :--- |
| `IHSG` | `IPMC (Indeks Pasar Modal Konoha)` | Ticker indeks gabungan di app bar pasar. |
| `Bank Indonesia / BI` | `BSK (Bank Sentral Konoha)` | Header tab pinjaman & lelang jaminan. |
| `OJK / Regulasi Bursa` | `OPFK / Komite IPMC` | Badge UMA, Suspensi, dan Regulasi Kepatuhan. |
| `Rupiah / IDR` | `IB (Indigo Billion)` | Mata uang resmi ekonomi Konoha. |
| `Pengadilan Niaga` | `PNAK (Pengadilan Niaga Konoha)` | Layar ruang sidang sengketa bisnis & kepailitan. |

---

## 📈 2. Desain Fitur E-IPO Bookbuilding & Penjatahan Strategis

### 2.1 Formulir Pendaftaran IPO Baru (`ipo_registration_form.dart`):
Saat PT Pemain memenuhi syarat IPO (Level PT >= 2 dan Aset >= IB 1 Miliar):
- **Jadwal Penawaran:**
  - `start_offering_date`: Tanggal pembukaan penawaran awal (Bookbuilding).
  - `allotment_date`: Tanggal penjatahan & penutupan penawaran.
  - `listing_date`: Tanggal pencatatan perdana di bursa efek IPMC.
- **Struktur Alokasi:**
  - **Porsi Publik (Wajib):** Minimal 10% (untuk likuiditas ritel di bursa).
  - **Porsi Mitra Strategis Korporasi:** 10% - 40% (diperebutkan oleh PT lain).
  - **Porsi Pendiri (Founder Lock):** 50% - 80% (tetap menjadi hak milik pendiri).

### 2.2 Alur Penawaran oleh Perusahaan Lain (Bookbuilding Bidding):
1. Pengumuman IPO baru muncul di katalog `features/ipo/screens/ipo_catalog_screen.dart`.
2. Perusahaan lain (PT B, C, D) yang memiliki saldo Kas PT cukup dapat mengajukan **Proposal Bidding**:
   - Memasukkan porsi yang diinginkan (misal PT B minta 12%, PT C minta 30%, PT D minta 20%).
   - Menyertakan memo kemitraan strategis.
3. Proposal masuk ke antrean emiten dengan status `PENDING`.

### 2.3 Dashboard Penjatahan & Seleksi Emiten (`ipo_allotment_screen.dart`):
Pemilik PT Emiten membuka menu **"Penjatahan Mitra IPO"**:
- Melihat profil masing-masing PT penawar:
  - Skor Kesehatan Bisnis / Fundamental Score (0 - 100).
  - Kemampuan Kas PT Penawar.
  - Rekam jejak (apakah berstatus SEHAT atau KRITIS).
- **Aksi Emiten:**
  - **Terima (Accept):** Kas PT pembeli didebet, dana langsung masuk ke Kas PT Emiten, kepemilikan dicatat di Akta Pemegang Saham.
  - **Tolak (Reject):** Proposal ditolak karena kondisi keuangan penawar dinilai berisiko.
- Setelah proses penjatahan selesai, emiten menekan tombol **"Resmikan Listing di Bursa IPMC"**.

---

## ⚖️ 3. Desain Fitur Pengadilan Niaga Konoha (PNAK)

### 3.1 Layar Ruang Sidang Virtual (`court_room_screen.dart`):
- Tema antarmuka: Kayu mahoni elegan, pilar marmer, dan timbangan keadilan emas ⚖️.
- Suara efek (*sound effect*) audio ketukan palu hakim 3x saat putusan dibacakan.
- Daftar Perkara Aktif di Republik Konoha:
  1. **Perkara Kepailitan & PKPU:** Gagal bayar pinjaman Bank Sentral Konoha (BSK). Putusan: Penetapan jadwal restrukturisasi atau lelang sita jaminan.
  2. **Perkara Sengketa Saham & Akuisisi Ilegal:** Gugatan atas pelanggaran akta perjanjian jual beli saham atau hostile takeover manipulatif.
  3. **Perkara Pelanggaran Pasar Modal:** Gugatan OPFK terhadap pelaku goreng saham / insider trading dengan vonis denda ganti rugi.

---

## 🗂️ 4. Refaktorisasi Modular Arsitektur Folder Mobile

Struktur folder baru yang memisahkan fitur besar dari file monolith `home_tab.dart`:

```
mobile/lib/
├── features/
│   ├── ipo/                              # Fitur E-IPO & Bookbuilding
│   │   ├── screens/
│   │   │   ├── ipo_catalog_screen.dart
│   │   │   └── ipo_allotment_screen.dart
│   │   ├── widgets/
│   │   │   ├── ipo_registration_form.dart
│   │   │   ├── ipo_bid_card.dart
│   │   │   └── ipo_timeline_widget.dart
│   │   └── models/
│   │       ├── ipo_offering.dart
│   │       └── ipo_bid.dart
│   │
│   ├── corporate_deals/                  # Fitur Negosiasi P2P, B2B & Buyback
│   │   ├── widgets/
│   │   │   ├── formal_deed_modal.dart    # Pindahan dari home_tab.dart
│   │   │   ├── p2p_negotiation_sheet.dart# Pindahan dari home_tab.dart
│   │   │   └── buyback_modal.dart        # Buyback Kas PT
│   │   └── services/
│   │       └── deed_service.dart
│   │
│   ├── court_commercial/                 # Fitur Pengadilan Niaga Konoha (PNAK)
│   │   ├── screens/
│   │   │   └── court_room_screen.dart
│   │   ├── widgets/
│   │   │   ├── court_case_card.dart
│   │   │   └── verdict_certificate.dart
│   │   └── models/
│   │       └── court_case.dart
│   │
│   └── macro_konoha/                     # Banner Indikator Negara Konoha
│       └── widgets/
│           └── konoha_macro_banner.dart
│
├── screens/                              # 5 Layar Tab Utama
├── services/                             # ApiService & SocketService
└── providers/                            # GameProvider
```
