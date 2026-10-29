const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SECTORS = ['Teknologi', 'Properti', 'Keuangan', 'F&B', 'Energi', 'Manufaktur'];

const COMPANY_NAMES = [
  // Teknologi (20)
  { symbol: 'TECH01', name: 'PT Nusantara Cloud System', sector: 'Teknologi', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'TECH02', name: 'PT Quantum Data Solusi', sector: 'Teknologi', basePrice: 8500, status: 'HEALTHY' },
  { symbol: 'TECH03', name: 'PT Algoritma AI Raya', sector: 'Teknologi', basePrice: 12400, status: 'HEALTHY' },
  { symbol: 'TECH04', name: 'PT Siber Proteksi Aman', sector: 'Teknologi', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'TECH05', name: 'PT Mikro Chip Nusantara', sector: 'Teknologi', basePrice: 15200, status: 'HEALTHY' },
  { symbol: 'TECH06', name: 'PT PayKilat Solusi Digital', sector: 'Teknologi', basePrice: 6300, status: 'HEALTHY' },
  { symbol: 'TECH07', name: 'PT Sarana Telematika Inti', sector: 'Teknologi', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'TECH08', name: 'PT Logika Otomasi Industri', sector: 'Teknologi', basePrice: 2800, status: 'CRITICAL' },
  { symbol: 'TECH09', name: 'PT Satelit Angkasa Cyber', sector: 'Teknologi', basePrice: 9700, status: 'HEALTHY' },
  { symbol: 'TECH10', name: 'PT Metaverse Dunia Baru', sector: 'Teknologi', basePrice: 1100, status: 'CRITICAL' },
  { symbol: 'TECH11', name: 'PT Solusi Fiber Optik Optima', sector: 'Teknologi', basePrice: 3400, status: 'HEALTHY' },
  { symbol: 'TECH12', name: 'PT Robotika Solusi Cepat', sector: 'Teknologi', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'TECH13', name: 'PT Solusi Server Indonesia', sector: 'Teknologi', basePrice: 4900, status: 'HEALTHY' },
  { symbol: 'TECH14', name: 'PT Kripto Ledgers Indonesia', sector: 'Teknologi', basePrice: 1500, status: 'CRITICAL' },
  { symbol: 'TECH15', name: 'PT Geo Spasial Cerdas', sector: 'Teknologi', basePrice: 3900, status: 'HEALTHY' },
  { symbol: 'TECH16', name: 'PT Finnet Payment Integrasi', sector: 'Teknologi', basePrice: 6800, status: 'HEALTHY' },
  { symbol: 'TECH17', name: 'PT Neural Network Mandiri', sector: 'Teknologi', basePrice: 8800, status: 'HEALTHY' },
  { symbol: 'TECH18', name: 'PT Edukasi Digital Prestasi', sector: 'Teknologi', basePrice: 2100, status: 'HEALTHY' },
  { symbol: 'TECH19', name: 'PT Agritech Agro Solusi', sector: 'Teknologi', basePrice: 1300, status: 'CRITICAL' },
  { symbol: 'TECH20', name: 'PT Gameverse Studio Kreatif', sector: 'Teknologi', basePrice: 4600, status: 'HEALTHY' },

  // Properti (20)
  { symbol: 'PROP01', name: 'PT Griya Metropolitan Raya', sector: 'Properti', basePrice: 5400, status: 'HEALTHY' },
  { symbol: 'PROP02', name: 'PT Menara Inti Graha', sector: 'Properti', basePrice: 7800, status: 'HEALTHY' },
  { symbol: 'PROP03', name: 'PT Kawasan Hunian Sentosa', sector: 'Properti', basePrice: 3200, status: 'HEALTHY' },
  { symbol: 'PROP04', name: 'PT Bumi Land Lestari', sector: 'Properti', basePrice: 6100, status: 'HEALTHY' },
  { symbol: 'PROP05', name: 'PT Mega Tower Kencana', sector: 'Properti', basePrice: 11200, status: 'HEALTHY' },
  { symbol: 'PROP06', name: 'PT Real Estate Mandiri Makmur', sector: 'Properti', basePrice: 4300, status: 'HEALTHY' },
  { symbol: 'PROP07', name: 'PT Kota Mandiri Hijau', sector: 'Properti', basePrice: 5900, status: 'HEALTHY' },
  { symbol: 'PROP08', name: 'PT Apartemen Modern Living', sector: 'Properti', basePrice: 1400, status: 'CRITICAL' },
  { symbol: 'PROP09', name: 'PT Sentra Logistik Properti', sector: 'Properti', basePrice: 8200, status: 'HEALTHY' },
  { symbol: 'PROP10', name: 'PT Wisata Resort Tropika', sector: 'Properti', basePrice: 1200, status: 'CRITICAL' },
  { symbol: 'PROP11', name: 'PT Mall Kencana Graha', sector: 'Properti', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'PROP12', name: 'PT Graha Rekayasa Konstruksi', sector: 'Properti', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'PROP13', name: 'PT Cipta Lahan Gemilang', sector: 'Properti', basePrice: 4100, status: 'HEALTHY' },
  { symbol: 'PROP14', name: 'PT Condominium Mewah Inti', sector: 'Properti', basePrice: 1600, status: 'CRITICAL' },
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
  { symbol: 'FIN08', name: 'PT Pinjaman Mikro Digital', sector: 'Keuangan', basePrice: 1800, status: 'CRITICAL' },
  { symbol: 'FIN09', name: 'PT Reksadana Prestasi Utama', sector: 'Keuangan', basePrice: 8400, status: 'HEALTHY' },
  { symbol: 'FIN10', name: 'PT Koperasi Simpan Mandiri', sector: 'Keuangan', basePrice: 900, status: 'CRITICAL' },
  { symbol: 'FIN11', name: 'PT Finansial Syariah Kencana', sector: 'Keuangan', basePrice: 5100, status: 'HEALTHY' },
  { symbol: 'FIN12', name: 'PT Pembiayaan Kendaraan Prima', sector: 'Keuangan', basePrice: 4700, status: 'HEALTHY' },
  { symbol: 'FIN13', name: 'PT Asuransi Kerugian Bahari', sector: 'Keuangan', basePrice: 3600, status: 'HEALTHY' },
  { symbol: 'FIN14', name: 'PT Leasing Logistik Terpadu', sector: 'Keuangan', basePrice: 1700, status: 'CRITICAL' },
  { symbol: 'FIN15', name: 'PT Bank Pembangunan Daerah Indo', sector: 'Keuangan', basePrice: 6900, status: 'HEALTHY' },
  { symbol: 'FIN16', name: 'PT Global Asset Management', sector: 'Keuangan', basePrice: 11500, status: 'HEALTHY' },
  { symbol: 'FIN17', name: 'PT Pialang Berjangka Komoditi', sector: 'Keuangan', basePrice: 4400, status: 'HEALTHY' },
  { symbol: 'FIN18', name: 'PT Penjaminan Infrastruktur', sector: 'Keuangan', basePrice: 8100, status: 'HEALTHY' },
  { symbol: 'FIN19', name: 'PT Dompet Mikro Digital Pay', sector: 'Keuangan', basePrice: 2200, status: 'CRITICAL' },
  { symbol: 'FIN20', name: 'PT Tabungan Pensiun Hari Tua', sector: 'Keuangan', basePrice: 9300, status: 'HEALTHY' },

  // F&B (15)
  { symbol: 'FOOD01', name: 'PT Indoboga Kuliner Lestari', sector: 'F&B', basePrice: 8900, status: 'HEALTHY' },
  { symbol: 'FOOD02', name: 'PT Rasa Rempah Nusantara', sector: 'F&B', basePrice: 4500, status: 'HEALTHY' },
  { symbol: 'FOOD03', name: 'PT Kopi Sangrai Khatulistiwa', sector: 'F&B', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'FOOD04', name: 'PT Sari Susu Segar Murni', sector: 'F&B', basePrice: 7100, status: 'HEALTHY' },
  { symbol: 'FOOD05', name: 'PT Roti Manis Kencana', sector: 'F&B', basePrice: 3800, status: 'HEALTHY' },
  { symbol: 'FOOD06', name: 'PT Air Minum Pegunungan Alam', sector: 'F&B', basePrice: 9400, status: 'HEALTHY' },
  { symbol: 'FOOD07', name: 'PT Mi Instan Mega Rasa', sector: 'F&B', basePrice: 13200, status: 'HEALTHY' },
  { symbol: 'FOOD08', name: 'PT Minuman Boba Kekinian', sector: 'F&B', basePrice: 1100, status: 'CRITICAL' },
  { symbol: 'FOOD09', name: 'PT Restoran Cepat Saji Mantap', sector: 'F&B', basePrice: 5600, status: 'HEALTHY' },
  { symbol: 'FOOD10', name: 'PT Pengolahan Daging Olahan', sector: 'F&B', basePrice: 4200, status: 'HEALTHY' },
  { symbol: 'FOOD11', name: 'PT Snack Renyah Gurih', sector: 'F&B', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'FOOD12', name: 'PT Teh Segar Melati Prima', sector: 'F&B', basePrice: 5000, status: 'HEALTHY' },
  { symbol: 'FOOD13', name: 'PT Katering Boga Sehat', sector: 'F&B', basePrice: 1400, status: 'CRITICAL' },
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
  { symbol: 'NRG08', name: 'PT Kilang Minyak Perbatasan', sector: 'Energi', basePrice: 1900, status: 'CRITICAL' },
  { symbol: 'NRG09', name: 'PT Transmisi Listrik Nasional', sector: 'Energi', basePrice: 8300, status: 'HEALTHY' },
  { symbol: 'NRG10', name: 'PT Turbina Angin Pesisir', sector: 'Energi', basePrice: 3500, status: 'HEALTHY' },
  { symbol: 'NRG11', name: 'PT Gas Alam Cair Nusantara', sector: 'Energi', basePrice: 9600, status: 'HEALTHY' },
  { symbol: 'NRG12', name: 'PT Tambang Uranium Murni', sector: 'Energi', basePrice: 6400, status: 'HEALTHY' },
  { symbol: 'NRG13', name: 'PT Pengolahan Limbah Energi', sector: 'Energi', basePrice: 1500, status: 'CRITICAL' },
  { symbol: 'NRG14', name: 'PT Distribusi BBM Nusantara', sector: 'Energi', basePrice: 7200, status: 'HEALTHY' },
  { symbol: 'NRG15', name: 'PT Energi Hidrogen Bersih', sector: 'Energi', basePrice: 11100, status: 'HEALTHY' },

  // Manufaktur (10)
  { symbol: 'MFG01', name: 'PT Baja Prima Konstruksi', sector: 'Manufaktur', basePrice: 6200, status: 'HEALTHY' },
  { symbol: 'MFG02', name: 'PT Semen Nusantara Perkasa', sector: 'Manufaktur', basePrice: 8300, status: 'HEALTHY' },
  { symbol: 'MFG03', name: 'PT Otomotif Mobil Indo', sector: 'Manufaktur', basePrice: 13900, status: 'HEALTHY' },
  { symbol: 'MFG04', name: 'PT Tekstil Benang Kencana', sector: 'Manufaktur', basePrice: 1200, status: 'CRITICAL' },
  { symbol: 'MFG05', name: 'PT Elektronika Komponen Inti', sector: 'Manufaktur', basePrice: 7500, status: 'HEALTHY' },
  { symbol: 'MFG06', name: 'PT Plastik Kemasan Lestari', sector: 'Manufaktur', basePrice: 3100, status: 'HEALTHY' },
  { symbol: 'MFG07', name: 'PT Kaca Lembaran Megah', sector: 'Manufaktur', basePrice: 4400, status: 'HEALTHY' },
  { symbol: 'MFG08', name: 'PT Pupuk Tani Sejahtera', sector: 'Manufaktur', basePrice: 6700, status: 'HEALTHY' },
  { symbol: 'MFG09', name: 'PT Alas Kaki Ekspor Cemerlang', sector: 'Manufaktur', basePrice: 1600, status: 'CRITICAL' },
  { symbol: 'MFG10', name: 'PT Perkapalan Galangan Raya', sector: 'Manufaktur', basePrice: 9200, status: 'HEALTHY' }
];

async function main() {
  console.log('--- Seeding Monopoly Corp Database ---');

  // 1. Central Bank Settings
  const defaultSettings = [
    { key: 'interest_rate', value: '6.5' },
    { key: 'ipo_min_asset', value: '5000000' },
    { key: 'ipo_min_level', value: '10' },
    { key: 'inflation_rate', value: '3.2' },
    { key: 'bot_intervention_threshold', value: '0.35' },
    { key: 'trading_fee_pct', value: '0.15' },
  ];

  for (const s of defaultSettings) {
    await prisma.centralBankSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('Central Bank settings seeded.');

  // 2. Admin User & Demo Player
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      ptName: 'Bank Sentral Monopoly Corp',
      sector: 'Keuangan',
      balanceIb: 99999999999.0,
      ptLevel: 99,
      role: 'ADMIN',
      creditScore: 999,
      isBlueChip: true,
    },
  });

  const playerPassword = await bcrypt.hash('player123', 10);
  const demoPlayer = await prisma.user.upsert({
    where: { username: 'sultan_budi' },
    update: {},
    create: {
      username: 'sultan_budi',
      passwordHash: playerPassword,
      ptName: 'PT Budi Megah Cemerlang',
      sector: 'Teknologi',
      balanceIb: 100000.0, // Modal awal investor malaikat 100,000 IB
      ptLevel: 1,
      role: 'PLAYER',
      creditScore: 750,
      isBlueChip: false,
    },
  });
  console.log('Admin and Demo Player created.');

  // 3. Macro Events & News
  await prisma.macroEvent.create({
    data: {
      title: 'Ledakan Sektor Properti',
      description: 'Pemerintah meluncurkan paket stimulus mega infrastruktur perumahan!',
      affectedSector: 'Properti',
      priceImpactPct: 15.0,
      active: true,
      durationSeconds: 1800,
    },
  });

  await prisma.news.createMany({
    data: [
      {
        title: 'Bank Sentral Menjaga Suku Bunga Acuan Stabil di 6.5%',
        content: 'Dewan Gubernur Bank Sentral Monopoly Corp menegaskan likuiditas pasar modal dalam kondisi prima.',
        affectedSector: 'Keuangan',
        sentiment: 'BULLISH',
        impactMultiplier: 1.05,
      },
      {
        title: 'Revolusi AI: Permintaan Server dan Mikrochip Tembus Rekor',
        content: 'Emiten sektor teknologi mencatatkan antrean pesanan perangkat cerdas untuk 4 kuartal ke depan.',
        affectedSector: 'Teknologi',
        sentiment: 'BULLISH',
        impactMultiplier: 1.15,
      },
      {
        title: 'Komoditas Energi Tertekan Penurunan Konsumsi Pabrik Global',
        content: 'Harga minyak mentah dan batu bara terkoreksi tipis akibat normalisasi pasokan jalur logistik laut.',
        affectedSector: 'Energi',
        sentiment: 'BEARISH',
        impactMultiplier: 0.95,
      },
      {
        title: 'Ekspansi Waralaba F&B Lokal Merambah Kawasan Asia Tenggara',
        content: 'Brand kopi dan makanan cepat saji Indonesia mencatatkan pertumbuhan gerai 25% YoY.',
        affectedSector: 'F&B',
        sentiment: 'BULLISH',
        impactMultiplier: 1.08,
      },
    ],
  });
  console.log('Macro Event and Initial News seeded.');

  // 4. Seed 100 Bot Companies
  console.log('Seeding 100 Bot Companies across 6 Sectors...');
  for (const c of COMPANY_NAMES) {
    const existing = await prisma.company.findUnique({ where: { symbol: c.symbol } });
    if (!existing) {
      const company = await prisma.company.create({
        data: {
          symbol: c.symbol,
          name: c.name,
          sector: c.sector,
          isBot: true,
          status: c.status,
          currentPrice: c.basePrice,
          basePrice: c.basePrice,
          totalShares: 10000000,
          circulatingShares: 3000000,
          dividendRate: c.status === 'HEALTHY' ? 0.05 : 0.0,
          fundamentalScore: c.status === 'HEALTHY' ? 85.0 : 35.0,
          operationalLevel: c.status === 'HEALTHY' ? 7 : 2,
          description: `Emiten ${c.sector} terkemuka di bursa Monopoly Corp. Status: ${c.status}.`,
        },
      });

      // Generate 15 historical candlestick price points
      let lastPrice = c.basePrice;
      const historyData = [];
      const now = Date.now();
      for (let i = 15; i >= 0; i--) {
        const delta = (Math.random() - 0.48) * (lastPrice * 0.03);
        const open = lastPrice;
        const close = Math.max(50, Math.round(open + delta));
        const high = Math.round(Math.max(open, close) + Math.random() * (open * 0.015));
        const low = Math.round(Math.min(open, close) - Math.random() * (open * 0.015));
        const volume = Math.floor(Math.random() * 50000) + 5000;
        lastPrice = close;

        historyData.push({
          companyId: company.id,
          open,
          close,
          high,
          low,
          price: close,
          volume,
          timestamp: new Date(now - i * 60000), // 1-minute intervals
        });
      }
      await prisma.priceHistory.createMany({ data: historyData });
    }
  }

  // 5. Seed some initial chat messages
  await prisma.chatMessage.createMany({
    data: [
      {
        userId: adminUser.id,
        text: 'Selamat datang di bursa Monopoly Corp! Pasar saham resmi dibuka. Patuhi aturan lot (1 Lot = 100 Lembar).',
        badge: 'BANK SENTRAL',
      },
      {
        userId: demoPlayer.id,
        text: 'Halo semua taipan! Siap mengakuisisi emiten krisis hari ini!',
        badge: 'REGULER',
      },
    ],
  });

  console.log('✅ Seeding completed successfully! 100 Bot Companies created.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
