import '../utils/wib_time.dart';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class CashFlowLedgerScreen extends StatefulWidget {
  final String userId;
  final String initialAccountType; // 'PERSONAL' or 'COMPANY'
  final String? initialCompanyId;

  const CashFlowLedgerScreen({
    super.key,
    required this.userId,
    this.initialAccountType = 'PERSONAL',
    this.initialCompanyId,
  });

  @override
  State<CashFlowLedgerScreen> createState() => _CashFlowLedgerScreenState();
}

class _CashFlowLedgerScreenState extends State<CashFlowLedgerScreen> {
  late String _selectedAccountType; // 'PERSONAL' or 'COMPANY'
  String? _selectedCompanyId;
  String _selectedDirection = 'ALL'; // 'ALL', 'INCOME', 'EXPENSE'
  bool _isLoading = true;
  List<dynamic> _ledger = [];
  Map<String, dynamic> _summary = {};
  List<dynamic> _companies = [];

  String _formatDateTime(DateTime dt) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    final m = months[dt.month - 1];
    final h = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} $m ${dt.year}, $h:$min WIB';
  }

  @override
  void initState() {
    super.initState();
    _selectedAccountType = widget.initialAccountType;
    _selectedCompanyId = widget.initialCompanyId;
    _fetchLedger();
  }

  Future<void> _fetchLedger({bool silent = false}) async {
    if (!silent && _ledger.isEmpty) {
      setState(() => _isLoading = true);
    }
    final directionFilter = _selectedDirection == 'ALL' ? null : _selectedDirection;
    final res = await ApiService.getCashFlowLedger(
      userId: widget.userId,
      accountType: _selectedAccountType,
      companyId: _selectedCompanyId,
      direction: directionFilter,
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
        _ledger = res['ledger'] ?? [];
        _summary = res['summary'] ?? {};
        _companies = res['companies'] ?? [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalIncome = (_summary['total_income'] ?? 0) as num;
    final totalExpense = (_summary['total_expense'] ?? 0) as num;
    final netFlow = (_summary['net_cash_flow'] ?? 0) as num;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Buku Kas & Riwayat Mutasi',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: 0.3),
            ),
            Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                ),
                const SizedBox(width: 5),
                const Text(
                  'Transparansi Finansial Real-Time CFX',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _isLoading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(color: Color(0xFF14B8A6), strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded, color: Color(0xFF14B8A6), size: 22),
            tooltip: 'Segarkan Catatan Kas',
            onPressed: _isLoading ? null : _fetchLedger,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF14B8A6),
        backgroundColor: const Color(0xFF0F172A),
        onRefresh: _fetchLedger,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Selector Akun (Pribadi vs PT)
                    _buildAccountTypeSwitcher(),
                    const SizedBox(height: 12),

                    // Dropdown Pemilihan PT jika mode Brankas PT aktif
                    if (_selectedAccountType == 'COMPANY' && _companies.isNotEmpty) ...[
                      _buildCompanyFilterDropdown(),
                      const SizedBox(height: 12),
                    ],

                    // 2. Executive Hero Financial Statement Card
                    _buildExecutiveSummaryCard(totalIncome, totalExpense, netFlow),
                    const SizedBox(height: 14),

                    // 3. Direction Filter Pills (Semua, Masuk, Keluar)
                    _buildDirectionFilterBar(),
                    const SizedBox(height: 16),

                    // Header List
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.receipt_long_rounded, color: Color(0xFF14B8A6), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Daftar Jurnal Mutasi (${_ledger.length})',
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _selectedAccountType == 'PERSONAL' ? 'KAS PRIBADI' : 'BRANKAS PERSEROAN',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            ),

            // 4. List Mutasi atau Empty State
            if (_isLoading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: Color(0xFF14B8A6)),
                      SizedBox(height: 12),
                      Text('Menyinkronkan buku kas...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    ],
                  ),
                ),
              )
            else if (_ledger.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B).withValues(alpha: 0.4),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.account_balance_wallet_outlined, size: 44, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'Belum Ada Riwayat Mutasi',
                          style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Seluruh pemasukan dividen, omzet bisnis PT, pajak, dan pengeluaran operasional akan tercatat otomatis di sini.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, idx) {
                      final item = _ledger[idx];
                      return _buildTransactionItem(item);
                    },
                    childCount: _ledger.length,
                  ),
                ),
              ),

            const SliverToBoxAdapter(
              child: SizedBox(height: 36),
            ),
          ],
        ),
      ),
    );
  }

  // --- WIDGET: PILIH KAS PRIBADI VS KAS PT ---
  Widget _buildAccountTypeSwitcher() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildSwitcherTab(
              label: 'Kas Rekening Pribadi',
              icon: Icons.person_rounded,
              isSelected: _selectedAccountType == 'PERSONAL',
              onTap: () {
                if (_selectedAccountType != 'PERSONAL') {
                  setState(() {
                    _selectedAccountType = 'PERSONAL';
                    _selectedCompanyId = null;
                  });
                  _fetchLedger();
                }
              },
            ),
          ),
          Expanded(
            child: _buildSwitcherTab(
              label: 'Kas Brankas PT',
              icon: Icons.account_balance_rounded,
              isSelected: _selectedAccountType == 'COMPANY',
              onTap: () {
                if (_selectedAccountType != 'COMPANY') {
                  setState(() => _selectedAccountType = 'COMPANY');
                  _fetchLedger();
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitcherTab({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFF0D9488), Color(0xFF0F766E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          borderRadius: BorderRadius.circular(11),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF0D9488).withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? Colors.white : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- WIDGET: DROPDOWN PEMILIHAN PERUSAHAAN (KONGKLOMERASI) ---
  Widget _buildCompanyFilterDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF0D9488).withValues(alpha: 0.4)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedCompanyId,
          isExpanded: true,
          dropdownColor: const Color(0xFF0F172A),
          hint: const Text('Semua Perseroan Konglomerasi', style: TextStyle(color: Color(0xFF2DD4BF), fontSize: 11.5)),
          icon: const Icon(Icons.arrow_drop_down_rounded, color: Color(0xFF2DD4BF)),
          items: [
            const DropdownMenuItem<String>(
              value: null,
              child: Text('🏛️ Seluruh Perseroan Konglomerasi', style: TextStyle(color: Colors.white, fontSize: 11.5)),
            ),
            ..._companies.map((c) {
              final cid = c['id']?.toString() ?? '';
              final cname = c['name']?.toString() ?? 'PT';
              return DropdownMenuItem<String>(
                value: cid,
                child: Text('🏢 $cname', style: const TextStyle(color: Colors.white, fontSize: 11.5), overflow: TextOverflow.ellipsis),
              );
            }),
          ],
          onChanged: (val) {
            setState(() => _selectedCompanyId = val);
            _fetchLedger();
          },
        ),
      ),
    );
  }

  // --- WIDGET: HERO EXECUTIVE STATEMENT CARD ---
  Widget _buildExecutiveSummaryCard(num totalIncome, num totalExpense, num netFlow) {
    final isSurplus = netFlow >= 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF070B14)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF1E293B)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF14B8A6).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.account_balance_rounded, color: Color(0xFF2DD4BF), size: 16),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'REKAPITULASI ARUS KAS',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.6),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isSurplus
                      ? const Color(0xFF10B981).withValues(alpha: 0.15)
                      : const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isSurplus
                        ? const Color(0xFF10B981).withValues(alpha: 0.4)
                        : const Color(0xFFEF4444).withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  isSurplus ? 'KAS SURPLUS (+)' : 'KAS DEFISIT (-)',
                  style: TextStyle(
                    color: isSurplus ? const Color(0xFF34D399) : const Color(0xFFF87171),
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 3 Columns Stats
          Row(
            children: [
              // 1. Pemasukan
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.arrow_downward_rounded, color: Color(0xFF34D399), size: 12),
                          SizedBox(width: 3),
                          Text('Uang Masuk', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '+${CurrencyFormatter.formatCompact(totalIncome.toDouble())}',
                        style: const TextStyle(color: Color(0xFF34D399), fontSize: 12.5, fontWeight: FontWeight.w900),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // 2. Pengeluaran
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.arrow_upward_rounded, color: Color(0xFFF87171), size: 12),
                          SizedBox(width: 3),
                          Text('Uang Keluar', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '-${CurrencyFormatter.formatCompact(totalExpense.toDouble())}',
                        style: const TextStyle(color: Color(0xFFF87171), fontSize: 12.5, fontWeight: FontWeight.w900),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // 3. Arus Bersih
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.balance_rounded, color: Color(0xFF38BDF8), size: 12),
                          SizedBox(width: 3),
                          Text('Arus Bersih', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${isSurplus ? '+' : ''}${CurrencyFormatter.formatCompact(netFlow.toDouble())}',
                        style: TextStyle(
                          color: isSurplus ? const Color(0xFF38BDF8) : const Color(0xFFF87171),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w900,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- WIDGET: DIRECTION FILTER BAR ---
  Widget _buildDirectionFilterBar() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          _buildFilterChip('ALL', 'Semua Mutasi', Icons.all_inclusive_rounded),
          const SizedBox(width: 8),
          _buildFilterChip('INCOME', 'Uang Masuk (+)', Icons.south_west_rounded),
          const SizedBox(width: 8),
          _buildFilterChip('EXPENSE', 'Uang Keluar (-)', Icons.north_east_rounded),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String dir, String label, IconData icon) {
    final isSelected = _selectedDirection == dir;
    final isIncome = dir == 'INCOME';
    final isExpense = dir == 'EXPENSE';

    Color activeColor = const Color(0xFF14B8A6);
    if (isIncome) activeColor = const Color(0xFF10B981);
    if (isExpense) activeColor = const Color(0xFFEF4444);

    return InkWell(
      onTap: () {
        if (_selectedDirection != dir) {
          setState(() => _selectedDirection = dir);
          _fetchLedger();
        }
      },
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor.withValues(alpha: 0.18) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor : const Color(0xFF1E293B),
            width: isSelected ? 1.4 : 1.0,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: isSelected ? activeColor : const Color(0xFF94A3B8)),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- WIDGET: TRANSACTION STATEMENT ITEM ---
  Widget _buildTransactionItem(dynamic item) {
    final direction = item['direction']?.toString() ?? 'INCOME';
    final isIncome = direction == 'INCOME';
    final amount = ((item['amount_ib'] ?? 0) as num).toDouble();
    final balanceAfter = ((item['balance_after_ib'] ?? 0) as num).toDouble();
    final title = item['title']?.toString() ?? 'Transaksi Finansial';
    final category = item['category']?.toString() ?? 'OTHER';
    final notes = item['notes']?.toString();
    final createdAtStr = item['created_at']?.toString();
    final createdAt = tryParseServerTime(createdAtStr);

    // Kategori Styling & Icon
    IconData catIcon = Icons.swap_horiz_rounded;
    Color catColor = const Color(0xFF38BDF8);
    String catLabel = category.replaceAll('_', ' ');

    if (category.contains('DIVIDEND')) {
      catIcon = Icons.monetization_on_rounded;
      catColor = const Color(0xFFFBBF24);
      catLabel = 'DIVIDEN';
    } else if (category.contains('TENDER')) {
      catIcon = Icons.assignment_turned_in_rounded;
      catColor = const Color(0xFF34D399);
      catLabel = 'TENDER PROYEK';
    } else if (category.contains('SALARY') || category.contains('EXPENSE')) {
      catIcon = Icons.groups_rounded;
      catColor = const Color(0xFFFB923C);
      catLabel = 'BEBAN OPERASIONAL';
    } else if (category.contains('TAX')) {
      catIcon = Icons.account_balance_rounded;
      catColor = const Color(0xFFA78BFA);
      catLabel = 'PAJAK PPH';
    } else if (category.contains('STOCK_BUY') || category.contains('STOCK_SELL')) {
      catIcon = Icons.show_chart_rounded;
      catColor = const Color(0xFF38BDF8);
      catLabel = 'BURSA SAHAM';
    } else if (category.contains('INJECTION')) {
      catIcon = Icons.flash_on_rounded;
      catColor = const Color(0xFF2DD4BF);
      catLabel = 'SUNTIK MODAL';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showReceiptDetailsDialog(item),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isIncome
                    ? const Color(0xFF10B981).withValues(alpha: 0.25)
                    : const Color(0xFFEF4444).withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon Bulat
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: isIncome
                        ? const Color(0xFF10B981).withValues(alpha: 0.15)
                        : const Color(0xFFEF4444).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isIncome
                          ? const Color(0xFF10B981).withValues(alpha: 0.4)
                          : const Color(0xFFEF4444).withValues(alpha: 0.4),
                    ),
                  ),
                  child: Center(
                    child: Icon(
                      isIncome ? Icons.south_west_rounded : Icons.north_east_rounded,
                      color: isIncome ? const Color(0xFF34D399) : const Color(0xFFF87171),
                      size: 18,
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Detail Tengah
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: catColor.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(catIcon, color: catColor, size: 10),
                                const SizedBox(width: 3),
                                Text(
                                  catLabel,
                                  style: TextStyle(color: catColor, fontSize: 8.5, fontWeight: FontWeight.w900),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          if (createdAt != null)
                            Text(
                              _formatDateTime(createdAt),
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        title,
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      if (notes != null && notes.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          notes,
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 8),

                      // Nominal & Saldo Akhir
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Saldo Akhir: ${CurrencyFormatter.formatFull(balanceAfter)}',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontFamily: 'monospace'),
                          ),
                          Text(
                            '${isIncome ? '+' : '-'}${CurrencyFormatter.formatFull(amount)}',
                            style: TextStyle(
                              color: isIncome ? const Color(0xFF34D399) : const Color(0xFFF87171),
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- DIALOG STRUK RESMI BUKTI MUTASI DIGITAL ---
  void _showReceiptDetailsDialog(dynamic item) {
    final direction = item['direction']?.toString() ?? 'INCOME';
    final isIncome = direction == 'INCOME';
    final amount = ((item['amount_ib'] ?? 0) as num).toDouble();
    final balanceAfter = ((item['balance_after_ib'] ?? 0) as num).toDouble();
    final balanceBefore = ((item['balance_before_ib'] ?? (isIncome ? balanceAfter - amount : balanceAfter + amount)) as num).toDouble();
    final title = item['title']?.toString() ?? 'Transaksi Mutasi Finansial';
    final category = item['category']?.toString() ?? 'OTHER';
    final refId = item['id']?.toString() ?? item['reference_id']?.toString() ?? 'MUT-CFX';
    final notes = item['notes']?.toString() ?? '-';
    final createdAtStr = item['created_at']?.toString();
    final createdAt = tryParseServerTime(createdAtStr);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            width: 1.5,
          ),
        ),
        title: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isIncome
                    ? const Color(0xFF10B981).withValues(alpha: 0.18)
                    : const Color(0xFFEF4444).withValues(alpha: 0.18),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isIncome ? Icons.south_west_rounded : Icons.north_east_rounded,
                color: isIncome ? const Color(0xFF34D399) : const Color(0xFFF87171),
                size: 26,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'STRUK MUTASI KAS RESMI',
              style: TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w900, letterSpacing: 0.4),
            ),
            const SizedBox(height: 3),
            Text(
              'Capital Federation Financial Authority',
              style: TextStyle(color: const Color(0xFF94A3B8), fontSize: 10),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Text(
                '${isIncome ? '+' : '-'}${CurrencyFormatter.formatFull(amount)}',
                style: TextStyle(
                  color: isIncome ? const Color(0xFF34D399) : const Color(0xFFF87171),
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                children: [
                  _buildReceiptRow('Judul Transaksi:', title),
                  const Divider(color: Color(0xFF1E293B), height: 14),
                  _buildReceiptRow('Kategori:', category.replaceAll('_', ' ')),
                  const SizedBox(height: 6),
                  _buildReceiptRow('No. Referensi:', refId.substring(0, refId.length > 18 ? 18 : refId.length)),
                  const SizedBox(height: 6),
                  _buildReceiptRow('Waktu Transaksi:', createdAt != null ? _formatDateTime(createdAt) : '-'),
                  const Divider(color: Color(0xFF1E293B), height: 14),
                  _buildReceiptRow('Saldo Sebelum:', CurrencyFormatter.formatFull(balanceBefore)),
                  const SizedBox(height: 6),
                  _buildReceiptRow('Saldo Sesudah:', CurrencyFormatter.formatFull(balanceAfter)),
                ],
              ),
            ),
            const SizedBox(height: 10),
            const Text('Keterangan / Berita Acara:', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Text(
                notes,
                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, fontStyle: FontStyle.italic),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF334155),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('TUTUP STRUK', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
