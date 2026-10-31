import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../services/api_service.dart';
import '../services/google_auth_service.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onCompleted;

  const OnboardingScreen({super.key, required this.onCompleted});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  bool _isRegisterMode = true; // true = Daftar Baru, false = Masuk
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Harap isi nama akun dan kata sandi Anda!';
      });
      return;
    }

    if (password.length < 6) {
      setState(() {
        _errorMessage = 'Kata sandi minimal 6 karakter demi keamanan akun!';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final provider = context.read<GameProvider>();
    String? err;

    if (_isRegisterMode) {
      err = await provider.registerUser(username: username, password: password);
    } else {
      err = await provider.loginUser(username: username, password: password);
    }

    if (mounted) {
      setState(() {
        _isSubmitting = false;
      });

      if (err == null) {
        if (_isRegisterMode) {
          // Welcome Dialog mewah untuk investor baru
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              backgroundColor: const Color(0xFF0D1527),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(22),
                side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
              ),
              title: const Row(
                children: [
                  Icon(Icons.workspace_premium_rounded, color: Color(0xFFF59E0B), size: 26),
                  SizedBox(width: 8),
                  Text(
                    'DANA HIBAH INVESTOR',
                    style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Selamat datang di Federasi, $username! Sebagai apresiasi perintis pasar modal, akun Anda telah dikreditkan modal kas tabungan pribadi:',
                    style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF064E3B), Color(0xFF022C22)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                    ),
                    child: const Column(
                      children: [
                        Text(
                          'MODAL AWAL KAS PRIBADI',
                          style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'IB 10.000.000',
                          style: TextStyle(
                            color: Color(0xFF34D399),
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Gunakan kas ini untuk membeli lot saham emiten Tbk. di pasar modal, kumpulkan dividen serta capital gain hingga IB 25.000.000 untuk mendirikan Perseroan Terbatas (PT) Anda sendiri!',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
                  ),
                ],
              ),
              actions: [
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      widget.onCompleted();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: const Color(0xFF022C22),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('MASUK KE BURSA EFEK', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
                  ),
                ),
              ],
            ),
          );
        } else {
          widget.onCompleted();
        }
      } else {
        setState(() {
          _errorMessage = err;
        });
      }
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final googleData = await GoogleAuthService.signIn();
      if (googleData == null) {
        if (mounted) setState(() => _isSubmitting = false);
        return;
      }

      if (googleData.containsKey('error') && googleData['error'] != null) {
        if (mounted) {
          setState(() {
            _isSubmitting = false;
            _errorMessage = 'Google Sign-In: ${googleData['error']}';
          });
        }
        return;
      }

      if (!mounted) return;
      final provider = context.read<GameProvider>();
      final err = await provider.loginWithGoogle(googleData);

      if (err == null) {
        if (mounted) {
          widget.onCompleted();
        }
      } else {
        if (mounted) {
          setState(() {
            _isSubmitting = false;
            _errorMessage = err;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = 'Gagal autentikasi Google: $e';
        });
      }
    }
  }

  void _showServerConfigDialog() {
    final controller = TextEditingController(text: ApiService.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0D1527),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFF334155)),
        ),
        title: const Row(
          children: [
            Icon(Icons.dns_rounded, color: Color(0xFF38BDF8), size: 20),
            SizedBox(width: 8),
            Text('Koneksi Server Backend', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Pilih server bursa aktif atau masukkan URL hosting kustom Anda:',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      controller.text = 'https://capitalfederation.xie.my.id';
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFF59E0B)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('🌐 Cloud Resmi', style: TextStyle(color: Color(0xFFFBBF24), fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      controller.text = 'http://127.0.0.1:4000';
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF10B981)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('⚡ Kabel USB', style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                labelText: 'Alamat Server Backend',
                labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                hintText: 'https://capitalfederation.xie.my.id',
                hintStyle: const TextStyle(color: Color(0xFF475569)),
                filled: true,
                fillColor: const Color(0xFF070B14),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('BATAL', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
          ),
          ElevatedButton(
            onPressed: () async {
              var newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                if (newUrl.contains('0.0.0.0')) {
                  newUrl = newUrl.replaceAll('0.0.0.0', '127.0.0.1');
                }
                ApiService.setBaseUrl(newUrl);
                Navigator.pop(ctx);
                setState(() {});
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Server bursa diarahkan ke: $newUrl'),
                    backgroundColor: const Color(0xFF10B981),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF38BDF8),
              foregroundColor: const Color(0xFF082F49),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('SIMPAN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      body: Stack(
        children: [
          // Ambient Glow Background
          Positioned(
            top: -40,
            left: -40,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF10B981).withValues(alpha: 0.08),
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 22.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Navigation Bar
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.account_balance_rounded, color: Color(0xFF0F172A), size: 22),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'CAPITAL FEDERATION',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.4,
                              ),
                            ),
                            Text(
                              'Bursa Efek & Konglomerasi Finansial',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                      InkWell(
                        onTap: _showServerConfigDialog,
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF1E293B)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.fiber_manual_record_rounded, color: Color(0xFF10B981), size: 10),
                              SizedBox(width: 5),
                              Text(
                                'Server',
                                style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),

                  // Hero Title Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F172A), Color(0xFF090D18)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: (_isRegisterMode ? const Color(0xFF10B981) : const Color(0xFF38BDF8)).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: (_isRegisterMode ? const Color(0xFF10B981) : const Color(0xFF38BDF8)).withValues(alpha: 0.4),
                                ),
                              ),
                              child: Text(
                                _isRegisterMode ? '✨ REGISTRASI PERINTIS' : '🔑 AKSES BRANKAS',
                                style: TextStyle(
                                  color: _isRegisterMode ? const Color(0xFF34D399) : const Color(0xFF38BDF8),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          _isRegisterMode ? 'Buka Akun Investor Baru' : 'Selamat Datang Kembali!',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _isRegisterMode
                              ? 'Daftar dalam sekejap tanpa ribet. Mulai perjalanan Anda membangun kerajaan bisnis dari bursa saham!'
                              : 'Masuk dengan kredensial Anda untuk memantau portofolio saham, kas dividen, dan status PT.',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Mode Switcher Tab (Glassmorphic Segmented Control)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0F1D),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _isRegisterMode = true;
                                _errorMessage = null;
                              });
                            },
                            borderRadius: BorderRadius.circular(10),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                gradient: _isRegisterMode
                                    ? const LinearGradient(
                                        colors: [Color(0xFF10B981), Color(0xFF059669)],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      )
                                    : null,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: _isRegisterMode
                                    ? [
                                        BoxShadow(
                                          color: const Color(0xFF10B981).withValues(alpha: 0.3),
                                          blurRadius: 8,
                                        ),
                                      ]
                                    : null,
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'DAFTAR INVESTOR',
                                style: TextStyle(
                                  color: _isRegisterMode ? const Color(0xFF022C22) : const Color(0xFF94A3B8),
                                  fontWeight: FontWeight.w900,
                                  fontSize: 11,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _isRegisterMode = false;
                                _errorMessage = null;
                              });
                            },
                            borderRadius: BorderRadius.circular(10),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                gradient: !_isRegisterMode
                                    ? const LinearGradient(
                                        colors: [Color(0xFF38BDF8), Color(0xFF0284C7)],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      )
                                    : null,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: !_isRegisterMode
                                    ? [
                                        BoxShadow(
                                          color: const Color(0xFF38BDF8).withValues(alpha: 0.3),
                                          blurRadius: 8,
                                        ),
                                      ]
                                    : null,
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'MASUK (LOGIN)',
                                style: TextStyle(
                                  color: !_isRegisterMode ? const Color(0xFF082F49) : const Color(0xFF94A3B8),
                                  fontWeight: FontWeight.w900,
                                  fontSize: 11,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Error Message Banner
                  if (_errorMessage != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.6)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 11.5, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Input: Username
                  _buildTextField(
                    controller: _usernameController,
                    label: 'NAMA AKUN / USERNAME INVESTOR',
                    hint: 'Contoh: Syafiq_Investama',
                    icon: Icons.person_rounded,
                  ),
                  const SizedBox(height: 14),

                  // Input: Password dengan Show/Hide Eye Toggle
                  _buildTextField(
                    controller: _passwordController,
                    label: 'KATA SANDI / PIN KEAMANAN',
                    hint: 'Minimal 6 karakter rahasia',
                    icon: Icons.lock_rounded,
                    isPassword: true,
                    obscureText: _obscurePassword,
                    onToggleObscure: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                  const SizedBox(height: 16),

                  // Benefit Card: Dana Hibah IB 10.000.000 (Mode Register)
                  if (_isRegisterMode) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF082A1C), Color(0xFF0F172A)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.monetization_on_rounded, color: Color(0xFF34D399), size: 24),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'DANA HIBAH INVESTOR',
                                      style: TextStyle(color: Color(0xFFFBBF24), fontSize: 10, fontWeight: FontWeight.w900),
                                    ),
                                    SizedBox(width: 6),
                                    Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 12),
                                  ],
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'IB 10.000.000 (Kas Tunai)',
                                  style: TextStyle(color: Color(0xFF34D399), fontSize: 14, fontWeight: FontWeight.w900),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Langsung cair ke brankas kas pribadi Anda saat akun dibuat.',
                                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.verified_user_rounded, color: Color(0xFF38BDF8), size: 20),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Keamanan Data Terenkripsi', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                SizedBox(height: 2),
                                Text('Portofolio saham, kepemilikan PT, & kas Anda tersinkronisasi realtime.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Tombol Submit Utama
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isRegisterMode ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                        foregroundColor: _isRegisterMode ? const Color(0xFF022C22) : const Color(0xFF082F49),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 3,
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _isRegisterMode ? Icons.how_to_reg_rounded : Icons.login_rounded,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _isRegisterMode ? 'BUAT AKUN & KLAIM MODAL' : 'MASUK KE BURSA EFEK',
                                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, letterSpacing: 0.8),
                                ),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Divider
                  const Row(
                    children: [
                      Expanded(child: Divider(color: Color(0xFF1E293B))),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 10),
                        child: Text('ATAU OPSI LAIN', style: TextStyle(color: Color(0xFF64748B), fontSize: 9.5, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                      ),
                      Expanded(child: Divider(color: Color(0xFF1E293B))),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Opsi Google Login
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton.icon(
                      onPressed: _isSubmitting ? null : _handleGoogleSignIn,
                      icon: const Icon(Icons.g_mobiledata_rounded, color: Colors.white, size: 24),
                      label: const Text('Lanjutkan dengan Akun Google', style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF1E293B)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        backgroundColor: const Color(0xFF0A0F1D),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Opsi Guest / Demo Mode
                  SizedBox(
                    width: double.infinity,
                    height: 40,
                    child: TextButton.icon(
                      onPressed: () async {
                        final provider = context.read<GameProvider>();
                        await provider.loginAsGuest();
                        widget.onCompleted();
                      },
                      icon: const Icon(Icons.sports_esports_rounded, color: Color(0xFF94A3B8), size: 17),
                      label: const Text('Masuk Cepat Sebagai Akun Tamu / Demo', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    bool obscureText = false,
    VoidCallback? onToggleObscure,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.8),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: isPassword ? obscureText : false,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 12),
            prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 18),
            suffixIcon: isPassword
                ? IconButton(
                    icon: Icon(
                      obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: const Color(0xFF64748B),
                      size: 18,
                    ),
                    onPressed: onToggleObscure,
                  )
                : null,
            filled: true,
            fillColor: const Color(0xFF0F172A),
            contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF1E293B)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF1E293B)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
