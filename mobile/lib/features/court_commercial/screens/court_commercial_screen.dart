import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/api_service.dart';
import '../../../services/socket_service.dart';
import '../../../utils/formatters.dart';
import '../models/court_case_model.dart';
import '../widgets/file_lawsuit_sheet.dart';
import 'court_live_room_screen.dart';

class CourtCommercialScreen extends StatefulWidget {
  const CourtCommercialScreen({super.key});

  @override
  State<CourtCommercialScreen> createState() => _CourtCommercialScreenState();
}

class _CourtCommercialScreenState extends State<CourtCommercialScreen> {
  List<CourtCaseModel> _cases = [];
  bool _isLoading = true;
  String _selectedFilter = 'ALL';

  bool _autoJudgeEnabled = true;
  bool _isTogglingBot = false;
  bool _isProcessingNow = false;

  @override
  void initState() {
    super.initState();
    _loadAll();
    SocketService.socket?.on('court:new_case', _onCourtSocketUpdate);
    SocketService.socket?.on('court:verdict', _onCourtSocketUpdate);
    SocketService.socket?.on('court:case_updated', _onCourtSocketUpdate);
    SocketService.socket?.on('court:auto_judge_updated', _onAutoJudgeSocketUpdate);
  }

  @override
  void dispose() {
    SocketService.socket?.off('court:new_case', _onCourtSocketUpdate);
    SocketService.socket?.off('court:verdict', _onCourtSocketUpdate);
    SocketService.socket?.off('court:case_updated', _onCourtSocketUpdate);
    SocketService.socket?.off('court:auto_judge_updated', _onAutoJudgeSocketUpdate);
    super.dispose();
  }

  void _onCourtSocketUpdate(dynamic _) {
    if (mounted) {
      _fetchCases(silent: true);
    }
  }

  void _onAutoJudgeSocketUpdate(dynamic data) {
    if (!mounted) return;
    if (data is Map && data['enabled'] is bool) {
      setState(() => _autoJudgeEnabled = data['enabled'] as bool);
    } else {
      _fetchAutoJudgeStatus();
    }
  }

  Future<void> _loadAll() async {
    await Future.wait([
      _fetchCases(),
      _fetchAutoJudgeStatus(),
    ]);
  }

  Future<void> _fetchAutoJudgeStatus() async {
    final data = await ApiService.getCourtAutoJudgeStatus();
    if (mounted && data != null) {
      setState(() {
        _autoJudgeEnabled = data['enabled'] == true;
      });
    }
  }

  Future<void> _fetchCases({bool silent = false}) async {
    if (!silent) {
      setState(() => _isLoading = true);
    }
    try {
      final raw = await ApiService.getCourtCases();
      if (mounted) {
        setState(() {
          _cases = raw.map((c) => CourtCaseModel.fromJson(c)).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleToggleAutoJudge(bool nextVal) async {
    setState(() => _isTogglingBot = true);
    final res = await ApiService.toggleCourtAutoJudge(nextVal);
    if (!mounted) return;
    setState(() {
      _isTogglingBot = false;
      if (res['enabled'] is bool) {
        _autoJudgeEnabled = res['enabled'] as bool;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          res['message']?.toString() ??
              (nextVal
                  ? '🤖 Majelis Hakim Bot Otomatis PNAF Diaktifkan!'
                  : '👨‍⚖️ Diubah ke Mode Manual Hakim Agung.'),
        ),
        backgroundColor: nextVal ? const Color(0xFF059669) : const Color(0xFFB45309),
      ),
    );
    _fetchCases(silent: true);
  }

  Future<void> _handleProcessNow({String? caseId}) async {
    setState(() => _isProcessingNow = true);
    final res = await ApiService.processCourtAutoJudgeNow(caseId: caseId);
    if (!mounted) return;
    setState(() => _isProcessingNow = false);
    await _fetchCases(silent: true);
    if (!mounted) return;
    final prov = context.read<GameProvider>();
    prov.fetchUserData();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(res['message']?.toString() ?? '⚡ Pemeriksaan Majelis Hakim Arbitrase selesai.'),
        backgroundColor: const Color(0xFF059669),
      ),
    );
  }

  List<CourtCaseModel> get _filteredCases {
    switch (_selectedFilter) {
      case 'IN_TRIAL':
        return _cases.where((c) => c.isInTrial).toList();
      case 'APPROVED':
        return _cases.where((c) => c.isApproved).toList();
      case 'BANKRUPTCY':
        return _cases.where((c) => c.caseType == 'BANKRUPTCY' || c.isPailit || c.isPkpu).toList();
      case 'DISPUTE':
        return _cases.where((c) => c.caseType == 'DISPUTE').toList();
      case 'REGULATORY':
        return _cases.where((c) => c.caseType == 'REGULATORY').toList();
      default:
        return _cases;
    }
  }

  _VerdictVisual _getVerdictVisual(CourtCaseModel item) {
    if (item.isApproved) {
      return const _VerdictVisual(
        label: '✅ DIKABULKAN (APPROVED)',
        shortLabel: 'APPROVED',
        color: Color(0xFF10B981),
        icon: Icons.verified_rounded,
      );
    }
    if (item.isPkpu) {
      return const _VerdictVisual(
        label: '🤝 MEDIASI / PKPU',
        shortLabel: 'PKPU',
        color: Color(0xFF06B6D4),
        icon: Icons.handshake_rounded,
      );
    }
    if (item.isPailit) {
      return const _VerdictVisual(
        label: '🔨 VONIS PAILIT & SITA',
        shortLabel: 'PAILIT',
        color: Color(0xFFEF4444),
        icon: Icons.gavel_rounded,
      );
    }
    if (item.isRejected) {
      return const _VerdictVisual(
        label: '❌ DITOLAK / GUGUR',
        shortLabel: 'DITOLAK',
        color: Color(0xFF94A3B8),
        icon: Icons.cancel_rounded,
      );
    }
    return const _VerdictVisual(
      label: '⏳ DALAM PERSIDANGAN',
      shortLabel: 'SIDANG',
      color: Color(0xFFF5B942),
      icon: Icons.hourglass_top_rounded,
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<GameProvider>().user;
    final uname = (user?.username ?? '').toLowerCase();
    final bool isAdminAuthority =
        (user?.isAdmin ?? false) || uname == 'admin' || uname == 'msyafiq19';

    final int inTrialCount = _cases.where((c) => c.isInTrial).length;
    final int approvedCount = _cases.where((c) => c.isApproved).length;
    final int otherDecidedCount = _cases.where((c) => c.isDecided && !c.isApproved).length;

    return Scaffold(
      backgroundColor: const Color(0xFF060A13),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => FileLawsuitSheet.show(context, onCaseFiled: () => _fetchCases()),
        backgroundColor: const Color(0xFFF5B942),
        foregroundColor: const Color(0xFF0A0F1D),
        elevation: 6,
        icon: const Icon(Icons.gavel_rounded, size: 19),
        label: const Text(
          'DAFTARKAN GUGATAN',
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, letterSpacing: 0.4),
        ),
      ),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B1120),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.note_add_rounded, color: Color(0xFFF5B942), size: 21),
            tooltip: 'Daftarkan Gugatan PNAF',
            onPressed: () => FileLawsuitSheet.show(context, onCaseFiled: () => _fetchCases()),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF94A3B8), size: 21),
            tooltip: 'Muat Ulang Perkara',
            onPressed: _loadAll,
          ),
        ],
        title: const Row(
          children: [
            Icon(Icons.balance_rounded, color: Color(0xFFF5B942), size: 21),
            SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'MAHKAMAH NIAGA PNAF',
                    style: TextStyle(
                      color: Color(0xFFF5B942),
                      fontSize: 13.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.7,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Pengadilan Arbitrase & Kepailitan Korporasi Federasi',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadAll,
        color: const Color(0xFFF5B942),
        backgroundColor: const Color(0xFF0F172A),
        child: Column(
          children: [
            // Panel Majelis Hakim Bot & Ringkasan Eksekutif
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF152036), Color(0xFF0B1120)],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _autoJudgeEnabled
                      ? const Color(0xFF10B981).withValues(alpha: 0.45)
                      : const Color(0xFFF5B942).withValues(alpha: 0.45),
                ),
                boxShadow: [
                  BoxShadow(
                    color: (_autoJudgeEnabled ? const Color(0xFF10B981) : const Color(0xFFF5B942))
                        .withValues(alpha: 0.08),
                    blurRadius: 16,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: _autoJudgeEnabled
                              ? const Color(0xFF064E3B)
                              : const Color(0xFF2D1F08),
                          borderRadius: BorderRadius.circular(11),
                          border: Border.all(
                            color: _autoJudgeEnabled
                                ? const Color(0xFF10B981)
                                : const Color(0xFFF5B942),
                          ),
                        ),
                        child: Icon(
                          _autoJudgeEnabled ? Icons.smart_toy_rounded : Icons.gavel_rounded,
                          color: _autoJudgeEnabled
                              ? const Color(0xFF34D399)
                              : const Color(0xFFF5B942),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                    decoration: BoxDecoration(
                                      color: (_autoJudgeEnabled
                                              ? const Color(0xFF10B981)
                                              : const Color(0xFFF59E0B))
                                          .withValues(alpha: 0.16),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: _autoJudgeEnabled
                                            ? const Color(0xFF10B981)
                                            : const Color(0xFFF59E0B),
                                        width: 0.8,
                                      ),
                                    ),
                                    child: Text(
                                      _autoJudgeEnabled
                                          ? '🤖 HAKIM BOT OTOMATIS AKTIF (24/7)'
                                          : '👨‍⚖️ MODE MANUAL HAKIM AGUNG',
                                      style: TextStyle(
                                        color: _autoJudgeEnabled
                                            ? const Color(0xFF34D399)
                                            : const Color(0xFFFBBF24),
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _autoJudgeEnabled
                                  ? 'Majelis Hakim AI & Panitera Otomatis menetapkan jadwal WIB, memeriksa akta bukti, dan mengetuk palu putusan secara adil.'
                                  : 'Sistem otomatis dimatikan. Seluruh ketukan palu putusan dikendalikan manual oleh Hakim Agung Otoritas PNAF.',
                              style: const TextStyle(
                                color: Color(0xFFCBD5E1),
                                fontSize: 10,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Sakelar ON/OFF khusus Admin / Otoritas langsung dari APK
                  if (isAdminAuthority) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070B14).withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.admin_panel_settings_rounded,
                              color: Color(0xFFF5B942), size: 15),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              _autoJudgeEnabled
                                  ? 'Otomasi Hukum: ON (Otomatis)'
                                  : 'Otomasi Hukum: OFF (Manual)',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          if (inTrialCount > 0) ...[
                            SizedBox(
                              height: 28,
                              child: OutlinedButton.icon(
                                icon: _isProcessingNow
                                    ? const SizedBox(
                                        width: 11,
                                        height: 11,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 1.8,
                                          color: Color(0xFF34D399),
                                        ),
                                      )
                                    : const Icon(Icons.bolt_rounded, size: 13),
                                label: const Text(
                                  'Putuskan Instan',
                                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF34D399),
                                  side: const BorderSide(color: Color(0xFF10B981)),
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(7),
                                  ),
                                ),
                                onPressed: _isProcessingNow ? null : () => _handleProcessNow(),
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          SizedBox(
                            height: 28,
                            child: Transform.scale(
                              scale: 0.8,
                              child: Switch(
                                value: _autoJudgeEnabled,
                                thumbColor: WidgetStateProperty.resolveWith(
                                  (states) => states.contains(WidgetState.selected)
                                      ? const Color(0xFF10B981)
                                      : const Color(0xFFF59E0B),
                                ),
                                trackColor: WidgetStateProperty.resolveWith(
                                  (states) => states.contains(WidgetState.selected)
                                      ? const Color(0xFF065F46)
                                      : const Color(0xFF451A03),
                                ),
                                onChanged: _isTogglingBot ? null : _handleToggleAutoJudge,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 10),
                  // 4 Statistik Ringkas
                  Row(
                    children: [
                      _buildStatPill('Total', '${_cases.length}', const Color(0xFF38BDF8)),
                      const SizedBox(width: 6),
                      _buildStatPill('Sidang', '$inTrialCount', const Color(0xFFF5B942)),
                      const SizedBox(width: 6),
                      _buildStatPill('Approved', '$approvedCount', const Color(0xFF10B981)),
                      const SizedBox(width: 6),
                      _buildStatPill('Pailit/Tolak', '$otherDecidedCount', const Color(0xFFF87171)),
                    ],
                  ),
                ],
              ),
            ),

            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  _buildFilterChip('ALL', 'Semua (${_cases.length})'),
                  const SizedBox(width: 7),
                  _buildFilterChip('IN_TRIAL', '⏳ Dalam Sidang ($inTrialCount)'),
                  const SizedBox(width: 7),
                  _buildFilterChip('APPROVED', '✅ Dikabulkan ($approvedCount)'),
                  const SizedBox(width: 7),
                  _buildFilterChip('DISPUTE', '📜 Sengketa Akta'),
                  const SizedBox(width: 7),
                  _buildFilterChip('BANKRUPTCY', '⚖️ Pailit & PKPU'),
                  const SizedBox(width: 7),
                  _buildFilterChip('REGULATORY', '🚨 Regulasi OPFF'),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Daftar Perkara
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFFF5B942)))
                  : _filteredCases.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.balance_rounded,
                                  size: 44, color: const Color(0xFF475569).withValues(alpha: 0.6)),
                              const SizedBox(height: 10),
                              const Text(
                                'Belum ada perkara pada kategori ini',
                                style: TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(14, 2, 14, 86),
                          itemCount: _filteredCases.length,
                          itemBuilder: (ctx, idx) =>
                              _buildCaseCard(_filteredCases[idx], isAdminAuthority, user?.id),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatPill(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF070B14).withValues(alpha: 0.65),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w900,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 1),
            Text(
              label,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 8.5, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: const Color(0xFFF5B942),
      backgroundColor: const Color(0xFF0F172A),
      side: BorderSide(
        color: isSelected ? const Color(0xFFF5B942) : const Color(0xFF1E293B),
      ),
      visualDensity: VisualDensity.compact,
      labelStyle: TextStyle(
        color: isSelected ? const Color(0xFF0A0F1D) : const Color(0xFFCBD5E1),
        fontSize: 10.5,
        fontWeight: FontWeight.w800,
      ),
      onSelected: (val) {
        if (val) setState(() => _selectedFilter = key);
      },
    );
  }

  Widget _buildCaseCard(CourtCaseModel item, bool isAdminAuthority, String? currentUserId) {
    final visual = _getVerdictVisual(item);
    final String categoryLabel = item.caseType == 'BANKRUPTCY'
        ? 'KEPAILITAN & PKPU'
        : item.caseType == 'REGULATORY'
            ? 'PENGAWASAN OPFF'
            : 'SENGKETA NIAGA';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF11192C), Color(0xFF0B1120)],
        ),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
          color: visual.color.withValues(alpha: item.isApproved ? 0.55 : 0.35),
          width: item.isApproved ? 1.3 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: visual.color.withValues(alpha: 0.05),
            blurRadius: 12,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(15),
          onTap: () => _showVerdictModal(item),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Baris 1: Nomor Perkara & Badge Status Putusan
                Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            item.caseNumber,
                            style: const TextStyle(
                              color: Color(0xFFF5B942),
                              fontSize: 10,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E293B),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              categoryLabel,
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 8,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: visual.color.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: visual.color, width: 0.9),
                      ),
                      child: Text(
                        visual.label,
                        style: TextStyle(
                          color: visual.color,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Judul Pokok Perkara
                Text(
                  item.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 10),

                // Kotak Penggugat vs Tergugat
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14).withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'PENGGUGAT',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 8,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item.plaintiffName,
                              style: const TextStyle(
                                color: Color(0xFF38BDF8),
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: Text(
                          'VS',
                          style: TextStyle(
                            color: Color(0xFFF5B942),
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              'TERGUGAT',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 8,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item.defendantName,
                              style: const TextStyle(
                                color: Color(0xFFF87171),
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
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

                // Nilai Tuntutan & Kompensasi Cair (jika ada)
                if (item.claimAmountIb > 0 || item.verdictAwardedAmount > 0) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: item.verdictAwardedAmount > 0
                          ? const Color(0xFF10B981).withValues(alpha: 0.1)
                          : const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: item.verdictAwardedAmount > 0
                            ? const Color(0xFF10B981).withValues(alpha: 0.4)
                            : const Color(0xFF1E293B),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          item.verdictAwardedAmount > 0
                              ? '✅ Dana Kompensasi Cair:'
                              : 'Nilai Tuntutan / Klaim:',
                          style: TextStyle(
                            color: item.verdictAwardedAmount > 0
                                ? const Color(0xFF34D399)
                                : const Color(0xFF94A3B8),
                            fontSize: 9.5,
                            fontWeight: item.verdictAwardedAmount > 0
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                        Text(
                          CurrencyFormatter.formatFull(
                            item.verdictAwardedAmount > 0
                                ? item.verdictAwardedAmount
                                : item.claimAmountIb,
                          ),
                          style: TextStyle(
                            color: item.verdictAwardedAmount > 0
                                ? const Color(0xFF34D399)
                                : const Color(0xFFF5B942),
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Ringkasan Amar Putusan jika sudah selesai
                if (item.isDecided && item.verdictNotes.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    item.verdictNotes,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 10,
                      height: 1.3,
                    ),
                  ),
                ],

                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '📅 ${item.courtHearingDate} • ${item.hearingTime}',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (item.isDecided)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item.isBotDecided ? '⚖️ Majelis Hakim PNAF' : '👨‍⚖️ Hakim Agung',
                          style: const TextStyle(
                            color: Color(0xFFCBD5E1),
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    else
                      const Text(
                        'Berita Acara ➔',
                        style: TextStyle(
                          color: Color(0xFFF5B942),
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),

                // Tombol Aksi (Live Sidang vs Arsip Putusan Inkrah)
                if (item.isInTrial)
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 36,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.meeting_room_rounded, size: 15),
                            label: const Text(
                              '⚖️ MASUK RUANG SIDANG LIVE',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF5B942),
                              foregroundColor: const Color(0xFF0A0F1D),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(9),
                              ),
                            ),
                            onPressed: () => _openRoom(item.id),
                          ),
                        ),
                      ),
                      if (isAdminAuthority) ...[
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 36,
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.gavel_rounded, size: 14),
                            label: const Text(
                              'Ketuk Palu',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF34D399),
                              side: const BorderSide(color: Color(0xFF10B981)),
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(9),
                              ),
                            ),
                            onPressed: () => _showAdminQuickGavelSheet(item, currentUserId),
                          ),
                        ),
                      ],
                    ],
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 34,
                          child: OutlinedButton.icon(
                            icon: Icon(Icons.forum_rounded, size: 13, color: visual.color),
                            label: Text(
                              '📜 ARSIP RUANG SIDANG',
                              style: TextStyle(
                                color: visual.color,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: visual.color.withValues(alpha: 0.6)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onPressed: () => _openRoom(item.id),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 34,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.verified_rounded,
                              size: 13, color: Color(0xFFF5B942)),
                          label: const Text(
                            'AMAR PUTUSAN',
                            style: TextStyle(
                              color: Color(0xFFF5B942),
                              fontSize: 9.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(
                                color: const Color(0xFFF5B942).withValues(alpha: 0.5)),
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          onPressed: () => _showVerdictModal(item),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openRoom(String caseId) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => CourtLiveRoomScreen(caseId: caseId)),
    );
    if (mounted) {
      _fetchCases(silent: true);
    }
  }

  void _showAdminQuickGavelSheet(CourtCaseModel item, String? userId) {
    final notesCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0B1120),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        side: BorderSide(color: Color(0xFFF5B942), width: 1.2),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 18,
          right: 18,
          top: 16,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'KETUK PALU HAKIM AGUNG (${item.caseNumber})',
                    style: const TextStyle(
                      color: Color(0xFFF5B942),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              item.title,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              maxLines: 2,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                hintText: 'Catatan pertimbangan Hakim Agung (opsional)...',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                filled: true,
                fillColor: const Color(0xFF060A13),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF1E293B)),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildGavelActionBtn(
                  ctx: ctx,
                  item: item,
                  userId: userId,
                  verdictStatus: 'VERDICT_APPROVED',
                  label: '✅ Dikabulkan (Approved)',
                  color: const Color(0xFF10B981),
                  notesCtrl: notesCtrl,
                ),
                _buildGavelActionBtn(
                  ctx: ctx,
                  item: item,
                  userId: userId,
                  verdictStatus: 'VERDICT_PKPU',
                  label: '🤝 Mediasi / PKPU (50%)',
                  color: const Color(0xFF06B6D4),
                  notesCtrl: notesCtrl,
                ),
                _buildGavelActionBtn(
                  ctx: ctx,
                  item: item,
                  userId: userId,
                  verdictStatus: 'VERDICT_PAILIT',
                  label: '🔨 Vonis Pailit & Sita',
                  color: const Color(0xFFEF4444),
                  notesCtrl: notesCtrl,
                ),
                _buildGavelActionBtn(
                  ctx: ctx,
                  item: item,
                  userId: userId,
                  verdictStatus: 'VERDICT_REJECTED',
                  label: '❌ Tolak / Gugur',
                  color: const Color(0xFF64748B),
                  notesCtrl: notesCtrl,
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.smart_toy_rounded, size: 15),
                label: const Text(
                  '🤖 Biarkan Majelis Hakim Bot Memutuskan Otomatis',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFF5B942),
                  side: const BorderSide(color: Color(0xFFF5B942)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  _handleProcessNow(caseId: item.id);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGavelActionBtn({
    required BuildContext ctx,
    required CourtCaseModel item,
    required String? userId,
    required String verdictStatus,
    required String label,
    required Color color,
    required TextEditingController notesCtrl,
  }) {
    return SizedBox(
      width: (MediaQuery.of(ctx).size.width - 44) / 2,
      height: 38,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: color.withValues(alpha: 0.2),
          foregroundColor: Colors.white,
          side: BorderSide(color: color),
          padding: const EdgeInsets.symmetric(horizontal: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
        ),
        onPressed: () async {
          Navigator.pop(ctx);
          final messenger = ScaffoldMessenger.of(context);
          final prov = context.read<GameProvider>();
          final res = await ApiService.issueCourtVerdict(
            caseId: item.id,
            verdictStatus: verdictStatus,
            verdictNotes: notesCtrl.text.trim(),
            userId: userId,
            adminJudgeOverride: true,
          );
          await _fetchCases(silent: true);
          prov.fetchUserData();
          if (!mounted) return;
          messenger.showSnackBar(
            SnackBar(
              content: Text(
                res['error'] != null
                    ? '❌ ${res['error']}'
                    : '🔨 ${res['message'] ?? 'Putusan resmi diketuk!'}',
              ),
              backgroundColor: res['error'] != null ? Colors.red : const Color(0xFF059669),
            ),
          );
        },
        child: Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  void _showVerdictModal(CourtCaseModel item) {
    final visual = _getVerdictVisual(item);
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0A0F1D),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: visual.color, width: 1.5),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF152036),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  border: Border(bottom: BorderSide(color: visual.color.withValues(alpha: 0.35))),
                ),
                child: Row(
                  children: [
                    Icon(visual.icon, color: visual.color, size: 20),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'SALINAN PUTUSAN & BERITA ACARA PNAF',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                      constraints: const BoxConstraints(),
                      padding: EdgeInsets.zero,
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            item.caseNumber,
                            style: const TextStyle(
                              color: Color(0xFFF5B942),
                              fontSize: 10.5,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: visual.color.withValues(alpha: 0.16),
                            borderRadius: BorderRadius.circular(5),
                            border: Border.all(color: visual.color),
                          ),
                          child: Text(
                            visual.label,
                            style: TextStyle(
                              color: visual.color,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (item.verdictAwardedAmount > 0) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF10B981)),
                        ),
                        child: Text(
                          '💰 Eksekusi Kompensasi Cair: ${CurrencyFormatter.formatFull(item.verdictAwardedAmount)}',
                          style: const TextStyle(
                            color: Color(0xFF34D399),
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    const Text(
                      'AMAR PUTUSAN & PERTIMBANGAN MAJELIS HAKIM:',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF060A13),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Text(
                        item.verdictNotes.isNotEmpty
                            ? item.verdictNotes
                            : 'Perkara sedang dalam proses pemeriksaan bukti dan klarifikasi para pihak di hadapan Majelis Hakim PNAF.',
                        style: const TextStyle(
                          color: Color(0xFFCBD5E1),
                          fontSize: 11,
                          height: 1.4,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.forum_rounded, size: 14),
                            label: Text(
                              item.isInTrial ? 'Buka Ruang Sidang' : 'Lihat Transkrip Sidang',
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFFF5B942),
                              side: const BorderSide(color: Color(0xFFF5B942)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onPressed: () {
                              Navigator.pop(ctx);
                              _openRoom(item.id);
                            },
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
    );
  }
}

class _VerdictVisual {
  final String label;
  final String shortLabel;
  final Color color;
  final IconData icon;

  const _VerdictVisual({
    required this.label,
    required this.shortLabel,
    required this.color,
    required this.icon,
  });
}
