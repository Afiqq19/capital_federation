import '../utils/wib_time.dart';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class CashFlowLedgerModal extends StatefulWidget {
  final String userId;
  final String? initialAccountType; // 'PERSONAL' or 'COMPANY'
  final String? initialCompanyId;

  const CashFlowLedgerModal({
    super.key,
    required this.userId,
    this.initialAccountType = 'PERSONAL',
    this.initialCompanyId,
  });

  static void show(
    BuildContext context, {
    required String userId,
    String? initialAccountType = 'PERSONAL',
    String? initialCompanyId,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CashFlowLedgerModal(
        userId: userId,
        initialAccountType: initialAccountType,
        initialCompanyId: initialCompanyId,
      ),
    );
  }

  @override
  State<CashFlowLedgerModal> createState() => _CashFlowLedgerModalState();
}

class _CashFlowLedgerModalState extends State<CashFlowLedgerModal> {
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
    _selectedAccountType = widget.initialAccountType ?? 'PERSONAL';
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final totalIncome = (_summary['total_income'] ?? 0) as num;
    final totalExpense = (_summary['total_expense'] ?? 0) as num;
    final netFlow = (_summary['net_cash_flow'] ?? 0) as num;

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF10141D) : const Color(0xFFF8FAFC),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 30,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D9488).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.receipt_long_rounded,
                    color: Color(0xFF14B8A6),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Buku Kas & Riwayat Mutasi',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      Text(
                        'Transparansi lengkap uang masuk & keluar real-time',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _fetchLedger,
                  icon: const Icon(Icons.refresh_rounded),
                  tooltip: 'Perbarui Data',
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Account Type Selector Tabs (Kas Pribadi vs Kas Perusahaan)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2638) : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildAccountTab(
                      title: 'Kas Rekening Pribadi',
                      icon: Icons.person_rounded,
                      isActive: _selectedAccountType == 'PERSONAL',
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
                  const SizedBox(width: 4),
                  Expanded(
                    child: _buildAccountTab(
                      title: 'Kas Brankas PT',
                      icon: Icons.domain_rounded,
                      isActive: _selectedAccountType == 'COMPANY',
                      onTap: () {
                        if (_selectedAccountType != 'COMPANY') {
                          setState(() {
                            _selectedAccountType = 'COMPANY';
                          });
                          _fetchLedger();
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Company Selector Dropdown (jika tab PT aktif & user punya anak perusahaan)
          if (_selectedAccountType == 'COMPANY' && _companies.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E2638) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.business_center_rounded, size: 18, color: Color(0xFF14B8A6)),
                    const SizedBox(width: 10),
                    const Text('Pilih Unit PT: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    Expanded(
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String?>(
                          value: _selectedCompanyId,
                          isExpanded: true,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('Semua Entitas Perusahaan'),
                            ),
                            ..._companies.map((c) => DropdownMenuItem<String?>(
                                  value: c['id'] as String,
                                  child: Text('${c['name']} (${c['symbol']})'),
                                )),
                          ],
                          onChanged: (val) {
                            setState(() => _selectedCompanyId = val);
                            _fetchLedger();
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Financial Summary Card
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                      ? [const Color(0xFF192233), const Color(0xFF131A26)]
                      : [Colors.white, const Color(0xFFF1F5F9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: isDark ? const Color(0xFF2E3D59) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.arrow_downward_rounded, size: 14, color: Color(0xFF10B981)),
                            const SizedBox(width: 4),
                            Text(
                              'Uang Masuk',
                              style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '+${CurrencyFormatter.formatFull(totalIncome)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF10B981),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 36, color: Colors.grey.withValues(alpha: 0.2)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.arrow_upward_rounded, size: 14, color: Color(0xFFEF4444)),
                            const SizedBox(width: 4),
                            Text(
                              'Uang Keluar',
                              style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '-${CurrencyFormatter.formatFull(totalExpense)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFEF4444),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 36, color: Colors.grey.withValues(alpha: 0.2)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Arus Bersih',
                          style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          netFlow >= 0
                              ? '+${CurrencyFormatter.formatFull(netFlow)}'
                              : CurrencyFormatter.formatFull(netFlow),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: netFlow >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
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
          ),

          // Direction Filter Chips: Semua, Uang Masuk (+), Uang Keluar (-)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                _buildFilterChip('Semua Mutasi', 'ALL', Icons.all_inclusive_rounded),
                const SizedBox(width: 8),
                _buildFilterChip('Uang Masuk (+)', 'INCOME', Icons.south_west_rounded, const Color(0xFF10B981)),
                const SizedBox(width: 8),
                _buildFilterChip('Uang Keluar (-)', 'EXPENSE', Icons.north_east_rounded, const Color(0xFFEF4444)),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // Transaction Ledger List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 12),
                        Text('Memuat riwayat buku kas...'),
                      ],
                    ),
                  )
                : _ledger.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.receipt_outlined, size: 54, color: Colors.grey.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            const Text(
                              'Belum ada riwayat mutasi transaksi',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Semua mutasi operasional, dividen, dan trading akan tercatat di sini.',
                              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchLedger,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                          itemCount: _ledger.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final item = _ledger[idx];
                            return _buildLedgerCard(item, isDark);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountTab({
    required String title,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF0D9488) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: const Color(0xFF0D9488).withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ]
              : const [],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 17,
              color: isActive ? Colors.white : Colors.grey[500],
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                color: isActive ? Colors.white : Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, IconData icon, [Color? activeColor]) {
    final isSelected = _selectedDirection == value;
    final color = activeColor ?? const Color(0xFF0D9488);

    return InkWell(
      onTap: () {
        if (_selectedDirection != value) {
          setState(() => _selectedDirection = value);
          _fetchLedger();
        }
      },
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : Colors.grey.withValues(alpha: 0.3),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 13,
              color: isSelected ? color : Colors.grey[500],
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? color : Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLedgerCard(Map<String, dynamic> item, bool isDark) {
    final direction = item['direction'] as String? ?? 'INCOME';
    final isIncome = direction == 'INCOME';
    final amountIb = (item['amount_ib'] ?? 0) as num;
    final balanceAfter = (item['balance_after'] ?? 0) as num;
    final category = (item['category'] ?? 'TRANSACTION') as String;
    final title = (item['title'] ?? 'Mutasi Keuangan') as String;
    final notes = item['notes'] as String?;
    final createdAtStr = item['created_at'] as String?;

    DateTime? createdAt;
    if (createdAtStr != null) {
      try {
        createdAt = parseServerTime(createdAtStr);
      } catch (_) {}
    }

    final categoryColor = _getCategoryColor(category);
    final categoryName = _getCategoryDisplayName(category);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF161E2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF26334D) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon Direction Circle
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: isIncome
                      ? const Color(0xFF10B981).withValues(alpha: 0.14)
                      : const Color(0xFFEF4444).withValues(alpha: 0.14),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isIncome ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                  color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),

              // Title and category
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: categoryColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            categoryName,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: categoryColor,
                            ),
                          ),
                        ),
                        const Spacer(),
                        if (createdAt != null)
                          Text(
                            _formatDateTime(createdAt),
                            style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (notes != null && notes.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              notes,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          ],

          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 8),

          // Amount and Running Balance After
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Saldo Akhir: ${CurrencyFormatter.formatFull(balanceAfter)}',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[500],
                ),
              ),
              Text(
                '${isIncome ? '+' : '-'}${CurrencyFormatter.formatFull(amountIb)}',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'DIVIDEN':
        return const Color(0xFFF59E0B); // Amber
      case 'OPERATING_REVENUE':
        return const Color(0xFF10B981); // Emerald
      case 'SALARY_EXPENSE':
      case 'OPERATING_EXPENSE':
        return const Color(0xFFEF4444); // Red
      case 'CORPORATE_TAX':
        return const Color(0xFF8B5CF6); // Purple
      case 'CAPITAL_INJECTION':
        return const Color(0xFF06B6D4); // Cyan
      case 'STOCK_BUY':
      case 'STOCK_SELL':
        return const Color(0xFF3B82F6); // Blue
      case 'IPO_PROCEEDS':
      case 'IPO_SUBSCRIBE':
        return const Color(0xFFEC4899); // Pink
      case 'CAPEX_UPGRADE':
        return const Color(0xFF6366F1); // Indigo
      default:
        return const Color(0xFF14B8A6); // Teal
    }
  }

  String _getCategoryDisplayName(String category) {
    switch (category) {
      case 'DIVIDEN':
        return 'DIVIDEN SAHAM';
      case 'OPERATING_REVENUE':
        return 'OMZET USAHA';
      case 'SALARY_EXPENSE':
        return 'GAJI KARYAWAN';
      case 'OPERATING_EXPENSE':
        return 'BEBAN OPERASIONAL';
      case 'CORPORATE_TAX':
        return 'PAJAK BADAN (10%)';
      case 'CAPITAL_INJECTION':
        return 'SUNTIK MODAL';
      case 'STOCK_BUY':
        return 'BELI SAHAM';
      case 'STOCK_SELL':
        return 'JUAL SAHAM';
      case 'IPO_PROCEEDS':
        return 'DANA HASIL IPO';
      case 'IPO_SUBSCRIBE':
        return 'PEMESANAN E-IPO';
      case 'CAPEX_UPGRADE':
        return 'INVESTASI R&D';
      case 'ORDER_ESCROW':
        return 'ANTRE BELI (BID)';
      case 'ORDER_REFUND':
        return 'REFUND ANTREAN';
      default:
        return category.replaceAll('_', ' ');
    }
  }
}
