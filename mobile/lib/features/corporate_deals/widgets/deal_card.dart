import 'package:flutter/material.dart';
import '../../../utils/formatters.dart';
import '../models/deal_model.dart';
import '../services/deals_service.dart';
import 'partial_buy_sheet.dart';

class DealCard extends StatelessWidget {
  final PrivateDealModel deal;
  final String currentUserId;
  final bool isInbox;
  final VoidCallback onRefresh;

  const DealCard({
    super.key,
    required this.deal,
    required this.currentUserId,
    this.isInbox = false,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    const int totalShares = 10000000;
    final int sharesAvailable = (totalShares * (deal.percentageRemaining / 100.0)).round();
    final double dealValuation = sharesAvailable * deal.pricePerShare;
    final bool isMyOwnDeal = deal.sellerUserId == currentUserId;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isInbox ? const Color(0xFFF59E0B) : const Color(0xFF334155),
          width: isInbox ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Badge + Tanggal
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: deal.targetType == 'P2P'
                      ? const Color(0xFFF59E0B).withValues(alpha: 0.15)
                      : const Color(0xFF38BDF8).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: deal.targetType == 'P2P'
                        ? const Color(0xFFF59E0B).withValues(alpha: 0.5)
                        : const Color(0xFF38BDF8).withValues(alpha: 0.5),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      deal.targetType == 'P2P' ? Icons.handshake_rounded : Icons.public_rounded,
                      size: 11,
                      color: deal.targetType == 'P2P' ? const Color(0xFFF59E0B) : const Color(0xFF38BDF8),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      deal.targetType == 'P2P' ? 'TAWARAN P2P TERTUTUP' : 'PENAWARAN TERBUKA GLOBAL',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        color: deal.targetType == 'P2P' ? const Color(0xFFF59E0B) : const Color(0xFF38BDF8),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                deal.createdAt.length >= 10 ? deal.createdAt.substring(0, 10) : '',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Judul PT & Penjual
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: const Center(
                  child: Icon(Icons.business_rounded, color: Color(0xFFF5B942), size: 20),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      deal.companyName,
                      style: const TextStyle(color: Colors.white, fontSize: 14.5, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Pelepas Saham: ${deal.sellerName} ${deal.sellerPtName != null ? '(${deal.sellerPtName})' : ''}',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (deal.termsNotes != null && deal.termsNotes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Catatan: "${deal.termsNotes}"',
                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, fontStyle: FontStyle.italic),
              ),
            ),
          ],
          const SizedBox(height: 12),

          // Detail Angka & Persentase
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMetricCol('Porsi Tersedia', '${deal.percentageRemaining.toStringAsFixed(1)}%', isAccent: true),
                Container(width: 1, height: 24, color: const Color(0xFF334155)),
                _buildMetricCol('Harga / Lbr', 'IB ${deal.pricePerShare.toStringAsFixed(0)}'),
                Container(width: 1, height: 24, color: const Color(0xFF334155)),
                _buildMetricCol('Nilai Total', CurrencyFormatter.formatCompact(dealValuation)),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Tombol Aksi
          if (isInbox) ...[
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFEF4444)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    onPressed: () async {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: const Color(0xFF0F172A),
                          title: const Text('Tolak Tawaran Saham?', style: TextStyle(color: Colors.white, fontSize: 15)),
                          content: Text('Anda akan menolak pengalihan saham dari ${deal.sellerName}.', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                              onPressed: () => Navigator.pop(ctx, true),
                              child: const Text('Ya, Tolak', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );
                      if (confirmed == true) {
                        await DealsService.rejectDeal(dealId: deal.id, userId: currentUserId);
                        onRefresh();
                      }
                    },
                    child: const Text('❌ TOLAK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    onPressed: () {
                      PartialBuySheet.show(context, deal, onRefresh);
                    },
                    child: const Text('✍️ TANDATANGANI & BAYAR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              height: 40,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.shopping_cart_checkout_rounded, size: 15),
                label: Text(
                  isMyOwnDeal ? 'LELANG SAHAM ANDA SEDANG BERJALAN' : '🛒 BELI SAHAM ',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isMyOwnDeal ? const Color(0xFF475569) : const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: isMyOwnDeal
                    ? null
                    : () {
                        PartialBuySheet.show(context, deal, onRefresh);
                      },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMetricCol(String label, String value, {bool isAccent = false}) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            color: isAccent ? const Color(0xFF38BDF8) : Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
