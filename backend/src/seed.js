const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, initDb } = require('./db');
const { deriveCleanTicker, ADDITIONAL_COMPANIES, BOT_ROSTER } = require('./botData');

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
    const cleanName = 'PT. ' + String(comp.name || '').replace(/^(PT\.?\s*)+/i, '').trim();
    if (cleanName !== comp.name) {
      await query.run('UPDATE companies SET name = ? WHERE id = ?', [cleanName, comp.id]);
    }

    if (/\d/.test(comp.symbol)) {
      const oldSymbol = comp.symbol;
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

      await query.run(
        `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, prev_close, daily_high, daily_low, total_shares, circulating_shares, dividend_rate, fundamental_score, operational_level, description)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 10000000, 3000000, ?, ?, ?, ?)`,
        [
          compId,
          sym,
          c.name,
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
          `Emiten ${c.sector} di bursa Capital Federation.`
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
    console.log(`✅ ${addedCompanies} emiten baru berhasil ditambahkan ke bursa.`);
  }

  // 4. Clean legacy long-named bots to keep all bot usernames short, natural (1 word gamer style)
  const legacyBotNames = [
    'tan_sri_hendra', 'robert_hartono_cf', 'anthony_salim_cf', 'prajogo_energi_cf',
    'chairul_tanjung_cf', 'tahap_widjaja_cf', 'lim_haryanto_cf', 'william_soerya_cf',
    'erick_thohir_cf', 'sandi_uno_cf', 'grace_tahir_cf', 'kevin_mintaraga',
    'budi_scalper_madiun', 'siti_trader_cantik', 'reza_quant_trader', 'citra_swing_trader',
    'denny_fomo_cuancuan', 'ahmad_value_investor', 'joko_trader_santuy', 'maya_crypto_migrasi',
    'eko_broker_independen', 'farhan_speed_trader', 'lisa_dividen_hunter', 'dimas_day_trader'
  ];
  for (const leg of legacyBotNames) {
    const legUser = await query.get('SELECT id FROM users WHERE username = ?', [leg]);
    if (legUser) {
      await query.run('DELETE FROM portfolios WHERE user_id = ?', [legUser.id]);
      await query.run('DELETE FROM users WHERE id = ?', [legUser.id]);
    }
  }

  // 5. Seed 100 Bot Investors, Taipans, & Retail Traders with natural 1-word usernames
  const allCompanies = await query.all('SELECT id, current_price, base_price FROM companies');
  const botPass = await bcrypt.hash('botpass123', 8);
  let addedBots = 0;
  for (let idx = 0; idx < BOT_ROSTER.length; idx++) {
    const b = BOT_ROSTER[idx];
    const existing = await query.get('SELECT id FROM users WHERE username = ?', [b.username]);
    let botUserId = existing?.id;
    if (!existing) {
      botUserId = b.id || uuidv4();
      await query.run(
        `INSERT INTO users (id, username, password_hash, balance_ib, company_balance_ib, has_pt, pt_name, sector, pt_level, credit_score, role, is_blue_chip)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          botUserId,
          b.username,
          botPass,
          b.balance_ib,
          b.company_balance_ib,
          b.has_pt,
          b.pt_name,
          b.sector,
          b.pt_level,
          b.credit_score,
          b.role,
          b.is_blue_chip
        ]
      );
      addedBots++;
    }

    const existingPort = await query.get('SELECT COUNT(*) as count FROM portfolios WHERE user_id = ?', [botUserId]);
    if (!existingPort || existingPort.count === 0) {
      const stockCount = idx < 9 ? 4 : (idx < 25 ? 3 : 2);
      const startOffset = (idx * 3) % Math.max(1, allCompanies.length - 5);
      for (let s = 0; s < stockCount; s++) {
        const comp = allCompanies[(startOffset + s) % allCompanies.length];
        if (comp) {
          let lots = 50;
          if (idx < 9) lots = 5000 + (idx * 1500);
          else if (idx < 25) lots = 1200 + ((idx % 5) * 400);
          else if (idx < 45) lots = 300 + ((idx % 7) * 80);
          else lots = 15 + ((idx * 7) % 150);

          await query.run(
            `INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price)
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), botUserId, comp.id, lots, comp.base_price || comp.current_price]
          );
        }
      }
    }
  }
  if (addedBots > 0) {
    console.log(`✅ ${addedBots} bot pemain (nama simpel & natural) berhasil dimasukkan ke bursa.`);
  }

  // 6. Seed percakapan awal Sultan 9 Naga, Taipan VIP, & Ritel di Chat Global Bursa agar ramai & bergengsi
  const chatCount = await query.get('SELECT COUNT(*) as count FROM chat_messages');
  if (!chatCount || chatCount.count <= 2) {
    const sampleChats = [
      {
        user_id: 'admin-001',
        username: 'Bank Sentral',
        pt_name: 'Otoritas Moneter BCF',
        text: 'Selamat datang di Bursa Efek Capital Federation (CFX)! Para konglomerat Top 9 menyandang gelar kehormatan 🐉 9 NAGA dan mendapatkan aura emas eksklusif di lantai bursa.',
        badge: 'BANK SENTRAL'
      },
      {
        user_id: 'bot-user-001',
        username: 'haziq',
        pt_name: 'PT. Kencana Artha Persada Tbk.',
        text: 'Pagi rekan-rekan konglomerat! Hari ini holding kami mulai akumulasi emiten perbankan BCNT dan teknologi MICT. Yang mau negosiasi blok saham P2P silakan merapat 🔥',
        badge: '9 NAGA'
      },
      {
        user_id: 'bot-user-002',
        username: 'reza',
        pt_name: 'PT. Samudera Prima Nusantara Tbk.',
        text: 'Siap Sultan @haziq! Sektor energi dan maritim SAMR juga lagi kuat arus kasnya, dividen kuartal ini lumayan tebal untuk ekspansi PT.',
        badge: '9 NAGA'
      },
      {
        user_id: 'bot-user-065',
        username: 'budi',
        pt_name: 'Investor Mandiri',
        text: 'Mantap kali lihat para Sultan 9 Naga ngobrol! Doakan saya dari modal 10 juta segera tembus 30 juta buat dirikan PT dan nyusul ke papan peringkat atas 🙏🚀',
        badge: 'REGULER'
      },
      {
        user_id: 'bot-user-003',
        username: 'dimas',
        pt_name: 'PT. Mahakarya Buana Sejahtera Tbk.',
        text: 'Semangat @budi! Fokus serok saham berfundamental sehat saat koreksi dan ikut tender pemerintah, pasti cepat naik kelas jadi Taipan & 9 Naga 👑',
        badge: '9 NAGA'
      },
      {
        user_id: 'bot-user-010',
        username: 'tiara',
        pt_name: 'PT. Cakrawala Mineral Federasi Tbk.',
        text: 'Kuota Obligasi Negara ORI-026 kupon 7.25% juga masih buka tuh, cocok buat parkir kas holding biar tetap cuan stabil.',
        badge: 'TAIPAN'
      }
    ];
    for (const ch of sampleChats) {
      await query.run(
        `INSERT INTO chat_messages (id, user_id, username, pt_name, text, badge)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), ch.user_id, ch.username, ch.pt_name, ch.text, ch.badge]
      );
    }
    console.log('💬 Chat Global Bursa berhasil diramaikan dengan obrolan Sultan 9 Naga, Taipan & Ritel.');
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seed, ensureMarketPopulation };
