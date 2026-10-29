import 'package:flutter/material.dart';
import '../../../utils/formatters.dart';
import '../models/deal_model.dart';
import '../services/deals_service.dart';

class DeedCard extends StatefulWidget {
  final DealDeedModel deed;
  final String currentUserId;
  final VoidCallback onRefresh;
  final Function(String caseId)? onOpenCourtRoom;

  const DeedCard({
    super.key,
    required this.deed,
    required this.currentUserId,
    required this.onRefresh,
    this.onOpenCourtRoom,
  });

  @override
  State<DeedCard> createState() => _DeedCardState();
}

class _DeedCardState extends State<DeedCard> {
  bool _isDisputing = false;

  @override
  Widget build(BuildContext context) {
    final deed = widget.deed;
    final bool isSeller = deed.sellerUserId == widget.currentUserId;
    final bool isBuyer = deed.buyerUserId == widget.currentUserId;
    final bool isDisputed = deed.status == 'DISPUTED_PNAF';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDisputed ? const Color(0xFFEF4444) : const Color(0xFFF5B942),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF5B942).withValues(alpha: 0.05),
            blurRadius: 10,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Nomor Akta & Meterai Digital
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      deed.deedNumber,
                      style: const TextStyle(
                        color: Color(0xFFF5B942),
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Ditandatangani: ${deed.signedAt.length >= 16 ? deed.signedAt.substring(0, 16) : deed.signedAt}',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                    ),
                  ],
                ),
              ),
              // Meterai Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF047857), Color(0xFF065F46)]),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF34D399), width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.verified_rounded, size: 11, color: Color(0xFF34D399)),
                    const SizedBox(width: 4),
                    Text(
                      deed.digitalMeteraiId,
                      style: const TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Pihak-Pihak Terikat
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('PIHAK PENJUAL', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8.5, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(
                        deed.sellerName,
                        style: TextStyle(
                          color: isSeller ? const Color(0xFF38BDF8) : Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_rounded, color: Color(0xFF64748B), size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('PIHAK PEMBELI', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8.5, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(
                        deed.buyerName,
                        style: TextStyle(
                          color: isBuyer ? const Color(0xFF34D399) : Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.bold,
                        ),
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

          // Rincian Saham & Nilai
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Saham: ${deed.companyName}',
                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${deed.percentageTransferred.toStringAsFixed(1)}% (${CurrencyFormatter.formatNumber(deed.sharesTransferred)} lbr)',
                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Dana Transaksi', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              Text(
                CurrencyFormatter.formatFull(deed.totalAmountIb),
                style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w900),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Klausul Wanprestasi Pasal 7
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: const Color(0xFF1E1E2E),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.gavel_rounded, color: Color(0xFFF59E0B), size: 14),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Klausul Wanprestasi Pasal 7: Penalti ingkar janji/pembatalan sebesar ${deed.clauseBreachPenaltyPct.toStringAsFixed(0)}% '
                    '(${CurrencyFormatter.formatFull(deed.totalAmountIb * (deed.clauseBreachPenaltyPct / 100.0))}) disita langsung melalui Pengadilan PNAF.',
                    style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 9.5, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Tombol Gugat ke PNAF jika terjadi wanprestasi / pembatalan sepihak
          if (isDisputed) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFEF4444)),
              ),
              child: const Center(
                child: Text(
                  '⚖️ SEDANG DALAM PROSES SIDANG GUGATAN DI PNAF',
                  style: TextStyle(color: Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              height: 38,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.gavel_rounded, size: 14),
                label: const Text(
                  '⚖️ GUGAT WANPRESTASI KE PNAF',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFEF4444),
                  side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _isDisputing
                    ? null
                    : () async {
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            backgroundColor: const Color(0xFF0F172A),
                            title: const Text('Gugat Wanprestasi ke PNAF?', style: TextStyle(color: Colors.white, fontSize: 15)),
                            content: Text(
                              'Gugatan arbitrase niaga akan didaftarkan ke Pengadilan Niaga Federasi (PNAF).\n\n'
                              'Klaim ganti rugi penalti: ${CurrencyFormatter.formatFull(deed.totalAmountIb * (deed.clauseBreachPenaltyPct / 100.0))}.\n'
                              'Jadwal sidang otomatis ditetapkan pada pukul 10:00 WIB di Ruang Sidang Arbitrase PNAF.',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
                            ),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Daftarkan Gugatan', style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        );

                        if (confirmed == true) {
                          if (!context.mounted) return;
                          final messenger = ScaffoldMessenger.of(context);
                          setState(() => _isDisputing = true);
                          final res = await DealsService.disputeToPnaf(
                            deedId: deed.id,
                            plaintiffUserId: widget.currentUserId,
                            grievanceReason: 'Wanprestasi pelaksanaan kewajiban transaksi saham pada Akta ${deed.deedNumber}',
                          );
                          setState(() => _isDisputing = false);

                          if (!mounted) return;
                          if (res['error'] != null) {
                            messenger.showSnackBar(
                              SnackBar(content: Text('❌ Gagal: ${res['error']}'), backgroundColor: Colors.red),
                            );
                          } else {
                            widget.onRefresh();
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text('⚖️ ${res['message'] ?? 'Gugatan Berhasil Didaftarkan ke PNAF!'}'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                            if (widget.onOpenCourtRoom != null && res['caseId'] != null) {
                              widget.onOpenCourtRoom!(res['caseId']);
                            }
                          }
                        }
                      },
              ),
            ),
          ],
        ],
      ),
    );
  }
}
