// ============================================================================
// CAPITAL FEDERATION - EMITEN & BOT POPULATION ENGINE (LEGAL, FIKTIF & REALISTIS)
// 100% Nama Fiktif Resmi Bebas dari Masalah Merek Dagang & UU ITE
// Kode Saham (Ticker) 4 Huruf Alfabet Murni (Tanpa Angka, contoh: SYCA, BCNT)
// Mendukung 1.000++ Pengguna Konglomerat & Ratusan Emiten Tbk.
// ============================================================================

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

// Flagship Emiten Konglomerat 12 Naga & Taipan Utama (16 Emiten Blue Chip Utama)
const FLAGSHIP_CONGLOMERATE_COMPANIES = [
  { symbol: 'KEAP', name: 'PT. Kencana Artha Persada Tbk.', sector: 'Keuangan', basePrice: 15800, status: 'HEALTHY' },
  { symbol: 'SAPN', name: 'PT. Samudera Prima Nusantara Tbk.', sector: 'Transportasi', basePrice: 14600, status: 'HEALTHY' },
  { symbol: 'MABS', name: 'PT. Mahakarya Buana Sejahtera Tbk.', sector: 'Properti', basePrice: 13900, status: 'HEALTHY' },
  { symbol: 'MEPR', name: 'PT. Megantara Perkasa Raya Tbk.', sector: 'Energi', basePrice: 13200, status: 'HEALTHY' },
  { symbol: 'CIGM', name: 'PT. Cipta Graha Mandiri Tbk.', sector: 'Properti', basePrice: 12400, status: 'HEALTHY' },
  { symbol: 'SEPA', name: 'PT. Sentosa Pangan Abadi Tbk.', sector: 'F&B', basePrice: 11900, status: 'HEALTHY' },
  { symbol: 'SUGL', name: 'PT. Surya Gemilang Lestari Tbk.', sector: 'Energi', basePrice: 11500, status: 'HEALTHY' },
  { symbol: 'TRSM', name: 'PT. Tridaya Sumber Makmur Tbk.', sector: 'Manufaktur', basePrice: 12800, status: 'HEALTHY' },
  { symbol: 'BUCE', name: 'PT. Bumantara Cipta Energi Tbk.', sector: 'Energi', basePrice: 10900, status: 'HEALTHY' },
  { symbol: 'CAMF', name: 'PT. Cakrawala Mineral Federasi Tbk.', sector: 'Energi', basePrice: 10200, status: 'HEALTHY' },
  { symbol: 'DINS', name: 'PT. Dinamika Niaga Sentral Tbk.', sector: 'Keuangan', basePrice: 9600, status: 'HEALTHY' },
  { symbol: 'LIBM', name: 'PT. Lintas Benua Maritim Tbk.', sector: 'Transportasi', basePrice: 9100, status: 'HEALTHY' },
  { symbol: 'GRMP', name: 'PT. Graha Mitra Persada Tbk.', sector: 'Properti', basePrice: 8700, status: 'HEALTHY' },
  { symbol: 'NUHM', name: 'PT. Nusa Harapan Makmur Tbk.', sector: 'F&B', basePrice: 8400, status: 'HEALTHY' },
  { symbol: 'BEAS', name: 'PT. Berkah Alam Sejahtera Tbk.', sector: 'Kesehatan', basePrice: 7900, status: 'HEALTHY' },
  { symbol: 'TRAS', name: 'PT. Trias Artha Sentosa Tbk.', sector: 'Teknologi', basePrice: 8200, status: 'HEALTHY' },
];

const BATCH_1_COMPANIES = [
  { symbol: 'MFPR', name: 'PT. Medika Farma Prima Tbk.', sector: 'Kesehatan', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'BVNS', name: 'PT. Bio Vaksin Nusantara Tbk.', sector: 'Kesehatan', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'MIHS', name: 'PT. Mitra Husada Sejahtera Tbk.', sector: 'Kesehatan', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'NUNU', name: 'PT. Nutrisindo Nutrisi Utama Tbk.', sector: 'Kesehatan', basePrice: 8600, status: 'HEALTHY' },
  { symbol: 'SEHR', name: 'PT. Sentosa Hospital Raya Tbk.', sector: 'Kesehatan', basePrice: 6100, status: 'HEALTHY' },
  { symbol: 'BIAM', name: 'PT. Bina Alat Medika Tbk.', sector: 'Kesehatan', basePrice: 2900, status: 'HEALTHY' },
  { symbol: 'HEAL', name: 'PT. Herbal Alami Nusantara Tbk.', sector: 'Kesehatan', basePrice: 1400, status: 'HEALTHY' },
  { symbol: 'RIGE', name: 'PT. Riset Genomik Federasi Tbk.', sector: 'Kesehatan', basePrice: 9200, status: 'HEALTHY' },
  { symbol: 'FABS', name: 'PT. Farmasi Berkah Sentosa Tbk.', sector: 'Kesehatan', basePrice: 2100, status: 'HEALTHY' },
  { symbol: 'DIPI', name: 'PT. Diagnostika Prima Inti Tbk.', sector: 'Kesehatan', basePrice: 750, status: 'CRITICAL' },
  { symbol: 'SAMR', name: 'PT. Samudera Maritim Raya Tbk.', sector: 'Transportasi', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'KELE', name: 'PT. Kereta Logistik Ekspres Tbk.', sector: 'Transportasi', basePrice: 5300, status: 'HEALTHY' },
  { symbol: 'TRKN', name: 'PT. Trans Kencana Nusantara Tbk.', sector: 'Transportasi', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'TPKB', name: 'PT. Terminal Peti Kemas Buana Tbk.', sector: 'Transportasi', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'KUKE', name: 'PT. Kurir Kilat Express Tbk.', sector: 'Transportasi', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'ARKM', name: 'PT. Armada Kargo Mandiri Tbk.', sector: 'Transportasi', basePrice: 2200, status: 'HEALTHY' },
  { symbol: 'MOAC', name: 'PT. Mobilitas Armada Cerdas Tbk.', sector: 'Transportasi', basePrice: 1600, status: 'HEALTHY' },
  { symbol: 'LIAK', name: 'PT. Lintas Angkasa Kargo Tbk.', sector: 'Transportasi', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'RAPD', name: 'PT. Rantai Pasok Dingin Tbk.', sector: 'Transportasi', basePrice: 3700, status: 'HEALTHY' },
  { symbol: 'JTLT', name: 'PT. Jalur Tol Lingkar Timur Tbk.', sector: 'Transportasi', basePrice: 820, status: 'CRITICAL' },
  { symbol: 'MUKM', name: 'PT. Mulia Kencana Mineral Tbk.', sector: 'Energi', basePrice: 14500, status: 'HEALTHY' },
  { symbol: 'NIMN', name: 'PT. Nikel Murni Nusantara Tbk.', sector: 'Energi', basePrice: 9800, status: 'HEALTHY' },
  { symbol: 'BUBP', name: 'PT. Bukit Bara Perkasa Tbk.', sector: 'Energi', basePrice: 7600, status: 'HEALTHY' },
  { symbol: 'TATM', name: 'PT. Tambang Tembaga Megah Tbk.', sector: 'Energi', basePrice: 13200, status: 'HEALTHY' },
  { symbol: 'ALBB', name: 'PT. Alumina Bauksit Buana Tbk.', sector: 'Energi', basePrice: 5200, status: 'HEALTHY' },
  { symbol: 'TISL', name: 'PT. Timah Sentosa Lestari Tbk.', sector: 'Energi', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'PELT', name: 'PT. Peleburan Logam Terpadu Tbk.', sector: 'Energi', basePrice: 8100, status: 'HEALTHY' },
  { symbol: 'SIMK', name: 'PT. Silika Mineral Kaca Tbk.', sector: 'Energi', basePrice: 4400, status: 'HEALTHY' },
  { symbol: 'KIGP', name: 'PT. Kilang Gas Persada Tbk.', sector: 'Energi', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'ASBP', name: 'PT. Aspal Buton Perkasa Tbk.', sector: 'Energi', basePrice: 650, status: 'CRITICAL' },
  { symbol: 'MESP', name: 'PT. Menara Seluler Prima Tbk.', sector: 'Teknologi', basePrice: 5800, status: 'HEALTHY' },
  { symbol: 'SAOF', name: 'PT. Satelit Orbit Federasi Tbk.', sector: 'Teknologi', basePrice: 8300, status: 'HEALTHY' },
  { symbol: 'MEBP', name: 'PT. Media Buana Penyiaran Tbk.', sector: 'Teknologi', basePrice: 2400, status: 'HEALTHY' },
  { symbol: 'SAMB', name: 'PT. Sarana Menara Bersama Tbk.', sector: 'Teknologi', basePrice: 6900, status: 'HEALTHY' },
  { symbol: 'JAFO', name: 'PT. Jaringan Fiber Optima Tbk.', sector: 'Teknologi', basePrice: 4600, status: 'HEALTHY' },
  { symbol: 'CIMT', name: 'PT. Citra Media Televisi Tbk.', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'BEDM', name: 'PT. Berita Digital Mandiri Tbk.', sector: 'Teknologi', basePrice: 1900, status: 'HEALTHY' },
  { symbol: 'CIPK', name: 'PT. Cipta Pariwara Kreatif Tbk.', sector: 'Teknologi', basePrice: 2700, status: 'HEALTHY' },
  { symbol: 'PUDK', name: 'PT. Pusat Data Komputasi Tbk.', sector: 'Teknologi', basePrice: 10400, status: 'HEALTHY' },
  { symbol: 'SISN', name: 'PT. Siaran Suara Nusantara Tbk.', sector: 'Teknologi', basePrice: 580, status: 'CRITICAL' },
  { symbol: 'SAMP', name: 'PT. Sawit Makmur Persada Tbk.', sector: 'F&B', basePrice: 7900, status: 'HEALTHY' },
  { symbol: 'PASN', name: 'PT. Padi Subur Nusantara Tbk.', sector: 'F&B', basePrice: 3300, status: 'HEALTHY' },
  { symbol: 'TABL', name: 'PT. Tambak Bahari Lestari Tbk.', sector: 'F&B', basePrice: 4500, status: 'HEALTHY' },
  { symbol: 'PELS', name: 'PT. Peternakan Lembu Sejahtera Tbk.', sector: 'F&B', basePrice: 5600, status: 'HEALTHY' },
  { symbol: 'PEKM', name: 'PT. Perkebunan Kopi Megah Tbk.', sector: 'F&B', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'BETU', name: 'PT. Benih Tani Unggulan Tbk.', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'COMN', name: 'PT. Cokelat Mulia Nusantara Tbk.', sector: 'F&B', basePrice: 4800, status: 'HEALTHY' },
  { symbol: 'BEPS', name: 'PT. Beras Pulen Sejati Tbk.', sector: 'F&B', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'PATB', name: 'PT. Pakan Ternak Berkah Tbk.', sector: 'F&B', basePrice: 2700, status: 'HEALTHY' },
  { symbol: 'HOSS', name: 'PT. Hortikultura Sayur Segar Tbk.', sector: 'F&B', basePrice: 910, status: 'CRITICAL' },
];

const BATCH_2_COMPANIES = [
  { symbol: 'SAWN', name: 'PT. Sabun Wangi Nusantara Tbk.', sector: 'F&B', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'KOCA', name: 'PT. Kosmetika Cantik Alami Tbk.', sector: 'F&B', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'GUMS', name: 'PT. Gula Manis Sentosa Tbk.', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'MINM', name: 'PT. Minyak Nabati Murni Tbk.', sector: 'F&B', basePrice: 5200, status: 'HEALTHY' },
  { symbol: 'AIMP', name: 'PT. Air Minum Pegunungan Tbk.', sector: 'F&B', basePrice: 7400, status: 'HEALTHY' },
  { symbol: 'SUSF', name: 'PT. Susu Segar Federasi Tbk.', sector: 'F&B', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'BIRM', name: 'PT. Biskuit Renyah Megah Tbk.', sector: 'F&B', basePrice: 2600, status: 'HEALTHY' },
  { symbol: 'MISR', name: 'PT. Mi Instan Selera Rasa Tbk.', sector: 'F&B', basePrice: 9500, status: 'HEALTHY' },
  { symbol: 'KOCH', name: 'PT. Kopi Celup Harum Tbk.', sector: 'F&B', basePrice: 3700, status: 'HEALTHY' },
  { symbol: 'GADY', name: 'PT. Garam Dapur Yodium Tbk.', sector: 'F&B', basePrice: 680, status: 'CRITICAL' },
  { symbol: 'MICT', name: 'PT. Mikro Chip Terpadu Tbk.', sector: 'Teknologi', basePrice: 16800, status: 'HEALTHY' },
  { symbol: 'SEOC', name: 'PT. Sensor Otomasi Cerdas Tbk.', sector: 'Teknologi', basePrice: 7500, status: 'HEALTHY' },
  { symbol: 'PASC', name: 'PT. Papan Sirkuit Cetak Tbk.', sector: 'Teknologi', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'DISR', name: 'PT. Dioda Semikonduktor Raya Tbk.', sector: 'Teknologi', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'LEOP', name: 'PT. Lensa Optoelektronik Tbk.', sector: 'Teknologi', basePrice: 6300, status: 'HEALTHY' },
  { symbol: 'KORI', name: 'PT. Komponen Robotik Industri Tbk.', sector: 'Teknologi', basePrice: 11200, status: 'HEALTHY' },
  { symbol: 'MEFN', name: 'PT. Memori Flash Nusantara Tbk.', sector: 'Teknologi', basePrice: 5400, status: 'HEALTHY' },
  { symbol: 'MOKN', name: 'PT. Modul Komunikasi Nirkabel Tbk.', sector: 'Teknologi', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'KATM', name: 'PT. Kabel Transmisi Mikro Tbk.', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'PEMS', name: 'PT. Perakitan Modul Sirkuit Tbk.', sector: 'Teknologi', basePrice: 920, status: 'CRITICAL' },
  { symbol: 'SUPP', name: 'PT. Surya Panel Perkasa Tbk.', sector: 'Energi', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'PEAB', name: 'PT. Pembangkit Angin Bayu Tbk.', sector: 'Energi', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'GEPB', name: 'PT. Geotermal Panas Bumi Tbk.', sector: 'Energi', basePrice: 8800, status: 'HEALTHY' },
  { symbol: 'HEAM', name: 'PT. Hidro Energi Air Mengalir Tbk.', sector: 'Energi', basePrice: 7300, status: 'HEALTHY' },
  { symbol: 'BIEL', name: 'PT. Biomassa Energi Lestari Tbk.', sector: 'Energi', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'BALN', name: 'PT. Baterai Litium Nasional Tbk.', sector: 'Energi', basePrice: 13500, status: 'HEALTHY' },
  { symbol: 'STPD', name: 'PT. Stasiun Pengisian Daya Tbk.', sector: 'Energi', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'KOEH', name: 'PT. Konversi Energi Hijau Tbk.', sector: 'Energi', basePrice: 4600, status: 'HEALTHY' },
  { symbol: 'JATB', name: 'PT. Jaringan Transmisi Bersih Tbk.', sector: 'Energi', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'PELB', name: 'PT. Pengolahan Limbah Biomassa Tbk.', sector: 'Energi', basePrice: 720, status: 'CRITICAL' },
  { symbol: 'CIBM', name: 'PT. Cipta Beton Megah Tbk.', sector: 'Manufaktur', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'JEBB', name: 'PT. Jembatan Baja Buana Tbk.', sector: 'Manufaktur', basePrice: 7800, status: 'HEALTHY' },
  { symbol: 'TEBT', name: 'PT. Terowongan Bawah Tanah Tbk.', sector: 'Manufaktur', basePrice: 9100, status: 'HEALTHY' },
  { symbol: 'ASHF', name: 'PT. Aspal Hotmix Federasi Tbk.', sector: 'Manufaktur', basePrice: 3600, status: 'HEALTHY' },
  { symbol: 'TIPK', name: 'PT. Tiang Pancang Kuat Tbk.', sector: 'Manufaktur', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'SABK', name: 'PT. Sarana Air Bersih Kota Tbk.', sector: 'Manufaktur', basePrice: 5500, status: 'HEALTHY' },
  { symbol: 'REPI', name: 'PT. Rekayasa Pengairan Irigasi Tbk.', sector: 'Manufaktur', basePrice: 2800, status: 'HEALTHY' },
  { symbol: 'PEDP', name: 'PT. Pengerukan Dermaga Pelabuhan Tbk.', sector: 'Manufaktur', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'PEJR', name: 'PT. Pemancangan Jalur Rel Tbk.', sector: 'Manufaktur', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'SADM', name: 'PT. Saluran Drainase Megah Tbk.', sector: 'Manufaktur', basePrice: 840, status: 'CRITICAL' },
  { symbol: 'PEHB', name: 'PT. Pesona Hotel Bintang Tbk.', sector: 'Properti', basePrice: 4800, status: 'HEALTHY' },
  { symbol: 'TAWS', name: 'PT. Taman Wisata Samudera Tbk.', sector: 'Properti', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'SAHB', name: 'PT. Sarana Hiburan Bioskop Tbk.', sector: 'Properti', basePrice: 5700, status: 'HEALTHY' },
  { symbol: 'GEPS', name: 'PT. Gedung Pameran Sentosa Tbk.', sector: 'Properti', basePrice: 6500, status: 'HEALTHY' },
  { symbol: 'REPT', name: 'PT. Resor Pantai Tropis Tbk.', sector: 'Properti', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'WARK', name: 'PT. Wahana Rekreasi Keluarga Tbk.', sector: 'Properti', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'JARS', name: 'PT. Jaringan Restoran Selera Tbk.', sector: 'F&B', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'KAKM', name: 'PT. Kafe Kopi Modern Tbk.', sector: 'F&B', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'AGWP', name: 'PT. Agen Wisata Pesiar Tbk.', sector: 'Properti', basePrice: 2600, status: 'HEALTHY' },
  { symbol: 'ARGR', name: 'PT. Arena Gelanggang Remaja Tbk.', sector: 'Properti', basePrice: 620, status: 'CRITICAL' },
];

// Generator 500+ Emiten Tambahan untuk melengkapi 600+ Perusahaan Tbk. di Bursa
const PREFIX_WORDS = [
  'Mulia', 'Prima', 'Duta', 'Sentra', 'Cakra', 'Surya', 'Kencana', 'Nusa', 'Artha', 'Mega',
  'Tridaya', 'Bumantara', 'Sinar', 'Graha', 'Mitra', 'Dinamika', 'Berkah', 'Trias', 'Karya', 'Citra',
  'Samudera', 'Persada', 'Sentosa', 'Utama', 'Abadi', 'Jaya', 'Lestari', 'Gemilang', 'Makmur', 'Harmoni'
];

const SECTOR_MIDDLE_WORDS = {
  'Keuangan': ['Finansial', 'Sekuritas', 'Modal', 'Ventura', 'Investama', 'Kapital', 'Dana', 'Aset'],
  'Teknologi': ['Digital', 'Komputasi', 'Siber', 'Tekno', 'Peranti', 'Jaringan', 'Informatika', 'Sistem'],
  'Energi': ['Daya', 'Tenaga', 'Minyak', 'Gas', 'Mineral', 'Tambang', 'Elektrisitas', 'Sumberdaya'],
  'F&B': ['Pangan', 'Boga', 'Nutrisi', 'Konsumsi', 'Agro', 'Kuliner', 'Rasa', 'Panganindo'],
  'Properti': ['Residensi', 'Graha', 'Kawasan', 'Propertindo', 'Pengembang', 'Urban', 'Lahan', 'Estate'],
  'Manufaktur': ['Fabrikasi', 'Industri', 'Presisi', 'Rekayasa', 'Material', 'Semen', 'Baja', 'Logam'],
  'Kesehatan': ['Medika', 'Farma', 'Klinika', 'Diagnostika', 'Husada', 'Laboratoria', 'Bio', 'Riset'],
  'Transportasi': ['Logistik', 'Ekspres', 'Kargo', 'Maritim', 'Armada', 'Trans', 'Lintas', 'Distribusi']
};

const SECTOR_LIST = ['Keuangan', 'Teknologi', 'Energi', 'F&B', 'Properti', 'Manufaktur', 'Kesehatan', 'Transportasi'];

const GENERATED_COMPANIES = [];
const usedGeneratedSymbols = new Set([
  ...FLAGSHIP_CONGLOMERATE_COMPANIES.map(c => c.symbol),
  ...BATCH_1_COMPANIES.map(c => c.symbol),
  ...BATCH_2_COMPANIES.map(c => c.symbol)
]);

let pIdx = 0;
while (GENERATED_COMPANIES.length < 520) {
  const sector = SECTOR_LIST[pIdx % SECTOR_LIST.length];
  const pWord = PREFIX_WORDS[Math.floor(pIdx / 8) % PREFIX_WORDS.length];
  const midWords = SECTOR_MIDDLE_WORDS[sector];
  const mWord = midWords[pIdx % midWords.length];
  const sWord = PREFIX_WORDS[(pIdx + 7) % PREFIX_WORDS.length];
  const compName = 'PT. ' + pWord + ' ' + mWord + ' ' + sWord + ' Tbk.';

  const ticker = deriveCleanTicker(compName, usedGeneratedSymbols);
  const basePrice = Math.round(500 + ((pIdx * 137) % 11500));
  const status = (pIdx % 15 === 0) ? 'CRITICAL' : 'HEALTHY';

  GENERATED_COMPANIES.push({
    symbol: ticker,
    name: compName,
    sector,
    basePrice,
    status
  });
  pIdx++;
}

const ALL_NEW_COMPANIES = [
  ...FLAGSHIP_CONGLOMERATE_COMPANIES,
  ...BATCH_1_COMPANIES,
  ...BATCH_2_COMPANIES,
  ...GENERATED_COMPANIES
];

// DAFTAR 1.050 BOT PEMAIN (12 NAGA, TAIPAN, MENENGAH & RITEL)
const baseFirstNames = [
  'haziq', 'reza', 'dimas', 'fajar', 'adit', 'bayu', 'galih', 'rizky', 'alif', 'tiara',
  'nadia', 'yusuf', 'andi', 'satria', 'gilang', 'arya', 'donny', 'deni', 'eka', 'rendy',
  'arif', 'wahyu', 'bagas', 'ilham', 'teguh', 'anwar', 'dani', 'ferry', 'lukman', 'dicky',
  'taufik', 'zulfikar', 'naufal', 'hafiz', 'rafli', 'ardian', 'ivan', 'aldo', 'surya', 'fadli',
  'fatur', 'angga', 'pratama', 'maulana', 'ihsan', 'kurnia', 'firman', 'gunawan', 'saputra', 'wijaya',
  'kusuma', 'santoso', 'hermawan', 'setiawan', 'pramono', 'wibowo', 'susanto', 'nugroho', 'subekti', 'purnama',
  'suryadi', 'hidayat', 'firmansyah', 'ardiansyah', 'ramadhan', 'syahputra', 'ridho', 'fauzan', 'haikal', 'farhan',
  'hendra', 'kevin', 'putra', 'rio', 'budi', 'siti', 'maya', 'indra', 'citra', 'lisa',
  'rudi', 'eko', 'tono', 'doni', 'tomi', 'sigit', 'wawan', 'anto', 'dedi', 'rully',
  'sony', 'irwan', 'roni', 'ikhsan', 'bima', 'gita', 'mira', 'tari', 'dinda', 'agung',
  'akbar', 'danu', 'faris', 'ghazi', 'hanif', 'iqbal', 'johan', 'kamal', 'lutfi', 'malik',
  'nanda', 'oscar', 'pandu', 'qori', 'rama', 'salman', 'topan', 'umar', 'vicky', 'wildan',
  'yoga', 'zaki', 'abrar', 'bastian', 'cakra', 'daffa', 'erwin', 'fahmi', 'gibran', 'hilman',
  'irfan', 'jefri', 'kemal', 'leo', 'miko', 'novan', 'oki', 'panji', 'rafi', 'sandi',
  'tito', 'ulil', 'vino', 'wisnu', 'yudi', 'zafran', 'adnan', 'benny', 'chandra', 'deri',
  'edwin', 'farid', 'gary', 'hasan', 'imam', 'jaka', 'kiki', 'lian', 'marwan', 'nico',
  'opik', 'pasha', 'qomar', 'rian', 'sultan', 'tegar', 'usman', 'verdy', 'willy', 'yusufm',
  'zainal', 'ammar', 'bobby', 'catur', 'dodi', 'erik', 'faisal', 'gani', 'hadi', 'ibnu',
  'jamal', 'khalid', 'lucky', 'munir', 'nasir', 'onky', 'prima', 'qais', 'rico', 'syahrul',
  'taufan', 'ujang', 'vito', 'wendy', 'yayan', 'zidan', 'azzam', 'barra', 'chairul', 'dzaki',
  'evan', 'farel', 'gian', 'haris', 'ilhami', 'jundi', 'kenzie', 'laode', 'mahdi', 'nabil',
  'ozan', 'putri', 'intan', 'amelia', 'dewi', 'ratna', 'sari', 'ayu', 'bella', 'clara',
  'diana', 'elsa', 'fira', 'gisela', 'hana', 'indah', 'jelita', 'kirana', 'laras', 'melati',
  'nisa', 'olivia', 'puspa', 'qonita', 'rania', 'salma', 'talita', 'ulfa', 'vania', 'widya',
  'yasmin', 'zahra', 'arman', 'burhan', 'choirul', 'darma', 'endang', 'fuad', 'guntur', 'hamzah',
  'ismail', 'jauhari', 'kadir', 'latif', 'mansyur', 'nasrul', 'priyo', 'rusli', 'syukri', 'tamrin',
  'untung', 'wahid', 'yamin', 'zamzam', 'alfian'
];

const extraIndoNames = [
  'abimanyu', 'ade', 'aditya', 'agus', 'ajeng', 'akhsan', 'alamsyah', 'ananta', 'anggi', 'annisa',
  'aprilia', 'arief', 'ariel', 'aris', 'arizal', 'asri', 'astuti', 'athalla', 'aufar', 'ayunda',
  'bagaswara', 'bahar', 'bambang', 'barata', 'basuki', 'bayhaqi', 'bilal', 'bintang', 'bram', 'cahyo',
  'calvin', 'cantika', 'daniyal', 'darul', 'david', 'deva', 'dhani', 'dimitri', 'dita', 'dwi',
  'dzulfiqar', 'eliza', 'elvan', 'erlangga', 'fachri', 'fadilah', 'fakhri', 'fathur', 'fatimah', 'febri',
  'fian', 'firdaus', 'fitria', 'galang', 'galuh', 'ganendra', 'gemilang', 'gerald', 'gilbert', 'gloria',
  'habib', 'hafidz', 'hakim', 'halim', 'hamid', 'harits', 'harun', 'hasbi', 'haykal', 'helmi',
  'hendri', 'herdi', 'hisyam', 'huda', 'husen', 'ichsan', 'ikhwan', 'indraja', 'irham', 'irsyad',
  'irwansyah', 'isma', 'izzat', 'jabbar', 'jaenudin', 'jamil', 'janitra', 'jasmine', 'jauhar', 'jonathan',
  'jovian', 'julianto', 'kamil', 'karim', 'keisya', 'khairi', 'kresna', 'kurniawan', 'laksana', 'latifah',
  'lestari', 'lingga', 'lukas', 'lutfia', 'mahendra', 'mahfud', 'makruf', 'maliki', 'maman', 'mansur',
  'marcello', 'mario', 'marzuki', 'maulidi', 'megantara', 'melinda', 'miftah', 'mirza', 'muhajir', 'muhammad',
  'muhyidin', 'mukhlis', 'mustofa', 'mutia', 'nadhim', 'nadjib', 'nafla', 'najwa', 'nashir', 'nathan',
  'naufalyn', 'nayla', 'nazhif', 'niken', 'nirmala', 'noval', 'novi', 'nugraha', 'nurhadi', 'nurul',
  'pandega', 'pascal', 'perdana', 'permadi', 'permata', 'prakoso', 'pranoto', 'prasetya', 'prasetyo', 'prayoga',
  'pribadi', 'primadita', 'qabil', 'qayyim', 'qodir', 'raden', 'radhitya', 'raditya', 'rafayel', 'rafif',
  'rahadian', 'rahardjo', 'raharja', 'rahmat', 'rais', 'rakha', 'ramdani', 'rasyid', 'rayhan', 'rehan',
  'reski', 'restu', 'reynaldi', 'reyner', 'rifki', 'rifqy', 'rijal', 'rilwan', 'riski', 'rizaldi',
  'rohman', 'rois', 'rossi', 'rozi', 'ruslan', 'sabda', 'sadikin', 'saepudin', 'safiq', 'safrudin',
  'sahrul', 'said', 'saiful', 'salam', 'salim', 'samir', 'samuel', 'sanusi', 'sarwono', 'sasongko',
  'satriyo', 'septian', 'setyo', 'shafira', 'sholeh', 'sidik', 'silvia', 'sinaga', 'siregar', 'soeharto',
  'subagyo', 'sudarmono', 'suhendra', 'suherman', 'sukardi', 'sukma', 'sulaiman', 'sulistyo', 'sumantri', 'sunardi',
  'supardi', 'supriadi', 'suprayitno', 'suranto', 'suroso', 'sutanto', 'sutopo', 'sutrisno', 'syabana', 'syafei',
  'syahid', 'syahroni', 'syamsul', 'syaoki', 'tahmid', 'tarigan', 'thoriq', 'tiyas', 'tommy', 'tri',
  'trianto', 'triatmojo', 'triono', 'uswatun', 'vandi', 'variel', 'veronika', 'vidya', 'virgo', 'wahidin',
  'wardani', 'wibisono', 'wicaksono', 'widagdo', 'widodo', 'widyatama', 'wijanarko', 'wilmar', 'wiranto', 'wirawan',
  'wulan', 'yahya', 'yanuar', 'yasin', 'yogi', 'yosafat', 'yuda', 'yudha', 'yudhistira', 'yuliana',
  'yulius', 'yunus', 'yusran', 'yusril', 'yustisi', 'zachary', 'zaenal', 'zahir', 'zahirah', 'zahran',
  'zain', 'zainuddin', 'zaky', 'zarif', 'zayyan', 'zhafir', 'zharif', 'zulfi', 'zulkarnain'
];

const NATURAL_USERNAMES = [...baseFirstNames];
for (const en of extraIndoNames) {
  if (!NATURAL_USERNAMES.includes(en)) NATURAL_USERNAMES.push(en);
}

const affixes = ['capital', 'invest', 'artha', 'jaya', 'prima', 'nusa', 'surya', 'kencana', 'makmur', 'sentosa', 'lestari', 'mandiri', 'perkasa', 'holding', 'korp', 'duta'];
let aIdx = 0;
while (NATURAL_USERNAMES.length < 1050) {
  const base = NATURAL_USERNAMES[aIdx % 300];
  const aff = affixes[Math.floor(aIdx / 300) % affixes.length];
  const candidate = base + '_' + aff;
  if (!NATURAL_USERNAMES.includes(candidate)) {
    NATURAL_USERNAMES.push(candidate);
  }
  aIdx++;
}

// 8 Nama PT Privat Non-Tbk
const PRIVATE_NON_TBK_PT_NAMES = [
  'PT. Nusantara Karya Mandiri',
  'PT. Kreasi Digital Pratama',
  'PT. Agro Pangan Sejati',
  'PT. Mitra Logistik Terpadu',
  'PT. Sinar Konstruksi Nusantara',
  'PT. Prima Niaga Sejahtera',
  'PT. Cahaya Energi Mandiri',
  'PT. Bina Properti Harmoni',
];

// Buat array 1.050 BOT secara terstruktur & bervariasi
const BOT_ROSTER_1050 = NATURAL_USERNAMES.map((name, idx) => {
  const is12Naga = idx < 12;
  const isTaipan = idx >= 12 && idx < 35;
  const isMid = idx >= 35 && idx < 150;
  const isListedOwner = idx < 600; // 600 Bot pertama memiliki PT Tbk. yang ada di Bursa Saham
  const isPrivatePtOwner = idx >= 600 && idx < 800; // 200 Bot memiliki PT Privat (belum IPO / belum Tbk.)
  const hasPt = (isListedOwner || isPrivatePtOwner) ? 1 : 0; // Sisanya adalah Ritel Murni tanpa PT

  let balance_ib = 0;
  let company_balance_ib = 0;
  let pt_level = 1;
  let rd_level = 1;
  let employees_count = 0;
  let is_blue_chip = 0;
  let role = 'PLAYER';

  if (is12Naga) {
    // 12 NAGA: Sultan Elit Tertinggi Federasi (Puluhan Miliar IB, R&D Level 10-22, Staff 200-600)
    balance_ib = (25 + (12 - idx) * 4.0) * 1000000000.0;
    company_balance_ib = (38 + (12 - idx) * 5.0) * 1000000000.0;
    pt_level = 5;
    rd_level = 10 + (12 - idx);
    employees_count = 200 + ((12 - idx) * 35);
    is_blue_chip = 1;
    role = 'PLAYER';
  } else if (isTaipan) {
    // TAIPAN (13-35): Konglomerat Mapan (Miliaran IB, R&D Level 6-9, Staff 60-150)
    balance_ib = (3.0 + (35 - idx) * 0.45) * 1000000000.0;
    company_balance_ib = (5.0 + (35 - idx) * 0.65) * 1000000000.0;
    pt_level = idx < 22 ? 4 : 3;
    rd_level = 6 + ((35 - idx) % 4);
    employees_count = 60 + ((35 - idx) * 4);
    is_blue_chip = idx < 25 ? 1 : 0;
    role = 'PLAYER';
  } else if (isMid) {
    // Konglomerat Menengah (36-150): 400 Juta - 2.5 Miliar IB
    balance_ib = (400 + (150 - idx) * 14) * 1000000.0;
    company_balance_ib = (600 + (150 - idx) * 18) * 1000000.0;
    pt_level = 3;
    rd_level = 3 + (idx % 3);
    employees_count = 25 + (idx % 30);
  } else if (isListedOwner) {
    // Pemilik Emiten Tbk. Kecil/Menengah (151-600): 100 Juta - 450 Juta IB
    balance_ib = (90 + ((600 - idx) * 0.75)) * 1000000.0;
    company_balance_ib = (140 + ((600 - idx) * 0.95)) * 1000000.0;
    pt_level = 2;
    rd_level = 2 + (idx % 2);
    employees_count = 15 + (idx % 15);
  } else if (isPrivatePtOwner) {
    // Pemilik PT Privat Belum IPO (601-800): 40 Juta - 95 Juta IB
    balance_ib = (40 + ((800 - idx) * 0.25)) * 1000000.0;
    company_balance_ib = (60 + ((800 - idx) * 0.35)) * 1000000.0;
    pt_level = 1;
    rd_level = 1;
    employees_count = 5 + (idx % 10);
  } else {
    // Investor Ritel Murni tanpa PT (801-1050): 12 Juta - 40 Juta IB
    balance_ib = (12 + ((1050 - idx) * 0.11)) * 1000000.0;
    company_balance_ib = 0.0;
    pt_level = 1;
    rd_level = 1;
    employees_count = 0;
  }

  const sector = SECTOR_LIST[idx % SECTOR_LIST.length];
  let pt_name = '';
  if (idx < FLAGSHIP_CONGLOMERATE_COMPANIES.length) {
    pt_name = FLAGSHIP_CONGLOMERATE_COMPANIES[idx].name;
  } else if (isPrivatePtOwner) {
    pt_name = PRIVATE_NON_TBK_PT_NAMES[(idx - 600) % PRIVATE_NON_TBK_PT_NAMES.length];
  } else if (hasPt) {
    pt_name = 'PT. ' + name.charAt(0).toUpperCase() + name.slice(1) + ' Korpora Tbk.';
  }

  const credit_score = Math.min(950, 720 + ((idx * 13) % 210));

  return {
    id: 'bot-user-' + String(idx + 1).padStart(4, '0'),
    username: name,
    pt_name,
    has_pt: hasPt,
    sector: hasPt ? sector : 'Ritel Finansial',
    pt_level,
    rd_level,
    employees_count,
    balance_ib: Math.round(balance_ib),
    company_balance_ib: Math.round(company_balance_ib),
    credit_score,
    is_blue_chip,
    role,
    is_listed_owner: isListedOwner ? 1 : 0,
  };
});

module.exports = {
  deriveCleanTicker,
  FLAGSHIP_CONGLOMERATE_COMPANIES,
  ADDITIONAL_COMPANIES: ALL_NEW_COMPANIES,
  BOT_ROSTER: BOT_ROSTER_1050,
  NATURAL_USERNAMES
};
