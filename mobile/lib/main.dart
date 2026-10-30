import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/game_provider.dart';
import 'screens/main_navigation_screen.dart';
import 'screens/onboarding_screen.dart';

import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID', null);
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  ErrorWidget.builder = (FlutterErrorDetails details) {
    return Container(
      color: const Color(0xFF0F172A),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(12),
      child: const Text(
        'Sinkronisasi tampilan...',
        style: TextStyle(color: Color(0xFF64748B), fontSize: 10),
      ),
    );
  };
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => GameProvider()..initGame()),
      ],
      child: const CapitalFederationApp(),
    ),
  );
}

class CapitalFederationApp extends StatelessWidget {
  const CapitalFederationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Capital Federation',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF070B14),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF38BDF8),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF0F172A),
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
        useMaterial3: true,
      ),
      home: const RootScreen(),
    );
  }
}

class RootScreen extends StatefulWidget {
  const RootScreen({super.key});

  @override
  State<RootScreen> createState() => _RootScreenState();
}

class _RootScreenState extends State<RootScreen> {
  bool _showRetry = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) setState(() => _showRetry = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();

    if (provider.isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFF070B14),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircularProgressIndicator(color: Color(0xFF10B981)),
                const SizedBox(height: 18),
                const Text(
                  'Menghubungkan ke Bank Sentral Federasi...',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.w600),
                ),
                if (_showRetry) ...[
                  const SizedBox(height: 24),
                  OutlinedButton.icon(
                    onPressed: () {
                      provider.initGame();
                    },
                    icon: const Icon(Icons.refresh_rounded, color: Color(0xFF38BDF8), size: 18),
                    label: const Text('Coba Hubungkan Ulang', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF38BDF8)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    if (!provider.hasUser) {
      return OnboardingScreen(
        onCompleted: () {
          // Handled within provider
        },
      );
    }

    return const MainNavigationScreen();
  }
}
