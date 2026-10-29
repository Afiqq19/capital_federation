import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';

void showGovernmentTendersModal(BuildContext context, {Map<String, dynamic>? activeEntity}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _GovernmentTendersSheet(activeEntity: activeEntity),
  );
}

class _GovernmentTendersSheet extends StatefulWidget {
  final Map<String, dynamic>? activeEntity;
  const _GovernmentTendersSheet({this.activeEntity});

  @override
  State<_GovernmentTendersSheet> createState() => _GovernmentTendersSheetState();
}

class _GovernmentTendersSheetState extends State<_GovernmentTendersSheet> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GameProvider>().fetchTenders();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final tenders = provider.governmentTenders;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: Color(0xFFF59E0B), width: 2.0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF334155),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF78350F), Color(0xFFB45309)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.4)),
                ),
                child: const Icon(Icons.assignment_turned_in_rounded, color: Color(0xFFFDE68A), size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TENDER PROYEK PEMERINTAH',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.4,
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.business_center_rounded, color: Color(0xFFF59E0B), size: 12),
                        const SizedBox(width: 4),
                        const Expanded(
                          child: Text(
                            'Pengadaan Mega-Proyek Strategis Nasional',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFFF59E0B)),
                tooltip: 'Sinkronisasi Data Tender',
                onPressed: () {
                  context.read<GameProvider>().fetchTenders();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Katalog tender berhasil disinkronkan!'),
                      duration: Duration(milliseconds: 1200),
                      backgroundColor: Color(0xFF0F172A),
                    ),
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Explanatory Banner
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline_rounded, color: Color(0xFFFBBF24), size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Pemerintah membuka lelang proyek infrastruktur & digitalisasi. PT pemenang tender menerima kontrak bernilai ratusan juta langsung disuntikkan ke Brankas PT!',
                    style: TextStyle(color: Color(0xFFFDE68A), fontSize: 10.5, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Tenders List
          Expanded(
            child: tenders.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.engineering_outlined, color: Color(0xFF64748B), size: 36),
                        SizedBox(height: 8),
                        Text(
                          'Belum ada tender proyek yang sedang dibuka.',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    itemCount: tenders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (ctx, i) {
                      final t = tenders[i];
                      final tenderNumber = t['tender_code']?.toString() ?? t['tenderNumber']?.toString() ?? 'TDR';
                      final title = t['title']?.toString() ?? 'Mega Proyek';
                      final sector = t['sector']?.toString() ?? 'General';
                      final budget = ((t['contract_value_ib'] ?? t['budgetIb'] ?? t['budget_ib'] ?? 0) as num).toDouble();
                      final minCap = ((t['min_cap_requirement_ib'] ?? t['minCapRequirementIb'] ?? 25000000.0) as num).toDouble();
                      final status = t['status']?.toString() ?? 'OPEN';
                      final isOpen = status == 'OPEN' || status == 'OPEN_FOR_BIDS';
                      final winnerComp = t['winner_company_name']?.toString() ?? t['awardedCompanyName']?.toString();
                      final bidsCount = (t['total_bids'] ?? t['bidsCount'] ?? t['bids_count'] ?? 0) as num;
                      final myBidStatus = t['my_bid_status']?.toString();
                      final hasMyBid = myBidStatus != null && myBidStatus.isNotEmpty;

                      final borderColor = hasMyBid
                          ? const Color(0xFF10B981).withValues(alpha: 0.6)
                          : isOpen
                              ? const Color(0xFFF59E0B).withValues(alpha: 0.4)
                              : const Color(0xFF1E293B);

                      return Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () {
                            if (hasMyBid) {
                              _showMyBidDetailsDialog(context, t);
                            } else if (isOpen) {
                              _showBidProposalDialog(context, provider, t);
                            } else {
                              _showTenderInfoDialog(context, t);
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFF070B14),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: borderColor, width: hasMyBid ? 1.5 : 1.0),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF1E293B),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        tenderNumber,
                                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    if (hasMyBid)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                                        ),
                                        child: const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 12),
                                            SizedBox(width: 4),
                                            Text(
                                              'PROPOSAL TERDAFTAR',
                                              style: TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.w900),
                                            ),
                                          ],
                                        ),
                                      )
                                    else
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isOpen
                                              ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                              : const Color(0xFF64748B).withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: isOpen
                                                ? const Color(0xFF10B981).withValues(alpha: 0.4)
                                                : const Color(0xFF64748B).withValues(alpha: 0.3),
                                          ),
                                        ),
                                        child: Text(
                                          isOpen ? 'LELANG DIBUKA ($bidsCount Proposal)' : 'SELESAI / DIMENANGKAN',
                                          style: TextStyle(
                                            color: isOpen ? const Color(0xFF34D399) : const Color(0xFF94A3B8),
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  title,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  t['description']?.toString() ?? 'Pengadaan fasilitas skala nasional.',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                ),
                                const SizedBox(height: 10),

                                // Stats Grid
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0F172A),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFF1E293B)),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Nilai Kontrak Pengadaan:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                                          Text(
                                            CurrencyFormatter.formatFull(budget),
                                            style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.w900),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Syarat Min. Kas PT:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                                          Text(
                                            CurrencyFormatter.formatFull(minCap),
                                            style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Sektor Sasaran:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                                          Text(
                                            sector.toUpperCase(),
                                            style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),

                                if (!isOpen && winnerComp != null) ...[
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(11),
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                          const Color(0xFF10B981).withValues(alpha: 0.15)
                                        ],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.6)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.emoji_events_rounded, color: Color(0xFFFBBF24), size: 22),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                'KONTRAK RESMI DITETAPKAN!',
                                                style: TextStyle(color: Color(0xFFFBBF24), fontSize: 9.5, fontWeight: FontWeight.w900, letterSpacing: 0.4),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Pemenang Tender: $winnerComp',
                                                style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w900),
                                              ),
                                              const SizedBox(height: 2),
                                              const Text(
                                                'Dana proyek telah dicairkan ke Kas PT pemenang & disiarkan di Berita Nasional.',
                                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ] else if (hasMyBid) ...[
                                  SizedBox(
                                    width: double.infinity,
                                    height: 38,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _showMyBidDetailsDialog(context, t),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF065F46),
                                        foregroundColor: const Color(0xFFD1FAE5),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        elevation: 0,
                                      ),
                                      icon: const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF34D399)),
                                      label: Text(
                                        'PROPOSAL TERKIRIM (Skor: ${t['my_bid_score'] ?? 85.0}/100)',
                                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
                                      ),
                                    ),
                                  ),
                                ] else if (isOpen) ...[
                                  SizedBox(
                                    width: double.infinity,
                                    height: 38,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _showBidProposalDialog(context, provider, t),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFFF59E0B),
                                        foregroundColor: const Color(0xFF451A03),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      icon: const Icon(Icons.send_rounded, size: 15),
                                      label: const Text('AJUKAN PROPOSAL BIDDING PT', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showBidProposalDialog(BuildContext context, GameProvider provider, Map<String, dynamic> tender) {
    final tenderId = tender['id']?.toString() ?? '';
    final title = tender['title']?.toString() ?? 'Mega Proyek';
    final tenderSector = (tender['sector'] ?? '').toString().trim();
    final budget = ((tender['contract_value_ib'] ?? tender['budgetIb'] ?? tender['budget_ib'] ?? 0) as num).toDouble();
    final minCap = ((tender['min_cap_requirement_ib'] ?? tender['minCapRequirementIb'] ?? 25000000.0) as num).toDouble();

    final user = provider.user;
    final conglomerate = provider.conglomerate;

    String cleanPtName(String raw) {
      final trimmed = raw.trim();
      final upper = trimmed.toUpperCase();
      if (upper.startsWith('PT.') || upper.startsWith('PT ')) {
        return trimmed;
      }
      return 'PT. $trimmed';
    }

    bool isSectorMatch(String tSec, String cSec) {
      final t = tSec.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
      final c = cSec.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
      if (t.isEmpty || t == 'semua' || t == 'umum') return true;
      if (c == t) return true;
      if (c.contains(t) || t.contains(c)) return true;
      return false;
    }

    // 1. Kumpulkan seluruh PT milik user / konglomerasi
    final List<Map<String, dynamic>> allCompanies = [];
    final Set<String> seenIds = {};

    for (int i = 0; i < conglomerate.length; i++) {
      final c = conglomerate[i];
      final cid = c['id']?.toString() ?? 'sub_$i';
      final isSeized = c['isSeized'] == true || c['status'] == 'SEIZED';
      if (isSeized) continue; // PT yang disita TIDAK boleh mengikuti tender

      if (!seenIds.contains(cid)) {
        seenIds.add(cid);
        final rawName = c['name']?.toString() ?? 'Perseroan';
        final isPrimary = c['isPrimary'] == true || cid == 'primary';
        final cSector = (c['sector'] ?? (isPrimary ? user?.sector : null) ?? 'Teknologi').toString().trim();
        allCompanies.add({
          'id': cid,
          'name': isPrimary ? '${cleanPtName(rawName)} (PT Utama)' : cleanPtName(rawName),
          'sector': cSector,
          'balance': ((c['companyBalance'] ?? 0.0) as num).toDouble(),
        });
      }
    }

    if (!seenIds.contains('primary') && user != null && user.hasPt) {
      seenIds.add('primary');
      final pName = user.ptName.toString();
      allCompanies.add({
        'id': 'primary',
        'name': '${cleanPtName(pName)} (PT Utama)',
        'sector': user.sector.trim(),
        'balance': user.companyBalanceIb,
      });
    }

    // 2. Filter ketat: HANYA perseroan di sektor tender proyek yang bersangkutan
    final List<Map<String, dynamic>> eligibleCompanies = allCompanies.where((c) {
      return isSectorMatch(tenderSector, c['sector']?.toString() ?? '');
    }).toList();

    // 3. Jika tidak ada PT yang cocok dengan sektor tender
    if (eligibleCompanies.isEmpty) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFFEF4444), width: 1.5),
          ),
          title: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 24),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Sektor Industri Tidak Cocok',
                  style: TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Paket tender "$title" dikhususkan untuk perseroan di sektor $tenderSector.',
                style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 11.5, height: 1.4),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFFF87171), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Anda belum memiliki PT yang terdaftar di sektor $tenderSector. Dirikan PT baru atau akuisisi perusahaan di sektor $tenderSector untuk dapat berpartisipasi pada proyek ini.',
                        style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 10.5, height: 1.3),
                      ),
                    ),
                  ],
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
              child: const Text('MENGERTI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
            ),
          ],
        ),
      );
      return;
    }

    String selectedCompId = eligibleCompanies.first['id'];
    final activeId = widget.activeEntity?['id']?.toString();
    if (activeId != null && eligibleCompanies.any((c) => c['id'] == activeId)) {
      selectedCompId = activeId;
    }
    final pitchController = TextEditingController();
    bool isSubmitting = false;
    String? submitError;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          final Set<String> itemValues = {};
          final List<DropdownMenuItem<String>> dropdownItems = [];
          for (final c in eligibleCompanies) {
            final val = c['id']?.toString() ?? 'unknown';
            if (!itemValues.contains(val)) {
              itemValues.add(val);
              dropdownItems.add(
                DropdownMenuItem<String>(
                  value: val,
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          c['name']?.toString() ?? 'PT Peserta',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 11.5),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          (c['sector'] ?? '').toString().toUpperCase(),
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 8.5, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
          }

          final String safeValue = itemValues.contains(selectedCompId)
              ? selectedCompId
              : (itemValues.isNotEmpty ? itemValues.first : 'primary');

          final comp = eligibleCompanies.firstWhere(
            (c) => c['id'] == safeValue,
            orElse: () => eligibleCompanies.first,
          );
          final double compBalance = comp['balance'] as double;
          final bool meetsCap = compBalance >= minCap;

          return AlertDialog(
            backgroundColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
            ),
            title: Row(
              children: [
                const Icon(Icons.assignment_turned_in_rounded, color: Color(0xFFF59E0B), size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Formulir Pengajuan Bidding',
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Nilai Kontrak: ${CurrencyFormatter.formatFull(budget)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                  const Divider(color: Color(0xFF1E293B), height: 16),

                  // Select PT
                  const Text('Pilih PT Peserta Tender:', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: safeValue,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF0F172A),
                        style: const TextStyle(color: Colors.white, fontSize: 11.5),
                        items: dropdownItems,
                        onChanged: (val) {
                          if (val != null) setDialogState(() => selectedCompId = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Capital Check
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Kas PT Peserta:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      Text(
                        CurrencyFormatter.formatFull(compBalance),
                        style: TextStyle(
                          color: meetsCap ? const Color(0xFF34D399) : const Color(0xFFF87171),
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  if (!meetsCap) ...[
                    const SizedBox(height: 4),
                    Text(
                      '⚠️ Syarat minimal kas PT untuk proyek ini adalah ${CurrencyFormatter.formatFull(minCap)}.',
                      style: const TextStyle(color: Color(0xFFF87171), fontSize: 9.5),
                    ),
                  ],
                  const SizedBox(height: 12),

                  // Pitch Input
                  const Text('Rencana Eksekusi & Portofolio PT:', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: pitchController,
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white, fontSize: 11),
                    decoration: InputDecoration(
                      hintText: 'Tuliskan komitmen penyelesaian proyek, teknologi, atau SDM yang disiapkan PT Anda...',
                      hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 10.5),
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                      contentPadding: const EdgeInsets.all(10),
                    ),
                  ),
                  if (submitError != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.5)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 16),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              submitError!,
                              style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 10, height: 1.3),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
                child: const Text('BATAL', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
              ),
              ElevatedButton(
                onPressed: (!meetsCap || isSubmitting)
                    ? null
                    : () async {
                        setDialogState(() {
                          isSubmitting = true;
                          submitError = null;
                        });
                        final targetCompanyId = safeValue == 'primary' ? null : safeValue;
                        final res = await provider.submitTenderBid(
                          tenderId: tenderId,
                          companyId: targetCompanyId,
                          pitch: pitchController.text.trim(),
                        );
                        if (dialogCtx.mounted) {
                          if (res['success'] == true) {
                            Navigator.pop(dialogCtx);
                            if (context.mounted) {
                              _showBidSuccessDialog(
                                context,
                                tenderTitle: title,
                                companyName: comp['name']?.toString() ?? 'Perseroan',
                                budget: budget,
                                score: ((res['bidScore'] ?? 85.0) as num).toDouble(),
                                pitch: pitchController.text.trim(),
                              );
                            }
                          } else {
                            setDialogState(() {
                              isSubmitting = false;
                              submitError = res['error'] ?? res['message'] ?? 'Pengajuan proposal gagal!';
                            });
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: const Color(0xFF451A03),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: isSubmitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(color: Color(0xFF451A03), strokeWidth: 2),
                      )
                    : const Text('KIRIM PROPOSAL', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- DIALOG NOTIFIKASI SUKSES PENGAJUAN PROPOSAL TENDER ---
  void _showBidSuccessDialog(
    BuildContext context, {
    required String tenderTitle,
    required String companyName,
    required double budget,
    required double score,
    required String pitch,
  }) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFF59E0B), width: 1.8),
        ),
        title: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.18),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFFBBF24), width: 1.5),
              ),
              child: const Icon(Icons.assignment_turned_in_rounded, color: Color(0xFFFBBF24), size: 40),
            ),
            const SizedBox(height: 12),
            const Text(
              '🎉 PROPOSAL RESMI DIAJUKAN!',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'STATUS: TEREGISTRASI • EVALUASI PANITIA',
                  style: TextStyle(color: Color(0xFFFBBF24), fontSize: 10.5, fontWeight: FontWeight.w900),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Paket Proyek:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          tenderTitle,
                          textAlign: TextAlign.end,
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('PT Peserta:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          companyName,
                          textAlign: TextAlign.end,
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Nilai Kontrak:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text(
                        CurrencyFormatter.formatFull(budget),
                        style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 12, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Skor Teknis PT:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      Text(
                        '${score.toStringAsFixed(1)} / 100',
                        style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0C243B),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline_rounded, color: Color(0xFF38BDF8), size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Panitia Pengadaan Negara sedang mengevaluasi proposal. Pengumuman pemenang lelang dan pencairan dana kontrak akan disiarkan langsung melalui Berita Pasar (Breaking News).',
                      style: TextStyle(color: Color(0xFFBAE6FD), fontSize: 9.5, height: 1.35),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                foregroundColor: const Color(0xFF451A03),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('PANTAU STATUS TENDER', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }

  // --- DIALOG STATUS & DETAIL PROPOSAL YANG SUDAH DIAJUKAN ---
  void _showMyBidDetailsDialog(BuildContext context, Map<String, dynamic> tender) {
    final title = tender['title']?.toString() ?? 'Mega Proyek';
    final tenderCode = tender['tender_code']?.toString() ?? 'TDR';
    final compName = tender['my_bid_company']?.toString() ?? 'Perseroan Anda';
    final score = ((tender['my_bid_score'] ?? 85.0) as num).toDouble();
    final pitch = tender['my_bid_pitch']?.toString() ?? 'Proposal Strategis Pelaksanaan Proyek';
    final status = tender['my_bid_status']?.toString() ?? 'SUBMITTED';
    final budget = ((tender['contract_value_ib'] ?? 0) as num).toDouble();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF10B981), width: 1.8),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.verified_rounded, color: Color(0xFF34D399), size: 22),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Status Proposal Anda',
                style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                status == 'ACCEPTED'
                    ? '🏆 PROPOSAL DITERIMA & MENANG TENDER'
                    : status == 'REJECTED'
                        ? '❌ PROPOSAL DITOLAK'
                        : '⏳ DALAM PROSES EVALUASI PANITIA',
                style: TextStyle(
                  color: status == 'ACCEPTED'
                      ? const Color(0xFFFBBF24)
                      : status == 'REJECTED'
                          ? const Color(0xFFF87171)
                          : const Color(0xFF34D399),
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Paket Proyek:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '$tenderCode - $title',
                          textAlign: TextAlign.end,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('PT Pengaju:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                      Text(compName, style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Nilai Kontrak:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                      Text(CurrencyFormatter.formatFull(budget), style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11.5, fontWeight: FontWeight.w900)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Skor Kualifikasi Teknis:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                      Text('$score / 100', style: const TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            const Text('Rencana Eksekusi / Pitch PT:', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
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
                pitch.isEmpty ? 'Proposal Strategis Pelaksanaan Proyek Nasional' : pitch,
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
            child: const Text('MENGERTI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  // --- DIALOG INFORMASI TENDER ---
  void _showTenderInfoDialog(BuildContext context, Map<String, dynamic> tender) {
    final title = tender['title']?.toString() ?? 'Mega Proyek';
    final tenderCode = tender['tender_code']?.toString() ?? 'TDR';
    final sector = tender['sector']?.toString() ?? 'General';
    final desc = tender['description']?.toString() ?? 'Pengadaan proyek strategis skala nasional.';
    final budget = ((tender['contract_value_ib'] ?? 0) as num).toDouble();
    final minCap = ((tender['min_cap_requirement_ib'] ?? 25000000.0) as num).toDouble();
    final winnerComp = tender['winner_company_name']?.toString();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
        ),
        title: Row(
          children: [
            const Icon(Icons.info_outline_rounded, color: Color(0xFF38BDF8), size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '$tenderCode: $title',
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, height: 1.4)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Sektor Industri:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                      Text(sector.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Nilai Kontrak:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                      Text(CurrencyFormatter.formatFull(budget), style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Syarat Min. Kas PT:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                      Text(CurrencyFormatter.formatFull(minCap), style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  if (winnerComp != null) ...[
                    const Divider(color: Color(0xFF1E293B), height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Pemenang Kontrak:', style: TextStyle(color: Color(0xFFFBBF24), fontSize: 10.5, fontWeight: FontWeight.bold)),
                        Text(winnerComp, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ],
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
            child: const Text('TUTUP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}
