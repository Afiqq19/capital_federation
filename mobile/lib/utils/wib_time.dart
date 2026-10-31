/// Utilitas waktu WIB (UTC+7).
///
/// Server (SQLite `CURRENT_TIMESTAMP`) menyimpan waktu dalam UTC tanpa penanda
/// zona, misalnya `2026-10-31 07:00:00`. `DateTime.parse` biasa menganggap string
/// seperti itu sebagai waktu lokal, sehingga jam UTC tampil seolah-olah WIB
/// (selisih 7 jam). Fungsi di sini menganggap string tanpa zona sebagai UTC lalu
/// mengubahnya ke WIB, apa pun zona waktu HP.
library;

const Duration wibOffset = Duration(hours: 7);

/// Waktu sekarang dalam WIB (komponen jam/tanggal sudah WIB).
DateTime nowWib() => _toWib(DateTime.now().toUtc());

/// Parse string waktu dari server menjadi DateTime ber-komponen WIB.
/// String tanpa zona dianggap UTC. Mengembalikan [fallback] (atau sekarang WIB)
/// jika gagal diparse.
DateTime parseServerTime(Object? raw, {DateTime? fallback}) {
  final parsed = tryParseServerTime(raw);
  return parsed ?? fallback ?? nowWib();
}

DateTime? tryParseServerTime(Object? raw) {
  if (raw == null) return null;
  if (raw is num) {
    return _toWib(DateTime.fromMillisecondsSinceEpoch(raw.toInt(), isUtc: true));
  }
  var s = raw.toString().trim();
  if (s.isEmpty) return null;
  if (!s.contains('T')) s = s.replaceFirst(' ', 'T');
  final hasZone = RegExp(r'(Z|[+-]\d{2}:?\d{2})$').hasMatch(s);
  if (!hasZone && s.contains(':')) s = '${s}Z';
  final dt = DateTime.tryParse(s);
  if (dt == null) return null;
  return _toWib(dt.toUtc());
}

DateTime _toWib(DateTime utc) {
  final w = utc.add(wibOffset);
  return DateTime(w.year, w.month, w.day, w.hour, w.minute, w.second, w.millisecond);
}

