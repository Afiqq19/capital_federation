import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';

class LeaderboardTab extends StatefulWidget {
  const LeaderboardTab({super.key});

  @override
  State<LeaderboardTab> createState() => _LeaderboardTabState();
}

class _LeaderboardTabState extends State<LeaderboardTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _chatController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _chatController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  String _formatCleanPt(String rawPt) {
    var trimmed = rawPt.trim();
    if (trimmed.isEmpty) return '';
    if (trimmed == 'Investor Ritel' || trimmed == 'Otoritas Moneter & Bursa') return trimmed;
    while (trimmed.toUpperCase().startsWith('PT.') || trimmed.toUpperCase().startsWith('PT ')) {
      trimmed = trimmed.replaceFirst(RegExp(r'^PT\.?\s*', caseSensitive: false), '').trim();
    }
    return trimmed.isEmpty ? '' : 'PT. $trimmed';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final currentUser = provider.user;

    // Lookup map dari leaderboard untuk mendeteksi rank 9 Naga & VIP secara live di Chat
    final Map<String, Map<String, dynamic>> rankByUser = {};
    final Map<String, Map<String, dynamic>> rankByUsername = {};
    int? myRank;
    for (int i = 0; i < provider.leaderboard.length; i++) {
      final row = provider.leaderboard[i];
      final r = (row['rank'] is int) ? row['rank'] as int : (i + 1);
      final uid = (row['id'] ?? '').toString();
      final uname = (row['username'] ?? '').toString().toLowerCase();
      if (uid.isNotEmpty) rankByUser[uid] = {...row, 'rank': r};
      if (uname.isNotEmpty) rankByUsername[uname] = {...row, 'rank': r};
      if (currentUser != null && (uid == currentUser.id || uname == currentUser.username.toLowerCase())) {
        myRank = r;
      }
    }

    final bool amI9Naga = myRank != null && myRank <= 9;
    final bool amIVip = currentUser?.isVip == true;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'PERINGKAT & KOMUNITAS',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                      if (amI9Naga || amIVip)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFB45309)],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                          child: Text(
                            amI9Naga ? '🐉 9 NAGA #$myRank' : '💎 VIP SULTAN',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Peringkat Top 100 Taipan, Sultan 9 Naga & Obrolan Pasar Global.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                  ),
                  const SizedBox(height: 12),

                  // Tabs
                  Container(
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      indicator: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      labelColor: Colors.white,
                      unselectedLabelColor: const Color(0xFF64748B),
                      labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      tabs: const [
                        Tab(text: 'TOP 100 KONGLOMERAT'),
                        Tab(text: 'CHAT GLOBAL BURSA'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // ============================================
                  // TAB 1: TOP 100 LEADERBOARD
                  // ============================================
                  provider.leaderboard.isEmpty
                      ? const Center(child: Text('Memuat peringkat...', style: TextStyle(color: Color(0xFF64748B))))
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 10, 20, 80),
                          itemCount: provider.leaderboard.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final item = provider.leaderboard[index];
                            final int rank = (item['rank'] is int) ? item['rank'] as int : (index + 1);
                            final String badge = (item['badge'] ?? 'REGULER').toString();
                            final bool isTop9 = rank <= 9;
                            final bool isTaipan = rank > 9 && rank <= 25;
                            final bool isVipUser = item['isVip'] == true ||
                                (item['role']?.toString().toUpperCase() == 'VIP') ||
                                badge.toUpperCase().contains('VIP');
                            final bool isRank1 = rank == 1;
                            final bool isRank2 = rank == 2;
                            final bool isRank3 = rank == 3;
                            final String rawPtName = item['ptName']?.toString() ?? '';
                            final String cleanPtName = _formatCleanPt(rawPtName);
                            final String sector = item['sector']?.toString() ?? '';
                            final double netWorthVal = (item['netWorth'] ?? 0).toDouble();

                            Color borderColor;
                            Color rankBgColor;
                            Color rankTextColor;
                            if (isRank1) {
                              borderColor = const Color(0xFFF59E0B);
                              rankBgColor = const Color(0xFFF59E0B).withValues(alpha: 0.28);
                              rankTextColor = const Color(0xFFFDE68A);
                            } else if (isRank2) {
                              borderColor = const Color(0xFF94A3B8);
                              rankBgColor = const Color(0xFF94A3B8).withValues(alpha: 0.22);
                              rankTextColor = const Color(0xFFE2E8F0);
                            } else if (isRank3) {
                              borderColor = const Color(0xFFD97706);
                              rankBgColor = const Color(0xFFD97706).withValues(alpha: 0.22);
                              rankTextColor = const Color(0xFFF59E0B);
                            } else if (isTop9) {
                              borderColor = const Color(0xFFF59E0B).withValues(alpha: 0.55);
                              rankBgColor = const Color(0xFF271C07);
                              rankTextColor = const Color(0xFFFBBF24);
                            } else if (isTaipan) {
                              borderColor = const Color(0xFF38BDF8).withValues(alpha: 0.35);
                              rankBgColor = const Color(0xFF0F172A);
                              rankTextColor = const Color(0xFF38BDF8);
                            } else {
                              borderColor = const Color(0xFF1E293B);
                              rankBgColor = const Color(0xFF0F172A);
                              rankTextColor = const Color(0xFF64748B);
                            }

                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                gradient: isTop9
                                    ? LinearGradient(
                                        colors: isRank1
                                            ? [const Color(0xFF2B1F06), const Color(0xFF141109), const Color(0xFF0F172A)]
                                            : [const Color(0xFF1D1608), const Color(0xFF0F172A)],
                                        begin: Alignment.centerLeft,
                                        end: Alignment.centerRight,
                                      )
                                    : null,
                                color: isTop9 ? null : const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: borderColor,
                                  width: isRank1 ? 1.8 : (isRank2 || isRank3 ? 1.4 : (isTop9 ? 1.2 : 1.0)),
                                ),
                                boxShadow: isTop9
                                    ? [
                                        BoxShadow(
                                          color: const Color(0xFFF59E0B).withValues(alpha: isRank1 ? 0.18 : 0.08),
                                          blurRadius: 12,
                                          offset: const Offset(0, 3),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Row(
                                children: [
                                  // Rank badge
                                  Container(
                                    width: 34,
                                    height: 34,
                                    decoration: BoxDecoration(
                                      color: rankBgColor,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: borderColor.withValues(alpha: 0.7)),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      isRank1
                                          ? '👑1'
                                          : (isRank2 ? '🥈2' : (isRank3 ? '🥉3' : '$rank')),
                                      style: TextStyle(
                                        color: rankTextColor,
                                        fontWeight: FontWeight.w900,
                                        fontSize: isRank1 || isRank2 || isRank3 ? 11 : 12.5,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),

                                  // Name and PT (Clean single PT. prefix!)
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Wrap(
                                          crossAxisAlignment: WrapCrossAlignment.center,
                                          spacing: 5,
                                          runSpacing: 3,
                                          children: [
                                            Text(
                                              item['username'] ?? '',
                                              style: TextStyle(
                                                color: isTop9 ? const Color(0xFFFDE68A) : Colors.white,
                                                fontWeight: FontWeight.w900,
                                                fontSize: 13,
                                              ),
                                            ),
                                            if (isTop9)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                decoration: BoxDecoration(
                                                  gradient: const LinearGradient(
                                                    colors: [Color(0xFFF59E0B), Color(0xFFB45309)],
                                                  ),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text(
                                                  '🐉 9 NAGA',
                                                  style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900),
                                                ),
                                              )
                                            else if (isTaipan || badge.contains('TAIPAN'))
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                                                  borderRadius: BorderRadius.circular(4),
                                                  border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                                                ),
                                                child: const Text(
                                                  '👑 TAIPAN',
                                                  style: TextStyle(color: Color(0xFF38BDF8), fontSize: 8, fontWeight: FontWeight.w900),
                                                ),
                                              ),
                                            if (isVipUser)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                decoration: BoxDecoration(
                                                  gradient: const LinearGradient(
                                                    colors: [Color(0xFFA855F7), Color(0xFFEC4899)],
                                                  ),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text(
                                                  '💎 VIP',
                                                  style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900),
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          cleanPtName.isNotEmpty
                                              ? (sector.isNotEmpty ? '$cleanPtName • Sektor $sector' : cleanPtName)
                                              : 'Investor Mandiri (Ritel)',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: isTop9 ? const Color(0xFFD97706) : const Color(0xFF64748B),
                                            fontSize: 10.5,
                                            fontWeight: isTop9 ? FontWeight.w600 : FontWeight.normal,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),

                                  // Total Asset (Full Dotted Indonesian Format)
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        CurrencyFormatter.formatFull(netWorthVal),
                                        style: TextStyle(
                                          color: isTop9 ? const Color(0xFFFBBF24) : const Color(0xFF34D399),
                                          fontWeight: FontWeight.w900,
                                          fontSize: 12.5,
                                        ),
                                      ),
                                      const Text('Total Kekayaan', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),

                  // ============================================
                  // TAB 2: GLOBAL CHAT BURSA (SULTAN 9 NAGA & VIP)
                  // ============================================
                  Column(
                    children: [
                      // Motivational / Sultan Prestige Banner
                      Container(
                        margin: const EdgeInsets.fromLTRB(20, 2, 20, 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2A1D05), Color(0xFF131B2E)],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.45)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.auto_awesome_rounded, color: Color(0xFFFBBF24), size: 15),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                amI9Naga
                                    ? '🐉 AURA SULTAN 9 NAGA AKTIF (#$myRank): Pesan Anda tampil dengan Bingkai Emas & Mahkota Naga di seluruh bursa!'
                                    : amIVip
                                        ? '💎 AURA VIP SULTAN AKTIF: Pesan Anda memiliki Lencana Berlian VIP! Tembus Top 9 untuk membuka Efek Naga Emas.'
                                        : '👑 PRIVILEGE SULTAN: Tembus Peringkat Top 9 (9 NAGA) atau VIP agar chat Anda tampil berlapis Emas & disegani investor!',
                                style: const TextStyle(
                                  color: Color(0xFFFDE68A),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  height: 1.3,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      Expanded(
                        child: provider.chatMessages.isEmpty
                            ? const Center(
                                child: Text(
                                  'Belum ada obrolan di lantai bursa. Mulai diskusi sekarang!',
                                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                ),
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(20, 6, 20, 16),
                                itemCount: provider.chatMessages.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final msg = provider.chatMessages[index];
                                  final lbInfo = rankByUser[msg.userId] ?? rankByUsername[msg.username.toLowerCase()];
                                  final int? liveRank = msg.rank ?? (lbInfo?['rank'] as int?);
                                  final bool isBank = msg.isBankSentral;
                                  final bool is9Naga = !isBank && (msg.is9Naga || (liveRank != null && liveRank <= 9));
                                  final bool isTaipan = !isBank && !is9Naga && (msg.isTaipan || (liveRank != null && liveRank > 9 && liveRank <= 25));
                                  final bool isVip = msg.hasVipBadge ||
                                      (lbInfo?['isVip'] == true) ||
                                      (lbInfo?['role']?.toString().toUpperCase() == 'VIP') ||
                                      (msg.userId == currentUser?.id && currentUser?.isVip == true);
                                  final bool isMe = msg.userId == currentUser?.id;

                                  final String cleanPt = _formatCleanPt(
                                    msg.ptName.isNotEmpty
                                        ? msg.ptName
                                        : (lbInfo?['ptName']?.toString() ?? ''),
                                  );
                                  final String timeStr =
                                      '${msg.createdAt.hour.toString().padLeft(2, '0')}:${msg.createdAt.minute.toString().padLeft(2, '0')}';

                                  // Styling berdasarkan kasta: 9 NAGA > VIP SULTAN > BANK SENTRAL > TAIPAN > REGULER
                                  Gradient? cardGradient;
                                  Color cardBg = const Color(0xFF0F172A);
                                  Color borderColor = const Color(0xFF1E293B);
                                  double borderWidth = 1.0;
                                  List<BoxShadow>? shadows;
                                  Color nameColor = const Color(0xFF38BDF8);

                                  if (is9Naga) {
                                    cardGradient = const LinearGradient(
                                      colors: [Color(0xFF332304), Color(0xFF1C1507), Color(0xFF0F172A)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    );
                                    borderColor = const Color(0xFFF59E0B);
                                    borderWidth = 1.6;
                                    nameColor = const Color(0xFFFDE68A);
                                    shadows = [
                                      BoxShadow(
                                        color: const Color(0xFFF59E0B).withValues(alpha: 0.22),
                                        blurRadius: 14,
                                        offset: const Offset(0, 3),
                                      ),
                                    ];
                                  } else if (isVip) {
                                    cardGradient = const LinearGradient(
                                      colors: [Color(0xFF281236), Color(0xFF151226), Color(0xFF0F172A)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    );
                                    borderColor = const Color(0xFFC084FC);
                                    borderWidth = 1.4;
                                    nameColor = const Color(0xFFF5D0FE);
                                    shadows = [
                                      BoxShadow(
                                        color: const Color(0xFFA855F7).withValues(alpha: 0.18),
                                        blurRadius: 10,
                                        offset: const Offset(0, 2),
                                      ),
                                    ];
                                  } else if (isBank) {
                                    cardGradient = const LinearGradient(
                                      colors: [Color(0xFF062C22), Color(0xFF0F172A)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    );
                                    borderColor = const Color(0xFF10B981);
                                    borderWidth = 1.4;
                                    nameColor = const Color(0xFF34D399);
                                  } else if (isTaipan) {
                                    cardGradient = const LinearGradient(
                                      colors: [Color(0xFF092234), Color(0xFF0F172A)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    );
                                    borderColor = const Color(0xFF38BDF8).withValues(alpha: 0.5);
                                    borderWidth = 1.2;
                                    nameColor = const Color(0xFF7DD3FC);
                                  } else if (isMe) {
                                    cardBg = const Color(0xFF132038);
                                    borderColor = const Color(0xFF38BDF8).withValues(alpha: 0.35);
                                  }

                                  return Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      gradient: cardGradient,
                                      color: cardGradient == null ? cardBg : null,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: borderColor, width: borderWidth),
                                      boxShadow: shadows,
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Top Prestige Ribbon for 9 NAGA or VIP
                                        if (is9Naga || isVip || isBank) ...[
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            margin: const EdgeInsets.only(bottom: 7),
                                            decoration: BoxDecoration(
                                              color: is9Naga
                                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.18)
                                                  : isVip
                                                      ? const Color(0xFFA855F7).withValues(alpha: 0.18)
                                                      : const Color(0xFF10B981).withValues(alpha: 0.18),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(
                                                color: is9Naga
                                                    ? const Color(0xFFF59E0B).withValues(alpha: 0.45)
                                                    : isVip
                                                        ? const Color(0xFFC084FC).withValues(alpha: 0.45)
                                                        : const Color(0xFF10B981).withValues(alpha: 0.45),
                                                width: 0.8,
                                              ),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  is9Naga
                                                      ? '🐉 SULTAN 9 NAGA • PERINGKAT #${liveRank ?? 1} BURSA'
                                                      : isVip
                                                          ? '💎 INVESTOR VIP SULTAN EKSEKUTIF'
                                                          : '🏛️ SIARAN RESMI OTORITAS BANK SENTRAL',
                                                  style: TextStyle(
                                                    color: is9Naga
                                                        ? const Color(0xFFFBBF24)
                                                        : isVip
                                                            ? const Color(0xFFE9D5FF)
                                                            : const Color(0xFF34D399),
                                                    fontSize: 8.5,
                                                    fontWeight: FontWeight.w900,
                                                    letterSpacing: 0.6,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],

                                        // Header: Avatar + Username + Badges + Timestamp
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            // Avatar
                                            Container(
                                              width: 34,
                                              height: 34,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                gradient: is9Naga
                                                    ? const LinearGradient(
                                                        colors: [Color(0xFFF59E0B), Color(0xFFB45309)],
                                                      )
                                                    : isVip
                                                        ? const LinearGradient(
                                                            colors: [Color(0xFFA855F7), Color(0xFFEC4899)],
                                                          )
                                                        : const LinearGradient(
                                                            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                                                          ),
                                                border: Border.all(
                                                  color: is9Naga
                                                      ? const Color(0xFFFDE68A)
                                                      : isVip
                                                          ? const Color(0xFFF5D0FE)
                                                          : const Color(0xFF334155),
                                                  width: is9Naga || isVip ? 1.5 : 1.0,
                                                ),
                                              ),
                                              alignment: Alignment.center,
                                              child: Text(
                                                is9Naga
                                                    ? '👑'
                                                    : isBank
                                                        ? '🏛️'
                                                        : (msg.username.isNotEmpty ? msg.username[0].toUpperCase() : 'T'),
                                                style: TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.w900,
                                                  fontSize: is9Naga || isBank ? 14 : 13,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 10),

                                            // Username, Badges, and PT Name
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Wrap(
                                                    crossAxisAlignment: WrapCrossAlignment.center,
                                                    spacing: 5,
                                                    runSpacing: 3,
                                                    children: [
                                                      Text(
                                                        msg.username,
                                                        style: TextStyle(
                                                          color: nameColor,
                                                          fontWeight: FontWeight.w900,
                                                          fontSize: is9Naga ? 13 : 12,
                                                        ),
                                                      ),
                                                      if (is9Naga)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                          decoration: BoxDecoration(
                                                            gradient: const LinearGradient(
                                                              colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                                                            ),
                                                            borderRadius: BorderRadius.circular(4),
                                                          ),
                                                          child: Text(
                                                            '🐉 9 NAGA${liveRank != null ? " #$liveRank" : ""}',
                                                            style: const TextStyle(
                                                              color: Colors.white,
                                                              fontSize: 8,
                                                              fontWeight: FontWeight.w900,
                                                            ),
                                                          ),
                                                        )
                                                      else if (isTaipan)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                                          decoration: BoxDecoration(
                                                            color: const Color(0xFF0284C7).withValues(alpha: 0.25),
                                                            borderRadius: BorderRadius.circular(4),
                                                            border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                                                          ),
                                                          child: Text(
                                                            '👑 TAIPAN${liveRank != null ? " #$liveRank" : ""}',
                                                            style: const TextStyle(
                                                              color: Color(0xFF7DD3FC),
                                                              fontSize: 8,
                                                              fontWeight: FontWeight.w900,
                                                            ),
                                                          ),
                                                        )
                                                      else if (!isBank && !isVip)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                          decoration: BoxDecoration(
                                                            color: const Color(0xFF334155),
                                                            borderRadius: BorderRadius.circular(4),
                                                          ),
                                                          child: Text(
                                                            msg.badge,
                                                            style: const TextStyle(
                                                              color: Colors.white,
                                                              fontSize: 7.5,
                                                              fontWeight: FontWeight.w800,
                                                            ),
                                                          ),
                                                        ),
                                                      if (isVip)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                                          decoration: BoxDecoration(
                                                            gradient: const LinearGradient(
                                                              colors: [Color(0xFFA855F7), Color(0xFFEC4899)],
                                                            ),
                                                            borderRadius: BorderRadius.circular(4),
                                                          ),
                                                          child: const Text(
                                                            '💎 VIP SULTAN',
                                                            style: TextStyle(
                                                              color: Colors.white,
                                                              fontSize: 8,
                                                              fontWeight: FontWeight.w900,
                                                            ),
                                                          ),
                                                        ),
                                                    ],
                                                  ),
                                                  if (cleanPt.isNotEmpty) ...[
                                                    const SizedBox(height: 2),
                                                    Text(
                                                      cleanPt,
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                      style: TextStyle(
                                                        color: is9Naga
                                                            ? const Color(0xFFFBBF24).withValues(alpha: 0.85)
                                                            : const Color(0xFF94A3B8),
                                                        fontSize: 10,
                                                        fontWeight: is9Naga ? FontWeight.w600 : FontWeight.normal,
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),

                                            // Time
                                            Text(
                                              timeStr,
                                              style: TextStyle(
                                                color: is9Naga ? const Color(0xFFFBBF24) : const Color(0xFF64748B),
                                                fontSize: 9.5,
                                                fontWeight: is9Naga ? FontWeight.bold : FontWeight.normal,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),

                                        // Message Content
                                        Text(
                                          msg.text,
                                          style: TextStyle(
                                            color: is9Naga
                                                ? const Color(0xFFFFFBEB)
                                                : isVip
                                                    ? const Color(0xFFFAF5FF)
                                                    : Colors.white,
                                            fontSize: is9Naga ? 12.5 : 12,
                                            fontWeight: is9Naga ? FontWeight.w600 : FontWeight.normal,
                                            height: 1.38,
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                      ),

                      // Input Bar
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          border: Border(
                            top: BorderSide(
                              color: amI9Naga
                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.5)
                                  : amIVip
                                      ? const Color(0xFFA855F7).withValues(alpha: 0.5)
                                      : const Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        child: Row(
                          children: [
                            if (amI9Naga || amIVip) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                                margin: const EdgeInsets.only(right: 8),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: amI9Naga
                                        ? [const Color(0xFFF59E0B), const Color(0xFFB45309)]
                                        : [const Color(0xFFA855F7), const Color(0xFFEC4899)],
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  amI9Naga ? '🐉 9 NAGA' : '💎 VIP',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ],
                            Expanded(
                              child: TextField(
                                controller: _chatController,
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                decoration: InputDecoration(
                                  hintText: amI9Naga
                                      ? 'Kirim titah Sultan 9 Naga ke lantai bursa...'
                                      : amIVip
                                          ? 'Kirim pesan eksekutif VIP ke bursa...'
                                          : 'Kirim pesan / rumor pasar bursa...',
                                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                  border: InputBorder.none,
                                ),
                              ),
                            ),
                            IconButton(
                              onPressed: () {
                                final text = _chatController.text.trim();
                                if (text.isNotEmpty) {
                                  provider.sendChatMessage(text);
                                  _chatController.clear();
                                }
                              },
                              icon: Icon(
                                Icons.send_rounded,
                                color: amI9Naga ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                              ),
                            ),
                          ],
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
    );
  }
}
