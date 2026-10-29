import 'package:flutter/material.dart';
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
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final targets = await ApiService.getTakeoverTargets();
    final auctions = await ApiService.getAuctions();
    if (mounted) {
      setState(() {
        _crisisCompanies = targets;
        _auctions = auctions;
        _isLoading = false;
      });
    }
  }

  void _showTakeoverSheet(CompanyModel company) {
    int percentage = 51;
    final totalValuation = company.totalShares * company.currentPrice;
    final currencyFormatter = NumberFormat('#,###', 'id_ID');
    final user = context.read<GameProvider>().user;
    final sellerName = (company.ownerUsername != null && company.ownerUsername!.isNotEmpty)
        ? company.ownerUsername!
        : 'Konsorsium Kurator Niaga Federasi';
    final buyerName = user?.username ?? 'Anda';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) {
          final rawAcquisitionPrice = (totalValuation * (percentage / 100.0) * 0.70).round();
          const meteraiFee = 10000;
          const notaryAdminFee = 40000;
          final totalDeduction = rawAcquisitionPrice + meteraiFee + notaryAdminFee;
          final userBalance = user?.balanceIb ?? 0.0;
          final canAfford = userBalance >= totalDeduction;
          final lotsTransferred = (company.totalShares * (percentage / 100.0) / 100).round();
          bool isSubmitting = false;

          return Container(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
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
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFF59E0B)),
                        ),
                        child: const Icon(Icons.gavel_rounded, color: Color(0xFFF59E0B), size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'FORMULIR AKUISISI KONTROL (M&A)',
                              style: TextStyle(color: Color(0xFFF59E0B), fontSize: 13.5, fontWeight: FontWeight.w900),
                            ),
                            Text(
                              'Akta Notariat & Balai Restrukturisasi Niaga Federasi',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Kotak Pihak yang Bertransaksi (Penjual -> Pembeli)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Pihak Penjual (Pemilik Lama):', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                              const SizedBox(height: 2),
                              Text(
                                sellerName,
                                style: const TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Icon(Icons.arrow_forward_rounded, color: Color(0xFFF59E0B), size: 18),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Pihak Pembeli (Pengakuisisi):', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                              const SizedBox(height: 2),
                              Text(
                                buyerName,
                                style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

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
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${company.name} (${company.symbol})',
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Sektor: ${company.sector}  •  Status: KRITIS',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFEF4444)),
                          ),
                          child: const Text('DISCOUNT 30%', style: TextStyle(color: Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.w900)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Slider Porsi Hak Suara
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Porsi Saham Yang Diakuisisi', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      Text(
                        '$percentage% (Pengendali Baru)',
                        style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 14, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Volume yang dikuasai:', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                      Text(
                        '${currencyFormatter.format(lotsTransferred)} Lot (${currencyFormatter.format(lotsTransferred * 100)} Lembar)',
                        style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold),
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
                    onChanged: (val) {
                      setSheetState(() => percentage = val.round());
                    },
                  ),

                  // Rincian Keuangan & Biaya Akta Notariat
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
                            const Text('Valuasi Normal Emiten:', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            Text('IB ${currencyFormatter.format(totalValuation.round())}', style: const TextStyle(color: Colors.white, fontSize: 11)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Harga Saham Diselamatkan:', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                            Text('IB ${currencyFormatter.format((company.currentPrice * 0.70).round())} / lbr (-30%)', style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Nilai Saham Diakuisisi:', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11)),
                            Text('IB ${currencyFormatter.format(rawAcquisitionPrice)}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('⚖️ Bea Meterai & Notariat Digital:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                            Text('IB 50.000 (Lunas Kas Negara)', style: TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(color: Color(0xFF1E293B), height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TOTAL PEMBAYARAN KAS:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                            Text('IB ${currencyFormatter.format(totalDeduction)}', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w900, fontSize: 15)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Status Saldo Pembeli
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Saldo Kas Pribadi Anda:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text(
                        'IB ${currencyFormatter.format(userBalance.round())}',
                        style: TextStyle(
                          color: canAfford ? const Color(0xFF34D399) : const Color(0xFFF87171),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  if (!canAfford) ...[
                    const SizedBox(height: 6),
                    const Text(
                      '⚠️ Saldo kas pribadi Anda tidak mencukupi untuk menandatangani akta akuisisi ini.',
                      style: TextStyle(color: Color(0xFFF87171), fontSize: 10.5),
                    ),
                  ],
                  const SizedBox(height: 14),

                  // Klausul Kesepakatan
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.shield_rounded, color: Color(0xFF38BDF8), size: 14),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Klausul Pasal 1: Pembeli resmi memegang hak suara mayoritas, susunan pemegang saham dirombak menjadi 51% di database bursa, dan salinan akta diterbitkan ke Brankas Akta Notaris.',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Tombol Tandatangani Akta & Eksekusi
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: (!canAfford || isSubmitting)
                          ? null
                          : () async {
                              setSheetState(() => isSubmitting = true);
                              final provider = context.read<GameProvider>();
                              final res = await provider.takeoverCompany(companyId: company.id, percentage: percentage);
                              if (!context.mounted) return;
                              Navigator.pop(ctx);

                              if (res['success'] == true) {
                                _showTakeoverSuccessDialog(context, res['deed'], company);
                                _loadData();
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(res['error'] ?? 'Gagal memproses akta akuisisi'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: canAfford ? const Color(0xFFF59E0B) : const Color(0xFF334155),
                        foregroundColor: const Color(0xFF451A03),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.edit_document, size: 16),
                      label: const Text('TANDATANGANI AKTA & AKUISISI KONTROL', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
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

  void _showTakeoverSuccessDialog(BuildContext context, Map<String, dynamic>? deed, CompanyModel company) {
    if (deed == null) return;
    final currencyFormatter = NumberFormat('#,###', 'id_ID');

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(22),
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  border: Border.all(color: const Color(0xFFF59E0B), width: 2),
                ),
                child: const Icon(Icons.verified_rounded, color: Color(0xFFF59E0B), size: 36),
              ),
              const SizedBox(height: 14),
              const Text(
                'AKTA RESMI DISAHKAN NOTARIS',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFFF59E0B), fontSize: 12.5, fontWeight: FontWeight.w900, letterSpacing: 0.8),
              ),
              const SizedBox(height: 4),
              const Text(
                'Pengalihan Saham Pengendali (M&A) Berhasil',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Text(
                  deed['deed_number'] ?? 'AKTA-MA/2026/04',
                  style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF070B14),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Column(
                  children: [
                    _buildDeedDetailRow('Emiten Target', '${deed['company_name']} (${deed['company_symbol']})', Colors.white),
                    const Divider(color: Color(0xFF1E293B), height: 12),
                    _buildDeedDetailRow('Pihak Penjual', '${deed['seller_name']}', const Color(0xFFF87171)),
                    const SizedBox(height: 4),
                    _buildDeedDetailRow('Pihak Pembeli', '${deed['buyer_name']} (Pengendali Baru)', const Color(0xFF34D399)),
                    const Divider(color: Color(0xFF1E293B), height: 12),
                    _buildDeedDetailRow('Porsi Saham', '${deed['percentage_transferred']}% (Hak Suara)', const Color(0xFFFBBF24)),
                    const SizedBox(height: 4),
                    _buildDeedDetailRow('Volume Saham', '${currencyFormatter.format(deed['shares_transferred'] ?? 0)} lbr (${currencyFormatter.format(deed['lots_transferred'] ?? 0)} Lot)', Colors.white),
                    const SizedBox(height: 4),
                    _buildDeedDetailRow('Nilai Transaksi', 'IB ${currencyFormatter.format(deed['raw_price_ib'] ?? 0)}', const Color(0xFF38BDF8)),
                    const Divider(color: Color(0xFF1E293B), height: 12),
                    _buildDeedDetailRow('Bea Meterai', 'IB 10.000 (LUNAS KAS NEGARA)', const Color(0xFF10B981)),
                  ],
                ),
              ),
              const SizedBox(height: 18),
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
                      label: const Text('Buka Akta', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.bold)),
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
                      icon: const Icon(Icons.domain_rounded, color: Colors.white, size: 14),
                      label: const Text('Buka Beranda', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        Navigator.pop(dialogCtx);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
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

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'BURSA ASET & AKUISISI',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
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
                              Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 14),
                              SizedBox(width: 5),
                              Text(
                                'PNAF Federasi',
                                style: TextStyle(color: Color(0xFFF5B942), fontSize: 10.5, fontWeight: FontWeight.w900),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Akuisisi perusahaan fase krisis atau tawar aset sitaan lelang Bank Sentral Federasi (BCF).',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                  ),
                  const SizedBox(height: 12),

                  // Tabs
                  Container(
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      indicator: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      labelColor: Colors.white,
                      unselectedLabelColor: const Color(0xFF64748B),
                      labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      tabs: const [
                        Tab(text: 'PASAR AKUISISI (KRITIS)'),
                        Tab(text: 'LELANG BANK SITAAN'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Tab Views
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        // TAB 1: Takeover Targets
                        _crisisCompanies.isEmpty
                            ? const Center(
                                child: Text('Tidak ada emiten krisis saat ini.', style: TextStyle(color: Color(0xFF64748B))),
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(20, 10, 20, 80),
                                itemCount: _crisisCompanies.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final c = _crisisCompanies[index];
                                  return Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [Color(0xFF0F172A), Color(0xFF1F121C)],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.35)),
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
                                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                                                    borderRadius: BorderRadius.circular(6),
                                                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                                                  ),
                                                  child: Text(
                                                    c.symbol,
                                                    style: const TextStyle(color: Color(0xFFF87171), fontSize: 13, fontWeight: FontWeight.w900),
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                                    borderRadius: BorderRadius.circular(4),
                                                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                                                  ),
                                                  child: const Text('🏷️ DISKON 30%', style: TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.w900)),
                                                ),
                                              ],
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: const Text('STATUS: KRITIS', style: TextStyle(color: Color(0xFFEF4444), fontSize: 9, fontWeight: FontWeight.w900)),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(c.name, style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Sektor: ${c.sector} • Skor Fundamental: ${c.fundamentalScore.toStringAsFixed(0)}/100',
                                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Text('Harga Penyelamatan:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                                Text(
                                                  'IB ${currencyFormatter.format(c.currentPrice)} / lbr',
                                                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
                                                ),
                                              ],
                                            ),
                                            InkWell(
                                              onTap: () => _showTakeoverSheet(c),
                                              borderRadius: BorderRadius.circular(8),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                                decoration: BoxDecoration(
                                                  gradient: const LinearGradient(
                                                    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                                                  ),
                                                  borderRadius: BorderRadius.circular(8),
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
                                                    Icon(Icons.handshake_rounded, color: Color(0xFF451A03), size: 14),
                                                    SizedBox(width: 5),
                                                    Text(
                                                      'AKUISISI KONTROL',
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

                        // TAB 2: Bank Auction
                        _auctions.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.gavel_rounded, color: const Color(0xFF64748B).withValues(alpha: 0.5), size: 48),
                                    const SizedBox(height: 10),
                                    const Text('Belum ada aset sitaan kredit macet.', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                                    const SizedBox(height: 4),
                                    const Text('Jika ada pemain gagal bayar ke Bank Sentral, asetnya akan dilelang di sini.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF475569), fontSize: 11)),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(20),
                                itemCount: _auctions.length,
                                itemBuilder: (context, index) {
                                  final a = _auctions[index];
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: const Color(0xFF334155)),
                                    ),
                                    child: Text(a['company_name'] ?? 'Aset Sitaan', style: const TextStyle(color: Colors.white)),
                                  );
                                },
                              ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
