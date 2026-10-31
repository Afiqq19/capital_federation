import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/company.dart';
import '../providers/game_provider.dart';

/// Membuka BottomSheet Pengajuan Proposal Akuisisi M&A & Tender Offer Saham Pengendali
void showTakeoverModalSheet(
  BuildContext context,
  CompanyModel company, {
  VoidCallback? onCompleted,
}) {
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
        Color tierColor = const Color(0xFF10B981);

        if (offerTier == 'MARKET_FAIR') {
          discountFactor = 1.00;
          tierColor = const Color(0xFF38BDF8);
        } else if (offerTier == 'PREMIUM_15') {
          discountFactor = 1.15;
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
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PROPOSAL AKUISISI & TENDER OFFER',
                            style: TextStyle(color: Color(0xFFF59E0B), fontSize: 13, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            'Sidang RUPS Luar Biasa & Pengambilalihan ${company.symbol}',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Kotak Pendiri -> Pembeli
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B).withValues(alpha: 0.50),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Pendiri / Pengendali:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                            const SizedBox(height: 2),
                            Text(
                              '@$sellerName',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            const Text(
                              '51.0% Saham Pengendali',
                              style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_rounded, color: Color(0xFF64748B), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Pihak Pengakuisisi:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                            const SizedBox(height: 2),
                            Text(
                              '@$buyerName',
                              style: const TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            Text(
                              'Target: $percentage% Saham',
                              style: const TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Opsi Penawaran (Discount / Premium)
                const Text('1. Skema Harga Penawaran RUPS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildTierOption(
                      title: 'Krisis (-30%)',
                      desc: 'Diskon restrukturisasi',
                      isSelected: offerTier == 'RESCUE_30',
                      color: const Color(0xFF10B981),
                      onTap: () => setSheetState(() => offerTier = 'RESCUE_30'),
                    ),
                    const SizedBox(width: 8),
                    _buildTierOption(
                      title: 'Wajar (0%)',
                      desc: 'Harga pasar bursa',
                      isSelected: offerTier == 'MARKET_FAIR',
                      color: const Color(0xFF38BDF8),
                      onTap: () => setSheetState(() => offerTier = 'MARKET_FAIR'),
                    ),
                    const SizedBox(width: 8),
                    _buildTierOption(
                      title: 'Premi (+15%)',
                      desc: 'Sultan (100% RUPS)',
                      isSelected: offerTier == 'PREMIUM_15',
                      color: const Color(0xFFF59E0B),
                      onTap: () => setSheetState(() => offerTier = 'PREMIUM_15'),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Porsi Saham Diakuisisi
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('2. Porsi Saham Diakuisisi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    Text('$percentage%', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w900, fontSize: 15)),
                  ],
                ),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: const Color(0xFFF59E0B),
                    inactiveTrackColor: const Color(0xFF334155),
                    thumbColor: const Color(0xFFF59E0B),
                    overlayColor: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                  ),
                  child: Slider(
                    value: percentage.toDouble(),
                    min: 20,
                    max: 100,
                    divisions: 80,
                    onChanged: (val) => setSheetState(() => percentage = val.round()),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('20% (Kemitraan/Komisaris)', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                    const Text('51% (Pengendali Mayoritas)', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold)),
                    const Text('100% (Saham Penuh)', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                  ],
                ),
                const SizedBox(height: 14),

                // Pilih Sumber Rekening
                const Text('3. Sumber Pembayaran', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setSheetState(() => paymentSource = 'PERSONAL'),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: paymentSource == 'PERSONAL'
                                ? const Color(0xFF38BDF8).withValues(alpha: 0.15)
                                : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: paymentSource == 'PERSONAL' ? const Color(0xFF38BDF8) : const Color(0xFF334155),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Kas Pribadi', style: TextStyle(color: paymentSource == 'PERSONAL' ? const Color(0xFF38BDF8) : Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text('IB ${currencyFormatter.format(personalBal)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setSheetState(() => paymentSource = 'COMPANY'),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: paymentSource == 'COMPANY'
                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: paymentSource == 'COMPANY' ? const Color(0xFF10B981) : const Color(0xFF334155),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Kas Perusahaan (PT)', style: TextStyle(color: paymentSource == 'COMPANY' ? const Color(0xFF10B981) : Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text('IB ${currencyFormatter.format(companyBal)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Ringkasan Biaya Akuisisi & Notaris
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Column(
                    children: [
                      _buildSummaryRow('Harga Saham:', 'IB ${currencyFormatter.format(offerPricePerShare)} / lbr', tierColor),
                      const SizedBox(height: 4),
                      _buildSummaryRow('Volume Dialihkan:', '${currencyFormatter.format(lotsTransferred)} Lot', Colors.white),
                      const SizedBox(height: 4),
                      _buildSummaryRow('Bea Meterai & Akta Notaris:', 'IB 50.000', const Color(0xFF64748B)),
                      const Divider(color: Color(0xFF1E293B), height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('TOTAL NILAI AKUISISI:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                          Text(
                            'IB ${currencyFormatter.format(totalDeduction)}',
                            style: TextStyle(
                              color: canAfford ? const Color(0xFFF59E0B) : const Color(0xFFEF4444),
                              fontWeight: FontWeight.w900,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Tombol Submit
                SizedBox(
                  width: double.infinity,
                  height: 44,
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
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(res['message'] ?? 'Proposal dikirim ke Pendiri untuk disetujui!'),
                                    backgroundColor: const Color(0xFF0284C7),
                                  ),
                                );
                              } else {
                                _showTakeoverSuccessDialog(context, res['deed'], res['founderApproval'], company);
                              }
                              onCompleted?.call();
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(res['error'] ?? 'Gagal memproses proposal akuisisi'),
                                  backgroundColor: const Color(0xFFEF4444),
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
  required String desc,
  required bool isSelected,
  required Color color,
  required VoidCallback onTap,
}) {
  return Expanded(
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? color : const Color(0xFF334155), width: isSelected ? 1.5 : 1),
        ),
        child: Column(
          children: [
            Text(title, style: TextStyle(color: isSelected ? color : Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(desc, style: const TextStyle(color: Color(0xFF64748B), fontSize: 8.5), textAlign: TextAlign.center),
          ],
        ),
      ),
    ),
  );
}

Widget _buildSummaryRow(String label, String value, Color valueColor) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
      Text(value, style: TextStyle(color: valueColor, fontSize: 11, fontWeight: FontWeight.bold)),
    ],
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

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
      ),
      title: const Row(
        children: [
          Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 24),
          SizedBox(width: 8),
          Expanded(
            child: Text('AKUISISI RESMI BERHASIL', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 14, fontWeight: FontWeight.w900)),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Selamat! Pengambilalihan ${company.name} (${company.symbol}) telah disahkan oleh Notariat Bursa Efek IPMC.',
            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5, height: 1.4),
          ),
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
                _buildSummaryRow('No. Akta Notaris:', deed['deed_number'] ?? 'AKTA-MA/2026/01', const Color(0xFF38BDF8)),
                const SizedBox(height: 4),
                _buildSummaryRow('Hak Suara Diakuisisi:', '${deed['percentage_transferred']}% Saham', const Color(0xFFF59E0B)),
                const SizedBox(height: 4),
                _buildSummaryRow('Total Nilai Transaksi:', 'IB ${currencyFormatter.format(deed['raw_price_ib'] ?? 0)}', Colors.white),
              ],
            ),
          ),
        ],
      ),
      actions: [
        ElevatedButton(
          onPressed: () => Navigator.pop(ctx),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFF59E0B),
            foregroundColor: const Color(0xFF451A03),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: const Text('TUTUP & LIHAT PORTOFOLIO', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
        ),
      ],
    ),
  );
}
