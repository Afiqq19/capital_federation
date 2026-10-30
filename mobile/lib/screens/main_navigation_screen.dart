import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import 'home_tab.dart';
import 'market_tab.dart';
import 'asset_exchange_tab.dart';
import 'portfolio_tab.dart';
import 'leaderboard_tab.dart';
import 'disclaimer_dialog.dart';
import '../widgets/news_ticker.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeTab(),
    MarketTab(),
    AssetExchangeTab(),
    PortfolioTab(),
    LeaderboardTab(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _checkDisclaimer();
      if (mounted) {
        _checkAppUpdate();
      }
    });
  }

  Future<void> _checkAppUpdate() async {
    try {
      final info = await ApiService.getServerVersion();
      if (!mounted || info == null) return;
      final serverBuild = (info['buildNumber'] as num?)?.toInt() ?? 0;
      final serverVer = info['version']?.toString() ?? '1.5.0';
      final releaseNotes = info['releaseNotes']?.toString() ?? 'Pembaruan sistem & perbaikan performa.';

      if (serverBuild > ApiService.currentBuildNumber && mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFF59E0B), width: 1.5),
            ),
            title: const Row(
              children: [
                Icon(Icons.system_update_rounded, color: Color(0xFFF59E0B), size: 24),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Pembaruan Tersedia!',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Versi v$serverVer (Build $serverBuild) telah dirilis secara resmi oleh Otoritas Capital Federation.',
                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Catatan Rilis Pembaruan:', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 3),
                      Text(releaseNotes, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, height: 1.35)),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('NANTI SAJA', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 11)),
              ),
              ElevatedButton.icon(
                onPressed: () async {
                  Navigator.pop(ctx);
                  final uri = Uri.parse('https://capitalfederation.xie.my.id/api/download/apk');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.download_rounded, size: 16),
                label: const Text('UPDATE SEKARANG', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: const Color(0xFF1E1502),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _checkDisclaimer() async {
    final prefs = await SharedPreferences.getInstance();
    final accepted = prefs.getBool('disclaimer_accepted') ?? false;
    if (!accepted && mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => DisclaimerDialog(
          onAccept: () async {
            await prefs.setBool('disclaimer_accepted', true);
            if (ctx.mounted) {
              Navigator.pop(ctx);
            }
          },
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: Column(
        children: [
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: _screens,
            ),
          ),
          const NewsTickerWidget(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0D1322),
          border: Border(top: BorderSide(color: Color(0xFF1E293B))),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: Colors.transparent,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(0xFF38BDF8),
          unselectedItemColor: const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 10),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 10),
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_rounded),
              label: 'Beranda',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.candlestick_chart_rounded),
              label: 'Pasar',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.handshake_rounded),
              label: 'Bursa Aset',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_rounded),
              label: 'Portofolio',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.military_tech_rounded),
              label: 'Peringkat',
            ),
          ],
        ),
      ),
    );
  }
}
