import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/api_service.dart';
import '../../../utils/formatters.dart';

class IpoBiddingDialog extends StatefulWidget {
  final Map<String, dynamic> ipoOffering;
  final String userId;
  final String ptName;
  final double companyBalance;
  final double personalBalance;

  const IpoBiddingDialog({
    super.key,
    required this.ipoOffering,
    required this.userId,
    required this.ptName,
    required this.companyBalance,
    this.personalBalance = 0.0,
  });

  @override
  State<IpoBiddingDialog> createState() => _IpoBiddingDialogState();
}

class _IpoBiddingDialogState extends State<IpoBiddingDialog> {
  double _requestedPct = 1.0;
  final TextEditingController _pitchController = TextEditingController(text: 'Sinergi ekspansi bisnis dan aliansi rantai pasok.');
  bool _isSubmitting = false;

  @override
  void dispose() {
    _pitchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final compName = widget.ipoOffering['company_name'] ?? 'PT Emiten';
    final symbol = widget.ipoOffering['symbol'] ?? 'TBK';
    final price = (widget.ipoOffering['offering_price'] as num?)?.toDouble() ?? 2500.0;
    final totalShares = (widget.ipoOffering['total_offering_shares'] as num?)?.toInt() ?? 10000000;
    final maxStrategicPct = ((widget.ipoOffering['strategic_pct'] as num?)?.toDouble() ?? 35.0).clamp(1.0, 50.0);

    final double totalAvailableFunds = widget.companyBalance + widget.personalBalance;
    final String buyerEntityLabel = widget.ptName.trim().isNotEmpty
        ? (widget.ptName.trim().toUpperCase().startsWith('PT') ? widget.ptName.trim() : 'PT. ${widget.ptName.trim()}')
        : 'Investor Mitra (Mandiri)';

    final sharesCount = (totalShares * (_requestedPct / 100.0)).round();
    final lotsCount = (sharesCount / 100).round();
    final totalCost = sharesCount * price;
    final canAfford = totalAvailableFunds >= totalCost;
    final deficit = totalCost - totalAvailableFunds;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0A0F1D),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF38BDF8), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0284C7).withValues(alpha: 0.2),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header Dialog
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: Color(0xFF1E293B),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.handshake_rounded, color: Color(0xFF38BDF8), size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'TAWAR MITRA PRE-IPO • $symbol',
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 0.3),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 1),
                          Text(
                            compName,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                      visualDensity: VisualDensity.compact,
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Content Body
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Profil Pembeli & Saldo Kas Gabungan (PT + Pribadi)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070B14),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Identitas Mitra Pembeli:', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                                const SizedBox(height: 2),
                                Text(
                                  buyerEntityLabel,
                                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('Total Dana Tersedia (PT + Pribadi):', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                              const SizedBox(height: 2),
                              Text(
                                CurrencyFormatter.formatFull(totalAvailableFunds),
                                style: const TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Header Slider Porsi Saham
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Porsi Saham Mitra yang Diminta:',
                          style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                          ),
                          child: Text(
                            '${_requestedPct.toStringAsFixed(0)}% Saham',
                            style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),

                    // Slider Porsi (Minimal 1%, step per 1%)
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: const Color(0xFF38BDF8),
                        inactiveTrackColor: const Color(0xFF1E293B),
                        thumbColor: const Color(0xFF38BDF8),
                        overlayColor: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                        trackHeight: 4,
                      ),
                      child: Slider(
                        value: _requestedPct.clamp(1.0, maxStrategicPct),
                        min: 1.0,
                        max: maxStrategicPct < 1.0 ? 1.0 : maxStrategicPct,
                        divisions: (maxStrategicPct - 1.0) > 0 ? (maxStrategicPct - 1.0).round() : 1,
                        onChanged: (val) => setState(() => _requestedPct = val),
                      ),
                    ),

                    // Quick Preset Chips (1%, 2%, 5%, 10%, Maks)
                    Row(
                      children: [
                        _buildPresetChip(1.0, '1%'),
                        const SizedBox(width: 5),
                        if (maxStrategicPct >= 2.0) ...[
                          _buildPresetChip(2.0, '2%'),
                          const SizedBox(width: 5),
                        ],
                        if (maxStrategicPct >= 5.0) ...[
                          _buildPresetChip(5.0, '5%'),
                          const SizedBox(width: 5),
                        ],
                        if (maxStrategicPct >= 10.0) ...[
                          _buildPresetChip(10.0, '10%'),
                          const SizedBox(width: 5),
                        ],
                        _buildPresetChip(maxStrategicPct, 'Maks (${maxStrategicPct.toInt()}%)'),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Kartu Komitmen Dana Kas
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: canAfford
                            ? const Color(0xFF064E3B).withValues(alpha: 0.35)
                            : const Color(0xFF450A0A).withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: canAfford ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                          width: 1.2,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text(
                                'KOMITMEN DANA INVESTASI:',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${CurrencyFormatter.formatNumberOnly(sharesCount)} Lbr (${CurrencyFormatter.formatNumberOnly(lotsCount)} Lot)',
                                  textAlign: TextAlign.end,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Text(
                              CurrencyFormatter.formatFull(totalCost),
                              style: TextStyle(
                                color: canAfford ? const Color(0xFF34D399) : const Color(0xFFFCA5A5),
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (!canAfford) ...[
                      const SizedBox(height: 5),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '⚠️ Saldo Anda kurang ${CurrencyFormatter.formatFull(deficit)} untuk porsi ini',
                          style: const TextStyle(color: Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ] else ...[
                      const SizedBox(height: 4),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '✓ Dana mencukupi (Sisa Kas: ${CurrencyFormatter.formatFull(totalAvailableFunds - totalCost)})',
                          style: const TextStyle(color: Color(0xFF10B981), fontSize: 9.5),
                        ),
                      ),
                    ],
                    if (widget.ipoOffering['my_bid'] != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline_rounded, color: Color(0xFFF59E0B), size: 14),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Anda sudah mengajukan proposal: ${widget.ipoOffering['my_bid']['requested_percentage']}% saham (${widget.ipoOffering['my_bid']['status']}). Mengirim proposal baru akan memperbarui penawaran Anda.',
                                style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 9.5),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),

                    // Input Memo Kemitraan
                    const Text('Memo Kemitraan Strategis (Pesan ke Pendiri Emiten):', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _pitchController,
                      maxLines: 2,
                      style: const TextStyle(color: Colors.white, fontSize: 11),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: const Color(0xFF070B14),
                        contentPadding: const EdgeInsets.all(10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF38BDF8))),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        icon: _isSubmitting
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Icon(Icons.send_rounded, size: 16),
                        label: Text(
                          canAfford ? 'AJUKAN PEMBELIAN PORSI MITRA' : 'SALDO KAS TIDAK CUKUP',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: canAfford ? const Color(0xFF0284C7) : const Color(0xFF334155),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: canAfford && !_isSubmitting ? _submitBid : null,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPresetChip(double value, String label) {
    final isSelected = (_requestedPct - value).abs() < 0.1;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _requestedPct = value),
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 4),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isSelected ? const Color(0xFF38BDF8) : const Color(0xFF334155),
              width: 0.8,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : const Color(0xFF94A3B8),
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submitBid() async {
    setState(() => _isSubmitting = true);
    final ipoId = widget.ipoOffering['id']?.toString() ?? '';
    final res = await ApiService.submitIpoBid(
      ipoId: ipoId,
      bidderUserId: widget.userId,
      requestedPercentage: _requestedPct,
      strategicPitch: _pitchController.text.trim(),
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      context.read<GameProvider>().fetchIpoOfferings();
      Navigator.pop(context);
      if (res['error'] != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Gagal: ${res['error']}'), backgroundColor: Colors.red),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Proposal berhasil dikirim ke Direksi Emiten!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    }
  }
}
