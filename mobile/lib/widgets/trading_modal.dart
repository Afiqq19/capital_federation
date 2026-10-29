import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/company.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';

class TradingModal extends StatefulWidget {
  final CompanyModel company;
  final String initialType;

  const TradingModal({super.key, required this.company, this.initialType = 'BUY'});

  @override
  State<TradingModal> createState() => _TradingModalState();
}

class _TradingModalState extends State<TradingModal> {
  int _lots = 1; // 1 Lot = 100 Lembar
  late TextEditingController _lotController;
  late String _orderType;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _orderType = widget.initialType;
    _lotController = TextEditingController(text: '$_lots');
  }

  @override
  void dispose() {
    _lotController.dispose();
    super.dispose();
  }

  void _updateLots(int newLots) {
    final validLots = max(1, newLots);
    setState(() {
      _lots = validLots;
      _lotController.text = '$validLots';
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final user = provider.user;
    final currencyFormatter = NumberFormat('#,###', 'id_ID');

    final shares = _lots * 100;
    final grossAmount = shares * widget.company.currentPrice;
    final fee = grossAmount * (user?.isBlueChip == true ? 0.0005 : 0.0015);
    final totalAmount = _orderType == 'BUY' ? grossAmount + fee : grossAmount - fee;

    // Find if user owns lots of this company
    final ownedLots = provider.portfolio?.holdings
            .where((h) => h.companyId == widget.company.id || h.symbol == widget.company.symbol)
            .fold<int>(0, (sum, item) => sum + item.lotsOwned) ??
        0;

    final cash = user?.balanceIb ?? 0.0;
    final bool isSuspended = widget.company.status == 'SUSPENDED';
    final bool isInsufficientCash = _orderType == 'BUY' && totalAmount > cash;
    final bool isNoHoldings = _orderType == 'SELL' && ownedLots <= 0;
    final bool isExcessiveLots = _orderType == 'SELL' && _lots > ownedLots;
    final bool isInvalidLots = _lots < 1;
    final bool canSubmit = !_isSubmitting && !isSuspended && !isInsufficientCash && !isNoHoldings && !isExcessiveLots && !isInvalidLots;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            border: Border(top: BorderSide(color: Color(0xFF334155))),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFF334155),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Header Company & Price
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.company.symbol,
                          style: const TextStyle(
                            color: Color(0xFF38BDF8),
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          widget.company.name,
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'IB ${currencyFormatter.format(widget.company.currentPrice)}',
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const Text('per lembar', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // BUY vs SELL Switcher
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF070B14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _orderType = 'BUY'),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _orderType == 'BUY' ? const Color(0xFF10B981) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'BELI SAHAM',
                            style: TextStyle(
                              color: _orderType == 'BUY' ? const Color(0xFF022C22) : const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _orderType = 'SELL'),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _orderType == 'SELL' ? const Color(0xFFEF4444) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'JUAL SAHAM',
                            style: TextStyle(
                              color: _orderType == 'SELL' ? Colors.white : const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Balance / Portfolio Status Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF070B14),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _orderType == 'BUY'
                        ? const Color(0xFF10B981).withValues(alpha: 0.3)
                        : const Color(0xFFF59E0B).withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _orderType == 'BUY' ? Icons.account_balance_wallet_rounded : Icons.pie_chart_rounded,
                      color: _orderType == 'BUY' ? const Color(0xFF34D399) : const Color(0xFFF59E0B),
                      size: 15,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _orderType == 'BUY' ? 'Kas Tersedia: ' : 'Saham Dimiliki: ',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                    Expanded(
                      child: Text(
                        _orderType == 'BUY'
                            ? CurrencyFormatter.formatFull(cash)
                            : (ownedLots > 0
                                ? '${currencyFormatter.format(ownedLots)} Lot (${currencyFormatter.format(ownedLots * 100)} lbr)'
                                : '0 Lot (Belum punya saham ini)'),
                        style: TextStyle(
                          color: _orderType == 'BUY'
                              ? const Color(0xFF34D399)
                              : (ownedLots > 0 ? const Color(0xFFFBBF24) : const Color(0xFFEF4444)),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                        textAlign: TextAlign.end,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Volume Order Stepper & Input
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Volume Order (LOT)',
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '1 Lot = 100 Lembar\n(= ${currencyFormatter.format(shares)} lembar)',
                          style: const TextStyle(
                            color: Color(0xFF38BDF8),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Compact Unified Stepper
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _orderType == 'BUY'
                            ? const Color(0xFF10B981).withValues(alpha: 0.6)
                            : const Color(0xFFEF4444).withValues(alpha: 0.6),
                        width: 1.2,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Minus Button
                        InkWell(
                          onTap: _lots > 1 ? () => _updateLots(_lots - 1) : null,
                          borderRadius: const BorderRadius.horizontal(left: Radius.circular(9)),
                          child: Container(
                            width: 36,
                            height: 40,
                            alignment: Alignment.center,
                            child: Icon(
                              Icons.remove_rounded,
                              color: _lots > 1 ? Colors.white : const Color(0xFF475569),
                              size: 20,
                            ),
                          ),
                        ),
                        Container(width: 1, height: 24, color: const Color(0xFF334155)),
                        // Direct Input TextField
                        SizedBox(
                          width: 78,
                          height: 40,
                          child: TextField(
                            controller: _lotController,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                            onTap: () {
                              _lotController.selection = TextSelection(
                                baseOffset: 0,
                                extentOffset: _lotController.text.length,
                              );
                            },
                            decoration: const InputDecoration(
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 11),
                              border: InputBorder.none,
                              hintText: 'Lot',
                              hintStyle: TextStyle(color: Color(0xFF64748B)),
                            ),
                            onChanged: (val) {
                              final parsed = int.tryParse(val.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
                              setState(() {
                                _lots = parsed;
                              });
                            },
                            onSubmitted: (val) {
                              final parsed = int.tryParse(val.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1;
                              _updateLots(max(1, parsed));
                            },
                          ),
                        ),
                        Container(width: 1, height: 24, color: const Color(0xFF334155)),
                        // Plus Button
                        InkWell(
                          onTap: (_orderType == 'SELL' && ownedLots > 0 && _lots >= ownedLots)
                              ? null
                              : () => _updateLots(_lots + 1),
                          borderRadius: const BorderRadius.horizontal(right: Radius.circular(9)),
                          child: Container(
                            width: 36,
                            height: 40,
                            alignment: Alignment.center,
                            child: Icon(
                              Icons.add_rounded,
                              color: (_orderType == 'SELL' && ownedLots > 0 && _lots >= ownedLots)
                                  ? const Color(0xFF475569)
                                  : Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Quick Lot Preset Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _orderType == 'BUY'
                      ? [
                          _buildPresetChip('+1', () => _updateLots(_lots + 1)),
                          _buildPresetChip('+10', () => _updateLots(_lots + 10)),
                          _buildPresetChip('+50', () => _updateLots(_lots + 50)),
                          _buildPresetChip('+100', () => _updateLots(_lots + 100)),
                          _buildPresetChip('+500', () => _updateLots(_lots + 500)),
                          _buildPresetChip('MAX', () {
                            final lotCost = widget.company.currentPrice * 100 * (user?.isBlueChip == true ? 1.0005 : 1.0015);
                            final maxAffordable = lotCost > 0 ? (cash / lotCost).floor() : 0;
                            if (maxAffordable > 0) {
                              _updateLots(maxAffordable);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Saldo kas pribadi tidak cukup untuk membeli 1 Lot.'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          }, isHighlight: true),
                        ]
                      : [
                          _buildPresetChip('25%', () => _updateLots(max(1, (ownedLots * 0.25).floor()))),
                          _buildPresetChip('50%', () => _updateLots(max(1, (ownedLots * 0.50).floor()))),
                          _buildPresetChip('75%', () => _updateLots(max(1, (ownedLots * 0.75).floor()))),
                          _buildPresetChip('100% (MAX)', () => _updateLots(max(1, ownedLots)), isHighlight: true),
                        ],
                ),
              ),

              const SizedBox(height: 16),
              const Divider(color: Color(0xFF1E293B)),
              const SizedBox(height: 10),

              // Breakdown
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Biaya Transaksi (Pajak & Kliring)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  Text('IB ${currencyFormatter.format(fee.round())}', style: const TextStyle(color: Colors.white, fontSize: 11)),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _orderType == 'BUY' ? 'Total Pembayaran' : 'Total Dana Masuk Kas',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  Text(
                    'IB ${currencyFormatter.format(totalAmount.round())}',
                    style: TextStyle(
                      color: _orderType == 'BUY' ? const Color(0xFF34D399) : const Color(0xFF38BDF8),
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Submit Order Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: canSubmit
                      ? () async {
                          setState(() => _isSubmitting = true);
                          String? err;
                          if (_orderType == 'BUY') {
                            err = await provider.buyStock(companyId: widget.company.id, lots: _lots);
                          } else {
                            err = await provider.sellStock(companyId: widget.company.id, lots: _lots);
                          }

                          if (context.mounted) {
                            setState(() => _isSubmitting = false);
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(err ?? 'Order ${_orderType == 'BUY' ? 'Beli' : 'Jual'} ${currencyFormatter.format(_lots)} Lot berhasil dieksekusi!'),
                                backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                              ),
                            );
                          }
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _orderType == 'BUY'
                        ? (isInsufficientCash ? const Color(0xFF7F1D1D) : const Color(0xFF10B981))
                        : (isNoHoldings || isExcessiveLots ? const Color(0xFF334155) : const Color(0xFFEF4444)),
                    disabledBackgroundColor: const Color(0xFF1E293B),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          isSuspended
                              ? 'SAHAM DISUSPENSI BURSA IPMC'
                              : (_orderType == 'SELL' && isNoHoldings
                                  ? 'TIDAK MEMILIKI SAHAM'
                                  : isExcessiveLots
                                      ? 'LOT MELEBIHI KEPEMILIKAN'
                                      : isInsufficientCash
                                          ? 'SALDO KAS TIDAK MENCUKUPI'
                                          : isInvalidLots
                                              ? 'MASUKKAN JUMLAH LOT'
                                              : 'KONFIRMASI ${_orderType == 'BUY' ? 'BELI' : 'JUAL'} ${currencyFormatter.format(_lots)} LOT'),
                          style: TextStyle(
                            color: canSubmit ? Colors.white : const Color(0xFF94A3B8),
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPresetChip(String label, VoidCallback onTap, {bool isHighlight = false}) {
    return Padding(
      padding: const EdgeInsets.only(right: 6.0),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: isHighlight
                ? const Color(0xFFF59E0B).withValues(alpha: 0.18)
                : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isHighlight
                  ? const Color(0xFFF59E0B)
                  : const Color(0xFF334155),
              width: 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isHighlight ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }
}
