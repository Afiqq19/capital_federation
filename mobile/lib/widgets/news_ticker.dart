import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/news.dart';
import '../providers/game_provider.dart';

class NewsTickerWidget extends StatelessWidget {
  const NewsTickerWidget({super.key});

  void _showNewsModal(BuildContext context, List<NewsModel> newsList) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.65,
          minChildSize: 0.4,
          maxChildSize: 0.85,
          expand: false,
          builder: (_, scrollCtrl) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF334155),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Row(
                    children: [
                      Icon(Icons.newspaper_rounded, color: Color(0xFF38BDF8), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'WARTA PASAR & AKSI KORPORASI',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Siaran berita resmi pasar modal, keterbukaan informasi, dan aksi korporasi emiten.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: newsList.isEmpty
                        ? const Center(
                            child: Text(
                              'Belum ada berita aksi korporasi terbaru.',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                            ),
                          )
                        : ListView.separated(
                            controller: scrollCtrl,
                            itemCount: newsList.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, idx) {
                              final item = newsList[idx];
                              final isBullish = item.sentiment == 'BULLISH';
                              return Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E293B),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isBullish
                                        ? const Color(0xFF10B981).withValues(alpha: 0.3)
                                        : const Color(0xFFEF4444).withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isBullish ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            item.affectedSector.toUpperCase(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 8.5,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          _formatDate(item.publishedAt),
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      item.title,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item.content,
                                      style: const TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 11.5,
                                        height: 1.35,
                                      ),
                                    ),
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
  }

  static String _formatDate(DateTime dt) {
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$hh:$mm WIB';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final news = provider.newsList;

    if (news.isEmpty) {
      return Container(
        height: 28,
        decoration: const BoxDecoration(
          color: Color(0xFF0B1322),
          border: Border(
            top: BorderSide(color: Color(0xFF1E293B)),
            bottom: BorderSide(color: Color(0xFF0F172A)),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: const Row(
          children: [
            Icon(Icons.podcasts_rounded, color: Color(0xFF38BDF8), size: 13),
            SizedBox(width: 6),
            Expanded(
              child: MarqueeRunningText(
                text: 'BEI TICKER: Pasar modal beroperasi normal. Kebijakan suku bunga Bank Sentral terpantau stabil. Transaksi saham berlangsung likuid & aman.    ✦    ',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.w600),
                velocity: 36.0,
              ),
            ),
          ],
        ),
      );
    }

    final latest = news.first;
    final isBullish = latest.sentiment == 'BULLISH';
    final tickerText = '🏢 ${latest.title} — ${latest.content}    ✦    ';

    return GestureDetector(
      onTap: () => _showNewsModal(context, news),
      child: Container(
        height: 28,
        decoration: BoxDecoration(
          color: isBullish ? const Color(0xFF06382B) : const Color(0xFF3B1219),
          border: Border(
            top: BorderSide(
              color: isBullish
                  ? const Color(0xFF10B981).withValues(alpha: 0.3)
                  : const Color(0xFFEF4444).withValues(alpha: 0.3),
            ),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isBullish ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                latest.affectedSector.toUpperCase(),
                style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: MarqueeRunningText(
                text: tickerText,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
                velocity: 38.0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MarqueeRunningText extends StatefulWidget {
  final String text;
  final TextStyle style;
  final double velocity;

  const MarqueeRunningText({
    super.key,
    required this.text,
    required this.style,
    this.velocity = 38.0,
  });

  @override
  State<MarqueeRunningText> createState() => _MarqueeRunningTextState();
}

class _MarqueeRunningTextState extends State<MarqueeRunningText> {
  late final ScrollController _scrollController;
  bool _disposed = false;
  bool _isLooping = false;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startLoop());
  }

  @override
  void didUpdateWidget(covariant MarqueeRunningText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(0.0);
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _startLoop() async {
    if (_isLooping || _disposed) return;
    _isLooping = true;

    const gap = 45.0;

    while (!_disposed && mounted) {
      if (_scrollController.hasClients) {
        final tp = TextPainter(
          text: TextSpan(text: widget.text, style: widget.style),
          textDirection: TextDirection.ltr,
        )..layout();
        final textWidth = tp.width;
        final cycleWidth = textWidth + gap;

        final durationMs = ((cycleWidth / widget.velocity) * 1000).toInt().clamp(1000, 120000);

        try {
          await _scrollController.animateTo(
            cycleWidth,
            duration: Duration(milliseconds: durationMs),
            curve: Curves.linear,
          );
          if (_disposed || !mounted) return;
          _scrollController.jumpTo(0.0);
        } catch (_) {
          break;
        }
      } else {
        await Future.delayed(const Duration(milliseconds: 200));
      }
    }
    _isLooping = false;
  }

  @override
  Widget build(BuildContext context) {
    const gap = 45.0;
    return SingleChildScrollView(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      physics: const NeverScrollableScrollPhysics(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (int i = 0; i < 4; i++) ...[
            Text(widget.text, style: widget.style, maxLines: 1),
            const SizedBox(width: gap),
          ],
        ],
      ),
    );
  }
}
