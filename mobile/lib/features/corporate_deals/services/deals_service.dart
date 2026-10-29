import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../services/api_service.dart';
import '../models/deal_model.dart';

class DealsService {
  static String get _base => ApiService.baseUrl;

  // Dapatkan daftar kandidat konglomerat lain untuk P2P deal
  static Future<List<Map<String, dynamic>>> getCandidates() async {
    try {
      final res = await http.get(Uri.parse('$_base/api/deals/candidates')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(res.body));
      }
    } catch (_) {}
    return [];
  }

  // Buat kesepakatan penjualan saham (P2P target spesifik atau Penawaran Terbuka Global)
  static Future<Map<String, dynamic>> createDeal({
    required String sellerUserId,
    required String companyId,
    required double percentage,
    required double pricePerShare,
    required String targetType, // 'P2P' or 'GLOBAL'
    String? buyerUserId,
    String? termsNotes,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_base/api/deals/create'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'sellerUserId': sellerUserId,
          'companyId': companyId,
          'percentage': percentage,
          'pricePerShare': pricePerShare,
          'targetType': targetType,
          'buyerUserId': buyerUserId,
          'termsNotes': termsNotes,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(res.body);
    } catch (e) {
      return {'error': 'Koneksi gagal saat membuat penawaran saham'};
    }
  }

  // Ambil katalog penawaran saham terbuka global
  static Future<List<PrivateDealModel>> getGlobalDeals() async {
    try {
      final res = await http.get(Uri.parse('$_base/api/deals/global')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((d) => PrivateDealModel.fromJson(d)).toList();
      }
    } catch (_) {}
    return [];
  }

  // Ambil tawaran masuk khusus P2P untuk user ini
  static Future<List<PrivateDealModel>> getInboxDeals(String userId) async {
    try {
      final res = await http.get(Uri.parse('$_base/api/deals/inbox/$userId')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((d) => PrivateDealModel.fromJson(d)).toList();
      }
    } catch (_) {}
    return [];
  }

  // Tandatangani akta & bayar (dengan opsi pembelian parsial e.g. 1% dari 10%)
  static Future<Map<String, dynamic>> signAndPay({
    required String dealId,
    required String buyerUserId,
    double? customPercentage,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_base/api/deals/sign-and-pay'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'dealId': dealId,
          'buyerUserId': buyerUserId,
          if (customPercentage != null && customPercentage > 0) 'customPercentage': customPercentage,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(res.body);
    } catch (e) {
      return {'error': 'Gagal menandatangani akta: Masalah jaringan'};
    }
  }

  // Tolak tawaran P2P
  static Future<Map<String, dynamic>> rejectDeal({
    required String dealId,
    required String userId,
    String? reason,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_base/api/deals/reject'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'dealId': dealId,
          'userId': userId,
          'reason': reason,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(res.body);
    } catch (e) {
      return {'error': 'Gagal menolak tawaran'};
    }
  }

  // Ambil brankas akta jual beli notariil tersimpan untuk user ini
  static Future<List<DealDeedModel>> getUserDeeds(String userId) async {
    try {
      final res = await http.get(Uri.parse('$_base/api/deals/deeds/$userId')).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((d) => DealDeedModel.fromJson(d)).toList();
      }
    } catch (_) {}
    return [];
  }

  // Gugat wanprestasi ke Pengadilan Niaga Konoha (PNAK) langsung dari akta
  static Future<Map<String, dynamic>> disputeToPnak({
    required String deedId,
    required String plaintiffUserId,
    String? grievanceReason,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_base/api/deals/dispute-to-pnak'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'deedId': deedId,
          'plaintiffUserId': plaintiffUserId,
          'grievanceReason': grievanceReason,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(res.body);
    } catch (e) {
      return {'error': 'Gagal mendaftarkan gugatan wanprestasi ke PNAK'};
    }
  }
}
