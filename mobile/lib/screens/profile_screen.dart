import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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

  // Controllers untuk Pengaturan Akun
  late final TextEditingController _usernameController;
  late final TextEditingController _emailController;
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _obscureNewPass = true;
  bool _obscureConfirmPass = true;
  bool _isSavingUsername = false;
  bool _isSendingEmailVerify = false;
  bool _isUpdatingPassword = false;

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
    setState(() {
      _isCheckingUpdate = true;
    });

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
      setState(() {
        _isCheckingUpdate = false;
      });
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

  Future<void> _handleSaveUsername() async {
    final newName = _usernameController.text.trim();
    final currentEmail = _emailController.text.trim();
    if (newName.isEmpty) {
      _showToast('Username tidak boleh kosong!', isError: true);
      return;
    }
    setState(() => _isSavingUsername = true);
    final provider = context.read<GameProvider>();
    final res = await provider.updateUserProfile(username: newName, email: currentEmail);
    setState(() => _isSavingUsername = false);

    if (res['success'] == true) {
      _showToast('✅ Username berhasil diperbarui menjadi "$newName"');
    } else {
      _showToast(res['error']?.toString() ?? 'Gagal memperbarui username', isError: true);
    }
  }

  Future<void> _handleVerifyEmail() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      _showToast('Silakan masukkan alamat email yang valid!', isError: true);
      return;
    }
    setState(() => _isSendingEmailVerify = true);
    final provider = context.read<GameProvider>();
    final res = await provider.verifyUserEmail(email);
    setState(() => _isSendingEmailVerify = false);

    if (res['success'] == true) {
      _showToast(res['message']?.toString() ?? '✅ Verifikasi email berhasil diverifikasi!');
    } else {
      _showToast(res['error']?.toString() ?? 'Gagal memverifikasi email.', isError: true);
    }
  }

  Future<void> _handleUpdatePassword() async {
    final pass = _newPasswordController.text;
    final confirm = _confirmPasswordController.text;
    final currentName = _usernameController.text.trim();
    final currentEmail = _emailController.text.trim();

    if (pass.isEmpty) {
      _showToast('Kata sandi baru tidak boleh kosong!', isError: true);
      return;
    }
    if (pass.length < 6) {
      _showToast('Kata sandi baru minimal 6 karakter!', isError: true);
      return;
    }
    if (pass != confirm) {
      _showToast('Konfirmasi kata sandi tidak cocok!', isError: true);
      return;
    }

    setState(() => _isUpdatingPassword = true);
    final provider = context.read<GameProvider>();
    final res = await provider.updateUserProfile(
      username: currentName,
      email: currentEmail,
      newPassword: pass,
    );
    setState(() => _isUpdatingPassword = false);

    if (res['success'] == true) {
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      _showToast('🔐 Kata sandi akun berhasil diperbarui secara aman.');
    } else {
      _showToast(res['error']?.toString() ?? 'Gagal memperbarui kata sandi', isError: true);
    }
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

  void _showHelpCenterDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
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
                      'Konsultasi Regulasi Pasar Modal & Sengketa',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 18),
            _buildHelpItem(
              Icons.gavel_rounded,
              'Mahkamah Arbitrase Niaga (PNAF)',
              'Penyelesaian sengketa transaksi efek, wanprestasi akuisisi, dan kepailitan korporasi.',
            ),
            const SizedBox(height: 12),
            _buildHelpItem(
              Icons.account_balance_rounded,
              'Otoritas Pengawasan Bursa CFX',
              'Pelaporan manipulasi harga, permohonan pembukaan suspensi saham, & pendaftaran E-IPO.',
            ),
            const SizedBox(height: 12),
            _buildHelpItem(
              Icons.verified_user_rounded,
              'Jaminan Kustodian Sentral',
              'Perlindungan portofolio saham, dividen emiten Tbk, dan sertifikat notaris digital.',
            ),
            const SizedBox(height: 20),
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
        Icon(icon, color: const Color(0xFFF59E0B), size: 18),
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
                _buildSettingsAndAccountTab(user),
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
  // TAB 1: PENGATURAN & AKUN (TIDAK ADA KONTEN DOUBLE, 1 LOGOUT RESMI DI BAWAH)
  // ===========================================================================
  Widget _buildSettingsAndAccountTab(UserModel user) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
      children: [
        // Kartu Deteksi Pembaruan Versi Server (Tunggal & Tidak Dobel)
        _buildSingleUpdateCard(),

        const SizedBox(height: 14),

        // Bagian Ubah Username
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
                  Icon(Icons.badge_rounded, color: Color(0xFF38BDF8), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Identitas Konglomerat (Username)',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Nama ini terdaftar resmi di Papan Peringkat Konglomerat 9 Naga & obrolan bursa global.',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _usernameController,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF060913),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.person_rounded, color: Color(0xFF64748B), size: 18),
                  hintText: 'Masukkan nama konglomerat baru',
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF38BDF8),
                    foregroundColor: const Color(0xFF060913),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _isSavingUsername ? null : _handleSaveUsername,
                  icon: _isSavingUsername
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : const Icon(Icons.save_rounded, size: 16),
                  label: const Text('SIMPAN NAMA', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Bagian Email & Verifikasi
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.mark_email_read_rounded, color: Color(0xFF10B981), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Email & Pemulihan Aset',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      user.email.isNotEmpty ? 'TERDAFTAR' : 'BELUM DIISI',
                      style: const TextStyle(color: Color(0xFF34D399), fontSize: 8.5, fontWeight: FontWeight.w900),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Digunakan untuk pemulihan hak kepemilikan perseroan, obligasi, dan aset kas jika berpindah perangkat.',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailController,
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF060913),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF64748B), size: 18),
                  hintText: 'nama@domain.com',
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF34D399),
                    side: const BorderSide(color: Color(0xFF059669)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _isSendingEmailVerify ? null : _handleVerifyEmail,
                  icon: _isSendingEmailVerify
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF34D399)))
                      : const Icon(Icons.verified_rounded, size: 16),
                  label: const Text('VERIFIKASI EMAIL SEKARANG', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Bagian Ganti Password Akun
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
                  Icon(Icons.lock_reset_rounded, color: Color(0xFFF59E0B), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Perbarui Kata Sandi Otoritas',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Amankan hak kendali konglomerasi dengan kata sandi kuat minimal 6 karakter kombinasi.',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
              ),
              const SizedBox(height: 12),
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
                  hintText: 'Kata Sandi Baru',
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
              ),
              const SizedBox(height: 10),
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
                  hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _isUpdatingPassword ? null : _handleUpdatePassword,
                  icon: _isUpdatingPassword
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : const Icon(Icons.lock_outline_rounded, size: 16),
                  label: const Text('PERBARUI KATA SANDI', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11.5)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Tombol Pusat Bantuan & Layanan IPMC
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
            title: const Text('Pusat Bantuan & Regulasi IPMC', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: const Text('Konsultasi arbitrase, bursa efek, dan hukum perseroan', style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5)),
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
