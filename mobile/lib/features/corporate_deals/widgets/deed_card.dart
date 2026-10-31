import 'package:flutter/material.dart';
import '../../../utils/formatters.dart';
import '../../../utils/wib_time.dart';
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

  String _formatWibDateTime(String raw) {
    final dt = tryParseServerTime(raw);
    if (dt == null) {
      return raw.length >= 16 ? raw.substring(0, 16) : raw;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}, $hh:$mm WIB';
  }

  @override
  Widget build(BuildContext context) {
    final deed = widget.deed;
    final bool isSeller = deed.sellerUserId == widget.currentUserId;
    final bool isBuyer = deed.buyerUserId == widget.currentUserId;

    final String effectiveCourtStatus = deed.courtStatus ?? '';
    final bool isApproved =
        deed.status == 'VERDICT_APPROVED' || effectiveCourtStatus == 'VERDICT_APPROVED';
    final bool isSettledPkpu =
        deed.status == 'SETTLED_PKPU' || effectiveCourtStatus == 'VERDICT_PKPU';
    final bool isExecutedPailit =
        deed.status == 'EXECUTED_PAILIT' || effectiveCourtStatus == 'VERDICT_PAILIT';
    final bool isInTrial = !isApproved &&
        !isSettledPkpu &&
        !isExecutedPailit &&
        (effectiveCourtStatus == 'IN_TRIAL' ||
            deed.status == 'DISPUTED_PNAF' ||
            deed.status == 'BREACHED_WANPRESTASI');

    Color borderColor = const Color(0xFFF5B942);
    if (isApproved) {
      borderColor = const Color(0xFF10B981);
    } else if (isSettledPkpu) {
      borderColor = const Color(0xFF06B6D4);
    } else if (isExecutedPailit) {
      borderColor = const Color(0xFFEF4444);
    } else if (isInTrial) {
      borderColor = const Color(0xFFF59E0B);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F172A), Color(0xFF0B1120)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: borderColor.withValues(alpha: 0.75),
          width: 1.4,
        ),
        boxShadow: [
          BoxShadow(
            color: borderColor.withValues(alpha: 0.08),
            blurRadius: 14,
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
            crossAxisAlignment: CrossAxisAlignment.start,
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
                        letterSpacing: 0.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Disahkan: ${_formatWibDateTime(deed.signedAt)}',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
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
              color: const Color(0xFF1E293B).withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.6)),
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
                  'Emiten: ${deed.companyName}',
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
              const Text('Total Nilai Akta', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
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
                    'Klausul Wanprestasi Pasal 7: Penalti ingkar janji sebesar ${deed.clauseBreachPenaltyPct.toStringAsFixed(0)}% '
                    '(${CurrencyFormatter.formatFull(deed.totalAmountIb * (deed.clauseBreachPenaltyPct / 100.0))}) dieksekusi resmi melalui Mahkamah PNAF.',
                    style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 9.5, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Status Putusan & Tombol Aksi Hukum PNAF
          if (isApproved || isSettledPkpu || isExecutedPailit) ...[
            _buildVerdictStampBanner(
              deed: deed,
              isApproved: isApproved,
              isSettledPkpu: isSettledPkpu,
            ),
          ] else if (isInTrial) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.7)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.hourglass_top_rounded, color: Color(0xFFFBBF24), size: 14),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          '⏳ SEDANG DISIDANGKAN DI PNAF${deed.courtCaseNumber != null ? ' (${deed.courtCaseNumber})' : ''}',
                          style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 10, fontWeight: FontWeight.w900),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  if (deed.courtCaseId != null && widget.onOpenCourtRoom != null) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 34,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.meeting_room_rounded, size: 14),
                        label: const Text(
                          '⚖️ BUKA RUANG SIDANG LIVE PNAF',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF5B942),
                          foregroundColor: const Color(0xFF0A0F1D),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () => widget.onOpenCourtRoom!(deed.courtCaseId!),
                      ),
                    ),
                  ],
                ],
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
                  foregroundColor: const Color(0xFFF87171),
                  side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                ),
                onPressed: _isDisputing ? null : () => _confirmAndFileDispute(deed),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVerdictStampBanner({
    required DealDeedModel deed,
    required bool isApproved,
    required bool isSettledPkpu,
  }) {
    final Color color = isApproved
        ? const Color(0xFF10B981)
        : isSettledPkpu
            ? const Color(0xFF06B6D4)
            : const Color(0xFFEF4444);
    final String title = isApproved
        ? '✅ PUTUSAN PNAF: DIKABULKAN (APPROVED)'
        : isSettledPkpu
            ? '🤝 PUTUSAN PNAF: MEDIASI / PKPU DISETUJUI'
            : '🔨 PUTUSAN PNAF: EKSEKUSI PAILIT & SITA';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.8), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.verified_rounded, color: color, size: 15),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
          if (deed.courtCaseNumber != null || deed.courtAwardedIb > 0) ...[
            const SizedBox(height: 5),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (deed.courtCaseNumber != null)
                  Text(
                    'Reg: ${deed.courtCaseNumber}',
                    style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 9.5, fontFamily: 'monospace'),
                  ),
                if (deed.courtAwardedIb > 0)
                  Text(
                    'Cair: ${CurrencyFormatter.formatFull(deed.courtAwardedIb)}',
                    style: const TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.w900),
                  ),
              ],
            ),
          ],
          if (deed.courtCaseId != null && widget.onOpenCourtRoom != null) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 32,
              child: OutlinedButton.icon(
                icon: Icon(Icons.description_rounded, size: 13, color: color),
                label: Text(
                  '📜 LIHAT ARSIP SIDANG & AMAR PUTUSAN',
                  style: TextStyle(color: color, fontSize: 9.5, fontWeight: FontWeight.w900),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: color.withValues(alpha: 0.6)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
                ),
                onPressed: () => widget.onOpenCourtRoom!(deed.courtCaseId!),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _confirmAndFileDispute(DealDeedModel deed) async {
    final penaltyAmount = deed.totalAmountIb * (deed.clauseBreachPenaltyPct / 100.0);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFF5B942), width: 1.2),
        ),
        title: const Row(
          children: [
            Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Gugat Wanprestasi ke PNAF?',
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          'Gugatan arbitrase niaga atas Akta ${deed.deedNumber} akan diregister ke Pengadilan Niaga Federasi (PNAF).\n\n'
          '• Tuntutan Penalti Pasal 7: ${CurrencyFormatter.formatFull(penaltyAmount)}\n'
          '• Biaya Panitera: IB 250.000\n'
          '• Majelis Hakim PNAF akan segera memeriksa bukti akta & memutus perkara.',
          style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Daftarkan Gugatan', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      setState(() => _isDisputing = true);
      final res = await DealsService.disputeToPnaf(
        deedId: deed.id,
        plaintiffUserId: widget.currentUserId,
        grievanceReason: 'Wanprestasi pelaksanaan kewajiban transaksi saham pada Akta ${deed.deedNumber}',
      );
      if (!mounted) return;
      setState(() => _isDisputing = false);

      if (res['error'] != null) {
        messenger.showSnackBar(
          SnackBar(content: Text('❌ ${res['error']}'), backgroundColor: Colors.red),
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
          widget.onOpenCourtRoom!(res['caseId'].toString());
        }
      }
    }
  }
}
