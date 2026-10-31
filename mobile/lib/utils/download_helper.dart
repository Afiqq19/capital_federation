import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class DownloadHelper {
  static const String directApkUrl = 'https://capitalfederation.xie.my.id/api/download/apk';
  static const String webDownloadUrl = 'https://capitalfederation.xie.my.id/download';
  static const MethodChannel installerChannel = MethodChannel('com.capitalfederation.mobile/apk_installer');

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

  /// Unduh APK langsung di dalam aplikasi (In-App Direct Download) dan picu instalasi otomatis
  static Future<void> startInAppUpdate(
    BuildContext context, {
    String? newVer,
    int? newBuild,
    String? customUrl,
  }) async {
    if (kIsWeb || !Platform.isAndroid) {
      openDownload(context: context, preferDirectApk: true);
      return;
    }

    final downloadUrl = customUrl ?? directApkUrl;

    // Tampilkan Dialog Progress Pengunduhan In-App
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => _InAppUpdateProgressDialog(
        downloadUrl: downloadUrl,
        newVer: newVer ?? 'Terbaru',
        newBuild: newBuild,
      ),
    );
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
              // Header Badge & Icon
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                    ),
                    child: const Icon(Icons.rocket_launch_rounded, color: Color(0xFFF59E0B), size: 24),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PEMBARUAN APLIKASI TERSEDIA',
                          style: TextStyle(
                            color: Color(0xFFF59E0B),
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Capital Federation',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Version Comparison Card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B).withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Versi Terpasang', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                        const SizedBox(height: 2),
                        Text(
                          'v$currentVer (B$currentBuild)',
                          style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const Icon(Icons.arrow_forward_rounded, color: Color(0xFFF59E0B), size: 18),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Versi Terbaru', style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(
                          'v$newVer (B$newBuild)',
                          style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.w900),
                        ),
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
              // 1. In-App Direct Download & Install
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    startInAppUpdate(context, newVer: newVer, newBuild: newBuild);
                  },
                  icon: const Icon(Icons.bolt_rounded, size: 20),
                  label: const Text(
                    'UPDATE OTOMATIS SEKARANG (INSTAN)',
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

/// Widget Dialog Progress Download & Instalasi In-App
class _InAppUpdateProgressDialog extends StatefulWidget {
  final String downloadUrl;
  final String newVer;
  final int? newBuild;

  const _InAppUpdateProgressDialog({
    required this.downloadUrl,
    required this.newVer,
    this.newBuild,
  });

  @override
  State<_InAppUpdateProgressDialog> createState() => _InAppUpdateProgressDialogState();
}

class _InAppUpdateProgressDialogState extends State<_InAppUpdateProgressDialog> {
  double _progress = 0.0;
  int _receivedBytes = 0;
  int _totalBytes = 0;
  bool _isDownloading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startDownloadAndInstall();
  }

  Future<void> _startDownloadAndInstall() async {
    try {
      final client = http.Client();
      final request = http.Request('GET', Uri.parse(widget.downloadUrl));
      final response = await client.send(request);

      if (response.statusCode != 200) {
        throw Exception('Server mengembalikan kode status ${response.statusCode}');
      }

      final contentLength = response.contentLength ?? 0;
      setState(() {
        _totalBytes = contentLength;
        _isDownloading = true;
      });

      final tempDir = await getTemporaryDirectory();
      final targetFile = File('${tempDir.path}/Capital-Federation-v${widget.newVer}.apk');
      if (await targetFile.exists()) {
        await targetFile.delete();
      }

      final sink = targetFile.openWrite();
      int received = 0;

      await for (final chunk in response.stream) {
        sink.add(chunk);
        received += chunk.length;
        if (mounted) {
          setState(() {
            _receivedBytes = received;
            if (contentLength > 0) {
              _progress = received / contentLength;
            }
          });
        }
      }

      await sink.flush();
      await sink.close();
      client.close();

      if (!mounted) return;

      setState(() {
        _isDownloading = false;
        _progress = 1.0;
      });

      // Panggil Native Android Method Channel untuk membuka Package Installer
      try {
        final success = await DownloadHelper.installerChannel.invokeMethod('installApk', {'filePath': targetFile.path});
        if (mounted && success == true) {
          Navigator.of(context, rootNavigator: true).pop();
        }
      } catch (err) {
        if (!mounted) return;
        setState(() {
          _errorMessage = 'Gagal memicu instalasi: $err. Anda dapat mengunduh via browser.';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isDownloading = false;
        _errorMessage = 'Gagal mengunduh: $e';
      });
    }
  }

  String _formatMb(int bytes) {
    return (bytes / (1024 * 1024)).toStringAsFixed(1);
  }

  @override
  Widget build(BuildContext context) {
    final percentInt = (_progress * 100).clamp(0, 100).toInt();

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.system_update_rounded, color: Color(0xFFF59E0B), size: 28),
            ),
            const SizedBox(height: 14),
            Text(
              _isDownloading ? 'Mengunduh Pembaruan v${widget.newVer}...' : 'Memulai Pemasangan APK...',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              _isDownloading
                  ? 'File APK diunduh langsung ke sistem game tanpa perlu membuka browser eksternal.'
                  : 'Sistem Android sedang membuka Package Installer. Silakan ketuk "Update" pada jendela konfirmasi.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
            const SizedBox(height: 18),
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: Color(0xFFF87171), fontSize: 11),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
                    child: const Text('Tutup', style: TextStyle(color: Color(0xFF94A3B8))),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context, rootNavigator: true).pop();
                      DownloadHelper.openDownload(context: context, preferDirectApk: true);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF38BDF8),
                      foregroundColor: const Color(0xFF0F172A),
                    ),
                    child: const Text('Unduh Manual via Browser', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                  ),
                ],
              ),
            ] else ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: _totalBytes > 0 ? _progress : null,
                  minHeight: 10,
                  backgroundColor: const Color(0xFF1E293B),
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFF59E0B)),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _totalBytes > 0
                        ? '${_formatMb(_receivedBytes)} MB / ${_formatMb(_totalBytes)} MB'
                        : '${_formatMb(_receivedBytes)} MB',
                    style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '$percentInt%',
                    style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (_isDownloading)
                TextButton(
                  onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
                  child: const Text('Batalkan', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
