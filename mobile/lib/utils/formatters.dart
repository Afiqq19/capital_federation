import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _idFormatter = NumberFormat('#,###', 'id_ID');

  /// Format penuh standar rupiah: "IB 25.000.000", "-IB 15.000.000"
  static String formatFull(num value) {
    if (value < 0) {
      return '-IB ${_idFormatter.format(value.abs().round())}';
    }
    return 'IB ${_idFormatter.format(value.round())}';
  }

  /// Format angka tanpa prefix "IB ": "25.000.000", "-1.500.000"
  static String formatNumberOnly(num value) {
    if (value < 0) {
      return '-${_idFormatter.format(value.abs().round())}';
    }
    return _idFormatter.format(value.round());
  }

  static String formatNumber(num value) => formatNumberOnly(value);

  /// Format nominal rapi tanpa singkatan "Jt" / "Rb":
  /// Nilai selalu ditampilkan penuh: e.g. "IB 25.000.000"
  /// Jika sudah di atas Triliun (>= 1.000.000.000.000), disingkat "IB 1,5 T" agar tidak melebihi layar
  static String formatCompact(num value) {
    if (value == 0) return 'IB 0';
    final isNegative = value < 0;
    final absVal = value.abs();

    String result;
    if (absVal >= 1000000000000) {
      final t = absVal / 1000000000000;
      result = 'IB ${t >= 100 ? t.toStringAsFixed(0) : t.toStringAsFixed(2)} Triliun';
    } else {
      // Selalu tampilkan angka lengkap: misal IB 25.000.000, IB 1.500.000.000
      result = 'IB ${_idFormatter.format(absVal.round())}';
    }

    return isNegative ? '-$result' : result;
  }

  /// Format persentase perubahan harga (+2.45% atau -1.15%)
  static String formatPercentage(double pct) {
    final prefix = pct > 0 ? '+' : '';
    return '$prefix${pct.toStringAsFixed(2)}%';
  }
}
