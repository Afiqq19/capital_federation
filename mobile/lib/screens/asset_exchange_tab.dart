import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/company.dart';
import '../providers/game_provider.dart';
import '../services/api_service.dart';
import '../features/court_commercial/screens/court_commercial_screen.dart';
import '../features/corporate_deals/screens/corporate_deals_screen.dart';

class AssetExchangeTab extends StatefulWidget {
  const AssetExchangeTab({super.key});

  @override
  State<AssetExchangeTab> createState() => _AssetExchangeTabState();
}

class _AssetExchangeTabState extends State<AssetExchangeTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<CompanyModel> _crisisCompanies = [];
  List<dynamic> _auctions = [];
  List<dynamic> _incomingProposals = [];
  List<dynamic> _outgoingProposals = [];
  final Set<String> _processingProposalIds = {};
  final Set<String> _processingAuctionIds = {};
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedSector = 'Semua';

  final List<String> _sectors = [
    'Semua',
    'Keuangan',
    'Teknologi',
    'Energi',
    'F&B',
    'Properti',
    'Manufaktur',
    'Kesehatan',
    'Transportasi',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    final userId = context.read<GameProvider>().user?.id ?? '';

    final results = await Future.wait([
      ApiService.getTakeoverTargets(),
      ApiService.getAuctions(),
      if (userId.isNotEmpty)
        ApiService.getTakeoverProposals(userId)
      else
        Future.value(<String, dynamic>{'incoming': [], 'outgoing': []}),
    ]);

    if (!mounted) return;
    final proposalsMap = results[2] as Map<String, dynamic>;
    setState(() {
      _crisisCompanies = results[0] as List<CompanyModel>;
      _auctions = results[1] as List<dynamic>;
      _incomingProposals = List<dynamic>.from(proposalsMap['incoming'] ?? []);
      _outgoingProposals = List<dynamic>.from(proposalsMap['outgoing'] ?? []);
      _isLoading = false;
    });
  }

  List<CompanyModel> get _filteredTargets {
    return _crisisCompanies.where((c) {
      final matchesSector = _selectedSector == 'Semua' ||
          c.sector.toLowerCase().contains(_selectedSector.toLowerCase());
      final q = _searchQuery.trim().toLowerCase();
      final matchesQuery = q.isEmpty ||
          c.name.toLowerCase().contains(q) ||
          c.symbol.toLowerCase().contains(q) ||
          (c.ownerUsername ?? '').toLowerCase().contains(q);
      return matchesSector && matchesQuery;
    }).toList();
  }

  void _showTakeoverSheet(CompanyModel company) {
    int percentage = 51;
    String offerTier = 'RESCUE_30'; // 'RESCUE_30' | 'MARKET_FAIR' | 'PREMIUM_15'
    String paymentSource = 'PERSONAL'; // 'PERSONAL' | 'COMPANY'
    bool isSubmitting = false;
    final pitchCtrl = TextEditingController(
      text: 'Proposal akuisisi saham pengendali & injeksi modal restrukturisasi perseroan ${company.name}.',
    );

    final totalValuation = company.totalShares * company.currentPrice;
    final currencyFormatter = NumberFormat('#,###', 'id_ID');
    final user = context.read<GameProvider>().user;
    final sellerName = (company.ownerUsername != null && company.ownerUsername!.isNotEmpty)
        ? company.ownerUsername!
        : 'galih';
    final buyerName = user?.username ?? 'Anda';
    final personalBal = user?.balanceIb ?? 0.0;
    final companyBal = user?.companyBalanceIb ?? 0.0;

    if (personalBal < (totalValuation * 0.51 * 0.70) && companyBal >= (totalValuation * 0.51 * 0.70)) {
      paymentSource = 'COMPANY';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) {
          double discountFactor = 0.70;
          String tierLabel = 'Penyelamatan Krisis (-30%)';
          String approvalChanceText = 'Tinggi (Disetujui RUPS Darurat)';
          Color tierColor = const Color(0xFF10B981);

          if (offerTier == 'MARKET_FAIR') {
            discountFactor = 1.00;
            tierLabel = 'Harga Pasar Wajar (0%)';
            approvalChanceText = 'Sangat Tinggi (98% Disetujui Pendiri)';
            tierColor = const Color(0xFF38BDF8);
          } else if (offerTier == 'PREMIUM_15') {
            discountFactor = 1.15;
            tierLabel = 'Premi Akuisisi Sultan (+15%)';
            approvalChanceText = 'Prioritas Utama (100% Instan RUPS)';
            tierColor = const Color(0xFFF59E0B);
          }

          final offerPricePerShare = (company.currentPrice * discountFactor).round();
          final rawAcquisitionPrice = (totalValuation * (percentage / 100.0) * discountFactor).round();
          const meteraiFee = 10000;
          const notaryAdminFee = 40000;
          final totalDeduction = rawAcquisitionPrice + meteraiFee + notaryAdminFee;

          final selectedBalance = paymentSource == 'COMPANY' ? companyBal : personalBal;
          final canAfford = selectedBalance >= totalDeduction;
          final lotsTransferred = (company.totalShares * (percentage / 100.0) / 100).round();

          return Container(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.90),
            padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(context).viewInsets.bottom + 24),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              border: Border(top: BorderSide(color: Color(0xFFF59E0B), width: 1.5)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Header Formulir Resmi
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFFF59E0B).withValues(alpha: 0.25),
                              const Color(0xFFD97706).withValues(alpha: 0.10),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF59E0B)),
                        ),
                        child: const Icon(Icons.handshake_rounded, color: Color(0xFFF59E0B), size: 22),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'PROPOSAL AKUISISI & PERSETUJUAN PENDIRI',
                              style: TextStyle(color: Color(0xFFF59E0B), fontSize: 13, fontWeight: FontWeight.w900),
                            ),
                            Text(
                              'Sidang RUPS Luar Biasa Pemegang Saham Terbesar & Notariat',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Kotak Pendiri / Pemegang Saham Terbesar -> Pembeli
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'PENDIRI / PEMEGANG SAHAM TERBESAR',
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 3),
                              Row(
                                children: [
                                  const Icon(Icons.verified_user_rounded, color: Color(0xFFF59E0B), size: 14),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      '@$sellerName (60% Saham)',
                                      style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.w900),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Icon(Icons.trending_flat_rounded, color: Color(0xFF38BDF8), size: 20),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'CALON PENGENDALI BARU',
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '@$buyerName ($percentage%)',
                                style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.w900),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Target Emiten Info Card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${company.name} (${company.symbol})',
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                'Sektor: ${company.sector} • Harga Pasar: IB ${currencyFormatter.format(company.currentPrice)}/lbr',
                                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: tierColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: tierColor),
                          ),
                          child: Text(
                            offerTier == 'RESCUE_30'
                                ? 'DISKON 30%'
                                : (offerTier == 'MARKET_FAIR' ? 'HARGA PASAR' : 'PREMI +15%'),
                            style: TextStyle(color: tierColor, fontSize: 10, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Pilihan Skema Penawaran Harga ke Pendiri
                  const Text(
                    '1. Skema Penawaran Harga kepada Pendiri',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTierOption(
                          title: 'Penyelamatan',
                          sub: 'Diskon -30%',
                          selected: offerTier == 'RESCUE_30',
                          color: const Color(0xFF10B981),
                          onTap: () => setSheetState(() => offerTier = 'RESCUE_30'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildTierOption(
                          title: 'Harga Wajar',
                          sub: 'Sesuai Pasar',
                          selected: offerTier == 'MARKET_FAIR',
                          color: const Color(0xFF38BDF8),
                          onTap: () => setSheetState(() => offerTier = 'MARKET_FAIR'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildTierOption(
                          title: 'Premi Sultan',
                          sub: 'Premium +15%',
                          selected: offerTier == 'PREMIUM_15',
                          color: const Color(0xFFF59E0B),
                          onTap: () => setSheetState(() => offerTier = 'PREMIUM_15'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Slider & Preset Porsi Hak Suara
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '2. Porsi Saham Diakuisisi',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '$percentage% (${currencyFormatter.format(lotsTransferred)} Lot)',
                        style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 13, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTierOption(
                          title: '51% Kendali',
                          sub: 'Mayoritas RUPS',
                          selected: percentage == 51,
                          color: const Color(0xFF38BDF8),
                          onTap: () => setSheetState(() => percentage = 51),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildTierOption(
                          title: '75% Kuorum',
                          sub: 'Hak Veto Penuh',
                          selected: percentage == 75,
                          color: const Color(0xFFF59E0B),
                          onTap: () => setSheetState(() => percentage = 75),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildTierOption(
                          title: '100% Penuh',
                          sub: 'Go-Private / Delist',
                          selected: percentage == 100,
                          color: const Color(0xFF10B981),
                          onTap: () => setSheetState(() => percentage = 100),
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    min: 51,
                    max: 100,
                    divisions: 49,
                    value: percentage.toDouble(),
                    activeColor: const Color(0xFF38BDF8),
                    inactiveColor: const Color(0xFF1E293B),
                    onChanged: (val) => setSheetState(() => percentage = val.round()),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Text(
                      percentage == 100
                          ? '🏛️ Status 100%: Seluruh saham Pendiri dan Publik/Ritel diborong. Emiten beralih menjadi 100% PT Tertutup Swasta.'
                          : '⚖️ Status $percentage%: Anda memegang kendali mayoritas perseroan, menempatkan direksi, dan menyerap kas dividen holding.',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, height: 1.3),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Pilihan Sumber Dana (Kas Pribadi vs Kas PT)
                  const Text(
                    '3. Pilih Rekening Pembayaran Akuisisi',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setSheetState(() => paymentSource = 'PERSONAL'),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: paymentSource == 'PERSONAL'
                                  ? const Color(0xFF38BDF8).withValues(alpha: 0.15)
                                  : const Color(0xFF070B14),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: paymentSource == 'PERSONAL' ? const Color(0xFF38BDF8) : const Color(0xFF1E293B),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Kas Pribadi', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 2),
                                Text(
                                  'IB ${currencyFormatter.format(personalBal.round())}',
                                  style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w900),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: InkWell(
                          onTap: () => setSheetState(() => paymentSource = 'COMPANY'),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: paymentSource == 'COMPANY'
                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.15)
                                  : const Color(0xFF070B14),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: paymentSource == 'COMPANY' ? const Color(0xFFF59E0B) : const Color(0xFF1E293B),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Kas Holding PT', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 2),
                                Text(
                                  'IB ${currencyFormatter.format(companyBal.round())}',
                                  style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w900),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Rincian Keuangan & Status Persetujuan Pendiri
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Skema Penawaran:', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            Text(tierLabel, style: TextStyle(color: tierColor, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Harga Akuisisi per Lembar:', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            Text('IB ${currencyFormatter.format(offerPricePerShare)} / lbr', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Respons RUPS Pendiri:', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            Text(approvalChanceText, style: const TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('⚖️ Bea Meterai & Notariat Digital:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                            Text('IB 50.000 (Kas Negara)', style: TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(color: Color(0xFF1E293B), height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TOTAL NILAI AKUISISI:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                            Text('IB ${currencyFormatter.format(totalDeduction)}', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w900, fontSize: 15)),
                          ],
                        ),
                      ],
                    ),
                  ),

                  if (!canAfford) ...[
                    const SizedBox(height: 8),
                    Text(
                      '⚠️ Saldo ${paymentSource == 'COMPANY' ? 'Kas PT' : 'Kas Pribadi'} Anda belum mencukupi untuk nilai akuisisi ini.',
                      style: const TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: (!canAfford || isSubmitting)
                          ? null
                          : () async {
                              setSheetState(() => isSubmitting = true);
                              HapticFeedback.mediumImpact();
                              final provider = context.read<GameProvider>();
                              final res = await provider.takeoverCompany(
                                companyId: company.id,
                                percentage: percentage,
                                offerTier: offerTier,
                                paymentSource: paymentSource,
                                pitchNotes: pitchCtrl.text,
                              );
                              if (!context.mounted) return;
                              Navigator.pop(ctx);

                              if (res['success'] == true) {
                                if (res['pendingFounderApproval'] == true) {
                                  ScaffoldMessenger.of(context).clearSnackBars();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(res['message'] ?? 'Proposal dikirim ke Pendiri untuk disetujui!'),
                                      backgroundColor: const Color(0xFF0284C7),
                                      behavior: SnackBarBehavior.floating,
                                      duration: const Duration(seconds: 2),
                                    ),
                                  );
                                  _tabController.animateTo(1);
                                } else {
                                  _showTakeoverSuccessDialog(context, res['deed'], res['founderApproval'], company);
                                }
                                _loadData();
                              } else {
                                ScaffoldMessenger.of(context).clearSnackBars();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(res['error'] ?? 'Gagal memproses proposal akuisisi'),
                                    backgroundColor: Colors.red,
                                    behavior: SnackBarBehavior.floating,
                                    duration: const Duration(seconds: 2),
                                  ),
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: canAfford ? const Color(0xFFF59E0B) : const Color(0xFF334155),
                        foregroundColor: const Color(0xFF451A03),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: isSubmitting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                          : const Icon(Icons.verified_rounded, size: 18),
                      label: Text(
                        isSubmitting ? 'MEMPROSES KONTRAK NOTARIAT...' : 'AJUKAN PERSETUJUAN PENDIRI & AKUISISI',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTierOption({
    required String title,
    required String sub,
    required bool selected,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 8),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.16) : const Color(0xFF070B14),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selected ? color : const Color(0xFF1E293B), width: selected ? 1.5 : 1),
        ),
        child: Column(
          children: [
            Text(
              title,
              style: TextStyle(
                color: selected ? Colors.white : const Color(0xFF94A3B8),
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              sub,
              style: TextStyle(color: color, fontSize: 9.5, fontWeight: FontWeight.w900),
            ),
          ],
        ),
      ),
    );
  }

  void _showTakeoverSuccessDialog(
    BuildContext context,
    Map<String, dynamic>? deed,
    Map<String, dynamic>? founderApproval,
    CompanyModel company,
  ) {
    if (deed == null) return;
    final currencyFormatter = NumberFormat('#,###', 'id_ID');
    final founderName = founderApproval?['founder_username'] ?? deed['seller_name'] ?? 'Pendiri';
    final founderStatement = founderApproval?['statement'] ??
        'Selaku Pendiri & Pemegang Saham Terbesar, saya menyetujui pengalihan saham pengendali ini dalam RUPS Luar Biasa.';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                blurRadius: 24,
                spreadRadius: 2,
              ),
            ],
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    border: Border.all(color: const Color(0xFF10B981), width: 2),
                  ),
                  child: const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 32),
                ),
                const SizedBox(height: 12),
                const Text(
                  'DISETUJUI PENDIRI & DISAHKAN NOTARIS',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.w900, letterSpacing: 0.8),
                ),
                const SizedBox(height: 4),
                Text(
                  '${deed['company_name']}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),

                // Kotak Surat Persetujuan Pendiri / Pemegang Saham Terbesar
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.draw_rounded, color: Color(0xFFFBBF24), size: 15),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'SURAT PERSETUJUAN PENDIRI (@$founderName)',
                              style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 10.5, fontWeight: FontWeight.w900),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '"$founderStatement"',
                        style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 10.5, fontStyle: FontStyle.italic, height: 1.35),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Column(
                    children: [
                      _buildDeedDetailRow('Nomor Akta M&A', '${deed['deed_number']}', const Color(0xFF38BDF8)),
                      const Divider(color: Color(0xFF1E293B), height: 12),
                      _buildDeedDetailRow('Pendiri Lama', '@${deed['seller_name']}', const Color(0xFFF87171)),
                      const SizedBox(height: 4),
                      _buildDeedDetailRow('Pengendali Baru', '@${deed['buyer_name']} (Anda)', const Color(0xFF34D399)),
                      const Divider(color: Color(0xFF1E293B), height: 12),
                      _buildDeedDetailRow('Hak Suara Diakuisisi', '${deed['percentage_transferred']}% Saham', const Color(0xFFFBBF24)),
                      const SizedBox(height: 4),
                      _buildDeedDetailRow('Volume Lot', '${currencyFormatter.format(deed['lots_transferred'] ?? 0)} Lot', Colors.white),
                      const SizedBox(height: 4),
                      _buildDeedDetailRow('Nilai Akuisisi', 'IB ${currencyFormatter.format(deed['raw_price_ib'] ?? 0)}', const Color(0xFF38BDF8)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF38BDF8)),
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.folder_shared_rounded, color: Color(0xFF38BDF8), size: 14),
                        label: const Text('Brankas Akta', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          Navigator.pop(dialogCtx);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const CorporateDealsScreen(initialIndex: 2),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 14),
                        label: const Text('Selesai', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                        onPressed: () => Navigator.pop(dialogCtx),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleProposalDecision(Map<String, dynamic> prop, String decision) async {
    final gp = context.read<GameProvider>();
    final userId = gp.user?.id ?? '';
    final propId = prop['id'].toString();
    if (userId.isEmpty || _processingProposalIds.contains(propId)) return;

    setState(() => _processingProposalIds.add(propId));
    HapticFeedback.lightImpact();

    try {
      final res = await ApiService.respondTakeoverProposal(
        proposalId: propId,
        userId: userId,
        decision: decision,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).clearSnackBars();
      if (res['success'] == true) {
        await gp.refreshPortfolio();
        await gp.loadInitialData();
        await _loadData();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Keputusan RUPS Pendiri berhasil disimpan!'),
            backgroundColor: decision == 'APPROVE' ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? 'Gagal memproses keputusan'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _processingProposalIds.remove(propId));
      }
    }
  }

  Future<void> _handleAuctionAction(Map<String, dynamic> auction, String action) async {
    final gp = context.read<GameProvider>();
    final userId = gp.user?.id ?? '';
    final auctionId = auction['id'].toString();
    if (userId.isEmpty || _processingAuctionIds.contains(auctionId)) return;

    setState(() => _processingAuctionIds.add(auctionId));
    HapticFeedback.lightImpact();

    try {
      final res = await ApiService.bidAuction(
        userId: userId,
        auctionId: auctionId,
        action: action,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).clearSnackBars();
      if (res['success'] == true) {
        await gp.refreshPortfolio();
        await gp.loadInitialData();
        await _loadData();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Lelang berhasil diproses!'),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? 'Gagal memproses lelang'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _processingAuctionIds.remove(auctionId));
      }
    }
  }

  Widget _buildDeedDetailRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(color: valueColor, fontSize: 11, fontWeight: FontWeight.bold),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat('#,###', 'id_ID');
    final pendingIncomingCount = _incomingProposals.where((p) => p['status'] == 'PENDING_FOUNDER').length;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: Column(
          children: [
            // Top Header
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'BURSA ASET, M&A & LELANG BCF',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16.5,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.6,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Akuisisi perusahaan dengan persetujuan Pendiri atau tebus sitaan BCF.',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            onPressed: _loadData,
                            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF38BDF8), size: 20),
                            tooltip: 'Segarkan',
                          ),
                          InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const CourtCommercialScreen()),
                              );
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFF5B942)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 13),
                                  SizedBox(width: 4),
                                  Text(
                                    'PNAF',
                                    style: TextStyle(color: Color(0xFFF5B942), fontSize: 10.5, fontWeight: FontWeight.w900),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // 3 Modern Tabs
                  Container(
                    height: 40,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      indicator: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1E293B), Color(0xFF334155)],
                        ),
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                      ),
                      labelColor: Colors.white,
                      unselectedLabelColor: const Color(0xFF64748B),
                      labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
                      tabs: [
                        Tab(text: 'PASAR AKUISISI (${_crisisCompanies.length})'),
                        Tab(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Flexible(child: Text('RUPS PENDIRI', overflow: TextOverflow.ellipsis)),
                              if (pendingIncomingCount > 0) ...[
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '$pendingIncomingCount',
                                    style: const TextStyle(color: Color(0xFF020617), fontSize: 9, fontWeight: FontWeight.w900),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Tab(text: 'LELANG SITAAN (${_auctions.length})'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        // ====================================================
                        // TAB 1: PASAR AKUISISI (M&A)
                        // ====================================================
                        _buildAcquisitionMarketTab(currencyFormatter),

                        // ====================================================
                        // TAB 2: PERSETUJUAN PENDIRI / PEMEGANG SAHAM TERBESAR
                        // ====================================================
                        _buildFounderApprovalTab(currencyFormatter),

                        // ====================================================
                        // TAB 3: LELANG BANK SITAAN (BCF)
                        // ====================================================
                        _buildBankAuctionsTab(currencyFormatter),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAcquisitionMarketTab(NumberFormat currencyFormatter) {
    final targets = _filteredTargets;
    return Column(
      children: [
        // Search & Sector Filter
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Column(
            children: [
              TextField(
                onChanged: (v) => setState(() => _searchQuery = v),
                style: const TextStyle(color: Colors.white, fontSize: 12),
                decoration: InputDecoration(
                  hintText: 'Cari kode saham 4-huruf, nama PT Tbk, atau nama Pendiri...',
                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11.5),
                  prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 18),
                  filled: true,
                  fillColor: const Color(0xFF0F172A),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF1E293B)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF1E293B)),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 30,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _sectors.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (context, idx) {
                    final sec = _sectors[idx];
                    final selected = _selectedSector == sec;
                    return InkWell(
                      onTap: () => setState(() => _selectedSector = sec),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: selected ? const Color(0xFFF59E0B) : const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: selected ? const Color(0xFFF59E0B) : const Color(0xFF1E293B),
                          ),
                        ),
                        child: Text(
                          sec,
                          style: TextStyle(
                            color: selected ? const Color(0xFF020617) : const Color(0xFF94A3B8),
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),

        Expanded(
          child: targets.isEmpty
              ? const Center(
                  child: Text('Tidak ada emiten target yang cocok.', style: TextStyle(color: Color(0xFF64748B))),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(18, 4, 18, 80),
                  itemCount: targets.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final c = targets[index];
                    final rescuePrice = (c.currentPrice * 0.70).round();
                    final controlCost51 = (c.totalShares * 0.51 * c.currentPrice * 0.70).round();
                    final founderName = (c.ownerUsername != null && c.ownerUsername!.isNotEmpty)
                        ? c.ownerUsername!
                        : 'galih';

                    return Container(
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0F172A), Color(0xFF181122)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.35)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                                    ),
                                    child: Text(
                                      c.symbol,
                                      style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12.5, fontWeight: FontWeight.w900),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(5),
                                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                                    ),
                                    child: const Text(
                                      '🏷️ DISKON 30%',
                                      style: TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.w900),
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF38BDF8).withValues(alpha: 0.14),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.35)),
                                ),
                                child: const Text(
                                  'RUPS PENDIRI',
                                  style: TextStyle(color: Color(0xFF38BDF8), fontSize: 9, fontWeight: FontWeight.w900),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            c.name,
                            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),

                          // Info Pendiri / Pemegang Saham Terbesar
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF070B14),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF1E293B)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.person_pin_rounded, color: Color(0xFFF59E0B), size: 15),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Pendiri & Pemegang Saham Terbesar: @$founderName (60%)',
                                    style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                ),
                                Text(
                                  c.sector,
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Harga Akuisisi (-30%):', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                  Row(
                                    children: [
                                      Text(
                                        'IB ${currencyFormatter.format(rescuePrice)}/lbr',
                                        style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.w900),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'IB ${currencyFormatter.format(c.currentPrice)}',
                                        style: const TextStyle(
                                          color: Color(0xFF64748B),
                                          fontSize: 10.5,
                                          decoration: TextDecoration.lineThrough,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Text(
                                    'Estimasi 51% Kontrol: IB ${currencyFormatter.format(controlCost51)}',
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                  ),
                                ],
                              ),
                              InkWell(
                                onTap: () => _showTakeoverSheet(c),
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                                    ),
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.handshake_rounded, color: Color(0xFF451A03), size: 15),
                                      SizedBox(width: 5),
                                      Text(
                                        'AJUKAN KE PENDIRI',
                                        style: TextStyle(
                                          color: Color(0xFF451A03),
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildFounderApprovalTab(NumberFormat currencyFormatter) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 80),
      children: [
        // Bagian 1: Proposal Akuisisi Masuk ke PT Anda (Menunggu Persetujuan Anda Selaku Pendiri)
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.gavel_rounded, color: Color(0xFFF59E0B), size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'TAWARAN AKUISISI MASUK (HAK VETO PENDIRI)',
                      style: TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Selaku Pendiri & Pemegang Saham Terbesar, tidak ada pihak yang dapat mengakuisisi PT Anda tanpa tanda tangan persetujuan Anda di sini.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
              ),
              const SizedBox(height: 12),

              if (_incomingProposals.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: Text(
                      'Belum ada tawaran akuisisi masuk terhadap PT Anda.',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                  ),
                )
              else
                ..._incomingProposals.map((p) {
                  final isPending = p['status'] == 'PENDING_FOUNDER';
                  final statusColor = isPending
                      ? const Color(0xFFF59E0B)
                      : (p['status'] == 'APPROVED' ? const Color(0xFF10B981) : const Color(0xFFEF4444));
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${p['company_name']} (${p['company_symbol']})',
                              style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                isPending ? 'MENUNGGU PERSETUJUAN ANDA' : p['status'].toString(),
                                style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w900),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Penawar Akuisisi: @${p['buyer_username']} • Meminta ${p['percentage_requested']}% Saham (${currencyFormatter.format(p['lots_transferred'] ?? 0)} Lot)',
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Nilai Dana Masuk ke Kas Anda: IB ${currencyFormatter.format((p['raw_acquisition_ib'] ?? 0).round())}',
                          style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.w900),
                        ),
                        if (p['pitch_notes'] != null && p['pitch_notes'].toString().isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            '"${p['pitch_notes']}"',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontStyle: FontStyle.italic),
                          ),
                        ],
                        if (isPending) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _processingProposalIds.contains(p['id'].toString())
                                      ? null
                                      : () => _handleProposalDecision(Map<String, dynamic>.from(p), 'REJECT'),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFEF4444)),
                                    foregroundColor: const Color(0xFFF87171),
                                  ),
                                  icon: const Icon(Icons.close_rounded, size: 15),
                                  label: const Text('TOLAK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                flex: 2,
                                child: ElevatedButton.icon(
                                  onPressed: _processingProposalIds.contains(p['id'].toString())
                                      ? null
                                      : () => _handleProposalDecision(Map<String, dynamic>.from(p), 'APPROVE'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    foregroundColor: const Color(0xFF022C22),
                                  ),
                                  icon: _processingProposalIds.contains(p['id'].toString())
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                      : const Icon(Icons.check_circle_rounded, size: 15),
                                  label: Text(
                                    _processingProposalIds.contains(p['id'].toString()) ? 'MEMPROSES...' : 'SETUJUI & TERIMA DANA',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Bagian 2: Riwayat Proposal Akuisisi yang Anda Ajukan ke Pendiri Lain
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.history_edu_rounded, color: Color(0xFF38BDF8), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'RIWAYAT PROPOSAL AKUISISI ANDA',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (_outgoingProposals.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: Text(
                      'Anda belum mengajukan proposal akuisisi emiten.',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                  ),
                )
              else
                ..._outgoingProposals.map((p) {
                  final status = p['status']?.toString() ?? 'APPROVED';
                  final statusColor = status == 'APPROVED'
                      ? const Color(0xFF10B981)
                      : (status == 'PENDING_FOUNDER' ? const Color(0xFFF59E0B) : const Color(0xFFEF4444));
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${p['company_name']} (${p['company_symbol']})',
                                style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                status == 'APPROVED'
                                    ? 'DISETUJUI PENDIRI'
                                    : (status == 'PENDING_FOUNDER' ? 'MENUNGGU PENDIRI' : 'DITOLAK'),
                                style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w900),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Pendiri: @${p['founder_username']} • Porsi: ${p['percentage_requested']}% • Nilai: IB ${currencyFormatter.format((p['raw_acquisition_ib'] ?? 0).round())}',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                        if (p['founder_response_note'] != null) ...[
                          const SizedBox(height: 5),
                          Text(
                            'Keputusan RUPS: "${p['founder_response_note']}"',
                            style: const TextStyle(color: Color(0xFF34D399), fontSize: 10.5, fontStyle: FontStyle.italic),
                          ),
                        ],
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBankAuctionsTab(NumberFormat currencyFormatter) {
    if (_auctions.isEmpty) {
      return const Center(
        child: Text(
          'Belum ada paket lelang sitaan Bank Sentral saat ini.',
          style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 80),
      itemCount: _auctions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final a = Map<String, dynamic>.from(_auctions[index]);
        final pctStake = a['percentage_stake'] ?? 35;
        final lotsOffered = a['lots_offered'] ?? 35000;
        final currentBid = (a['current_bid_ib'] ?? 0).round();
        final buyoutPrice = (a['buyout_price_ib'] ?? currentBid).round();
        final marketVal = (a['market_valuation_ib'] ?? buyoutPrice).round();
        final discountPct = a['discount_pct'] ?? 30;
        final isControl = pctStake >= 50;

        return Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF0D1F2D)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.35)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                        ),
                        child: Text(
                          '${a['company_symbol'] ?? 'CFX'}',
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12.5, fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          'HEMAT $discountPct%',
                          style: const TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isControl
                          ? const Color(0xFFF59E0B).withValues(alpha: 0.18)
                          : const Color(0xFF64748B).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      isControl ? '👑 PAKET PENGENDALI ($pctStake%)' : 'PAKET BLOK ($pctStake%)',
                      style: TextStyle(
                        color: isControl ? const Color(0xFFFBBF24) : const Color(0xFFCBD5E1),
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${a['company_name'] ?? 'Emiten Sitaan BCF'}',
                style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 3),
              Text(
                '⚖️ ${a['collateral_reason'] ?? 'Eksekusi Agunan Kredit Macet Bank Sentral BCF'}',
                style: const TextStyle(color: Color(0xFFF87171), fontSize: 10.5, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),

              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF070B14),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Volume Saham Dilelang:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5)),
                        Text(
                          '${currencyFormatter.format(lotsOffered)} Lot ($pctStake% Saham)',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Valuasi Pasar Normal:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5)),
                        Text(
                          'IB ${currencyFormatter.format(marketVal)}',
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 10.5,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Penawar Tertinggi (@${a['highest_bidder_name'] ?? 'BCF'}):',
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
                        ),
                        Text(
                          'IB ${currencyFormatter.format(currentBid)}',
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Harga Tebus Instan (Menang Langsung):', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, fontWeight: FontWeight.bold)),
                        Text(
                          'IB ${currencyFormatter.format(buyoutPrice)}',
                          style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _processingAuctionIds.contains(a['id'].toString())
                          ? null
                          : () => _handleAuctionAction(a, 'BID'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF38BDF8)),
                        foregroundColor: const Color(0xFF38BDF8),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.trending_up_rounded, size: 15),
                      label: const Text(
                        'TAWAR (+5%)',
                        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _processingAuctionIds.contains(a['id'].toString())
                          ? null
                          : () => _handleAuctionAction(a, 'BUYOUT'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: const Color(0xFF022C22),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: _processingAuctionIds.contains(a['id'].toString())
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                          : const Icon(Icons.gavel_rounded, size: 15),
                      label: Text(
                        _processingAuctionIds.contains(a['id'].toString()) ? 'MEMPROSES LELANG...' : 'TEBUS INSTAN & MENANGKAN',
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
