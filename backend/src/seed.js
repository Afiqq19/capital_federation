const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, initDb } = require('./db');
const { ADDITIONAL_COMPANIES, BOT_ROSTER } = require('./botData');

const COMPANY_NAMES = [
  // Teknologi (20)
  { symbol: 'TECH01', name: 'PT Nusantara Cloud System', sector: 'Teknologi', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'TECH02', name: 'PT Quantum Data Solusi', sector: 'Teknologi', basePrice: 8500, status: 'HEALTHY' },
  { symbol: 'TECH03', name: 'PT Algoritma AI Raya', sector: 'Teknologi', basePrice: 12400, status: 'HEALTHY' },
  { symbol: 'TECH04', name: 'PT Siber Proteksi Aman', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'TECH05', name: 'PT Mikro Chip Nusantara', sector: 'Teknologi', basePrice: 15200, status: 'HEALTHY' },
  { symbol: 'TECH06', name: 'PT PayKilat Solusi Digital', sector: 'Teknologi', basePrice: 6300, status: 'HEALTHY' },
  { symbol: 'TECH07', name: 'PT Sarana Telematika Inti', sector: 'Teknologi', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'TECH08', name: 'PT Logika Otomasi Industri', sector: 'Teknologi', basePrice: 1800, status: 'CRITICAL' },
  { symbol: 'TECH09', name: 'PT Satelit Angkasa Cyber', sector: 'Teknologi', basePrice: 9700, status: 'HEALTHY' },
  { symbol: 'TECH10', name: 'PT Metaverse Dunia Baru', sector: 'Teknologi', basePrice: 650, status: 'CRITICAL' },
  { symbol: 'TECH11', name: 'PT Solusi Fiber Optik Optima', sector: 'Teknologi', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'TECH12', name: 'PT Robotika Solusi Cepat', sector: 'Teknologi', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'TECH13', name: 'PT Solusi Server Indonesia', sector: 'Teknologi', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'TECH14', name: 'PT Kripto Ledgers Indonesia', sector: 'Teknologi', basePrice: 850, status: 'CRITICAL' },
  { symbol: 'TECH15', name: 'PT Geo Spasial Cerdas', sector: 'Teknologi', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'TECH16', name: 'PT Finnet Payment Integrasi', sector: 'Teknologi', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'TECH17', name: 'PT Neural Network Mandiri', sector: 'Teknologi', basePrice: 8800, status: 'HEALTHY' },
  { symbol: 'TECH18', name: 'PT Edukasi Digital Prestasi', sector: 'Teknologi', basePrice: 2100, status: 'HEALTHY' },
  { symbol: 'TECH19', name: 'PT Agritech Agro Solusi', sector: 'Teknologi', basePrice: 720, status: 'CRITICAL' },
  { symbol: 'TECH20', name: 'PT Gameverse Studio Kreatif', sector: 'Teknologi', basePrice: 4600, status: 'HEALTHY' },

  // Properti (20)
  { symbol: 'PROP01', name: 'PT Griya Metropolitan Raya', sector: 'Properti', basePrice: 5400, status: 'HEALTHY' },
  { symbol: 'PROP02', name: 'PT Menara Inti Graha', sector: 'Properti', basePrice: 7800, status: 'HEALTHY' },
  { symbol: 'PROP03', name: 'PT Kawasan Hunian Sentosa', sector: 'Properti', basePrice: 3200, status: 'HEALTHY' },
  { symbol: 'PROP04', name: 'PT Bumi Land Lestari', sector: 'Properti', basePrice: 6100, status: 'HEALTHY' },
  { symbol: 'PROP05', name: 'PT Mega Tower Kencana', sector: 'Properti', basePrice: 11200, status: 'HEALTHY' },
  { symbol: 'PROP06', name: 'PT Real Estate Mandiri Makmur', sector: 'Properti', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'PROP07', name: 'PT Kota Mandiri Hijau', sector: 'Properti', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'PROP08', name: 'PT Apartemen Modern Living', sector: 'Properti', basePrice: 940, status: 'CRITICAL' },
  { symbol: 'PROP09', name: 'PT Sentra Logistik Properti', sector: 'Properti', basePrice: 8200, status: 'HEALTHY' },
  { symbol: 'PROP10', name: 'PT Wisata Resort Tropika', sector: 'Properti', basePrice: 620, status: 'CRITICAL' },
  { symbol: 'PROP11', name: 'PT Mall Kencana Graha', sector: 'Properti', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'PROP12', name: 'PT Graha Rekayasa Konstruksi', sector: 'Properti', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'PROP13', name: 'PT Cipta Lahan Gemilang', sector: 'Properti', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'PROP14', name: 'PT Condominium Mewah Inti', sector: 'Properti', basePrice: 880, status: 'CRITICAL' },
  { symbol: 'PROP15', name: 'PT Villa Eksklusif Sejahtera', sector: 'Properti', basePrice: 2900, status: 'HEALTHY' },
  { symbol: 'PROP16', name: 'PT Pusat Grosir Perdagangan', sector: 'Properti', basePrice: 5300, status: 'HEALTHY' },
  { symbol: 'PROP17', name: 'PT Dermaga Maritim Realty', sector: 'Properti', basePrice: 7400, status: 'HEALTHY' },
  { symbol: 'PROP18', name: 'PT Perumahan Rakyat Subsidi', sector: 'Properti', basePrice: 2400, status: 'HEALTHY' },
  { symbol: 'PROP19', name: 'PT Kota Industri Karawang', sector: 'Properti', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'PROP20', name: 'PT Perkantoran Sudirman Prima', sector: 'Properti', basePrice: 13500, status: 'HEALTHY' },

  // Keuangan (20)
  { symbol: 'FIN01', name: 'PT Bank Central Nusantara', sector: 'Keuangan', basePrice: 9800, status: 'HEALTHY' },
  { symbol: 'FIN02', name: 'PT Bank Artha Makmur Tbk', sector: 'Keuangan', basePrice: 14200, status: 'HEALTHY' },
  { symbol: 'FIN03', name: 'PT Asuransi Jiwa Pratama', sector: 'Keuangan', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'FIN04', name: 'PT Modal Ventura Mandiri', sector: 'Keuangan', basePrice: 7600, status: 'HEALTHY' },
  { symbol: 'FIN05', name: 'PT Sekuritas Finansial Indo', sector: 'Keuangan', basePrice: 5500, status: 'HEALTHY' },
  { symbol: 'FIN06', name: 'PT Multi Finance Sejahtera', sector: 'Keuangan', basePrice: 3300, status: 'HEALTHY' },
  { symbol: 'FIN07', name: 'PT Pegadaian Emas Mulia', sector: 'Keuangan', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'FIN08', name: 'PT Pinjaman Mikro Digital', sector: 'Keuangan', basePrice: 980, status: 'CRITICAL' },
  { symbol: 'FIN09', name: 'PT Reksadana Prestasi Utama', sector: 'Keuangan', basePrice: 8400, status: 'HEALTHY' },
  { symbol: 'FIN10', name: 'PT Koperasi Simpan Mandiri', sector: 'Keuangan', basePrice: 450, status: 'CRITICAL' },
  { symbol: 'FIN11', name: 'PT Finansial Syariah Kencana', sector: 'Keuangan', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'FIN12', name: 'PT Pembiayaan Kendaraan Prima', sector: 'Keuangan', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'FIN13', name: 'PT Asuransi Kerugian Bahari', sector: 'Keuangan', basePrice: 3600, status: 'HEALTHY' },
  { symbol: 'FIN14', name: 'PT Leasing Logistik Terpadu', sector: 'Keuangan', basePrice: 790, status: 'CRITICAL' },
  { symbol: 'FIN15', name: 'PT Bank Pembangunan Daerah Indo', sector: 'Keuangan', basePrice: 6900, status: 'HEALTHY' },
  { symbol: 'FIN16', name: 'PT Global Asset Management', sector: 'Keuangan', basePrice: 11500, status: 'HEALTHY' },
  { symbol: 'FIN17', name: 'PT Pialang Berjangka Komoditi', sector: 'Keuangan', basePrice: 4400, status: 'HEALTHY' },
  { symbol: 'FIN18', name: 'PT Penjaminan Infrastruktur', sector: 'Keuangan', basePrice: 8100, status: 'HEALTHY' },
  { symbol: 'FIN19', name: 'PT Dompet Mikro Digital Pay', sector: 'Keuangan', basePrice: 1100, status: 'CRITICAL' },
  { symbol: 'FIN20', name: 'PT Tabungan Pensiun Hari Tua', sector: 'Keuangan', basePrice: 9300, status: 'HEALTHY' },

  // F&B (15)
  { symbol: 'FOOD01', name: 'PT Indoboga Kuliner Lestari', sector: 'F&B', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'FOOD02', name: 'PT Rasa Rempah Nusantara', sector: 'F&B', basePrice: 4500, status: 'HEALTHY' },
  { symbol: 'FOOD03', name: 'PT Kopi Sangrai Khatulistiwa', sector: 'F&B', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'FOOD04', name: 'PT Sari Susu Segar Murni', sector: 'F&B', basePrice: 7100, status: 'HEALTHY' },
  { symbol: 'FOOD05', name: 'PT Roti Manis Kencana', sector: 'F&B', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'FOOD06', name: 'PT Air Minum Pegunungan Alam', sector: 'F&B', basePrice: 9400, status: 'HEALTHY' },
  { symbol: 'FOOD07', name: 'PT Mi Instan Mega Rasa', sector: 'F&B', basePrice: 13200, status: 'HEALTHY' },
  { symbol: 'FOOD08', name: 'PT Minuman Boba Kekinian', sector: 'F&B', basePrice: 550, status: 'CRITICAL' },
  { symbol: 'FOOD09', name: 'PT Restoran Cepat Saji Mantap', sector: 'F&B', basePrice: 5600, status: 'HEALTHY' },
  { symbol: 'FOOD10', name: 'PT Pengolahan Daging Olahan', sector: 'F&B', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'FOOD11', name: 'PT Snack Renyah Gurih', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'FOOD12', name: 'PT Teh Segar Melati Prima', sector: 'F&B', basePrice: 5000, status: 'HEALTHY' },
  { symbol: 'FOOD13', name: 'PT Katering Boga Sehat', sector: 'F&B', basePrice: 700, status: 'CRITICAL' },
  { symbol: 'FOOD14', name: 'PT Es Krim Gelato Bahagia', sector: 'F&B', basePrice: 2800, status: 'HEALTHY' },
  { symbol: 'FOOD15', name: 'PT Perkebunan Cokelat Megah', sector: 'F&B', basePrice: 6600, status: 'HEALTHY' },

  // Energi (15)
  { symbol: 'NRG01', name: 'PT Surya Terbit Tenaga Hijau', sector: 'Energi', basePrice: 7700, status: 'HEALTHY' },
  { symbol: 'NRG02', name: 'PT Panas Bumi Khatulistiwa', sector: 'Energi', basePrice: 9100, status: 'HEALTHY' },
  { symbol: 'NRG03', name: 'PT Batu Bara Hitam Mandiri', sector: 'Energi', basePrice: 10400, status: 'HEALTHY' },
  { symbol: 'NRG04', name: 'PT Minyak Gas Samudera', sector: 'Energi', basePrice: 12100, status: 'HEALTHY' },
  { symbol: 'NRG05', name: 'PT Hidro Elektrik Perkasa', sector: 'Energi', basePrice: 5800, status: 'HEALTHY' },
  { symbol: 'NRG06', name: 'PT Biofuel Sawit Mandiri', sector: 'Energi', basePrice: 4600, status: 'HEALTHY' },
  { symbol: 'NRG07', name: 'PT Baterai Listrik Masa Depan', sector: 'Energi', basePrice: 14800, status: 'HEALTHY' },
  { symbol: 'NRG08', name: 'PT Kilang Minyak Perbatasan', sector: 'Energi', basePrice: 950, status: 'CRITICAL' },
  { symbol: 'NRG09', name: 'PT Transmisi Listrik Nasional', sector: 'Energi', basePrice: 8300, status: 'HEALTHY' },
  { symbol: 'NRG10', name: 'PT Turbina Angin Pesisir', sector: 'Energi', basePrice: 3500, status: 'HEALTHY' },
  { symbol: 'NRG11', name: 'PT Gas Alam Cair Nusantara', sector: 'Energi', basePrice: 9600, status: 'HEALTHY' },
  { symbol: 'NRG12', name: 'PT Tambang Uranium Murni', sector: 'Energi', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'NRG13', name: 'PT Pengolahan Limbah Energi', sector: 'Energi', basePrice: 800, status: 'CRITICAL' },
  { symbol: 'NRG14', name: 'PT Distribusi BBM Nusantara', sector: 'Energi', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'NRG15', name: 'PT Energi Hidrogen Bersih', sector: 'Energi', basePrice: 11100, status: 'HEALTHY' },

  // Manufaktur (10)
  { symbol: 'MFG01', name: 'PT Baja Prima Konstruksi', sector: 'Manufaktur', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'MFG02', name: 'PT Semen Nusantara Perkasa', sector: 'Manufaktur', basePrice: 8300, status: 'HEALTHY' },
  { symbol: 'MFG03', name: 'PT Otomotif Mobil Indo', sector: 'Manufaktur', basePrice: 13900, status: 'HEALTHY' },
  { symbol: 'MFG04', name: 'PT Tekstil Benang Kencana', sector: 'Manufaktur', basePrice: 600, status: 'CRITICAL' },
  { symbol: 'MFG05', name: 'PT Elektronika Komponen Inti', sector: 'Manufaktur', basePrice: 7500, status: 'HEALTHY' },
  { symbol: 'MFG06', name: 'PT Plastik Kemasan Lestari', sector: 'Manufaktur', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'MFG07', name: 'PT Kaca Lembaran Megah', sector: 'Manufaktur', basePrice: 4400, status: 'HEALTHY' },
  { symbol: 'MFG08', name: 'PT Pupuk Tani Sejahtera', sector: 'Manufaktur', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'MFG09', name: 'PT Alas Kaki Ekspor Cemerlang', sector: 'Manufaktur', basePrice: 850, status: 'CRITICAL' },
  { symbol: 'MFG10', name: 'PT Perkapalan Galangan Raya', sector: 'Manufaktur', basePrice: 9200, status: 'HEALTHY' }
];

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
    console.log(`ℹ️ Database sudah memiliki ${existingCompanies.count} emiten. Melewati seed ulang agar data pemain & pasar tetap aman.`);
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

  // 4. Seed 100 Bot Companies dengan harga wajar
  console.log(`Seeding ${COMPANY_NAMES.length} bot companies with realistic share prices...`);
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

  // Chat awal
  await query.run(
    `INSERT OR IGNORE INTO chat_messages (id, user_id, username, pt_name, text, badge)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuidv4(), adminId, 'Bank Sentral', 'Bank Sentral', 'Selamat datang di Bursa Capital Federation (CFX)! Mulai merintis dari beli saham 1 Lot.', 'BANK SENTRAL']
  );

  await ensureMarketPopulation();

  console.log(`✅ Database successfully initialized with realistic scale & progression!`);
}

async function ensureMarketPopulation() {
  console.log('🤖 Checking market population (50 additional companies + 24 bot traders)...');
  const now = Date.now();
  let addedCompanies = 0;
  for (const c of ADDITIONAL_COMPANIES) {
    const existing = await query.get('SELECT id FROM companies WHERE symbol = ?', [c.symbol]);
    if (!existing) {
      const compId = uuidv4();
      await query.run(
        `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, prev_close, daily_high, daily_low, total_shares, circulating_shares, dividend_rate, fundamental_score, operational_level, description)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 10000000, 3000000, ?, ?, ?, ?)`,
        [
          compId,
          c.symbol,
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
      // seed 5 history points
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

  // Clean legacy long-named bots to keep all bot usernames short, natural (1 word gamer style)
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

  // Seed 100 Bot Investors, Taipans, & Retail Traders with natural 1-word usernames
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

    // Ensure bot has initial stock portfolio
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
