// ============================================================================
// CAPITAL FEDERATION - EMITEN & BOT POPULATION ENGINE (LEGAL, FIKTIF & REALISTIS)
// 100% Nama Fiktif Resmi Bebas dari Masalah Merek Dagang & UU ITE
// Kode Saham (Ticker) 4 Huruf Alfabet Murni (Tanpa Angka, contoh: SYCA, BCNT)
// ============================================================================

/**
 * Menghasilkan singkatan kode saham (Ticker) 4 huruf alfabet murni dari nama PT
 * Contoh: "PT. Syafiq Capital" -> "SYCA", "PT. Bank Central Nusantara" -> "BCNT"
 */
function deriveCleanTicker(companyName, usedSymbols = new Set()) {
  const clean = String(companyName || '')
    .replace(/^(PT\.?\s*)+/i, '')
    .replace(/\b(Tbk\.?|Persero|Indonesia|Nusantara|Federasi)\b/gi, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .toUpperCase();

  const allWords = String(companyName || '')
    .replace(/^(PT\.?\s*)+/i, '')
    .replace(/\b(Tbk\.?)\b/gi, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  const words = clean.split(/\s+/).filter((w) => w.length >= 2);
  const wList = words.length >= 2 ? words : allWords;

  const candidates = [];

  if (wList.length === 1) {
    const w = wList[0].padEnd(4, 'X');
    candidates.push(w.slice(0, 4));
    candidates.push(w[0] + w[1] + w[2] + w[w.length - 1]);
  } else if (wList.length === 2) {
    const [a, b] = wList;
    // Prioritas 1: 2 huruf kata pertama + 2 huruf kata kedua (PT. Syafiq Capital -> SYCA)
    if (a.length >= 2 && b.length >= 2) candidates.push(a.slice(0, 2) + b.slice(0, 2));
    if (a.length >= 3 && b.length >= 1) candidates.push(a.slice(0, 3) + b[0]);
    if (a.length >= 1 && b.length >= 3) candidates.push(a[0] + b.slice(0, 3));
    if (a.length >= 2 && b.length >= 2) candidates.push(a[0] + a[a.length - 1] + b[0] + b[b.length - 1]);
  } else if (wList.length === 3) {
    const [a, b, c] = wList;
    candidates.push(a.slice(0, 2) + b[0] + c[0]);
    candidates.push(a[0] + b.slice(0, 2) + c[0]);
    candidates.push(a[0] + b[0] + c.slice(0, 2));
    if (b.length >= 2 && c.length >= 2) candidates.push(b.slice(0, 2) + c.slice(0, 2));
    if (a.length >= 2 && b.length >= 2) candidates.push(a.slice(0, 2) + b.slice(0, 2));
  } else if (wList.length >= 4) {
    const [a, b, c, d] = wList;
    candidates.push(a[0] + b[0] + c[0] + d[0]);
    candidates.push(a.slice(0, 2) + b[0] + c[0]);
    candidates.push(a[0] + b.slice(0, 2) + c[0]);
    candidates.push(a[0] + b[0] + c.slice(0, 2));
  }

  for (const cand of candidates) {
    const sym = cand.replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X');
    if (sym.length === 4 && !usedSymbols.has(sym)) {
      usedSymbols.add(sym);
      return sym;
    }
  }

  // Fallback kombinasi huruf dari gabungan kata (tetap 4 huruf alfabet murni tanpa angka)
  const joined = wList.join('').replace(/[^A-Z]/g, '').padEnd(4, 'A');
  const prefix3 = joined.slice(0, 3);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alphabet.length; i++) {
    const sym = prefix3 + alphabet[i];
    if (!usedSymbols.has(sym)) {
      usedSymbols.add(sym);
      return sym;
    }
  }
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const sym = joined.slice(0, 2) + alphabet[i] + alphabet[j];
      if (!usedSymbols.has(sym)) {
        usedSymbols.add(sym);
        return sym;
      }
    }
  }
  return 'CFXA';
}

// 50 Emiten Batch 1 (Kesehatan, Transportasi, Pertambangan, Telekomunikasi, Agrikultur)
const BATCH_1_COMPANIES = [
  // Kesehatan & Farmasi (10)
  { symbol: 'MFPR', name: 'PT. Medika Farma Prima', sector: 'Kesehatan', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'BVNS', name: 'PT. Bio Vaksin Nusantara', sector: 'Kesehatan', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'MIHS', name: 'PT. Mitra Husada Sejahtera', sector: 'Kesehatan', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'NUNU', name: 'PT. Nutrisindo Nutrisi Utama', sector: 'Kesehatan', basePrice: 8600, status: 'HEALTHY' },
  { symbol: 'SEHR', name: 'PT. Sentosa Hospital Raya', sector: 'Kesehatan', basePrice: 6100, status: 'HEALTHY' },
  { symbol: 'BIAM', name: 'PT. Bina Alat Medika', sector: 'Kesehatan', basePrice: 2900, status: 'HEALTHY' },
  { symbol: 'HEAL', name: 'PT. Herbal Alami Nusantara', sector: 'Kesehatan', basePrice: 1400, status: 'HEALTHY' },
  { symbol: 'RIGE', name: 'PT. Riset Genomik Federasi', sector: 'Kesehatan', basePrice: 9200, status: 'HEALTHY' },
  { symbol: 'FABS', name: 'PT. Farmasi Berkah Sentosa', sector: 'Kesehatan', basePrice: 2100, status: 'HEALTHY' },
  { symbol: 'DIPI', name: 'PT. Diagnostika Prima Inti', sector: 'Kesehatan', basePrice: 750, status: 'CRITICAL' },

  // Transportasi & Logistik (10)
  { symbol: 'SAMR', name: 'PT. Samudera Maritim Raya', sector: 'Transportasi', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'KELE', name: 'PT. Kereta Logistik Ekspres', sector: 'Transportasi', basePrice: 5300, status: 'HEALTHY' },
  { symbol: 'TRKN', name: 'PT. Trans Kencana Nusantara', sector: 'Transportasi', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'TPKB', name: 'PT. Terminal Peti Kemas Buana', sector: 'Transportasi', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'KUKE', name: 'PT. Kurir Kilat Express', sector: 'Transportasi', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'ARKM', name: 'PT. Armada Kargo Mandiri', sector: 'Transportasi', basePrice: 2200, status: 'HEALTHY' },
  { symbol: 'MOAC', name: 'PT. Mobilitas Armada Cerdas', sector: 'Transportasi', basePrice: 1600, status: 'HEALTHY' },
  { symbol: 'LIAK', name: 'PT. Lintas Angkasa Kargo', sector: 'Transportasi', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'RAPD', name: 'PT. Rantai Pasok Dingin', sector: 'Transportasi', basePrice: 3700, status: 'HEALTHY' },
  { symbol: 'JTLT', name: 'PT. Jalur Tol Lingkar Timur', sector: 'Transportasi', basePrice: 820, status: 'CRITICAL' },

  // Pertambangan & Mineral (10)
  { symbol: 'MUKM', name: 'PT. Mulia Kencana Mineral', sector: 'Energi', basePrice: 14500, status: 'HEALTHY' },
  { symbol: 'NIMN', name: 'PT. Nikel Murni Nusantara', sector: 'Energi', basePrice: 9800, status: 'HEALTHY' },
  { symbol: 'BUBP', name: 'PT. Bukit Bara Perkasa', sector: 'Energi', basePrice: 7600, status: 'HEALTHY' },
  { symbol: 'TATM', name: 'PT. Tambang Tembaga Megah', sector: 'Energi', basePrice: 13200, status: 'HEALTHY' },
  { symbol: 'ALBB', name: 'PT. Alumina Bauksit Buana', sector: 'Energi', basePrice: 5200, status: 'HEALTHY' },
  { symbol: 'TISL', name: 'PT. Timah Sentosa Lestari', sector: 'Energi', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'PELT', name: 'PT. Peleburan Logam Terpadu', sector: 'Energi', basePrice: 8100, status: 'HEALTHY' },
  { symbol: 'SIMK', name: 'PT. Silika Mineral Kaca', sector: 'Energi', basePrice: 4400, status: 'HEALTHY' },
  { symbol: 'KIGP', name: 'PT. Kilang Gas Persada', sector: 'Energi', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'ASBP', name: 'PT. Aspal Buton Perkasa', sector: 'Energi', basePrice: 650, status: 'CRITICAL' },

  // Telekomunikasi & Media (10)
  { symbol: 'MESP', name: 'PT. Menara Seluler Prima', sector: 'Teknologi', basePrice: 5800, status: 'HEALTHY' },
  { symbol: 'SAOF', name: 'PT. Satelit Orbit Federasi', sector: 'Teknologi', basePrice: 8300, status: 'HEALTHY' },
  { symbol: 'MEBP', name: 'PT. Media Buana Penyiaran', sector: 'Teknologi', basePrice: 2400, status: 'HEALTHY' },
  { symbol: 'SAMB', name: 'PT. Sarana Menara Bersama', sector: 'Teknologi', basePrice: 6900, status: 'HEALTHY' },
  { symbol: 'JAFO', name: 'PT. Jaringan Fiber Optima', sector: 'Teknologi', basePrice: 4600, status: 'HEALTHY' },
  { symbol: 'CIMT', name: 'PT. Citra Media Televisi', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'BEDM', name: 'PT. Berita Digital Mandiri', sector: 'Teknologi', basePrice: 1900, status: 'HEALTHY' },
  { symbol: 'CIPK', name: 'PT. Cipta Pariwara Kreatif', sector: 'Teknologi', basePrice: 2700, status: 'HEALTHY' },
  { symbol: 'PUDK', name: 'PT. Pusat Data Komputasi', sector: 'Teknologi', basePrice: 10400, status: 'HEALTHY' },
  { symbol: 'SISN', name: 'PT. Siaran Suara Nusantara', sector: 'Teknologi', basePrice: 580, status: 'CRITICAL' },

  // Agrikultur & Perkebunan (10)
  { symbol: 'SAMP', name: 'PT. Sawit Makmur Persada', sector: 'F&B', basePrice: 7900, status: 'HEALTHY' },
  { symbol: 'PASN', name: 'PT. Padi Subur Nusantara', sector: 'F&B', basePrice: 3300, status: 'HEALTHY' },
  { symbol: 'TABL', name: 'PT. Tambak Bahari Lestari', sector: 'F&B', basePrice: 4500, status: 'HEALTHY' },
  { symbol: 'PELS', name: 'PT. Peternakan Lembu Sejahtera', sector: 'F&B', basePrice: 5600, status: 'HEALTHY' },
  { symbol: 'PEKM', name: 'PT. Perkebunan Kopi Megah', sector: 'F&B', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'BETU', name: 'PT. Benih Tani Unggulan', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'COMN', name: 'PT. Cokelat Mulia Nusantara', sector: 'F&B', basePrice: 4800, status: 'HEALTHY' },
  { symbol: 'BEPS', name: 'PT. Beras Pulen Sejati', sector: 'F&B', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'PATB', name: 'PT. Pakan Ternak Berkah', sector: 'F&B', basePrice: 2700, status: 'HEALTHY' },
  { symbol: 'HOSS', name: 'PT. Hortikultura Sayur Segar', sector: 'F&B', basePrice: 910, status: 'CRITICAL' },
];

// 50 Emiten Tambahan Batch 2 (Consumer Goods, Semikonduktor, EBT, Infrastruktur, Pariwisata)
const BATCH_2_COMPANIES = [
  // Consumer Goods / Barang Konsumsi Ritel (10)
  { symbol: 'SAWN', name: 'PT. Sabun Wangi Nusantara', sector: 'F&B', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'KOCA', name: 'PT. Kosmetika Cantik Alami', sector: 'F&B', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'GUMS', name: 'PT. Gula Manis Sentosa', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'MINM', name: 'PT. Minyak Nabati Murni', sector: 'F&B', basePrice: 5200, status: 'HEALTHY' },
  { symbol: 'AIMP', name: 'PT. Air Minum Pegunungan', sector: 'F&B', basePrice: 7400, status: 'HEALTHY' },
  { symbol: 'SUSF', name: 'PT. Susu Segar Federasi', sector: 'F&B', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'BIRM', name: 'PT. Biskuit Renyah Megah', sector: 'F&B', basePrice: 2600, status: 'HEALTHY' },
  { symbol: 'MISR', name: 'PT. Mi Instan Selera Rasa', sector: 'F&B', basePrice: 9500, status: 'HEALTHY' },
  { symbol: 'KOCH', name: 'PT. Kopi Celup Harum', sector: 'F&B', basePrice: 3700, status: 'HEALTHY' },
  { symbol: 'GADY', name: 'PT. Garam Dapur Yodium', sector: 'F&B', basePrice: 680, status: 'CRITICAL' },

  // Otomasi & Semikonduktor (10)
  { symbol: 'MICT', name: 'PT. Mikro Chip Terpadu', sector: 'Teknologi', basePrice: 16800, status: 'HEALTHY' },
  { symbol: 'SEOC', name: 'PT. Sensor Otomasi Cerdas', sector: 'Teknologi', basePrice: 7500, status: 'HEALTHY' },
  { symbol: 'PASC', name: 'PT. Papan Sirkuit Cetak', sector: 'Teknologi', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'DISR', name: 'PT. Dioda Semikonduktor Raya', sector: 'Teknologi', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'LEOP', name: 'PT. Lensa Optoelektronik', sector: 'Teknologi', basePrice: 6300, status: 'HEALTHY' },
  { symbol: 'KORI', name: 'PT. Komponen Robotik Industri', sector: 'Teknologi', basePrice: 11200, status: 'HEALTHY' },
  { symbol: 'MEFN', name: 'PT. Memori Flash Nusantara', sector: 'Teknologi', basePrice: 5400, status: 'HEALTHY' },
  { symbol: 'MOKN', name: 'PT. Modul Komunikasi Nirkabel', sector: 'Teknologi', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'KATM', name: 'PT. Kabel Transmisi Mikro', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'PEMS', name: 'PT. Perakitan Modul Sirkuit', sector: 'Teknologi', basePrice: 920, status: 'CRITICAL' },

  // Energi Baru & Terbarukan (10)
  { symbol: 'SUPP', name: 'PT. Surya Panel Perkasa', sector: 'Energi', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'PEAB', name: 'PT. Pembangkit Angin Bayu', sector: 'Energi', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'GEPB', name: 'PT. Geotermal Panas Bumi', sector: 'Energi', basePrice: 8800, status: 'HEALTHY' },
  { symbol: 'HEAM', name: 'PT. Hidro Energi Air Mengalir', sector: 'Energi', basePrice: 7300, status: 'HEALTHY' },
  { symbol: 'BIEL', name: 'PT. Biomassa Energi Lestari', sector: 'Energi', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'BALN', name: 'PT. Baterai Litium Nasional', sector: 'Energi', basePrice: 13500, status: 'HEALTHY' },
  { symbol: 'STPD', name: 'PT. Stasiun Pengisian Daya', sector: 'Energi', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'KOEH', name: 'PT. Konversi Energi Hijau', sector: 'Energi', basePrice: 4600, status: 'HEALTHY' },
  { symbol: 'JATB', name: 'PT. Jaringan Transmisi Bersih', sector: 'Energi', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'PELB', name: 'PT. Pengolahan Limbah Biomassa', sector: 'Energi', basePrice: 720, status: 'CRITICAL' },

  // Infrastruktur Sipil & Konstruksi (10)
  { symbol: 'CIBM', name: 'PT. Cipta Beton Megah', sector: 'Manufaktur', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'JEBB', name: 'PT. Jembatan Baja Buana', sector: 'Manufaktur', basePrice: 7800, status: 'HEALTHY' },
  { symbol: 'TEBT', name: 'PT. Terowongan Bawah Tanah', sector: 'Manufaktur', basePrice: 9100, status: 'HEALTHY' },
  { symbol: 'ASHF', name: 'PT. Aspal Hotmix Federasi', sector: 'Manufaktur', basePrice: 3600, status: 'HEALTHY' },
  { symbol: 'TIPK', name: 'PT. Tiang Pancang Kuat', sector: 'Manufaktur', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'SABK', name: 'PT. Sarana Air Bersih Kota', sector: 'Manufaktur', basePrice: 5500, status: 'HEALTHY' },
  { symbol: 'REPI', name: 'PT. Rekayasa Pengairan Irigasi', sector: 'Manufaktur', basePrice: 2800, status: 'HEALTHY' },
  { symbol: 'PEDP', name: 'PT. Pengerukan Dermaga Pelabuhan', sector: 'Manufaktur', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'PEJR', name: 'PT. Pemancangan Jalur Rel', sector: 'Manufaktur', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'SADM', name: 'PT. Saluran Drainase Megah', sector: 'Manufaktur', basePrice: 840, status: 'CRITICAL' },

  // Pariwisata, Perhotelan & Hiburan (10)
  { symbol: 'PEHB', name: 'PT. Pesona Hotel Bintang', sector: 'Properti', basePrice: 4800, status: 'HEALTHY' },
  { symbol: 'TAWS', name: 'PT. Taman Wisata Samudera', sector: 'Properti', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'SAHB', name: 'PT. Sarana Hiburan Bioskop', sector: 'Properti', basePrice: 5700, status: 'HEALTHY' },
  { symbol: 'GEPS', name: 'PT. Gedung Pameran Sentosa', sector: 'Properti', basePrice: 6500, status: 'HEALTHY' },
  { symbol: 'REPT', name: 'PT. Resor Pantai Tropis', sector: 'Properti', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'WARK', name: 'PT. Wahana Rekreasi Keluarga', sector: 'Properti', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'JARS', name: 'PT. Jaringan Restoran Selera', sector: 'F&B', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'KAKM', name: 'PT. Kafe Kopi Modern', sector: 'F&B', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'AGWP', name: 'PT. Agen Wisata Pesiar', sector: 'Properti', basePrice: 2600, status: 'HEALTHY' },
  { symbol: 'ARGR', name: 'PT. Arena Gelanggang Remaja', sector: 'Properti', basePrice: 620, status: 'CRITICAL' },
];

const ALL_NEW_COMPANIES = [...BATCH_1_COMPANIES, ...BATCH_2_COMPANIES];

// ============================================================================
// DAFTAR 100 BOT PEMAIN DENGAN NAMA SIMPEL & NATURAL (1 KATA GAYANYA GAMER)
// Tidak pakai embel-embel "_bot" / "_scalper" agar terlihat seperti pemain asli!
// ============================================================================
const NATURAL_USERNAMES = [
  // 1-10: Papan Peringkat Atas (Taipan & 9 Naga)
  'haziq', 'reza', 'dimas', 'fajar', 'adit', 'bayu', 'galih', 'rizky', 'alif', 'tiara',
  // 11-30: Taipan & Konglomerat Menengah
  'nadia', 'yusuf', 'andi', 'satria', 'gilang', 'arya', 'donny', 'deni', 'eka', 'rendy',
  'arif', 'wahyu', 'bagas', 'ilham', 'teguh', 'anwar', 'dani', 'ferry', 'lukman', 'dicky',
  // 31-60: Investor Aktif & Blue Chip
  'taufik', 'zulfikar', 'naufal', 'hafiz', 'rafli', 'ardian', 'ivan', 'aldo', 'surya', 'fadli',
  'fatur', 'angga', 'pratama', 'maulana', 'ihsan', 'kurnia', 'firman', 'gunawan', 'saputra', 'wijaya',
  'kusuma', 'santoso', 'hermawan', 'setiawan', 'pramono', 'wibowo', 'susanto', 'nugroho', 'subekti', 'purnama',
  // 61-100: Ritel Cepat, Day Trader & Scalper
  'suryadi', 'hidayat', 'firmansyah', 'ardiansyah', 'ramadhan', 'syahputra', 'ridho', 'fauzan', 'haikal', 'farhan',
  'hendra', 'kevin', 'putra', 'rio', 'budi', 'siti', 'maya', 'indra', 'citra', 'lisa',
  'rudi', 'eko', 'tono', 'doni', 'tomi', 'sigit', 'wawan', 'anto', 'dedi', 'rully',
  'sony', 'irwan', 'roni', 'andi19', 'bima', 'gita', 'mira', 'tari', 'dinda', 'agung'
];

// Simpan tanpa prefix "PT. " ganda agar saat dirender di UI tidak pernah menjadi "PT PT."
const FICTIONAL_PT_NAMES = [
  'PT. Kencana Artha Persada Tbk.',
  'PT. Samudera Prima Nusantara Tbk.',
  'PT. Mahakarya Buana Sejahtera Tbk.',
  'PT. Megantara Perkasa Raya Tbk.',
  'PT. Cipta Graha Mandiri Tbk.',
  'PT. Sentosa Pangan Abadi Tbk.',
  'PT. Surya Gemilang Lestari Tbk.',
  'PT. Tridaya Sumber Makmur Tbk.',
  'PT. Bumantara Cipta Energi Tbk.',
  'PT. Cakrawala Mineral Federasi Tbk.',
  'PT. Dinamika Niaga Sentral Tbk.',
  'PT. Lintas Benua Maritim Tbk.',
  'PT. Graha Mitra Persada Tbk.',
  'PT. Nusa Harapan Makmur Tbk.',
  'PT. Berkah Alam Sejahtera Tbk.',
  'PT. Trias Artha Sentosa Tbk.',
  'PT. Panji Mulia Korpora Tbk.',
  'PT. Kharisma Jaya Abadi Tbk.',
  'PT. Sinar Lautan Megah Tbk.',
  'PT. Buana Rekayasa Cipta Tbk.',
  'PT. Jagat Raya Konsorsium Tbk.',
  'PT. Wahana Ventura Mandiri Tbk.',
  'PT. Duta Niaga Nusantara Tbk.',
  'PT. Sinergi Mega Perkasa Tbk.',
  'PT. Pelita Artha Lestari Tbk.'
];

const SECTORS = ['Keuangan', 'Teknologi', 'Energi', 'F&B', 'Properti', 'Manufaktur', 'Kesehatan', 'Transportasi'];

// Buat array 100 BOT secara terstruktur & bervariasi
const BOT_ROSTER_100 = NATURAL_USERNAMES.map((name, idx) => {
  const isTop9 = idx < 9;
  const isTaipan = idx >= 9 && idx < 25;
  const isMid = idx >= 25 && idx < 45;
  const hasPt = idx < 25 ? 1 : (idx % 3 === 0 ? 1 : 0);

  let balance_ib = 0;
  let company_balance_ib = 0;
  let pt_level = 1;
  let is_blue_chip = 0;

  if (isTop9) {
    // Top 9 Taipan: Puluhan Miliar IB
    balance_ib = (15 + (9 - idx) * 3) * 1000000000.0;
    company_balance_ib = (25 + (9 - idx) * 4) * 1000000000.0;
    pt_level = 5;
    is_blue_chip = 1;
  } else if (isTaipan) {
    // Taipan 10-24: Miliaran IB
    balance_ib = (2 + (25 - idx) * 0.5) * 1000000000.0;
    company_balance_ib = (4 + (25 - idx) * 0.8) * 1000000000.0;
    pt_level = idx < 17 ? 4 : 3;
    is_blue_chip = idx < 15 ? 1 : 0;
  } else if (isMid) {
    // Investor Menengah: 500 Juta - 1.5 Miliar IB
    balance_ib = (400 + (45 - idx) * 35) * 1000000.0;
    company_balance_ib = hasPt ? (600 + (45 - idx) * 40) * 1000000.0 : 0.0;
    pt_level = 2;
  } else {
    // Ritel, Scalper & Day Trader: 35 Juta - 350 Juta IB
    balance_ib = (35 + ((idx * 17) % 320)) * 1000000.0;
    company_balance_ib = hasPt ? 50000000.0 : 0.0;
    pt_level = 1;
  }

  const sector = SECTORS[idx % SECTORS.length];
  const pt_name = hasPt ? (FICTIONAL_PT_NAMES[idx % FICTIONAL_PT_NAMES.length] || `PT. ${name.toUpperCase()} Sentosa Tbk.`) : '';
  const credit_score = Math.min(950, 720 + Math.floor(Math.random() * 200));

  return {
    id: `bot-user-${String(idx + 1).padStart(3, '0')}`,
    username: name,
    pt_name,
    has_pt: hasPt,
    sector: hasPt ? sector : 'Ritel Finansial',
    pt_level,
    balance_ib,
    company_balance_ib,
    credit_score,
    is_blue_chip,
    role: 'PLAYER'
  };
});

module.exports = {
  deriveCleanTicker,
  ADDITIONAL_COMPANIES: ALL_NEW_COMPANIES,
  BOT_ROSTER: BOT_ROSTER_100
};
