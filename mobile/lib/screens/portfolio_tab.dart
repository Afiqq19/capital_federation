import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';
import 'stock_detail_screen.dart';

class PortfolioTab extends StatefulWidget {
  const PortfolioTab({super.key});

  @override
  State<PortfolioTab> createState() => _PortfolioTabState();
}

class _PortfolioTabState extends State<PortfolioTab> {
  final _loanAmountController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GameProvider>().fetchUserLoans();
    });
  }

  @override
  void dispose() {
    _loanAmountController.dispose();
    super.dispose();
  }

  void _showLoanDialog() {
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
        builder: (context, setModalState) {
          final rawStr = _loanAmountController.text.replaceAll(RegExp(r'[^0-9]'), '');
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
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
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
                              'PINJAMAN BANK SENTRAL IPMC',
                              style: TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Fasilitas Likuiditas Tunai & Agunan Aset Korporasi',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
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
                    controller: _loanAmountController,
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
                      _buildQuickChip('10 Jt', 10000000, maxPlafon, setModalState),
                      _buildQuickChip('50 Jt', 50000000, maxPlafon, setModalState),
                      _buildQuickChip('100 Jt', 100000000, maxPlafon, setModalState),
                      _buildQuickChip('Maksimal Plafon', maxPlafon, maxPlafon, setModalState),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Tenor Selection
                  const Text('Jangka Waktu Pengembalian (Tenor)', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildTenorOption('3 Hari', 3, selectedTenorDays, setModalState, (v) => selectedTenorDays = v),
                      const SizedBox(width: 8),
                      _buildTenorOption('7 Hari', 7, selectedTenorDays, setModalState, (v) => selectedTenorDays = v),
                      const SizedBox(width: 8),
                      _buildTenorOption('14 Hari', 14, selectedTenorDays, setModalState, (v) => selectedTenorDays = v),
                      const SizedBox(width: 8),
                      _buildTenorOption('30 Hari', 30, selectedTenorDays, setModalState, (v) => selectedTenorDays = v),
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
                                'Saya menyetujui Perjanjian Kredit Bank Sentral IPMC. Saya menyatakan bersedia aset perusahaan, kas, atau saham kepemilikan saya disita dan dilelang oleh Bank Sentral IPMC jika gagal bayar / menunggak lewat batas jatuh tempo.',
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
                              Navigator.pop(ctx);
                              final provider = context.read<GameProvider>();
                              final err = await provider.applyBankLoan(
                                amt,
                                tenorDays: selectedTenorDays,
                                agreedToTerms: true,
                              );
                              if (mounted) {
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text(err ?? 'Pinjaman IB ${CurrencyFormatter.formatFull(amt)} cair ke Kas Pribadi! Tenor $selectedTenorDays hari.'),
                                    backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                                  ),
                                );
                              }
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

  Widget _buildQuickChip(String label, double val, double maxPlafon, StateSetter setModalState) {
    return InkWell(
      onTap: () {
        final target = val > maxPlafon ? maxPlafon : val;
        _loanAmountController.text = target.toStringAsFixed(0);
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

  Widget _buildTenorOption(String label, int days, int selectedDays, StateSetter setModalState, Function(int) onSelect) {
    final isSelected = days == selectedDays;
    return Expanded(
      child: InkWell(
        onTap: () {
          setModalState(() {
            onSelect(days);
          });
        },
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
        Text(
          label,
          style: TextStyle(
            color: isBold ? Colors.white : const Color(0xFF94A3B8),
            fontSize: isBold ? 12 : 11,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? (isBold ? Colors.white : const Color(0xFFE2E8F0)),
            fontSize: isBold ? 12.5 : 11,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildActiveLoanCard(BuildContext context, Map<String, dynamic> loan) {
    final remaining = (loan['remaining_amount'] as num?)?.toDouble() ?? 0.0;
    final dailyInstallment = (loan['daily_installment_ib'] as num?)?.toDouble() ?? 0.0;
    final isOverdue = loan['is_overdue'] == true;
    final daysRemaining = loan['days_remaining'] ?? 0;
    final dueDateFormatted = loan['formatted_due_date'] ?? '-';
    final loanId = loan['id']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF38BDF8).withValues(alpha: 0.5),
          width: 1.2,
        ),
        gradient: LinearGradient(
          colors: [
            const Color(0xFF0F172A),
            isOverdue
                ? const Color(0xFFEF4444).withValues(alpha: 0.12)
                : const Color(0xFF0284C7).withValues(alpha: 0.10),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: (isOverdue ? const Color(0xFFEF4444) : const Color(0xFF0284C7)).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isOverdue ? Icons.warning_amber_rounded : Icons.account_balance_rounded,
                  color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF38BDF8),
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'STATUS PINJAMAN BANK SENTRAL IPMC',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Jatuh Tempo: $dueDateFormatted (${isOverdue ? "MENUNGGAK!" : "$daysRemaining Hari Lagi"})',
                      style: TextStyle(
                        color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF94A3B8),
                        fontSize: 10.5,
                        fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (isOverdue ? const Color(0xFFEF4444) : const Color(0xFF10B981)).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: (isOverdue ? const Color(0xFFEF4444) : const Color(0xFF10B981)).withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  isOverdue ? 'JATUH TEMPO (RENTAN SITA)' : 'AKTIF',
                  style: TextStyle(
                    color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF34D399),
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Sisa Hutang Highlight
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Sisa Total Hutang (Pokok + Bunga)', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(
                    CurrencyFormatter.formatFull(remaining),
                    style: TextStyle(
                      color: isOverdue ? const Color(0xFFFCA5A5) : const Color(0xFF38BDF8),
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Angsuran Harian', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  Text(
                    CurrencyFormatter.formatFull(dailyInstallment),
                    style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Peringatan Sita Aset
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.2)),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield_outlined, color: Color(0xFFEF4444), size: 14),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Jaminan Aset: Jika menunggak lewat jatuh tempo, aset atau saham PT akan disita oleh IPMC.',
                    style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 9.5),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 2 Action Buttons: Bayar Cicilan & Lunasi Semua
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 38,
                  child: OutlinedButton(
                    onPressed: () => _handleRepayLoan(context, loanId, 'INSTALLMENT', dailyInstallment),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF10B981)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: Text(
                      'Bayar Cicilan\n(${CurrencyFormatter.formatFull(dailyInstallment)})',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFF10B981), fontSize: 10.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 38,
                  child: ElevatedButton(
                    onPressed: () => _handleRepayLoan(context, loanId, 'FULL', remaining),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text(
                      'LUNASI SEMUA',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _handleRepayLoan(BuildContext context, String loanId, String type, double amount) async {
    final provider = context.read<GameProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final isFull = type == 'FULL';

    // Show confirm dialog
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF334155)),
        ),
        title: Text(
          isFull ? 'Konfirmasi Pelunasan Hutang' : 'Konfirmasi Bayar Cicilan',
          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Bayar ${isFull ? "pelunasan total" : "cicilan harian"} sebesar IB ${CurrencyFormatter.formatFull(amount)} dari Kas Tabungan Pribadi Anda?',
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('BATAL', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            child: const Text('BAYAR SEKARANG', style: TextStyle(color: Color(0xFF022C22), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final err = await provider.repayBankLoan(loanId, type: type, amount: amount);
    if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(err ?? (isFull ? 'Pinjaman Bank Sentral berhasil LUNAS! Credit score +25.' : 'Pembayaran cicilan berhasil!')),
          backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
        ),
      );
    }
  }

  void _requestBailout() async {
    final provider = context.read<GameProvider>();
    final err = await provider.requestBailout();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err ?? 'Dana talangan IB 5.000.000 cair! Gelar Survivor Krisis aktif!'),
          backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final port = provider.portfolio;

    final cash = port?.cashBalance ?? 0.0;
    final companyBalance = port?.companyBalance ?? 0.0;
    final stockVal = port?.totalStockValue ?? 0.0;
    final netWorth = port?.netWorth ?? 0.0;
    final overallPl = port?.overallPl ?? 0.0;
    final overallPlPct = port?.overallPlPct ?? 0.0;
    final isPlUp = overallPl >= 0;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Title
              const Text(
                'Portofolio',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Total kekayaan bersih terpusat dan fasilitas kredit Bank Sentral.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
              const SizedBox(height: 16),

              // Net Worth Big Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF334155)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'TOTAL KEKAYAAN BERSIH (NET WORTH)',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.1,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.shield_rounded, color: Color(0xFF38BDF8), size: 10),
                              SizedBox(width: 4),
                              Text(
                                'TERVERIFIKASI',
                                style: TextStyle(
                                  color: Color(0xFF38BDF8),
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        CurrencyFormatter.formatFull(netWorth),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 27,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Divider(color: Color(0xFF334155), height: 1),
                    const SizedBox(height: 12),

                    // Modern 2x2 Grid of Wealth Breakdown (Spacious, Clear, Never Squished)
                    Row(
                      children: [
                        Expanded(
                          child: _modernBreakdownTile(
                            icon: Icons.account_balance_wallet_rounded,
                            iconColor: const Color(0xFF10B981),
                            label: 'Kas Pribadi',
                            value: CurrencyFormatter.formatFull(cash),
                            valueColor: const Color(0xFF34D399),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _modernBreakdownTile(
                            icon: Icons.business_rounded,
                            iconColor: const Color(0xFF0EA5E9),
                            label: 'Kas PT (Holding)',
                            value: port?.hasPt == true
                                ? CurrencyFormatter.formatFull(companyBalance)
                                : 'Belum Ada PT',
                            valueColor: port?.hasPt == true
                                ? const Color(0xFF38BDF8)
                                : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _modernBreakdownTile(
                            icon: Icons.candlestick_chart_rounded,
                            iconColor: const Color(0xFF6366F1),
                            label: 'Portofolio Saham',
                            value: CurrencyFormatter.formatFull(stockVal),
                            valueColor: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _modernBreakdownTile(
                            icon: isPlUp ? Icons.trending_up_rounded : Icons.trending_down_rounded,
                            iconColor: isPlUp ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            label: 'Return Saham (P/L)',
                            value: '${isPlUp ? '+' : ''}${overallPlPct.toStringAsFixed(2)}%',
                            valueColor: isPlUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Central Bank Loan & Bailout Options (Modern Fintech Action Cards)
              if (provider.hasActiveLoan) ...[
                _buildActiveLoanCard(context, provider.activeLoan!),
                const SizedBox(height: 14),
              ],
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _showLoanDialog,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFF0F172A),
                              const Color(0xFF0284C7).withValues(alpha: 0.08),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.account_balance_rounded, color: Color(0xFF38BDF8), size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Pinjaman Bank',
                                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'Bunga ${provider.centralBankInterestRate.toStringAsFixed(1)}% p.a.',
                                      style: const TextStyle(
                                        color: Color(0xFF34D399),
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: _requestBailout,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFF0F172A),
                              const Color(0xFFD97706).withValues(alpha: 0.08),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD97706).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.healing_rounded, color: Color(0xFFF59E0B), size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Dana Bailout',
                                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Talangan Pailit',
                                      style: TextStyle(
                                        color: Color(0xFFFBBF24),
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),

              // Holdings List
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Daftar Portofolio Saham Anda',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  if (port != null && port.holdings.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${port.holdings.length} Saham',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              if (port == null || port.holdings.isEmpty)
                Container(
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  alignment: Alignment.center,
                  child: const Column(
                    children: [
                      Icon(Icons.pie_chart_outline_rounded, color: Color(0xFF64748B), size: 40),
                      SizedBox(height: 10),
                      Text('Belum memiliki portofolio saham.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text('Beli 1 Lot saham di tab Pasar untuk mulai berinvestasi.', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                    ],
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: port.holdings.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final h = port.holdings[index];
                    final isHoldingUp = h.profitLoss >= 0;
                    final matchingCompanies = provider.companies.where((c) => c.id == h.companyId || c.symbol == h.symbol);
                    final matchingCompany = matchingCompanies.isNotEmpty ? matchingCompanies.first : null;

                    return InkWell(
                      onTap: matchingCompany == null
                          ? null
                          : () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => StockDetailScreen(company: matchingCompany),
                                ),
                              );
                            },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Row 1: Symbol & Company Name (Left), Total Valuation (Right)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                                        ),
                                        child: Text(
                                          h.symbol,
                                          style: const TextStyle(
                                            color: Color(0xFF38BDF8),
                                            fontWeight: FontWeight.w900,
                                            fontSize: 12.5,
                                            letterSpacing: 0.3,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          h.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  CurrencyFormatter.formatFull(h.currentValue),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 7),
                            // Row 2: Lots Owned (Left), Profit/Loss (Right)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${CurrencyFormatter.formatNumberOnly(h.lotsOwned)} Lot (${CurrencyFormatter.formatNumberOnly(h.totalShares)} lbr)',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isHoldingUp
                                        ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                        : const Color(0xFFEF4444).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(5),
                                  ),
                                  child: Text(
                                    '${isHoldingUp ? '+' : ''}${CurrencyFormatter.formatFull(h.profitLoss)} (${h.profitLossPct}%)',
                                    style: TextStyle(
                                      color: isHoldingUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 5),
                            // Row 3: Average Buy Price & Tap Hint
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Harga Rerata: ${CurrencyFormatter.formatFull(h.avgBuyPrice)}',
                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                                ),
                                const Row(
                                  children: [
                                    Text(
                                      'Grafik & Order',
                                      style: TextStyle(color: Color(0xFF0284C7), fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                    SizedBox(width: 2),
                                    Icon(
                                      Icons.chevron_right_rounded,
                                      color: Color(0xFF38BDF8),
                                      size: 14,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _modernBreakdownTile({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required Color valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF070B14).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 13),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                color: valueColor,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

