import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../utils/formatters.dart';
import '../screens/ipo_manage_screen.dart';
import 'ipo_bidding_dialog.dart';
import '../../legal/widgets/notary_deed_viewer_modal.dart';

void showEipoMarketSheet(BuildContext context, {VoidCallback? onOpenRegister}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: const Color(0xFF0F172A),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) {
      String selectedIpoTab = 'SEMUA';
      return StatefulBuilder(
        builder: (sheetCtx, setSheetState) {
          return Consumer<GameProvider>(
            builder: (context, provider, _) {
              final allIpos = provider.ipoOfferings;
              final ipoList = selectedIpoTab == 'SEMUA'
                  ? allIpos
                  : allIpos.where((ipo) {
                      final st = (ipo['status'] ?? 'OFFERING').toString().toUpperCase();
                      if (selectedIpoTab == 'BOOKBUILDING') return st == 'BOOKBUILDING';
                      if (selectedIpoTab == 'OFFERING') return st == 'OFFERING';
                      if (selectedIpoTab == 'ALLOTMENT') return st == 'ALLOTMENT';
                      if ((selectedIpoTab == 'LISTED' || selectedIpoTab == 'LISTED_ARA')) return st == 'LISTED_ARA';
                      return true;
                    }).toList();

              return DraggableScrollableSheet(
                initialChildSize: 0.90,
                minChildSize: 0.5,
                maxChildSize: 0.95,
                expand: false,
                builder: (_, scrollController) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(2)),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Header E-IPO
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.rocket_launch_rounded, color: Color(0xFFF59E0B), size: 24),
                                SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'E-IPO PASAR PERDANA',
                                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                                    ),
                                    Text(
                                      'Bursa Efek Capital Federation (CFX)',
                                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            if (onOpenRegister != null)
                              ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  onOpenRegister();
                                },
                                icon: const Icon(Icons.app_registration_rounded, size: 14, color: Colors.white),
                                label: const Text('IPO PT Saya', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Colors.white)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),



                        // Tab Filter Status E-IPO (User Requested Tabs)
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              _buildFilterChip('SEMUA', 'Semua (${allIpos.length})', selectedIpoTab == 'SEMUA', () {
                                setSheetState(() => selectedIpoTab = 'SEMUA');
                              }),
                              const SizedBox(width: 6),
                              _buildFilterChip('BOOKBUILDING', '📝 Bookbuilding (${allIpos.where((i) => (i['status'] ?? 'OFFERING') == 'BOOKBUILDING').length})', selectedIpoTab == 'BOOKBUILDING', () {
                                setSheetState(() => selectedIpoTab = 'BOOKBUILDING');
                              }),
                              const SizedBox(width: 6),
                              _buildFilterChip('OFFERING', '📢 Penawaran Umum (${allIpos.where((i) => (i['status'] ?? 'OFFERING') == 'OFFERING').length})', selectedIpoTab == 'OFFERING', () {
                                setSheetState(() => selectedIpoTab = 'OFFERING');
                              }),
                              const SizedBox(width: 6),
                              _buildFilterChip('ALLOTMENT', '⚖️ Penjatahan (${allIpos.where((i) => (i['status'] ?? 'OFFERING') == 'ALLOTMENT').length})', selectedIpoTab == 'ALLOTMENT', () {
                                setSheetState(() => selectedIpoTab = 'ALLOTMENT');
                              }),
                              const SizedBox(width: 6),
                              _buildFilterChip('LISTED', '🏛️ Listing / Pencatatan (${allIpos.where((i) => ((i['status'] ?? 'OFFERING') == 'LISTED_ARA' || (i['status'] ?? 'OFFERING') == 'LISTED')).length})', selectedIpoTab == 'LISTED_ARA', () {
                                setSheetState(() => selectedIpoTab = 'LISTED');
                              }),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Title & Refresh
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Daftar Penawaran IPO (${ipoList.length})',
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
                            ),
                            InkWell(
                              onTap: () => provider.fetchIpoOfferings(),
                              child: const Row(
                                children: [
                                  Icon(Icons.refresh_rounded, color: Color(0xFF38BDF8), size: 14),
                                  SizedBox(width: 4),
                                  Text('Segarkan', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // List of IPO Cards
                        Expanded(
                          child: ipoList.isEmpty
                              ? Center(
                                  child: Text(
                                    selectedIpoTab == 'SEMUA'
                                        ? 'Belum ada perusahaan yang melangsungkan E-IPO saat ini.'
                                        : 'Tidak ada saham dalam tahap $selectedIpoTab.',
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                  ),
                                )
                              : ListView.builder(
                                  controller: scrollController,
                                  itemCount: ipoList.length,
                                  itemBuilder: (lCtx, index) {
                                    final ipo = ipoList[index];
                                    final price = (ipo['offering_price'] as num?)?.toDouble() ?? 2500.0;
                                    final totalLots = (ipo['total_offering_lots'] as num?)?.toInt() ?? 100000;
                                    final orderedLots = (ipo['ordered_lots'] as num?)?.toInt() ?? 0;
                                    final myLots = (ipo['user_ordered_lots'] as num?)?.toInt() ?? 0;
                                    final status = ipo['status']?.toString() ?? 'OFFERING';
                                    final araPct = (ipo['first_day_ara_pct'] as num?)?.toDouble() ?? 50.0;
                                    final araPrice = (price * (1 + araPct / 100.0)).round();
                                    final isListed = status == 'LISTED_ARA';
                                    final ratio = (ipo['oversubscribed_ratio'] as num?)?.toDouble() ?? 1.45;

                                    String badgeText;
                                    Color badgeColor;
                                    if (status == 'BOOKBUILDING') {
                                      badgeText = '📝 BOOKBUILDING MITRA';
                                      badgeColor = const Color(0xFFF59E0B);
                                    } else if (status == 'ALLOTMENT') {
                                      badgeText = '⚖️ PENJATAHAN OTOMATIS';
                                      badgeColor = const Color(0xFF38BDF8);
                                    } else if (status == 'LISTED_ARA') {
                                      badgeText = '🏛️ RESMI LISTED';
                                      badgeColor = const Color(0xFF10B981);
                                    } else {
                                      badgeText = '📢 PENAWARAN UMUM';
                                      badgeColor = const Color(0xFF10B981);
                                    }

                                    final isOwner = ipo['user_id'] != null && ipo['user_id'] == provider.user?.id;

                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 12),
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF1E293B),
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isListed
                                              ? const Color(0xFFA855F7).withValues(alpha: 0.6)
                                              : (status == 'BOOKBUILDING'
                                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.5)
                                                  : const Color(0xFF334155)),
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Header Row: Symbol & Status Badge
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Row(
                                                children: [
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                                                      borderRadius: BorderRadius.circular(6),
                                                      border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                                                    ),
                                                    child: Text(
                                                      ipo['symbol']?.toString() ?? 'EMITEN',
                                                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 13, fontWeight: FontWeight.w900),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFF334155),
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: Text(
                                                      ipo['sector']?.toString() ?? 'Teknologi',
                                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: badgeColor.withValues(alpha: 0.2),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: badgeColor),
                                                ),
                                                child: Text(
                                                  badgeText,
                                                  style: TextStyle(
                                                    color: badgeColor,
                                                    fontSize: 9.5,
                                                    fontWeight: FontWeight.w900,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            ipo['company_name']?.toString() ?? '',
                                            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                                          ),
                                          if (ipo['description'] != null && ipo['description'].toString().isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              ipo['description'].toString(),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, height: 1.3),
                                            ),
                                          ],

                                          // 4-Phase Timeline Stepper Card
                                          Container(
                                            margin: const EdgeInsets.symmetric(vertical: 8),
                                            padding: const EdgeInsets.all(8),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF0F172A),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.6)),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    const Row(
                                                      children: [
                                                        Icon(Icons.calendar_month_rounded, color: Color(0xFF38BDF8), size: 12),
                                                        SizedBox(width: 4),
                                                        Text('Jadwal Tahapan Siklus E-IPO:', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                                      ],
                                                    ),
                                                    if (isOwner)
                                                      InkWell(
                                                        onTap: () => _showAdjustScheduleDialog(context, ipo),
                                                        child: const Row(
                                                          children: [
                                                            Icon(Icons.edit_calendar_rounded, color: Color(0xFFF59E0B), size: 11),
                                                            SizedBox(width: 3),
                                                            Text('Atur Tanggal', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                                          ],
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                                const SizedBox(height: 6),
                                                SingleChildScrollView(
                                                  scrollDirection: Axis.horizontal,
                                                  physics: const BouncingScrollPhysics(),
                                                  child: Row(
                                                    children: [
                                                      _buildTimelineStep(
                                                        step: '1',
                                                        title: 'Bookbuilding',
                                                        date: ipo['bookbuilding_date']?.toString() ?? 'Penawaran Mitra',
                                                        isActive: status == 'BOOKBUILDING',
                                                        isDone: status != 'BOOKBUILDING',
                                                      ),
                                                      const Padding(
                                                        padding: EdgeInsets.symmetric(horizontal: 5),
                                                        child: Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF475569), size: 10),
                                                      ),
                                                      _buildTimelineStep(
                                                        step: '2',
                                                        title: 'Penawaran Umum',
                                                        date: ipo['offering_date']?.toString() ?? 'Penawaran Ritel',
                                                        isActive: status == 'OFFERING',
                                                        isDone: status == 'ALLOTMENT' || status == 'LISTED_ARA' || status == 'LISTED',
                                                      ),
                                                      const Padding(
                                                        padding: EdgeInsets.symmetric(horizontal: 5),
                                                        child: Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF475569), size: 10),
                                                      ),
                                                      _buildTimelineStep(
                                                        step: '3',
                                                        title: 'Penjatahan',
                                                        date: ipo['allotment_date']?.toString() ?? 'Allotment',
                                                        isActive: status == 'ALLOTMENT',
                                                        isDone: status == 'LISTED_ARA' || status == 'LISTED',
                                                      ),
                                                      const Padding(
                                                        padding: EdgeInsets.symmetric(horizontal: 5),
                                                        child: Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF475569), size: 10),
                                                      ),
                                                      _buildTimelineStep(
                                                        step: '4',
                                                        title: 'Pencatatan Bursa',
                                                        date: ipo['listing_date']?.toString() ?? '07:00 WIB',
                                                        isActive: status == 'LISTED_ARA' || status == 'LISTED',
                                                        isDone: status == 'LISTED_ARA' || status == 'LISTED',
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),

                                          // Structure pill (Public %, Strategic %, Founder %)
                                          if (ipo['public_pct'] != null) ...[
                                            Container(
                                              margin: const EdgeInsets.only(bottom: 6),
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF0F172A),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceAround,
                                                children: [
                                                  Text('Publik: ${ipo['public_pct']}%', style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                                  Text('Mitra: ${ipo['strategic_pct'] ?? 40}%', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                                  Text('Pendiri: ${ipo['founder_pct'] ?? 50}%', style: const TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                                ],
                                              ),
                                            ),
                                          ],

                                          // Financial Metrics Card
                                          Row(
                                            children: [
                                              Expanded(
                                                flex: 7,
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    const Text('Harga Penawaran', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                                                    const SizedBox(height: 1),
                                                    Text(
                                                      'IB ${CurrencyFormatter.formatNumberOnly(price)}',
                                                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
                                                    ),
                                                    Text(
                                                      '${CurrencyFormatter.formatNumberOnly(price * 100)} / Lot',
                                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Expanded(
                                                flex: 8,
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.end,
                                                  children: [
                                                    const Text('Target Debut Listing', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                                                    const SizedBox(height: 1),
                                                    Text(
                                                      'IB ${CurrencyFormatter.formatNumberOnly(araPrice)}',
                                                      style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.w900),
                                                    ),
                                                    Text(
                                                      '+${araPct.toStringAsFixed(0)}% Rentang Emisi',
                                                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 8.5),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),

                                          // Quota & Oversubscribed bar
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF0F172A),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    'Kuota: ${CurrencyFormatter.formatNumberOnly(totalLots)} Lot • Dipesan: ${CurrencyFormatter.formatNumberOnly(orderedLots)} Lot',
                                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                Text(
                                                  '${ratio.toStringAsFixed(2)}x Oversubscribed 🔥',
                                                  style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold),
                                                ),
                                              ],
                                            ),
                                          ),

                                          if (myLots > 0) ...[
                                            const SizedBox(height: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                                              ),
                                              child: Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  const Row(
                                                    children: [
                                                      Icon(Icons.check_circle_rounded, color: Color(0xFF38BDF8), size: 14),
                                                      SizedBox(width: 6),
                                                      Text('Pesanan Saham Anda:', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.bold)),
                                                    ],
                                                  ),
                                                  Text(
                                                    '${CurrencyFormatter.formatNumberOnly(myLots)} Lot (Alokasi Terjamin)',
                                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],

                                          const SizedBox(height: 12),

                                          // Tombol Lihat Salinan Akta Notaris IPO
                                          SizedBox(
                                            width: double.infinity,
                                            height: 34,
                                            child: OutlinedButton.icon(
                                              onPressed: () {
                                                showNotaryDeedModal(
                                                  context,
                                                  deedType: DeedType.ipoProspectus,
                                                  companyName: ipo['company_name']?.toString() ?? 'PT ${ipo['symbol']} Tbk.',
                                                  symbol: ipo['symbol']?.toString() ?? 'EMIT',
                                                  founderName: provider.user?.username ?? 'Pendiri Utama',
                                                  sector: ipo['sector']?.toString() ?? 'Teknologi',
                                                  nominalCapital: ((ipo['offering_price'] as num?)?.toDouble() ?? 2500.0) * 100,
                                                  ipoPrice: (ipo['offering_price'] as num?)?.toDouble() ?? 2500.0,
                                                  totalLots: (ipo['total_offering_lots'] as num?)?.toInt() ?? 10000000,
                                                  floatingPct: (ipo['public_pct'] as num?)?.toDouble() ?? 10.0,
                                                  bookbuildingDate: ipo['bookbuilding_date']?.toString(),
                                                  offeringDate: ipo['offering_date']?.toString(),
                                                  allotmentDate: ipo['allotment_date']?.toString(),
                                                  listingDate: ipo['listing_date']?.toString(),
                                                );
                                              },
                                              icon: const Icon(Icons.history_edu_rounded, size: 14, color: Color(0xFFF59E0B)),
                                              label: const Text('📜 SALINAN AKTA NOTARIS PROSPEKTUS IPO', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                              style: OutlinedButton.styleFrom(
                                                side: const BorderSide(color: Color(0xFFF59E0B), width: 0.8),
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 8),

                                          // Actions Row
                                          if (!isListed) ...[
                                            Column(
                                              children: [
                                                Row(
                                                  children: [
                                                    // Tombol Penjatahan Mitra (Bagi Pemilik Emiten)
                                                    if (isOwner) ...[
                                                      Expanded(
                                                        child: ElevatedButton.icon(
                                                          onPressed: () {
                                                            Navigator.push(
                                                              context,
                                                              MaterialPageRoute(
                                                                builder: (_) => IpoManageScreen(
                                                                  ipoOffering: ipo,
                                                                  userId: provider.user?.id ?? '',
                                                                ),
                                                              ),
                                                            );
                                                          },
                                                          icon: const Icon(Icons.manage_accounts_rounded, size: 13, color: Colors.white),
                                                          label: Text(
                                                            ((ipo['pending_bids_count'] as num?)?.toInt() ?? 0) > 0
                                                                ? 'SELEKSI MITRA (${ipo['pending_bids_count']} MASUK)'
                                                                : 'SELEKSI MITRA',
                                                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 10),
                                                          ),
                                                          style: ElevatedButton.styleFrom(
                                                            backgroundColor: ((ipo['pending_bids_count'] as num?)?.toInt() ?? 0) > 0
                                                                ? const Color(0xFFEF4444)
                                                                : const Color(0xFFF59E0B),
                                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                          ),
                                                        ),
                                                      ),
                                                      const SizedBox(width: 6),
                                                      Expanded(
                                                        child: OutlinedButton.icon(
                                                          onPressed: () => _showAdjustScheduleDialog(context, ipo),
                                                          icon: const Icon(Icons.edit_calendar_rounded, size: 13, color: Color(0xFF38BDF8)),
                                                          label: const Text('ATUR JADWAL', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 10)),
                                                          style: OutlinedButton.styleFrom(
                                                            side: const BorderSide(color: Color(0xFF0284C7)),
                                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                          ),
                                                        ),
                                                      ),
                                                    ] else if (provider.user?.hasPt == true && status == 'BOOKBUILDING') ...[
                                                      // Tombol Tawar Mitra Pre-IPO (Bagi PT Lain)
                                                      Builder(
                                                        builder: (context) {
                                                          final myBid = ipo['my_bid'];
                                                          final hasBid = myBid != null;
                                                          final bidStatus = myBid != null ? myBid['status']?.toString() : null;
                                                          final isAccepted = bidStatus == 'ACCEPTED';
                                                          return Expanded(
                                                            child: ElevatedButton.icon(
                                                              onPressed: () {
                                                                showDialog(
                                                                  context: context,
                                                                  builder: (_) => IpoBiddingDialog(
                                                                    ipoOffering: ipo,
                                                                    userId: provider.user!.id,
                                                                    ptName: provider.user!.ptName,
                                                                    companyBalance: provider.user!.companyBalanceIb,
                                                                  ),
                                                                );
                                                              },
                                                              icon: Icon(
                                                                isAccepted ? Icons.verified_rounded : (hasBid ? Icons.pending_actions_rounded : Icons.handshake_rounded),
                                                                size: 13,
                                                                color: Colors.white,
                                                              ),
                                                              label: Text(
                                                                isAccepted
                                                                    ? 'MITRA TERPILIH (${myBid['requested_percentage']}%)'
                                                                    : (hasBid ? 'PROPOSAL: ${myBid['requested_percentage']}% ($bidStatus)' : 'TAWAR PRE-IPO'),
                                                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 10),
                                                              ),
                                                              style: ElevatedButton.styleFrom(
                                                                backgroundColor: isAccepted
                                                                    ? const Color(0xFF10B981)
                                                                    : (hasBid ? const Color(0xFF0D9488) : const Color(0xFF0284C7)),
                                                                padding: const EdgeInsets.symmetric(vertical: 10),
                                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                              ),
                                                            ),
                                                          );
                                                        },
                                                      ),
                                                      const SizedBox(width: 6),
                                                    ],

                                                    // Tombol Pesan Saham Ritel (Bagi Publik pada tahap OFFERING)
                                                    if (!isOwner && status == 'OFFERING') ...[
                                                      Expanded(
                                                        child: ElevatedButton.icon(
                                                          onPressed: () => _showOrderIpoDialog(context, provider, ipo),
                                                          icon: const Icon(Icons.shopping_bag_rounded, size: 13, color: Color(0xFF0F172A)),
                                                          label: const Text('PESAN IPO', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 11)),
                                                          style: ElevatedButton.styleFrom(
                                                            backgroundColor: const Color(0xFF10B981),
                                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                          ),
                                                        ),
                                                      ),
                                                    ] else if (!isOwner && status == 'ALLOTMENT') ...[
                                                      Expanded(
                                                        child: Container(
                                                          padding: const EdgeInsets.symmetric(vertical: 9),
                                                          decoration: BoxDecoration(
                                                            color: const Color(0xFF0F172A),
                                                            borderRadius: BorderRadius.circular(10),
                                                            border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                                                          ),
                                                          child: const Center(
                                                            child: Text('⚖️ TAHAP PENJATAHAN - SIAP MELANTAI', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 9.5, fontWeight: FontWeight.bold)),
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ],
                                                ),

                                                // Admin / Owner Controls: Majukan Tahap
                                                if (isOwner) ...[
                                                  const SizedBox(height: 6),
                                                  SizedBox(
                                                    width: double.infinity,
                                                    child: ElevatedButton.icon(
                                                      onPressed: () async {
                                                        String nextStatus;
                                                        if (status == 'BOOKBUILDING') {
                                                          nextStatus = 'OFFERING';
                                                        } else if (status == 'OFFERING') {
                                                          nextStatus = 'ALLOTMENT';
                                                        } else {
                                                          nextStatus = 'LISTED_ARA';
                                                        }

                                                        final err = await provider.advanceIpoStatus(ipoId: ipo['id'], status: nextStatus);
                                                        if (context.mounted) {
                                                          if (err != null) {
                                                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: Colors.red));
                                                          } else {
                                                            ScaffoldMessenger.of(context).showSnackBar(
                                                              SnackBar(
                                                                content: Text('✅ Tahapan E-IPO ${ipo['symbol']} sukses dimajukan ke $nextStatus!'),
                                                                backgroundColor: const Color(0xFF10B981),
                                                              ),
                                                            );
                                                          }
                                                        }
                                                      },
                                                      icon: const Icon(Icons.fast_forward_rounded, size: 14, color: Colors.white),
                                                      label: Text(
                                                        status == 'BOOKBUILDING'
                                                            ? 'Buka Tahap 2: Penawaran Umum (Offering)'
                                                            : (status == 'OFFERING' ? 'Tutup Pesanan & Mulai Penjatahan (Allotment)' : '🏛️ KETUK PALU & PENCATATAN PERDANA (LISTING)'),
                                                        style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold),
                                                      ),
                                                      style: ElevatedButton.styleFrom(
                                                        backgroundColor: status == 'ALLOTMENT' ? const Color(0xFF7C3AED) : const Color(0xFF1E293B),
                                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ] else ...[
                                            // Saham sudah melantai
                                            Container(
                                              width: double.infinity,
                                              padding: const EdgeInsets.symmetric(vertical: 10),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF7C3AED).withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(10),
                                                border: Border.all(color: const Color(0xFFA855F7)),
                                              ),
                                              child: const Center(
                                                child: Text(
                                                  '🏛️ RESMI TERCATAT & DIPERDAGANGKAN DI BURSA EFEK CFX',
                                                  style: TextStyle(color: Color(0xFFC084FC), fontWeight: FontWeight.w900, fontSize: 10.5),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          );
        },
      );
    },
  );
}

Widget _buildFilterChip(String key, String label, bool isSelected, VoidCallback onTap) {
  return InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(20),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isSelected ? const Color(0xFF60A5FA) : const Color(0xFF334155),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isSelected ? Colors.white : const Color(0xFF94A3B8),
          fontSize: 10.5,
          fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
        ),
      ),
    ),
  );
}

Widget _buildTimelineStep({
  required String step,
  required String title,
  required String date,
  required bool isActive,
  required bool isDone,
}) {
  Color dotColor = isDone ? const Color(0xFF10B981) : (isActive ? const Color(0xFF38BDF8) : const Color(0xFF475569));
  return Container(
    constraints: const BoxConstraints(minWidth: 100),
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
    decoration: BoxDecoration(
      color: isActive ? dotColor.withValues(alpha: 0.12) : const Color(0xFF0F172A),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: isActive ? dotColor : const Color(0xFF1E293B)),
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: dotColor.withValues(alpha: 0.2),
                shape: BoxShape.circle,
                border: Border.all(color: dotColor, width: isActive ? 1.5 : 1),
              ),
              child: Text(
                step,
                style: TextStyle(color: dotColor, fontSize: 8.5, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 4),
            Text(
              title,
              style: TextStyle(
                color: isActive ? Colors.white : (isDone ? const Color(0xFFCBD5E1) : const Color(0xFF64748B)),
                fontSize: 9,
                fontWeight: isActive ? FontWeight.w900 : FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          date,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: isActive ? const Color(0xFF38BDF8) : const Color(0xFF94A3B8),
            fontSize: 8,
          ),
        ),
      ],
    ),
  );
}

// Dialog Ubah Jadwal 4 Tahap E-IPO
void _showAdjustScheduleDialog(BuildContext context, Map<String, dynamic> ipo) {
  final provider = Provider.of<GameProvider>(context, listen: false);
  final bookbuildingCtrl = TextEditingController(text: ipo['bookbuilding_date']?.toString() ?? '');
  final offeringCtrl = TextEditingController(text: ipo['offering_date']?.toString() ?? '');
  final allotmentCtrl = TextEditingController(text: ipo['allotment_date']?.toString() ?? '');
  final listingCtrl = TextEditingController(text: ipo['listing_date']?.toString() ?? '');

  showDialog(
    context: context,
    builder: (dCtx) => StatefulBuilder(
      builder: (ctx, setDState) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF334155))),
        title: Row(
          children: [
            const Icon(Icons.edit_calendar_rounded, color: Color(0xFFF59E0B), size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Atur Jadwal 4 Tahap IPO (${ipo['symbol']})',
                style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              const Text('1. Tanggal Bookbuilding (Penawaran Awal Mitra):', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              TextField(
                controller: bookbuildingCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 11.5),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 8),
              const Text('2. Tanggal Penawaran Umum (Pemesanan Ritel):', style: TextStyle(color: Color(0xFF10B981), fontSize: 10.5, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              TextField(
                controller: offeringCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 11.5),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 8),
              const Text('3. Tanggal Penjatahan Otomatis (Allotment):', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10.5, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              TextField(
                controller: allotmentCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 11.5),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 8),
              const Text('4. Tanggal Pencatatan / Melantai ARA (Listing):', style: TextStyle(color: Color(0xFFA855F7), fontSize: 10.5, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              TextField(
                controller: listingCtrl,
                style: const TextStyle(color: Colors.white, fontSize: 11.5),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dCtx), child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8)))),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dCtx);
              final err = await provider.updateIpoSchedule(
                ipoId: ipo['id'],
                bookbuildingDate: bookbuildingCtrl.text.trim(),
                offeringDate: offeringCtrl.text.trim(),
                allotmentDate: allotmentCtrl.text.trim(),
                listingDate: listingCtrl.text.trim(),
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(err ?? '✅ Jadwal 4 Tahap IPO ${ipo['symbol']} berhasil diperbarui!'),
                    backgroundColor: err != null ? Colors.red : const Color(0xFF10B981),
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('SIMPAN JADWAL', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 11)),
          ),
        ],
      ),
    ),
  );
}

// Dialog Pesan IPO (Publik Ritel)
void _showOrderIpoDialog(BuildContext context, GameProvider provider, Map<String, dynamic> ipo) {
  int lots = 10;
  final price = (ipo['offering_price'] as num?)?.toDouble() ?? 2500.0;
  final user = provider.user;
  final double userBal = user?.balanceIb ?? 0.0;

  showDialog(
    context: context,
    builder: (dCtx) {
      return StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          final totalCost = lots * 100 * price;
          final bool canAfford = userBal >= totalCost;

          return AlertDialog(
            backgroundColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF1E293B))),
            title: Row(
              children: [
                const Icon(Icons.shopping_bag_rounded, color: Color(0xFF10B981), size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Pemesanan Saham IPO ${ipo['symbol']}', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Harga Penawaran: IB ${CurrencyFormatter.formatNumberOnly(price)} / lembar', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Jumlah Pesanan (Lot):', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF38BDF8)),
                          onPressed: lots > 1 ? () => setDialogState(() => lots -= (lots <= 10 ? 1 : 10)) : null,
                        ),
                        Text('$lots Lot', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, color: Color(0xFF38BDF8)),
                          onPressed: () => setDialogState(() => lots += 10),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Biaya Pemesanan:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    Text(CurrencyFormatter.formatFull(totalCost), style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Saldo Kas Pribadi Anda:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                    Text(CurrencyFormatter.formatFull(userBal), style: TextStyle(color: canAfford ? const Color(0xFF38BDF8) : const Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dCtx), child: const Text('Batal', style: TextStyle(color: Color(0xFF94A3B8)))),
              ElevatedButton(
                onPressed: !canAfford
                    ? null
                    : () async {
                        Navigator.pop(dCtx);
                        final err = await provider.orderIpo(ipoId: ipo['id'], lots: lots);
                        if (context.mounted) {
                          if (err != null) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: Colors.red));
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('🎉 Berhasil memesan $lots Lot saham IPO ${ipo['symbol']}! Masuk antrian penjatahan bursa.'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('KONFIRMASI PESANAN', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w900)),
              ),
            ],
          );
        },
      );
    },
  );
}
