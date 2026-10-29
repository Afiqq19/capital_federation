# Panduan Eksekutif Otoritas Moneter & Pengawasan Admin FEDERASI (PNAF & IPMC)

Dokumen ini mendokumentasikan fungsionalitas dan arsitektur modular Web Admin untuk pengelolaan Kas Negara, Brankas Akta Notariil, serta Penindakan Sita Emiten.

---

## 1. Brankas Kas Negara FEDERASI (`/treasury`)
- **Tujuan**: Memonitor aliran kas negara yang berasal dari denda pengadilan PNAF, bea meterai digital, pajak transaksi bursa (0.1%), dan lelang sita jaminan.
- **Rincian Sumber Likuiditas**:
  - `PNBP_COURT_FEE`: Biaya registrasi perkara & penalti wanprestasi.
  - `DIGITAL_METERAI`: Bea meterai notaris digital (IB 10.000 per lembar akta).
  - `TRANSACTION_TAX`: Pajak transaksi bursa dan pasar sekunder (0.1%).
  - `SEIZURE_AUCTION`: Dana hasil lelang aset korporasi sitaan.
- **Aksi Fiskal & Stimulus**:
  - **Dana Talangan Krisis (Bailout)**: Menyuntikkan likuiditas ke sektor perbankan/korporasi yang mengalami krisis moneter.
  - **Dividen Nasional (BLT Tunai)**: Mendistribusikan surplus kas negara secara merata ke seluruh rekening Kas Pribadi konglomerat aktif.

---

## 2. Brankas Akta & Kontrak Notariil P2P (`/deeds`)
- **Tujuan**: Arsip permanen seluruh transaksi pengalihan hak kepemilikan saham privat dan placement institusi.
- **Validasi Dokumen**:
  - Nomor Register Resmi: `AKTA/IPMC/YYYYMM/XXXX`.
  - Stempel Meterai Digital Negara: `MTR-FEDERASI-XXXX`.
  - Klausul Wanprestasi Pasal 7: Penalti ingkar janji 15% - 20% dapat digugat langsung ke sidang arbitrase PNAF.

---

## 3. Eksekusi Sita Perusahaan & Konversi BUMN (`/companies`)
- **Tujuan**: Penegakan hukum moneter terhadap emiten bermasalah atau gagal bayar kredit.
- **Aksi Cepat**:
  - `[ ⚖️ Sita Perusahaan ]`: Membekukan operasional emiten, mencabut hak dividen pendiri, dan menyita saham ke kas negara.
  - `[ 🏛️ Cabut Sita ]`: Memulihkan status emiten setelah memenuhi kewajiban pemulihan.
  - `[ 🏛️ Konversi Menjadi BUMN FEDERASI ]`: Mengalihkan status emiten 100% menjadi milik negara Republik FEDERASI.

---

## 4. Intervensi Langsung Suspensi Bursa (`/suspension`)
- Tab switcher:
  - **Semua Emiten Tercatat (Intervensi Cepat)**: Tombol instan `[ 🔴 Suspensi Cepat ]` dan `[ ⚠️ Beri UMA ]`.
  - **Sedang Disuspensi Saat Ini**: Riwayat dan tombol pencabutan suspensi.
