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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();

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
                  const Text(
                    'PERINGKAT & KOMUNITAS',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Peringkat Top 100 Taipan dan Obrolan Pasar Global.',
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
                  // TAB 1: Top 100 Leaderboard
                  provider.leaderboard.isEmpty
                      ? const Center(child: Text('Memuat peringkat...', style: TextStyle(color: Color(0xFF64748B))))
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 10, 20, 80),
                          itemCount: provider.leaderboard.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final item = provider.leaderboard[index];
                            final rank = item['rank'] ?? (index + 1);
                            final badge = item['badge'] ?? 'REGULER';
                            final isTop9 = rank <= 9;
                            final isRank1 = rank == 1;
                            final isRank2 = rank == 2;
                            final isRank3 = rank == 3;
                            final ptName = item['ptName']?.toString() ?? '';
                            final sector = item['sector']?.toString() ?? '';
                            final netWorthVal = (item['netWorth'] ?? 0).toDouble();

                            Color borderColor;
                            Color rankBgColor;
                            Color rankTextColor;
                            if (isRank1) {
                              borderColor = const Color(0xFFF59E0B);
                              rankBgColor = const Color(0xFFF59E0B).withValues(alpha: 0.25);
                              rankTextColor = const Color(0xFFFBBF24);
                            } else if (isRank2) {
                              borderColor = const Color(0xFF94A3B8);
                              rankBgColor = const Color(0xFF94A3B8).withValues(alpha: 0.2);
                              rankTextColor = const Color(0xFFE2E8F0);
                            } else if (isRank3) {
                              borderColor = const Color(0xFFD97706);
                              rankBgColor = const Color(0xFFD97706).withValues(alpha: 0.2);
                              rankTextColor = const Color(0xFFF59E0B);
                            } else if (isTop9) {
                              borderColor = const Color(0xFFF59E0B).withValues(alpha: 0.4);
                              rankBgColor = const Color(0xFF0F172A);
                              rankTextColor = const Color(0xFFF59E0B);
                            } else {
                              borderColor = const Color(0xFF1E293B);
                              rankBgColor = const Color(0xFF0F172A);
                              rankTextColor = const Color(0xFF64748B);
                            }

                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: borderColor,
                                  width: isRank1 ? 1.8 : (isRank2 || isRank3 ? 1.4 : 1.0),
                                ),
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
                                      border: Border.all(color: borderColor.withValues(alpha: 0.6)),
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

                                  // Name and PT
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              item['username'] ?? '',
                                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                                            ),
                                            const SizedBox(width: 6),
                                            if (isTop9)
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                                                  borderRadius: BorderRadius.circular(4),
                                                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                                                ),
                                                child: const Text('9 NAGA', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 8, fontWeight: FontWeight.w900)),
                                              )
                                            else if (badge == 'TAIPAN')
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: const Text('TAIPAN', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 8, fontWeight: FontWeight.w900)),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          ptName.isNotEmpty
                                              ? 'PT $ptName • Sektor $sector'
                                              : 'Investor Pemula (Retail)',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Total Asset (Full Dotted Indonesian Format)
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        CurrencyFormatter.formatFull(netWorthVal),
                                        style: TextStyle(
                                          color: isTop9 ? const Color(0xFFF59E0B) : const Color(0xFF34D399),
                                          fontWeight: FontWeight.w900,
                                          fontSize: 13,
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

                  // TAB 2: Global Chat
                  Column(
                    children: [
                      Expanded(
                        child: ListView.separated(
                          padding: const EdgeInsets.all(20),
                          itemCount: provider.chatMessages.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final msg = provider.chatMessages[index];
                            final isBank = msg.badge == 'BANK SENTRAL';
                            final isMe = msg.userId == provider.user?.id;

                            return Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isBank
                                    ? const Color(0xFFF59E0B).withValues(alpha: 0.1)
                                    : isMe
                                        ? const Color(0xFF38BDF8).withValues(alpha: 0.1)
                                        : const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isBank
                                      ? const Color(0xFFF59E0B).withValues(alpha: 0.3)
                                      : const Color(0xFF1E293B),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            msg.username,
                                            style: TextStyle(
                                              color: isBank ? const Color(0xFFF59E0B) : const Color(0xFF38BDF8),
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: isBank ? const Color(0xFFF59E0B) : const Color(0xFF334155),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              msg.badge,
                                              style: TextStyle(
                                                color: isBank ? const Color(0xFF022C22) : Colors.white,
                                                fontSize: 8,
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      Text(
                                        '${msg.createdAt.hour.toString().padLeft(2, '0')}:${msg.createdAt.minute.toString().padLeft(2, '0')}',
                                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 9),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    msg.text,
                                    style: const TextStyle(color: Colors.white, fontSize: 12),
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
                        decoration: const BoxDecoration(
                          color: Color(0xFF0F172A),
                          border: Border(top: BorderSide(color: Color(0xFF1E293B))),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _chatController,
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                decoration: const InputDecoration(
                                  hintText: 'Kirim pesan / rumor pasar bursa...',
                                  hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
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
                              icon: const Icon(Icons.send_rounded, color: Color(0xFF10B981)),
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
