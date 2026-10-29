import 'dart:math';
import 'package:flutter/material.dart';
import '../models/company.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';
import 'trading_modal.dart';

class StockChartDialog extends StatefulWidget {
  final CompanyModel company;

  const StockChartDialog({super.key, required this.company});

  @override
  State<StockChartDialog> createState() => _StockChartDialogState();
}

class _StockChartDialogState extends State<StockChartDialog> {
  CompanyModel? _detailedCompany;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    try {
      final detail = await ApiService.getCompanyDetail(widget.company.id);
      if (mounted) {
        setState(() {
          _detailedCompany = detail ?? widget.company;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _detailedCompany = widget.company;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  List<double> _getChartPoints(CompanyModel c) {
    if (c.history.length >= 2) {
      return c.history.map((e) => e.price).toList();
    }
    // Generate realistic historical curve if history is still populating
    final random = Random(c.symbol.hashCode);
    final List<double> generated = [];
    final steps = 15;
    double current = c.basePrice;
    for (int i = 0; i < steps - 1; i++) {
      generated.add(current);
      final change = (random.nextDouble() - 0.48) * (c.basePrice * 0.02);
      current = (current + change).clamp(c.basePrice * 0.5, c.basePrice * 1.8);
    }
    generated.add(c.currentPrice);
    return generated;
  }

  @override
  Widget build(BuildContext context) {
    final c = _detailedCompany ?? widget.company;
    final isUp = c.priceChangePct >= 0;
    final points = _getChartPoints(c);

    return Dialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFF334155)),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            c.symbol,
                            style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 18, fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: c.status == 'HEALTHY'
                                  ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                  : const Color(0xFFEF4444).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              c.status == 'HEALTHY' ? 'SEHAT' : 'KRITIS',
                              style: TextStyle(
                                color: c.status == 'HEALTHY' ? const Color(0xFF34D399) : const Color(0xFFF87171),
                                fontSize: 8,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        c.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Price & Change (Guaranteed zero overflow)
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      CurrencyFormatter.formatFull(c.currentPrice),
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  CurrencyFormatter.formatPercentage(c.priceChangePct),
                  style: TextStyle(
                    color: isUp ? const Color(0xFF34D399) : const Color(0xFFF87171),
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Line Chart Area
            Container(
              height: 160,
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
                  : CustomPaint(
                      size: Size.infinite,
                      painter: StockChartPainter(
                        points: points,
                        isUp: isUp,
                      ),
                    ),
            ),
            const SizedBox(height: 8),

            // Market interval description
            const Center(
              child: Text(
                '⚡ Pergerakan harga live update setiap 4 detik • Dividen setiap 1 menit',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.w500),
              ),
            ),
            const SizedBox(height: 12),

            // Fundamentals & Dividends row
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _statItem('Sektor', c.sector, const Color(0xFFCBD5E1)),
                  _statItem('Fundamental', '${c.fundamentalScore.toStringAsFixed(0)} / 100', const Color(0xFF38BDF8)),
                  _statItem('Dividen', '${(c.dividendRate * 100).toStringAsFixed(1)}%', const Color(0xFFF59E0B)),
                  _statItem('1 Lot', CurrencyFormatter.formatCompact(c.lotPrice), const Color(0xFF34D399)),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Trading Action button
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (ctx) => TradingModal(company: c),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: const Color(0xFF022C22),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('BUKA TERMINAL TRADING', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statItem(String title, String val, Color color) {
    return Column(
      children: [
        Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9)),
        const SizedBox(height: 2),
        Text(val, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class StockChartPainter extends CustomPainter {
  final List<double> points;
  final bool isUp;

  StockChartPainter({required this.points, required this.isUp});

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;

    double minPrice = points.reduce((a, b) => a < b ? a : b);
    double maxPrice = points.reduce((a, b) => a > b ? a : b);
    if (maxPrice == minPrice) {
      maxPrice += 10.0;
      minPrice -= 10.0;
    }

    final double range = maxPrice - minPrice;
    final double stepX = size.width / (points.length - 1);

    final path = Path();
    final fillPath = Path();

    for (int i = 0; i < points.length; i++) {
      final double x = i * stepX;
      final double normalizedY = (points[i] - minPrice) / range;
      final double y = size.height - (normalizedY * (size.height * 0.75) + (size.height * 0.12));

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }

      if (i == points.length - 1) {
        fillPath.lineTo(x, size.height);
        fillPath.close();
      }
    }

    final color = isUp ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    // Gradient fill under curve
    final fillPaint = Paint()
      ..shader = LinearGradient(
        colors: [color.withValues(alpha: 0.3), color.withValues(alpha: 0.0)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    canvas.drawPath(fillPath, fillPaint);

    // Stroke line
    final strokePaint = Paint()
      ..color = color
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(path, strokePaint);

    // Draw point dot on latest price
    final lastX = (points.length - 1) * stepX;
    final lastNormY = (points.last - minPrice) / range;
    final lastY = size.height - (lastNormY * (size.height * 0.75) + (size.height * 0.12));

    final dotPaint = Paint()..color = color;
    final dotGlow = Paint()..color = color.withValues(alpha: 0.35);

    canvas.drawCircle(Offset(lastX, lastY), 6, dotGlow);
    canvas.drawCircle(Offset(lastX, lastY), 3, dotPaint);
  }

  @override
  bool shouldRepaint(covariant StockChartPainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.isUp != isUp;
  }
}
