import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/user.dart';
import '../../../providers/game_provider.dart';
import '../../../utils/formatters.dart';
import '../services/deals_service.dart';

class FormalDeedModal extends StatelessWidget {
  final Map<String, dynamic> entity;
  final UserModel seller;
  final String buyerType;
  final dynamic buyerCandidate;
  final double pctToSell;
  final int sharesSold;
  final int lotsSold;
  final double pricePerShare;
  final double grossProceeds;
  final double netProceeds;

  const FormalDeedModal({
    super.key,
    required this.entity,
    required this.seller,
    required this.buyerType,
    required this.buyerCandidate,
    required this.pctToSell,
    required this.sharesSold,
    required this.lotsSold,
    required this.pricePerShare,
    required this.grossProceeds,
    required this.netProceeds,
  });

  static void show(
    BuildContext context, {
    required Map<String, dynamic> entity,
    required UserModel seller,
    required String buyerType,
    required dynamic buyerCandidate,
    required double pctToSell,
    required int sharesSold,
    required int lotsSold,
    required double pricePerShare,
    required double grossProceeds,
    required double netProceeds,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dlgCtx) => FormalDeedModal(
        entity: entity,
        seller: seller,
        buyerType: buyerType,
        buyerCandidate: buyerCandidate,
        pctToSell: pctToSell,
        sharesSold: sharesSold,
        lotsSold: lotsSold,
        pricePerShare: pricePerShare,
        grossProceeds: grossProceeds,
        netProceeds: netProceeds,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String buyerName = buyerType == 'P2P' && buyerCandidate != null
        ? '${buyerCandidate['username']} (${buyerCandidate['pt_name'] ?? 'Konglomerat'})'
        : 'Konsorsium Publik & Investor Institusi Global Federasi';

    final String aktaNo =
        'AKTA/IPMC/${DateTime.now().year}${DateTime.now().month.toString().padLeft(2, '0')}/${1000 + (DateTime.now().millisecond % 9000)}';

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0A0F1D),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF5B942), width: 2),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF5B942).withValues(alpha: 0.2),
              blurRadius: 30,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header Akta Perjanjian
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                ),
                borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                border: Border(bottom: BorderSide(color: Color(0xFF334155))),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5B942).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFF5B942)),
                    ),
                    child: const Icon(Icons.account_balance_rounded, color: Color(0xFFF5B942), size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'OTORITAS BURSA EFEK & PASAR MODAL IPMC',
                          style: TextStyle(
                            color: Color(0xFFF5B942),
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const Text(
                          'AKTA PERJANJIAN JUAL BELI SAHAM KORPORASI',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        Text('Nomor: $aktaNo', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontFamily: 'monospace')),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8), size: 18),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Isi Akta Perjanjian
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Pernyataan Pembuka
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070B14),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: const Text(
                        'Pada hari ini telah disepakati perjanjian pemindahtanganan hak kepemilikan saham perseroan terbatas secara sah dan mengikat antara para pihak di hadapan Otoritas Pasar Modal Republik Federasi Indigo:',
                        style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10, height: 1.4),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Komparisi Para Pihak
                    _buildContractPartyCard(
                      'PIHAK PERTAMA (PENJUAL / PEMILIK ASAL)',
                      seller.username,
                      seller.ptName.isNotEmpty ? seller.ptName : 'Pendiri Perusahaan',
                      const Color(0xFF38BDF8),
                    ),
                    const SizedBox(height: 8),
                    _buildContractPartyCard(
                      'PIHAK KEDUA (PEMBELI / INVESTOR BARU)',
                      buyerName,
                      buyerType == 'P2P' ? 'Investor Strategis' : 'Konsorsium Mitra Bursa IPMC',
                      const Color(0xFF10B981),
                    ),
                    const SizedBox(height: 14),

                    // Rincian Saham & Nilai Transaksi
                    const Text(
                      'KLAUSUL OBJEK & NILAI PERALIHAN HAK:',
                      style: TextStyle(color: Color(0xFFF5B942), fontSize: 10, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070B14),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        children: [
                          _buildContractRow('Perseroan Terbitan', '${entity['name']} (${entity['symbol']})'),
                          _buildContractRow('Porsi Saham Dialihkan', '${pctToSell.toStringAsFixed(1)}% Saham Disetor'),
                          _buildContractRow(
                            'Kuantitas Saham',
                            '${CurrencyFormatter.formatFull(lotsSold.toDouble()).replaceAll('IB ', '')} Lot (${CurrencyFormatter.formatFull(sharesSold.toDouble()).replaceAll('IB ', '')} Lembar)',
                          ),
                          _buildContractRow('Harga Eksekusi Per Lembar', CurrencyFormatter.formatFull(pricePerShare)),
                          const Divider(color: Color(0xFF1E293B), height: 12),
                          _buildContractRow('Total Nilai Transaksi', CurrencyFormatter.formatFull(grossProceeds), isHighlight: true),
                          _buildContractRow('Dana Bersih Masuk Kas Pribadi', CurrencyFormatter.formatFull(netProceeds), isSuccess: true),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Klausul Pengendali
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.verified_user_rounded, color: Color(0xFFF59E0B), size: 14),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Klausul Hukum: Hak suara dan hak dividen atas porsi saham tersebut beralih seketika kepada Pembeli. Dana hasil penjualan disetorkan tunai ke Kas Pribadi Penjual.',
                              style: TextStyle(color: Color(0xFFFDE68A), fontSize: 9.5, height: 1.3),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Meterai Digital
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.6)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified_rounded, color: Color(0xFFF5B942), size: 14),
                            SizedBox(width: 6),
                            Text(
                              'METERAI DIGITAL RESMI REPUBLIK FEDERASI IB 10.000 (LUNAS)',
                              style: TextStyle(color: Color(0xFFF5B942), fontSize: 8.5, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Tombol Tandatangan Digital & Eksekusi
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('⏳ Mendaftarkan Akta Perjanjian ke Notaris & Pasar...'),
                        backgroundColor: Color(0xFF38BDF8),
                      ),
                    );

                    final res = await DealsService.createDeal(
                      sellerUserId: seller.id,
                      companyId: entity['id']?.toString() ?? 'primary',
                      percentage: pctToSell,
                      pricePerShare: pricePerShare,
                      targetType: buyerType,
                      buyerUserId: buyerType == 'P2P' && buyerCandidate != null ? buyerCandidate['id'] : null,
                      termsNotes: 'Pengalihan $pctToSell% (${CurrencyFormatter.formatNumber(sharesSold)} lbr) ke $buyerName',
                    );

                    if (!context.mounted) return;
                    if (res['error'] != null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('❌ Gagal: ${res['error']}'), backgroundColor: Colors.red),
                      );
                    } else {
                      final prov = context.read<GameProvider>();
                      await prov.fetchConglomerate();
                      await prov.refreshPortfolio();
                      if (context.mounted) {
                        final String infoMsg = buyerType == 'P2P'
                            ? '📜 Akta Draft Berhasil Dibuat!\nTawaran telah dikirim ke $buyerName untuk ditandatangani. Saham Anda dialokasikan di Escrow.'
                            : '🌐 Penawaran Saham Terbuka Berhasil Terdaftar di Katalog Global!\nKonglomerat lain kini dapat membeli saham ini secara penuh atau parsial.';
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(infoMsg),
                            backgroundColor: const Color(0xFF10B981),
                            duration: const Duration(seconds: 5),
                          ),
                        );
                      }
                    }
                  },
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.draw_rounded, size: 18),
                      SizedBox(width: 8),
                      Text('✍️ TANDATANGANI & TERBITKAN DOKUMEN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContractPartyCard(String role, String name, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF070B14),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 28,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(role, style: TextStyle(color: color, fontSize: 8.5, fontWeight: FontWeight.w900)),
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                Text(subtitle, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContractRow(String label, String value, {bool isHighlight = false, bool isSuccess = false}) {
    Color valColor = Colors.white;
    if (isHighlight) valColor = const Color(0xFFF5B942);
    if (isSuccess) valColor = const Color(0xFF34D399);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
          Text(
            value,
            style: TextStyle(
              color: valColor,
              fontSize: 10,
              fontWeight: isHighlight || isSuccess ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
