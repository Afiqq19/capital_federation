import 'package:flutter/material.dart';

class GameConstitutionScreen extends StatefulWidget {
  const GameConstitutionScreen({super.key});

  @override
  State<GameConstitutionScreen> createState() => _GameConstitutionScreenState();
}

class _GameConstitutionScreenState extends State<GameConstitutionScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _articles = const [
    {
      'article': 'Pasal 1',
      'title': 'Kedaulatan Saham & Pengendalian Perseroan (M&A 51%)',
      'summary': 'Kepemilikan saham di atas 50% (+1 lembar / 51%) memberikan hak pengendalian mutlak atas emiten.',
      'points': [
        'Konglomerat dengan 51% porsi saham menjadi Pemegang Saham Pengendali (PSP).',
        'Porsi saham pendiri awal (founder) didilusi secara proporsional sesuai akta notariat.',
        'Pengendali berhak mengelola fundamental bot dan menerima dividen mayoritas.',
      ],
      'color': Color(0xFF10B981),
      'icon': Icons.account_balance_rounded,
    },
    {
      'article': 'Pasal 2',
      'title': 'Batas Volatilitas Harian Simetris (ARA +35% & ARB -35%)',
      'summary': 'Pergerakan harga saham dibatasi sirkuit pemutus simetris untuk menjaga stabilitas.',
      'points': [
        'Batas Auto Rejection Atas (ARA) dipatok maksimal +35.00%.',
        'Batas Auto Rejection Bawah (ARB) dipatok maksimal -35.00%.',
        'Order di luar rentang -35% s/d +35% ditolak otomatis oleh sistem bursa IPMC.',
      ],
      'color': Color(0xFFF59E0B),
      'icon': Icons.swap_vert_rounded,
    },
    {
      'article': 'Pasal 3',
      'title': 'Radar Unusual Market Activity (UMA)',
      'summary': 'Peringatan transparansi publik atas fluktuasi harga atau volume saham di luar kebiasaan.',
      'points': [
        'Status UMA bukan suspensi; perdagangan saham tetap berjalan normal.',
        'Memberikan sinyal kehati-hatian bagi para investor dan pelaku pasar.',
        'Emiten wajib memberikan konfirmasi bilamana diminta oleh otoritas pengawas.',
      ],
      'color': Color(0xFFF59E0B),
      'icon': Icons.warning_amber_rounded,
    },
    {
      'article': 'Pasal 4',
      'title': 'Suspensi Saham (Trading Halt)',
      'summary': 'Tindakan intervensi tertinggi berupa penghentian sementara seluruh aktivitas perdagangan saham.',
      'points': [
        'Diterapkan jika ada indikasi manipulasi pasar terstruktur atau kepailitan.',
        'Order beli dan jual dibekukan total sampai masa penetapan berakhir.',
        'Pencabutan status suspensi dapat dilakukan oleh admin pengawas bursa.',
      ],
      'color': Color(0xFFF43F5E),
      'icon': Icons.block_rounded,
    },
    {
      'article': 'Pasal 5',
      'title': 'Pajak Transaksi 0.10% & Bea Meterai Digital',
      'summary': 'Kontribusi fiskal otomatis untuk ketahanan brankas kas negara federasi.',
      'points': [
        'Setiap transaksi penjualan saham dikenakan pajak bursa 0.10% masuk ke Kas Negara.',
        'Setiap akta notaris peralihan blok saham atau M&A dikenakan Bea Meterai IB 10.000.',
        'Penerimaan dialokasikan untuk cadangan devisa likuiditas dan dana talangan.',
      ],
      'color': Color(0xFF38BDF8),
      'icon': Icons.receipt_long_rounded,
    },
    {
      'article': 'Pasal 6',
      'title': 'Kepailitan & Eksekusi Sita Jaminan PNAF',
      'summary': 'Kewenangan yudisial Pengadilan Niaga Arbitrase Federasi atas debitur kredit macet.',
      'points': [
        'Bank Sentral (BIF) dapat mengajukan permohonan sita terhadap debitur NPL.',
        'PNAF mengeksekusi sita jaminan atas perseroan atau portofolio debitur.',
        'Aset sitaan berada di bawah pengawasan kurator negara.',
      ],
      'color': Color(0xFFA855F7),
      'icon': Icons.gavel_rounded,
    },
    {
      'article': 'Pasal 7',
      'title': 'Restriksi Dividen Emiten Sitaan',
      'summary': 'Pembekuan hak penerimaan dividen bagi perseroan berstatus sitaan negara.',
      'points': [
        'Dividen perseroan yang disita negara dibekukan dan dialihkan ke brankas penampungan.',
        'Pemilik lama dilarang menarik modal perseroan selama status sita belum dicabut.',
      ],
      'color': Color(0xFFF43F5E),
      'icon': Icons.lock_clock_rounded,
    },
    {
      'article': 'Pasal 8',
      'title': 'Syarat Pelunasan Tripartit Pemulihan Sita',
      'summary': 'Persyaratan wajib penebusan kembali perseroan yang telah disita oleh otoritas.',
      'points': [
        'Melunasi seluruh utang pokok fasilitas pinjaman Bank Sentral Federasi (BIF).',
        'Melunasi akumulasi bunga kredit yang tertunggak.',
        'Menyetorkan uang sanksi / denda pemulihan sita resmi ke Kas Negara Federasi.',
      ],
      'color': Color(0xFF10B981),
      'icon': Icons.payments_rounded,
    },
    {
      'article': 'Pasal 9',
      'title': 'Validitas Akta Notariat & Penalti Wanprestasi 20%',
      'summary': 'Kekuatan hukum mengikat atas seluruh pengalihan saham non-bursa (P2P).',
      'points': [
        'Setiap transaksi divestasi blok saham wajib didaftarkan dengan Akta Notaris Resmi.',
        'Pelanggaran kesepakatan dikenakan ganti rugi wanprestasi 20% dari nilai transaksi.',
        'Gugatan diajukan langsung ke Pengadilan Niaga Arbitrase Federasi.',
      ],
      'color': Color(0xFFF59E0B),
      'icon': Icons.description_rounded,
    },
    {
      'article': 'Pasal 10',
      'title': 'Intervensi Likuiditas & Dana Talangan Darurat (Bailout)',
      'summary': 'Kewenangan Kas Negara menyuntikkan likuiditas penyelamatan demi stabilitas sistemik.',
      'points': [
        'Kas Negara berhak mengucurkan dana talangan (Bailout) kepada emiten krisis.',
        'Surplus kas negara dapat disalurkan sebagai stimulus kemakmuran ke konglomerat.',
        'Menjaga bursa tetap bergairah dan mencegah kepanikan massal.',
      ],
      'color': Color(0xFF10B981),
      'icon': Icons.auto_awesome_rounded,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D1322),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'KONSTITUSI & REGULASI GAME',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 14,
                letterSpacing: 1.0,
              ),
            ),
            Text(
              'Lex Mercatoria • Kepatuhan Hukum & Privasi',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 10,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFF38BDF8),
          indicatorWeight: 3,
          labelColor: const Color(0xFF38BDF8),
          unselectedLabelColor: const Color(0xFF64748B),
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: const [
            Tab(text: '10 Regulasi Pasar Modal'),
            Tab(text: 'Kepatuhan & Anti-Judi'),
            Tab(text: 'Ketentuan Layanan'),
            Tab(text: 'Kebijakan Privasi'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildConstitutionTab(),
          _buildComplianceTab(),
          _buildTermsTab(),
          _buildPrivacyTab(),
        ],
      ),
    );
  }

  Widget _buildConstitutionTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0C243B), Color(0xFF0D1829)],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E3A5F)),
          ),
          child: const Row(
            children: [
              Icon(Icons.gavel_rounded, color: Color(0xFFF59E0B), size: 28),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Lex Mercatoria Federasi Indigo',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    SizedBox(height: 2),
                    Text(
                      '10 Ketetapan Hukum Resmi yang mengatur kedaulatan saham, sirkuit pemutus ARA +35% & ARB -35%, serta perlindungan investor.',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        ..._articles.map((art) {
          final color = art['color'] as Color;
          final icon = art['icon'] as IconData;
          final points = art['points'] as List<String>;

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0D1322),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(icon, color: color, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              art['article'] as String,
                              style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            art['title'] as String,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  art['summary'] as String,
                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
                ),
                const SizedBox(height: 8),
                const Divider(color: Color(0xFF1E293B), height: 1),
                const SizedBox(height: 8),
                ...points.map(
                  (p) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('• ', style: TextStyle(color: color, fontWeight: FontWeight.bold)),
                        Expanded(
                          child: Text(
                            p,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildComplianceTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildInfoCard(
          title: 'Simulasi Murni Tanpa Uang Asli (Pure Simulation)',
          icon: Icons.verified_user_rounded,
          color: const Color(0xFF10B981),
          content:
              'Capital Federation / Indigo Tycoon adalah perangkat lunak simulasi bisnis, strategi konglomerasi, dan edukasi mekanisme pasar modal. Seluruh entitas, instrumen keuangan, peristiwa krisis makro, dan persidangan di dalamnya bersifat fiktif murni yang disimulasikan dalam ruang server tertutup.',
        ),
        const SizedBox(height: 12),
        _buildInfoCard(
          title: 'Klausul Anti-Judi Online & Tanpa Fitur Cash-Out (Statuta Federasi)',
          icon: Icons.shield_rounded,
          color: const Color(0xFFF59E0B),
          content:
              'Mata uang virtual IndoBucks / Indigo Billion (IB) dan Indigo Credits (IDG) dalam aplikasi ini murni bernilai virtual di dalam permainan. Mata uang ini TIDAK DAPAT DITARIK (NO WITHDRAWAL), TIDAK DAPAT DIUANGKAN KE RUPIAH ATAU CRYPTO, dan TIDAK MEMILIKI NILAI EKONOMI NYATA. Aplikasi ini beroperasi murni sebagai simulator edukasi pasar modal dan melarang keras segala bentuk perjudian elektronik.',
        ),
        const SizedBox(height: 12),
        _buildInfoCard(
          title: 'Ketiadaan Afiliasi Lembaga Negara Nyata',
          icon: Icons.account_balance_rounded,
          color: const Color(0xFF38BDF8),
          content:
              'Istilah seperti Badan Usaha Milik Federasi (BUMF), Pengadilan Niaga Arbitrase Federasi (PNAF), Bank Sentral Indigo Federasi (BIF), dan bursa IPMC adalah murni karya fiksi kedaulatan simulator. Tidak ada keterikatan resmi dengan Kementerian BUMN RI, Bursa Efek Indonesia (BEI), Otoritas Jasa Keuangan (OJK), atau Bank Indonesia (BI).',
        ),
      ],
    );
  }

  Widget _buildTermsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildInfoCard(
          title: '1. Kewajiban & Keamanan Akun',
          icon: Icons.person_rounded,
          color: const Color(0xFF38BDF8),
          content:
              'Setiap pemain bertanggung jawab penuh menjaga kerahasiaan kredensial akun konglomeratnya. Sistem mencatat setiap transaksi dalam audit trail yang tidak dapat dihapus sepihak.',
        ),
        const SizedBox(height: 12),
        _buildInfoCard(
          title: '2. Fair Play & Larangan Eksploitasi Memori',
          icon: Icons.security_rounded,
          color: const Color(0xFFF43F5E),
          content:
              'Dilarang menggunakan bot otomatis, memory injection, cheat engine, atau eksploitasi celah jaringan. Setiap konglomerat yang terbukti melanggar akan dikenakan sanksi pembekuan akun permanen (Banned) oleh otoritas sistem.',
        ),
        const SizedBox(height: 12),
        _buildInfoCard(
          title: '3. Keputusan Final Majelis PNAF',
          icon: Icons.gavel_rounded,
          color: const Color(0xFFA855F7),
          content:
              'Dalam hal terjadi sengketa pengalihan saham P2P, wanprestasi akta notariat, atau kredit macet fasilitas likuiditas, ketetapan vonis Hakim Pengadilan Niaga Arbitrase Federasi (PNAF) bersifat mengikat di dalam game.',
        ),
      ],
    );
  }

  Widget _buildPrivacyTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildInfoCard(
          title: '1. Perlindungan Data Akun Pemain',
          icon: Icons.lock_outline_rounded,
          color: const Color(0xFF10B981),
          content:
              'Kami hanya menyimpan data teknis yang dibutuhkan untuk memproses mekanisme game: Username, email autentikasi, hash kata sandi terenkripsi (BCrypt), dan riwayat mutasi kas simulasi.',
        ),
        const SizedBox(height: 12),
        _buildInfoCard(
          title: '2. Bebas Data Finansial Pribadi Sensitif',
          icon: Icons.credit_card_off_rounded,
          color: const Color(0xFF38BDF8),
          content:
              'Game ini tidak pernah meminta, mengakses, atau menyimpan nomor rekening bank asli, kartu debit/kredit, atau nomor identitas kependudukan (KTP/NIK) Anda.',
        ),
        const SizedBox(height: 12),
        _buildInfoCard(
          title: '3. Hak Penghapusan Data',
          icon: Icons.delete_sweep_rounded,
          color: const Color(0xFFF59E0B),
          content:
              'Pemain memiliki hak untuk meminta pembersihan seluruh data portofolio dan penutupan akun permainan melalui panitera pengawas sistem.',
        ),
      ],
    );
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    required Color color,
    required String content,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1322),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
