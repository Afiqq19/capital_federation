import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Penyimpanan cache lokal (di HP) untuk data terakhir dari server, supaya
/// aplikasi bisa langsung menampilkan data lama selagi data baru diambil
/// di latar belakang.
class LocalCache {
  static const _prefix = 'cache_';

  static Future<void> write(String key, String json) async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.setString('$_prefix$key', json);
      await p.setInt('$_prefix${key}_at', DateTime.now().millisecondsSinceEpoch);
    } catch (_) {}
  }

  static Future<String?> read(String key) async {
    try {
      final p = await SharedPreferences.getInstance();
      return p.getString('$_prefix$key');
    } catch (_) {
      return null;
    }
  }

  static Future<String?> getUserId() async {
    try {
      final str = await read('user');
      if (str != null && str.isNotEmpty) {
        final decoded = jsonDecode(str);
        if (decoded is Map && decoded['id'] != null) {
          return decoded['id'].toString();
        }
      }
    } catch (_) {}
    return null;
  }

  /// Waktu simpan terakhir (epoch ms, UTC) untuk [key].
  static Future<int?> stamp(String key) async {
    try {
      final p = await SharedPreferences.getInstance();
      return p.getInt('$_prefix${key}_at');
    } catch (_) {
      return null;
    }
  }

  static Future<void> remove(String key) async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.remove('$_prefix$key');
      await p.remove('$_prefix${key}_at');
    } catch (_) {}
  }
}

