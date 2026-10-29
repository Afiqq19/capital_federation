import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';

void showBankLoanModal(BuildContext context) {
  final loanAmountController = TextEditingController();
  int selectedTenorDays = 7;
  bool agreedToTerms = false;
  final user = context.read<GameProvider>().user;
  final maxPlafon = (user?.creditScore ?? 750) * 2000000.0;
  final interestRate = context.read<GameProvider>().centralBankInterestRate;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => StatefulBuilder(
      builder: (modalCtx, setModalState) {
        final rawStr = loanAmountController.text.replaceAll(RegExp(r'[^0-9]'), '');
        final amt = double.tryParse(rawStr) ?? 0.0;
        final totalInterest = amt * (interestRate / 100) * (selectedTenorDays / 30);
        final totalRepayment = amt + totalInterest;
        final dailyInstallment = selectedTenorDays > 0 ? (totalRepayment / selectedTenorDays) : totalRepayment;
        final isValidAmt = amt > 0 && amt <= maxPlafon;

        return Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: Color(0xFF38BDF8), width: 1.5)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.account_balance_rounded, color: Color(0xFF38BDF8), size: 22),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'PINJAMAN BANK CENTRAL FEDERATION',
                            style: TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Fasilitas Likuiditas Tunai & Penyelamatan Modal Perusahaan',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(modalCtx),
                      icon: const Icon(Icons.close, color: Color(0xFF64748B), size: 20),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Plafon & Suku Bunga Card
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Plafon Maksimal Anda', style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5)),
                            const SizedBox(height: 2),
                            Text(
                              CurrencyFormatter.formatFull(maxPlafon),
                              style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12.5, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 28, color: const Color(0xFF334155)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Suku Bunga Acuan', style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5)),
                            const SizedBox(height: 2),
                            Text(
                              '${interestRate.toStringAsFixed(1)}% p.a. (Bank Sentral)',
                              style: const TextStyle(color: Color(0xFF10B981), fontSize: 12.5, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Input Nominal
                const Text('Nominal Pinjaman Likuiditas (IB)', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                TextField(
                  controller: loanAmountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                  onChanged: (val) => setModalState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Contoh: 50000000',
                    hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 13),
                    prefixIcon: const Icon(Icons.attach_money_rounded, color: Color(0xFF38BDF8), size: 20),
                    filled: true,
                    fillColor: const Color(0xFF070B14),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF38BDF8))),
                  ),
                ),
                const SizedBox(height: 8),

                // Quick Chips
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildLoanChip('10 Jt', 10000000, maxPlafon, loanAmountController, setModalState),
                    _buildLoanChip('30 Jt (Talangan Pailit)', 30000000, maxPlafon, loanAmountController, setModalState),
                    _buildLoanChip('50 Jt', 50000000, maxPlafon, loanAmountController, setModalState),
                    _buildLoanChip('100 Jt', 100000000, maxPlafon, loanAmountController, setModalState),
                    _buildLoanChip('Maksimal Plafon', maxPlafon, maxPlafon, loanAmountController, setModalState),
                  ],
                ),
                const SizedBox(height: 16),

                // Tenor Selection
                const Text('Jangka Waktu Pengembalian (Tenor)', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildTenorButton('3 Hari', 3, selectedTenorDays, (v) => setModalState(() => selectedTenorDays = v)),
                    const SizedBox(width: 8),
                    _buildTenorButton('7 Hari', 7, selectedTenorDays, (v) => setModalState(() => selectedTenorDays = v)),
                    const SizedBox(width: 8),
                    _buildTenorButton('14 Hari', 14, selectedTenorDays, (v) => setModalState(() => selectedTenorDays = v)),
                    const SizedBox(width: 8),
                    _buildTenorButton('30 Hari', 30, selectedTenorDays, (v) => setModalState(() => selectedTenorDays = v)),
                  ],
                ),
                const SizedBox(height: 16),

                // Kalkulator Rincian Pengembalian
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.25)),
                  ),
                  child: Column(
                    children: [
                      _buildCalcRow('Pinjaman Pokok', CurrencyFormatter.formatFull(amt)),
                      const SizedBox(height: 4),
                      _buildCalcRow('Estimasi Bunga ($selectedTenorDays Hari)', '+${CurrencyFormatter.formatFull(totalInterest)}', valueColor: const Color(0xFFF59E0B)),
                      const SizedBox(height: 4),
                      _buildCalcRow('Cicilan Angsuran Harian', '${CurrencyFormatter.formatFull(dailyInstallment)} / hari', valueColor: const Color(0xFF38BDF8)),
                      const Divider(color: Color(0xFF1E293B), height: 16),
                      _buildCalcRow('TOTAL PENGEMBALIAN', CurrencyFormatter.formatFull(totalRepayment), isBold: true, valueColor: const Color(0xFF10B981)),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Syarat & Ketentuan Sita Aset (Checkbox)
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: agreedToTerms,
                        activeColor: const Color(0xFFEF4444),
                        onChanged: (val) {
                          setModalState(() {
                            agreedToTerms = val ?? false;
                          });
                        },
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setModalState(() {
                              agreedToTerms = !agreedToTerms;
                            });
                          },
                          child: const Padding(
                            padding: EdgeInsets.only(top: 10),
                            child: Text(
                              'Saya menyetujui Perjanjian Kredit Bank Sentral Federasi. Dana pinjaman akan langsung dicairkan ke Kas Pribadi saya, dan dapat langsung saya suntikkan ke Kas PT untuk penyelamatan modal atau operasional bisnis.',
                              style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 10.5, height: 1.35),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Tombol Ajukan
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: (!agreedToTerms || !isValidAmt)
                        ? null
                        : () async {
                            final messenger = ScaffoldMessenger.of(context);
                            Navigator.pop(modalCtx);
                            final provider = context.read<GameProvider>();
                            final err = await provider.applyBankLoan(
                              amt,
                              tenorDays: selectedTenorDays,
                              agreedToTerms: true,
                            );
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(err ?? 'Pinjaman ${CurrencyFormatter.formatFull(amt)} berhasil dicairkan ke Kas Pribadi! Silakan suntikkan ke Kas PT.'),
                                backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                              ),
                            );
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      disabledBackgroundColor: const Color(0xFF334155),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'AJUKAN PINJAMAN SEKARANG',
                      style: TextStyle(
                        color: (!agreedToTerms || !isValidAmt) ? const Color(0xFF64748B) : Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
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

Widget _buildLoanChip(String label, double val, double maxPlafon, TextEditingController controller, StateSetter setModalState) {
  return InkWell(
    onTap: () {
      final target = val > maxPlafon ? maxPlafon : val;
      controller.text = target.toStringAsFixed(0);
      setModalState(() {});
    },
    borderRadius: BorderRadius.circular(8),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600),
      ),
    ),
  );
}

Widget _buildTenorButton(String label, int days, int selectedDays, Function(int) onSelect) {
  final isSelected = days == selectedDays;
  return Expanded(
    child: InkWell(
      onTap: () => onSelect(days),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7).withValues(alpha: 0.25) : const Color(0xFF070B14),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF38BDF8) : const Color(0xFF1E293B),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF64748B),
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    ),
  );
}

Widget _buildCalcRow(String label, String value, {bool isBold = false, Color? valueColor}) {
  return Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label, style: TextStyle(color: isBold ? Colors.white : const Color(0xFF94A3B8), fontSize: 11, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
      Text(value, style: TextStyle(color: valueColor ?? Colors.white, fontSize: 11.5, fontWeight: isBold ? FontWeight.w900 : FontWeight.bold)),
    ],
  );
}
