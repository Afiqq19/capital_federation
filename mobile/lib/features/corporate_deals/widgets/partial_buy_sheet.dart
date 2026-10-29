import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../utils/formatters.dart';
import '../models/deal_model.dart';
import '../services/deals_service.dart';

class PartialBuySheet extends StatefulWidget {
  final PrivateDealModel deal;
  final VoidCallback onComplete;

  const PartialBuySheet({
    super.key,
    required this.deal,
    required this.onComplete,
  });

  static void show(BuildContext context, PrivateDealModel deal, VoidCallback onComplete) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PartialBuySheet(deal: deal, onComplete: onComplete),
    );
  }

  @override
  State<PartialBuySheet> createState() => _PartialBuySheetState();
}

class _PartialBuySheetState extends State<PartialBuySheet> {
  late double _selectedPct;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Default beli 1% atau sisa maksimal jika tersisa < 1%
    _selectedPct = widget.deal.percentageRemaining >= 1.0 ? 1.0 : widget.deal.percentageRemaining;
  }

  @override
  Widget build(BuildContext context) {
    final gameProvider = context.watch<GameProvider>();
    final user = gameProvider.user;

    const int totalShares = 10000000;
    final int sharesToBuy = (totalShares * (_selectedPct / 100.0)).round();
    final int lotsToBuy = (sharesToBuy / 100).round();
    final double grossAmount = sharesToBuy * widget.deal.pricePerShare;
    final double adminFee = grossAmount * 0.001; // 0.1% pajak transaksi
    const double meteraiFee = 10000.0; // Bea Meterai Digital Konoha
    final double totalRequired = grossAmount + adminFee + meteraiFee;

    final double userBalance = user?.balanceIb ?? 0.0;
    final bool canAfford = userBalance >= totalRequired;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: Color(0xFF10B981), width: 2)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
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
            const SizedBox(height: 16),

            // Header info
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                  ),
                  child: const Icon(Icons.shopping_bag_rounded, color: Color(0xFF10B981), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PEMBELIAN SAHAM',
                        style: TextStyle(color: const Color(0xFF10B981).withValues(alpha: 0.9), fontSize: 9.5, fontWeight: FontWeight.w900, letterSpacing: 0.8),
                      ),
                      Text(
                        widget.deal.companyName,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Dijual oleh: ${widget.deal.sellerName}',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Tersedia & Slider
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Porsi Saham yang Dibeli', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w600)),
                      Text(
                        '${_selectedPct.toStringAsFixed(1)}% / ${widget.deal.percentageRemaining.toStringAsFixed(1)}% Max',
                        style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Slider(
                    value: _selectedPct.clamp(0.1, widget.deal.percentageRemaining),
                    min: 0.1,
                    max: widget.deal.percentageRemaining,
                    divisions: (widget.deal.percentageRemaining * 10).round().clamp(1, 100),
                    activeColor: const Color(0xFF10B981),
                    inactiveColor: const Color(0xFF334155),
                    onChanged: (val) {
                      setState(() {
                        _selectedPct = double.parse(val.toStringAsFixed(1));
                      });
                    },
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildPresetChip('0.5%', 0.5),
                      _buildPresetChip('1.0%', 1.0),
                      _buildPresetChip('2.0%', 2.0),
                      _buildPresetChip('5.0%', 5.0),
                      _buildPresetChip('Semua (${widget.deal.percentageRemaining.toStringAsFixed(1)}%)', widget.deal.percentageRemaining),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Rincian Akta & Perhitungan
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: [
                  _buildCostRow('Volume Lembar Saham', '${CurrencyFormatter.formatNumber(sharesToBuy)} lembar (${CurrencyFormatter.formatNumber(lotsToBuy)} lot)'),
                  _buildCostRow('Harga Eksekusi per Lembar', 'IB ${widget.deal.pricePerShare.toStringAsFixed(0)}'),
                  _buildCostRow('Nilai Saham Bersih', CurrencyFormatter.formatFull(grossAmount)),
                  _buildCostRow('Pajak Transaksi BSK (0.1%)', CurrencyFormatter.formatFull(adminFee)),
                  _buildCostRow('Bea Meterai Digital PNAK', CurrencyFormatter.formatFull(meteraiFee)),
                  const Divider(color: Color(0xFF334155), height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('TOTAL DANA DIBAYAR', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.w900)),
                      Text(
                        CurrencyFormatter.formatFull(totalRequired),
                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Saldo Kas Pribadi Anda', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                      Text(
                        CurrencyFormatter.formatFull(userBalance),
                        style: TextStyle(
                          color: canAfford ? const Color(0xFF34D399) : const Color(0xFFEF4444),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Tombol Eksekusi
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: canAfford ? const Color(0xFF10B981) : const Color(0xFF475569),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: (_isLoading || !canAfford)
                    ? null
                    : () async {
                        if (user == null) return;
                        setState(() => _isLoading = true);
                        try {
                          final messenger = ScaffoldMessenger.of(context);
                          final nav = Navigator.of(context);
                          final res = await DealsService.signAndPay(
                            dealId: widget.deal.id,
                            buyerUserId: user.id,
                            customPercentage: _selectedPct,
                          );

                          if (!mounted) return;
                          setState(() => _isLoading = false);

                          if (res['error'] != null) {
                            messenger.showSnackBar(
                              SnackBar(content: Text('❌ Gagal: ${res['error']}'), backgroundColor: Colors.red),
                            );
                          } else {
                            nav.pop();
                            await gameProvider.fetchConglomerate();
                            await gameProvider.refreshPortfolio();
                            widget.onComplete();

                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(
                                  '🎉 Sukses Membeli ${_selectedPct.toStringAsFixed(1)}% Saham ${widget.deal.companyName}!\n'
                                  'Akta Notaris ${res['deedNumber'] ?? ''} telah tersimpan di Brankas Akta.',
                                ),
                                backgroundColor: const Color(0xFF10B981),
                                duration: const Duration(seconds: 4),
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) setState(() => _isLoading = false);
                        }
                      },
                child: _isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.draw_rounded, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            canAfford ? '✍️ TANDATANGANI AKTA & BAYAR DANA' : 'SALDO KAS TIDAK MENCUKUPI',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetChip(String label, double val) {
    final bool isSelected = (_selectedPct - val).abs() < 0.05;
    final bool isAvailable = val <= widget.deal.percentageRemaining;

    return InkWell(
      onTap: isAvailable ? () => setState(() => _selectedPct = val) : null,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF10B981)
              : (isAvailable ? const Color(0xFF334155) : const Color(0xFF1E293B)),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? Colors.white
                : (isAvailable ? const Color(0xFFCBD5E1) : const Color(0xFF475569)),
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildCostRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
