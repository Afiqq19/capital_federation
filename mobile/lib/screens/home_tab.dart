import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/user.dart';
import '../providers/game_provider.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';
import '../features/corporate_deals/widgets/p2p_negotiation_sheet.dart';
import '../features/corporate_deals/screens/corporate_deals_screen.dart';
import 'game_constitution_screen.dart';
import '../features/ipo/widgets/eipo_modal_sheet.dart';
import '../features/legal/widgets/notary_deed_viewer_modal.dart';
import '../widgets/bank_loan_dialog.dart';
import 'cash_flow_ledger_screen.dart';
import '../widgets/sovereign_bonds_modal.dart';
import '../widgets/government_tenders_modal.dart';
import 'profile_screen.dart';
import 'leaderboard_tab.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  String _selectedCompanyId = 'primary';
  final Set<String> _fetchingShareholders = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GameProvider>().fetchConglomerate();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final user = provider.user;

    if (user == null) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)));
    }

    final conglomerate = provider.conglomerate;
    final List<Map<String, dynamic>> allEntities = [...conglomerate];
    if (allEntities.isEmpty && user.hasPt) {
      allEntities.add({
        'id': 'primary',
        'name': 'PT ${user.ptName}',
        'symbol': user.ptName,
        'sector': user.sector,
        'isPrimary': true,
        'companyBalance': user.companyBalanceIb,
        'employeesCount': user.employeesCount,
        'ceoLevel': user.ceoLevel,
        'cfoLevel': user.cfoLevel,
        'cmoLevel': user.cmoLevel,
        'rdLevel': user.rdLevel,
        'marketingLevel': user.marketingLevel,
        'hrLevel': user.hrLevel,
        'capacityLevel': user.capacityLevel,
        'ptLevel': user.ptLevel,
        'fundamentalScore': user.fundamentalScore,
        'isIpo': user.isIpo,
        'ownershipPct': 100.0,
      });
    }

    final activeEntity = allEntities.firstWhere(
      (e) =>
          e['id'].toString() == _selectedCompanyId.toString() ||
          (_selectedCompanyId == 'primary' && e['isPrimary'] == true),
      orElse: () => allEntities.isNotEmpty ? allEntities.first : <String, dynamic>{},
    );

    final bool hasAnyBusiness = user.hasPt || allEntities.isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row with Rename PT Option
              _buildHeader(context, user, activeEntity, allEntities),
              const SizedBox(height: 16),

              // Conglomerate / Multi-PT Switcher (Always visible when user has PT / subsidiaries)
              if (hasAnyBusiness) ...[
                _buildConglomerateSwitcher(allEntities),
                const SizedBox(height: 16),
              ],

              // Banner Papan Peringkat Konglomerat (Ramai & Kompetitif)
              _buildLeaderboardBanner(context, provider, user),

              // Mode 1: Pemula (Belum Punya PT) vs Mode 2: Sudah Punya PT / Hasil Akuisisi
              if (!hasAnyBusiness)
                _buildBeginnerView(context, provider, user)
              else
                _buildTycoonView(context, provider, user, activeEntity),
            ],
          ),
        ),
      ),
    );
  }

  // --- BANNER PAPAN PERINGKAT KONGLOMERAT ---
  Widget _buildLeaderboardBanner(BuildContext context, GameProvider provider, UserModel user) {
    final leaderboard = provider.leaderboard;
    final int myRankIndex = leaderboard.indexWhere((item) => item['id'] == user.id || item['username'] == user.username);
    final String rankLabel = myRankIndex >= 0 ? '#${myRankIndex + 1}' : 'Unranked';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => Scaffold(
              appBar: AppBar(
                backgroundColor: const Color(0xFF0D1322),
                title: const Text('Papan Peringkat Konglomerat', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
              body: const SafeArea(child: LeaderboardTab()),
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16.0),
        padding: const EdgeInsets.all(14.0),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1E1B4B), Color(0xFF0F172A), Color(0xFF312E81)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.18),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.military_tech_rounded, color: Color(0xFFF59E0B), size: 28),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'PAPAN PERINGKAT KONGLOMERAT',
                        style: TextStyle(
                          color: Color(0xFFF59E0B),
                          fontWeight: FontWeight.w900,
                          fontSize: 10,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${leaderboard.length} Konglomerat Aktif',
                          style: const TextStyle(color: Color(0xFF34D399), fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Peringkat Anda: $rankLabel (${user.isBlueChip ? "BLUE CHIP" : "REGULER"})',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Lihat persaingan 100 taipan & ritel pasar modal ➔',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- HEADER KONGLOMERASI MODEREN ---
  Widget _buildHeader(
    BuildContext context,
    UserModel user,
    Map<String, dynamic> activeEntity,
    List<Map<String, dynamic>> allEntities,
  ) {
    final hasBusiness = user.hasPt || allEntities.isNotEmpty;
    final displayName = activeEntity['name'] ?? (user.hasPt ? 'PT ${user.ptName}' : 'Halo, ${user.username} 👋');
    final isPrimary = activeEntity['isPrimary'] == true || (!activeEntity.containsKey('isPrimary') && user.hasPt);
    final rawOwnership = (activeEntity['ownershipPct'] as num?)?.toDouble() ?? 100.0;
    final ownershipPct = rawOwnership.clamp(0.0, 100.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Bar 1: Holding Top Bar
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF38BDF8).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                    ),
                    child: const Icon(Icons.domain_rounded, color: Color(0xFF38BDF8), size: 17),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'HOLDING KONGLOMERASI',
                          style: TextStyle(
                            color: Color(0xFF38BDF8),
                            fontSize: 8.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          user.username,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 6),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Credit Score Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.speed_rounded, color: Color(0xFFF59E0B), size: 13),
                      const SizedBox(width: 3),
                      Text(
                        'Skor: ${user.creditScore}',
                        style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                // Regulasi & Konstitusi Game Button
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const GameConstitutionScreen(),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                    ),
                    child: const Icon(Icons.policy_rounded, color: Color(0xFF38BDF8), size: 16),
                  ),
                ),
                const SizedBox(width: 6),
                // Profil Akun & Identitas Konglomerat
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                      ),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 9,
                          backgroundColor: const Color(0xFF10B981),
                          child: Text(
                            (user.username.isNotEmpty ? user.username[0] : 'U').toUpperCase(),
                            style: const TextStyle(color: Color(0xFF022C22), fontSize: 10, fontWeight: FontWeight.w900),
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Icon(Icons.manage_accounts_rounded, color: Color(0xFF10B981), size: 14),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),

        // Bar 2: Corporate Profile Hero Card
        if (hasBusiness)
          Container(
            margin: const EdgeInsets.only(top: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isPrimary
                    ? [const Color(0xFF0C243B), const Color(0xFF0F172A)]
                    : [const Color(0xFF1E1B4B), const Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isPrimary
                    ? const Color(0xFF38BDF8).withValues(alpha: 0.35)
                    : const Color(0xFF818CF8).withValues(alpha: 0.35),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        displayName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.2,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () => _showRenameDialog(context, activeEntity),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit_rounded, color: Color(0xFFF59E0B), size: 11),
                            SizedBox(width: 4),
                            Text(
                              'REBRAND / EDIT',
                              style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9, fontWeight: FontWeight.w900),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isPrimary
                            ? const Color(0xFF38BDF8).withValues(alpha: 0.15)
                            : ((activeEntity['isSubsidiary'] == true || activeEntity['isAcquired'] != true)
                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                : const Color(0xFF818CF8).withValues(alpha: 0.15)),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isPrimary
                              ? const Color(0xFF38BDF8).withValues(alpha: 0.3)
                              : ((activeEntity['isSubsidiary'] == true || activeEntity['isAcquired'] != true)
                                  ? const Color(0xFF10B981).withValues(alpha: 0.3)
                                  : const Color(0xFF818CF8).withValues(alpha: 0.3)),
                        ),
                      ),
                      child: Text(
                        isPrimary
                            ? (user.isIpo ? 'PT UTAMA (TBK)' : 'PT UTAMA (TERTUTUP)')
                            : ((activeEntity['isSubsidiary'] == true || activeEntity['isAcquired'] != true)
                                ? 'ANAK PERUSAHAAN (${ownershipPct.toStringAsFixed(1)}%)'
                                : 'HASIL AKUISISI (${ownershipPct.toStringAsFixed(1)}%)'),
                        style: TextStyle(
                          color: isPrimary
                              ? const Color(0xFF38BDF8)
                              : ((activeEntity['isSubsidiary'] == true || activeEntity['isAcquired'] != true)
                                  ? const Color(0xFF34D399)
                                  : const Color(0xFFA5B4FC)),
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'SEKTOR ${(activeEntity['sector'] ?? user.sector).toString().toUpperCase()}',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (activeEntity['isIpo'] == true || (isPrimary && user.isIpo))
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                        ),
                        child: const Text(
                          'GO PUBLIC (TBK)',
                          style: TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }


  Widget _buildConglomerateSwitcher(List<Map<String, dynamic>> allEntities) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Portofolio Perusahaan',
              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${allEntities.length} Perusahaan',
                    style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    final provider = context.read<GameProvider>();
                    final bool hasBankrupt = allEntities.any((e) =>
                        (e['companyBalance'] != null && (e['companyBalance'] as num) <= -50000000.0) ||
                        e['status'] == 'BANKRUPT' ||
                        (e['isSeized'] == true && (e['seizeReason']?.toString().toUpperCase().contains('PAILIT') ?? false)));
                    if (hasBankrupt) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('⚠️ Anda memiliki entitas perseroan yang Bangkrut / Pailit! Anda dilarang mendirikan PT baru sebelum menyuntik modal dan memulihkan kepailitan.'),
                          backgroundColor: Color(0xFFEF4444),
                          duration: Duration(seconds: 4),
                        ),
                      );
                      return;
                    }
                    _showFoundCompanyDialog(context, provider, provider.user, true, isSubsidiary: true);
                  },
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF10B981), width: 0.9),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add_business_rounded, color: Color(0xFF10B981), size: 12),
                        SizedBox(width: 4),
                        Text(
                          '+ DIRIKAN PT BARU',
                          style: TextStyle(color: Color(0xFF10B981), fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 52,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: allEntities.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (ctx, idx) {
              final item = allEntities[idx];
              final isSel = item['id'].toString() == _selectedCompanyId.toString() ||
                  (_selectedCompanyId == 'primary' && item['isPrimary'] == true);
              final isPrimary = item['isPrimary'] == true;

              return InkWell(
                onTap: () {
                  setState(() {
                    _selectedCompanyId = (item['isPrimary'] == true) ? 'primary' : item['id'].toString();
                  });
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSel ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSel ? const Color(0xFF38BDF8) : const Color(0xFF334155),
                      width: isSel ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isPrimary ? Icons.business_center_rounded : Icons.account_balance_rounded,
                        color: isSel ? const Color(0xFF38BDF8) : const Color(0xFF94A3B8),
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            item['name'] ?? 'PT Perusahaan',
                            style: TextStyle(
                              color: isSel ? Colors.white : const Color(0xFFCBD5E1),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            isPrimary
                                ? 'PT Utama (${(item['ownershipPct'] ?? 100.0).toStringAsFixed(1)}%)'
                                : ((item['isSubsidiary'] == true || item['isAcquired'] != true)
                                    ? 'Anak Perusahaan (${(item['ownershipPct'] ?? 100.0).toStringAsFixed(1)}%)'
                                    : 'Hasil Akuisisi (${(item['ownershipPct'] ?? 51.0).toStringAsFixed(1)}%)'),
                            style: TextStyle(
                              color: isSel
                                  ? const Color(0xFF38BDF8)
                                  : ((item['isSubsidiary'] == true || item['isAcquired'] != true)
                                      ? const Color(0xFF10B981)
                                      : const Color(0xFF64748B)),
                              fontSize: 9,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ==========================================
  // MODE 1: INVESTOR PEMULA (MERINTIS DARI BURSA)
  // ==========================================
  Widget _buildBeginnerView(BuildContext context, GameProvider provider, dynamic user) {
    const double targetModalPt = 30000000.0; // IB 30 Juta
    final progress = (user.balanceIb / targetModalPt).clamp(0.0, 1.0);
    final isReadyToFound = user.balanceIb >= targetModalPt;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tabungan Kas Pribadi Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
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
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('KAS TABUNGAN PRIBADI', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1)),
                  Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF10B981), size: 22),
                ],
              ),
              const SizedBox(height: 10),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  CurrencyFormatter.formatFull(user.balanceIb),
                  style: const TextStyle(
                    color: Color(0xFF34D399),
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Kumpulkan modal dari capital gain saham & dividen untuk mendirikan PT sendiri!',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // SBN for Beginners
        InkWell(
          onTap: () => showSovereignBondsModal(context),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF065F46).withValues(alpha: 0.35),
                  const Color(0xFF047857).withValues(alpha: 0.15),
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.shield_outlined, color: Color(0xFF34D399), size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Investasi Surat Utang Negara (SBN)',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Dapatkan kupon imbal hasil 7.25% p.a. dijamin kas negara!',
                        style: TextStyle(color: Color(0xFF34D399), fontSize: 10),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF10B981), size: 13),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Roadmap Menuju Pendirian PT
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isReadyToFound ? const Color(0xFF10B981) : const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Target: Mendirikan PT Sendiri',
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${(progress * 100).toStringAsFixed(0)}%',
                    style: TextStyle(
                      color: isReadyToFound ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  backgroundColor: const Color(0xFF1E293B),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    isReadyToFound ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Tabungan: ${CurrencyFormatter.formatFull(user.balanceIb)}',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                  ),
                  const Text(
                    'Target: IB 30.000.000',
                    style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Button Dirikan PT
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  onPressed: () => _showFoundCompanyDialog(context, provider, user, isReadyToFound),
                  icon: const Icon(Icons.domain_add_rounded, size: 18),
                  label: Text(
                    isReadyToFound ? 'DIRIKAN PT SEKARANG (IB 30.000.000)' : 'DIRIKAN PT (BUTUH IB 30.000.000)',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isReadyToFound ? const Color(0xFF10B981) : const Color(0xFF1E293B),
                    foregroundColor: isReadyToFound ? const Color(0xFF022C22) : const Color(0xFF64748B),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Roadmap Guide
        const Text('Panduan Merintis Karier Konglomerat', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        _buildGuideStep('1', 'Beli Saham Sehat di Tab Pasar', 'Gunakan modal IB 10.000.000 untuk membeli 1-5 lot saham berstatus SEHAT yang membagikan dividen.', Icons.candlestick_chart_rounded),
        const SizedBox(height: 8),
        _buildGuideStep('2', 'Kumpulkan Profit & Dirikan PT', 'Setelah tabungan mencapai IB 25.000.000, daftarkan PT dan tentukan sektor industri Anda.', Icons.corporate_fare_rounded),
        const SizedBox(height: 8),
        _buildGuideStep('3', 'Riset R&D & Suntik Modal Usaha', 'Suntikkan kas pribadi ke kas PT, lakukan inovasi R&D untuk melipatgandakan valuasi.', Icons.biotech_rounded),
        const SizedBox(height: 8),
        _buildGuideStep('4', 'Go Public (IPO) di Bursa Saham', 'Raih level 4 dan kas IB 100.000.000 untuk listing IPO dan jual saham ke seluruh investor!', Icons.rocket_launch_rounded),
      ],
    );
  }

  // ==========================================
  // MODE 2: SUDAH PUNYA PT / HASIL AKUISISI
  // ==========================================
  Widget _buildTycoonView(BuildContext context, GameProvider provider, UserModel user, Map<String, dynamic> activeEntity) {
    final double companyBalance = (activeEntity['companyBalance'] ?? user.companyBalanceIb).toDouble();
    final bool isPrimary = activeEntity['isPrimary'] == true || (!activeEntity.containsKey('isPrimary') && user.hasPt);
    final bool isEntityIpo = isPrimary ? user.isIpo : (activeEntity['isIpo'] == true || activeEntity['isIpo'] == 1);
    final bool isSeized = activeEntity['isSeized'] == true;
    final String? seizeReason = activeEntity['seizeReason']?.toString();
    final bool isPailit = (seizeReason != null && seizeReason.toUpperCase().contains('PAILIT')) || activeEntity['status'] == 'BANKRUPT';
    final bool isBankrupt = companyBalance <= -50000000.0 || isPailit;
    final bool isDeficitWarning = !isBankrupt && companyBalance < 0;
    final double deficitToleranceRemaining = (50000000.0 + companyBalance).clamp(0.0, 50000000.0);
    final double deficitProgress = (companyBalance.abs() / 50000000.0).clamp(0.0, 1.0);
    final String entityName = isPrimary ? (user.ptName.isNotEmpty ? 'PT ${user.ptName}' : 'PT Utama') : (activeEntity['name'] ?? 'Perusahaan');

    final int rdLevel = (activeEntity['rdLevel'] as num?)?.toInt() ?? user.rdLevel;
    final int marketingLevel = (activeEntity['marketingLevel'] as num?)?.toInt() ?? user.marketingLevel;
    final int hrLevel = (activeEntity['hrLevel'] as num?)?.toInt() ?? user.hrLevel;
    final int capacityLevel = (activeEntity['capacityLevel'] as num?)?.toInt() ?? user.capacityLevel;
    final int ptLevel = (activeEntity['ptLevel'] as num?)?.toInt() ?? user.ptLevel;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. BANNER KEBANGKRUTAN (PAILIT) - DEFISIT KAS >= IB 30 JUTA
        if (isBankrupt) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF450A0A), Color(0xFF1E1014)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFEF4444), width: 1.8),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.25),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFEF4444), width: 1.2),
                      ),
                      child: const Icon(Icons.gavel_rounded, color: Color(0xFFFCA5A5), size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PERSEROAN DITUTUP BANGKRUT (PAILIT)',
                            style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 0.4),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Batas Defisit Maksimal (-IB 50.000.000) Terlampaui',
                            style: TextStyle(color: Colors.red.shade200, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF7F1D1D)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Defisit Kas Tercatat', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                          const SizedBox(height: 2),
                          Text(
                            CurrencyFormatter.formatFull(companyBalance),
                            style: const TextStyle(color: Color(0xFFF87171), fontSize: 15, fontWeight: FontWeight.w900),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7F1D1D),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('🔒 Operasional Dibekukan', style: TextStyle(color: Color(0xFFFECACA), fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  '⚠️ Beban operasional dan gaji telah menumpuk hingga batas toleransi kebangkrutan. Operasional dan pemotongan otomatis dibekukan agar tidak menumpuk utang. Segera suntikkan modal talangan dari kas pribadi atau ajukan pinjaman ke Bank BCF untuk membangkitkan perusahaan.',
                  style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 11, height: 1.4),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.volunteer_activism_rounded, size: 16),
                        label: const Text(
                          'SUNTIK KAS PRIBADI',
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                        ),
                        onPressed: () => _showTransferModal(context, provider, isInject: true, activeEntity: activeEntity),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.account_balance_rounded, size: 16),
                        label: const Text(
                          'PINJAM BANK BCF',
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                        ),
                        onPressed: () => showBankLoanModal(context),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ]
        // 2. BANNER PERINGATAN DEFISIT KAS (-30JT < BAL < 0)
        else if (isDeficitWarning) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2E1905), Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  blurRadius: 12,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFF59E0B), width: 1),
                      ),
                      child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFFBBF24), size: 22),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '🚨 ANCAMAN KEBANGKRUTAN (DEFISIT KAS)',
                            style: TextStyle(color: Color(0xFFFBBF24), fontSize: 12.5, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            'Kas $entityName berada di zona merah: ${CurrencyFormatter.formatFull(companyBalance)}',
                            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Progress Bar Defisit Menuju Pailit -IB 30M
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Toleransi Defisit Kas Terpakai:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                    Text(
                      'Sisa: ${CurrencyFormatter.formatFull(deficitToleranceRemaining)}',
                      style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: deficitProgress,
                    minHeight: 7,
                    backgroundColor: const Color(0xFF1E293B),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      deficitProgress > 0.7 ? const Color(0xFFEF4444) : const Color(0xFFF59E0B),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('0 (Mulai Rugi)', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                    Text('Batas Pailit: -IB 50.000.000', style: TextStyle(color: Color(0xFFEF4444), fontSize: 9.5, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  '💡 Beban operasional & gaji melebihi pendapatan. Jika minus mencapai -IB 50 Juta, PT akan otomatis ditutup bangkrut! Cegah kebangkrutan dengan menyuntikkan kas pribadi atau meminjam ke Bank Central Federation.',
                  style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 10.5, height: 1.35),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 9),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.arrow_upward_rounded, size: 15),
                        label: const Text(
                          'SUNTIK KAS PRIBADI',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        onPressed: () => _showTransferModal(context, provider, isInject: true, activeEntity: activeEntity),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 9),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.account_balance_rounded, size: 15),
                        label: const Text(
                          'PINJAM BANK BCF',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        onPressed: () => showBankLoanModal(context),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ]
        // 3. SITA EKSEKUSI PNAF BANNER (JIKA PT DISITA NEGARA NON-DEFISIT)
        else if (isSeized) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFEF4444).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFEF4444), width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.lock_rounded, color: Color(0xFFF87171), size: 22),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PERUSAHAAN DISITA NEGARA & PNAF',
                            style: TextStyle(color: Color(0xFFF87171), fontSize: 13, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            activeEntity['seizeReason'] != null && activeEntity['seizeReason'].toString().isNotEmpty
                                ? activeEntity['seizeReason'].toString()
                                : 'Eksekusi Kepaniteraan Pengadilan Niaga Federasi (PNAF) & Bank Sentral.',
                            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  '⚠️ Seluruh pemasukan omzet bisnis, dividen, dan penarikan kas perseroan dibekukan oleh negara. Untuk mengambil alih kembali perseroan, Anda wajib melunasi Denda Sanksi PNAF dan seluruh kewajiban Utang Pokok beserta Bunga Bank Sentral.',
                  style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 11, height: 1.4),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEF4444),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.currency_exchange_rounded, size: 18),
                    label: const Text(
                      '🔓 TEBUS PERUSAHAAN (BAYAR SANKSI & BANK)',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () => _showHomeRedemptionSheet(context, provider, user, activeEntity),
                  ),
                ),
              ],
            ),
          ),
        ],

        // DUAL TREASURY: Kas Pribadi & Kas Perusahaan
        Row(
          children: [
            // Kas Pribadi Card
            Expanded(
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
                    const Row(
                      children: [
                        Icon(Icons.person_outline_rounded, color: Color(0xFF38BDF8), size: 16),
                        SizedBox(width: 4),
                        Text('Kas Pribadi', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        CurrencyFormatter.formatFull(user.balanceIb),
                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Suntik Modal Button
                    SizedBox(
                      width: double.infinity,
                      height: 32,
                      child: ElevatedButton(
                        onPressed: () => _showTransferModal(context, provider, isInject: true, activeEntity: activeEntity),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                          foregroundColor: const Color(0xFF38BDF8),
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        child: const Text('💸 Suntik Modal', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),

            // Kas PT Card
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isBankrupt
                        ? const Color(0xFFEF4444).withValues(alpha: 0.8)
                        : (isDeficitWarning
                            ? const Color(0xFFF59E0B).withValues(alpha: 0.7)
                            : (isSeized
                                ? const Color(0xFFEF4444).withValues(alpha: 0.6)
                                : const Color(0xFF10B981).withValues(alpha: 0.4))),
                    width: (isBankrupt || isDeficitWarning) ? 1.5 : 1.0,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          isBankrupt
                              ? Icons.gavel_rounded
                              : (isDeficitWarning
                                  ? Icons.warning_amber_rounded
                                  : (isSeized ? Icons.lock_outline_rounded : Icons.business_rounded)),
                          color: isBankrupt
                              ? const Color(0xFFF87171)
                              : (isDeficitWarning
                                  ? const Color(0xFFFBBF24)
                                  : (isSeized ? const Color(0xFFF87171) : const Color(0xFF10B981))),
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            isPrimary ? 'Kas PT Utama' : 'Kas ${activeEntity['symbol'] ?? 'Perusahaan'}',
                            style: TextStyle(
                              color: isBankrupt
                                  ? const Color(0xFFF87171)
                                  : (isDeficitWarning
                                      ? const Color(0xFFFBBF24)
                                      : (isSeized ? const Color(0xFFF87171) : const Color(0xFF10B981))),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        CurrencyFormatter.formatFull(companyBalance),
                        style: TextStyle(
                          color: (isBankrupt || isDeficitWarning || isSeized)
                              ? const Color(0xFFF87171)
                              : const Color(0xFF34D399),
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // Action Button (Tarik Dividen vs Suntik/Bailout)
                    SizedBox(
                      width: double.infinity,
                      height: 32,
                      child: ElevatedButton(
                        onPressed: isBankrupt
                            ? () => _showTransferModal(context, provider, isInject: true, activeEntity: activeEntity)
                            : (isDeficitWarning
                                ? () => _showTransferModal(context, provider, isInject: true, activeEntity: activeEntity)
                                : (isSeized
                                    ? () => _showHomeRedemptionSheet(context, provider, user, activeEntity)
                                    : () => _showTransferModal(context, provider, isInject: false, activeEntity: activeEntity))),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isBankrupt
                              ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                              : (isDeficitWarning
                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.2)
                                  : (isSeized
                                      ? const Color(0xFFEF4444).withValues(alpha: 0.15)
                                      : const Color(0xFF10B981).withValues(alpha: 0.15))),
                          foregroundColor: isBankrupt
                              ? const Color(0xFFFCA5A5)
                              : (isDeficitWarning
                                  ? const Color(0xFFFBBF24)
                                  : (isSeized ? const Color(0xFFF87171) : const Color(0xFF34D399))),
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        child: Text(
                          isBankrupt
                              ? '🚑 Talangi Kas'
                              : (isDeficitWarning
                                  ? '⚠️ Tambah Kas'
                                  : (isSeized ? '🔒 Dibekukan' : '💰 Tarik Dividen')),
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Tombol Buku Kas & Riwayat Mutasi Transparan
        InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => CashFlowLedgerScreen(
                userId: user.id,
                initialAccountType: isPrimary ? 'PERSONAL' : 'COMPANY',
                initialCompanyId: isPrimary ? null : activeEntity['id'],
              ),
            ),
          ),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF0D9488).withValues(alpha: 0.18),
                  const Color(0xFF0F766E).withValues(alpha: 0.08),
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF14B8A6).withValues(alpha: 0.4)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14B8A6).withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF2DD4BF), size: 16),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Buku Kas & Riwayat Mutasi Transparan',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Cek mutasi uang masuk (+) & uang keluar (-) Kas Pribadi & Brankas PT',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF14B8A6), size: 13),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Dual Strategic Pillars: SBN & Tender Pengadaan Pemerintah
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () => showSovereignBondsModal(context),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF065F46).withValues(alpha: 0.35),
                        const Color(0xFF047857).withValues(alpha: 0.15),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.shield_outlined, color: Color(0xFF34D399), size: 16),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Surat Utang (SBN)', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                            Text('Kupon ORI / SBR', style: TextStyle(color: Color(0xFF34D399), fontSize: 9.5)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: InkWell(
                onTap: () => showGovernmentTendersModal(context, activeEntity: activeEntity),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF78350F).withValues(alpha: 0.35),
                        const Color(0xFFB45309).withValues(alpha: 0.15),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.assignment_turned_in_rounded, color: Color(0xFFFBBF24), size: 16),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Tender Proyek', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                            Text('Kontrak Ratusan Juta', style: TextStyle(color: Color(0xFFFBBF24), fontSize: 9.5)),
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
        const SizedBox(height: 16),

        // Financial Cash Flow & Revenue Indicator
        _buildFinancialCashflowCard(context, provider, user, activeEntity),
        const SizedBox(height: 16),

        // IPO Status Banner & Cap Table Pemegang Saham
        if (!isEntityIpo) ...[
          _buildIpoCard(context, provider, user, activeEntity: activeEntity),
          const SizedBox(height: 16),
        ] else ...[
          // Struktur Pemegang Saham & Opsi Divestasi
          _buildShareholdersSection(context, provider, activeEntity),
          const SizedBox(height: 20),
        ],

        // Riset & Pengembangan (R&D) and Operations
        Text(
          isPrimary ? 'Investasi R&D & Operasional PT (Level $ptLevel)' : 'Investasi R&D & Operasional ${activeEntity['name'] ?? 'PT'} (Level $ptLevel)',
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 4),
        const Text(
          'Biaya upgrade dipotong langsung dari Kas Perusahaan.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
        ),
        const SizedBox(height: 12),

        // Upgrade 1: R&D (Riset dan Pengembangan Inovasi)
        _buildUpgradeCard(
          context,
          title: '🔬 Riset & Inovasi (R&D)',
          desc: 'Menciptakan produk baru, menaikkan pendapatan pasif PT per siklus',
          level: rdLevel,
          cost: 5000000.0 * rdLevel,
          color: const Color(0xFF38BDF8),
          onTap: () => _executeUpgrade(context, provider, 'rd', activeEntity),
        ),
        const SizedBox(height: 10),

        // Upgrade 2: Marketing & Branding
        _buildUpgradeCard(
          context,
          title: '📢 Marketing & Reputasi Merek',
          desc: 'Mendongkrak daya tarik publik dan valuasi dasar saham',
          level: marketingLevel,
          cost: 5000000.0 * marketingLevel,
          color: const Color(0xFFEC4899),
          onTap: () => _executeUpgrade(context, provider, 'marketing', activeEntity),
        ),
        const SizedBox(height: 10),

        // Upgrade 3: Kualitas SDM & Eksekutif
        _buildUpgradeCard(
          context,
          title: '👥 Kualitas SDM & Talenta',
          desc: 'Mengurangi beban risiko operasional dan menjaga stabilitas PT',
          level: hrLevel,
          cost: 5000000.0 * hrLevel,
          color: const Color(0xFF8B5CF6),
          onTap: () => _executeUpgrade(context, provider, 'hr', activeEntity),
        ),
        const SizedBox(height: 10),

        // Upgrade 4: Kapasitas Produksi & Server
        _buildUpgradeCard(
          context,
          title: '🏭 Kapasitas Operasional & Pabrik',
          desc: 'Memperbesar skala omzet bisnis dan volume penjualan pasar',
          level: capacityLevel,
          cost: 5000000.0 * capacityLevel,
          color: const Color(0xFF06B6D4),
          onTap: () => _executeUpgrade(context, provider, 'capacity', activeEntity),
        ),
        const SizedBox(height: 20),

        // Struktur Tim & Eksekutif PT
        _buildStaffAndExecutiveSection(context, provider, user, activeEntity),
        const SizedBox(height: 24),
      ],
    );
  }

  // --- IPO CARD ---
  Widget _buildIpoCard(BuildContext context, GameProvider provider, UserModel user, {required Map<String, dynamic> activeEntity}) {
    final bool isPrimary = activeEntity['isPrimary'] == true;
    final double companyBalance = isPrimary
        ? user.companyBalanceIb
        : ((activeEntity['companyBalance'] as num?)?.toDouble() ?? 0.0);
    final int ptLevel = isPrimary
        ? user.ptLevel
        : ((activeEntity['ptLevel'] as num?)?.toInt() ?? 1);
    final String entityName = isPrimary ? user.ptName : (activeEntity['name'] ?? 'Perusahaan');
    const double minIpoKas = 250000000.0; // Syarat Kas Min IB 250 Juta
    const double ipoRegFee = 100000000.0; // Biaya Registrasi Bursa IB 100 Juta
    final bool canIpo = companyBalance >= (minIpoKas + ipoRegFee) && ptLevel >= 4;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: canIpo ? const Color(0xFFF59E0B) : const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.rocket_launch_rounded, color: Color(0xFFF59E0B), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isPrimary ? 'Kesiapan IPO PT Utama (Go Public)' : 'Kesiapan IPO $entityName',
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: canIpo ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  canIpo ? 'MEMENUHI SYARAT' : 'BELUM MEMENUHI',
                  style: TextStyle(
                    color: canIpo ? const Color(0xFF34D399) : const Color(0xFFF87171),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Syarat IPO: Kas Perusahaan minimal IB 250.000.000 + Biaya Registrasi Bursa CFX IB 100.000.000 dan Level PT min. 4. Saham akan masuk siklus Bookbuilding, Penawaran Umum, Penjatahan hingga Listing Melantai ARA di Bursa Efek Capital Federation.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton(
              onPressed: canIpo
                  ? () => _showIpoRegistrationDialog(context, provider, user, activeEntity: activeEntity)
                  : () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '⚠️ Syarat IPO belum terpenuhi! Kas $entityName saat ini ${CurrencyFormatter.formatFull(companyBalance)} (Butuh Kas Min. IB 250 Juta + Biaya Registrasi IB 100 Juta) & Level PT $ptLevel (Min. 4).',
                          ),
                          backgroundColor: Colors.red,
                        ),
                      );
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: canIpo ? const Color(0xFFF59E0B) : const Color(0xFF334155),
                foregroundColor: canIpo ? const Color(0xFF451A03) : const Color(0xFF94A3B8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('📋 ISI FORMULIR PENDAFTARAN IPO ', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 40,
            child: OutlinedButton.icon(
              onPressed: () => showEipoMarketSheet(
                context,
                onOpenRegister: canIpo ? () => _showIpoRegistrationDialog(context, provider, user, activeEntity: activeEntity) : null,
              ),
              icon: const Icon(Icons.hub_rounded, color: Color(0xFF38BDF8), size: 16),
              label: const Text('📊 BUKA TAB STATUS & JADWAL 4 TAHAP E-IPO', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.w900, fontSize: 11)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF0284C7), width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 38,
            child: OutlinedButton.icon(
              onPressed: () {
                showNotaryDeedModal(
                  context,
                  deedType: DeedType.ptEstablishment,
                  companyName: entityName,
                  symbol: isPrimary ? user.ptSymbol : (activeEntity['symbol'] ?? 'EMIT'),
                  founderName: user.username,
                  sector: isPrimary ? user.sector : (activeEntity['sector'] ?? 'Teknologi'),
                  nominalCapital: 15000000.0,
                );
              },
              icon: const Icon(Icons.history_edu_rounded, color: Color(0xFFF59E0B), size: 16),
              label: const Text('📜 LIHAT AKTA NOTARIS PENDIRIAN PT', style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 10.5)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFF59E0B), width: 1.0),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- UPGRADE CARD ---
  Widget _buildUpgradeCard(
    BuildContext context, {
    required String title,
    required String desc,
    required int level,
    required double cost,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text('Lvl $level', style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                const SizedBox(height: 4),
                Text('Biaya: ${CurrencyFormatter.formatFull(cost)} (Kas PT)', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E293B),
              foregroundColor: color,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('UPGRADE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );
  }

  // --- HELPER GUIDE STEP ---
  Widget _buildGuideStep(String step, String title, String desc, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: const Color(0xFF38BDF8), size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$step. $title', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- FORMULIR AKTA NOTARIS PENDIRIAN PERSEROAN TERBATAS (PT) ---
  void _showFoundCompanyDialog(
    BuildContext context,
    GameProvider provider,
    dynamic user,
    bool isReady, {
    bool isSubsidiary = false,
  }) {
    const double reqCost = 25000000.0;
    final double userBalance = (user.balanceIb as num).toDouble();
    final double compBalance = (user.companyBalanceIb as num).toDouble();
    final bool canAfford = isSubsidiary ? (compBalance >= reqCost || userBalance >= reqCost) : (userBalance >= reqCost);

    if (!canAfford) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Modal Belum Mencukupi', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
          content: Text(
            'Untuk mengesahkan Akta Pendirian PT berbadan hukum resmi, dibutuhkan modal awal IB 25.000.000 (modal disetor & biaya legalitas notaris IPMC).\n\nSaat ini saldo kas Anda:\n• Kas Pribadi: ${CurrencyFormatter.formatFull(userBalance)}\n${isSubsidiary ? '• Kas Holding PT: ${CurrencyFormatter.formatFull(compBalance)}\n' : ''}\nKumpulkan profit dari dividen atau penjualan saham di bursa terlebih dahulu!',
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('MENGERTI', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
      return;
    }

    final nameController = TextEditingController();
    final symbolController = TextEditingController();
    final descController = TextEditingController();
    String selectedSector = 'Teknologi';
    final sectors = [
      'Teknologi',
      'Properti & Konstruksi',
      'Keuangan & Perbankan',
      'Konsumer & F&B',
      'Energi & Tambang',
      'Manufaktur & Industri',
      'Kesehatan & Farmasi',
      'Transportasi & Logistik'
    ];
    bool agreedToDeed = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) {
          final rawName = nameController.text.trim();
          final cleanName = rawName.replaceAll(RegExp(r'^PT\.?\s*', caseSensitive: false), '').trim();
          final officialNamePreview = cleanName.isEmpty ? 'PT. [Nama Perusahaan]' : 'PT. $cleanName';
          final cleanSymbol = symbolController.text.trim().toUpperCase();
          final bool isSymbolValid = cleanSymbol.length == 4 && RegExp(r'^[A-Z]{4}$').hasMatch(cleanSymbol);
          final now = DateTime.now();
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          final formattedCurrentDate = '${now.day} ${months[now.month - 1]} ${now.year} (Hari Ini)';
          final bool canSubmit = cleanName.isNotEmpty && isSymbolValid && agreedToDeed;

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
              border: Border(top: BorderSide(color: Color(0xFF10B981), width: 2.0)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle Bar
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header Akta Notaris
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                        ),
                        child: const Icon(Icons.gavel_rounded, color: Color(0xFF10B981), size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isSubsidiary ? 'AKTA PENDIRIAN ANAK PERUSAHAAN (PT)' : 'AKTA NOTARIS PENDIRIAN PT BARU',
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                            ),
                            const Text(
                              'Pengesahan Badan Hukum Resmi & Sinkronisasi Bursa IPMC',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Card Identitas Pendiri & Tanggal Akta
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.verified_user_rounded, color: Color(0xFF38BDF8), size: 16),
                            const SizedBox(width: 6),
                            const Text('Identitas Pendiri Utama (Founder):', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('100% Saham Pendiri', style: TextStyle(color: Color(0xFF10B981), fontSize: 9.5, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${user.username} (Direktur Utama / Pendiri)',
                          style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.calendar_month_rounded, color: Color(0xFF64748B), size: 13),
                            const SizedBox(width: 4),
                            Text('Tanggal Akta: $formattedCurrentDate', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // 1. Nama Perusahaan (Format Wajib PT.)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Nama Resmi Perseroan Terbatas', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      Text(
                        officialNamePreview,
                        style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text('Sesuai Statuta Korporasi, nama wajib diawali dengan "PT." (dengan tanda titik).', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: nameController,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      prefixText: 'PT.  ',
                      prefixStyle: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14),
                      hintText: 'Contoh: Syafiq Makmur Sentosa',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF10B981))),
                    ),
                    onChanged: (_) => setSheetState(() {}),
                  ),
                  const SizedBox(height: 14),

                  // 2. Kode Singkatan Saham / Ticker (4 Huruf Kapital)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Kode Singkatan Perseroan (Calon Ticker Bursa)', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      if (isSymbolValid)
                        const Row(
                          children: [
                            Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 14),
                            SizedBox(width: 3),
                            Text('Valid', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text('Kode 4 huruf unik. Akan otomatis disinkronkan saat perusahaan melantai di Bursa Saham (IPO).', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: symbolController,
                    textCapitalization: TextCapitalization.characters,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z]')),
                      LengthLimitingTextInputFormatter(4),
                    ],
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.tag_rounded, color: Color(0xFFF59E0B), size: 20),
                      hintText: 'CONTOH: SYFQ',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), letterSpacing: 1),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF59E0B))),
                    ),
                    onChanged: (_) => setSheetState(() {}),
                  ),
                  const SizedBox(height: 14),

                  // 3. Sektor Industri
                  const Text('Klasifikasi Sektor Industri Bisnis', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedSector,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF0F172A),
                        icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF94A3B8)),
                        items: sectors.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(color: Colors.white, fontSize: 12)))).toList(),
                        onChanged: (val) {
                          if (val != null) setSheetState(() => selectedSector = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // 4. Deskripsi Profil & Model Usaha
                  const Text('Deskripsi Usaha & Model Bisnis', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Jelaskan lini produk dan fokus bisnis. Deskripsi ini otomatis sinkron ke Prospektus IPO di masa depan.', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: descController,
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Contoh: Manufaktur mebel kayu jati ukir premium kualitas ekspor ke pasar internasional...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B)),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF38BDF8))),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Card Rincian Modal Disetor
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                    ),
                    child: Column(
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Total Modal & Biaya Akta Notaris:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                            Text('IB 30.000.000', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(color: Color(0xFF1E293B), height: 14),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text('🏢 Kas Awal Modal Kerja PT:', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                            SizedBox(width: 8),
                            Text('+IB 15.000.000', style: TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text('📜 Biaya Notaris & Registrasi Federasi:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5), overflow: TextOverflow.ellipsis),
                            ),
                            SizedBox(width: 8),
                            Text('IB 15.000.000', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Ceklis Persetujuan Akta Notaris & Regulasi IPMC
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: agreedToDeed ? const Color(0xFF10B981) : const Color(0xFF334155),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Checkbox(
                          value: agreedToDeed,
                          activeColor: const Color(0xFF10B981),
                          checkColor: const Color(0xFF022C22),
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          onChanged: (val) {
                            setSheetState(() => agreedToDeed = val ?? false);
                          },
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setSheetState(() => agreedToDeed = !agreedToDeed);
                            },
                            child: const Text(
                              'Saya selaku Pendiri & Direktur Utama menyatakan bahwa seluruh data perseroan sah, modal disetor adalah dana riil, dan perseroan bersedia tunduk pada Statuta Korporasi serta Regulasi Otoritas Pasar Modal IPMC.',
                              style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.3),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: canSubmit
                          ? () async {
                              final name = cleanName;
                              final symbol = cleanSymbol;
                              final desc = descController.text.trim();
                              Navigator.pop(ctx);
                              final err = await provider.foundCompany(
                                ptName: name,
                                symbol: symbol,
                                sector: selectedSector,
                                description: desc,
                                isSubsidiary: isSubsidiary,
                                agreedToTerms: agreedToDeed,
                              );
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(err ?? '🎉 SELAMAT! PT. $name ($symbol) resmi berbadan hukum dan terdaftar di IPMC!'),
                                    backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                                  ),
                                );
                              }
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: canSubmit ? const Color(0xFF10B981) : const Color(0xFF1E293B),
                        foregroundColor: canSubmit ? const Color(0xFF022C22) : const Color(0xFF64748B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        canSubmit ? '✍️ TANDATANGANI AKTA & SAHKAN PT' : 'LENGKAPI FORMULIR & CENTANG CEKLIS',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
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

  Future<void> _showHomeRedemptionSheet(
    BuildContext context,
    GameProvider provider,
    UserModel user,
    Map<String, dynamic> activeEntity,
  ) async {
    final compDbId = activeEntity['companyDbId']?.toString() ?? activeEntity['id']?.toString();
    if (compDbId == null || compDbId == 'primary') {
      final primaryComp = provider.companies.where((c) => c.symbol == user.ptSymbol || c.symbol == user.ptName || c.name.contains(user.ptName)).toList();
      final targetId = primaryComp.isNotEmpty ? primaryComp.first.id : (activeEntity['companyDbId']?.toString() ?? user.id);
      _executeRedemptionModal(context, provider, user, targetId, activeEntity['name'] ?? 'PT Utama');
      return;
    }
    _executeRedemptionModal(context, provider, user, compDbId, activeEntity['name'] ?? 'Perusahaan');
  }

  Future<void> _executeRedemptionModal(
    BuildContext context,
    GameProvider provider,
    UserModel user,
    String companyId,
    String entityName,
  ) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return FutureBuilder<Map<String, dynamic>?>(
          future: ApiService.getRedemptionInfo(companyId),
          builder: (ctx, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Container(
                padding: const EdgeInsets.all(28),
                decoration: const BoxDecoration(
                  color: Color(0xFF0F172A),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Color(0xFFEF4444)),
                    SizedBox(height: 16),
                    Text('Menghitung rincian kewajiban sanksi PNAF & pelunasan bank...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ],
                ),
              );
            }

            final data = snapshot.data;
            if (data == null) {
              return Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: Color(0xFF0F172A),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 36),
                    const SizedBox(height: 12),
                    const Text('Gagal Memuat Data Penebusan', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Tutup'),
                    ),
                  ],
                ),
              );
            }

            final double pnafFine = (data['pnafSanctionFine'] as num?)?.toDouble() ?? 100000000.0;
            final double bankPrincipal = (data['bankLoanPrincipal'] as num?)?.toDouble() ?? 0.0;
            final double bankInterest = (data['bankLoanInterest'] as num?)?.toDouble() ?? 0.0;
            final double totalBankDebt = (data['totalBankDebt'] as num?)?.toDouble() ?? (bankPrincipal + bankInterest);
            final double totalCost = (data['totalRedemptionCost'] as num?)?.toDouble() ?? (pnafFine + totalBankDebt);
            final bool canAfford = user.balanceIb >= totalCost;

            return StatefulBuilder(
              builder: (ctx, setModalState) {
                bool isSubmitting = false;

                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0B1120),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                    border: Border(top: BorderSide(color: Color(0xFFEF4444), width: 1.5)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.lock_open_rounded, color: Color(0xFFF87171), size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'TEBUS PERUSAHAAN SITAAN',
                                  style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                                ),
                                Text(
                                  entityName,
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B).withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('⚖️ Denda Sanksi PNAF', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                                Text(CurrencyFormatter.formatFull(pnafFine), style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('🏦 Pokok Utang Bank Sentral', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                                Text(CurrencyFormatter.formatFull(bankPrincipal), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('📈 Bunga Pinjaman Bank', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                                Text(CurrencyFormatter.formatFull(bankInterest), style: const TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const Divider(color: Color(0xFF334155), height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('💰 TOTAL BIAYA PENEBUSAN', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900)),
                                Text(CurrencyFormatter.formatFull(totalCost), style: const TextStyle(color: Color(0xFF34D399), fontSize: 14, fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Saldo Kas Pribadi Anda:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                          Text(
                            CurrencyFormatter.formatFull(user.balanceIb),
                            style: TextStyle(
                              color: canAfford ? const Color(0xFF34D399) : const Color(0xFFF87171),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: canAfford ? const Color(0xFF10B981) : const Color(0xFF334155),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: (!canAfford || isSubmitting)
                              ? null
                              : () async {
                                  setModalState(() => isSubmitting = true);
                                  final res = await ApiService.redeemCompany(companyId: companyId, userId: user.id);
                                  if (!context.mounted) return;
                                  Navigator.pop(ctx);
                                  final messenger = ScaffoldMessenger.of(context);
                                  if (res['success'] == true) {
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(res['message'] ?? 'Perseroan berhasil ditebus!'),
                                        backgroundColor: const Color(0xFF10B981),
                                      ),
                                    );
                                    provider.fetchConglomerate();
                                    provider.refreshPortfolio();
                                    provider.loadInitialData();
                                  } else {
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(res['error'] ?? 'Gagal menebus perseroan'),
                                        backgroundColor: const Color(0xFFEF4444),
                                      ),
                                    );
                                  }
                                },
                          child: Text(
                            canAfford ? 'LUNASI & AMBIL ALIH KEMBALI' : 'SALDO KAS PRIBADI TIDAK CUKUP',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  // --- MODAL SUNTIK MODAL / TARIK DIVIDEN ---
  void _showTransferModal(
    BuildContext context,
    GameProvider provider, {
    required bool isInject,
    Map<String, dynamic>? activeEntity,
  }) {
    if (activeEntity != null && activeEntity['isSeized'] == true && !isInject) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Perusahaan ini sedang DISITA Negara/PNAF! Seluruh penarikan kas dibekukan.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    final amountController = TextEditingController();
    final user = provider.user;
    if (user == null) return;

    final bool isPrimary = activeEntity == null || activeEntity['isPrimary'] == true;
    final String companyName = isPrimary
        ? (user.ptName.isNotEmpty ? 'PT ${user.ptName}' : 'PT Utama')
        : (activeEntity['name'] ?? 'PT');
    final String? companyId = isPrimary ? null : activeEntity['id']?.toString();
    final double companyBalance = isPrimary
        ? user.companyBalanceIb
        : ((activeEntity['companyBalance'] ?? 0.0) as num).toDouble();

    final double maxAmount = isInject ? user.balanceIb : companyBalance;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(modalCtx).viewInsets.bottom),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(top: BorderSide(color: Color(0xFF334155), width: 1.5)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isInject
                            ? const Color(0xFF38BDF8).withValues(alpha: 0.15)
                            : const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        isInject ? Icons.account_balance_wallet_rounded : Icons.payments_rounded,
                        color: isInject ? const Color(0xFF38BDF8) : const Color(0xFF10B981),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isInject ? 'Suntik Modal ke PT' : 'Tarik Dividen ke Kas Pribadi',
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            companyName,
                            style: TextStyle(
                              color: isInject ? const Color(0xFF38BDF8) : const Color(0xFF34D399),
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isInject ? 'Kas Pribadi Tersedia:' : 'Kas PT Tersedia:',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                      ),
                      Text(
                        CurrencyFormatter.formatFull(maxAmount),
                        style: TextStyle(
                          color: isInject ? const Color(0xFF38BDF8) : const Color(0xFF34D399),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    labelText: 'Nominal Transfer (IB)',
                    labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    hintText: 'Contoh: 10000000',
                    hintStyle: const TextStyle(color: Color(0xFF334155), fontSize: 13),
                    filled: true,
                    fillColor: const Color(0xFF070B14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF334155)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF1E293B)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: isInject ? const Color(0xFF38BDF8) : const Color(0xFF10B981),
                        width: 1.5,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                // Quick Preset Percentage Chips
                Row(
                  children: [
                    _buildTransferPreset('25%', () {
                      setModalState(() {
                        final val = (maxAmount * 0.25).floor();
                        amountController.text = val.toString();
                        amountController.selection = TextSelection.fromPosition(TextPosition(offset: amountController.text.length));
                      });
                    }),
                    const SizedBox(width: 8),
                    _buildTransferPreset('50%', () {
                      setModalState(() {
                        final val = (maxAmount * 0.50).floor();
                        amountController.text = val.toString();
                        amountController.selection = TextSelection.fromPosition(TextPosition(offset: amountController.text.length));
                      });
                    }),
                    const SizedBox(width: 8),
                    _buildTransferPreset('75%', () {
                      setModalState(() {
                        final val = (maxAmount * 0.75).floor();
                        amountController.text = val.toString();
                        amountController.selection = TextSelection.fromPosition(TextPosition(offset: amountController.text.length));
                      });
                    }),
                    const SizedBox(width: 8),
                    _buildTransferPreset('MAX', () {
                      setModalState(() {
                        final val = maxAmount.floor();
                        amountController.text = val.toString();
                        amountController.selection = TextSelection.fromPosition(TextPosition(offset: amountController.text.length));
                      });
                    }, isHighlight: true),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: () async {
                      final raw = double.tryParse(amountController.text.replaceAll(RegExp(r'[^0-9]'), ''));
                      if (raw == null || raw <= 0) return;
                      Navigator.pop(ctx);
                      String? err;
                      if (isInject) {
                        err = await provider.fundCompany(raw, companyId: companyId);
                      } else {
                        err = await provider.withdrawCompany(raw, companyId: companyId);
                      }
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              err ??
                                  (isInject
                                      ? 'Berhasil menyuntik modal ${CurrencyFormatter.formatFull(raw)} ke $companyName!'
                                      : 'Berhasil menarik dividen ${CurrencyFormatter.formatFull(raw)} ke Kas Pribadi!'),
                            ),
                            backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isInject ? const Color(0xFF38BDF8) : const Color(0xFF10B981),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      isInject ? 'KONFIRMASI SUNTIK MODAL' : 'KONFIRMASI TARIK DIVIDEN',
                      style: TextStyle(
                        color: isInject ? const Color(0xFF082F49) : const Color(0xFF022C22),
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
      ),
    );
  }

  Widget _buildTransferPreset(String label, VoidCallback onTap, {bool isHighlight = false}) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isHighlight
                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isHighlight ? const Color(0xFF10B981).withValues(alpha: 0.5) : const Color(0xFF334155),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              color: isHighlight ? const Color(0xFF34D399) : const Color(0xFF94A3B8),
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  // --- KARTU ARUS KAS & PENDAPATAN PT (REALISTIS STARTUP & ANAK PERUSAHAAN) ---
  Widget _buildFinancialCashflowCard(BuildContext context, GameProvider provider, UserModel user, Map<String, dynamic> activeEntity) {
    final bool isPrimary = activeEntity['isPrimary'] == true || (!activeEntity.containsKey('isPrimary') && user.hasPt);
    final String shortName = isPrimary ? (user.ptSymbol.isNotEmpty ? user.ptSymbol : 'PT Utama') : (activeEntity['symbol'] ?? 'Anak PT');
    
    final int ptLevel = (activeEntity['ptLevel'] as num?)?.toInt() ?? user.ptLevel;
    final int rdLevel = (activeEntity['rdLevel'] as num?)?.toInt() ?? user.rdLevel;
    final int marketingLevel = (activeEntity['marketingLevel'] as num?)?.toInt() ?? user.marketingLevel;
    final int capacityLevel = (activeEntity['capacityLevel'] as num?)?.toInt() ?? user.capacityLevel;
    final int employeesCount = (activeEntity['employeesCount'] as num?)?.toInt() ?? (isPrimary ? user.employeesCount : 10);
    final int ceoLevel = (activeEntity['ceoLevel'] as num?)?.toInt() ?? (isPrimary ? user.ceoLevel : 0);
    final int cfoLevel = (activeEntity['cfoLevel'] as num?)?.toInt() ?? (isPrimary ? user.cfoLevel : 0);
    final int cmoLevel = (activeEntity['cmoLevel'] as num?)?.toInt() ?? (isPrimary ? user.cmoLevel : 0);
    final double fundScore = ((activeEntity['fundamentalScore'] as num?)?.toDouble() ?? (isPrimary ? user.fundamentalScore.toDouble() : 80.0)).clamp(50.0, 100.0);

    // 1. BEBAN OPERASIONAL DASAR & GAJI KARYAWAN/DIREKSI
    const double baseOps = 3000000.0; // Biaya sewa kantor, utilitas, server per siklus
    final double staffSalaries = employeesCount * 100000.0;
    final double ceoSalary = ceoLevel > 0 ? 1500000.0 : 0.0;
    final double cfoSalary = cfoLevel > 0 ? 1000000.0 : 0.0;
    final double cmoSalary = cmoLevel > 0 ? 1000000.0 : 0.0;
    double totalExpenses = baseOps + staffSalaries + ceoSalary + cfoSalary + cmoSalary;
    if (cfoLevel > 0) totalExpenses *= 0.75; // Efisiensi CFO 25% penghematan beban

    // 2. OMZET BISNIS BERDASARKAN R&D, BRANDING & SKALA PERUSAHAAN
    // Jika baru berdiri (R&D & Marketing rendah), omzet masih kecil sehingga net < 0 (Rugi Awal / Fase Bakar Modal).
    // Setelah R&D, Marketing, dan PT Level dinaikkan, perusahaan melampaui BEP dan laba bersih melesat!
    double rawGross = (ptLevel * 250000.0) +
                      (rdLevel * 450000.0) +
                      (marketingLevel * 300000.0) +
                      (capacityLevel * 200000.0) +
                      (employeesCount * 150000.0);
    if (ceoLevel > 0) rawGross *= 1.30; // CEO mendongkrak penjualan +30%
    if (cmoLevel > 0) rawGross *= 1.35; // CMO mendongkrak penetrasi pasar +35%
    final double multiplier = fundScore / 100.0;
    final double gross = rawGross * multiplier;

    final double net = gross - totalExpenses;
    final bool isProfit = net >= 0;

    // Cek Subsidi Sektoral Aktif & Tax Holiday
    final String currentSector = (activeEntity['sector'] ?? user.sector).toString().toLowerCase();
    Map<String, dynamic>? activeSubsidy;
    for (final s in provider.activeSubsidies) {
      final sName = (s['sector'] ?? s['sector_name'] ?? s['sectorName'] ?? '').toString().toLowerCase();
      final isActive = s['is_active'] == 1 || s['is_active'] == true || s['isActive'] == true;
      if (isActive && (currentSector.contains(sName) || sName.contains(currentSector))) {
        activeSubsidy = s;
        break;
      }
    }
    final double effTaxRatePct = activeSubsidy != null
        ? ((activeSubsidy['effective_tax_rate_pct'] ?? activeSubsidy['tax_rate_discount_pct'] ?? activeSubsidy['taxRateDiscountPct'] ?? 5.0) as num).toDouble()
        : provider.corporateTaxRatePct;
    final double grantAmt = activeSubsidy != null
        ? (((activeSubsidy['operational_grant_ib'] ?? activeSubsidy['operationalGrantIb'] ?? 0)) as num).toDouble()
        : 0.0;

    final double taxRate = (effTaxRatePct / 100.0).clamp(0.0, 0.50);
    final double corporateTax = isProfit ? (net * taxRate).roundToDouble() : 0.0;
    final double netAfterTax = isProfit ? (net - corporateTax + grantAmt) : (net + grantAmt);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isProfit ? const Color(0xFF1E293B) : const Color(0xFFEF4444).withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Tax Holiday Sektoral jika Aktif
          if (activeSubsidy != null) ...[
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF065F46), Color(0xFF047857)],
                ),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF34D399).withValues(alpha: 0.5)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.stars_rounded, color: Color(0xFF6EE7B7), size: 16),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '🔥 TAX HOLIDAY AKTIF: PPh Badan Diskon Jadi ${effTaxRatePct.toStringAsFixed(0)}%${grantAmt > 0 ? ' + Hibah Operasional ${CurrencyFormatter.formatFull(grantAmt)}' : ''}',
                      style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
            ),
          ],
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Icon(Icons.analytics_rounded, color: isProfit ? const Color(0xFF38BDF8) : const Color(0xFFF59E0B), size: 18),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'ARUS KAS: $shortName',
                        style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isProfit ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: isProfit ? const Color(0xFF10B981).withValues(alpha: 0.3) : const Color(0xFFEF4444).withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(isProfit ? Icons.trending_up_rounded : Icons.local_fire_department_rounded, color: isProfit ? const Color(0xFF34D399) : const Color(0xFFF87171), size: 12),
                    const SizedBox(width: 4),
                    Text(
                      isProfit ? 'PROFITABEL (BEP)' : 'FASE BAKAR MODAL',
                      style: TextStyle(color: isProfit ? const Color(0xFF34D399) : const Color(0xFFF87171), fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isProfit ? 'Laba Bersih Masuk Kas $shortName' : 'Rugi Bersih Kas $shortName',
                    style: TextStyle(color: isProfit ? const Color(0xFF94A3B8) : const Color(0xFFFCA5A5), fontSize: 11),
                  ),
                  Text(
                    isProfit ? '(Omzet - Beban Gaji & Ops - PPh ${effTaxRatePct.toStringAsFixed(0)}%${grantAmt > 0 ? ' + Subsidi' : ''})' : '(Omzet Penjualan - Beban Gaji & Ops)',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 9),
                  ),
                ],
              ),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  isProfit ? '+${CurrencyFormatter.formatFull(netAfterTax)}' : '-${CurrencyFormatter.formatFull(net.abs())}',
                  style: TextStyle(
                    color: isProfit ? const Color(0xFF34D399) : const Color(0xFFF87171),
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),
          if (!isProfit) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                '💡 Perusahaan baru rintisan: Upgrade R&D, Pemasaran, dan Level PT untuk melampaui Titik Impas (Break-Even Point)!',
                style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 9),
              ),
            ),
          ],
          const SizedBox(height: 12),
          const Divider(color: Color(0xFF1E293B), height: 1),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.schedule_rounded, color: Color(0xFF38BDF8), size: 12),
                  SizedBox(width: 4),
                  Text('Interval Siklus Arus Kas', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                ],
              ),
              Text(
                'Tiap ${provider.cashFlowIntervalMinutes} Menit',
                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('• Omzet Bisnis (R&D + Merek + SDM)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
              Text('+${CurrencyFormatter.formatFull(gross)}', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('• Beban Operasional & Gaji Tim', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
              Text('-${CurrencyFormatter.formatFull(totalExpenses)}', style: const TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          if (isProfit && corporateTax > 0) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('• Pajak PPh Badan (${provider.corporateTaxRatePct.toStringAsFixed(0)}% Kas Negara)', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                Text('-${CurrencyFormatter.formatFull(corporateTax)}', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // --- STRUKTUR TIM & EKSEKUTIF PT ---
  Widget _buildStaffAndExecutiveSection(BuildContext context, GameProvider provider, UserModel user, Map<String, dynamic> activeEntity) {
    final int employeesCount = (activeEntity['employeesCount'] ?? user.employeesCount) as int;
    final int ceoLevel = (activeEntity['ceoLevel'] ?? user.ceoLevel) as int;
    final int cfoLevel = (activeEntity['cfoLevel'] ?? user.cfoLevel) as int;
    final int cmoLevel = (activeEntity['cmoLevel'] ?? user.cmoLevel) as int;
    final String compName = activeEntity['name'] ?? 'PT ${user.ptName}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                'Tim & Direksi: $compName',
                style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '$employeesCount Staf Aktif',
                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Rekrut staf operasional dan jajaran direksi untuk meningkatkan kapasitas omzet & efisiensi biaya bisnis.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
        ),
        const SizedBox(height: 12),

        // Rekrut Staf Operasional
        _buildStaffCard(
          context,
          icon: Icons.groups_rounded,
          title: 'Staf Operasional Pabrik & Toko',
          desc: 'Setiap staf mendongkrak omzet +IB 350.000 / siklus (Beban gaji IB 100.000 / staf).',
          statusText: '$employeesCount Orang Bekerja',
          statusColor: const Color(0xFF38BDF8),
          actionLabel: 'REKRUT +5 STAF\n(IB 5.000.000)',
          isHired: false,
          onTap: () => _hireMember(context, provider, 'staff', 5000000.0, activeEntity: activeEntity),
        ),
        const SizedBox(height: 10),

        // Direktur Utama (CEO)
        _buildStaffCard(
          context,
          icon: Icons.person_pin_rounded,
          title: 'Direktur Utama (CEO)',
          desc: 'Memimpin visi PT. Memberikan bonus omzet +30% & menaikkan Skor Fundamental +15 poin.',
          statusText: ceoLevel > 0 ? '✅ Aktif Bekerja (Gaji: IB 1.500.000)' : 'Belum Diangkat',
          statusColor: ceoLevel > 0 ? const Color(0xFF34D399) : const Color(0xFFF59E0B),
          actionLabel: ceoLevel > 0 ? 'DIJABAT' : 'ANGKAT CEO\n(IB 25.000.000)',
          isHired: ceoLevel > 0,
          onTap: ceoLevel > 0 ? null : () => _hireMember(context, provider, 'ceo', 25000000.0, activeEntity: activeEntity),
        ),
        const SizedBox(height: 10),

        // Direktur Keuangan (CFO)
        _buildStaffCard(
          context,
          icon: Icons.account_balance_rounded,
          title: 'Direktur Keuangan (CFO)',
          desc: 'Mengelola arus kas PT. Memangkas seluruh beban operasional dan gaji sebesar 25%.',
          statusText: cfoLevel > 0 ? '✅ Aktif Bekerja (Gaji: IB 1.000.000)' : 'Belum Diangkat',
          statusColor: cfoLevel > 0 ? const Color(0xFF34D399) : const Color(0xFFF59E0B),
          actionLabel: cfoLevel > 0 ? 'DIJABAT' : 'ANGKAT CFO\n(IB 15.000.000)',
          isHired: cfoLevel > 0,
          onTap: cfoLevel > 0 ? null : () => _hireMember(context, provider, 'cfo', 15000000.0, activeEntity: activeEntity),
        ),
        const SizedBox(height: 10),

        // Direktur Pemasaran (CMO)
        _buildStaffCard(
          context,
          icon: Icons.campaign_rounded,
          title: 'Direktur Pemasaran (CMO)',
          desc: 'Memimpin ekspansi merek. Mendongkrak volume penjualan dan omzet PT sebesar +35%.',
          statusText: cmoLevel > 0 ? '✅ Aktif Bekerja (Gaji: IB 1.000.000)' : 'Belum Diangkat',
          statusColor: cmoLevel > 0 ? const Color(0xFF34D399) : const Color(0xFFF59E0B),
          actionLabel: cmoLevel > 0 ? 'DIJABAT' : 'ANGKAT CMO\n(IB 15.000.000)',
          isHired: cmoLevel > 0,
          onTap: cmoLevel > 0 ? null : () => _hireMember(context, provider, 'cmo', 15000000.0, activeEntity: activeEntity),
        ),
      ],
    );
  }

  Widget _buildStaffCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String desc,
    required String statusText,
    required Color statusColor,
    required String actionLabel,
    required bool isHired,
    required VoidCallback? onTap,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: const Color(0xFF38BDF8), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                const SizedBox(height: 4),
                Text(statusText, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: isHired ? const Color(0xFF1E293B) : const Color(0xFF38BDF8),
              foregroundColor: isHired ? const Color(0xFF64748B) : const Color(0xFF082F49),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(
              actionLabel,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }

  void _hireMember(BuildContext context, GameProvider provider, String type, double cost, {Map<String, dynamic>? activeEntity}) async {
    final user = provider.user;
    if (user == null) return;
    final double companyBalance = (activeEntity?['companyBalance'] ?? user.companyBalanceIb).toDouble();
    final companyId = (activeEntity != null && activeEntity['isPrimary'] != true) ? activeEntity['id']?.toString() : null;

    if (companyBalance < cost) {
      final deficit = cost - companyBalance;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text('⚠️ Kas PT Tidak Cukup', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Biaya rekrutmen: ${CurrencyFormatter.formatFull(cost)}', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
              const SizedBox(height: 6),
              Text('Kas PT saat ini: ${CurrencyFormatter.formatFull(companyBalance)}', style: const TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text('Kekurangan: ${CurrencyFormatter.formatFull(deficit)}', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12)),
              const SizedBox(height: 12),
              const Text('Silakan suntik modal dari tabungan kas pribadi Anda ke Kas PT.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('TUTUP', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _showTransferModal(context, provider, isInject: true);
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF38BDF8)),
              child: const Text('💸 SUNTIK MODAL', style: TextStyle(color: Color(0xFF082F49), fontWeight: FontWeight.bold, fontSize: 11)),
            ),
          ],
        ),
      );
      return;
    }

    final err = await provider.hireStaff(type, companyId: companyId);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err ?? '🎉 Rekrutmen berhasil! Kapasitas perusahaan meningkat.'),
          backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
        ),
      );
    }
  }

  void _showRenameDialog(BuildContext context, Map<String, dynamic> entity) {
    final provider = context.read<GameProvider>();
    final user = provider.user;
    if (user == null) return;

    final isIpo = entity['isIpo'] == true || user.isIpo;
    final initialName = entity['name']
            ?.toString()
            .replaceAll(RegExp(r'^PT\s+', caseSensitive: false), '')
            .replaceAll(RegExp(r'\s+Tbk\.?$', caseSensitive: false), '')
            .trim() ??
        '';
    final nameCtrl = TextEditingController(text: initialName);
    final symbolCtrl = TextEditingController(
      text: (entity['symbol'] != null && entity['symbol'].toString().length == 4)
          ? entity['symbol'].toString()
          : '',
    );
    final descCtrl = TextEditingController(text: entity['description']?.toString() ?? 'Perusahaan terkemuka dengan kinerja operasional solid.');
    String selectedSector = entity['sector']?.toString() ?? user.sector;
    final sectors = ['Teknologi', 'Perbankan & Finansial', 'Konsumer & Ritel', 'Energi & Tambang', 'Properti & Konstruksi', 'Manufaktur'];
    if (!sectors.contains(selectedSector)) {
      sectors.add(selectedSector);
    }
    const double renameCost = 25000000.0; // IB 25.000.000

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final previewName = 'PT ${nameCtrl.text.trim()}${isIpo ? ' Tbk.' : ''}';

          return AlertDialog(
            backgroundColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: const BorderSide(color: Color(0xFFF59E0B)),
            ),
            title: const Row(
              children: [
                Icon(Icons.verified_user_rounded, color: Color(0xFFF59E0B), size: 22),
                SizedBox(width: 8),
                Text('Audit & Rebrand Perusahaan', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Biaya Notaris & Tim Audit Penyidikan Banner
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.gavel_rounded, color: Color(0xFFF59E0B), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Biaya Notaris & Tim Audit: ${CurrencyFormatter.formatFull(renameCost)}',
                              style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Sesuai ketentuan bursa, perubahan identitas PT atau emiten akuisisi wajib melalui verifikasi due diligence tim penyidikan legalitas dan akta notaris resmi.',
                          style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Preview Nama Resmi
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.business_rounded, color: Color(0xFF38BDF8), size: 16),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Nama Resmi: $previewName',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Input Nama Baru
                  const Text('Nama Perusahaan Baru', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: nameCtrl,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Misal: Syafiq Corp',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    onChanged: (_) => setDialogState(() {}),
                  ),
                  const SizedBox(height: 12),

                  // Input Kode Saham 4 Huruf
                  const Text('Kode Saham / Ticker (4 Huruf Kapital)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: symbolCtrl,
                    textCapitalization: TextCapitalization.characters,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z]')),
                      LengthLimitingTextInputFormatter(4),
                    ],
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 2),
                    decoration: InputDecoration(
                      hintText: 'MISAL: SYFQ',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12, letterSpacing: 1),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Sektor Dropdown
                  const Text('Sektor Usaha', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedSector,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF0F172A),
                        icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF94A3B8)),
                        items: sectors.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(color: Colors.white, fontSize: 12)))).toList(),
                        onChanged: (val) {
                          if (val != null) setDialogState(() => selectedSector = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Deskripsi
                  const Text('Deskripsi Usaha & Profil Bisnis', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: descCtrl,
                    maxLines: 2,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Deskripsi bidang usaha...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.all(10),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('BATAL', style: TextStyle(color: Color(0xFF64748B))),
              ),
              ElevatedButton(
                onPressed: () async {
                  final newName = nameCtrl.text.trim();
                  if (newName.isEmpty || newName.length < 3) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Nama perusahaan minimal 3 karakter'), backgroundColor: Colors.red),
                    );
                    return;
                  }
                  final code = symbolCtrl.text.trim().toUpperCase();
                  if (code.isNotEmpty && (code.length != 4 || !RegExp(r'^[A-Z]{4}$').hasMatch(code))) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Kode saham harus tepat 4 huruf kapital (misal: BBCA, SYFQ)'), backgroundColor: Colors.red),
                    );
                    return;
                  }
                  Navigator.pop(ctx);
                  final err = await provider.renameCompany(
                    companyId: entity['id'] ?? 'primary',
                    newName: newName,
                    newSymbol: code.isNotEmpty ? code : null,
                    description: descCtrl.text.trim(),
                    sector: selectedSector,
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(err ?? '🎉 Berhasil! Perubahan disahkan notaris dan tim audit penyidikan.'),
                        backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                      ),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
                child: const Text('PROSES & BAYAR IB 25.000.000', style: TextStyle(color: Color(0xFF451A03), fontWeight: FontWeight.bold, fontSize: 11)),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- IPO PROSPECTUS REGISTRATION MODAL ---
  void _showIpoRegistrationDialog(BuildContext context, GameProvider provider, UserModel user, {required Map<String, dynamic> activeEntity}) {
    final bool isPrimary = activeEntity['isPrimary'] == true;
    final String rawName = isPrimary ? user.ptName : (activeEntity['name'] ?? 'Perusahaan');
    final cleanPtName = rawName.replaceAll(RegExp(r'^PT\.?\s*', caseSensitive: false), '').replaceAll(RegExp(r'\s+Tbk\.?$', caseSensitive: false), '').trim();
    String defaultSymbol = isPrimary
        ? (user.ptSymbol.isNotEmpty ? user.ptSymbol : cleanPtName.replaceAll(RegExp(r'[^a-zA-Z]'), '').toUpperCase())
        : (activeEntity['symbol'] ?? cleanPtName.replaceAll(RegExp(r'[^a-zA-Z]'), '').toUpperCase());
    if (defaultSymbol.length > 4) {
      defaultSymbol = defaultSymbol.substring(0, 4);
    } else {
      defaultSymbol = defaultSymbol.padRight(4, 'X');
    }

    final symbolCtrl = TextEditingController(text: defaultSymbol);
    final descCtrl = TextEditingController(
      text: isPrimary
          ? (user.ptDescription.isNotEmpty
              ? user.ptDescription
              : 'Emiten sektor ${user.sector} terdepan dengan profitabilitas tinggi, manajemen profesional, dan prospek pertumbuhan bisnis yang berkelanjutan.')
          : (activeEntity['description'] ?? 'Emiten sektor ${activeEntity['sector']} terdepan dengan profitabilitas tinggi, manajemen profesional, dan prospek pertumbuhan bisnis yang berkelanjutan.'),
    );
    String selectedSector = isPrimary
        ? (user.sector.isNotEmpty ? user.sector : 'Teknologi')
        : (activeEntity['sector'] ?? 'Teknologi');
    final sectors = ['Teknologi', 'Perbankan & Finansial', 'Konsumer & Ritel', 'Energi & Tambang', 'Properti & Konstruksi', 'Manufaktur'];
    if (!sectors.contains(selectedSector)) {
      sectors.add(selectedSector);
    }
    double floatingPct = 10.0;
    const double ipoPrice = 2500.0;
    int selectedTotalLots = 100000; // 100 Ribu Lot = 10 Juta lembar (Papan Akselerasi Rintisan)
    bool agreedToIpmcRules = false;
    final double companyBalance = isPrimary
        ? user.companyBalanceIb
        : ((activeEntity['companyBalance'] as num?)?.toDouble() ?? 0.0);
    const double minCompanyBalance = 250000000.0;
    const double ipoRegFee = 100000000.0;
    final bool isPtFundReady = companyBalance >= (minCompanyBalance + ipoRegFee);

    final now = DateTime.now();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    String formatD(DateTime d) => '${d.day} ${months[d.month - 1]} ${d.year}';

    DateTime bookStart = now;
    DateTime bookEnd = now.add(const Duration(days: 2));
    DateTime offerStart = now.add(const Duration(days: 3));
    DateTime offerEnd = now.add(const Duration(days: 5));
    DateTime allotmentD = now.add(const Duration(days: 6));
    DateTime listingD = now.add(const Duration(days: 7));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final int totalShares = selectedTotalLots * 100;
          final int publicShares = (totalShares * (floatingPct / 100.0)).round();
          final int publicLots = (publicShares / 100).round();
          final double strategicPct = (100.0 - floatingPct - 50.0).clamp(0.0, 40.0);
          final double founderPct = 100.0 - floatingPct - strategicPct;
          final double totalGrossIpo = publicShares * ipoPrice;
          final double ipoInjectionCompany = totalGrossIpo * 0.75;
          final double ipoInjectionPersonal = totalGrossIpo * 0.25;

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
                      decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(2)),
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
                        child: const Icon(Icons.account_balance_rounded, color: Color(0xFFF59E0B), size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Registrasi Prospektus IPO (Go Public)', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900)),
                            Text('Pencatatan Perdana Saham di Bursa Efek Capital Federation (CFX)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Info Badan Hukum Tbk
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.verified_rounded, color: Color(0xFF38BDF8), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1)),
                              children: [
                                const TextSpan(text: 'Nama Perusahaan Resmi Bursa: '),
                                TextSpan(
                                  text: 'PT. $cleanPtName Tbk.',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                                const TextSpan(text: '\n(Sesuai regulasi CFX, perseroan publik otomatis berakhiran '),
                                const TextSpan(text: 'Tbk.', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                                const TextSpan(text: ')'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Syarat Kas PT & Biaya Pendaftaran IPO
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isPtFundReady ? const Color(0xFF070B14) : const Color(0xFF7F1D1D).withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isPtFundReady ? const Color(0xFF10B981).withValues(alpha: 0.4) : const Color(0xFFEF4444)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Kas PT Anda Saat Ini:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                            Text(CurrencyFormatter.formatFull(companyBalance),
                                style: TextStyle(color: isPtFundReady ? const Color(0xFF34D399) : const Color(0xFFF87171), fontSize: 11.5, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('• Syarat Minimal Kas PT:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                            Text('IB 250.000.000', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('• Biaya Pendaftaran IPO (Bursa CFX):', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10)),
                            Text('IB 100.000.000', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        if (!isPtFundReady) ...[
                          const SizedBox(height: 4),
                          const Text('⚠️ Saldo Kas PT belum mencukupi (Butuh Kas Min. IB 250 Juta + Biaya Registrasi IB 100 Juta).', style: TextStyle(color: Color(0xFFF87171), fontSize: 9.5)),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Pilihan Total 100% Modal Saham Dasar
                  const Text('Total 100% Modal Saham Dasar Perseroan:', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      // Opsi 1: Papan Akselerasi (100 Ribu Lot = 10 Juta Lembar)
                      Expanded(
                        child: InkWell(
                          onTap: () => setModalState(() => selectedTotalLots = 100000),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            decoration: BoxDecoration(
                              color: selectedTotalLots == 100000 ? const Color(0xFF0284C7).withValues(alpha: 0.25) : const Color(0xFF070B14),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: selectedTotalLots == 100000 ? const Color(0xFF38BDF8) : const Color(0xFF334155)),
                            ),
                            child: const Column(
                              children: [
                                Text('100 Ribu Lot', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                Text('10 Juta Lbr (Rintisan)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      // Opsi 2: Papan Pengembangan (500 Ribu Lot = 50 Juta Lembar)
                      Expanded(
                        child: InkWell(
                          onTap: () => setModalState(() => selectedTotalLots = 500000),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            decoration: BoxDecoration(
                              color: selectedTotalLots == 500000 ? const Color(0xFF0284C7).withValues(alpha: 0.25) : const Color(0xFF070B14),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: selectedTotalLots == 500000 ? const Color(0xFF38BDF8) : const Color(0xFF334155)),
                            ),
                            child: const Column(
                              children: [
                                Text('500 Ribu Lot', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                Text('50 Juta Lbr (Berkembang)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      // Opsi 3: Papan Utama (1 Juta Lot = 100 Juta Lembar)
                      Expanded(
                        child: InkWell(
                          onTap: () => setModalState(() => selectedTotalLots = 1000000),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            decoration: BoxDecoration(
                              color: selectedTotalLots == 1000000 ? const Color(0xFF7C3AED).withValues(alpha: 0.25) : const Color(0xFF070B14),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: selectedTotalLots == 1000000 ? const Color(0xFFA855F7) : const Color(0xFF334155)),
                            ),
                            child: const Column(
                              children: [
                                Text('1 Juta Lot 🔥', style: TextStyle(color: Color(0xFFC084FC), fontSize: 10.5, fontWeight: FontWeight.w900)),
                                Text('100 Juta Lbr (Utama)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 8)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Kode Saham / Ticker (4 Huruf)
                  const Text('Kode Saham Bursa (Ticker 4 Huruf Kapital)', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Singkatan unik untuk pencarian saham di bursa (misal: BBCA, ASII, TLKM).', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: symbolCtrl,
                    textCapitalization: TextCapitalization.characters,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z]')),
                      LengthLimitingTextInputFormatter(4),
                    ],
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 2),
                    decoration: InputDecoration(
                      hintText: 'CONTOH: SYFQ',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), letterSpacing: 1),
                      prefixIcon: const Icon(Icons.tag_rounded, color: Color(0xFFF59E0B)),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF59E0B))),
                    ),
                    onChanged: (_) => setModalState(() {}),
                  ),
                  const SizedBox(height: 14),

                  // Klasifikasi Sektor
                  const Text('Sektor Industri & Klasifikasi Usaha', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: selectedSector,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF0F172A),
                        icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF94A3B8)),
                        items: sectors.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(color: Colors.white, fontSize: 12)))).toList(),
                        onChanged: (val) {
                          if (val != null) setModalState(() => selectedSector = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Deskripsi Profil & Model Usaha
                  const Text('Deskripsi Usaha & Prospektus Ringkas', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Jelaskan bidang usaha, keunggulan, serta model bisnis perseroan kepada investor.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: descCtrl,
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Jelaskan bidang usaha...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B)),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF38BDF8))),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Porsi Saham Publik (Free Float)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Porsi Saham Publik (Free Float)', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      Text('${floatingPct.toStringAsFixed(0)}% (${CurrencyFormatter.formatFull(publicLots.toDouble()).replaceAll('IB ', '')} Lot)', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text('Persentase total saham yang dilepas ke publik bursa (Regulasi CFX: 10% - 40%).', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [10.0, 15.0, 20.0, 30.0, 40.0].map((pct) {
                      final isSelected = floatingPct == pct;
                      return ChoiceChip(
                        label: Text('${pct.toStringAsFixed(0)}%'),
                        selected: isSelected,
                        selectedColor: const Color(0xFFF59E0B),
                        backgroundColor: const Color(0xFF070B14),
                        labelStyle: TextStyle(
                          color: isSelected ? const Color(0xFF451A03) : const Color(0xFFCBD5E1),
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                        onSelected: (val) {
                          if (val) setModalState(() => floatingPct = pct);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),

                  // Struktur Kepemilikan Pasca-IPO
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Struktur Alokasi Saham:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('• Publik Ritel (${floatingPct.toStringAsFixed(0)}%):', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10)),
                            Text('${CurrencyFormatter.formatNumberOnly(publicLots)} Lot', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('• Mitra Strategis Korporasi (${strategicPct.toStringAsFixed(0)}%):', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 10)),
                            Text('${CurrencyFormatter.formatNumberOnly((selectedTotalLots * strategicPct / 100).round())} Lot', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('• Pendiri & Pengendali (${founderPct.toStringAsFixed(0)}%):', style: const TextStyle(color: Color(0xFF34D399), fontSize: 10)),
                            Text('${CurrencyFormatter.formatNumberOnly((selectedTotalLots * founderPct / 100).round())} Lot', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // JADWAL PELAKSANAAN 4 TAHAP E-IPO (ATUR TANGGAL JADWAL)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.calendar_month_rounded, color: Color(0xFF38BDF8), size: 16),
                            SizedBox(width: 6),
                            Text('Jadwal 4 Tahap Emisi E-IPO (Standar Regulasi)', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Ketuk baris jadwal di bawah untuk mengatur rentang tanggal emisi resmi:',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                        ),
                        const Divider(color: Color(0xFF1E293B), height: 16),

                        // Stage 1
                        InkWell(
                          onTap: () async {
                            final picked = await showDateRangePicker(
                              context: context,
                              firstDate: now,
                              lastDate: now.add(const Duration(days: 365)),
                              initialDateRange: DateTimeRange(start: bookStart, end: bookEnd),
                            );
                            if (picked != null) {
                              setModalState(() {
                                // standard schedule
                                bookStart = picked.start;
                                bookEnd = picked.end;
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.handshake_rounded, color: Color(0xFF38BDF8), size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('1. Bookbuilding (Mitra Investor)', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                      Text('${formatD(bookStart)} - ${formatD(bookEnd)}', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10)),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 14),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),

                        // Stage 2
                        InkWell(
                          onTap: () async {
                            final picked = await showDateRangePicker(
                              context: context,
                              firstDate: now,
                              lastDate: now.add(const Duration(days: 365)),
                              initialDateRange: DateTimeRange(start: offerStart, end: offerEnd),
                            );
                            if (picked != null) {
                              setModalState(() {
                                offerStart = picked.start;
                                offerEnd = picked.end;
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.campaign_rounded, color: Color(0xFF10B981), size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('2. Penawaran Umum (Publik Ritel)', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                      Text('${formatD(offerStart)} - ${formatD(offerEnd)}', style: const TextStyle(color: Color(0xFF10B981), fontSize: 10)),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 14),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),

                        // Stage 3
                        InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: allotmentD,
                              firstDate: now,
                              lastDate: now.add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setModalState(() {
                                allotmentD = picked;
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.pie_chart_rounded, color: Color(0xFFF59E0B), size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('3. Penjatahan Otomatis (Allotment)', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                      Text(formatD(allotmentD), style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 10)),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 14),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),

                        // Stage 4
                        InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: listingD,
                              firstDate: now,
                              lastDate: now.add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setModalState(() {
                                listingD = picked;
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.rocket_launch_rounded, color: Color(0xFFA855F7), size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('4. Pencatatan Perdana di Bursa (07:00 WIB)', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                                      Text('${formatD(listingD)} (Debut Bursa CFX)', style: const TextStyle(color: Color(0xFFA855F7), fontSize: 10)),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.edit_calendar_rounded, color: Color(0xFF64748B), size: 14),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Card Estimasi Perolehan Dana Segar
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.monetization_on_rounded, color: Color(0xFF10B981), size: 16),
                            SizedBox(width: 6),
                            Text('Estimasi Perolehan Dana Segar IPO', style: TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Dana Terkumpul:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                            Text(CurrencyFormatter.formatFull(totalGrossIpo), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(color: Color(0xFF1E293B), height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('🏢 75% Kas Perusahaan (Ekspansi):', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11)),
                            Text('+${CurrencyFormatter.formatFull(ipoInjectionCompany)}', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('👤 25% Kas Pribadi (Dividen Pendiri):', style: TextStyle(color: Color(0xFF34D399), fontSize: 11)),
                            Text('+${CurrencyFormatter.formatFull(ipoInjectionPersonal)}', style: const TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Checkbox & Syarat Ketentuan Statuta & Regulasi IPMC / CFX
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: agreedToIpmcRules ? const Color(0xFF10B981) : const Color(0xFFF59E0B).withValues(alpha: 0.5),
                        width: 1.2,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Checkbox(
                              value: agreedToIpmcRules,
                              activeColor: const Color(0xFF10B981),
                              checkColor: const Color(0xFF022C22),
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              onChanged: (val) {
                                setModalState(() => agreedToIpmcRules = val ?? false);
                              },
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setModalState(() => agreedToIpmcRules = !agreedToIpmcRules);
                                },
                                child: const Text(
                                  'Saya telah membaca, memahami, dan menyetujui seluruh Peraturan & Regulasi Pasar Modal Bursa Efek Capital Federation (CFX).',
                                  style: TextStyle(color: Colors.white, fontSize: 11, height: 1.3),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.only(left: 36, right: 8),
                          child: InkWell(
                            onTap: () => _showIpmcRegulationDialog(context),
                            child: const Row(
                              children: [
                                Icon(Icons.gavel_rounded, color: Color(0xFF38BDF8), size: 14),
                                SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Buka & Pelajari Salinan Regulasi CFX (5 Pasal)',
                                    style: TextStyle(
                                      color: Color(0xFF38BDF8),
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.bold,
                                      decoration: TextDecoration.underline,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: (!isPtFundReady || !agreedToIpmcRules)
                          ? null
                          : () async {
                              final code = symbolCtrl.text.trim().toUpperCase();
                              if (code.length != 4 || !RegExp(r'^[A-Z]{4}$').hasMatch(code)) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Kode saham harus tepat 4 huruf kapital (misal: BBCA, SYFQ)'), backgroundColor: Colors.red),
                                );
                                return;
                              }
                              Navigator.pop(ctx);
                              final err = await provider.ipoCompany(
                                companyId: isPrimary ? null : (activeEntity['id'] as String?),
                                symbol: code,
                                description: descCtrl.text.trim(),
                                sector: selectedSector,
                                ipoPrice: ipoPrice,
                                floatingPct: floatingPct,
                                totalShares: totalShares,
                                initialStatus: 'BOOKBUILDING',
                                bookbuildingDate: '${formatD(bookStart)} - ${formatD(bookEnd)}',
                                offeringDate: '${formatD(offerStart)} - ${formatD(offerEnd)}',
                                allotmentDate: formatD(allotmentD),
                                listingDate: formatD(listingD),
                              );
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(err ?? '🎉 SELAMAT! PT. $cleanPtName Tbk. ($code) resmi didaftarkan IPO di Bursa Efek Capital Federation! Masuk tahap Bookbuilding penawaran mitra.'),
                                    backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                                  ),
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: agreedToIpmcRules && isPtFundReady ? const Color(0xFF2563EB) : const Color(0xFF334155),
                        foregroundColor: agreedToIpmcRules && isPtFundReady ? Colors.white : const Color(0xFF94A3B8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('DAFTARKAN IPO (IB 100.000.000)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
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

  // --- MODAL STATUTA & REGULASI RESMI BURSA EFEK IPMC ---
  void _showIpmcRegulationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
        ),
        title: const Row(
          children: [
            Icon(Icons.account_balance_rounded, color: Color(0xFF38BDF8), size: 22),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Regulasi & Statuta Bursa IPMC',
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF38BDF8).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                  ),
                  child: const Text(
                    'PERATURAN BURSA EFEK IPMC NOMOR 8/IPMC-OJK\nPedoman Tata Kelola Emiten, Perlindungan Modal Investor, Hak Kepemilikan, dan Penegakan Sanksi Suspensi Pasar Modal.',
                    style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold, height: 1.3),
                  ),
                ),
                const SizedBox(height: 14),

                _buildRegulationArticle(
                  'Pasal 1: Hak Pengendali & Kepemilikan Saham',
                  'Pendiri perseroan berhak mempertahankan sisa lembar saham non-floating (minimal 51% saat IPO) dan berstatus sah sebagai Pemegang Saham Pengendali (PSP) mutlak.',
                ),
                _buildRegulationArticle(
                  'Pasal 2: Divestasi & Peralihan Pengendali',
                  'Pemegang saham pengendali berhak menjual sebagian kepemilikannya ke publik atau investor strategis. Selama porsi kepemilikan pendiri adalah yang terbesar atau di atas 50%, hak kendali perseroan tetap berada di tangan pendiri.',
                ),
                _buildRegulationArticle(
                  'Pasal 3: Kriteria Pengawasan UMA & Suspensi Bursa',
                  'Bursa Efek IPMC berwenang membekukan (suspensi) perdagangan suatu emiten jika terindikasi masa kritis, kejatuhan harga ekstrim beruntun, atau krisis likuiditas parah, demi melindungi modal investor publik dari kerugian total.',
                ),
                _buildRegulationArticle(
                  'Pasal 4: Denda Administrasi Pemulihan Bursa',
                  'Pencabutan status suspensi dikenakan denda administrasi pemulihan bursa sebesar IB 50.000.000 (Lima Puluh Juta IB) yang wajib disetorkan ke kas bursa IPMC.',
                ),
                _buildRegulationArticle(
                  'Pasal 5: Penjualan Darurat & Batas Penyitaan 3 Hari',
                  'Emiten yang disuspensi berhak melakukan Penjualan Saham Darurat (Diskon 50%) kepada konsorsium/investor baru untuk melunasi denda bursa. Apabila dalam waktu 3 Hari (72 Jam) denda pemulihan tidak dilunasi, maka Bursa IPMC berhak menyita dan mengelola perseroan tersebut.',
                ),
              ],
            ),
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF38BDF8),
              foregroundColor: const Color(0xFF082F49),
            ),
            child: const Text('SAYA MENGERTI & SETUJU', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _buildRegulationArticle(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 3),
          Text(body, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.35)),
        ],
      ),
    );
  }

  // --- CAP TABLE PEMEGANG SAHAM ---
  Widget _buildShareholdersSection(BuildContext context, GameProvider provider, Map<String, dynamic> activeEntity) {
    final companyDbId = activeEntity['companyDbId']?.toString() ?? activeEntity['id']?.toString() ?? 'primary';
    final double ownershipPct = (activeEntity['ownershipPct'] ?? 100.0).toDouble();

    final shareholders = provider.getShareholdersFor(companyDbId);

    // If not cached yet, silently fetch once in background without blocking UI
    if (shareholders.isEmpty && !_fetchingShareholders.contains(companyDbId)) {
      _fetchingShareholders.add(companyDbId);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        provider.getShareholders(companyDbId).then((_) {
          _fetchingShareholders.remove(companyDbId);
        });
      });
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.pie_chart_rounded, color: Color(0xFF38BDF8), size: 18),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Struktur Pemegang Saham',
                  style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              // Button Pasar Negosiasi & Akta
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CorporateDealsScreen()),
                  );
                },
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.inventory_2_rounded, color: Color(0xFF38BDF8), size: 11),
                      SizedBox(width: 3),
                      Text('BRANKAS & AKTA', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 9, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // Button Divestasi Saham
              InkWell(
                onTap: () => P2PNegotiationSheet.show(context, activeEntity),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.sell_rounded, color: Color(0xFFF59E0B), size: 11),
                      SizedBox(width: 3),
                      Text('JUAL SAHAM', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Kepemilikan Anda: ${ownershipPct.toStringAsFixed(1)}%. Anda dapat menjual sebagian saham untuk pencairan uang tunai ke Kas Pribadi.',
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
          ),
          const SizedBox(height: 12),

          // Cap Table Body
          if (shareholders.isEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: Color(0xFF64748B), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Kepemilikan penuh 100% oleh Anda (${activeEntity['name']}). Belum ada porsi saham yang dilepas ke bursa atau konsorsium.',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              children: [
                // Stacked Bar Visualisation
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: SizedBox(
                    height: 8,
                    child: Row(
                      children: shareholders.map((sh) {
                        final pct = (sh['percentage'] as num?)?.toDouble() ?? 0.0;
                        final type = sh['holder_type']?.toString() ?? 'FOUNDER';
                        Color barColor = const Color(0xFF10B981);
                        if (type == 'INSTITUTION') {
                          barColor = sh['holder_name'].toString().contains('Astra') ? const Color(0xFF38BDF8) : const Color(0xFF8B5CF6);
                        } else if (type == 'PUBLIC') {
                          barColor = const Color(0xFFF59E0B);
                        }
                        return Expanded(
                          flex: (pct * 10).round().clamp(1, 1000),
                          child: Container(color: barColor),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // List of Shareholders
                ...shareholders.map((sh) {
                  final name = sh['holder_name']?.toString() ?? 'Pemegang Saham';
                  final pct = (sh['percentage'] as num?)?.toDouble() ?? 0.0;
                  final shares = (sh['shares_count'] as num?)?.toInt() ?? 0;
                  final lots = (shares / 100).round();
                  final type = sh['holder_type']?.toString() ?? 'FOUNDER';

                  Color badgeColor = const Color(0xFF10B981);
                  String badgeLabel = 'PENGENDALI';
                  IconData icon = Icons.shield_rounded;

                  if (type == 'INSTITUTION') {
                    badgeColor = name.contains('Astra') ? const Color(0xFF38BDF8) : const Color(0xFF8B5CF6);
                    badgeLabel = 'INSTITUSI';
                    icon = Icons.corporate_fare_rounded;
                  } else if (type == 'PUBLIC') {
                    badgeColor = const Color(0xFFF59E0B);
                    badgeLabel = 'PUBLIK RITEL';
                    icon = Icons.groups_rounded;
                  }

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        Icon(icon, color: badgeColor, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              Text(
                                '${CurrencyFormatter.formatFull(shares.toDouble()).replaceAll('IB ', '')} lbr (${CurrencyFormatter.formatFull(lots.toDouble()).replaceAll('IB ', '')} lot)',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: badgeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('${pct.toStringAsFixed(1)}%', style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.w900)),
                              Text(badgeLabel, style: TextStyle(color: badgeColor, fontSize: 7, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
        ],
      ),
    );
  }

  void _executeUpgrade(BuildContext context, GameProvider provider, String type, Map<String, dynamic> activeEntity) async {
    final user = provider.user;
    if (user == null) return;

    final bool isPrimary = activeEntity['isPrimary'] == true;
    final String? companyId = isPrimary ? null : (activeEntity['id'] as String?);
    final String entityName = (activeEntity['name'] as String?) ?? (isPrimary ? user.ptName : 'Perusahaan');

    int currentLvl = 1;
    if (type == 'rd') {
      currentLvl = (activeEntity['rdLevel'] as num?)?.toInt() ?? user.rdLevel;
    } else if (type == 'marketing') {
      currentLvl = (activeEntity['marketingLevel'] as num?)?.toInt() ?? user.marketingLevel;
    } else if (type == 'hr') {
      currentLvl = (activeEntity['hrLevel'] as num?)?.toInt() ?? user.hrLevel;
    } else if (type == 'capacity') {
      currentLvl = (activeEntity['capacityLevel'] as num?)?.toInt() ?? user.capacityLevel;
    }

    final double availableCash = isPrimary
        ? user.companyBalanceIb
        : ((activeEntity['companyBalance'] as num?)?.toDouble() ?? 0.0);

    final cost = 5000000.0 * currentLvl;
    if (availableCash < cost) {
      final deficit = cost - availableCash;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          title: Text('⚠️ Saldo Kas $entityName Kurang', style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Biaya upgrade ke level ${currentLvl + 1}: ${CurrencyFormatter.formatFull(cost)}', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
              const SizedBox(height: 6),
              Text('Kas PT Anda saat ini: ${CurrencyFormatter.formatFull(availableCash)}', style: const TextStyle(color: Color(0xFFF87171), fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text('Kekurangan: ${CurrencyFormatter.formatFull(deficit)}', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12)),
              const SizedBox(height: 12),
              const Text('Anda dapat menyuntikkan modal dari tabungan kas pribadi Anda ke kas PT.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('TUTUP', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _showTransferModal(context, provider, isInject: true, activeEntity: activeEntity);
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF38BDF8)),
              child: const Text('💸 SUNTIK MODAL SEKARANG', style: TextStyle(color: Color(0xFF082F49), fontWeight: FontWeight.bold, fontSize: 11)),
            ),
          ],
        ),
      );
      return;
    }

    final err = await provider.upgradeBusiness(type, companyId: companyId);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err ?? '🎉 Upgrade ${type.toUpperCase()} pada $entityName berhasil!'),
          backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
        ),
      );
    }
  }
}
