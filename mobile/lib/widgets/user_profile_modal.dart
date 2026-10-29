import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user.dart';
import '../providers/game_provider.dart';
import '../utils/formatters.dart';
import '../screens/game_constitution_screen.dart';

void showUserProfileModal(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => const _UserProfileSheet(),
  );
}

class _UserProfileSheet extends StatefulWidget {
  const _UserProfileSheet();

  @override
  State<_UserProfileSheet> createState() => _UserProfileSheetState();
}

class _UserProfileSheetState extends State<_UserProfileSheet> with SingleTickerProviderStateMixin {
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
        const SnackBar(content: Text('Username tidak boleh kosong!'), backgroundColor: Colors.red),
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
                const Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(res['message'] ?? 'Profil akun berhasil diperbarui!')),
              ],
            ),
            backgroundColor: const Color(0xFF065F46),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? res['message'] ?? 'Gagal memperbarui profil'),
            backgroundColor: Colors.red,
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
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFEF4444), width: 1.5),
        ),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 22),
            SizedBox(width: 8),
            Text('Keluar Akun', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Apakah Anda yakin ingin keluar dari sesi permainan? Pastikan email Anda sudah tersimpan agar akun tetap aman.',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('BATAL', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx); // Close dialog
              Navigator.pop(context); // Close profile sheet
              context.read<GameProvider>().logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('YA, KELUAR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final user = provider.user;
    if (user == null) return const SizedBox.shrink();

    final String initial = user.username.isNotEmpty ? user.username[0].toUpperCase() : 'U';

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Color(0xFF0B132B),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF334155),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // User Avatar Hero Banner
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0284C7), Color(0xFF0D9488)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF38BDF8), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      initial,
                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
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
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified_rounded, color: Color(0xFF34D399), size: 10),
                                SizedBox(width: 3),
                                Text(
                                  'AKTIF',
                                  style: TextStyle(color: Color(0xFF34D399), fontSize: 8.5, fontWeight: FontWeight.w900),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.email.isNotEmpty ? user.email : 'Email belum dikaitkan',
                        style: TextStyle(
                          color: user.email.isNotEmpty ? const Color(0xFF94A3B8) : const Color(0xFFF59E0B),
                          fontSize: 11,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF94A3B8)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Tabs
          Container(
            height: 40,
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF070B14),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.white,
              unselectedLabelColor: const Color(0xFF94A3B8),
              labelStyle: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
              tabs: const [
                Tab(text: 'PROFIL'),
                Tab(text: 'PUBLIK'),
                Tab(text: 'ATURAN'),
                Tab(text: 'TENTANG'),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Tab Contents
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildProfileTab(context, user),
                _buildPublicTab(context, user, provider),
                _buildRulesTab(context),
                _buildAboutTab(context),
              ],
            ),
          ),

          // Logout Action Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF070B14),
              border: Border(top: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                onPressed: () => _confirmLogout(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.15),
                  foregroundColor: const Color(0xFFEF4444),
                  elevation: 0,
                  side: BorderSide(color: const Color(0xFFEF4444).withValues(alpha: 0.5)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text('KELUAR DARI AKUN', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- TAB 1: PROFIL & KEAMANAN AKUN ---
  Widget _buildProfileTab(BuildContext context, UserModel user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Security Alert Banner
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: user.email.isNotEmpty
                  ? const Color(0xFF10B981).withValues(alpha: 0.1)
                  : const Color(0xFFF59E0B).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: user.email.isNotEmpty
                    ? const Color(0xFF10B981).withValues(alpha: 0.4)
                    : const Color(0xFFF59E0B).withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  user.email.isNotEmpty ? Icons.shield_rounded : Icons.warning_amber_rounded,
                  color: user.email.isNotEmpty ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.email.isNotEmpty ? 'Akun Dilindungi & Terdaftar' : 'Penting: Kaitkan Email Anda',
                        style: TextStyle(
                          color: user.email.isNotEmpty ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.email.isNotEmpty
                            ? 'Email Anda tersimpan aman dengan enkripsi SHA-256. Akun Anda dapat dipulihkan kapan saja.'
                            : 'Masukkan email aktif Anda di bawah ini agar progres dan seluruh aset konglomerasi tidak hilang saat migrasi server hosting!',
                        style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, height: 1.3),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Edit Username Input
          const Text('Username Pemain:', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          TextField(
            controller: _usernameController,
            style: const TextStyle(color: Colors.white, fontSize: 12),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.person_outline_rounded, color: Color(0xFF38BDF8), size: 18),
              filled: true,
              fillColor: const Color(0xFF070B14),
              hintText: 'Masukkan nama pengguna...',
              hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 12),

          // Edit Email Input
          const Text('Alamat Email Pemulihan:', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: Colors.white, fontSize: 12),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF38BDF8), size: 18),
              filled: true,
              fillColor: const Color(0xFF070B14),
              hintText: 'contoh: tycoon@federation.id',
              hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 14),

          // Save Profile Button
          SizedBox(
            width: double.infinity,
            height: 40,
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _handleSaveProfile,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: _isSaving
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save_rounded, size: 16),
              label: Text(_isSaving ? 'Menyimpan...' : 'SIMPAN PERUBAHAN AKUN', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11.5)),
            ),
          ),
          const SizedBox(height: 16),

          // Finansial Ringkasan
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF070B14),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Kas Tabungan Pribadi:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    Text(
                      CurrencyFormatter.formatFull(user.balanceIb),
                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFF1E293B), height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Skor Kredit Federasi:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    Text(
                      '${user.creditScore} Poin (Prima)',
                      style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11.5, fontWeight: FontWeight.bold),
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

  // --- TAB 2: IDENTITAS PUBLIK & KONGLOMERASI ---
  Widget _buildPublicTab(BuildContext context, UserModel user, GameProvider provider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF070B14),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              children: [
                _buildInfoRow('Nama Holding:', user.hasPt ? 'PT ${user.ptName}' : 'Belum Memiliki PT', Colors.white),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Sektor Industri Utama:', user.sector.isNotEmpty ? user.sector : 'General / Pemula', const Color(0xFF38BDF8)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Status Korporat:', user.isIpo ? 'Tbk. (Go Public Bursa CFX)' : 'Perseroan Tertutup', const Color(0xFF34D399)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Tingkat Perseroan (Level):', 'Level ${user.ptLevel}', const Color(0xFFFBBF24)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Tingkat Riset & R&D:', 'Level ${user.rdLevel}', const Color(0xFF38BDF8)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Total Anak PT Terdaftar:', '${provider.conglomerate.length} Entitas', Colors.white),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF0C243B),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
            ),
            child: const Row(
              children: [
                Icon(Icons.public_rounded, color: Color(0xFF38BDF8), size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Identitas publik dan fundamental perseroan digunakan oleh Panitia Pengadaan Negara untuk evaluasi kelayakan tender proyek nasional.',
                    style: TextStyle(color: Color(0xFFBAE6FD), fontSize: 10, height: 1.3),
                  ),
                ),
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
          child: Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 5,
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(color: valColor, fontSize: 10.5, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  // --- TAB 3: KETENTUAN & ATURAN GAME ---
  Widget _buildRulesTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Konstitusi & Regulasi Pasar Modal:', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          _buildRuleCard(
            icon: Icons.gavel_rounded,
            title: 'Undang-Undang Anti-Monopoli',
            desc: 'Kepemilikan saham di atas 50% memicu pengawasan KPPU. Dilarang melakukan kartel harga dan manipulasi pasar sekunder.',
          ),
          const SizedBox(height: 8),
          _buildRuleCard(
            icon: Icons.account_balance_rounded,
            title: 'Ketentuan Fasilitas Bank Sentral',
            desc: 'Kredit macet lebih dari 3 siklus akan berakibat pada penyitaan aset perseroan oleh Kurator Pengadilan Niaga Konoha.',
          ),
          const SizedBox(height: 8),
          _buildRuleCard(
            icon: Icons.shield_rounded,
            title: 'Sita Jaminan & Larangan Tender',
            desc: 'Perseroan yang dalam status SITAAN Negara dilarang keras berpartisipasi dalam lelang mega-proyek pemerintah hingga kewajiban utang diselesaikan.',
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 38,
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
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.menu_book_rounded, size: 16),
              label: const Text('BACA BUKU KONSTITUSI LENGKAP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRuleCard({required IconData icon, required String title, required String desc}) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFF070B14),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF38BDF8), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- TAB 4: TENTANG GAME & VERSI ---
  Widget _buildAboutTab(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Column(
        children: [
          const SizedBox(height: 10),
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFF59E0B), width: 2),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                  blurRadius: 18,
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
                  child: const Icon(Icons.corporate_fare_rounded, color: Color(0xFFFBBF24), size: 40),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'CAPITAL FEDERASI',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
            ),
          ),
          const Text(
            'Bursa Saham & Konglomerasi Finansial (CFX)',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
          ),
          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF070B14),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              children: [
                _buildInfoRow('Versi Aplikasi Mobile (APK):', 'v1.3.0-CFX (Build 2026.10)', const Color(0xFF34D399)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Versi Web Admin Console:', 'v1.3.0 Strategic Treasury', const Color(0xFF38BDF8)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Simulasi Pasar Modal:', 'Realistic Engine (CFX-107 Emiten)', const Color(0xFFFBBF24)),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Basis Data & Keamanan:', 'SQLite Multi-Threaded • JWT SHA-256', Colors.white),
                const Divider(color: Color(0xFF1E293B), height: 14),
                _buildInfoRow('Status Jaringan:', 'Online • WebSocket Realtime Sync', const Color(0xFF34D399)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
