import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/user.dart';
import '../providers/game_provider.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';
import 'game_constitution_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Controllers untuk Pengaturan Akun Terpadu
  late final TextEditingController _usernameController;
  late final TextEditingController _emailController;
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _obscureNewPass = true;
  bool _obscureConfirmPass = true;
  bool _isSavingAll = false;
  bool _isVerifyingEmail = false;

  // State Deteksi Update APK Server
  bool _isCheckingUpdate = false;
  Map<String, dynamic>? _serverVersionData;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    final user = context.read<GameProvider>().user;
    _usernameController = TextEditingController(text: user?.username ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkServerVersion(silent: true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _checkServerVersion({bool silent = false}) async {
    if (!mounted) return;
    setState(() => _isCheckingUpdate = true);

    try {
      final data = await ApiService.getServerVersion();
      if (!mounted) return;
      setState(() {
        _serverVersionData = data;
        _isCheckingUpdate = false;
      });

      if (!silent) {
        final serverVer = data?['version']?.toString() ?? ApiService.currentAppVersion;
        final serverBuild = (data?['buildNumber'] is num)
            ? (data!['buildNumber'] as num).toInt()
            : int.tryParse(data?['buildNumber']?.toString() ?? '') ?? ApiService.currentBuildNumber;

        final bool hasNewer = _compareVersions(serverVer, serverBuild, ApiService.currentAppVersion, ApiService.currentBuildNumber);

        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: hasNewer ? const Color(0xFFD97706) : const Color(0xFF059669),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
            content: Row(
              children: [
                Icon(
                  hasNewer ? Icons.system_update_alt_rounded : Icons.verified_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    hasNewer
                        ? 'Tersedia pembaruan sistem v$serverVer (Build $serverBuild)!'
                        : 'Aplikasi Anda mutakhir (v${ApiService.currentAppVersion}) dan tersinkronisasi penuh dengan server.',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isCheckingUpdate = false);
      if (!silent) {
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            content: Text('Gagal memeriksa versi server: $e', style: const TextStyle(fontSize: 12)),
          ),
        );
      }
    }
  }

  bool _compareVersions(String sVer, int sBuild, String cVer, int cBuild) {
    if (sBuild > cBuild) return true;
    final sParts = sVer.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    final cParts = cVer.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    for (int i = 0; i < 3; i++) {
      final s = i < sParts.length ? sParts[i] : 0;
      final c = i < cParts.length ? cParts[i] : 0;
      if (s > c) return true;
      if (s < c) return false;
    }
    return false;
  }

  // Simpan Semua Perubahan Pengaturan Akun Sekaligus
  Future<void> _handleSaveAllAccountSettings() async {
    final newName = _usernameController.text.trim();
    final newEmail = _emailController.text.trim();
    final newPass = _newPasswordController.text;
    final confirmPass = _confirmPasswordController.text;

    if (newName.isEmpty) {
      _showToast('Nama pengguna tidak boleh kosong!', isError: true);
      return;
    }

    if (newPass.isNotEmpty) {
      if (newPass.length < 6) {
        _showToast('Kata sandi baru minimal 6 karakter!', isError: true);
        return;
      }
      if (newPass != confirmPass) {
        _showToast('Konfirmasi kata sandi tidak cocok!', isError: true);
        return;
      }
    }

    setState(() => _isSavingAll = true);
    HapticFeedback.lightImpact();
    final provider = context.read<GameProvider>();

    final res = await provider.updateUserProfile(
      username: newName,
      email: newEmail,
      newPassword: newPass.isNotEmpty ? newPass : null,
    );

    setState(() => _isSavingAll = false);

    if (res['success'] == true) {
      if (newPass.isNotEmpty) {
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      }
      _showToast('✅ Seluruh perubahan identitas & keamanan akun berhasil disimpan!');
    } else {
      _showToast(res['error']?.toString() ?? 'Gagal memperbarui pengaturan akun', isError: true);
    }
  }

  // Dialog Simulasi Verifikasi Email dengan Tautan Aktivasi Otentik
  void _startEmailVerificationFlow() {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      _showToast('Silakan masukkan alamat email yang valid terlebih dahulu!', isError: true);
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF38BDF8), width: 1.2),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.mark_email_unread_rounded, color: Color(0xFF38BDF8), size: 22),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Surat Verifikasi Notariat',
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Server Otoritas Pasar Modal telah menerbitkan surat aktivasi resmi untuk akun Anda:',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, height: 1.4),
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMailHeaderRow('Dari:', 'projek.msyafiq19@gmail.com (Otoritas Kustodian CFX)'),
                  const SizedBox(height: 4),
                  _buildMailHeaderRow('Kepada:', email),
                  const SizedBox(height: 4),
                  _buildMailHeaderRow('Subjek:', '[VERIFIKASI] Pengesahan Kepemilikan Akun'),
                  const Divider(color: Color(0xFF1E293B), height: 16),
                  const Text(
                    'Tautan Aktivasi Resmi:',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'https://capitalfederation.xie.my.id/auth/verify?token=CFX-8921-SECURE',
                    style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontFamily: 'monospace'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Klik tombol di bawah untuk menyimulasikan pembukaan tautan dari inbox email Anda:',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('TUTUP', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: const Color(0xFF022C22),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _isVerifyingEmail = true);
              final provider = context.read<GameProvider>();
              final res = await provider.verifyUserEmail(email);
              setState(() => _isVerifyingEmail = false);

              if (res['success'] == true) {
                _showSuccessVerificationDialog(email);
              } else {
                _showToast(res['error']?.toString() ?? 'Gagal memverifikasi email.', isError: true);
              }
            },
            icon: const Icon(Icons.touch_app_rounded, size: 16),
            label: const Text(
              'KLIK TAUTAN & VERIFIKASI',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMailHeaderRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 50,
          child: Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10.5, fontWeight: FontWeight.bold)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }

  void _showSuccessVerificationDialog(String email) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.verified_rounded, color: Color(0xFF34D399), size: 48),
            ),
            const SizedBox(height: 16),
            const Text(
              'VERIFIKASI EMAIL SUKSES!',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              'Alamat $email telah resmi berbadan hukum dan disahkan oleh Notariat Digital Kustodian Sentral IPMC.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield_rounded, color: Color(0xFF34D399), size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Portofolio saham, dividen emiten, & kas brankas kini 100% terlindungi.',
                      style: TextStyle(color: Color(0xFF34D399), fontSize: 10.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: const Color(0xFF022C22),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('MENGERTI & KEMBALI', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11.5)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showToast(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        backgroundColor: isError ? const Color(0xFFDC2626) : const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // Pusat Bantuan & Layanan IPMC (Dengan Dukungan Lapor Bug & Saran Fitur)
  void _showHelpCenterDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(22, 20, 22, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.support_agent_rounded, color: Color(0xFF38BDF8), size: 24),
                ),
                const SizedBox(width: 12),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pusat Bantuan & Layanan IPMC',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Layanan Lapor BUG, Kritik/Saran, & Arbitrase',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Kartu Lapor Bug Teknis
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.bug_report_rounded, color: Color(0xFFEF4444), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Laporan Bug & Celah Teknis',
                        style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Menemukan bug transaksi, lelang, atau tampilan? Kirimkan rincian kendala beserta tangkapan layar ke:',
                    style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.35),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.email_outlined, size: 13, color: Color(0xFFFCA5A5)),
                        SizedBox(width: 6),
                        Text(
                          'projek.msyafiq19@gmail.com',
                          style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 11, fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Kartu Kotak Saran & Aspirasi
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.lightbulb_rounded, color: Color(0xFFF59E0B), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Kotak Saran & Aspirasi Fitur',
                        style: TextStyle(color: Color(0xFFFDE68A), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Punya ide mekanisme bursa, emiten, atau fitur baru? Kami menyambut hangat setiap masukan konglomerat.',
                    style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.35),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.feedback_outlined, size: 13, color: Color(0xFFFDE68A)),
                        SizedBox(width: 6),
                        Text(
                          'projek.msyafiq19@gmail.com',
                          style: TextStyle(color: Color(0xFFFDE68A), fontSize: 11, fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Arbitrase PNAF
            _buildHelpItem(
              Icons.gavel_rounded,
              'Mahkamah Arbitrase Niaga (PNAF)',
              'Penyelesaian sengketa transaksi efek, wanprestasi akuisisi, dan kepailitan korporasi.',
            ),

            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E293B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('TUTUP LAYANAN BANTUAN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHelpItem(IconData icon, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: const Color(0xFF38BDF8), size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }

  void _confirmLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFF334155)),
        ),
        title: const Row(
          children: [
            Icon(Icons.power_settings_new_rounded, color: Color(0xFFEF4444), size: 22),
            SizedBox(width: 8),
            Text('Akhiri Sesi Konglomerat', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Apakah Anda yakin ingin keluar dari otoritas akun ini? Seluruh kepemilikan saham, anak PT, dan saldo kas Anda tersimpan aman di server bursa.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('BATAL', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<GameProvider>().logout();
            },
            child: const Text('KELUAR', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final user = provider.user;

    if (user == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF060913),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
        ),
      );
    }

    // Hitung peringkat dan status 9 Naga
    int? myRank;
    for (int i = 0; i < provider.leaderboard.length; i++) {
      final row = provider.leaderboard[i];
      final uid = (row['id'] ?? '').toString();
      final uname = (row['username'] ?? '').toString().toLowerCase();
      if (uid == user.id || uname == user.username.toLowerCase()) {
        myRank = (row['rank'] is int) ? row['rank'] as int : (i + 1);
        break;
      }
    }
    final bool is9Naga = myRank != null && myRank <= 9;
    final bool isTaipan = myRank != null && myRank > 9 && myRank <= 25;
    final bool isVip = user.isVip;

    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0F1E),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text(
                  'PROFIL KONGLOMERAT',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 0.8, color: Colors.white),
                ),
                const SizedBox(width: 8),
                if (is9Naga)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFB45309)]),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      '🐉 9 NAGA',
                      style: TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.w900),
                    ),
                  ),
              ],
            ),
            const Text(
              'Otoritas Akun & Ekosistem Finansial IPMC',
              style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
        actions: [
          // Tombol Sinkronisasi / Cek Server
          IconButton(
            tooltip: 'Periksa Pembaruan Sistem',
            icon: _isCheckingUpdate
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF38BDF8)))
                : const Icon(Icons.sync_rounded, color: Color(0xFF94A3B8), size: 20),
            onPressed: () => _checkServerVersion(silent: false),
          ),
          // Tombol Salinan Regulasi Konstitusi Notaris
          IconButton(
            tooltip: 'Konstitusi & Regulasi IPMC',
            icon: const Icon(Icons.menu_book_rounded, color: Color(0xFFF59E0B), size: 20),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GameConstitutionScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFF59E0B),
          indicatorWeight: 3,
          labelColor: const Color(0xFFF59E0B),
          unselectedLabelColor: const Color(0xFF64748B),
          labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.5),
          tabs: const [
            Tab(text: 'PENGATURAN & AKUN'),
            Tab(text: 'STATUS VIP & PRESTISE'),
            Tab(text: 'HOLDING PT & REGULASI'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Header Profil Identitas Eksekutif
          _buildExecutiveHeader(user, is9Naga, isTaipan, isVip, myRank),

          // Tab Body Konten
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildUnifiedSettingsTab(user),
                _buildVipAndPrestigeTab(user, is9Naga, isVip),
                _buildHoldingAndRegulationTab(user),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExecutiveHeader(UserModel user, bool is9Naga, bool isTaipan, bool isVip, int? rank) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: is9Naga
              ? [const Color(0xFF2B1F06), const Color(0xFF141109), const Color(0xFF0F172A)]
              : [const Color(0xFF0F172A), const Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: is9Naga
              ? const Color(0xFFF59E0B).withValues(alpha: 0.6)
              : (isVip ? const Color(0xFFA855F7).withValues(alpha: 0.5) : const Color(0xFF334155)),
          width: is9Naga ? 1.5 : 1.0,
        ),
        boxShadow: is9Naga
            ? [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                )
              ]
            : null,
      ),
      child: Row(
        children: [
          // Avatar Konglomerat
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              gradient: is9Naga
                  ? const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFB45309)])
                  : (isVip
                      ? const LinearGradient(colors: [Color(0xFFA855F7), Color(0xFFEC4899)])
                      : const LinearGradient(colors: [Color(0xFF38BDF8), Color(0xFF1E293B)])),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                )
              ],
            ),
            alignment: Alignment.center,
            child: Text(
              is9Naga
                  ? '🐉'
                  : (isVip ? '💎' : (user.username.isNotEmpty ? user.username[0].toUpperCase() : 'C')),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
          const SizedBox(width: 14),

          // Identitas & Badge
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    Text(
                      user.username,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: is9Naga ? const Color(0xFFFDE68A) : Colors.white,
                      ),
                    ),
                    if (is9Naga)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Peringkat #${rank ?? 1} 9 NAGA',
                          style: const TextStyle(color: Colors.black, fontSize: 8.5, fontWeight: FontWeight.w900),
                        ),
                      )
                    else if (isTaipan)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFF38BDF8)),
                        ),
                        child: Text(
                          'TAIPAN #${rank ?? 10}',
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 8.5, fontWeight: FontWeight.w900),
                        ),
                      ),
                    if (isVip)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFFA855F7), Color(0xFFEC4899)]),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'VIP PRESTISE',
                          style: TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.w900),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  user.email.isNotEmpty ? user.email : 'Alamat email belum didaftarkan',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.account_balance_wallet_rounded, size: 13, color: Color(0xFF34D399)),
                    const SizedBox(width: 4),
                    Text(
                      'Kas Pribadi: ${CurrencyFormatter.formatFull(user.balanceIb)}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF34D399),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 1: PENGATURAN TERPADU (GABUNG SEMUA FORM JADI 1 CARD ELEGAN & RAPI)
  // ===========================================================================
  Widget _buildUnifiedSettingsTab(UserModel user) {
    final bool isEmailVerified = user.emailVerified;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
      children: [
        // Kartu Deteksi Pembaruan Versi Server (Tunggal & Tidak Dobel)
        _buildSingleUpdateCard(),

        const SizedBox(height: 14),

        // FORMULIR TERPADU: IDENTITAS, EMAIL NOTARIAT & KATA SANDI
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF1E293B)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Form
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.manage_accounts_rounded, color: Color(0xFF38BDF8), size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PENGATURAN IDENTITAS & AKUN',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                        ),
                        Text(
                          'Kelola nama konglomerat, email notariat, dan kata sandi',
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(color: Color(0xFF1E293B), height: 24),

              // 1. NAMA KONGLOMERAT (USERNAME)
              const Text(
                'NAMA KONGLOMERAT (USERNAME)',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _usernameController,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF060913),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.badge_rounded, color: Color(0xFF38BDF8), size: 18),
                  hintText: 'Nama konglomerat Anda',
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
              ),

              const SizedBox(height: 16),

              // 2. EMAIL NOTARIAT & VERIFIKASI
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'ALAMAT EMAIL RESMI NOTARIAT',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: isEmailVerified
                          ? const Color(0xFF10B981).withValues(alpha: 0.15)
                          : const Color(0xFFF59E0B).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(5),
                      border: Border.all(
                        color: isEmailVerified ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      isEmailVerified ? '✅ TERVERIFIKASI' : '⚠️ BELUM VERIFIKASI',
                      style: TextStyle(
                        color: isEmailVerified ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
                        fontSize: 8.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _emailController,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF060913),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.email_rounded, color: Color(0xFF10B981), size: 18),
                  hintText: 'nama@domain.com',
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
              ),
              const SizedBox(height: 8),

              // Tombol Aksi Verifikasi Email
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF34D399),
                    side: const BorderSide(color: Color(0xFF059669)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _isVerifyingEmail ? null : _startEmailVerificationFlow,
                  icon: _isVerifyingEmail
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF34D399)))
                      : const Icon(Icons.verified_rounded, size: 15),
                  label: const Text(
                    'VERIFIKASI EMAIL SEKARANG',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 10.5),
                  ),
                ),
              ),

              const Divider(color: Color(0xFF1E293B), height: 26),

              // 3. KEAMANAN KATA SANDI (OPSIONAL)
              const Row(
                children: [
                  Icon(Icons.lock_rounded, color: Color(0xFFF59E0B), size: 15),
                  SizedBox(width: 6),
                  Text(
                    'KATA SANDI BARU (OPSIONAL)',
                    style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10.5, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Kosongkan kolom sandi jika Anda hanya ingin memperbarui nama atau alamat email.',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 10),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _newPasswordController,
                obscureText: _obscureNewPass,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF060913),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.vpn_key_rounded, color: Color(0xFF64748B), size: 18),
                  suffixIcon: IconButton(
                    icon: Icon(_obscureNewPass ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF64748B), size: 18),
                    onPressed: () => setState(() => _obscureNewPass = !_obscureNewPass),
                  ),
                  hintText: 'Kata Sandi Baru (Min. 6 Karakter)',
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 11.5),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _confirmPasswordController,
                obscureText: _obscureConfirmPass,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF060913),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF64748B), size: 18),
                  suffixIcon: IconButton(
                    icon: Icon(_obscureConfirmPass ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF64748B), size: 18),
                    onPressed: () => setState(() => _obscureConfirmPass = !_obscureConfirmPass),
                  ),
                  hintText: 'Ulangi Kata Sandi Baru',
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 11.5),
                ),
              ),

              const SizedBox(height: 18),

              // TOMBOL UTAMA SIMPAN SEMUA PERUBAHAN
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF38BDF8),
                    foregroundColor: const Color(0xFF060913),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _isSavingAll ? null : _handleSaveAllAccountSettings,
                  icon: _isSavingAll
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : const Icon(Icons.save_rounded, size: 18),
                  label: const Text(
                    'SIMPAN SEMUA PERUBAHAN AKUN',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Tombol Pusat Bantuan & Layanan IPMC (Lapor Bug & Saran)
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.help_center_rounded, color: Color(0xFF38BDF8), size: 20),
            ),
            title: const Text('Pusat Bantuan, Lapor Bug & Saran', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: const Text('Kirim laporan kendala / kritik saran ke projek.msyafiq19@gmail.com', style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5)),
            trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B)),
            onTap: _showHelpCenterDialog,
          ),
        ),

        const SizedBox(height: 24),

        // SATU-SATUNYA TOMBOL KELUAR RESMI DI BAWAH PENGATURAN
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFEF4444),
            side: BorderSide(color: const Color(0xFFEF4444).withValues(alpha: 0.6)),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.05),
          ),
          onPressed: _confirmLogout,
          icon: const Icon(Icons.power_settings_new_rounded, size: 18),
          label: const Text(
            'AKHIRI SESI & KELUAR DARI AKUN',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
          ),
        ),

        const SizedBox(height: 16),
        const Center(
          child: Text(
            'Capital Federation (CFX) • Pasar Modal Resmi Republik Federasi\nArsitektur Basis Data Terlindungi & Mutakhir',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF475569), fontSize: 10, height: 1.4),
          ),
        ),
      ],
    );
  }

  // Kartu Deteksi Update Tunggal
  Widget _buildSingleUpdateCard() {
    final serverVer = _serverVersionData?['version']?.toString() ?? ApiService.currentAppVersion;
    final serverBuild = (_serverVersionData?['buildNumber'] is num)
        ? (_serverVersionData?['buildNumber'] as num).toInt()
        : int.tryParse(_serverVersionData?['buildNumber']?.toString() ?? '') ?? ApiService.currentBuildNumber;

    final bool hasNewer = _compareVersions(serverVer, serverBuild, ApiService.currentAppVersion, ApiService.currentBuildNumber);
    final notes = _serverVersionData?['releaseNotes']?.toString() ??
        'Ticker Saham 4-Huruf Resmi (Tanpa Angka), Perbaikan Nama PT, Efek Emas Chat Sultan 9 Naga & VIP, dan Deteksi Update Otomatis';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0F1E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasNewer ? const Color(0xFFF59E0B) : const Color(0xFF10B981).withValues(alpha: 0.4),
          width: hasNewer ? 1.5 : 1.0,
        ),
        boxShadow: hasNewer
            ? [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                )
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    hasNewer ? Icons.new_releases_rounded : Icons.check_circle_rounded,
                    color: hasNewer ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    hasNewer ? 'PEMBARUAN SISTEM TERSEDIA' : 'STATUS APLIKASI MUTAKHIR',
                    style: TextStyle(
                      color: hasNewer ? const Color(0xFFFDE68A) : const Color(0xFF34D399),
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'v${ApiService.currentAppVersion} (Build ${ApiService.currentBuildNumber})',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            hasNewer
                ? 'Server pusat telah merilis versi v$serverVer (Build $serverBuild). Silakan unduh paket rilis resmi di website bursa.'
                : 'Aplikasi terinstal sudah sinkron dengan versi rilis resmi server Capital Federation.',
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.35),
          ),
          if (hasNewer) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF060913),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Catatan Rilis Pembaruan:', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10.5, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 3),
                  Text(notes, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.3)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                onPressed: () async {
                  HapticFeedback.mediumImpact();
                  final uri = Uri.parse('https://capitalfederation.xie.my.id/api/download/apk');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.download_rounded, size: 18),
                label: Text(
                  '⚡ UNDUH & UPDATE SEKARANG (v$serverVer)',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: const Color(0xFF1E1502),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 4,
                ),
              ),
            ),
          ] else ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 38,
              child: OutlinedButton.icon(
                onPressed: () async {
                  HapticFeedback.lightImpact();
                  final uri = Uri.parse('https://capitalfederation.xie.my.id');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.language_rounded, size: 16),
                label: const Text(
                  'KUNJUNGI WEBSITE RESMI BURSA',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF38BDF8),
                  side: const BorderSide(color: Color(0xFF1E293B)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 2: STATUS VIP & PRESTISE 9 NAGA
  // ===========================================================================
  Widget _buildVipAndPrestigeTab(UserModel user, bool is9Naga, bool isVip) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        // Kartu Hak Istimewa 9 Naga
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF2B1F06), Color(0xFF141109), Color(0xFF0F172A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.6), width: 1.3),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Text('🐉', style: TextStyle(fontSize: 20)),
                  SizedBox(width: 8),
                  Text(
                    'Hak Istimewa Sultan 9 Naga',
                    style: TextStyle(color: Color(0xFFFDE68A), fontWeight: FontWeight.w900, fontSize: 14),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Top 9 Konglomerat dengan Nilai Kekayaan Bersih tertinggi di Republik Federasi memiliki pengaruh dominan terhadap pasar modal.',
                style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.35),
              ),
              const SizedBox(height: 12),
              _buildPerkRow(Icons.stars_rounded, 'Balon Chat Emas Berpendar di Obrolan Global Bursa', const Color(0xFFF59E0B)),
              _buildPerkRow(Icons.gavel_rounded, 'Prioritas Hak Suara dalam Lelang Aset Sitaan & Tender Negara', const Color(0xFFF59E0B)),
              _buildPerkRow(Icons.trending_up_rounded, 'Pengaruh Terbesar dalam Valuasi Indeks Gabungan CFX', const Color(0xFFF59E0B)),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Kartu Keanggotaan VIP Prestise
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isVip ? const Color(0xFFA855F7) : const Color(0xFF1E293B),
              width: isVip ? 1.4 : 1.0,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.diamond_rounded, color: Color(0xFFA855F7), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Lisensi VIP Eksklusif',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: isVip
                          ? const LinearGradient(colors: [Color(0xFFA855F7), Color(0xFFEC4899)])
                          : null,
                      color: isVip ? null : const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isVip ? '💎 VIP AKTIF' : 'REGULER',
                      style: TextStyle(
                        color: isVip ? Colors.white : const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w900,
                        fontSize: 9.5,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Tingkatkan reputasi akun dan nikmati pembebasan biaya administrasi transaksi bursa efek seumur hidup.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.35),
              ),
              const SizedBox(height: 14),
              _buildPerkRow(Icons.discount_rounded, 'Bebas Bea Meterai & Komisi Broker Saham 0%', const Color(0xFFA855F7)),
              _buildPerkRow(Icons.mark_chat_read_rounded, 'Badge Ungu Berlian di Komunitas Bursa', const Color(0xFFA855F7)),
              _buildPerkRow(Icons.analytics_rounded, 'Akses Penuh Laporan Arus Kas Konsolidasi Holding', const Color(0xFFA855F7)),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF060913),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFF38BDF8), size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        isVip
                            ? 'Akun Anda telah diakui resmi sebagai VIP Konglomerat oleh Otoritas Pasar Modal IPMC.'
                            : 'Status keanggotaan VIP dan peningkatan Credit Tier disahkan langsung oleh Administrator Otoritas IPMC.',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPerkRow(IconData icon, String text, Color iconColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: iconColor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5)),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 3: HOLDING PT & REGULASI IPMC
  // ===========================================================================
  Widget _buildHoldingAndRegulationTab(UserModel user) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        // Kartu Holding PT Induk
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.business_rounded, color: Color(0xFF38BDF8), size: 18),
                  SizedBox(width: 8),
                  Text('Holding Korporasi Perseroan Terbatas', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 12),
              _buildHoldingInfoRow('Status Badan Hukum:', user.hasPt ? 'Perseroan Terbatas (PT) Terdaftar' : 'Belum Berdiri', const Color(0xFF38BDF8)),
              _buildHoldingInfoRow('Entitas Induk PT:', user.hasPt ? 'PT. ${user.ptName}' : 'Belum Ada', Colors.white),
              _buildHoldingInfoRow('Kode Saham Bursa:', user.hasPt ? (user.ptSymbol.isNotEmpty ? user.ptSymbol : '-') : '-', const Color(0xFFF59E0B)),
              _buildHoldingInfoRow('Kas Holding PT:', CurrencyFormatter.formatFull(user.companyBalanceIb), const Color(0xFF34D399)),
              _buildHoldingInfoRow('Valuasi Modal Disetor:', CurrencyFormatter.formatFull(user.companyBalanceIb * 1.5), const Color(0xFFFDE68A)),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Kartu Konstitusi & Kepastian Hukum
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.account_balance_rounded, color: Color(0xFFF59E0B), size: 18),
                  SizedBox(width: 8),
                  Text('Kepastian Hukum & Konstitusi Notaris', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Semua aktivitas korporasi, pembagian dividen, penerbitan emisi IPO, pengalihan kendali akuisisi, dan putusan pailit diatur oleh Undang-Undang Otoritas Pasar Modal IPMC Republik Federasi.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFF59E0B),
                    side: const BorderSide(color: Color(0xFFF59E0B)),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const GameConstitutionScreen()),
                    );
                  },
                  icon: const Icon(Icons.menu_book_rounded, size: 16),
                  label: const Text('BACA LEMBARAN NEGARA & REGULASI', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11.5)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHoldingInfoRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
          Text(value, style: TextStyle(color: valueColor, fontSize: 11.5, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
