import 'package:flutter/material.dart';
import '../../../services/api_service.dart';
import '../../corporate_deals/screens/corporate_deals_screen.dart';

class FederationMacroBanner extends StatefulWidget {
  final VoidCallback? onCourtTap;
  const FederationMacroBanner({super.key, this.onCourtTap});

  @override
  State<FederationMacroBanner> createState() => _FederationMacroBannerState();
}

class _FederationMacroBannerState extends State<FederationMacroBanner> {
  Map<String, dynamic>? _macroData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMacro();
  }

  Future<void> _loadMacro() async {
    final data = await ApiService.getFederationMacro();
    if (mounted) {
      setState(() {
        _macroData = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _macroData == null) {
      return const SizedBox.shrink();
    }
    final state = _macroData?['economicState'] ?? 'NORMAL';
    final interestRate = _macroData?['interestRate'] ?? 6.5;
    final inflationRate = _macroData?['inflationRate'] ?? 3.1;

    Color badgeColor = const Color(0xFF10B981);
    String stateLabel = 'STABIL & SEHAT';
    IconData stateIcon = Icons.verified_rounded;

    if (state == 'BOOM') {
      badgeColor = const Color(0xFF38BDF8);
      stateLabel = 'ZAMAN KEMAKMURAN';
      stateIcon = Icons.rocket_launch_rounded;
    } else if (state == 'RECESSION') {
      badgeColor = const Color(0xFFF59E0B);
      stateLabel = 'FASE RESESI';
      stateIcon = Icons.warning_amber_rounded;
    } else if (state == 'CRISIS') {
      badgeColor = const Color(0xFFEF4444);
      stateLabel = 'KRISIS MONETER';
      stateIcon = Icons.crisis_alert_rounded;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF0F172A),
            badgeColor.withValues(alpha: 0.12),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(stateIcon, color: badgeColor, size: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'REPUBLIK FEDERASI',
                          style: TextStyle(
                            color: Color(0xFFF5B942),
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: badgeColor.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: badgeColor, width: 0.8),
                            ),
                            child: Text(
                              stateLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: badgeColor,
                                fontSize: 7.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Bursa Efek & Pasar Modal IPMC',
                      style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const CorporateDealsScreen()),
                      );
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.handshake_rounded, color: Color(0xFF38BDF8), size: 13),
                          SizedBox(width: 4),
                          Text(
                            'P2P',
                            style: TextStyle(
                              color: Color(0xFF38BDF8),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (widget.onCourtTap != null) ...[
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: widget.onCourtTap,
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.5)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 13),
                            SizedBox(width: 4),
                            Text(
                              'PNAF',
                              style: TextStyle(
                                color: Color(0xFFF5B942),
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF070B14),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildIndicator('Bunga BCF', '${interestRate.toStringAsFixed(1)}%', const Color(0xFF38BDF8)),
                _buildIndicator('Inflasi Federasi', '${inflationRate.toStringAsFixed(1)}%', const Color(0xFFF59E0B)),
                _buildIndicator('Mata Uang', 'IB (Indigo Billion)', const Color(0xFF34D399)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIndicator(String title, String val, Color valColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9)),
        Text(
          val,
          style: TextStyle(color: valColor, fontSize: 10.5, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
        ),
      ],
    );
  }
}

