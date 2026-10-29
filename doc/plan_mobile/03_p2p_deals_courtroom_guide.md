# Panduan Arsitektur Mobile: Pasar Negosiasi P2P, Brankas Akta & Ruang Sidang Live PNAK

Dokumen ini menjelaskan alur teknis, modularitas kode, dan interaksi fitur pada aplikasi Flutter Monopoly Corp.

---

## 1. Struktur Folder & Modularitas File
Fitur diorganisir secara modular di dalam `mobile/lib/features/`:
- `corporate_deals/`:
  - `models/deal_model.dart`: Definisi objek `PrivateDealModel` dan `DealDeedModel`.
  - `services/deals_service.dart`: Klien API untuk katalog global, inbox P2P, penandatanganan akta, brankas, dan gugatan PNAK.
  - `screens/corporate_deals_screen.dart`: Layar terpadu 3 sub-tab (Katalog Global, Tawaran Masuk P2P, Brankas Akta Tersimpan).
  - `widgets/deal_card.dart`: Kartu penawaran dengan badge status dan aksi kontekstual.
  - `widgets/partial_buy_sheet.dart`: Modal kalkulasi dan pembelian eceran saham (misal 1% dari 10%).
  - `widgets/deed_card.dart`: Sertifikat akta notariil resmi, meterai digital, dan tombol gugatan wanprestasi PNAK.
  - `widgets/p2p_negotiation_sheet.dart`: Lembar divestasi saham ke calon pembeli spesifik atau publik.
  - `widgets/formal_deed_modal.dart`: Tinjau draft akta sebelum diterbitkan.
- `court_commercial/`:
  - `screens/court_live_room_screen.dart`: Ruang sidang interaktif PNAK dengan jadwal 10:00 WIB, tombol check-in kehadiran resmi, chat argumen para pihak, vonis putusan Verstek, dan hitung mundur 60 detik keluar ruangan.

---

## 2. Alur Pengalihan Saham & Dual-Signature Escrow
1. **Penerbitan Penawaran**:
   - Pemilik saham memilih porsi yang ingin dilepas (misal 20%).
   - Memilih target: **`Jual ke Pemain Lain (P2P)`** atau **`Pasar Global / Bursa`**.
   - Saham yang ditawarkan langsung dialokasikan di Escrow (`percentage_remaining`), sehingga kepemilikan penjual berkurang secara akurat tanpa dobel klaim.
2. **Persetujuan & Pembelian Parsial (Eceran)**:
   - Pembeli dapat membeli seluruh atau sebagian porsi (misal 1% dari 10%).
   - Pembeli menandatangani akta dan membayar via Kas Pribadi (`/sign-and-pay`).
   - Sistem memotong pajak bursa (0.1%) dan bea meterai (IB 10.000) masuk ke Kas Negara.
   - Hak kepemilikan saham dipindahkan secara seketika ke portofolio pembeli.
   - Terbit dokumen resmi berstempel Meterai Digital tersimpan permanen di kedua Brankas Akta.

---

## 3. Sidang Arbitrase & Putusan Verstek PNAK
1. **Pendaftaran Gugatan**:
   - Jika salah satu pihak ingkar janji atau membatalkan sepihak, pihak yang dirugikan dapat menekan tombol **`[ ⚖️ GUGAT WANPRESTASI KE PNAK ]`** langsung dari sertifikat akta.
2. **Kehadiran Para Pihak (Check-In)**:
   - Jadwal sidang ditetapkan otomatis pukul **10:00 WIB**.
   - Terdapat tombol resmi: **`[ 🟢 SAYA HADIR DI PERSIDANGAN ]`**.
3. **Putusan Verstek**:
   - Jika Tergugat mangkir/belum masuk sementara Penggugat telah hadir, Majelis Hakim menjatuhkan **Putusan Verstek**.
   - Penggugat menang mutlak dan uang ganti rugi penalti disita langsung cair ke Kas Pribadi penggugat.
4. **Hitung Mundur Keluar Ruangan**:
   - Setelah palu vonis diketuk, timer 60 detik berjalan otomatis menutup ruang sidang secara tertib.
