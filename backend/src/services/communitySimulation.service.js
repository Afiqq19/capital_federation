/**
 * Community Simulation Service — Capital Federation (CFX)
 * 
 * Mengotomasi dinamika ekosistem bursa 24/7:
 * 1. Dynamic Market News Engine:
 *    Menghasilkan siaran warta pasar, aksi korporasi, laporan laba, dividen,
 *    dan ekspansi bisnis riil dari 1.000++ konglomerat & ratusan emiten Tbk.
 * 2. Active Bot Community Chat Engine:
 *    Menghidupkan Chat Global Bursa dengan percakapan realistis dari para bot
 *    (12 Naga, Taipan, VIP, dan Trader Ritel) yang saling berinteraksi,
 *    membahas emiten bursa, dividen, dan pergerakan pasar secara alami.
 */

const { v4: uuidv4 } = require('uuid');

class CommunitySimulationService {
  constructor({ query, io, simulationEngine, getUserRankMap, formatCleanPtName }) {
    this.query = query;
    this.io = io;
    this.simulationEngine = simulationEngine;
    this.getUserRankMap = getUserRankMap;
    this.formatCleanPtName = formatCleanPtName;

    this.newsTimeout = null;
    this.chatTimeout = null;
    this.isRunning = false;
  }

  // ---------- Lifecycle ----------
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('📰 [Community Engine] Mengaktifkan Simulasi Warta Pasar & Chat Komunitas Aktif 24/7...');

    // Seed awal jika berita atau chat kosong/usang
    await this.ensureInitialSeed();

    // Jadwalkan siklus warta pasar & obrolan bursa
    this.scheduleNextNews(15000); // 15 detik pertama langsung rilis berita segar
    this.scheduleNextChat(8000);  // 8 detik pertama langsung ada chat aktif
  }

  stop() {
    this.isRunning = false;
    if (this.newsTimeout) clearTimeout(this.newsTimeout);
    if (this.chatTimeout) clearTimeout(this.chatTimeout);
    this.newsTimeout = null;
    this.chatTimeout = null;
    console.log('🛑 [Community Engine] Simulasi Warta & Chat dinonaktifkan.');
  }

  // ---------- Scheduling ----------
  scheduleNextNews(delayMs) {
    if (!this.isRunning) return;
    // Interval acak antara 75 detik hingga 150 detik (1.25 - 2.5 menit)
    const nextInterval = delayMs || Math.floor(75000 + Math.random() * 75000);
    this.newsTimeout = setTimeout(async () => {
      try {
        await this.generateDynamicNews();
      } catch (err) {
        console.error('❌ [Community Engine] Gagal rilis berita otomatis:', err.message);
      }
      this.scheduleNextNews();
    }, nextInterval);
  }

  scheduleNextChat(delayMs) {
    if (!this.isRunning) return;
    // Interval acak antara 20 detik hingga 50 detik
    const nextInterval = delayMs || Math.floor(20000 + Math.random() * 30000);
    this.chatTimeout = setTimeout(async () => {
      try {
        await this.generateBotChat();
        // 25% kemungkinan ada pesan balasan cepat (3-7 detik) dari trader lain
        if (Math.random() < 0.28) {
          setTimeout(() => {
            this.generateBotChat().catch(() => {});
          }, Math.floor(3000 + Math.random() * 4000));
        }
      } catch (err) {
        console.error('❌ [Community Engine] Gagal kirim chat bot:', err.message);
      }
      this.scheduleNextChat();
    }, nextInterval);
  }

  // ---------- Initial Seed Check ----------
  async ensureInitialSeed() {
    try {
      const latestNews = await this.query.get('SELECT published_at FROM news ORDER BY published_at DESC LIMIT 1');
      const isNewsStale = !latestNews || (new Date() - new Date(latestNews.published_at)) > 30 * 60 * 1000;
      if (isNewsStale) {
        console.log('📰 [Community Engine] Menghasilkan 5 rilis warta pasar perdana...');
        for (let i = 0; i < 5; i++) {
          await this.generateDynamicNews(true);
        }
      }

      const latestChat = await this.query.get('SELECT created_at FROM chat_messages ORDER BY created_at DESC LIMIT 1');
      const isChatStale = !latestChat || (new Date() - new Date(latestChat.created_at)) > 60 * 60 * 1000;
      const chatCount = await this.query.get('SELECT count(*) as cnt FROM chat_messages');
      if (isChatStale || (chatCount && chatCount.cnt < 12)) {
        console.log('💬 [Community Engine] Mengisi 12 obrolan awal komunitas pasar bursa...');
        for (let i = 0; i < 12; i++) {
          await this.generateBotChat(true);
        }
      }
    } catch (e) {
      console.error('Initial seed error in community service:', e.message);
    }
  }

  // ============================================================================
  // 1. DYNAMIC MARKET NEWS GENERATOR
  // ============================================================================
  async generateDynamicNews(isInitialSeed = false) {
    // Ambil emiten Tbk / terdaftar acak dari database (hanya emiten aktif / pemilik tidak dibekukan)
    const companies = await this.query.all(`
      SELECT c.*, u.username as owner_username, u.role as owner_role
      FROM companies c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE (c.listing_status = 'LISTED' OR c.is_ipo = 1)
        AND (c.is_seized = 0 OR c.is_seized IS NULL)
        AND (u.is_banned = 0 OR u.is_banned IS NULL)
      ORDER BY RANDOM() LIMIT 10
    `);

    if (!companies || companies.length === 0) return;
    const comp = companies[Math.floor(Math.random() * companies.length)];
    const ownerName = comp.owner_username || 'Konsorsium Mitra';
    const sector = comp.sector || 'Teknologi';
    const symbol = comp.symbol || 'EMTN';
    const companyName = comp.name || `PT. ${symbol} Federasi Tbk.`;

    const scenarios = [
      // 1. Kinerja Keuangan & Laba Bersih Rekor
      {
        title: `📈 LAPORAN KINERJA: ${companyName} (${symbol}) Bukukan Laba Bersih Rekor!`,
        content: `Audit keuangan kuartal berjalan mencatat lonjakan laba bersih pada emiten ${companyName} sebesar +${(14 + Math.random() * 32).toFixed(1)}%. Efisiensi belanja R&D dan perluasan pangsa pasar sektor ${sector} mendorong penguatan valuasi emiten.`,
        sentiment: 'BULLISH',
        trendBoost: 3.5,
      },
      // 2. Ekspansi Pabrik & Fasilitas Baru
      {
        title: `🏭 EKSPANSI STRATEGIS: ${companyName} (${symbol}) Resmikan Pabrik & Fasilitas Baru!`,
        content: `Manajemen ${companyName} di bawah arahan @${ownerName} resmi menuntaskan pembangunan fasilitas operasional modern. Investasi ini diproyeksikan menggandakan kapasitas produksi tahunan demi memenuhi pesanan pasar federasi.`,
        sentiment: 'BULLISH',
        trendBoost: 2.8,
      },
      // 3. Dividen Tunai Spesial / Interim
      {
        title: `💰 TEBAR DIVIDEN: ${companyName} (${symbol}) Bagikan Dividen Tunai Spesial!`,
        content: `Rapat Umum Pemegang Saham (RUPS) ${companyName} menyepakati distribusi dividen tunai kepada seluruh pemegang saham publik dan pendiri dengan dividend yield mencapai ${(4.2 + Math.random() * 2.8).toFixed(1)}%. Pembayaran langsung masuk ke brankas investor.`,
        sentiment: 'BULLISH',
        trendBoost: 3.0,
      },
      // 4. Kemitraan Pengadaan & Kontrak Jangka Panjang
      {
        title: `🤝 KONTRAK STRATEGIS: ${companyName} Gaet Perjanjian Pasokan Senilai Puluhan Miliar!`,
        content: `Konsorsium korporasi nasional resmi menandatangani kontrak kemitraan jangka panjang dengan ${companyName}. Kesepakatan strategis ini mengunci stabilitas arus kas perseroan untuk beberapa siklus ke depan.`,
        sentiment: 'BULLISH',
        trendBoost: 2.5,
      },
      // 5. Inovasi Riset R&D & Hak Paten Unggulan
      {
        title: `🔬 TEROBOSAN R&D: Divisi Riset ${companyName} Sukses Patenkan Portofolio Baru!`,
        content: `Peningkatan level riset & inovasi pada ${companyName} membuahkan hasil dengan perolehan paten teknologi ramah lingkungan di sektor ${sector}, memperkuat keunggulan kompetitif di bursa.`,
        sentiment: 'BULLISH',
        trendBoost: 2.2,
      },
      // 6. Akumulasi Saham Skala Besar oleh 12 Naga / Taipan
      {
        title: `🦅 AKUMULASI BURSA: Lonjakan Transaksi Beli Bersih pada Saham ${symbol}!`,
        content: `Aktivitas perdagangan bursa mencatat net buy masif pada emiten ${companyName} oleh konglomerat papan atas. Minat beli institusi yang tinggi mendorong apresiasi harga di pasar reguler.`,
        sentiment: 'BULLISH',
        trendBoost: 4.0,
      },
      // 7. Konsolidasi Sehat Pasca Reli Harga
      {
        title: `📊 AKSI AMBIL UNTUNG: Saham ${symbol} Bergerak Konsolidasi Sehat Pasca Reli!`,
        content: `Setelah mencatatkan tren penguatan signifikan, saham ${companyName} bergerak dalam fase konsolidasi wajar seiring aksi profit taking parsial oleh pelaku pasar ritel. Fundamental perseroan dipastikan tetap kokoh.`,
        sentiment: 'NEUTRAL',
        trendBoost: -1.2,
      },
      // 8. Stimulus Kebijakan Sektoral dari Bank Sentral BIF
      {
        title: `🏛️ INSENTIF SEKTORAL: Bank Sentral BIF Luncurkan Stimulus untuk Sektor ${sector}!`,
        content: `Otoritas Moneter & Fiskal Federasi menyalurkan paket relaksasi likuiditas dan subsidi operasional bagi emiten di sektor ${sector}. Saham-saham berfundamental unggul seperti ${symbol} menyambut positif kebijakan ini.`,
        sentiment: 'BULLISH',
        trendBoost: 2.7,
      },
      // 9. Rebrand & Peningkatan Tata Kelola Korporasi
      {
        title: `✨ TATA KELOLA UNGGUL: ${companyName} Raih Sertifikasi Kepatuhan Pasar Modal!`,
        content: `Komite Pengawas Bursa menganugerahkan predikat Emiten Sehat kepada ${companyName} atas keterbukaan informasi publik dan akuntabilitas brankas yang teruji secara transparan.`,
        sentiment: 'BULLISH',
        trendBoost: 1.8,
      },
      // 10. Rekor Volume Perdagangan Harian
      {
        title: `⚡ FREKUENSI TERTINGGI: Saham ${symbol} Catatkan Rekor Perputaran Lot Harian!`,
        content: `Saham ${companyName} masuk dalam jajaran top turnover bursa hari ini dengan volume perdagangan mencapai ratusan ribu lot, mencerminkan likuiditas pasar yang sangat aktif.`,
        sentiment: 'BULLISH',
        trendBoost: 2.0,
      }
    ];

    const item = scenarios[Math.floor(Math.random() * scenarios.length)];
    const newsId = uuidv4();
    const pubAt = new Date().toISOString();

    await this.query.run(`
      INSERT INTO news (id, title, content, affected_sector, sentiment, impact_multiplier, published_at)
      VALUES (?, ?, ?, ?, ?, 1.0, ?)
    `, [newsId, item.title, item.content, sector, item.sentiment, pubAt]);

    const newsPayload = {
      id: newsId,
      title: item.title,
      content: item.content,
      affected_sector: sector,
      sentiment: item.sentiment,
      impact_multiplier: 1.0,
      published_at: pubAt,
    };

    // Siarkan ke seluruh user lewat socket
    this.io.emit('market:news_broadcast', newsPayload);
    this.io.emit('market:breaking_news', newsPayload);

    // Dorong tren saham di simulation engine jika tersedia
    if (this.simulationEngine && typeof this.simulationEngine.setStockTrend === 'function' && item.trendBoost) {
      this.simulationEngine.setStockTrend(symbol, item.trendBoost);
    }

    // Pembersihan berkala: jaga tabel news maksimal 180 record
    try {
      await this.query.run(`
        DELETE FROM news WHERE id NOT IN (
          SELECT id FROM news ORDER BY published_at DESC LIMIT 180
        )
      `);
    } catch (_) {}

    if (!isInitialSeed) {
      console.log(`📢 [Warta Pasar Otomatis] Rilis: "${item.title.substring(0, 50)}..."`);
    }
  }

  // ============================================================================
  // 2. ACTIVE BOT COMMUNITY CHAT GENERATOR
  // ============================================================================
  async generateBotChat(isInitialSeed = false) {
    // Pilih bot user acak yang AKTIF (is_banned = 0) dan MURNI BOT (tidak pernah memakai akun pemain asli!)
    const botUser = await this.query.get(`
      SELECT id, username, pt_name, has_pt, sector, role, is_blue_chip
      FROM users
      WHERE (id LIKE 'bot-user-%' OR id LIKE 'user-bot-%')
        AND is_banned = 0
        AND role != 'ADMIN'
      ORDER BY RANDOM() LIMIT 1
    `);

    if (!botUser) return;

    // Ambil daftar emiten acak untuk disebut dalam obrolan
    const randomComp = await this.query.get(`
      SELECT symbol, name, sector, current_price FROM companies 
      WHERE (listing_status = 'LISTED' OR is_ipo = 1)
      ORDER BY RANDOM() LIMIT 1
    `);
    const sym = randomComp ? `$${randomComp.symbol}` : '$SAPN';
    const sectorName = randomComp ? randomComp.sector : (botUser.sector || 'Teknologi');

    // Dapatkan peta peringkat live untuk menentukan badge
    const rankMap = await this.getUserRankMap();
    const rankInfo = rankMap.get(botUser.id);
    const rank = rankInfo ? rankInfo.rank : Math.floor(10 + Math.random() * 80);
    const isVip = Boolean(String(botUser.role).toUpperCase() === 'VIP' || botUser.is_blue_chip || (rankInfo && rankInfo.isVip));
    const is12Naga = rank <= 12;
    const isTaipan = rank > 12 && rank <= 35;

    let badge = 'REGULER';
    if (is12Naga) {
      badge = isVip ? `12 NAGA #${rank} • VIP` : `12 NAGA #${rank}`;
    } else if (isTaipan) {
      badge = isVip ? 'TAIPAN • VIP' : 'TAIPAN';
    } else if (isVip) {
      badge = 'VIP SULTAN';
    } else if (botUser.is_blue_chip) {
      badge = 'BLUE CHIP';
    }

    // Koleksi pesan natural bursa modal Indonesia
    let messages = [];

    if (is12Naga) {
      messages = [
        `Kuncinya sabar dan disiplin dividen. Bisnis riil yang solid selalu menang jangka panjang.`,
        `Portofolio sektor ${sectorName} kita tambah lagi kuartal ini. Fundamentalnya sangat meyakinkan.`,
        `Selamat buat rekan-rekan investor yang ikut menikmati apresiasi ${sym} hari ini. Tetap rendah hati.`,
        `Likuiditas bursa Federasi semakin sehat. Pertumbuhan riil ekonomi terasa nyata di lapangan.`,
        `Fokus perkuat R&D dan kapasitas staf operasional anak perusahaan. Cash flow adalah raja.`,
        `Saham ${sym} punya prospek cerah. Tata kelola manajemennya kami pantau sangat profesional.`,
        `Bursa adalah sarana memindahkan kekayaan dari yang tergesa-gesa kepada yang berwawasan luas.`,
        `Alokasi dividen kuartal ini kami putar kembali untuk suntik modal pabrik di sektor ${sectorName}.`,
        `Peringkat bukan tujuan utama, yang penting brankas kas perseroan selalu sehat dan profitabel.`,
        `Jangan terpengaruh rumor jangka pendek. Cek laporan keuangan dan rasio laba operasionalnya.`
      ];
    } else if (isTaipan || isVip) {
      messages = [
        `Dividen dari ${sym} barusan cair ke kas PT, lumayan buat ekspansi cabang baru 🔥`,
        `Ada yang koleksi ${sym}? Orderbook antrean bid-nya tebal banget hari ini.`,
        `Sektor ${sectorName} lagi uptrend kencang ya, aliran modal institusi masuk terus.`,
        `R&D dinaikkan ke level tinggi bener-bener kerasa ya passive income-nya tiap siklus!`,
        `Alhamdulillah closing sesi ini portofolio hijau royo-royo 🚀`,
        `Beli saat sepi, panen saat ramai. Kaidah klasik pasar modal yang ga pernah salah.`,
        `Tender mega proyek nasional kabarnya bakal buka lagi, siapin modal kas PT gaes.`,
        `Akumulasi bertahap di area support selalu ngasih hasil terbaik. Santai pantau orderbook.`,
        `Habis serok 500 lot ${sym}, fundamental skor 90+ begini sayang kalau dilewatkan.`,
        `Kapasitas staf sudah 250 orang, laba bersih per siklus makin melimpah Alhamdulillah 🙏`,
        `Siapa di sini yang udah masuk jajaran 12 Naga? Inspiratif bener asetnya ratusan miliar!`,
        `Suntik modal kas pribadi ke kas PT tadi siang langsung berbuah manis buat ekspansi.`
      ];
    } else {
      messages = [
        `Gas tipis-tipis dulu di ${sym}, lumayan buat nambah kas modal operasional 🚀`,
        `Sabar yang nyangkut, market lagi konsolidasi wajar kok. Jangan panik jual haha`,
        `Mau tanya suhu-suhu di sini, mending naikin R&D dulu apa rekrut staf ya?`,
        `Wuih ${sym} ARA ga nih hari ini? Terbang tinggi bener 💸`,
        `Serok bawah mumpung dikasih diskon bursa! Siapa berani serap?`,
        `Cuan tipis-tipis tapi konsisten yang penting portofolio tumbuh terus tiap hari 🙏`,
        `Kalo kas PT udah tembus ratusan juta enaknya suntik ke kas pribadi atau bangun PT baru ya?`,
        `Asli bursa kita likuiditasnya rame banget hari ini, bid-offer gerak cepet.`,
        `Pantau chart 1D sama orderbook dulu, jangan fomo pas lagi di pucuk ya kawan-kawan.`,
        `Keren euy para 12 Naga, asetnya udah ratusan miliar beneran panutan!`,
        `Pagi kawan-kawan trader, semoga bursa hari ini penuh berkah dan cuan melimpah!`,
        `Mantep tadi dapet momentum di sektor ${sectorName}, take profit sebagian amankan kas.`,
        `Izin mantau emiten teknologi dulu, kayaknya mau breakout resisten nih.`,
        `Hari ini profit IB 150 Jt, Alhamdulillah rezeki hari ini buat tabungan kas pribadi.`,
        `Jangan lupa diversifikasi portofolio ya kawan-kawan, jangan all-in di satu emiten.`
      ];
    }

    const text = messages[Math.floor(Math.random() * messages.length)];
    const msgId = uuidv4();
    const cleanPt = this.formatCleanPtName(botUser.pt_name, botUser.has_pt);

    await this.query.run(`
      INSERT INTO chat_messages (id, user_id, username, pt_name, text, badge)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [msgId, botUser.id, botUser.username, cleanPt, text, badge]);

    const chatPayload = {
      id: msgId,
      user_id: botUser.id,
      username: botUser.username,
      pt_name: cleanPt,
      text,
      badge,
      rank,
      created_at: new Date().toISOString()
    };

    this.io.emit('chat:message', chatPayload);

    // Pembersihan berkala: jaga tabel chat_messages maksimal 250 record
    try {
      await this.query.run(`
        DELETE FROM chat_messages WHERE id NOT IN (
          SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT 250
        )
      `);
    } catch (_) {}

    if (!isInitialSeed) {
      console.log(`💬 [Chat Komunitas] @${botUser.username} (${badge}): "${text.substring(0, 45)}..."`);
    }
  }
}

module.exports = CommunitySimulationService;
