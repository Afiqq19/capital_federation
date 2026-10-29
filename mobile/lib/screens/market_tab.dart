import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/company.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';
import '../widgets/trading_modal.dart';
import 'stock_detail_screen.dart';
import '../features/macro_federation/widgets/federation_macro_banner.dart';
import '../features/court_commercial/screens/court_commercial_screen.dart';
import '../features/corporate_deals/screens/corporate_deals_screen.dart';
import '../features/ipo/widgets/eipo_modal_sheet.dart';

class MarketTab extends StatefulWidget {
  const MarketTab({super.key});

  @override
  State<MarketTab> createState() => _MarketTabState();
}

class _MarketTabState extends State<MarketTab> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _activeFilter = 'ALL'; // ALL, GAINERS, LOSERS, DIVIDEND, or sector name

  // Touch scrubbing on IHSG chart
  int? _scrubIndex;

  final List<Map<String, dynamic>> _filterOptions = [
    {'id': 'ALL', 'label': 'Semua', 'icon': Icons.apps_rounded},
    {'id': 'GAINERS', 'label': 'Top Gainers', 'icon': Icons.trending_up_rounded},
    {'id': 'LOSERS', 'label': 'Top Losers', 'icon': Icons.trending_down_rounded},
    {'id': 'DIVIDEND', 'label': 'Dividen Jumbo', 'icon': Icons.diamond_rounded},
    {'id': 'Teknologi', 'label': 'Teknologi', 'icon': Icons.memory_rounded},
    {'id': 'Keuangan', 'label': 'Keuangan', 'icon': Icons.account_balance_rounded},
    {'id': 'Properti', 'label': 'Properti', 'icon': Icons.apartment_rounded},
    {'id': 'F&B', 'label': 'F&B', 'icon': Icons.restaurant_rounded},
    {'id': 'Energi', 'label': 'Energi', 'icon': Icons.bolt_rounded},
    {'id': 'Manufaktur', 'label': 'Manufaktur', 'icon': Icons.precision_manufacturing_rounded},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  IconData _getSectorIcon(String sector) {
    switch (sector.toLowerCase()) {
      case 'teknologi':
        return Icons.memory_rounded;
      case 'keuangan':
        return Icons.account_balance_rounded;
      case 'properti':
        return Icons.apartment_rounded;
      case 'f&b':
        return Icons.restaurant_rounded;
      case 'energi':
        return Icons.bolt_rounded;
      case 'manufaktur':
        return Icons.precision_manufacturing_rounded;
      default:
        return Icons.business_center_rounded;
    }
  }

  Color _getSectorColor(String sector) {
    switch (sector.toLowerCase()) {
      case 'teknologi':
        return const Color(0xFF38BDF8); // Cyan
      case 'keuangan':
        return const Color(0xFF818CF8); // Indigo
      case 'properti':
        return const Color(0xFFF59E0B); // Amber
      case 'f&b':
        return const Color(0xFFFB923C); // Orange
      case 'energi':
        return const Color(0xFFEAB308); // Yellow
      case 'manufaktur':
        return const Color(0xFFA855F7); // Purple
      default:
        return const Color(0xFF94A3B8); // Slate
    }
  }

  List<double> _getSparklineData(CompanyModel c) {
    if (c.history.length >= 2) {
      return c.history.map((p) => p.price).toList();
    }
    final base = c.basePrice > 0 ? c.basePrice : c.currentPrice * 0.95;
    final curr = c.currentPrice;
    final diff = curr - base;
    return [
      base,
      base + (diff * 0.25) + (curr * 0.005),
      base + (diff * 0.55) - (curr * 0.008),
      base + (diff * 0.80) + (curr * 0.006),
      curr,
    ];
  }

  String _formatCompactIb(num val) {
    final absVal = val.abs();
    if (absVal >= 1000000000000) {
      return '${(val / 1000000000000).toStringAsFixed(2).replaceAll('.', ',')} T';
    } else if (absVal >= 1000000000) {
      return '${(val / 1000000000).toStringAsFixed(2).replaceAll('.', ',')} M';
    } else if (absVal >= 1000000) {
      return '${(val / 1000000).toStringAsFixed(2).replaceAll('.', ',')} Jt';
    } else if (absVal >= 1000) {
      return '${(val / 1000).toStringAsFixed(1).replaceAll('.', ',')} Rb';
    }
    return val.toString();
  }

  void _showRunningTradeSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        String filterMode = 'ALL'; // 'ALL' or 'MINE'
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Provider.of<GameProvider>(context, listen: false).fetchRunningTrades();
        });

        return StatefulBuilder(
          builder: (sheetContext, setModalState) {
            return Consumer<GameProvider>(
              builder: (context, provider, _) {
                final myUsername = provider.user?.username ?? '';
                final allTrades = provider.runningTrades;

                bool checkIsMine(Map<String, dynamic> t) {
                  final u = t['username']?.toString().toLowerCase() ?? '';
                  final my = myUsername.toLowerCase();
                  return (my.isNotEmpty && u == my) || (t['isUser'] == true) || (t['isUser'] == 1) || (t['isUser'] == 'true');
                }

                final displayedTrades = filterMode == 'MINE'
                    ? allTrades.where(checkIsMine).toList()
                    : allTrades;

                return DraggableScrollableSheet(
                  initialChildSize: 0.75,
                  minChildSize: 0.45,
                  maxChildSize: 0.95,
                  expand: false,
                  builder: (_, scrollController) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(
                            child: Container(
                              width: 40,
                              height: 4,
                              decoration: BoxDecoration(
                                color: const Color(0xFF334155),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.bolt_rounded, color: Color(0xFF38BDF8), size: 22),
                                  SizedBox(width: 8),
                                  Text(
                                    'RUNNING TRADE (LIVE)',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.circle, color: Color(0xFF10B981), size: 6),
                                    SizedBox(width: 5),
                                    Text('STREAMING REAL-TIME', style: TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Arus eksekusi transaksi beli & jual bursa Capital Federation real-time. Transaksi Anda otomatis tertera.',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          ),
                          const SizedBox(height: 10),

                          // Filter Tabs
                          Row(
                            children: [
                              _buildTradeFilterTab(
                                'Semua Transaksi (${allTrades.length})',
                                filterMode == 'ALL',
                                () => setModalState(() => filterMode = 'ALL'),
                              ),
                              const SizedBox(width: 8),
                              _buildTradeFilterTab(
                                'Transaksi Saya (${allTrades.where(checkIsMine).length})',
                                filterMode == 'MINE',
                                () => setModalState(() => filterMode = 'MINE'),
                                isHighlighted: true,
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),

                          // Table Header
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              children: [
                                SizedBox(width: 55, child: Text('WAKTU', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold))),
                                SizedBox(width: 60, child: Text('KODE', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold))),
                                Expanded(child: Text('HARGA (IB)', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold))),
                                SizedBox(width: 75, child: Text('VOLUME', textAlign: TextAlign.right, style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold))),
                                SizedBox(width: 48, child: Text('AKSI', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold))),
                              ],
                            ),
                          ),
                          const SizedBox(height: 4),

                          // List View of Trades
                          Expanded(
                            child: displayedTrades.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.history_toggle_off_rounded, color: Color(0xFF64748B), size: 36),
                                        const SizedBox(height: 8),
                                        Text(
                                          filterMode == 'MINE'
                                              ? 'Belum ada transaksi beli/jual dari akun Anda.'
                                              : 'Menunggu aliran transaksi bursa berikutnya...',
                                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  )
                                : ListView.builder(
                                    controller: scrollController,
                                    itemCount: displayedTrades.length,
                                    itemBuilder: (_, idx) {
                                      final t = displayedTrades[idx];
                                      final isBuy = t['type'] == 'BUY';
                                      final isMine = checkIsMine(t);
                                      final price = (t['price'] as num?)?.toDouble() ?? 0.0;
                                      final lots = (t['lots'] as num?)?.toInt() ?? 0;
                                      final time = t['time']?.toString() ?? '14:00:00';
                                      final symbol = t['symbol']?.toString() ?? '-';
                                      final username = t['username']?.toString() ?? 'Ritel';

                                      return Container(
                                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                                        margin: const EdgeInsets.symmetric(vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isMine
                                              ? const Color(0xFF0369A1).withValues(alpha: 0.22)
                                              : Colors.transparent,
                                          borderRadius: BorderRadius.circular(8),
                                          border: isMine
                                              ? Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.7), width: 1.2)
                                              : const Border(bottom: BorderSide(color: Color(0xFF1E293B), width: 0.5)),
                                        ),
                                        child: Row(
                                          children: [
                                            // Waktu
                                            SizedBox(
                                              width: 55,
                                              child: Text(
                                                time,
                                                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                              ),
                                            ),
                                            // Simbol & ANDA badge
                                            SizedBox(
                                              width: 60,
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    symbol,
                                                    style: TextStyle(
                                                      color: isMine ? const Color(0xFF38BDF8) : Colors.white,
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.w900,
                                                    ),
                                                  ),
                                                  if (isMine)
                                                    Container(
                                                      margin: const EdgeInsets.only(top: 2),
                                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                      decoration: BoxDecoration(
                                                        color: const Color(0xFF38BDF8),
                                                        borderRadius: BorderRadius.circular(4),
                                                      ),
                                                      child: const Text('ANDA', style: TextStyle(color: Color(0xFF0F172A), fontSize: 7.5, fontWeight: FontWeight.w900)),
                                                    ),
                                                ],
                                              ),
                                            ),
                                            // Harga
                                            Expanded(
                                              child: Text(
                                                CurrencyFormatter.formatFull(price).replaceAll('IB ', ''),
                                                style: TextStyle(
                                                  color: isBuy ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w900,
                                                ),
                                              ),
                                            ),
                                            // Volume Lot & Username
                                            SizedBox(
                                              width: 75,
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.end,
                                                children: [
                                                  Text(
                                                    '${CurrencyFormatter.formatNumberOnly(lots)} Lot',
                                                    textAlign: TextAlign.right,
                                                    style: TextStyle(
                                                      color: isMine ? Colors.white : const Color(0xFFCBD5E1),
                                                      fontSize: 11.5,
                                                      fontWeight: isMine ? FontWeight.w900 : FontWeight.bold,
                                                    ),
                                                  ),
                                                  Text(
                                                    username,
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: TextStyle(
                                                      color: isMine ? const Color(0xFF38BDF8) : const Color(0xFF64748B),
                                                      fontSize: 8.5,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            // Aksi BUY / SELL badge
                                            SizedBox(
                                              width: 44,
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2.5),
                                                decoration: BoxDecoration(
                                                  color: isBuy
                                                      ? const Color(0xFF10B981).withValues(alpha: 0.18)
                                                      : const Color(0xFFEF4444).withValues(alpha: 0.18),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(
                                                    color: isBuy
                                                        ? const Color(0xFF10B981).withValues(alpha: 0.35)
                                                        : const Color(0xFFEF4444).withValues(alpha: 0.35),
                                                  ),
                                                ),
                                                child: Text(
                                                  isBuy ? 'BUY' : 'SELL',
                                                  textAlign: TextAlign.center,
                                                  style: TextStyle(
                                                    color: isBuy ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                                    fontSize: 9.5,
                                                    fontWeight: FontWeight.w900,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildTradeFilterTab(String label, bool isSelected, VoidCallback onTap, {bool isHighlighted = false}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? (isHighlighted ? const Color(0xFF0284C7) : const Color(0xFF334155))
              : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? const Color(0xFF38BDF8) : Colors.transparent,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  // ==========================================
  // E-IPO BURSA PASAR PERDANA SHEET
  // ==========================================
  void _showEipoSheet(BuildContext context) {
    showEipoMarketSheet(
      context,
      onOpenRegister: () => _showIpoRegistrationDialog(context),
    );
  }

  // Dialog Pendaftaran IPO PT Pemain
  void _showIpoRegistrationDialog(BuildContext context) {
    final provider = Provider.of<GameProvider>(context, listen: false);
    final user = provider.user;

    if (user == null || !user.hasPt) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text('Belum Memiliki PT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          content: const Text(
            'Untuk dapat mendaftarkan perusahaan ke Bursa Efek (Go Public / E-IPO), Anda harus mendirikan PT terlebih dahulu di menu Beranda (Minimal Saldo Tabungan Pribadi IB 25 Juta).',
            style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
          ),
          actions: [
            ElevatedButton(onPressed: () => Navigator.pop(ctx), child: const Text('Mengerti')),
          ],
        ),
      );
      return;
    }

    if (user.isIpo) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text('Sudah Terdaftar IPO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          content: Text(
            'PT ${user.ptName} Tbk. sudah terdaftar resmi di Bursa Efek Capital Federation (CFX)!',
            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
          ),
          actions: [
            ElevatedButton(onPressed: () => Navigator.pop(ctx), child: const Text('Tutup')),
          ],
        ),
      );
      return;
    }

    final tickerController = TextEditingController(text: user.ptName.length >= 4 ? user.ptName.substring(0, 4).toUpperCase() : 'SYAF');
    final descController = TextEditingController(text: 'Emiten sektor ${user.sector} dengan tata kelola profesional dan ekspansi pasar berkelanjutan.');
    final priceController = TextEditingController(text: '2500');
    double floatingSharePct = 10.0; // Default 10% sesuai instruksi
    int selectedTotalLots = 100000; // Default 100 Ribu Lot (10 Juta lembar = Standar Modal Saham)
    String selectedSector = user.sector.isNotEmpty ? user.sector : 'Teknologi';
    final now = DateTime.now();
    DateTime bookStart = now;
    DateTime bookEnd = now.add(const Duration(days: 2));
    DateTime offerStart = now.add(const Duration(days: 3));
    DateTime offerEnd = now.add(const Duration(days: 5));
    DateTime allotmentD = now.add(const Duration(days: 6));
    DateTime listingD = now.add(const Duration(days: 7));

    String fmtDate(DateTime d) {
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return '${d.day} ${months[d.month - 1]} ${d.year}';
    }

    showDialog(
      context: context,
      builder: (dCtx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            final ipoPrice = double.tryParse(priceController.text) ?? 2500.0;
            final totalShares = selectedTotalLots * 100; // 1 Lot = 100 lembar
            final publicShares = (totalShares * (floatingSharePct / 100.0)).round();
            final publicLots = (publicShares / 100).round();
            final strategicPct = (100.0 - floatingSharePct - 50.0).clamp(0.0, 40.0);
            final founderPct = 100.0 - floatingSharePct - strategicPct;

            final grossIpo = publicShares * ipoPrice;
            final ptFund = (grossIpo * 0.75).round();
            final personalFund = (grossIpo * 0.25).round();

            // First day ARA estimation
            final araPct = ipoPrice <= 200 ? 70.0 : (ipoPrice <= 5000 ? 50.0 : 40.0);
            final targetAraPrice = (ipoPrice * (1 + araPct / 100.0)).round();

            const minCompanyBalance = 250000000.0; // IB 250 Juta
            const ipoRegFee = 100000000.0; // IB 100 Juta Biaya Pendaftaran IPO
            final isPtFundReady = user.companyBalanceIb >= (minCompanyBalance + ipoRegFee);

            return AlertDialog(
              backgroundColor: const Color(0xFF0F172A),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Color(0xFF1E293B))),
              title: Row(
                children: [
                  const Icon(Icons.account_balance_rounded, color: Color(0xFF38BDF8), size: 22),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text('Formulir Pendaftaran IPO Resmi', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nama Calon Emiten: PT ${user.ptName} Tbk.',
                      style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),

                    // Syarat Kas PT & Biaya Pendaftaran
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isPtFundReady ? const Color(0xFF1E293B) : const Color(0xFF7F1D1D).withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Kas PT Anda Saat Ini:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                              Text(CurrencyFormatter.formatFull(user.companyBalanceIb),
                                  style: TextStyle(color: isPtFundReady ? const Color(0xFF34D399) : const Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('• Syarat Minimal Kas PT:', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                              Text('IB 250.000.000', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('• Biaya Pendaftaran IPO (Bursa CFX):', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5)),
                              Text('IB 100.000.000', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          if (!isPtFundReady) ...[
                            const SizedBox(height: 4),
                            const Text('⚠️ Saldo Kas PT belum mencukupi (Butuh Kas Min IB 250 Juta + Biaya Registrasi IB 100 Juta).', style: TextStyle(color: Color(0xFFF87171), fontSize: 9.5)),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Pilihan Total 100% Modal Saham Perseroan
                    const Text('Total 100% Modal Saham Dasar Perseroan:', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setDialogState(() => selectedTotalLots = 100000), // 100 Ribu Lot = 10 Juta lembar
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                              decoration: BoxDecoration(
                                color: selectedTotalLots == 100000 ? const Color(0xFF0284C7).withValues(alpha: 0.25) : const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: selectedTotalLots == 100000 ? const Color(0xFF38BDF8) : const Color(0xFF334155)),
                              ),
                              child: const Column(
                                children: [
                                  Text('100 Ribu Lot', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                  Text('10 Juta Lbr (Standar)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: InkWell(
                            onTap: () => setDialogState(() => selectedTotalLots = 500000), // 500 Ribu Lot = 50 Juta lembar
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                              decoration: BoxDecoration(
                                color: selectedTotalLots == 500000 ? const Color(0xFF0284C7).withValues(alpha: 0.25) : const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: selectedTotalLots == 500000 ? const Color(0xFF38BDF8) : const Color(0xFF334155)),
                              ),
                              child: const Column(
                                children: [
                                  Text('500 Ribu Lot', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                  Text('50 Juta Lbr (Berkembang)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: InkWell(
                            onTap: () => setDialogState(() => selectedTotalLots = 1000000), // 1 Juta Lot = 100 Juta Lembar
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                              decoration: BoxDecoration(
                                color: selectedTotalLots == 1000000 ? const Color(0xFF7C3AED).withValues(alpha: 0.25) : const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: selectedTotalLots == 1000000 ? const Color(0xFFA855F7) : const Color(0xFF334155)),
                              ),
                              child: const Column(
                                children: [
                                  Text('1 Juta Lot 🔥', style: TextStyle(color: Color(0xFFC084FC), fontSize: 10.5, fontWeight: FontWeight.w900)),
                                  Text('100 Juta Lbr (Utama)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Kode Ticker 4 Huruf
                    const Text('Kode Saham (Ticker 4 Huruf Kapital):', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: tickerController,
                      maxLength: 4,
                      textCapitalization: TextCapitalization.characters,
                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: 2),
                      decoration: InputDecoration(
                        hintText: 'Contoh: SYAF, BBCA',
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Sektor Usaha Dropdown
                    const Text('Sektor Industri:', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedSector,
                          dropdownColor: const Color(0xFF1E293B),
                          isExpanded: true,
                          style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold),
                          items: ['Teknologi', 'Keuangan', 'Properti', 'F&B', 'Energi', 'Manufaktur']
                              .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                              .toList(),
                          onChanged: (val) {
                            if (val != null) setDialogState(() => selectedSector = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Deskripsi Prospektus
                    const Text('Deskripsi Prospektus Usaha:', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: descController,
                      maxLines: 2,
                      style: const TextStyle(color: Colors.white, fontSize: 11.5),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Harga Penawaran Perdana
                    const Text('Harga Penawaran IPO (Per Lembar):', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: priceController,
                      keyboardType: TextInputType.number,
                      onChanged: (_) => setDialogState(() {}),
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        prefixText: 'IB ',
                        prefixStyle: const TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold),
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Porsi Publik (% Floating Share) Slider & Choice Chips
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Porsi Saham Publik:', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                        Text('${floatingSharePct.toStringAsFixed(0)}% (${CurrencyFormatter.formatNumberOnly(publicLots)} Lot)',
                            style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w900)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [10.0, 15.0, 20.0, 30.0, 40.0].map((pct) {
                        final isSel = floatingSharePct == pct;
                        return InkWell(
                          onTap: () => setDialogState(() => floatingSharePct = pct),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: isSel ? const Color(0xFF2563EB) : const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: isSel ? const Color(0xFF60A5FA) : const Color(0xFF334155)),
                            ),
                            child: Text(
                              '${pct.toStringAsFixed(0)}%',
                              style: TextStyle(color: isSel ? Colors.white : const Color(0xFFCBD5E1), fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 10),

                    // Struktur Kepemilikan Pasca-IPO
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070B14),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Struktur Alokasi Saham:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('• Publik Ritel (${floatingSharePct.toStringAsFixed(0)}%):', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5)),
                              Text('${CurrencyFormatter.formatNumberOnly(publicLots)} Lot', style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('• Mitra Strategis Korporasi (${strategicPct.toStringAsFixed(0)}%):', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5)),
                              Text('${CurrencyFormatter.formatNumberOnly((selectedTotalLots * strategicPct / 100).round())} Lot', style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('• Pendiri & Pengendali (${founderPct.toStringAsFixed(0)}%):', style: const TextStyle(color: Color(0xFF34D399), fontSize: 9.5)),
                              Text('${CurrencyFormatter.formatNumberOnly((selectedTotalLots * founderPct / 100).round())} Lot', style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Simulasi Perolehan Dana & Plafon ARA
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Target Dana IPO Terhimpun', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                              Text(CurrencyFormatter.formatFull(grossIpo), style: const TextStyle(color: Color(0xFF34D399), fontSize: 12.5, fontWeight: FontWeight.w900)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('• Masuk Kas PT (75% Ekspansi)', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                              Text(CurrencyFormatter.formatFull(ptFund), style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('• Masuk Kas Pribadi (25% Dividen)', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                              Text(CurrencyFormatter.formatFull(personalFund), style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const Divider(color: Color(0xFF334155), height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Target Debut Listing (07:00 WIB)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                              Text('+${araPct.toStringAsFixed(0)}% (IB ${CurrencyFormatter.formatNumberOnly(targetAraPrice)})',
                                  style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.w900)),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // JADWAL PELAKSANAAN 4 TAHAP E-IPO (ATUR TANGGAL)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070B14),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.calendar_month_rounded, color: Color(0xFF38BDF8), size: 16),
                              SizedBox(width: 6),
                              Text('Jadwal 4 Tahap Emisi E-IPO (Standar Regulasi)', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Ketuk baris jadwal di bawah untuk mengatur rentang tanggal emisi resmi:',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                          ),
                          const Divider(color: Color(0xFF1E293B), height: 16),

                          // Tahap 1: Bookbuilding Date Range
                          InkWell(
                            onTap: () async {
                              final picked = await showDateRangePicker(
                                context: context,
                                initialDateRange: DateTimeRange(start: bookStart, end: bookEnd),
                                firstDate: now,
                                lastDate: now.add(const Duration(days: 365)),
                                builder: (c, ch) => Theme(data: ThemeData.dark(), child: ch!),
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  bookStart = picked.start;
                                  bookEnd = picked.end;
                                  // standard schedule
                                });
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.handshake_rounded, color: Color(0xFFF59E0B), size: 14),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Text('1. Bookbuilding (Mitra):', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5)),
                                  ),
                                  Text(
                                    '${fmtDate(bookStart)} - ${fmtDate(bookEnd)}',
                                    style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 10.5, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 13),
                                ],
                              ),
                            ),
                          ),

                          // Tahap 2: Offering Date Range
                          InkWell(
                            onTap: () async {
                              final picked = await showDateRangePicker(
                                context: context,
                                initialDateRange: DateTimeRange(start: offerStart, end: offerEnd),
                                firstDate: now,
                                lastDate: now.add(const Duration(days: 365)),
                                builder: (c, ch) => Theme(data: ThemeData.dark(), child: ch!),
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  offerStart = picked.start;
                                  offerEnd = picked.end;
                                  // standard schedule
                                });
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.shopping_bag_rounded, color: Color(0xFF38BDF8), size: 14),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Text('2. Penawaran Umum (Ritel):', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5)),
                                  ),
                                  Text(
                                    '${fmtDate(offerStart)} - ${fmtDate(offerEnd)}',
                                    style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 13),
                                ],
                              ),
                            ),
                          ),

                          // Tahap 3: Penjatahan (Allotment)
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: allotmentD,
                                firstDate: now,
                                lastDate: now.add(const Duration(days: 365)),
                                builder: (c, ch) => Theme(data: ThemeData.dark(), child: ch!),
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  allotmentD = picked;
                                  // standard schedule
                                });
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.pie_chart_rounded, color: Color(0xFFA855F7), size: 14),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Text('3. Penjatahan Otomatis:', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5)),
                                  ),
                                  Text(
                                    fmtDate(allotmentD),
                                    style: const TextStyle(color: Color(0xFFA855F7), fontSize: 10.5, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 13),
                                ],
                              ),
                            ),
                          ),

                          // Tahap 4: Listing Melantai ARA
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: listingD,
                                firstDate: now,
                                lastDate: now.add(const Duration(days: 365)),
                                builder: (c, ch) => Theme(data: ThemeData.dark(), child: ch!),
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  listingD = picked;
                                  // standard schedule
                                });
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.rocket_launch_rounded, color: Color(0xFF10B981), size: 14),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Text('4. Melantai di Bursa (ARA):', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5)),
                                  ),
                                  Text(
                                    '${fmtDate(listingD)} (07:00 WIB)',
                                    style: const TextStyle(color: Color(0xFF10B981), fontSize: 10.5, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 13),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(dCtx), child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8)))),
                ElevatedButton(
                  onPressed: (!isPtFundReady || tickerController.text.trim().length != 4)
                      ? null
                      : () async {
                          Navigator.pop(dCtx);
                          final err = await provider.registerCompanyIpo(
                            symbol: tickerController.text.trim().toUpperCase(),
                            description: descController.text.trim(),
                            sector: selectedSector,
                            ipoPrice: ipoPrice,
                            floatingPct: floatingSharePct,
                            totalShares: totalShares,
                            initialStatus: 'BOOKBUILDING',
                            bookbuildingDate: '${fmtDate(bookStart)} - ${fmtDate(bookEnd)}',
                            offeringDate: '${fmtDate(offerStart)} - ${fmtDate(offerEnd)}',
                            allotmentDate: fmtDate(allotmentD),
                            listingDate: fmtDate(listingD),
                          );
                          if (context.mounted) {
                            if (err != null) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: Colors.red));
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('🎉 SELAMAT! PT ${user.ptName} Tbk. (${tickerController.text.trim().toUpperCase()}) resmi terdaftar IPO di Bursa Efek Capital Federation! Masuk tahap Bookbuilding penawaran mitra.'),
                                  backgroundColor: const Color(0xFF10B981),
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('DAFTARKAN IPO (IB 100.000.000)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showSectoralSheet(BuildContext context, List<CompanyModel> companies) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final sectors = ['Teknologi', 'Keuangan', 'Properti', 'F&B', 'Energi', 'Manufaktur'];
        return SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 20),
            child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 14),
              const Text('PERFORMA SEKTORAL BURSA', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              const Text('Rata-rata perubahan indeks sektor bursa Capital Federation hari ini.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              const SizedBox(height: 14),
              ...sectors.map((sec) {
                final comps = companies.where((c) => c.sector.toLowerCase() == sec.toLowerCase()).toList();
                final avgPct = comps.isNotEmpty ? comps.map((c) => c.priceChangePct).reduce((a, b) => a + b) / comps.length : 0.0;
                final isSecUp = avgPct >= 0;
                final col = _getSectorColor(sec);
                final ic = _getSectorIcon(sec);

                return InkWell(
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() => _activeFilter = sec);
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(color: col.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                          child: Icon(ic, color: col, size: 16),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(sec, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                              Text('${comps.length} Emiten', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isSecUp ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFFEF4444).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${isSecUp ? '+' : ''}${avgPct.toStringAsFixed(2)}%',
                            style: TextStyle(
                              color: isSecUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      );
    },
  );
}

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final allCompanies = provider.companies.where((c) => !c.isPreIpo && c.listingStatus != 'UNLISTED').toList();
    final overview = provider.marketOverview;

    // Filter & Sort
    var filtered = allCompanies.where((c) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchesSymbol = c.symbol.toLowerCase().contains(q);
        final matchesName = c.name.toLowerCase().contains(q);
        if (!matchesSymbol && !matchesName) return false;
      }

      if (_activeFilter == 'ALL' ||
          _activeFilter == 'GAINERS' ||
          _activeFilter == 'LOSERS' ||
          _activeFilter == 'DIVIDEND') {
        return true;
      }
      return c.sector.toLowerCase() == _activeFilter.toLowerCase();
    }).toList();

    if (_activeFilter == 'GAINERS') {
      filtered.sort((a, b) => b.priceChangePct.compareTo(a.priceChangePct));
    } else if (_activeFilter == 'LOSERS') {
      filtered.sort((a, b) => a.priceChangePct.compareTo(b.priceChangePct));
    } else if (_activeFilter == 'DIVIDEND') {
      filtered.sort((a, b) => b.dividendRate.compareTo(a.dividendRate));
    }

    // Market Overview Data (from backend simulation engine or calculated fallback)
    final totalCount = allCompanies.length;
    final upCount = overview?['breadth']?['up'] ?? allCompanies.where((c) => c.priceChangePct > 0).length;
    final downCount = overview?['breadth']?['down'] ?? allCompanies.where((c) => c.priceChangePct < 0).length;
    final flatCount = overview?['breadth']?['flat'] ?? (totalCount - upCount - downCount);

    final double indexPoints = (overview?['points'] as num?)?.toDouble() ??
        (totalCount > 0 ? (allCompanies.map((c) => c.currentPrice).reduce((a, b) => a + b) / totalCount) : 7350.0);
    final double changePts = (overview?['changePts'] as num?)?.toDouble() ?? 0.0;
    final double changePct = (overview?['changePct'] as num?)?.toDouble() ??
        (totalCount > 0 ? allCompanies.map((c) => c.priceChangePct).reduce((a, b) => a + b) / totalCount : 0.0);

    final double openPts = (overview?['open'] as num?)?.toDouble() ?? 7350.0;
    final double highPts = (overview?['high'] as num?)?.toDouble() ?? max(indexPoints, openPts * 1.01);
    final double lowPts = (overview?['low'] as num?)?.toDouble() ?? min(indexPoints, openPts * 0.99);

    final num foreignBuy = overview?['stats']?['foreignBuyIb'] ?? 4580000000;
    final num foreignSell = overview?['stats']?['foreignSellIb'] ?? 3210000000;
    final num foreignNet = overview?['stats']?['foreignNetIb'] ?? (foreignBuy - foreignSell);
    final num totalLots = overview?['stats']?['totalLotsTraded'] ?? 1845200;
    final num totalTurnover = overview?['stats']?['totalTurnoverIb'] ?? 42850000000;
    final num tradeFreq = overview?['stats']?['tradeFrequency'] ?? 98450;

    // Intraday History for Interactive Chart
    final List<dynamic> rawHistory = overview?['history'] as List<dynamic>? ?? [];
    final List<Map<String, dynamic>> chartPoints = rawHistory.isNotEmpty
        ? rawHistory.map((item) => Map<String, dynamic>.from(item as Map)).toList()
        : [
            {'time': '09:00', 'points': openPts},
            {'time': '10:30', 'points': (openPts + highPts) / 2},
            {'time': '12:00', 'points': (highPts + lowPts) / 2},
            {'time': '14:00', 'points': lowPts},
            {'time': '15:45', 'points': indexPoints},
          ];

    final isIndexUp = changePts >= 0;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Top App Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                          ),
                          child: const Icon(Icons.candlestick_chart_rounded, color: Color(0xFF38BDF8), size: 18),
                        ),
                        const SizedBox(width: 10),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'BURSA EFEK IPMC',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              'Pasar Modal Resmi Republik Federasi',
                              style: TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.circle, color: Color(0xFF10B981), size: 7),
                          SizedBox(width: 5),
                          Text(
                            'BURSA LIVE',
                            style: TextStyle(
                              color: Color(0xFF34D399),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Banner Indikator Makroekonomi Republik Federasi & Akses PNAF
            SliverToBoxAdapter(
              child: FederationMacroBanner(
                onCourtTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CourtCommercialScreen()),
                  );
                },
              ),
            ),

            // HERO COMPOSITE INDEX (IHSG / IPMC Interactive Card)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0F172A), Color(0xFF111C30)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF1E293B), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row: IHSG / IPMC points & change
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      'IPMC',
                                      style: TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text('REAL-TIME', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 8.5, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.baseline,
                                  textBaseline: TextBaseline.alphabetic,
                                  children: [
                                    Text(
                                      indexPoints.toStringAsFixed(2).replaceAll('.', ','),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 22,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isIndexUp
                                            ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                            : const Color(0xFFEF4444).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            isIndexUp ? Icons.arrow_drop_up_rounded : Icons.arrow_drop_down_rounded,
                                            color: isIndexUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                            size: 14,
                                          ),
                                          Text(
                                            '${isIndexUp ? '+' : ''}${changePts.toStringAsFixed(2)} (${isIndexUp ? '+' : ''}${changePct.toStringAsFixed(2)}%)',
                                            style: TextStyle(
                                              color: isIndexUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            // Breadth badges (▲ up, ■ flat, ▼ down)
                            Row(
                              children: [
                                _buildBreadthBadge('▲ $upCount', const Color(0xFF34D399)),
                                const SizedBox(width: 4),
                                _buildBreadthBadge('■ $flatCount', const Color(0xFF64748B)),
                                const SizedBox(width: 4),
                                _buildBreadthBadge('▼ $downCount', const Color(0xFFF87171)),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 6),

                      // Touch-Scrubbable IHSG Line Chart
                      SizedBox(
                        height: 135,
                        width: double.infinity,
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            return GestureDetector(
                              onHorizontalDragUpdate: (details) {
                                final localX = details.localPosition.dx.clamp(0.0, constraints.maxWidth);
                                final pct = localX / constraints.maxWidth;
                                final idx = (pct * (chartPoints.length - 1)).round().clamp(0, chartPoints.length - 1);
                                setState(() {
                                  _scrubIndex = idx;
                                });
                              },
                              onHorizontalDragEnd: (_) {
                                Future.delayed(const Duration(seconds: 3), () {
                                  if (mounted) setState(() => _scrubIndex = null);
                                });
                              },
                              onTapDown: (details) {
                                final localX = details.localPosition.dx.clamp(0.0, constraints.maxWidth);
                                final pct = localX / constraints.maxWidth;
                                final idx = (pct * (chartPoints.length - 1)).round().clamp(0, chartPoints.length - 1);
                                setState(() {
                                  _scrubIndex = idx;
                                });
                              },
                              child: Stack(
                                children: [
                                  CustomPaint(
                                    size: Size(constraints.maxWidth, 135),
                                    painter: IhsgChartPainter(
                                      points: chartPoints,
                                      baseLinePrice: openPts,
                                      isBullish: isIndexUp,
                                      scrubIndex: _scrubIndex,
                                      highPrice: highPts,
                                      lowPrice: lowPts,
                                    ),
                                  ),
                                  // Floating Scrubbing Tooltip
                                  if (_scrubIndex != null && _scrubIndex! < chartPoints.length) ...[
                                    Positioned(
                                      top: 4,
                                      left: (constraints.maxWidth * (_scrubIndex! / (chartPoints.length - 1))).clamp(10.0, constraints.maxWidth - 120),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF1E293B),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: const Color(0xFF38BDF8), width: 1),
                                          boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 4)],
                                        ),
                                        child: Text(
                                          '${(chartPoints[_scrubIndex!]['points'] as num).toDouble().toStringAsFixed(2)} • ${chartPoints[_scrubIndex!]['time']}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                      ),

                      // Time Axis Labels (like real IHSG chart: 09:00, 11:30, 13:30, 15:45)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(chartPoints.isNotEmpty ? chartPoints.first['time'] : '09:00', style: const TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                            const Text('11:30', style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                            const Text('13:30', style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                            Text(chartPoints.isNotEmpty ? chartPoints.last['time'] : '15:45', style: const TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                          ],
                        ),
                      ),

                      const Divider(color: Color(0xFF1E293B), height: 16),

                      // 3 REAL-TIME STATISTICS CARDS (Foreign, Intraday, All Market)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(10, 0, 10, 12),
                        child: Row(
                          children: [
                            // Card 1: Foreign Flow
                            Expanded(
                              child: _buildMetricBox(
                                title: 'Foreign',
                                rows: [
                                  _MetricItem('Buy', _formatCompactIb(foreignBuy), const Color(0xFF34D399)),
                                  _MetricItem('Sell', _formatCompactIb(foreignSell), const Color(0xFFF87171)),
                                  _MetricItem(
                                    'Net',
                                    '${foreignNet >= 0 ? '+' : ''}${_formatCompactIb(foreignNet)}',
                                    foreignNet >= 0 ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Card 2: Intraday Range
                            Expanded(
                              child: _buildMetricBox(
                                title: 'Intraday',
                                rows: [
                                  _MetricItem('Open', openPts.toStringAsFixed(1), const Color(0xFF94A3B8)),
                                  _MetricItem('High', highPts.toStringAsFixed(1), const Color(0xFF34D399)),
                                  _MetricItem('Low', lowPts.toStringAsFixed(1), const Color(0xFFF87171)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Card 3: All Market Activity
                            Expanded(
                              child: _buildMetricBox(
                                title: 'All Market',
                                rows: [
                                  _MetricItem('Lot', '${(totalLots / 1000000).toStringAsFixed(2).replaceAll('.', ',')}M', Colors.white),
                                  _MetricItem('Value', _formatCompactIb(totalTurnover), Colors.white),
                                  _MetricItem('Freq', '${(tradeFreq / 1000).toStringAsFixed(1).replaceAll('.', ',')}K', Colors.white),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // BANNER PROMINEN E-IPO PASAR PERDANA (Tab Status & Jadwal 4 Tahap)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E1B4B), Color(0xFF0F172A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.4)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.rocket_launch_rounded, color: Color(0xFFA5B4FC), size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      'E-IPO PASAR PERDANA CFX',
                                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981).withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: const Color(0xFF34D399), width: 0.8),
                                      ),
                                      child: const Text('PASAR PERDANA RESMI', style: TextStyle(color: Color(0xFF34D399), fontSize: 8.5, fontWeight: FontWeight.w900)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Tab Status & Jadwal: Bookbuilding • Offering • Allotment • Listing ARA',
                                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _showEipoSheet(context),
                              icon: const Icon(Icons.table_chart_rounded, size: 16, color: Colors.white),
                              label: const Text('List Pasar Perdana CFX', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w900)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF4F46E5),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            onPressed: () => _showIpoRegistrationDialog(context),
                            icon: const Icon(Icons.add_circle_outline_rounded, size: 16, color: Color(0xFF38BDF8)),
                            label: const Text('DAFTAR IPO', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.bold)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFF38BDF8)),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // QUICK ACTION MENU (Running Trade, E-IPO, Top Gainers, Top Losers, Dividen Jumbo, Sektoral)
            SliverToBoxAdapter(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(
                  children: [
                    _buildQuickActionBtn(
                      icon: Icons.bolt_rounded,
                      color: const Color(0xFF38BDF8),
                      label: 'Running Trade',
                      onTap: () => _showRunningTradeSheet(context),
                    ),
                    const SizedBox(width: 8),
                    _buildQuickActionBtn(
                      icon: Icons.rocket_launch_rounded,
                      color: const Color(0xFFF59E0B),
                      label: 'E-IPO',
                      badge: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('NEW', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                      ),
                      onTap: () => _showEipoSheet(context),
                    ),
                    const SizedBox(width: 8),
                    _buildQuickActionBtn(
                      icon: Icons.storefront_rounded,
                      color: const Color(0xFF38BDF8),
                      label: 'Beli Saham P2P',
                      badge: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('KATALOG', style: TextStyle(color: Colors.white, fontSize: 7.5, fontWeight: FontWeight.w900)),
                      ),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const CorporateDealsScreen()),
                        );
                      },
                    ),
                    const SizedBox(width: 8),
                    _buildQuickActionBtn(
                      icon: Icons.trending_up_rounded,
                      color: const Color(0xFF10B981),
                      label: 'Top Gainers',
                      onTap: () => setState(() => _activeFilter = 'GAINERS'),
                    ),
                    const SizedBox(width: 8),
                    _buildQuickActionBtn(
                      icon: Icons.trending_down_rounded,
                      color: const Color(0xFFEF4444),
                      label: 'Top Losers',
                      onTap: () => setState(() => _activeFilter = 'LOSERS'),
                    ),
                    const SizedBox(width: 8),
                    _buildQuickActionBtn(
                      icon: Icons.diamond_rounded,
                      color: const Color(0xFFA855F7),
                      label: 'Dividen Jumbo',
                      onTap: () => setState(() => _activeFilter = 'DIVIDEND'),
                    ),
                    const SizedBox(width: 8),
                    _buildQuickActionBtn(
                      icon: Icons.pie_chart_rounded,
                      color: const Color(0xFF06B6D4),
                      label: 'Sektoral',
                      onTap: () => _showSectoralSheet(context, allCompanies),
                    ),
                  ],
                ),
              ),
            ),

            // BANNER KATALOG PENAWARAN SAHAM GLOBAL & P2P
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                child: InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CorporateDealsScreen()),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF5B942).withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.storefront_rounded, color: Color(0xFFF5B942), size: 18),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PASAR NEGOSIASI & KATALOG GLOBAL',
                                style: TextStyle(color: Color(0xFFF5B942), fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Beli porsi saham yang dilepas konglomerat lain',
                                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFFF5B942), size: 12),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // SECTION HEADER: "Saham Pilihan"
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Text(
                          'Saham Pilihan',
                          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                        ),
                        SizedBox(width: 6),
                        Icon(Icons.info_outline_rounded, color: Color(0xFF64748B), size: 14),
                      ],
                    ),
                    InkWell(
                      onTap: () {
                        setState(() {
                          _activeFilter = 'ALL';
                          _searchQuery = '';
                          _searchController.clear();
                        });
                      },
                      child: const Text(
                        'Reset Filter',
                        style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Search Bar & Filter Chips
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
                child: Column(
                  children: [
                    TextField(
                      controller: _searchController,
                      onChanged: (val) => setState(() => _searchQuery = val),
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                      decoration: InputDecoration(
                        hintText: 'Cari kode saham atau nama emiten...',
                        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        filled: true,
                        fillColor: const Color(0xFF0F172A),
                        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF38BDF8), size: 18),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, color: Color(0xFF64748B), size: 16),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF1E293B)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Filter Chips
                    SizedBox(
                      height: 32,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _filterOptions.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 6),
                        itemBuilder: (context, index) {
                          final item = _filterOptions[index];
                          final isSelected = _activeFilter == item['id'];
                          return InkWell(
                            onTap: () => setState(() => _activeFilter = item['id']),
                            borderRadius: BorderRadius.circular(20),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                gradient: isSelected
                                    ? const LinearGradient(
                                        colors: [Color(0xFF38BDF8), Color(0xFF0284C7)],
                                      )
                                    : null,
                                color: isSelected ? null : const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected ? Colors.transparent : const Color(0xFF1E293B),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    item['icon'] as IconData,
                                    size: 13,
                                    color: isSelected ? const Color(0xFF082F49) : const Color(0xFF94A3B8),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    item['label'] as String,
                                    style: TextStyle(
                                      color: isSelected ? const Color(0xFF082F49) : const Color(0xFFCBD5E1),
                                      fontSize: 10.5,
                                      fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Results count banner
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Menampilkan ${filtered.length} dari $totalCount Emiten',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 10.5, fontWeight: FontWeight.bold),
                    ),
                    const Text(
                      '1 Lot = 100 Lembar',
                      style: TextStyle(color: Color(0xFF475569), fontSize: 10),
                    ),
                  ],
                ),
              ),
            ),

            // Stock Cards List
            filtered.isEmpty
                ? const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off_rounded, color: Color(0xFF334155), size: 48),
                          SizedBox(height: 10),
                          Text(
                            'Tidak ada emiten ditemukan.',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Coba gunakan kata kunci atau filter lain.',
                            style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  )
                : SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final c = filtered[index];
                          final isUp = c.priceChangePct >= 0;
                          final sectorColor = _getSectorColor(c.sector);
                          final sectorIcon = _getSectorIcon(c.sector);
                          final cSectorLower = c.sector.toLowerCase();
                          final bool isSubsidized = provider.activeSubsidies.any((s) {
                            final sName = (s['sector'] ?? s['sector_name'] ?? s['sectorName'] ?? '').toString().toLowerCase();
                            final isActive = s['is_active'] == 1 || s['is_active'] == true || s['isActive'] == true;
                            return isActive && (cSectorLower.contains(sName) || sName.contains(cSectorLower));
                          });

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: InkWell(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => StockDetailScreen(company: c),
                                  ),
                                );
                              },
                              borderRadius: BorderRadius.circular(14),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      const Color(0xFF0F172A),
                                      isUp ? const Color(0xFF0F1F2C) : const Color(0xFF1F121C),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: isUp
                                        ? const Color(0xFF10B981).withValues(alpha: 0.18)
                                        : const Color(0xFFEF4444).withValues(alpha: 0.18),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    // Sector Avatar
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        color: sectorColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: sectorColor.withValues(alpha: 0.3)),
                                      ),
                                      child: Icon(sectorIcon, color: sectorColor, size: 18),
                                    ),
                                    const SizedBox(width: 10),

                                    // Left Column: Symbol, Status, Name, Lot Info
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text(
                                                c.symbol,
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w900,
                                                  letterSpacing: 0.3,
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                                decoration: BoxDecoration(
                                                  color: c.isSeized
                                                      ? const Color(0xFFEF4444).withValues(alpha: 0.15)
                                                      : (c.isSuspended
                                                          ? const Color(0xFFEF4444).withValues(alpha: 0.15)
                                                          : (c.status == 'CRITICAL'
                                                              ? const Color(0xFFEF4444).withValues(alpha: 0.15)
                                                              : const Color(0xFF10B981).withValues(alpha: 0.15))),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  c.isSeized
                                                      ? 'DISITA'
                                                      : (c.isSuspended
                                                          ? 'SUSPENSI'
                                                          : (c.status == 'CRITICAL' ? 'KRITIS' : 'SEHAT')),
                                                  style: TextStyle(
                                                    color: c.isSeized
                                                        ? const Color(0xFFF87171)
                                                        : (c.isSuspended
                                                            ? const Color(0xFFF87171)
                                                            : (c.status == 'CRITICAL'
                                                                ? const Color(0xFFF87171)
                                                                : const Color(0xFF34D399))),
                                                    fontSize: 8,
                                                    fontWeight: FontWeight.w900,
                                                  ),
                                                ),
                                              ),
                                              if (c.isUma && !c.isSuspended && !c.isSeized) ...[
                                                const SizedBox(width: 4),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                                  decoration: BoxDecoration(
                                                    color: (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                                                        ? const Color(0xFF10B981).withValues(alpha: 0.18)
                                                        : const Color(0xFFEF4444).withValues(alpha: 0.18),
                                                    borderRadius: BorderRadius.circular(4),
                                                    border: Border.all(
                                                      color: (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                                                          ? const Color(0xFF10B981).withValues(alpha: 0.4)
                                                          : const Color(0xFFEF4444).withValues(alpha: 0.4),
                                                      width: 0.6,
                                                    ),
                                                  ),
                                                  child: Text(
                                                    (c.umaDirection == 'UP' || c.priceChangePct >= 0) ? 'UMA ▲' : 'UMA ▼',
                                                    style: TextStyle(
                                                      color: (c.umaDirection == 'UP' || c.priceChangePct >= 0)
                                                          ? const Color(0xFF34D399)
                                                          : const Color(0xFFF87171),
                                                      fontSize: 8,
                                                      fontWeight: FontWeight.w900,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            c.name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                          ),
                                          const SizedBox(height: 2),
                                          Row(
                                            children: [
                                              Text(
                                                '1 Lot = ${CurrencyFormatter.formatFull(c.lotPrice)}',
                                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                                              ),
                                              if (isSubsidized) ...[
                                                const SizedBox(width: 6),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                                    borderRadius: BorderRadius.circular(4),
                                                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4), width: 0.6),
                                                  ),
                                                  child: const Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      Icon(Icons.stars_rounded, color: Color(0xFF34D399), size: 9),
                                                      SizedBox(width: 2),
                                                      Text(
                                                        'SUBSIDI PPh 5%',
                                                        style: TextStyle(color: Color(0xFF34D399), fontSize: 7.5, fontWeight: FontWeight.w900),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),

                                    // Sparkline Mini Trend Chart
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 6.0),
                                      child: SizedBox(
                                        width: 52,
                                        height: 28,
                                        child: CustomPaint(
                                          painter: SparklinePainter(
                                            data: _getSparklineData(c),
                                            lineColor: isUp ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                          ),
                                        ),
                                      ),
                                    ),

                                    // Right Column: Price, Percentage & Quick Order Button
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        FittedBox(
                                          fit: BoxFit.scaleDown,
                                          child: Text(
                                            CurrencyFormatter.formatFull(c.currentPrice),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                          decoration: BoxDecoration(
                                            color: isUp
                                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                                : const Color(0xFFEF4444).withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                isUp ? Icons.arrow_drop_up_rounded : Icons.arrow_drop_down_rounded,
                                                color: isUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                                size: 13,
                                              ),
                                              Text(
                                                '${isUp ? '+' : ''}${c.priceChangePct.toStringAsFixed(2)}%',
                                                style: TextStyle(
                                                  color: isUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                                  fontSize: 9.5,
                                                  fontWeight: FontWeight.w900,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 5),
                                        InkWell(
                                          onTap: () {
                                            showModalBottomSheet(
                                              context: context,
                                              isScrollControlled: true,
                                              backgroundColor: Colors.transparent,
                                              builder: (_) => TradingModal(company: c),
                                            );
                                          },
                                          borderRadius: BorderRadius.circular(6),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              gradient: const LinearGradient(
                                                colors: [Color(0xFF10B981), Color(0xFF059669)],
                                              ),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.bolt_rounded, color: Color(0xFF022C22), size: 11),
                                                SizedBox(width: 2),
                                                Text(
                                                  'ORDER',
                                                  style: TextStyle(
                                                    color: Color(0xFF022C22),
                                                    fontSize: 9,
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
                              ),
                            ),
                          );
                        },
                        childCount: filtered.length,
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreadthBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 9.5, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildMetricBox({
    required String title,
    required List<_MetricItem> rows,
  }) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFF070E1C),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.3,
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Color(0xFF475569), size: 12),
            ],
          ),
          const SizedBox(height: 6),
          ...rows.map((r) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 1.5),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(r.label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                    Text(
                      r.value,
                      style: TextStyle(color: r.color, fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildQuickActionBtn({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
    Widget? badge,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: color.withValues(alpha: 0.3)),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                if (badge != null)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: badge,
                  ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              label,
              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricItem {
  final String label;
  final String value;
  final Color color;
  _MetricItem(this.label, this.value, this.color);
}

// REALISTIC IHSG AREA CHART PAINTER WITH HIGH/LOW BADGES & SCRUBBING
class IhsgChartPainter extends CustomPainter {
  final List<Map<String, dynamic>> points;
  final double baseLinePrice;
  final bool isBullish;
  final int? scrubIndex;
  final double highPrice;
  final double lowPrice;

  IhsgChartPainter({
    required this.points,
    required this.baseLinePrice,
    required this.isBullish,
    this.scrubIndex,
    required this.highPrice,
    required this.lowPrice,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final values = points.map((p) => (p['points'] as num).toDouble()).toList();
    final double dataMin = values.reduce(min);
    final double dataMax = values.reduce(max);
    final double spread = max(12.0, dataMax - dataMin);
    final double minVal = dataMin - (spread * 0.15);
    final double maxVal = dataMax + (spread * 0.22);
    final double range = maxVal - minVal == 0 ? 1.0 : maxVal - minVal;
    final double adjustedMin = minVal;

    final lineColor = isBullish ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    // 1. Draw Baseline (Dashed Line for Reference Price)
    final refBase = (baseLinePrice >= dataMin - spread && baseLinePrice <= dataMax + spread)
        ? baseLinePrice.clamp(minVal + 2, maxVal - 2)
        : (dataMin + dataMax) / 2;
    final baselineY = size.height - (((refBase - adjustedMin) / range) * (size.height - 28) + 14);
    final dashPaint = Paint()
      ..color = const Color(0xFF334155).withValues(alpha: 0.6)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    const dashWidth = 4.0;
    const dashSpace = 4.0;
    double startX = 0;
    while (startX < size.width) {
      canvas.drawLine(Offset(startX, baselineY), Offset(min(startX + dashWidth, size.width), baselineY), dashPaint);
      startX += dashWidth + dashSpace;
    }

    // 2. Build Smooth Spline Path
    final path = Path();
    final fillPath = Path();
    final stepX = size.width / (points.length - 1).clamp(1, double.infinity);

    int highIdx = 0;
    int lowIdx = 0;
    double curHigh = -1;
    double curLow = 99999999;

    final List<Offset> computedOffsets = [];

    for (int i = 0; i < points.length; i++) {
      final val = (points[i]['points'] as num).toDouble();
      if (val > curHigh) {
        curHigh = val;
        highIdx = i;
      }
      if (val < curLow) {
        curLow = val;
        lowIdx = i;
      }

      final x = i * stepX;
      final normY = (val - adjustedMin) / range;
      final y = size.height - (normY * (size.height - 28) + 14);
      computedOffsets.add(Offset(x, y));

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        final prevX = computedOffsets[i - 1].dx;
        final prevY = computedOffsets[i - 1].dy;
        final cX = (prevX + x) / 2;
        path.cubicTo(cX, prevY, cX, y, x, y);
        fillPath.cubicTo(cX, prevY, cX, y, x, y);
      }
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    // 3. Draw Gradient Area Fill Below Line
    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          lineColor.withValues(alpha: 0.32),
          lineColor.withValues(alpha: 0.01),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;
    canvas.drawPath(fillPath, fillPaint);

    // 4. Draw Neon Glow & Crisp Stroke Line
    final glowPaint = Paint()
      ..color = lineColor.withValues(alpha: 0.35)
      ..strokeWidth = 5.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, glowPaint);

    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, linePaint);

    // 5. Draw High & Low Badges (like real IHSG app)
    if (computedOffsets.isNotEmpty) {
      final highOffset = computedOffsets[highIdx];
      final lowOffset = computedOffsets[lowIdx];

      _drawFlagBadge(canvas, 'H: ${curHigh.toStringAsFixed(1)}', highOffset, const Color(0xFF10B981), isTop: true, maxWidth: size.width);
      _drawFlagBadge(canvas, 'L: ${curLow.toStringAsFixed(1)}', lowOffset, const Color(0xFFF87171), isTop: false, maxWidth: size.width);
    }

    // 6. Draw Interactive Scrubbing Guideline & Dot Indicator
    if (scrubIndex != null && scrubIndex! < computedOffsets.length) {
      final scrubOffset = computedOffsets[scrubIndex!];

      // Vertical dashed line
      final scrubLinePaint = Paint()
        ..color = const Color(0xFF38BDF8).withValues(alpha: 0.7)
        ..strokeWidth = 1.2
        ..style = PaintingStyle.stroke;

      double sy = 0;
      while (sy < size.height) {
        canvas.drawLine(Offset(scrubOffset.dx, sy), Offset(scrubOffset.dx, min(sy + 4, size.height)), scrubLinePaint);
        sy += 8;
      }

      // Outer glow circle
      canvas.drawCircle(
        scrubOffset,
        7.0,
        Paint()
          ..color = const Color(0xFF38BDF8).withValues(alpha: 0.25)
          ..style = PaintingStyle.fill,
      );

      // Inner dot
      canvas.drawCircle(
        scrubOffset,
        3.5,
        Paint()
          ..color = const Color(0xFF38BDF8)
          ..style = PaintingStyle.fill,
      );
    }
  }

  void _drawFlagBadge(Canvas canvas, String text, Offset point, Color color, {required bool isTop, required double maxWidth}) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: color,
          fontSize: 8.5,
          fontWeight: FontWeight.w900,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    final badgeWidth = textPainter.width + 8;
    final badgeHeight = textPainter.height + 4;
    final double badgeX = (point.dx - (badgeWidth / 2)).clamp(4.0, maxWidth - badgeWidth - 4);
    final double badgeY = isTop ? (point.dy - badgeHeight - 4) : (point.dy + 4);

    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(badgeX, badgeY, badgeWidth, badgeHeight),
      const Radius.circular(4),
    );

    // Background pill
    canvas.drawRRect(
      rrect,
      Paint()..color = const Color(0xFF0F172A).withValues(alpha: 0.95),
    );
    canvas.drawRRect(
      rrect,
      Paint()
        ..color = color.withValues(alpha: 0.6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 0.8,
    );

    // Text
    textPainter.paint(canvas, Offset(badgeX + 4, badgeY + 2));
  }

  @override
  bool shouldRepaint(covariant IhsgChartPainter oldDelegate) {
    return oldDelegate.points != points ||
        oldDelegate.scrubIndex != scrubIndex ||
        oldDelegate.isBullish != isBullish;
  }
}

// Sparkline Mini Chart Painter
class SparklinePainter extends CustomPainter {
  final List<double> data;
  final Color lineColor;
  final bool showFill;

  SparklinePainter({
    required this.data,
    required this.lineColor,
    this.showFill = true,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;

    final double minVal = data.reduce(min);
    final double maxVal = data.reduce(max);
    final double range = maxVal - minVal == 0 ? 1.0 : maxVal - minVal;

    final path = Path();
    final fillPath = Path();

    final stepX = size.width / (data.length - 1).clamp(1, double.infinity);

    for (int i = 0; i < data.length; i++) {
      final x = i * stepX;
      final normY = (data[i] - minVal) / range;
      final y = size.height - (normY * (size.height - 4) + 2);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        final prevX = (i - 1) * stepX;
        final prevNormY = (data[i - 1] - minVal) / range;
        final prevY = size.height - (prevNormY * (size.height - 4) + 2);
        final cX = (prevX + x) / 2;
        path.cubicTo(cX, prevY, cX, y, x, y);
        fillPath.cubicTo(cX, prevY, cX, y, x, y);
      }
    }

    if (showFill) {
      fillPath.lineTo(size.width, size.height);
      fillPath.close();

      final fillPaint = Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            lineColor.withValues(alpha: 0.35),
            lineColor.withValues(alpha: 0.0),
          ],
        ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
        ..style = PaintingStyle.fill;

      canvas.drawPath(fillPath, fillPaint);
    }

    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 1.6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(covariant SparklinePainter oldDelegate) {
    return oldDelegate.data != data || oldDelegate.lineColor != lineColor;
  }
}
