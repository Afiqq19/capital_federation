import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

class DownloadHelper {
  static const String directApkUrl = 'https://capitalfederation.xie.my.id/api/download/apk';
  static const String webDownloadUrl = 'https://capitalfederation.xie.my.id/download';

  /// Membuka tautan unduhan dengan fallback multi-level dan salin otomatis ke clipboard jika browser terblokir
  static Future<void> openDownload({
    BuildContext? context,
    String? customUrl,
    bool preferDirectApk = true,
  }) async {
    final String urlStr = customUrl ?? (preferDirectApk ? directApkUrl : webDownloadUrl);
    final Uri uri = Uri.parse(urlStr);

    bool launched = false;
    try {
      // 1. Coba luncurkan aplikasi eksternal (Browser HP Android bawaan / Chrome)
      launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        // 2. Coba mode platform default
        launched = await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      try {
        // 3. Fallback in-app webview
        launched = await launchUrl(uri, mode: LaunchMode.inAppWebView);
      } catch (_) {}
    }

    if (context != null && context.mounted) {
      ScaffoldMessenger.of(context).clearSnackBars();
      if (launched) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.downloading_rounded, color: Color(0xFF34D399), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    preferDirectApk
                        ? 'Memulai pengunduhan APK di browser HP...'
                        : 'Membuka portal download resmi bursa...',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF0F172A),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
              side: const BorderSide(color: Color(0xFF10B981)),
            ),
            duration: const Duration(seconds: 3),
          ),
        );
      } else {
        // Jika browser gagal dibuka, otomatis salin link ke papan klip
        await Clipboard.setData(ClipboardData(text: urlStr));
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('⚠️ Tautan Unduhan Disalin ke Papan Klip!', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFDE68A))),
                  const SizedBox(height: 3),
                  Text('Buka browser di HP Anda lalu tempel: $urlStr', style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1))),
                ],
              ),
              backgroundColor: const Color(0xFF1E293B),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    }
  }

  /// Menampilkan Modal Dialog Pembaruan yang Modern, Elegan & Jelas
  static void showModernUpdateDialog(
    BuildContext context, {
    required String currentVer,
    required int currentBuild,
    required String newVer,
    required int newBuild,
    required String releaseNotes,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D1527), Color(0xFF070B14)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Header with Badge
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF59E0B), Color(0xFFB45309)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                          blurRadius: 10,
                        )
                      ],
                    ),
                    child: const Icon(Icons.system_update_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pembaruan Tersedia!',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Otoritas Bursa Capital Federation',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Version Diff Pills
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0A101D),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Versi Terpasang:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                        const SizedBox(height: 1),
                        Text('v$currentVer+$currentBuild', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      ],
                    ),
                    const Icon(Icons.arrow_forward_rounded, color: Color(0xFFF59E0B), size: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Versi Rilis Resmi:', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 1),
                        Text('v$newVer+$newBuild', style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 11, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Changelog Box
              const Text('Catatan Rilis & Fitur Baru:', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11.5, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Container(
                constraints: const BoxConstraints(maxHeight: 140),
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF070B14),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: SingleChildScrollView(
                  child: Text(
                    releaseNotes,
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                      height: 1.4,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Action Buttons
              // 1. Direct Download APK
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    openDownload(context: context, preferDirectApk: true);
                  },
                  icon: const Icon(Icons.download_rounded, size: 18),
                  label: const Text(
                    'UNDUH & UPDATE SEKARANG (APK)',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: const Color(0xFF1E1502),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 6,
                    shadowColor: const Color(0xFFF59E0B).withValues(alpha: 0.5),
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // 2. Open Website Landing Page
              SizedBox(
                width: double.infinity,
                height: 38,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    openDownload(context: context, preferDirectApk: false);
                  },
                  icon: const Icon(Icons.language_rounded, size: 16),
                  label: const Text(
                    'Buka Halaman Web Download',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF38BDF8),
                    side: const BorderSide(color: Color(0xFF1E293B)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(height: 6),

              // 3. Nanti Saja
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('NANTI SAJA', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 11)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
