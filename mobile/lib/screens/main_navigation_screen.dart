import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/game_provider.dart';
import '../services/api_service.dart';
import '../utils/download_helper.dart';
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

  bool _isServerVersionNewer(String serverVer, int serverBuild) {
    if (serverVer == ApiService.currentAppVersion && serverBuild <= ApiService.currentBuildNumber) {
      return false;
    }
    if (serverBuild > ApiService.currentBuildNumber) {
      return true;
    }
    final sParts = serverVer.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    final cParts = ApiService.currentAppVersion.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    for (int i = 0; i < 3; i++) {
      final s = i < sParts.length ? sParts[i] : 0;
      final c = i < cParts.length ? cParts[i] : 0;
      if (s > c) return true;
      if (s < c) return false;
    }
    return false;
  }

  Future<void> _checkAppUpdate() async {
    try {
      final info = await ApiService.getServerVersion();
      if (!mounted || info == null) return;
      final serverBuild = (info['buildNumber'] as num?)?.toInt() ?? 0;
      final serverVer = info['version']?.toString() ?? '1.5.0';
      final releaseNotes = info['releaseNotes']?.toString() ?? 'Pembaruan sistem & perbaikan performa.';

      if (_isServerVersionNewer(serverVer, serverBuild) && mounted) {
        DownloadHelper.showModernUpdateDialog(
          context,
          currentVer: ApiService.currentAppVersion,
          currentBuild: ApiService.currentBuildNumber,
          newVer: serverVer,
          newBuild: serverBuild,
          releaseNotes: releaseNotes,
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
          Selector<GameProvider, String?>(
            selector: (_, p) => p.syncFailed ? (p.lastSyncLabel ?? '-') : null,
            builder: (_, label, __) => label == null
                ? const SizedBox.shrink()
                : Container(
                    width: double.infinity,
                    color: const Color(0xFF3B2A06),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    child: SafeArea(
                      bottom: false,
                      child: Row(
                        children: [
                          const Icon(Icons.cloud_off_rounded, color: Color(0xFFFBBF24), size: 13),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Sinyal lemah • menampilkan data tersimpan • terakhir diperbarui $label',
                              style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 10.5, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
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
