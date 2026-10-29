import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';

void showSovereignBondsModal(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => const _SovereignBondsSheet(),
  );
}

class _SovereignBondsSheet extends StatefulWidget {
  const _SovereignBondsSheet();

  @override
  State<_SovereignBondsSheet> createState() => _SovereignBondsSheetState();
}

class _SovereignBondsSheetState extends State<_SovereignBondsSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GameProvider>().fetchBonds();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final user = provider.user;
    final bonds = provider.activeBonds;
    final myHoldings = provider.myBondHoldings;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: Color(0xFF10B981), width: 2.0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
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

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF065F46), Color(0xFF047857)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF34D399).withValues(alpha: 0.4)),
                ),
                child: const Icon(Icons.shield_outlined, color: Color(0xFF6EE7B7), size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SURAT UTANG NEGARA (SBN)',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.4,
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 12),
                        const SizedBox(width: 4),
                        const Text(
                          'Kementerian Keuangan & Kas Negara',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Summary Cash Card
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF070B14),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF38BDF8), size: 16),
                    const SizedBox(width: 6),
                    const Text('Kas Tabungan Pribadi:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  ],
                ),
                Text(
                  CurrencyFormatter.formatFull(user?.balanceIb ?? 0.0),
                  style: const TextStyle(
                    color: Color(0xFF38BDF8),
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Tabs
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(8),
              ),
              labelColor: const Color(0xFF022C22),
              unselectedLabelColor: const Color(0xFF94A3B8),
              labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
              tabs: [
                Tab(text: 'PENAWARAN AKTIF (${bonds.length})'),
                Tab(text: 'PORTOFOLIO SAYA (${myHoldings.length})'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Tab views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildActiveBondsList(context, provider, bonds),
                _buildMyHoldingsList(context, myHoldings),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveBondsList(BuildContext context, GameProvider provider, List<Map<String, dynamic>> bonds) {
    if (bonds.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.hourglass_empty_rounded, color: Color(0xFF64748B), size: 36),
            SizedBox(height: 8),
            Text(
              'Belum ada seri SBN yang sedang ditawarkan pemerintah.',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: bonds.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final b = bonds[i];
        final code = b['bond_code']?.toString() ?? b['code']?.toString() ?? 'SBN';
        final name = b['title']?.toString() ?? b['name']?.toString() ?? 'Obligasi Ritel';
        final rate = (b['coupon_rate_pct'] ?? b['interestRatePct'] ?? b['interest_rate_pct'] ?? 7.0) as num;
        final couponType = b['couponType']?.toString() ?? b['coupon_type']?.toString() ?? 'FIXED';
        final totalQuota = ((b['total_quota_ib'] ?? b['targetQuotaIb'] ?? b['target_quota_ib'] ?? 1000000000) as num).toDouble();
        final orderedAmt = ((b['ordered_quota_ib'] ?? b['orderedAmountIb'] ?? b['ordered_amount_ib'] ?? 0) as num).toDouble();
        final remainingQuota = (totalQuota - orderedAmt).clamp(0.0, totalQuota);
        final pctOrdered = (orderedAmt / (totalQuota > 0 ? totalQuota : 1.0)).clamp(0.0, 1.0);
        final tenorDays = (b['tenor_days'] ?? b['tenorDays'] ?? 7) as num;

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF070B14),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      code,
                      style: const TextStyle(
                        color: Color(0xFF34D399),
                        fontWeight: FontWeight.w900,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '$couponType RATE • TENOR $tenorDays HARI',
                      style: const TextStyle(
                        color: Color(0xFF38BDF8),
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),

              // Coupon highlight
              Row(
                children: [
                  const Text('Kupon Imbal Hasil: ', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  Text(
                    '${rate.toStringAsFixed(2)}% per tahun',
                    style: const TextStyle(
                      color: Color(0xFF34D399),
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Quota progress bar
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Terserap: ${(pctOrdered * 100).toStringAsFixed(1)}%',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                      ),
                      Text(
                        'Sisa Kuota: ${CurrencyFormatter.formatFull(remainingQuota)}',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: pctOrdered,
                      minHeight: 6,
                      backgroundColor: const Color(0xFF1E293B),
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Order button
              SizedBox(
                width: double.infinity,
                height: 38,
                child: ElevatedButton.icon(
                  onPressed: remainingQuota <= 0
                      ? null
                      : () => _showOrderBondDialog(context, provider, b),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: const Color(0xFF022C22),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.shopping_cart_checkout_rounded, size: 16),
                  label: Text(
                    remainingQuota <= 0 ? 'KUOTA NASIONAL HABIS' : 'PESAN OBLIGASI (MIN. IB 1.000.000)',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMyHoldingsList(BuildContext context, List<Map<String, dynamic>> holdings) {
    if (holdings.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_outlined, color: Color(0xFF64748B), size: 36),
            SizedBox(height: 8),
            Text(
              'Anda belum memiliki portofolio Surat Utang Negara.',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            SizedBox(height: 4),
            Text(
              'Beli seri ORI atau SBR untuk menikmati kupon bunga pasif rutin.',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: holdings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, i) {
        final h = holdings[i];
        final code = h['bond_code']?.toString() ?? h['code']?.toString() ?? 'SBN';
        final name = h['bond_title']?.toString() ?? h['title']?.toString() ?? h['name']?.toString() ?? 'Obligasi Pemerintah';
        final units = ((h['units_owned'] ?? h['unitsCount'] ?? h['units_count'] ?? 1) as num).toInt();
        final principal = ((h['total_investment_ib'] ?? h['principalInvestedIb'] ?? h['principal_invested_ib'] ?? 0) as num).toDouble();
        final couponClaimed = ((h['total_coupon_earned_ib'] ?? h['totalCouponReceivedIb'] ?? h['total_coupon_received_ib'] ?? 0) as num).toDouble();
        final rate = (h['coupon_rate_pct'] ?? h['interestRatePct'] ?? h['interest_rate_pct'] ?? 7.0) as num;

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF070B14),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '$code • $units Unit',
                    style: const TextStyle(
                      color: Color(0xFF34D399),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'STATUS: AKTIF MENYICIL KUPON',
                      style: TextStyle(color: Color(0xFF34D399), fontSize: 8.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                name,
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const Divider(color: Color(0xFF1E293B), height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Pokok Investasi', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      Text(
                        CurrencyFormatter.formatFull(principal),
                        style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Total Kupon Cair', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      Text(
                        '+${CurrencyFormatter.formatFull(couponClaimed)}',
                        style: const TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Kupon ${rate.toStringAsFixed(2)}% dicairkan setiap siklus kas negara langsung ke Kas Tabungan Pribadi Anda.',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showOrderBondDialog(BuildContext context, GameProvider provider, Map<String, dynamic> bond) {
    final bondId = bond['id']?.toString() ?? '';
    final code = bond['bond_code']?.toString() ?? bond['code']?.toString() ?? 'SBN';
    final name = bond['title']?.toString() ?? bond['name']?.toString() ?? 'Obligasi Ritel';
    final unitPrice = ((bond['unitPriceIb'] ?? bond['unit_price_ib'] ?? 1000000.0) as num).toDouble();
    final rate = (bond['coupon_rate_pct'] ?? bond['interestRatePct'] ?? bond['interest_rate_pct'] ?? 7.0) as num;
    final userBalance = provider.user?.balanceIb ?? 0.0;

    int selectedUnits = 1;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          final totalCost = selectedUnits * unitPrice;
          final bool canAfford = userBalance >= totalCost;
          final estCouponPerCycle = totalCost * (rate / 100) * (25.0 / (365 * 24 * 60)); // cycle estimation

          return AlertDialog(
            backgroundColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
            ),
            title: Row(
              children: [
                const Icon(Icons.verified_outlined, color: Color(0xFF10B981), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Pemesanan $code',
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  const SizedBox(height: 12),
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
                            const Text('Harga 1 Unit SBN:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                            Text(CurrencyFormatter.formatFull(unitPrice), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Kas Pribadi Anda:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                            Text(
                              CurrencyFormatter.formatFull(userBalance),
                              style: TextStyle(
                                color: canAfford ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Unit Selector
                  const Text('Pilih Jumlah Unit Pembelian:', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        onPressed: selectedUnits > 1 ? () => setDialogState(() => selectedUnits--) : null,
                        icon: const Icon(Icons.remove_circle_outline_rounded, color: Color(0xFF38BDF8), size: 28),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$selectedUnits Unit',
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                        ),
                      ),
                      IconButton(
                        onPressed: (selectedUnits + 1) * unitPrice <= userBalance ? () => setDialogState(() => selectedUnits++) : null,
                        icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF38BDF8), size: 28),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Quick presets
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [1, 5, 10, 25].map((u) {
                      return InkWell(
                        onTap: () => setDialogState(() => selectedUnits = u),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: selectedUnits == u ? const Color(0xFF10B981) : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '$u Unit',
                            style: TextStyle(
                              color: selectedUnits == u ? const Color(0xFF022C22) : const Color(0xFF94A3B8),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 20),

                  // Total & Payout Info
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Pembayaran:', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      Text(
                        CurrencyFormatter.formatFull(totalCost),
                        style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Kupon Imbal Hasil:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      Text('${rate.toStringAsFixed(2)}% p.a. (dijamin negara)', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Estimasi Kupon / Siklus:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      Text('+${CurrencyFormatter.formatFull(estCouponPerCycle)}', style: const TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('BATAL', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
              ),
              ElevatedButton(
                onPressed: !canAfford
                    ? null
                    : () async {
                        Navigator.pop(ctx);
                        final res = await provider.orderSovereignBond(
                          bondId: bondId,
                          units: selectedUnits.toDouble(),
                        );
                        if (context.mounted) {
                          if (res['success'] == true) {
                            // Pindah ke tab Portofolio Saya
                            _tabController.animateTo(1);
                            // Tampilkan Dialog Notifikasi Sukses Pembelian
                            _showOrderSuccessDialog(
                              context,
                              bondCode: code,
                              title: name,
                              units: selectedUnits,
                              totalCost: totalCost,
                              rate: rate.toDouble(),
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Row(
                                  children: [
                                    const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 18),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        '🎉 Berhasil membeli $selectedUnits Unit $code (${CurrencyFormatter.formatFull(totalCost)})! Kupon bunga aktif.',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                                backgroundColor: const Color(0xFF065F46),
                                duration: const Duration(seconds: 4),
                              ),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(res['error'] ?? res['message'] ?? 'Pemesanan obligasi gagal!'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: const Color(0xFF022C22),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('KONFIRMASI BELI', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- DIALOG NOTIFIKASI SUKSES PEMBELIAN SURAT UTANG NEGARA ---
  void _showOrderSuccessDialog(
    BuildContext context, {
    required String bondCode,
    required String title,
    required int units,
    required double totalCost,
    required double rate,
  }) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF10B981), width: 1.8),
        ),
        title: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.18),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF34D399), width: 1.5),
              ),
              child: const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 40),
            ),
            const SizedBox(height: 12),
            const Text(
              '🎉 PEMBELIAN SBN BERHASIL!',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'RESMI MEMILIKI $units UNIT $bondCode',
                  style: const TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.w900),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
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
                      const Text('Seri Obligasi:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '$bondCode ($title)',
                          textAlign: TextAlign.end,
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Jumlah Terbeli:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text('$units Unit SBN', style: const TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.w900)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Investasi:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text(CurrencyFormatter.formatFull(totalCost), style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Kupon Bunga Pasif:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text('${rate.toStringAsFixed(2)}% p.a.', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF065F46).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: Color(0xFF34D399), size: 16),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Kupon bunga pasif akan otomatis dicairkan oleh Kas Negara setiap siklus langsung masuk ke Kas Pribadi Anda.',
                      style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 9.5, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: const Color(0xFF022C22),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('LIHAT PORTOFOLIO SAYA', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
