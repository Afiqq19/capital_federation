import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../utils/formatters.dart';
import '../services/deals_service.dart';
import 'formal_deed_modal.dart';

class P2PNegotiationSheet {
  static void show(BuildContext context, Map<String, dynamic> entity) async {
    final provider = context.read<GameProvider>();
    final user = provider.user;
    if (user == null) return;

    final double currentOwnership = (entity['ownershipPct'] ?? 100.0).toDouble();
    if (currentOwnership <= 1.0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Kepemilikan saham Anda terlalu sedikit untuk dijual'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final double currentPrice = (entity['currentPrice'] as num?)?.toDouble() ?? 2500.0;
    const int totalShares = 10000000;
    double pctToSell = currentOwnership >= 20.0 ? 20.0 : (currentOwnership >= 10.0 ? 10.0 : currentOwnership);
    String selectedBuyerType = 'P2P'; // 'P2P' atau 'GLOBAL'
    String selectedBuyerId = '';

    List<dynamic> candidates = [];
    try {
      final allCandidates = await DealsService.getCandidates();
      candidates = allCandidates.where((c) => c['id'] != user.id).toList();
      if (candidates.isNotEmpty) {
        selectedBuyerId = candidates.first['id'] ?? '';
      } else {
        selectedBuyerType = 'GLOBAL';
      }
    } catch (_) {
      selectedBuyerType = 'GLOBAL';
    }

    if (!context.mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final int sharesSold = (totalShares * (pctToSell / 100.0)).round();
          final int lotsSold = (sharesSold / 100).round();
          final double grossProceeds = sharesSold * currentPrice;
          final double fee = grossProceeds * 0.001; // 0.1% bea bursa
          final double netProceeds = grossProceeds - fee;
          final double remainingPct = (currentOwnership - pctToSell).clamp(0.0, 100.0);
          final bool isStillMajority = remainingPct >= 51.0;

          Map<String, dynamic>? targetCandidate;
          if (selectedBuyerType == 'P2P') {
            for (final c in candidates) {
              if (c['id']?.toString() == selectedBuyerId) {
                targetCandidate = c is Map<String, dynamic> ? c : Map<String, dynamic>.from(c as Map);
                break;
              }
            }
            if (targetCandidate == null && candidates.isNotEmpty) {
              final first = candidates.first;
              targetCandidate = first is Map<String, dynamic> ? first : Map<String, dynamic>.from(first as Map);
              selectedBuyerId = targetCandidate['id']?.toString() ?? '';
            }
          }

          return Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(top: BorderSide(color: Color(0xFFF59E0B), width: 1.5)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
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
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.handshake_rounded, color: Color(0xFFF59E0B), size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Pasar Negosiasi & Penjualan Saham',
                              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                            ),
                            Text('Emiten: ${entity['name']}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Segmented Pilihan Tipe Penjualan
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              setModalState(() {
                                selectedBuyerType = 'P2P';
                                if (candidates.isNotEmpty && selectedBuyerId.isEmpty) {
                                  selectedBuyerId = candidates.first['id'] ?? '';
                                }
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: selectedBuyerType == 'P2P' ? const Color(0xFF38BDF8).withValues(alpha: 0.2) : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: selectedBuyerType == 'P2P' ? const Color(0xFF38BDF8) : Colors.transparent),
                              ),
                              child: Center(
                                child: Text(
                                  '🤝 Jual ke Pemain Lain (P2P)',
                                  style: TextStyle(
                                    color: selectedBuyerType == 'P2P' ? Colors.white : const Color(0xFF94A3B8),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => setModalState(() => selectedBuyerType = 'GLOBAL'),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: selectedBuyerType == 'GLOBAL' ? const Color(0xFF10B981).withValues(alpha: 0.2) : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: selectedBuyerType == 'GLOBAL' ? const Color(0xFF10B981) : Colors.transparent),
                              ),
                              child: Center(
                                child: Text(
                                  '🌐 Pasar Global / Bursa',
                                  style: TextStyle(
                                    color: selectedBuyerType == 'GLOBAL' ? Colors.white : const Color(0xFF94A3B8),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Dropdown Pemain Pembeli (Jika mode P2P)
                  if (selectedBuyerType == 'P2P') ...[
                    const Text(
                      'Pilih Investor Pembeli (Konglomerat Tujuan):',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    if (candidates.isEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.info_outline_rounded, color: Color(0xFFF59E0B), size: 16),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Tidak ada pemain lain yang terdeteksi saat ini. Silakan gunakan opsi "Pasar Global / Bursa" untuk melelang saham ke seluruh publik.',
                                style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF070B14),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: candidates.any((c) => c['id']?.toString() == selectedBuyerId)
                                ? selectedBuyerId
                                : (candidates.isNotEmpty ? candidates.first['id']?.toString() : null),
                            isExpanded: true,
                            dropdownColor: const Color(0xFF0B132B),
                            hint: const Text('-- Pilih Pemain Pembeli --', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                            icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF38BDF8)),
                            items: candidates.map((c) {
                              final bName = c['username'] ?? 'Pemain';
                              final pt = (c['pt_name'] as String?)?.isNotEmpty == true ? ' (${c['pt_name']})' : '';
                              final bal = (c['balance_ib'] as num?)?.toDouble() ?? 0.0;
                              return DropdownMenuItem<String>(
                                value: c['id']?.toString(),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('$bName$pt', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                                    Text(CurrencyFormatter.formatCompact(bal), style: const TextStyle(color: Color(0xFF34D399), fontSize: 10, fontFamily: 'monospace')),
                                  ],
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) setModalState(() => selectedBuyerId = val);
                            },
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                  ],

                  // Card Informasi Kepemilikan & Status
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Kepemilikan Anda', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                            Text('${currentOwnership.toStringAsFixed(1)}%', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Icon(Icons.arrow_forward_rounded, color: Color(0xFF64748B), size: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Sisa Setelah Dialihkan', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                            Text(
                              '${remainingPct.toStringAsFixed(1)}%',
                              style: TextStyle(color: isStillMajority ? const Color(0xFF10B981) : const Color(0xFFF59E0B), fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Slider Pilihan Persentase Penjualan
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Porsi Saham yang Dialihkan:', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      Text(
                        '${pctToSell.toStringAsFixed(0)}% (${CurrencyFormatter.formatFull(lotsSold.toDouble()).replaceAll('IB ', '')} Lot)',
                        style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Slider(
                    value: pctToSell,
                    min: 1.0,
                    max: currentOwnership,
                    divisions: currentOwnership.round().clamp(1, 100),
                    activeColor: const Color(0xFFF59E0B),
                    inactiveColor: const Color(0xFF1E293B),
                    onChanged: (val) {
                      setModalState(() => pctToSell = val);
                    },
                  ),
                  Wrap(
                    spacing: 8,
                    children: [5.0, 10.0, 20.0, 30.0].where((p) => p <= currentOwnership).map((p) {
                      final isSelected = (pctToSell - p).abs() < 0.5;
                      return ChoiceChip(
                        label: Text('${p.toStringAsFixed(0)}%'),
                        selected: isSelected,
                        selectedColor: const Color(0xFFF59E0B),
                        backgroundColor: const Color(0xFF070B14),
                        labelStyle: TextStyle(
                          color: isSelected ? const Color(0xFF451A03) : const Color(0xFFCBD5E1),
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                        onSelected: (val) {
                          if (val) setModalState(() => pctToSell = p);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),

                  // Card Penerimaan Uang Tunai
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF064E3B), Color(0xFF0F172A)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF10B981)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TOTAL DANA CAIR PENJUALAN', style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.w900)),
                            Text('@ IB ${currentPrice.toStringAsFixed(0)} / lbr', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        FittedBox(
                          child: Text(
                            CurrencyFormatter.formatFull(netProceeds),
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Tombol Tinjau Akta Perjanjian Resmi
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.assignment_turned_in_rounded, size: 16),
                      label: const Text(
                        '📜 TINJAU AKTA PERJANJIAN JUAL BELI SAHAM',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: const Color(0xFF451A03),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Navigator.pop(ctx);
                        FormalDeedModal.show(
                          context,
                          entity: entity,
                          seller: user,
                          buyerType: selectedBuyerType,
                          buyerCandidate: targetCandidate,
                          pctToSell: pctToSell,
                          sharesSold: sharesSold,
                          lotsSold: lotsSold,
                          pricePerShare: currentPrice,
                          grossProceeds: grossProceeds,
                          netProceeds: netProceeds,
                        );
                      },
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
}
