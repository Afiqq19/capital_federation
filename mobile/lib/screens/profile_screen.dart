import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';
import 'game_constitution_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late TextEditingController _usernameController;
  late TextEditingController _emailController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    final user = context.read<GameProvider>().user;
    _usernameController = TextEditingController(text: user?.username ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
  }

  @override
  void dispose() {
    _tabController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSaveProfile() async {
    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    if (username.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Username tidak boleh kosong!'),
          backgroundColor: Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    final provider = context.read<GameProvider>();
    final res = await provider.updateUserProfile(username: username, email: email);
    setState(() => _isSaving = false);

    if (mounted) {
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    res['message'] ?? 'Profil akun eksekutif berhasil diperbarui!',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF065F46),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? res['message'] ?? 'Gagal memperbarui profil'),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFEF4444), width: 1.5),
        ),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 22),
            SizedBox(width: 10),
            Text(
              'Konfirmasi Keluar',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
            ),
          ],
        ),
        content: const Text(
          'Apakah Anda yakin ingin keluar dari sesi permainan? Pastikan email Anda sudah tersimpan agar seluruh aset kepemilikan saham dan kas tetap aman.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('BATAL', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              context.read<GameProvider>().logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('YA, KELUAR', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
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
        body: Center(child: CircularProgressIndicator(color: Color(0xFF10B981))),
      );
    }

    final isVip = user.isVip;
    final hasEmail = user.email.isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0F1D),
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 16),
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ruang Eksekutif Konglomerat',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
            ),
            Text(
              'Status: ${isVip ? "👑 VIP Sultan Investor" : "🔰 Konglomerat Reguler"} • CFX Suite',
              style: TextStyle(
                color: isVip ? const Color(0xFFFBBF24) : const Color(0xFF94A3B8),
                fontSize: 10,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Sinkronisasi Data Akun',
            icon: const Icon(Icons.sync_rounded, color: Color(0xFF38BDF8), size: 20),
            onPressed: () async {
              await provider.loadInitialData();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Data profil & kas berhasil disinkronkan dengan server bursa!'),
                    backgroundColor: Color(0xFF0284C7),
                    duration: Duration(seconds: 1),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
          ),
          IconButton(
            tooltip: 'Keluar Akun',
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 20),
            onPressed: () => _confirmLogout(context),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // ==========================================
          // LUXURY HERO PROFILE CARD
          // ==========================================
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isVip
                    ? [const Color(0xFF1A1608), const Color(0xFF0B0E17)]
                    : [const Color(0xFF0D1527), const Color(0xFF060913)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              border: Border(
                bottom: BorderSide(
                  color: isVip ? const Color(0xFFF59E0B).withValues(alpha: 0.3) : const Color(0xFF1E293B),
                ),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    // Avatar with Dual Ring Luxury Border
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 62,
                          height: 62,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              colors: isVip
                                  ? [const Color(0xFFF59E0B), const Color(0xFFD97706), const Color(0xFFFDE68A)]
                                  : [const Color(0xFF0284C7), const Color(0xFF10B981)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: (isVip ? const Color(0xFFF59E0B) : const Color(0xFF0284C7)).withValues(alpha: 0.35),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.all(3),
                          child: Container(
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF0F172A),
                            ),
                            child: Center(
                              child: Text(
                                (user.username.isNotEmpty ? user.username[0] : 'K').toUpperCase(),
                                style: TextStyle(
                                  color: isVip ? const Color(0xFFFDE68A) : Colors.white,
                                  fontSize: 26,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                        if (isVip)
                          Positioned(
                            top: -6,
                            right: -4,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Color(0xFF0F172A),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.workspace_premium_rounded, color: Color(0xFFFBBF24), size: 18),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 14),

                    // User Identity & Badges
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  user.username,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.3,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              // VIP or Standard Badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: isVip
                                        ? [const Color(0xFFF59E0B), const Color(0xFFB45309)]
                                        : [const Color(0xFF0284C7), const Color(0xFF0369A1)],
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: [
                                    BoxShadow(
                                      color: (isVip ? const Color(0xFFF59E0B) : const Color(0xFF0284C7)).withValues(alpha: 0.3),
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      isVip ? Icons.stars_rounded : Icons.shield_rounded,
                                      color: Colors.white,
                                      size: 11,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      isVip ? 'VIP KONGLOMERAT' : 'STANDAR',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          // Email & Security Indicator
                          Row(
                            children: [
                              Icon(
                                hasEmail ? Icons.verified_user_rounded : Icons.warning_amber_rounded,
                                color: hasEmail ? const Color(0xFF34D399) : const Color(0xFFF59E0B),
                                size: 13,
                              ),
                              const SizedBox(width: 5),
                              Expanded(
                                child: Text(
                                  hasEmail ? user.email : 'Email belum dikaitkan (Wajib diisi)',
                                  style: TextStyle(
                                    color: hasEmail ? const Color(0xFF94A3B8) : const Color(0xFFF59E0B),
                                    fontSize: 11,
                                    fontWeight: hasEmail ? FontWeight.normal : FontWeight.bold,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            user.hasPt ? '🏢 ${user.ptName}' : '🏢 Investor Individu (Belum Berdiri PT)',
                            style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Financial Quick Asset Row (3 Pillars of Wealth)
                Row(
                  children: [
                    Expanded(
                      child: _buildWealthPillar(
                        label: 'KAS PRIBADI',
                        value: CurrencyFormatter.formatCompact(user.balanceIb),
                        color: const Color(0xFF38BDF8),
                        icon: Icons.account_balance_wallet_rounded,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildWealthPillar(
                        label: 'BRANKAS PT',
                        value: CurrencyFormatter.formatCompact(user.companyBalanceIb),
                        color: const Color(0xFF34D399),
                        icon: Icons.business_rounded,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildWealthPillar(
                        label: 'SKOR KREDIT',
                        value: '${user.creditScore} • ${user.effectiveCreditTier}',
                        color: const Color(0xFFFBBF24),
                        icon: Icons.speed_rounded,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ==========================================
          // MODERN CAPSULE SEGMENTED TAB BAR
          // ==========================================
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            color: const Color(0xFF0A0F1D),
            child: Container(
              height: 40,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: TabBar(
                controller: _tabController,
                indicatorSize: TabBarIndicatorSize.tab,
                indicator: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0284C7), Color(0xFF0F766E)],
                  ),
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.35),
                      blurRadius: 6,
                    ),
                  ],
                ),
                labelColor: Colors.white,
                unselectedLabelColor: const Color(0xFF94A3B8),
                labelStyle: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                unselectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                tabs: const [
                  Tab(text: 'KREDENSIAL'),
                  Tab(text: 'STATUS VIP'),
                  Tab(text: 'HOLDING PT'),
                  Tab(text: 'REGULASI'),
                ],
              ),
            ),
          ),

          // ==========================================
          // TAB VIEWS
          // ==========================================
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildCredentialsTab(context, user),
                _buildVipVsStandardTab(context, user),
                _buildHoldingTab(context, user, provider),
                _buildRulesAndAboutTab(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWealthPillar({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 12),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(color: color.withValues(alpha: 0.8), fontSize: 8, fontWeight: FontWeight.w900),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w900),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------
  // TAB 1: KREDENSIAL & KEAMANAN AKUN
  // ----------------------------------------------------
  Widget _buildCredentialsTab(BuildContext context, UserModel user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Security Shield Alert Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF0C243B),
                  const Color(0xFF0F172A),
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.35)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.shield_rounded, color: Color(0xFF38BDF8), size: 22),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pencadangan Akun Konglomerat',
                        style: TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w900),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Pastikan alamat email Anda sudah diisi dengan benar. Email ini menjadi kunci pemulihan kepemilikan saham, anak PT, dan riwayat mutasi kas brankas Anda jika berpindah perangkat atau saat server bermigrasi.',
                        style: TextStyle(color: Color(0xFFBAE6FD), fontSize: 10.5, height: 1.4),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Form Edit Username
          const Text(
            'Nama Pengguna (Username Konglomerat)',
            style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _usernameController,
            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.badge_rounded, color: Color(0xFF38BDF8), size: 18),
              hintText: 'Masukkan nama pengguna...',
              hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 11),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            ),
          ),
          const SizedBox(height: 16),

          // Form Edit Email
          const Text(
            'Alamat Email Pemulihan & Notifikasi Resmi',
            style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.alternate_email_rounded, color: Color(0xFF10B981), size: 18),
              hintText: 'contoh: nama.konglomerat@federation.id',
              hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 11),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            ),
          ),
          const SizedBox(height: 18),

          // Tombol Simpan Perubahan
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _handleSaveProfile,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 4,
              ),
              icon: _isSaving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.save_rounded, size: 18),
              label: Text(
                _isSaving ? 'MENYIMPAN DATA...' : 'SIMPAN PERUBAHAN AKUN',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12.5, letterSpacing: 0.5),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Detail Kredensial Sistem
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.badge_rounded, color: Color(0xFF94A3B8), size: 16),
                    SizedBox(width: 8),
                    Text(
                      'Identitas Digital Bursa CFX',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildInfoRow('ID Pengguna:', user.id, const Color(0xFF64748B)),
                const Divider(color: Color(0xFF1E293B), height: 16),
                _buildInfoRow('Hak Akses (Role):', user.effectiveRole, user.isVip ? const Color(0xFFFBBF24) : const Color(0xFF38BDF8)),
                const Divider(color: Color(0xFF1E293B), height: 16),
                _buildInfoRow('Tingkat Kredit (Tier):', user.effectiveCreditTier, const Color(0xFF34D399)),
                const Divider(color: Color(0xFF1E293B), height: 16),
                _buildInfoRow('Kepatuhan Pajak & Notaris:', 'Terdaftar Legal di CFX', const Color(0xFF34D399)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------
  // TAB 2: PENJELASAN VIP VS STANDAR (USER CLARIFICATION)
  // ----------------------------------------------------
  Widget _buildVipVsStandardTab(BuildContext context, UserModel user) {
    final isVip = user.isVip;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Status Saat Ini
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isVip
                    ? [const Color(0xFF78350F), const Color(0xFF1E1405)]
                    : [const Color(0xFF0F2642), const Color(0xFF0B1220)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isVip ? const Color(0xFFF59E0B) : const Color(0xFF38BDF8),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: (isVip ? const Color(0xFFF59E0B) : const Color(0xFF38BDF8)).withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isVip ? Icons.workspace_premium_rounded : Icons.shield_rounded,
                    color: isVip ? const Color(0xFFFBBF24) : const Color(0xFF38BDF8),
                    size: 28,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isVip ? 'AKUN ANDA: VIP SULTAN KONGLOMERAT' : 'AKUN ANDA: KONGLOMERAT STANDAR',
                        style: TextStyle(
                          color: isVip ? const Color(0xFFFDE68A) : Colors.white,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        isVip
                            ? 'Anda menikmati fasilitas prioritas tertinggi bursa, diskon biaya transaksi, dan keunggulan lelang mega-proyek.'
                            : 'Tingkatkan status akun melalui Web Admin Console untuk membuka hak istimewa eksklusif VIP.',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, height: 1.35),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          const Text(
            'Perbandingan Hak Istimewa & Fasilitas:',
            style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),

          // Matrix 1: Biaya Transaksi & Broker
          _buildPrivilegeCard(
            title: '1. Biaya Broker & Transaksi Bursa',
            icon: Icons.percent_rounded,
            color: const Color(0xFF38BDF8),
            standardText: 'Standar: 0.25% - 0.50% per transaksi beli/jual saham sekunder.',
            vipText: 'VIP: Diskon 80% (Hanya 0.05%), eksekusi orderbook instan tanpa hambatan antrean.',
          ),
          const SizedBox(height: 10),

          // Matrix 2: Lelang Tender Pengadaan Mega-Proyek
          _buildPrivilegeCard(
            title: '2. Partisipasi Mega-Tender Negara',
            icon: Icons.gavel_rounded,
            color: const Color(0xFF10B981),
            standardText: 'Standar: Membutuhkan skor fundamental ketat dan kurasi bertahap.',
            vipText: 'VIP: Otomatis diundang ke Lelang Tertutup Strategis Nasional & evaluasi skor proposal lebih tinggi.',
          ),
          const SizedBox(height: 10),

          // Matrix 3: Plafon Pinjaman Likuiditas Bank Sentral
          _buildPrivilegeCard(
            title: '3. Fasilitas Pembiayaan Bank Sentral',
            icon: Icons.account_balance_rounded,
            color: const Color(0xFFFBBF24),
            standardText: 'Standar: Dibatasi sesuai credit tier normal (Maks Rp 10 Miliar).',
            vipText: 'VIP: Plafon likuiditas sultan hingga 10x lipat dan suku bunga restrukturisasi istimewa.',
          ),
          const SizedBox(height: 10),

          // Matrix 4: Tampilan Prestise & Status Publik
          _buildPrivilegeCard(
            title: '4. Lencana Prestise & Tampilan Publik',
            icon: Icons.military_tech_rounded,
            color: const Color(0xFFA855F7),
            standardText: 'Standar: Lencana biru biasa pada daftar konglomerasi publik.',
            vipText: 'VIP: Mahkota Emas bercahaya [VIP] di Web Admin & APK, serta border kartu emas eksklusif.',
          ),
          const SizedBox(height: 16),

          // Cara Aktivasi VIP
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline_rounded, color: Color(0xFF38BDF8), size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Catatan Otoritas: Administrator dapat mengubah status pemain menjadi VIP atau menaikkan Credit Tier (Standard/Bronze/Silver/Gold/Platinum) melalui menu "Pemain" di Web Admin Console.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, height: 1.35),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrivilegeCard({
    required String title,
    required IconData icon,
    required Color color,
    required String standardText,
    required String vipText,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF060913),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🔰 ', style: TextStyle(fontSize: 11)),
                Expanded(
                  child: Text(
                    standardText,
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF1E1B0E),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('👑 ', style: TextStyle(fontSize: 11)),
                Expanded(
                  child: Text(
                    vipText,
                    style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 10.5, height: 1.3, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------
  // TAB 3: HOLDING & ANAK PERSEROAN
  // ----------------------------------------------------
  Widget _buildHoldingTab(BuildContext context, UserModel user, GameProvider provider) {
    final conglomerate = provider.conglomerate;
    double totalHoldingsCash = user.balanceIb + user.companyBalanceIb;
    for (final c in conglomerate) {
      if (c['id'] != 'primary' && c['companyBalance'] != null) {
        totalHoldingsCash += ((c['companyBalance'] as num?)?.toDouble() ?? 0.0);
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF070B14)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
            ),
            child: Column(
              children: [
                _buildInfoRow('Konglomerat Utama:', user.username, Colors.white),
                const Divider(color: Color(0xFF1E293B), height: 16),
                _buildInfoRow('PT Induk Perseroan:', user.hasPt ? user.ptName : 'Belum Berdiri', const Color(0xFF38BDF8)),
                const Divider(color: Color(0xFF1E293B), height: 16),
                _buildInfoRow('Sektor Industri Utama:', user.sector.isNotEmpty ? user.sector : 'Keuangan & Investasi', const Color(0xFFFBBF24)),
                const Divider(color: Color(0xFF1E293B), height: 16),
                _buildInfoRow('Jumlah Entitas Holding:', '${conglomerate.length} Perseroan', const Color(0xFF34D399)),
                const Divider(color: Color(0xFF1E293B), height: 16),
                _buildInfoRow('Total Likuiditas Holding:', CurrencyFormatter.formatFull(totalHoldingsCash), const Color(0xFF34D399)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0C243B),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
            ),
            child: const Row(
              children: [
                Icon(Icons.public_rounded, color: Color(0xFF38BDF8), size: 22),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Fundamental finansial holding dan solvabilitas perseroan dievaluasi secara otomatis oleh Komite Pengadaan Proyek Strategis Nasional.',
                    style: TextStyle(color: Color(0xFFBAE6FD), fontSize: 10.5, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------
  // TAB 4: REGULASI & TENTANG SISTEM
  // ----------------------------------------------------
  Widget _buildRulesAndAboutTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Konstitusi Pasar Modal & Perlindungan Investor:',
            style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          _buildRuleCard(
            icon: Icons.gavel_rounded,
            title: 'Undang-Undang Anti-Monopoli',
            desc: 'Kepemilikan saham bursa di atas 50% memicu pengawasan KPPU. Dilarang keras melakukan kartel harga dan manipulasi pasar sekunder.',
          ),
          const SizedBox(height: 10),
          _buildRuleCard(
            icon: Icons.account_balance_rounded,
            title: 'Ketentuan Fasilitas Bank Sentral',
            desc: 'Kredit macet lebih dari 3 siklus akan berakibat pada pembekuan rekening perseroan oleh Kurator Pengadilan Niaga.',
          ),
          const SizedBox(height: 10),
          _buildRuleCard(
            icon: Icons.shield_rounded,
            title: 'Sita Jaminan & Larangan Tender',
            desc: 'Perseroan yang dalam status SITAAN Negara dilarang keras berpartisipasi dalam lelang mega-proyek pemerintah hingga kewajiban utang diselesaikan.',
          ),
          const SizedBox(height: 14),

          SizedBox(
            width: double.infinity,
            height: 44,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const GameConstitutionScreen()),
                );
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF38BDF8),
                side: const BorderSide(color: Color(0xFF38BDF8)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.menu_book_rounded, size: 16),
              label: const Text('BACA BUKU KONSTITUSI LENGKAP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
            ),
          ),
          const SizedBox(height: 24),

          // About System Specs
          Center(
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFF59E0B), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.asset(
                      'assets/logo.png',
                      fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => Container(
                        color: const Color(0xFF0F172A),
                        child: const Icon(Icons.corporate_fare_rounded, color: Color(0xFFFBBF24), size: 36),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'CAPITAL FEDERASI (CFX)',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                  ),
                ),
                const Text(
                  'Bursa Saham Realistis & Simulasi Konglomerasi Finansial',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              children: [
                _buildInfoRow('Versi Mobile APK:', 'v1.4.0-CFX Production (Build 4)', const Color(0xFF34D399)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Versi Web Admin:', 'v1.4.0 Sovereign Launch', const Color(0xFF38BDF8)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Simulasi Pasar Modal:', 'Realistic Engine (107 Emiten)', const Color(0xFFFBBF24)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Status Sinkronisasi:', 'Online • Multi-thread SQLite', const Color(0xFF34D399)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Logout Button
          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              onPressed: () => _confirmLogout(context),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFEF4444),
                side: const BorderSide(color: Color(0xFFEF4444)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text('KELUAR DARI SESI PERMAINAN', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRuleCard({required IconData icon, required String title, required String desc}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF38BDF8), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 3),
                Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, height: 1.35)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, Color valColor) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 4,
          child: Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 5,
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(color: valColor, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }
}
