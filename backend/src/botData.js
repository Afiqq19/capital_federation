// ============================================================================
// CAPITAL FEDERATION - EMITEN & BOT POPULATION ENGINE (LEGAL, FIKTIF & REALISTIS)
// 100% Nama Fiktif Resmi Bebas dari Masalah Merek Dagang & UU ITE
// ============================================================================

// 50 Emiten Batch 1 (HEAL, TRNS, MINE, COMM, AGRI)
const BATCH_1_COMPANIES = [
  // Kesehatan & Farmasi (10)
  { symbol: 'HEAL01', name: 'PT Medika Farma Prima', sector: 'Kesehatan', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'HEAL02', name: 'PT Bio Vaksin Nusantara', sector: 'Kesehatan', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'HEAL03', name: 'PT Mitra Husada Sejahtera', sector: 'Kesehatan', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'HEAL04', name: 'PT Nutrisindo Nutrisi Utama', sector: 'Kesehatan', basePrice: 8600, status: 'HEALTHY' },
  { symbol: 'HEAL05', name: 'PT Sentosa Hospital Raya', sector: 'Kesehatan', basePrice: 6100, status: 'HEALTHY' },
  { symbol: 'HEAL06', name: 'PT Bina Alat Medika', sector: 'Kesehatan', basePrice: 2900, status: 'HEALTHY' },
  { symbol: 'HEAL07', name: 'PT Herbal Alami Nusantara', sector: 'Kesehatan', basePrice: 1400, status: 'HEALTHY' },
  { symbol: 'HEAL08', name: 'PT Riset Genomik Federasi', sector: 'Kesehatan', basePrice: 9200, status: 'HEALTHY' },
  { symbol: 'HEAL09', name: 'PT Farmasi Berkah Sentosa', sector: 'Kesehatan', basePrice: 2100, status: 'HEALTHY' },
  { symbol: 'HEAL10', name: 'PT Diagnostika Prima Inti', sector: 'Kesehatan', basePrice: 750, status: 'CRITICAL' },

  // Transportasi & Logistik (10)
  { symbol: 'TRNS01', name: 'PT Samudera Maritim Raya', sector: 'Transportasi', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'TRNS02', name: 'PT Kereta Logistik Ekspres', sector: 'Transportasi', basePrice: 5300, status: 'HEALTHY' },
  { symbol: 'TRNS03', name: 'PT Trans Kencana Nusantara', sector: 'Transportasi', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'TRNS04', name: 'PT Terminal Peti Kemas Buana', sector: 'Transportasi', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'TRNS05', name: 'PT Kurir Kilat Express', sector: 'Transportasi', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'TRNS06', name: 'PT Armada Kargo Mandiri', sector: 'Transportasi', basePrice: 2200, status: 'HEALTHY' },
  { symbol: 'TRNS07', name: 'PT Mobilitas Armada Cerdas', sector: 'Transportasi', basePrice: 1600, status: 'HEALTHY' },
  { symbol: 'TRNS08', name: 'PT Lintas Angkasa Kargo', sector: 'Transportasi', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'TRNS09', name: 'PT Rantai Pasok Dingin', sector: 'Transportasi', basePrice: 3700, status: 'HEALTHY' },
  { symbol: 'TRNS10', name: 'PT Jalur Tol Lingkar Timur', sector: 'Transportasi', basePrice: 820, status: 'CRITICAL' },

  // Pertambangan & Mineral (10)
  { symbol: 'MINE01', name: 'PT Mulia Kencana Mineral', sector: 'Energi', basePrice: 14500, status: 'HEALTHY' },
  { symbol: 'MINE02', name: 'PT Nikel Murni Nusantara', sector: 'Energi', basePrice: 9800, status: 'HEALTHY' },
  { symbol: 'MINE03', name: 'PT Bukit Bara Perkasa', sector: 'Energi', basePrice: 7600, status: 'HEALTHY' },
  { symbol: 'MINE04', name: 'PT Tambang Tembaga Megah', sector: 'Energi', basePrice: 13200, status: 'HEALTHY' },
  { symbol: 'MINE05', name: 'PT Alumina Bauksit Buana', sector: 'Energi', basePrice: 5200, status: 'HEALTHY' },
  { symbol: 'MINE06', name: 'PT Timah Sentosa Lestari', sector: 'Energi', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'MINE07', name: 'PT Peleburan Logam Terpadu', sector: 'Energi', basePrice: 8100, status: 'HEALTHY' },
  { symbol: 'MINE08', name: 'PT Silika Mineral Kaca', sector: 'Energi', basePrice: 4400, status: 'HEALTHY' },
  { symbol: 'MINE09', name: 'PT Kilang Gas Persada', sector: 'Energi', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'MINE10', name: 'PT Aspal Buton Perkasa', sector: 'Energi', basePrice: 650, status: 'CRITICAL' },

  // Telekomunikasi & Media (10)
  { symbol: 'COMM01', name: 'PT Menara Seluler Prima', sector: 'Teknologi', basePrice: 5800, status: 'HEALTHY' },
  { symbol: 'COMM02', name: 'PT Satelit Orbit Federasi', sector: 'Teknologi', basePrice: 8300, status: 'HEALTHY' },
  { symbol: 'COMM03', name: 'PT Media Buana Penyiaran', sector: 'Teknologi', basePrice: 2400, status: 'HEALTHY' },
  { symbol: 'COMM04', name: 'PT Sarana Menara Bersama', sector: 'Teknologi', basePrice: 6900, status: 'HEALTHY' },
  { symbol: 'COMM05', name: 'PT Jaringan Fiber Optima', sector: 'Teknologi', basePrice: 4600, status: 'HEALTHY' },
  { symbol: 'COMM06', name: 'PT Citra Media Televisi', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'COMM07', name: 'PT Berita Digital Mandiri', sector: 'Teknologi', basePrice: 1900, status: 'HEALTHY' },
  { symbol: 'COMM08', name: 'PT Cipta Pariwara Kreatif', sector: 'Teknologi', basePrice: 2700, status: 'HEALTHY' },
  { symbol: 'COMM09', name: 'PT Pusat Data Komputasi', sector: 'Teknologi', basePrice: 10400, status: 'HEALTHY' },
  { symbol: 'COMM10', name: 'PT Siaran Suara Nusantara', sector: 'Teknologi', basePrice: 580, status: 'CRITICAL' },

  // Agrikultur & Perkebunan (10)
  { symbol: 'AGRI01', name: 'PT Sawit Makmur Persada', sector: 'F&B', basePrice: 7900, status: 'HEALTHY' },
  { symbol: 'AGRI02', name: 'PT Padi Subur Nusantara', sector: 'F&B', basePrice: 3300, status: 'HEALTHY' },
  { symbol: 'AGRI03', name: 'PT Tambak Bahari Lestari', sector: 'F&B', basePrice: 4500, status: 'HEALTHY' },
  { symbol: 'AGRI04', name: 'PT Peternakan Lembu Sejahtera', sector: 'F&B', basePrice: 5600, status: 'HEALTHY' },
  { symbol: 'AGRI05', name: 'PT Perkebunan Kopi Megah', sector: 'F&B', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'AGRI06', name: 'PT Benih Tani Unggulan', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'AGRI07', name: 'PT Cokelat Mulia Nusantara', sector: 'F&B', basePrice: 4800, status: 'HEALTHY' },
  { symbol: 'AGRI08', name: 'PT Beras Pulen Sejati', sector: 'F&B', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'AGRI09', name: 'PT Pakan Ternak Berkah', sector: 'F&B', basePrice: 2700, status: 'HEALTHY' },
  { symbol: 'AGRI10', name: 'PT Hortikultura Sayur Segar', sector: 'F&B', basePrice: 910, status: 'CRITICAL' },
];

// 50 Emiten Tambahan Batch 2 (CNS, SEMI, RENE, INFR, TOUR) - Total Emiten Bursa Menjadi 212 Emiten
const BATCH_2_COMPANIES = [
  // Consumer Goods / Barang Konsumsi Ritel (10)
  { symbol: 'CNS01', name: 'PT Sabun Wangi Nusantara', sector: 'F&B', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'CNS02', name: 'PT Kosmetika Cantik Alami', sector: 'F&B', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'CNS03', name: 'PT Gula Manis Sentosa', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'CNS04', name: 'PT Minyak Nabati Murni', sector: 'F&B', basePrice: 5200, status: 'HEALTHY' },
  { symbol: 'CNS05', name: 'PT Air Minum Pegunungan', sector: 'F&B', basePrice: 7400, status: 'HEALTHY' },
  { symbol: 'CNS06', name: 'PT Susu Segar Federasi', sector: 'F&B', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'CNS07', name: 'PT Biskuit Renyah Megah', sector: 'F&B', basePrice: 2600, status: 'HEALTHY' },
  { symbol: 'CNS08', name: 'PT Mi Instan Selera Rasa', sector: 'F&B', basePrice: 9500, status: 'HEALTHY' },
  { symbol: 'CNS09', name: 'PT Kopi Celup Harum', sector: 'F&B', basePrice: 3700, status: 'HEALTHY' },
  { symbol: 'CNS10', name: 'PT Garam Dapur Yodium', sector: 'F&B', basePrice: 680, status: 'CRITICAL' },

  // Otomasi & Semikonduktor (10)
  { symbol: 'SEMI01', name: 'PT Mikro Chip Terpadu', sector: 'Teknologi', basePrice: 16800, status: 'HEALTHY' },
  { symbol: 'SEMI02', name: 'PT Sensor Otomasi Cerdas', sector: 'Teknologi', basePrice: 7500, status: 'HEALTHY' },
  { symbol: 'SEMI03', name: 'PT Papan Sirkuit Cetak', sector: 'Teknologi', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'SEMI04', name: 'PT Dioda Semikonduktor Raya', sector: 'Teknologi', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'SEMI05', name: 'PT Lensa Optoelektronik', sector: 'Teknologi', basePrice: 6300, status: 'HEALTHY' },
  { symbol: 'SEMI06', name: 'PT Komponen Robotik Industri', sector: 'Teknologi', basePrice: 11200, status: 'HEALTHY' },
  { symbol: 'SEMI07', name: 'PT Memori Flash Nusantara', sector: 'Teknologi', basePrice: 5400, status: 'HEALTHY' },
  { symbol: 'SEMI08', name: 'PT Modul Komunikasi Nirkabel', sector: 'Teknologi', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'SEMI09', name: 'PT Kabel Transmisi Mikro', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'SEMI10', name: 'PT Perakitan Modul Sirkuit', sector: 'Teknologi', basePrice: 920, status: 'CRITICAL' },

  // Energi Baru & Terbarukan (10)
  { symbol: 'RENE01', name: 'PT Surya Panel Perkasa', sector: 'Energi', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'RENE02', name: 'PT Pembangkit Angin Bayu', sector: 'Energi', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'RENE03', name: 'PT Geotermal Panas Bumi', sector: 'Energi', basePrice: 8800, status: 'HEALTHY' },
  { symbol: 'RENE04', name: 'PT Hidro Energi Air Mengalir', sector: 'Energi', basePrice: 7300, status: 'HEALTHY' },
  { symbol: 'RENE05', name: 'PT Biomassa Energi Lestari', sector: 'Energi', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'RENE06', name: 'PT Baterai Litium Nasional', sector: 'Energi', basePrice: 13500, status: 'HEALTHY' },
  { symbol: 'RENE07', name: 'PT Stasiun Pengisian Daya', sector: 'Energi', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'RENE08', name: 'PT Konversi Energi Hijau', sector: 'Energi', basePrice: 4600, status: 'HEALTHY' },
  { symbol: 'RENE09', name: 'PT Jaringan Transmisi Bersih', sector: 'Energi', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'RENE10', name: 'PT Pengolahan Limbah Biomassa', sector: 'Energi', basePrice: 720, status: 'CRITICAL' },

  // Infrastruktur Sipil & Konstruksi (10)
  { symbol: 'INFR01', name: 'PT Cipta Beton Megah', sector: 'Manufaktur', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'INFR02', name: 'PT Jembatan Baja Buana', sector: 'Manufaktur', basePrice: 7800, status: 'HEALTHY' },
  { symbol: 'INFR03', name: 'PT Terowongan Bawah Tanah', sector: 'Manufaktur', basePrice: 9100, status: 'HEALTHY' },
  { symbol: 'INFR04', name: 'PT Aspal Hotmix Federasi', sector: 'Manufaktur', basePrice: 3600, status: 'HEALTHY' },
  { symbol: 'INFR05', name: 'PT Tiang Pancang Kuat', sector: 'Manufaktur', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'INFR06', name: 'PT Sarana Air Bersih Kota', sector: 'Manufaktur', basePrice: 5500, status: 'HEALTHY' },
  { symbol: 'INFR07', name: 'PT Rekayasa Pengairan Irigasi', sector: 'Manufaktur', basePrice: 2800, status: 'HEALTHY' },
  { symbol: 'INFR08', name: 'PT Pengerukan Dermaga Pelabuhan', sector: 'Manufaktur', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'INFR09', name: 'PT Pemancangan Jalur Rel', sector: 'Manufaktur', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'INFR10', name: 'PT Saluran Drainase Megah', sector: 'Manufaktur', basePrice: 840, status: 'CRITICAL' },

  // Pariwisata, Perhotelan & Hiburan (10)
  { symbol: 'TOUR01', name: 'PT Pesona Hotel Bintang', sector: 'Properti', basePrice: 4800, status: 'HEALTHY' },
  { symbol: 'TOUR02', name: 'PT Taman Wisata Samudera', sector: 'Properti', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'TOUR03', name: 'PT Sarana Hiburan Bioskop', sector: 'Properti', basePrice: 5700, status: 'HEALTHY' },
  { symbol: 'TOUR04', name: 'PT Gedung Pameran Sentosa', sector: 'Properti', basePrice: 6500, status: 'HEALTHY' },
  { symbol: 'TOUR05', name: 'PT Resor Pantai Tropis', sector: 'Properti', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'TOUR06', name: 'PT Wahana Rekreasi Keluarga', sector: 'Properti', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'TOUR07', name: 'PT Jaringan Restoran Selera', sector: 'F&B', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'TOUR08', name: 'PT Kafe Kopi Modern', sector: 'F&B', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'TOUR09', name: 'PT Agen Wisata Pesiar', sector: 'Properti', basePrice: 2600, status: 'HEALTHY' },
  { symbol: 'TOUR10', name: 'PT Arena Gelanggang Remaja', sector: 'Properti', basePrice: 620, status: 'CRITICAL' },
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
  ADDITIONAL_COMPANIES: ALL_NEW_COMPANIES,
  BOT_ROSTER: BOT_ROSTER_100
};
