const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, initDb } = require('./db');
const { deriveCleanTicker, FLAGSHIP_CONGLOMERATE_COMPANIES, ADDITIONAL_COMPANIES, BOT_ROSTER } = require('./botData');

const RAW_COMPANY_NAMES = [
  // Teknologi (20)
  { name: 'PT. Nusantara Cloud System', sector: 'Teknologi', basePrice: 4200, status: 'HEALTHY' },
  { name: 'PT. Quantum Data Solusi', sector: 'Teknologi', basePrice: 8500, status: 'HEALTHY' },
  { name: 'PT. Algoritma Cerdas Raya', sector: 'Teknologi', basePrice: 12400, status: 'HEALTHY' },
  { name: 'PT. Siber Proteksi Aman', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { name: 'PT. Mikro Chip Nusantara', sector: 'Teknologi', basePrice: 15200, status: 'HEALTHY' },
  { name: 'PT. PayKilat Solusi Digital', sector: 'Teknologi', basePrice: 6300, status: 'HEALTHY' },
  { name: 'PT. Sarana Telematika Inti', sector: 'Teknologi', basePrice: 5100, status: 'HEALTHY' },
  { name: 'PT. Logika Otomasi Industri', sector: 'Teknologi', basePrice: 1800, status: 'CRITICAL' },
  { name: 'PT. Satelit Angkasa Cyber', sector: 'Teknologi', basePrice: 9700, status: 'HEALTHY' },
  { name: 'PT. Metaverse Dunia Baru', sector: 'Teknologi', basePrice: 650, status: 'CRITICAL' },
  { name: 'PT. Solusi Fiber Optik Optima', sector: 'Teknologi', basePrice: 3400, status: 'HEALTHY' },
  { name: 'PT. Robotika Solusi Cepat', sector: 'Teknologi', basePrice: 7200, status: 'HEALTHY' },
  { name: 'PT. Solusi Server Nusantara', sector: 'Teknologi', basePrice: 4900, status: 'HEALTHY' },
  { name: 'PT. Kripto Ledgers Mandiri', sector: 'Teknologi', basePrice: 850, status: 'CRITICAL' },
  { name: 'PT. Geo Spasial Cerdas', sector: 'Teknologi', basePrice: 3900, status: 'HEALTHY' },
  { name: 'PT. Finnet Payment Integrasi', sector: 'Teknologi', basePrice: 6800, status: 'HEALTHY' },
  { name: 'PT. Neural Network Mandiri', sector: 'Teknologi', basePrice: 8800, status: 'HEALTHY' },
  { name: 'PT. Edukasi Digital Prestasi', sector: 'Teknologi', basePrice: 2100, status: 'HEALTHY' },
  { name: 'PT. Agritech Agro Solusi', sector: 'Teknologi', basePrice: 720, status: 'CRITICAL' },
  { name: 'PT. Gameverse Studio Kreatif', sector: 'Teknologi', basePrice: 4600, status: 'HEALTHY' },

  // Properti (20)
  { name: 'PT. Griya Metropolitan Raya', sector: 'Properti', basePrice: 5400, status: 'HEALTHY' },
  { name: 'PT. Menara Inti Graha', sector: 'Properti', basePrice: 7800, status: 'HEALTHY' },
  { name: 'PT. Kawasan Hunian Sentosa', sector: 'Properti', basePrice: 3200, status: 'HEALTHY' },
  { name: 'PT. Bumi Land Lestari', sector: 'Properti', basePrice: 6100, status: 'HEALTHY' },
  { name: 'PT. Mega Tower Kencana', sector: 'Properti', basePrice: 11200, status: 'HEALTHY' },
  { name: 'PT. Real Estate Mandiri Makmur', sector: 'Properti', basePrice: 4300, status: 'HEALTHY' },
  { name: 'PT. Kota Mandiri Hijau', sector: 'Properti', basePrice: 5900, status: 'HEALTHY' },
  { name: 'PT. Apartemen Modern Living', sector: 'Properti', basePrice: 940, status: 'CRITICAL' },
  { name: 'PT. Sentra Logistik Properti', sector: 'Properti', basePrice: 8200, status: 'HEALTHY' },
  { name: 'PT. Wisata Resort Tropika', sector: 'Properti', basePrice: 620, status: 'CRITICAL' },
  { name: 'PT. Mall Kencana Graha', sector: 'Properti', basePrice: 6700, status: 'HEALTHY' },
  { name: 'PT. Graha Rekayasa Konstruksi', sector: 'Properti', basePrice: 3800, status: 'HEALTHY' },
  { name: 'PT. Cipta Lahan Gemilang', sector: 'Properti', basePrice: 4100, status: 'HEALTHY' },
  { name: 'PT. Condominium Mewah Inti', sector: 'Properti', basePrice: 880, status: 'CRITICAL' },
  { name: 'PT. Villa Eksklusif Sejahtera', sector: 'Properti', basePrice: 2900, status: 'HEALTHY' },
  { name: 'PT. Pusat Grosir Perdagangan', sector: 'Properti', basePrice: 5300, status: 'HEALTHY' },
  { name: 'PT. Dermaga Maritim Realty', sector: 'Properti', basePrice: 7400, status: 'HEALTHY' },
  { name: 'PT. Perumahan Rakyat Subsidi', sector: 'Properti', basePrice: 2400, status: 'HEALTHY' },
  { name: 'PT. Kawasan Industri Terpadu', sector: 'Properti', basePrice: 8900, status: 'HEALTHY' },
  { name: 'PT. Perkantoran Sentral Prima', sector: 'Properti', basePrice: 13500, status: 'HEALTHY' },

  // Keuangan (20)
  { name: 'PT. Bank Central Nusantara', sector: 'Keuangan', basePrice: 9800, status: 'HEALTHY' },
  { name: 'PT. Bank Artha Makmur Tbk', sector: 'Keuangan', basePrice: 14200, status: 'HEALTHY' },
  { name: 'PT. Asuransi Jiwa Pratama', sector: 'Keuangan', basePrice: 4100, status: 'HEALTHY' },
  { name: 'PT. Modal Ventura Mandiri', sector: 'Keuangan', basePrice: 7600, status: 'HEALTHY' },
  { name: 'PT. Sekuritas Finansial Prima', sector: 'Keuangan', basePrice: 5500, status: 'HEALTHY' },
  { name: 'PT. Multi Finance Sejahtera', sector: 'Keuangan', basePrice: 3300, status: 'HEALTHY' },
  { name: 'PT. Pegadaian Emas Mulia', sector: 'Keuangan', basePrice: 6200, status: 'HEALTHY' },
  { name: 'PT. Pinjaman Mikro Digital', sector: 'Keuangan', basePrice: 980, status: 'CRITICAL' },
  { name: 'PT. Reksadana Prestasi Utama', sector: 'Keuangan', basePrice: 8400, status: 'HEALTHY' },
  { name: 'PT. Koperasi Simpan Mandiri', sector: 'Keuangan', basePrice: 450, status: 'CRITICAL' },
  { name: 'PT. Finansial Syariah Kencana', sector: 'Keuangan', basePrice: 5100, status: 'HEALTHY' },
  { name: 'PT. Pembiayaan Kendaraan Prima', sector: 'Keuangan', basePrice: 4700, status: 'HEALTHY' },
  { name: 'PT. Asuransi Kerugian Bahari', sector: 'Keuangan', basePrice: 3600, status: 'HEALTHY' },
  { name: 'PT. Leasing Logistik Terpadu', sector: 'Keuangan', basePrice: 790, status: 'CRITICAL' },
  { name: 'PT. Bank Pembangunan Daerah', sector: 'Keuangan', basePrice: 6900, status: 'HEALTHY' },
  { name: 'PT. Global Asset Management', sector: 'Keuangan', basePrice: 11500, status: 'HEALTHY' },
  { name: 'PT. Pialang Berjangka Komoditi', sector: 'Keuangan', basePrice: 4400, status: 'HEALTHY' },
  { name: 'PT. Penjaminan Infrastruktur', sector: 'Keuangan', basePrice: 8100, status: 'HEALTHY' },
  { name: 'PT. Dompet Mikro Digital Pay', sector: 'Keuangan', basePrice: 1100, status: 'CRITICAL' },
  { name: 'PT. Tabungan Pensiun Hari Tua', sector: 'Keuangan', basePrice: 9300, status: 'HEALTHY' },

  // F&B (15)
  { name: 'PT. Nusantara Boga Kuliner', sector: 'F&B', basePrice: 8900, status: 'HEALTHY' },
  { name: 'PT. Rasa Rempah Nusantara', sector: 'F&B', basePrice: 4500, status: 'HEALTHY' },
  { name: 'PT. Kopi Sangrai Khatulistiwa', sector: 'F&B', basePrice: 6200, status: 'HEALTHY' },
  { name: 'PT. Sari Susu Segar Murni', sector: 'F&B', basePrice: 7100, status: 'HEALTHY' },
  { name: 'PT. Roti Manis Kencana', sector: 'F&B', basePrice: 3800, status: 'HEALTHY' },
  { name: 'PT. Air Minum Pegunungan Alam', sector: 'F&B', basePrice: 9400, status: 'HEALTHY' },
  { name: 'PT. Mi Instan Mega Rasa', sector: 'F&B', basePrice: 13200, status: 'HEALTHY' },
  { name: 'PT. Minuman Boba Kekinian', sector: 'F&B', basePrice: 550, status: 'CRITICAL' },
  { name: 'PT. Restoran Cepat Saji Mantap', sector: 'F&B', basePrice: 5600, status: 'HEALTHY' },
  { name: 'PT. Pengolahan Daging Olahan', sector: 'F&B', basePrice: 4200, status: 'HEALTHY' },
  { name: 'PT. Snack Renyah Gurih', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { name: 'PT. Teh Segar Melati Prima', sector: 'F&B', basePrice: 5000, status: 'HEALTHY' },
  { name: 'PT. Katering Boga Sehat', sector: 'F&B', basePrice: 700, status: 'CRITICAL' },
  { name: 'PT. Es Krim Gelato Bahagia', sector: 'F&B', basePrice: 2800, status: 'HEALTHY' },
  { name: 'PT. Perkebunan Cokelat Megah', sector: 'F&B', basePrice: 6600, status: 'HEALTHY' },

  // Energi (15)
  { name: 'PT. Surya Terbit Tenaga Hijau', sector: 'Energi', basePrice: 7700, status: 'HEALTHY' },
  { name: 'PT. Panas Bumi Khatulistiwa', sector: 'Energi', basePrice: 9100, status: 'HEALTHY' },
  { name: 'PT. Batu Bara Hitam Mandiri', sector: 'Energi', basePrice: 10400, status: 'HEALTHY' },
  { name: 'PT. Minyak Gas Samudera', sector: 'Energi', basePrice: 12100, status: 'HEALTHY' },
  { name: 'PT. Hidro Elektrik Perkasa', sector: 'Energi', basePrice: 5800, status: 'HEALTHY' },
  { name: 'PT. Biofuel Sawit Mandiri', sector: 'Energi', basePrice: 4600, status: 'HEALTHY' },
  { name: 'PT. Baterai Listrik Masa Depan', sector: 'Energi', basePrice: 14800, status: 'HEALTHY' },
  { name: 'PT. Kilang Minyak Perbatasan', sector: 'Energi', basePrice: 950, status: 'CRITICAL' },
  { name: 'PT. Transmisi Listrik Nasional', sector: 'Energi', basePrice: 8300, status: 'HEALTHY' },
  { name: 'PT. Turbina Angin Pesisir', sector: 'Energi', basePrice: 3500, status: 'HEALTHY' },
  { name: 'PT. Gas Alam Cair Nusantara', sector: 'Energi', basePrice: 9600, status: 'HEALTHY' },
  { name: 'PT. Tambang Uranium Murni', sector: 'Energi', basePrice: 6400, status: 'HEALTHY' },
  { name: 'PT. Pengolahan Limbah Energi', sector: 'Energi', basePrice: 800, status: 'CRITICAL' },
  { name: 'PT. Distribusi BBM Nusantara', sector: 'Energi', basePrice: 7200, status: 'HEALTHY' },
  { name: 'PT. Energi Hidrogen Bersih', sector: 'Energi', basePrice: 11100, status: 'HEALTHY' },

  // Manufaktur (10)
  { name: 'PT. Baja Prima Konstruksi', sector: 'Manufaktur', basePrice: 6200, status: 'HEALTHY' },
  { name: 'PT. Semen Nusantara Perkasa', sector: 'Manufaktur', basePrice: 8300, status: 'HEALTHY' },
  { name: 'PT. Otomotif Mobil Nusantara', sector: 'Manufaktur', basePrice: 13900, status: 'HEALTHY' },
  { name: 'PT. Tekstil Benang Kencana', sector: 'Manufaktur', basePrice: 600, status: 'CRITICAL' },
  { name: 'PT. Elektronika Komponen Inti', sector: 'Manufaktur', basePrice: 7500, status: 'HEALTHY' },
  { name: 'PT. Plastik Kemasan Lestari', sector: 'Manufaktur', basePrice: 3100, status: 'HEALTHY' },
  { name: 'PT. Kaca Lembaran Megah', sector: 'Manufaktur', basePrice: 4400, status: 'HEALTHY' },
  { name: 'PT. Pupuk Tani Sejahtera', sector: 'Manufaktur', basePrice: 6700, status: 'HEALTHY' },
  { name: 'PT. Alas Kaki Ekspor Cemerlang', sector: 'Manufaktur', basePrice: 850, status: 'CRITICAL' },
  { name: 'PT. Perkapalan Galangan Raya', sector: 'Manufaktur', basePrice: 9200, status: 'HEALTHY' }
];

const _seedSymbolSet = new Set(ADDITIONAL_COMPANIES.map((c) => c.symbol));
const COMPANY_NAMES = RAW_COMPANY_NAMES.map((c) => ({
  ...c,
  symbol: deriveCleanTicker(c.name, _seedSymbolSet)
}));

function normalizeCompKey(name) {
  return String(name || '')
    .replace(/^(PT\.?\s*)+/i, '')
    .replace(/\bTbk\.?\b/gi, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

async function seed() {
  console.log('Seeding SQLite database with Realistic Indonesian Market scale...');
  await initDb();

  // 1. Settings
  const settings = [
    ['interest_rate', '6.5'],
    ['ipo_min_asset', '100000000'], // IB 100 Juta minimal kas PT
    ['ipo_min_level', '4'],
    ['inflation_rate', '3.2'],
    ['bot_intervention_threshold', '0.40'],
    ['bot_auto_intervention', 'true'],
    ['trading_fee_pct', '0.15']
  ];
  for (const [k, v] of settings) {
    await query.run('INSERT OR IGNORE INTO central_bank_settings (key, value) VALUES (?, ?)', [k, v]);
  }

  // 2. Users (Admin Utama Bank Sentral - menggunakan INSERT OR IGNORE agar akun tidak pernah ke-reset saat update)
  const adminPass = await bcrypt.hash('admin123', 10);

  const adminId = 'admin-001';
  await query.run(
    `INSERT OR IGNORE INTO users (id, username, password_hash, balance_ib, company_balance_ib, has_pt, pt_name, sector, pt_level, credit_score, role, is_blue_chip)
     VALUES (?, ?, ?, 50000000000.0, 0.0, 0, 'Bank Sentral Capital Federation', 'Keuangan', 99, 999, 'ADMIN', 1)`,
    [adminId, 'admin', adminPass]
  );

  // 3. News & Macro Events
  const existingCompanies = await query.get('SELECT COUNT(*) as count FROM companies');
  if (existingCompanies && existingCompanies.count > 0) {
    console.log(`ℹ️ Database sudah memiliki ${existingCompanies.count} emiten. Menjalankan migrasi ticker 4-huruf & populasi bot...`);
    await ensureMarketPopulation();
    return;
  }

  const eventId = uuidv4();
  await query.run(
    `INSERT OR IGNORE INTO macro_events (id, title, description, affected_sector, price_impact_pct, active, duration_seconds)
     VALUES (?, ?, ?, ?, ?, 1, 1800)`,
    [eventId, 'Sentimen Pasar Positif', 'Minat investor ritel meningkat seiring penguatan fundamental bursa.', 'ALL', 5.0]
  );

  const initialNews = [
    ['Bank Sentral Menjaga Suku Bunga Acuan Stabil di 6.5%', 'Likuiditas pasar bursa Capital Federation terjaga dengan baik.', 'Keuangan', 'BULLISH', 1.02],
    ['Sektor Teknologi Catat Kenaikan Permintaan Layanan Cloud', 'Emiten penyedia server mencatatkan peningkatan kontrak korporasi.', 'Teknologi', 'BULLISH', 1.04],
    ['Industri F&B Terus Tumbuh dengan Ekspansi Gerai Baru', 'Daya beli masyarakat mendorong penjualan makanan dan minuman kemasan.', 'F&B', 'BULLISH', 1.03]
  ];
  for (const n of initialNews) {
    await query.run(
      `INSERT OR IGNORE INTO news (id, title, content, affected_sector, sentiment, impact_multiplier)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), n[0], n[1], n[2], n[3], n[4]]
    );
  }

  // 4. Seed 100 Bot Companies dengan harga wajar & ticker 4 huruf
  console.log(`Seeding ${COMPANY_NAMES.length} bot companies with realistic 4-letter tickers...`);
  const now = Date.now();

  for (const c of COMPANY_NAMES) {
    const compId = uuidv4();
    await query.run(
      `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, total_shares, circulating_shares, dividend_rate, fundamental_score, operational_level, description)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, 10000000, 3000000, ?, ?, ?, ?)`,
      [
        compId,
        c.symbol,
        c.name,
        c.sector,
        c.status,
        c.basePrice,
        c.basePrice,
        c.status === 'HEALTHY' ? 0.03 : 0.0,
        c.status === 'HEALTHY' ? 82.0 : 38.0,
        c.status === 'HEALTHY' ? 6 : 2,
        `Emiten ${c.sector} di bursa Capital Federation.`
      ]
    );

    // 15 historical points
    let lastPrice = c.basePrice;
    for (let i = 15; i >= 0; i--) {
      const delta = (Math.random() - 0.49) * (lastPrice * 0.015);
      const open = lastPrice;
      const close = Math.max(50, Math.round(open + delta));
      const high = Math.round(Math.max(open, close) + Math.random() * (open * 0.005));
      const low = Math.round(Math.min(open, close) - Math.random() * (open * 0.005));
      const volume = Math.floor(Math.random() * 5000) + 500;
      lastPrice = close;

      const ts = new Date(now - i * 60000).toISOString();
      await query.run(
        `INSERT INTO price_history (id, company_id, price, open, close, high, low, volume, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), compId, close, open, close, high, low, volume, ts]
      );
    }
  }

  await ensureMarketPopulation();

  console.log(`✅ Database successfully initialized with realistic scale & progression!`);
}

async function ensureMarketPopulation() {
  console.log('🤖 Checking market population (4-letter ticker migration + 200+ companies + 100 natural bots)...');
  const now = Date.now();

  // 1. Bersihkan nama PT yang masih memiliki nama merek dunia nyata & rapikan "PT. "
  await query.run("UPDATE users SET email = 'projek.msyafiq19@gmail.com', email_verified = 1 WHERE username = 'msyafiq19'");
  await query.run("UPDATE companies SET name = 'PT. Tambang Tembaga Megah' WHERE name LIKE '%Freeport%'");
  await query.run("UPDATE companies SET name = 'PT. Nusantara Boga Kuliner' WHERE name LIKE '%Indoboga%'");
  await query.run("UPDATE companies SET name = 'PT. Medika Farma Prima' WHERE name LIKE '%Kimia Medika%'");
  await query.run("UPDATE companies SET name = 'PT. Nutrisindo Nutrisi Utama' WHERE name LIKE '%Kalbe%'");
  await query.run("UPDATE companies SET name = 'PT. Sentosa Hospital Raya' WHERE name LIKE '%Siloam%'");
  await query.run("UPDATE companies SET name = 'PT. Trans Kencana Nusantara' WHERE name LIKE '%Jasa Marga%'");

  // Hilangkan awalan "PT PT." ganda pada users & companies
  const allUsersForPt = await query.all('SELECT id, pt_name FROM users WHERE pt_name IS NOT NULL AND pt_name != ""');
  for (const u of allUsersForPt) {
    const cleaned = String(u.pt_name).replace(/^(PT\.?\s*)+/i, '').trim();
    const formatted = cleaned ? `PT. ${cleaned}` : '';
    if (formatted !== u.pt_name) {
      await query.run('UPDATE users SET pt_name = ? WHERE id = ?', [formatted, u.id]);
    }
  }

  // 2. Migrasi seluruh kode saham (symbol) yang masih mengandung angka (contoh: FOOD07, TECH01, FIN02)
  // menjadi 4 huruf alfabet murni dari singkatan nama PT (contoh: MIMR, NUCS, BAMT)!
  const currentCompanies = await query.all('SELECT id, symbol, name FROM companies ORDER BY created_at ASC');
  const usedSymbols = new Set();
  for (const c of currentCompanies) {
    if (!/\d/.test(c.symbol) && c.symbol.length >= 3 && c.symbol.length <= 5) {
      usedSymbols.add(c.symbol.toUpperCase());
    }
  }

  // Petakan nama PT ke symbol 4 huruf resmi jika ada di katalog
  const catalogSymbolByName = new Map();
  for (const item of [...COMPANY_NAMES, ...ADDITIONAL_COMPANIES]) {
    catalogSymbolByName.set(normalizeCompKey(item.name), item.symbol);
  }

  let migratedTickers = 0;
  for (const comp of currentCompanies) {
    let cleanName = 'PT. ' + String(comp.name || '').replace(/^(PT\.?\s*)+/i, '').trim();
    // Pastikan seluruh perusahaan yang tercatat di Bursa Saham memiliki akhiran "Tbk."
    if (!/\bTbk\.?$/i.test(cleanName)) {
      cleanName = `${cleanName} Tbk.`;
    } else if (/Tbk$/i.test(cleanName)) {
      cleanName = `${cleanName}.`;
    }
    if (cleanName !== comp.name) {
      await query.run('UPDATE companies SET name = ? WHERE id = ?', [cleanName, comp.id]);
    }

    if (/\d/.test(comp.symbol)) {
      const key = normalizeCompKey(cleanName);
      let newSymbol = catalogSymbolByName.get(key);
      if (!newSymbol || usedSymbols.has(newSymbol)) {
        newSymbol = deriveCleanTicker(cleanName, usedSymbols);
      } else {
        usedSymbols.add(newSymbol);
      }

      await query.run('UPDATE companies SET symbol = ? WHERE id = ?', [newSymbol, comp.id]);
      await query.run('UPDATE market_oversight_log SET symbol = ? WHERE company_id = ?', [newSymbol, comp.id]);
      await query.run('UPDATE private_deals SET company_symbol = ? WHERE company_id = ?', [newSymbol, comp.id]);
      await query.run('UPDATE deal_deeds SET company_symbol = ? WHERE company_id = ?', [newSymbol, comp.id]);
      migratedTickers++;
    }
  }
  if (migratedTickers > 0) {
    console.log(`🔤 Berhasil mengonversi ${migratedTickers} kode saham berangka (seperti FOOD07/TECH01) menjadi singkatan 4 huruf resmi!`);
  }

  // 3. Tambahkan emiten baru dari ADDITIONAL_COMPANIES jika belum ada (berdasarkan symbol atau nama)
  const refreshedCompanies = await query.all('SELECT id, symbol, name FROM companies');
  const existingKeys = new Set(refreshedCompanies.map((c) => normalizeCompKey(c.name)));
  const existingSymbols = new Set(refreshedCompanies.map((c) => c.symbol.toUpperCase()));

  let addedCompanies = 0;
  for (const c of ADDITIONAL_COMPANIES) {
    const key = normalizeCompKey(c.name);
    if (!existingKeys.has(key) && !existingSymbols.has(c.symbol.toUpperCase())) {
      const compId = uuidv4();
      const sym = existingSymbols.has(c.symbol) ? deriveCleanTicker(c.name, existingSymbols) : c.symbol;
      existingSymbols.add(sym);
      existingKeys.add(key);

      let cleanCompName = 'PT. ' + String(c.name || '').replace(/^(PT\.?\s*)+/i, '').trim();
      if (!/\bTbk\.?$/i.test(cleanCompName)) cleanCompName = `${cleanCompName} Tbk.`;

      await query.run(
        `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, prev_close, daily_high, daily_low, total_shares, circulating_shares, dividend_rate, fundamental_score, operational_level, description, is_ipo, listing_status, employees_count, rd_level, pt_level)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 10000000, 3000000, ?, ?, ?, ?, 1, 'LISTED', 35, 3, 2)`,
        [
          compId,
          sym,
          cleanCompName,
          c.sector,
          c.status,
          c.basePrice,
          c.basePrice,
          c.basePrice,
          c.basePrice * 1.02,
          c.basePrice * 0.98,
          c.status === 'HEALTHY' ? 0.03 : 0.0,
          c.status === 'HEALTHY' ? 82.0 : 38.0,
          c.status === 'HEALTHY' ? 6 : 2,
          `Emiten ${c.sector} resmi tercatat (Tbk.) di Bursa Efek Capital Federation.`
        ]
      );
      let lastPrice = c.basePrice;
      for (let i = 5; i >= 0; i--) {
        const delta = (Math.random() - 0.49) * (lastPrice * 0.015);
        const open = lastPrice;
        const close = Math.max(50, Math.round(open + delta));
        const high = Math.round(Math.max(open, close) + Math.random() * (open * 0.005));
        const low = Math.round(Math.min(open, close) - Math.random() * (open * 0.005));
        const volume = Math.floor(Math.random() * 5000) + 500;
        lastPrice = close;
        const ts = new Date(now - i * 60000).toISOString();
        await query.run(
          `INSERT INTO price_history (id, company_id, price, open, close, high, low, volume, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), compId, close, open, close, high, low, volume, ts]
        );
      }
      addedCompanies++;
    }
  }
  if (addedCompanies > 0) {
    console.log(`✅ ${addedCompanies} emiten Tbk. baru berhasil ditambahkan ke bursa.`);
  }

  // 4. Clean legacy long-named bots & old username with numbers (andi19)
  const legacyBotNames = [
    'tan_sri_hendra', 'robert_hartono_cf', 'anthony_salim_cf', 'prajogo_energi_cf',
    'chairul_tanjung_cf', 'tahap_widjaja_cf', 'lim_haryanto_cf', 'william_soerya_cf',
    'erick_thohir_cf', 'sandi_uno_cf', 'grace_tahir_cf', 'kevin_mintaraga',
    'budi_scalper_madiun', 'siti_trader_cantik', 'reza_quant_trader', 'citra_swing_trader',
    'denny_fomo_cuancuan', 'ahmad_value_investor', 'joko_trader_santuy', 'maya_crypto_migrasi',
    'eko_broker_independen', 'farhan_speed_trader', 'lisa_dividen_hunter', 'dimas_day_trader',
    'andi19'
  ];
  for (const leg of legacyBotNames) {
    const legUser = await query.get('SELECT id FROM users WHERE username = ?', [leg]);
    if (legUser) {
      await query.run('DELETE FROM portfolios WHERE user_id = ?', [legUser.id]);
      await query.run('DELETE FROM users WHERE id = ?', [legUser.id]);
    }
  }

  // 5. Seed 1.050 Bot Investors, Konglomerat 12 Naga, Pemilik Emiten Tbk., PT Privat & Ritel
  const botPass = await bcrypt.hash('botpass123', 8);
  let addedBots = 0;
  for (let idx = 0; idx < BOT_ROSTER.length; idx++) {
    const b = BOT_ROSTER[idx];
    const existing = await query.get('SELECT id FROM users WHERE username = ?', [b.username]);
    let botUserId = existing?.id;
    const empCount = b.employees_count !== undefined ? b.employees_count : (b.has_pt ? (idx < 12 ? 300 : (idx < 35 ? 80 : 25)) : 0);
    const rdLvl = b.rd_level !== undefined ? b.rd_level : (b.has_pt ? (idx < 12 ? 14 : (idx < 35 ? 7 : 3)) : 1);
    const mktLvl = b.has_pt ? (idx < 12 ? 8 : (idx < 35 ? 5 : 3)) : 1;
    const capLvl = b.has_pt ? (idx < 12 ? 8 : (idx < 35 ? 5 : 3)) : 1;
    const ptLvl = b.pt_level || (idx < 12 ? 5 : (idx < 35 ? 4 : 2));

    if (!existing) {
      botUserId = b.id || uuidv4();
      await query.run(
        `INSERT INTO users (id, username, password_hash, balance_ib, company_balance_ib, has_pt, pt_name, sector, pt_level, credit_score, role, is_blue_chip, employees_count, rd_level, marketing_level, capacity_level, fundamental_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 90.0)`,
        [
          botUserId,
          b.username,
          botPass,
          b.balance_ib,
          b.company_balance_ib,
          b.has_pt,
          b.pt_name,
          b.sector,
          ptLvl,
          b.credit_score,
          b.role,
          b.is_blue_chip,
          empCount,
          rdLvl,
          mktLvl,
          capLvl
        ]
      );
      addedBots++;
    } else {
      // Pastikan atribut operasional bot memadai agar mencetak laba & menyetor PPh Badan ke Kas Negara
      await query.run(
        `UPDATE users SET employees_count = ?,
                          rd_level = ?,
                          marketing_level = ?,
                          capacity_level = ?,
                          pt_level = ?,
                          role = CASE WHEN ? = 'VIP' THEN 'VIP' ELSE role END,
                          is_blue_chip = ?
         WHERE id = ?`,
        [empCount, rdLvl, mktLvl, capLvl, ptLvl, b.role, b.is_blue_chip, botUserId]
      );
    }
  }
  if (addedBots > 0) {
    console.log(`✅ ${addedBots} bot pemain baru berhasil dimasukkan ke bursa (Total ${BOT_ROSTER.length} Bot).`);
  }

  // 5B. SINKRONISASI 1-KE-1: Hubungkan Perusahaan Tbk. BOT di Bursa Saham dengan Bot Pemilik PT di Peringkat!
  // PENTING: JANGAN PERNAH menyentuh PT milik pemain asli (is_bot = 0, owner non-bot, atau tercatat sebagai FOUNDER/mayoritas di company_shareholders & portfolios)!
  const allBotCompanies = await query.all(`
    SELECT c.* FROM companies c
    WHERE c.is_bot = 1
      AND (c.owner_id IS NULL OR c.owner_id LIKE 'bot-user-%' OR c.owner_id LIKE 'user-bot-%')
      AND NOT EXISTS (
        SELECT 1 FROM company_shareholders cs
        WHERE cs.company_id = c.id
          AND cs.user_id IS NOT NULL
          AND cs.user_id NOT LIKE 'bot-user-%'
          AND cs.user_id NOT LIKE 'user-bot-%'
          AND ((cs.holder_type = 'FOUNDER' AND COALESCE(cs.percentage, 0) > 0) OR COALESCE(cs.percentage, 0) >= 50.0)
      )
      AND NOT EXISTS (
        SELECT 1 FROM portfolios p
        WHERE p.company_id = c.id
          AND p.user_id NOT LIKE 'bot-user-%'
          AND p.user_id NOT LIKE 'user-bot-%'
          AND ((p.lots_owned * 100.0) / COALESCE(NULLIF(c.total_shares, 0), 10000000)) >= 0.50
      )
    ORDER BY c.base_price DESC, c.current_price DESC
  `);

  const flagshipSymbols = FLAGSHIP_CONGLOMERATE_COMPANIES.map((f) => f.symbol);
  const compBySymbol = new Map(allBotCompanies.map((c) => [c.symbol, c]));
  const assignedCompIds = new Set();
  const orderedCompaniesForBots = [];

  // Prioritaskan 16 Flagship Emiten untuk Bot #1 s/d #16 (12 Naga & Taipan Utama)
  for (const sym of flagshipSymbols) {
    const fc = compBySymbol.get(sym);
    if (fc && !assignedCompIds.has(fc.id)) {
      orderedCompaniesForBots.push(fc);
      assignedCompIds.add(fc.id);
    }
  }
  // Lanjutkan dengan seluruh sisa emiten bot di Bursa Saham
  for (const comp of allBotCompanies) {
    if (!assignedCompIds.has(comp.id)) {
      orderedCompaniesForBots.push(comp);
      assignedCompIds.add(comp.id);
    }
  }

  for (let idx = 0; idx < BOT_ROSTER.length; idx++) {
    const b = BOT_ROSTER[idx];
    const botRow = await query.get('SELECT id, username, has_pt, pt_name FROM users WHERE username = ?', [b.username]);
    if (!botRow) continue;

    if (idx < orderedCompaniesForBots.length && idx < 600) {
      const comp = orderedCompaniesForBots[idx];
      const botEmp = b.employees_count || (idx < 12 ? 350 : (idx < 35 ? 90 : 25));
      const botRd = b.rd_level || (idx < 12 ? 14 : (idx < 35 ? 7 : 3));
      const botPtLvl = b.pt_level || (idx < 12 ? 5 : (idx < 35 ? 4 : 2));

      if (comp.owner_id !== botRow.id || comp.listing_status !== 'LISTED') {
        // Hubungkan perusahaan Tbk. Bot di Bursa Saham ke Bot ini sebagai Pendiri & Pemilik
        await query.run(
          `UPDATE companies 
           SET owner_id = ?, founder_name = ?, employees_count = COALESCE(NULLIF(employees_count, 0), ?),
               rd_level = MAX(COALESCE(rd_level, 1), ?),
               pt_level = MAX(COALESCE(pt_level, 1), ?),
               is_ipo = 1,
               listing_status = 'LISTED'
           WHERE id = ? AND is_bot = 1`,
          [botRow.id, botRow.username, botEmp, botRd, botPtLvl, comp.id]
        );
      }
      if (!botRow.has_pt || botRow.pt_name !== comp.name) {
        await query.run(
          'UPDATE users SET has_pt = 1, pt_name = ?, sector = ? WHERE id = ?',
          [comp.name, comp.sector, botRow.id]
        );
      }

      // Pastikan susunan pemegang saham (Cap Table) mencatat Bot ini sebagai Pendiri & Pemegang Saham Terbesar (60%)
      const existingSh = await query.get('SELECT COUNT(*) as count FROM company_shareholders WHERE company_id = ?', [comp.id]);
      if (!existingSh || existingSh.count === 0) {
        const totalShares = comp.total_shares || 10000000;
        await query.run(
          `INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id)
           VALUES (?, ?, ?, 'FOUNDER', ?, 60.0, ?)`,
          [uuidv4(), comp.id, `${botRow.username} (Pendiri & Pengendali)`, Math.round(totalShares * 0.60), botRow.id]
        );
        await query.run(
          `INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id)
           VALUES (?, ?, 'Konsorsium Institusi Federasi', 'INSTITUTION', ?, 20.0, NULL)`,
          [uuidv4(), comp.id, Math.round(totalShares * 0.20)]
        );
        await query.run(
          `INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id)
           VALUES (?, ?, 'Publik Masyarakat (Bursa Efek)', 'PUBLIC', ?, 20.0, NULL)`,
          [uuidv4(), comp.id, Math.round(totalShares * 0.20)]
        );
      }
    } else if (b.has_pt === 1) {
      // Bot dengan PT Privat Non-Tbk (belum IPO di Bursa Saham)
      await query.run(
        'UPDATE users SET has_pt = 1, pt_name = ?, sector = ? WHERE id = ?',
        [b.pt_name, b.sector, botRow.id]
      );
    } else {
      // Ritel Murni (Belum mendirikan PT)
      await query.run(
        "UPDATE users SET has_pt = 0, pt_name = '' WHERE id = ?",
        [botRow.id]
      );
    }

    // Pastikan setiap bot memiliki portofolio saham di bursa
    const existingPort = await query.get('SELECT COUNT(*) as count FROM portfolios WHERE user_id = ?', [botRow.id]);
    if (!existingPort || existingPort.count === 0) {
      // Jika memiliki emiten Tbk sendiri, tambahkan kepemilikan saham emitennya + 2 saham lain
      if (idx < orderedCompaniesForBots.length && idx < 600) {
        const ownComp = orderedCompaniesForBots[idx];
        const founderLots = idx < 12 ? 25000 : (idx < 35 ? 6500 : 1500);
        await query.run(
          `INSERT OR IGNORE INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), botRow.id, ownComp.id, founderLots, ownComp.base_price || ownComp.current_price]
        );
      }
      const stockCount = idx < 12 ? 4 : (idx < 35 ? 3 : 2);
      const startOffset = (idx * 5 + 3) % Math.max(1, orderedCompaniesForBots.length - 5);
      for (let s = 0; s < stockCount; s++) {
        const comp = orderedCompaniesForBots[(startOffset + s) % orderedCompaniesForBots.length];
        if (comp) {
          const lots = idx < 12 ? 4500 : (idx < 35 ? 1200 : 120);
          await query.run(
            `INSERT OR IGNORE INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price)
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), botRow.id, comp.id, lots, comp.base_price || comp.current_price]
          );
        }
      }
    }
  }

  // 5C. Seed Setoran Pajak Transaksi & PPh Badan Bot ke Brankas Kas Negara jika masih minim
  const treasuryCount = await query.get('SELECT COUNT(*) as count FROM state_treasury_ledger');
  if (!treasuryCount || treasuryCount.count < 8) {
    const sampleTreasuryEntries = [
      {
        source_type: 'CORPORATE_TAX',
        title: 'Penerimaan PPh Badan (10%) - PT. Kencana Artha Persada Tbk. (haziq)',
        amount_ib: 42500000,
        reference_id: 'KEAP',
        notes: 'Setoran PPh Badan otomatis emiten konglomerat 12 Naga'
      },
      {
        source_type: 'CORPORATE_TAX',
        title: 'Penerimaan PPh Badan (10%) - PT. Samudera Prima Nusantara Tbk. (reza)',
        amount_ib: 38200000,
        reference_id: 'SAPN',
        notes: 'Setoran PPh Badan otomatis emiten konglomerat 12 Naga'
      },
      {
        source_type: 'CORPORATE_TAX',
        title: 'Penerimaan Kolektif PPh Badan (10%) - 600 Emiten Bursa Efek CFX',
        amount_ib: 385400000,
        reference_id: 'CFX-CORP-TAX',
        notes: 'Akumulasi pajak penghasilan badan seluruh perseroan terbatas (Tbk.) di bursa'
      },
      {
        source_type: 'TRANSACTION_TAX',
        title: 'Pajak Transaksi Bursa (0.15%) - Akumulasi Bandar 12 Naga & Ritel',
        amount_ib: 47650000,
        reference_id: 'CFX-TRD-TAX',
        notes: 'Potongan pajak transaksi jual-beli saham 1.000++ investor & konglomerat'
      },
      {
        source_type: 'METERAI_FEE',
        title: 'Penerimaan Bea Meterai & Legalisasi Akta Notaris Korporasi',
        amount_ib: 6500000,
        reference_id: 'NOTARY-STAMP',
        notes: 'Penerimaan resmi pengesahan akta pendirian PT & kontrak P2P'
      }
    ];
    for (const te of sampleTreasuryEntries) {
      await query.run(
        `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
         VALUES (?, ?, ?, ?, 'INCOME', ?, ?)`,
        [uuidv4(), te.source_type, te.title, te.amount_ib, te.reference_id, te.notes]
      );
    }
  }

  // 6. Seed percakapan awal Sultan 12 Naga, Taipan VIP, & Ritel di Chat Global Bursa agar ramai & bergengsi
  const chatCount = await query.get('SELECT COUNT(*) as count FROM chat_messages');
  if (!chatCount || chatCount.count <= 2) {
    const sampleChats = [
      {
        user_id: 'admin-001',
        username: 'Bank Sentral',
        pt_name: 'Otoritas Moneter BCF',
        text: 'Selamat datang di Bursa Efek Capital Federation (CFX)! Para konglomerat Top 12 menyandang gelar kehormatan 🐉 12 NAGA dan mendapatkan aura emas eksklusif di lantai bursa.',
        badge: 'BANK SENTRAL'
      },
      {
        user_id: 'bot-user-0001',
        username: 'haziq',
        pt_name: 'PT. Kencana Artha Persada Tbk.',
        text: 'Pagi rekan-rekan konglomerat! Hari ini holding kami mulai akumulasi emiten perbankan BCNT dan teknologi MICT. Yang mau negosiasi blok saham P2P silakan merapat 🔥',
        badge: '12 NAGA'
      },
      {
        user_id: 'bot-user-0002',
        username: 'reza',
        pt_name: 'PT. Samudera Prima Nusantara Tbk.',
        text: 'Siap Sultan @haziq! Sektor energi dan maritim SAMR juga lagi kuat arus kasnya, dividen kuartal ini lumayan tebal untuk ekspansi PT.',
        badge: '12 NAGA'
      },
      {
        user_id: 'bot-user-0065',
        username: 'budi',
        pt_name: 'Investor Mandiri',
        text: 'Mantap kali lihat para Sultan 12 Naga ngobrol! Doakan saya dari modal 10 juta segera tembus 30 juta buat dirikan PT dan nyusul ke papan peringkat atas 🙏🚀',
        badge: 'REGULER'
      },
      {
        user_id: 'bot-user-0003',
        username: 'dimas',
        pt_name: 'PT. Mahakarya Buana Sejahtera Tbk.',
        text: 'Semangat @budi! Fokus serok saham berfundamental sehat saat koreksi dan ikut tender pemerintah, pasti cepat naik kelas jadi Taipan & 12 Naga 👑',
        badge: '12 NAGA'
      },
      {
        user_id: 'bot-user-0010',
        username: 'tiara',
        pt_name: 'PT. Cakrawala Mineral Federasi Tbk.',
        text: 'Kuota Obligasi Negara ORI-026 kupon 7.25% juga masih buka tuh, cocok buat parkir kas holding biar tetap cuan stabil.',
        badge: '12 NAGA'
      }
    ];
    for (const ch of sampleChats) {
      await query.run(
        `INSERT INTO chat_messages (id, user_id, username, pt_name, text, badge)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), ch.user_id, ch.username, ch.pt_name, ch.text, ch.badge]
      );
    }
    console.log('💬 Chat Global Bursa berhasil diramaikan dengan obrolan Sultan 12 Naga, Taipan & Ritel.');
  }
}

async function resetMarketFresh({ preserveHumanUsers = true } = {}) {
  console.log('🔄 Memulai Reset & Penyegaran Pasar Bursa & Konglomerat (Fresh State)...');
  await initDb();

  // 1. Ambil data user manusia untuk dilindungi
  let humanUsers = [];
  if (preserveHumanUsers) {
    humanUsers = await query.all("SELECT * FROM users WHERE id NOT LIKE 'bot-%' AND username != 'admin'");
  }

  // 2. Bersihkan tabel-tabel pasar modal
  await query.exec('PRAGMA foreign_keys = OFF;');
  await query.run('DELETE FROM market_orders');
  await query.run('DELETE FROM transactions');
  await query.run('DELETE FROM auction_bids');
  await query.run('DELETE FROM auction_items');
  await query.run('DELETE FROM ipo_bids');
  await query.run('DELETE FROM ipo_orders');
  await query.run('DELETE FROM ipo_offerings');
  await query.run('DELETE FROM acquisition_proposals');
  await query.run('DELETE FROM private_deals');
  await query.run('DELETE FROM deal_deeds');
  await query.run('DELETE FROM court_chat_messages');
  await query.run('DELETE FROM court_cases');
  await query.run('DELETE FROM chat_messages');
  await query.run('DELETE FROM price_history');
  await query.run('DELETE FROM company_shareholders');
  await query.run('DELETE FROM portfolios');
  await query.run('DELETE FROM companies');
  await query.run("DELETE FROM users WHERE id LIKE 'bot-%'");
  await query.run('DELETE FROM state_treasury_ledger');
  await query.exec('PRAGMA foreign_keys = ON;');

  // 3. Reset saldo & PT akun manusia ke modal perdana segar (50 Juta IB)
  for (const u of humanUsers) {
    await query.run(
      `UPDATE users 
       SET balance_ib = 50000000.0,
           company_balance_ib = 0.0,
           has_pt = 0,
           pt_name = '',
           pt_level = 1,
           credit_score = 720,
           rd_level = 1,
           marketing_level = 1,
           hr_level = 1,
           capacity_level = 1,
           employees_count = 0
       WHERE id = ?`,
      [u.id]
    );
  }

  // 4. Jalankan populasi emiten & 265 bot baru
  await ensureMarketPopulation();
  console.log('✨ Pasar, 252+ Emiten Tbk, dan 265 Bot berhasil di-refresh menjadi BARU & BERSIH!');
  return {
    success: true,
    message: 'Pasar Bursa Saham & Konglomerat berhasil di-refresh 100% menjadi baru dan bersih!'
  };
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seed, ensureMarketPopulation, resetMarketFresh };
