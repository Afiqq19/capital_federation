import 'dart:convert';
import '../utils/local_cache.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/company.dart';
import '../models/portfolio.dart';
import '../models/news.dart';

class ApiService {
  static String baseUrl = 'https://capitalfederation.xie.my.id';
  // static String baseUrl = 'http://127.0.0.1:4000';


  static void setBaseUrl(String url) {
    var sanitized = url.trim();
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      sanitized = 'http://$sanitized';
    }
    if (sanitized.contains('0.0.0.0')) {
      sanitized = sanitized.replaceAll('0.0.0.0', '127.0.0.1');
    }
    baseUrl = sanitized;
  }

  static final List<String> _candidateHosts = [
    'https://capitalfederation.xie.my.id', // Production Hosting Domain
    'http://127.0.0.1:4000',   // USB Cable via adb reverse (tercepat di HP fisik via kabel)
    'http://localhost:4000',    // Localhost
    'http://10.75.94.106:4000', // Wi-Fi / LAN IP PC aktif saat ini
    'http://10.75.94.242:4000', // Wi-Fi / LAN IP PC alternatif
    'http://10.75.94.156:4000', // Wi-Fi LAN IP alternatif
    'http://10.0.2.2:4000',     // Android Emulator
    'http://192.168.1.100:5000', // Hosting
  ];

  static bool _isDiscovering = false;

  static Future<void> autoDiscoverHost() async {
    if (kIsWeb) {
      baseUrl = 'http://localhost:4000';
      return;
    }
    if (_isDiscovering) return;
    _isDiscovering = true;

    try {
      // 1. Cepat: Tes dulu host aktif saat ini / domain produksi utama menggunakan endpoint ringan /api/version (<30ms)
      try {
        final quickCheck = await http
            .get(Uri.parse('$baseUrl/api/version'))
            .timeout(const Duration(milliseconds: 1500));
        if (quickCheck.statusCode == 200) {
          debugPrint('✅ Fast-connected ke Backend di $baseUrl');
          return;
        }
      } catch (_) {}

      // 2. Parallel host pinging to find reachable server fast
      final pingFutures = _candidateHosts.map((host) async {
        try {
          final res = await http
              .get(Uri.parse('$host/api/version'))
              .timeout(const Duration(milliseconds: 1500));
          if (res.statusCode == 200) {
            return host;
          }
        } catch (_) {}
        return null;
      });

      final results = await Future.wait(pingFutures);
      for (final host in results) {
        if (host != null) {
          baseUrl = host;
          debugPrint('✅ Connected to Capital Federation Backend at $baseUrl');
          return;
        }
      }
      debugPrint('⚠️ Menggunakan fallback host: $baseUrl');
    } finally {
      _isDiscovering = false;
    }
  }

  // Fetch Central Bank & Monetary Settings
  static Future<Map<String, dynamic>?> getSettings() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/settings')).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
      final fallback = await http.get(Uri.parse('$baseUrl/api/admin/settings')).timeout(const Duration(seconds: 6));
      if (fallback.statusCode == 200) {
        return jsonDecode(fallback.body);
      }
    } catch (_) {}
    return null;
  }

  static const String currentAppVersion = '1.9.0';
  static const int currentBuildNumber = 26;
  static const String currentApkDisplayVersion = 'v1.9.0-CFX Production (Build 26)';

  // Fetch Live Server Version & Update Detection Info
  static Future<Map<String, dynamic>?> getServerVersion() async {
    try {
      final res = await http
          .get(Uri.parse('$baseUrl/api/version'))
          .timeout(const Duration(seconds: 20));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map<String, dynamic>) {
          return data;
        }
      }
    } catch (_) {}
    return null;
  }

  // Register as Investor Pemula
  static Future<Map<String, dynamic>> register({
    required String username,
    required String password,
    String? ptName,
    String? sector,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
          if (ptName != null) 'ptName': ptName,
          if (sector != null) 'sector': sector,
        }),
      ).timeout(const Duration(seconds: 20));
      return jsonDecode(response.body);
    } catch (e) {
      await autoDiscoverHost();
      try {
        final retryRes = await http.post(
          Uri.parse('$baseUrl/api/auth/register'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'username': username,
            'password': password,
            if (ptName != null) 'ptName': ptName,
            if (sector != null) 'sector': sector,
          }),
        ).timeout(const Duration(seconds: 20));
        return jsonDecode(retryRes.body);
      } catch (_) {
        return {'error': 'Koneksi ke server ($baseUrl) gagal. Pastikan HP & laptop di Wi-Fi yang sama.'};
      }
    }
  }

  // Login / Registrasi Akun Google Resmi (OAuth 2.0 / Google Play Services)
  static Future<Map<String, dynamic>> loginWithGoogle({
    String? idToken,
    required String email,
    String? name,
    String? googleId,
    String? avatarUrl,
    String? userId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          if (idToken != null) 'idToken': idToken,
          'email': email,
          if (name != null) 'name': name,
          if (googleId != null) 'googleId': googleId,
          if (avatarUrl != null) 'avatarUrl': avatarUrl,
          if (userId != null) 'userId': userId,
        }),
      ).timeout(const Duration(seconds: 20));

      return jsonDecode(response.body);
    } catch (e) {
      await autoDiscoverHost();
      try {
        final retryRes = await http.post(
          Uri.parse('$baseUrl/api/auth/google'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            if (idToken != null) 'idToken': idToken,
            'email': email,
            if (name != null) 'name': name,
            if (googleId != null) 'googleId': googleId,
            if (avatarUrl != null) 'avatarUrl': avatarUrl,
            if (userId != null) 'userId': userId,
          }),
        ).timeout(const Duration(seconds: 20));

        return jsonDecode(retryRes.body);
      } catch (_) {
        return {'error': 'Koneksi ke server ($baseUrl) gagal saat autentikasi Google.'};
      }
    }
  }

  // Login
  static Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 20));
      return jsonDecode(response.body);
    } catch (e) {
      await autoDiscoverHost();
      try {
        final retryRes = await http.post(
          Uri.parse('$baseUrl/api/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'username': username,
            'password': password,
          }),
        ).timeout(const Duration(seconds: 20));
        return jsonDecode(retryRes.body);
      } catch (_) {
        return {'error': 'Koneksi ke server ($baseUrl) gagal. Pastikan HP & laptop di Wi-Fi yang sama.'};
      }
    }
  }

  // Mendirikan PT Pertama / Anak Perusahaan Baru
  static Future<Map<String, dynamic>> foundCompany({
    required String userId,
    required String ptName,
    required String symbol,
    required String sector,
    required String description,
    bool isSubsidiary = false,
    bool agreedToTerms = true,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/found'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'ptName': ptName,
          'symbol': symbol,
          'sector': sector,
          'description': description,
          'isSubsidiary': isSubsidiary,
          'agreedToTerms': agreedToTerms,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal mendirikan PT: Gangguan koneksi'};
    }
  }

  // Suntik Modal (Kas Pribadi -> Kas Perusahaan)
  static Future<Map<String, dynamic>> fundCompany({
    required String userId,
    required double amount,
    String? companyId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/fund'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'amount': amount,
          if (companyId != null) 'companyId': companyId,
        }),
      ).timeout(const Duration(seconds: 15));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal menyuntik modal: Gangguan koneksi'};
    }
  }

  // Tarik Dividen / Prive (Kas Perusahaan -> Kas Pribadi)
  static Future<Map<String, dynamic>> withdrawCompany({
    required String userId,
    required double amount,
    String? companyId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/withdraw'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'amount': amount,
          if (companyId != null) 'companyId': companyId,
        }),
      ).timeout(const Duration(seconds: 15));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal menarik dividen: Gangguan koneksi'};
    }
  }

  // Upgrade Bisnis & R&D (Dipotong dari Kas Perusahaan)
  static Future<Map<String, dynamic>> upgradeCompany({
    required String userId,
    required String type, // "rd", "marketing", "hr", "capacity"
    String? companyId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/upgrade'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'type': type,
          if (companyId != null) 'companyId': companyId,
        }),
      ).timeout(const Duration(seconds: 15));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal upgrade bisnis: Gangguan koneksi'};
    }
  }

  // Launching IPO Resmi ke Bursa Saham dengan Formulir Prospektus
  static Future<Map<String, dynamic>> ipoCompany({
    required String userId,
    String? companyId,
    String? symbol,
    String? description,
    String? sector,
    double? ipoPrice,
    double? floatingPct,
    int? totalShares,
    String? initialStatus,
    String? bookbuildingDate,
    String? offeringDate,
    String? allotmentDate,
    String? listingDate,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/ipo'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          if (companyId != null) 'companyId': companyId,
          if (symbol != null) 'symbol': symbol,
          if (description != null) 'description': description,
          if (sector != null) 'sector': sector,
          if (ipoPrice != null) 'ipoPrice': ipoPrice,
          if (floatingPct != null) 'floatingPct': floatingPct,
          if (totalShares != null) 'totalShares': totalShares,
          if (initialStatus != null) 'initialStatus': initialStatus,
          if (bookbuildingDate != null) 'bookbuildingDate': bookbuildingDate,
          if (offeringDate != null) 'offeringDate': offeringDate,
          if (allotmentDate != null) 'allotmentDate': allotmentDate,
          if (listingDate != null) 'listingDate': listingDate,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal meluncurkan IPO: Gangguan koneksi'};
    }
  }

  // Get Companies
  static Future<List<CompanyModel>> getCompanies({String? sector, String? status, String? search}) async {
    try {
      String url = '$baseUrl/api/companies?';
      if (sector != null && sector != 'ALL') url += '&sector=$sector';
      if (status != null && status != 'ALL') url += '&status=$status';
      if (search != null && search.isNotEmpty) url += '&search=$search';

      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(response.body);
        if (sector == null && status == null && (search == null || search.isEmpty)) {
          LocalCache.write('companies', response.body);
        }
        return list.map((e) => CompanyModel.fromJson(e)).toList();
      }
    } catch (e) {
      autoDiscoverHost();
    }
    return [];
  }

  // Get IPMC / IHSG Market Overview & Intraday Stats
  static Future<Map<String, dynamic>?> getMarketOverview() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/market/overview')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        LocalCache.write('overview', response.body);
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      autoDiscoverHost();
    }
    return null;
  }

  // Rekrut Karyawan / Direksi PT (Dipotong dari Kas Perusahaan)
  static Future<Map<String, dynamic>> hireStaff({
    required String userId,
    required String type, // "staff", "ceo", "cfo", "cmo"
    String? companyId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/staff/hire'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'type': type,
          if (companyId != null) 'companyId': companyId,
        }),
      ).timeout(const Duration(seconds: 15));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal merekrut: Gangguan koneksi ke server.'};
    }
  }

  // Ambil Daftar Seluruh PT dalam Konglomerasi (PT Utama + Hasil Akuisisi)
  static Future<List<Map<String, dynamic>>?> getConglomerate(String userId) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/user/conglomerate/$userId'))
          .timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        LocalCache.write('conglomerate', response.body);
        final List<dynamic> list = jsonDecode(response.body);
        return list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (e) {
      autoDiscoverHost();
    }
    return null;
  }

  // Ambil Rincian Biaya Penebusan PT Disita (Denda Sanksi PNAF + Utang Bank BCF + Bunga)
  static Future<Map<String, dynamic>?> getRedemptionInfo(String companyId, {String? userId}) async {
    try {
      final uri = Uri.parse('$baseUrl/api/seizure/$companyId/redemption-info${userId != null ? '?userId=$userId' : ''}');
      final response = await http
          .get(uri)
          .timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(jsonDecode(response.body));
      }
    } catch (e) {
      autoDiscoverHost();
    }
    return null;
  }

  // Eksekusi Penebusan PT Disita
  static Future<Map<String, dynamic>> redeemCompany({
    required String companyId,
    required String userId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/seizure/$companyId/redeem'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId}),
      ).timeout(const Duration(seconds: 6));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message'] ?? 'Berhasil menebus perseroan!'};
      }
      return {'success': false, 'error': data['error'] ?? 'Gagal menebus perseroan'};
    } catch (e) {
      return {'success': false, 'error': 'Koneksi error: $e'};
    }
  }

  // Ganti Nama PT / Rebranding Emiten (Biaya Legalitas, Notaris & Audit Tim Penyidikan)
  static Future<Map<String, dynamic>> renameCompany({
    required String userId,
    required String companyId,
    required String newName,
    String? newSymbol,
    String? description,
    String? sector,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/rename'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'companyId': companyId,
          'newName': newName,
          if (newSymbol != null) 'newSymbol': newSymbol,
          if (description != null) 'description': description,
          if (sector != null) 'sector': sector,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal mengubah identitas perusahaan: Gangguan koneksi ke server.'};
    }
  }

  // Divestasi / Pelepasan Sebagian Saham Kepemilikan Founder
  static Future<Map<String, dynamic>> divestCompany({
    required String userId,
    required String companyId,
    required double pctToSell,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/divest'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'companyId': companyId,
          'pctToSell': pctToSell,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal melakukan divestasi: Gangguan koneksi ke server.'};
    }
  }

  // Mengambil Daftar Transparan Pemegang Saham (Cap Table)
  static Future<List<Map<String, dynamic>>> getShareholders({
    required String companyId,
    String? userId,
  }) async {
    try {
      String url = '$baseUrl/api/company/$companyId/shareholders';
      if (userId != null) url += '?userId=$userId';
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(response.body);
        return list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (e) {
      autoDiscoverHost();
    }
    return [];
  }

  // Get Company Detail with Price History & Orderbook
  static Future<CompanyModel?> getCompanyDetail(String id, {String range = '1D', String? userId}) async {
    try {
      String url = '$baseUrl/api/companies/$id?range=$range';
      if (userId != null && userId.isNotEmpty) {
        url += '&userId=$userId';
      }
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return CompanyModel.fromJson(jsonDecode(response.body));
      }
    } catch (e) {
      autoDiscoverHost();
    }
    return null;
  }

  // Execute Stock Order (1 Lot = 100 Lembar)
  static Future<Map<String, dynamic>> executeOrder({
    required String userId,
    required String companyId,
    required String type, // "BUY" or "SELL"
    required int lots,
  }) async {
    for (int attempt = 0; attempt < 2; attempt++) {
      try {
        final response = await http.post(
          Uri.parse('$baseUrl/api/trade/order'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'userId': userId,
            'companyId': companyId,
            'type': type,
            'lots': lots,
          }),
        ).timeout(const Duration(seconds: 20));

        return jsonDecode(response.body);
      } catch (e) {
        if (attempt == 0) {
          await autoDiscoverHost();
        }
      }
    }
    return {'error': 'Gagal mengeksekusi order saham: Koneksi ke server terputus. Pastikan server aktif.'};
  }

  // Get Portfolio
  static Future<PortfolioSummaryModel?> getPortfolio(String userId) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/portfolio/$userId')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        LocalCache.write('portfolio', response.body);
        return PortfolioSummaryModel.fromJson(jsonDecode(response.body));
      }
    } catch (e) {
      autoDiscoverHost();
    }
    return null;
  }

  // Get User Loans History & Active Debt Status
  static Future<Map<String, dynamic>> fetchUserLoans(String userId) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/bank/loans/$userId'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'loans': [], 'activeLoan': null};
    } catch (e) {
      autoDiscoverHost();
      return {'loans': [], 'activeLoan': null};
    }
  }

  // Apply Central Bank Loan (with Tenor, Interest, and Terms Agreement)
  static Future<Map<String, dynamic>> applyLoan({
    required String userId,
    required double amount,
    int tenorDays = 7,
    bool agreedToTerms = true,
    String? collateralType,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/bank/loan/apply'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'amount': amount,
          'tenorDays': tenorDays,
          'agreedToTerms': agreedToTerms,
          'collateralType': collateralType ?? 'ASET_DAN_SAHAM_PT',
        }),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal mengajukan pinjaman: Gangguan koneksi'};
    }
  }

  // Repay Loan (Cicilan / Pelunasan Hutang Bank Sentral)
  static Future<Map<String, dynamic>> repayLoan({
    required String loanId,
    required String userId,
    String type = 'FULL',
    double? amount,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/bank/loan/repay'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'loanId': loanId,
          'userId': userId,
          'type': type,
          if (amount != null) 'amount': amount,
        }),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal melakukan pembayaran hutang: Gangguan koneksi'};
    }
  }

  // Request Bailout (Pailit & Reinkarnasi)
  static Future<Map<String, dynamic>> requestBailout(String userId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/bank/bailout'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId}),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      autoDiscoverHost();
      return {'error': 'Gagal mengajukan bailout: Gangguan koneksi'};
    }
  }

  // Get Takeover Targets (Kritis)
  static Future<List<CompanyModel>> getTakeoverTargets() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/takeover/targets')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(response.body);
        return list.map((e) => CompanyModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // Negotiate Takeover (dengan Persetujuan Pendiri / Pemegang Saham Terbesar)
  static Future<Map<String, dynamic>> negotiateTakeover({
    required String userId,
    required String companyId,
    required int percentageOffer,
    String offerTier = 'RESCUE_30',
    String paymentSource = 'AUTO',
    String pitchNotes = '',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/takeover/negotiate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'companyId': companyId,
          'percentageOffer': percentageOffer,
          'offerTier': offerTier,
          'paymentSource': paymentSource,
          'pitchNotes': pitchNotes,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal akuisisi: Gangguan koneksi'};
    }
  }

  // Ambil Daftar Proposal Akuisisi (Masuk ke Pendiri & Riwayat Pengajuan)
  static Future<Map<String, dynamic>> getTakeoverProposals(String userId) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/takeover/proposals?userId=$userId'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return {'incoming': [], 'outgoing': []};
  }

  // Keputusan Pendiri atas Proposal Akuisisi (APPROVE / REJECT)
  static Future<Map<String, dynamic>> respondTakeoverProposal({
    required String proposalId,
    required String userId,
    required String decision,
    String note = '',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/takeover/proposals/$proposalId/respond'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'decision': decision,
          'note': note,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memproses keputusan RUPS Pendiri: Gangguan koneksi'};
    }
  }

  // Leaderboard Top 100
  static Future<List<Map<String, dynamic>>> getLeaderboard() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/leaderboard')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        LocalCache.write('leaderboard', response.body);
        return List<Map<String, dynamic>>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return [];
  }

  // Chat Messages
  static Future<List<ChatMessageModel>> getChatMessages() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/chat')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(response.body);
        LocalCache.write('chat', response.body);
        return list.map((e) => ChatMessageModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }

  // Send Chat Message
  static Future<void> sendChatMessage({
    required String userId,
    required String text,
  }) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/api/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'text': text,
        }),
      ).timeout(const Duration(seconds: 20));
    } catch (_) {}
  }

  // Bank Auctions
  static Future<List<dynamic>> getAuctions() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/auctions')).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return [];
  }

  // Tawar atau Tebus Instan Lelang Bank Sitaan
  static Future<Map<String, dynamic>> bidAuction({
    required String userId,
    required String auctionId,
    String action = 'BUYOUT',
    double? bidAmountIb,
    String paymentSource = 'AUTO',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/auctions/bid'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'auctionId': auctionId,
          'action': action,
          if (bidAmountIb != null) 'bidAmountIb': bidAmountIb,
          'paymentSource': paymentSource,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memproses lelang sitaan: Gangguan koneksi'};
    }
  }

  // Real-time Running Trades tape from server
  static Future<List<Map<String, dynamic>>> getRunningTrades() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/market/running-trade')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return [];
  }

  // Fetch corporate actions and market news
  static Future<List<NewsModel>> getNews() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/news')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List;
        LocalCache.write('news', response.body);
        return list.map((item) => NewsModel.fromJson(item)).toList();
      }
    } catch (_) {}
    return [];
  }

  // Active & Upcoming E-IPO Offerings
  static Future<List<Map<String, dynamic>>> getIpoOfferings({String? userId}) async {
    try {
      final uri = Uri.parse('$baseUrl/api/ipo/offerings${userId != null ? '?userId=$userId' : ''}');
      final response = await http.get(uri).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return [];
  }

  // Order E-IPO shares from personal cash balance
  static Future<Map<String, dynamic>> orderIpo({
    required String userId,
    required String ipoId,
    required int lots,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ipo/order'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'ipoId': ipoId,
          'lots': lots,
        }),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memesan E-IPO: Gangguan koneksi'};
    }
  }

  // Trigger immediate listing at 07:00 WIB with ARA ceiling
  static Future<Map<String, dynamic>> listIpoNow({required String ipoId}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ipo/list-now'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ipoId': ipoId}),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mencatatkan IPO di bursa: Gangguan koneksi'};
    }
  }

  // Register Player PT for official IPO
  static Future<Map<String, dynamic>> registerCompanyIpo({
    required String userId,
    required String symbol,
    required String description,
    required String sector,
    required double ipoPrice,
    required double floatingPct,
    int? totalShares,
    String? initialStatus,
    String? bookbuildingDate,
    String? offeringDate,
    String? allotmentDate,
    String? listingDate,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/ipo'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'symbol': symbol,
          'description': description,
          'sector': sector,
          'ipoPrice': ipoPrice,
          'floatingPct': floatingPct,
          if (totalShares != null) 'totalShares': totalShares,
          if (initialStatus != null) 'initialStatus': initialStatus,
          if (bookbuildingDate != null) 'bookbuildingDate': bookbuildingDate,
          if (offeringDate != null) 'offeringDate': offeringDate,
          if (allotmentDate != null) 'allotmentDate': allotmentDate,
          if (listingDate != null) 'listingDate': listingDate,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mendaftarkan IPO PT: Gangguan koneksi'};
    }
  }

  // Transisi Tahapan Status E-IPO (Bookbuilding -> Offering -> Allotment -> Listed ARA)
  static Future<Map<String, dynamic>> advanceIpoStatus({
    required String ipoId,
    required String status,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ipo/advance-status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ipoId': ipoId,
          'status': status,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memperbarui tahapan E-IPO'};
    }
  }

  // Update Jadwal Tanggal 4 Tahap E-IPO
  static Future<Map<String, dynamic>> updateIpoSchedule({
    required String ipoId,
    String? userId,
    String? bookbuildingDate,
    String? offeringDate,
    String? allotmentDate,
    String? listingDate,
    String? status,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ipo/update-schedule'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ipoId': ipoId,
          if (userId != null) 'userId': userId,
          if (bookbuildingDate != null) 'bookbuildingDate': bookbuildingDate,
          if (offeringDate != null) 'offeringDate': offeringDate,
          if (allotmentDate != null) 'allotmentDate': allotmentDate,
          if (listingDate != null) 'listingDate': listingDate,
          if (status != null) 'status': status,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memperbarui jadwal E-IPO'};
    }
  }

  // Suspend company stock (IPMC Regulatory Action)
  static Future<Map<String, dynamic>> suspendCompany({
    required String companyId,
    String? reason,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/suspend'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'companyId': companyId,
          'reason': reason,
        }),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal melakukan suspensi saham: Gangguan koneksi'};
    }
  }

  // Lift company stock suspension (Pay IPMC penalty fine)
  static Future<Map<String, dynamic>> unsuspendCompany({
    required String companyId,
    required String userId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/unsuspend'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'companyId': companyId,
          'userId': userId,
        }),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mencabut suspensi: Gangguan koneksi'};
    }
  }

  // Penjualan Darurat Saham Pendiri (Diskon 50%) untuk Buka Suspensi & Lunasi Denda IPMC
  static Future<Map<String, dynamic>> emergencySaleCompany({
    required String companyId,
    required String userId,
    double pctToSell = 20.0,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/emergency-sale'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'companyId': companyId,
          'userId': userId,
          'pctToSell': pctToSell,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal melakukan penjualan darurat: Gangguan koneksi'};
    }
  }

  // Aksi Perang Korporasi (Corporate Warfare)
  static Future<Map<String, dynamic>> corporateWarfare({
    required String userId,
    required String targetCompanyId,
    required String actionType,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/corporate/warfare'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'targetCompanyId': targetCompanyId,
          'actionType': actionType,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal melancarkan perang korporasi: Gangguan koneksi'};
    }
  }

  // Ambil daftar kandidat pemain untuk transaksi saham P2P
  static Future<List<dynamic>> getCandidateBuyers() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/users/list-candidates'))
          .timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // Eksekusi Akta Perjanjian Jual Beli Saham (P2P Private Placement / Divestasi)
  static Future<Map<String, dynamic>> executePrivateDeal({
    required String sellerUserId,
    required String companyId,
    required String buyerUserId,
    required double percentage,
    required double pricePerShare,
    String? notes,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/company/negotiation/deal'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'sellerUserId': sellerUserId,
          'companyId': companyId,
          'buyerUserId': buyerUserId,
          'percentage': percentage,
          'pricePerShare': pricePerShare,
          if (notes != null) 'notes': notes,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mengeksekusi akta perjanjian: Gangguan koneksi ke server'};
    }
  }

  // Indikator Makroekonomi Republik Federasi & IPMC
  static Future<Map<String, dynamic>?> getFederationMacro() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/federation/macro')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  // Daftar Perkara Sidang Pengadilan Niaga Federasi (PNAF)
  static Future<List<Map<String, dynamic>>> getCourtCases() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/court/cases')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return [];
  }

  // Detail Ruang Sidang Live PNAF (termasuk riwayat chat argumen & status putusan)
  static Future<Map<String, dynamic>?> getCourtRoomDetail(String caseId) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/court/room/$caseId'))
          .timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return null;
  }

  // Status Majelis Hakim Bot Otomatis PNAF (ON/OFF)
  static Future<Map<String, dynamic>?> getCourtAutoJudgeStatus() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/court/auto-judge/status'))
          .timeout(const Duration(seconds: 6));
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return null;
  }

  // Sakelar ON/OFF Majelis Hakim Bot Otomatis PNAF (Otomatis <-> Manual)
  static Future<Map<String, dynamic>> toggleCourtAutoJudge(bool enabled) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/court/auto-judge/toggle'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'enabled': enabled}),
          )
          .timeout(const Duration(seconds: 6));
      return Map<String, dynamic>.from(jsonDecode(response.body));
    } catch (e) {
      return {'error': 'Gagal mengubah mode Majelis Hakim: Gangguan koneksi'};
    }
  }

  // Picu Putusan Instan oleh Majelis Hakim Bot PNAF
  static Future<Map<String, dynamic>> processCourtAutoJudgeNow({String? caseId}) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/court/auto-judge/process-now'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({if (caseId != null) 'caseId': caseId}),
          )
          .timeout(const Duration(seconds: 8));
      return Map<String, dynamic>.from(jsonDecode(response.body));
    } catch (e) {
      return {'error': 'Gagal memicu putusan Majelis Hakim: Gangguan koneksi'};
    }
  }

  // User Inbox (Notifikasi P2P, Sidang PNAF, Notariat, dsb)
  static Future<Map<String, dynamic>> getUserInbox({String? userId, String? category}) async {
    try {
      final uid = userId ?? await LocalCache.getUserId();
      final uri = Uri.parse('$baseUrl/api/user/inbox');
      final queryParams = <String, String>{};
      if (uid != null && uid.isNotEmpty) queryParams['userId'] = uid;
      if (category != null && category.isNotEmpty) queryParams['category'] = category;
      
      final url = queryParams.isEmpty ? uri : uri.replace(queryParameters: queryParams);
      final res = await http.get(url).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        return Map<String, dynamic>.from(jsonDecode(res.body));
      }
    } catch (_) {}
    return {'messages': [], 'unreadCount': 0};
  }

  static Future<bool> markInboxRead({String? userId, String? messageId}) async {
    try {
      final uid = userId ?? await LocalCache.getUserId();
      final res = await http.post(
        Uri.parse('$baseUrl/api/user/inbox/read'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          if (uid != null) 'userId': uid,
          if (messageId != null) 'messageId': messageId,
        }),
      ).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> deleteInboxMessage(String messageId, {String? userId}) async {
    try {
      final uid = userId ?? await LocalCache.getUserId();
      final uri = Uri.parse('$baseUrl/api/user/inbox/$messageId');
      final url = uid != null ? uri.replace(queryParameters: {'userId': uid}) : uri;
      final res = await http.delete(url).timeout(const Duration(seconds: 8));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // Ketuk Palu Putusan Sidang PNAF (Admin / Hakim Agung / Evaluasi Bot)
  static Future<Map<String, dynamic>> issueCourtVerdict({
    required String caseId,
    String? verdictStatus,
    String? forcedVerdictType,
    String? verdictNotes,
    double? awardedAmount,
    String? userId,
    bool adminJudgeOverride = false,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/court/room/verdict'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'caseId': caseId,
              if (verdictStatus != null) 'verdictStatus': verdictStatus,
              if (forcedVerdictType != null) 'forcedVerdictType': forcedVerdictType,
              if (verdictNotes != null) 'verdictNotes': verdictNotes,
              if (awardedAmount != null) 'awardedAmount': awardedAmount,
              if (userId != null) 'userId': userId,
              'adminJudgeOverride': adminJudgeOverride,
            }),
          )
          .timeout(const Duration(seconds: 8));
      return Map<String, dynamic>.from(jsonDecode(response.body));
    } catch (e) {
      return {'error': 'Gagal mengetuk palu putusan PNAF: Gangguan koneksi'};
    }
  }

  // Pendaftaran Pengaduan / Gugatan Sidang ke PNAF
  static Future<Map<String, dynamic>> fileCourtCase({
    required String plaintiffName,
    String? plaintiffUserId,
    required String defendantName,
    String? defendantUserId,
    String? defendantCompanyId,
    required String caseType,
    required String title,
    required double claimAmountIb,
    String? hearingDate,
    String? notes,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/court/file-case'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'plaintiffName': plaintiffName,
          if (plaintiffUserId != null) 'plaintiffUserId': plaintiffUserId,
          'defendantName': defendantName,
          if (defendantUserId != null) 'defendantUserId': defendantUserId,
          if (defendantCompanyId != null) 'defendantCompanyId': defendantCompanyId,
          'caseType': caseType,
          'title': title,
          'claimAmountIb': claimAmountIb,
          if (hearingDate != null) 'hearingDate': hearingDate,
          if (notes != null) 'notes': notes,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mendaftarkan gugatan ke PNAF: Gangguan koneksi'};
    }
  }

  // Daftar Proposal Bidding Pre-IPO Masuk
  static Future<List<Map<String, dynamic>>> getIpoBids(String ipoId) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/ipo/bids/$ipoId')).timeout(const Duration(seconds: 20));
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(response.body));
      }
    } catch (_) {}
    return [];
  }

  // Perusahaan Lain Mengajukan Tawaran Saham Pre-IPO (Bidding)
  static Future<Map<String, dynamic>> submitIpoBid({
    required String ipoId,
    required String bidderUserId,
    required double requestedPercentage,
    String? strategicPitch,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ipo/bid'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ipoId': ipoId,
          'bidderUserId': bidderUserId,
          'requestedPercentage': requestedPercentage,
          'strategicPitch': strategicPitch,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mengirimkan proposal bidding: Gangguan koneksi'};
    }
  }

  // Seleksi Penjatahan Mitra IPO oleh Direksi Emiten (Allotment)
  static Future<Map<String, dynamic>> submitIpoAllotment({
    required String ipoId,
    required String issuerUserId,
    required List<String> acceptedBidIds,
    required List<String> rejectedBidIds,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ipo/allotment'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'ipoId': ipoId,
          'issuerUserId': issuerUserId,
          'acceptedBidIds': acceptedBidIds,
          'rejectedBidIds': rejectedBidIds,
        }),
      ).timeout(const Duration(seconds: 8));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memproses penjatahan mitra: Gangguan koneksi'};
    }
  }

  // --- BUKU KAS & RIWAYAT MUTASI TRANSPARAN (CASH FLOW LEDGER) ---
  static Future<Map<String, dynamic>> getCashFlowLedger({
    required String userId,
    String? accountType,
    String? companyId,
    String? direction,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      String queryParams = 'limit=$limit&offset=$offset';
      if (accountType != null && accountType.isNotEmpty) queryParams += '&accountType=$accountType';
      if (companyId != null && companyId.isNotEmpty) queryParams += '&companyId=$companyId';
      if (direction != null && direction.isNotEmpty) queryParams += '&direction=$direction';

      final response = await http
          .get(Uri.parse('$baseUrl/api/ledger/user/$userId?$queryParams'))
          .timeout(const Duration(seconds: 6));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'success': false, 'ledger': [], 'summary': {}};
    } catch (e) {
      return {'success': false, 'ledger': [], 'summary': {}, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getCompanyLedger({
    required String companyId,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/ledger/company/$companyId?limit=$limit&offset=$offset'))
          .timeout(const Duration(seconds: 6));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return {'success': false, 'ledger': []};
    } catch (e) {
      return {'success': false, 'ledger': [], 'error': e.toString()};
    }
  }

  // --- ANTREAN ORDERBOOK & LIMIT ORDER MATCHING ---
  static Future<Map<String, dynamic>> createLimitOrder({
    required String userId,
    required String companyId,
    required String orderType,
    required int price,
    required int lots,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/trade-orders/limit-order'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'companyId': companyId,
          'orderType': orderType,
          'price': price,
          'lots': lots,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memasang antrean order: Gangguan jaringan'};
    }
  }

  static Future<List<dynamic>> getMyOrders(String userId) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/trade-orders/my/$userId'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['orders'] ?? [];
      }
    } catch (e) {
      debugPrint('Error fetching orders: $e');
    }
    return [];
  }

  static Future<Map<String, dynamic>> cancelLimitOrder({
    required String userId,
    required String orderId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/trade-orders/cancel-order'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'orderId': orderId}),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal membatalkan antrean order'};
    }
  }

  static Future<Map<String, dynamic>> getActiveOrderSummary({
    required String companyId,
    required String userId,
  }) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/trade-orders/active-summary/$companyId/$userId'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      debugPrint('Error getting active order summary: $e');
    }
    return {'bids': {}, 'offers': {}, 'totalMyBidLots': 0, 'totalMyOfferLots': 0, 'orders': []};
  }

  // ==========================================
  // 4 PILAR KEBIJAKAN EKONOMI STRATEGIS NEGARA
  // ==========================================

  // 1. Ambil Katalog Seri Obligasi Negara Aktif (ORI & SBR)
  static Future<List<dynamic>> getActiveBonds() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/bonds/active'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
    } catch (e) {
      debugPrint('Error fetching active bonds: $e');
    }
    return [];
  }

  // Beli Obligasi Negara menggunakan Kas Pribadi
  static Future<Map<String, dynamic>> orderBond({
    required String userId,
    required String bondId,
    required int units,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/bonds/order'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'bondId': bondId,
          'units': units,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal melakukan pemesanan obligasi negara'};
    }
  }

  // Ambil Portofolio Surat Utang Pemain
  static Future<List<dynamic>> getMyBonds(String userId) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/bonds/my-holdings/$userId'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
    } catch (e) {
      debugPrint('Error fetching my bonds: $e');
    }
    return [];
  }

  // 2. Ambil Status Subsidi Sektoral Aktif & Tax Holiday
  static Future<List<dynamic>> getActiveSubsidies() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/subsidies/status'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
    } catch (e) {
      debugPrint('Error fetching subsidies: $e');
    }
    return [];
  }

  // 3. Ambil Katalog Tender Pengadaan Mega-Proyek Pemerintah
  static Future<List<dynamic>> getGovernmentTenders({String? userId}) async {
    try {
      final uri = (userId != null && userId.isNotEmpty)
          ? Uri.parse('$baseUrl/api/tenders/list?userId=$userId')
          : Uri.parse('$baseUrl/api/tenders/list');
      final response = await http
          .get(uri)
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
    } catch (e) {
      debugPrint('Error fetching government tenders: $e');
    }
    return [];
  }

  // PT Mengajukan Proposal Bidding Tender
  static Future<Map<String, dynamic>> submitTenderBid({
    required String tenderId,
    required String userId,
    String? companyId,
    String? pitch,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/tenders/bid'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'tenderId': tenderId,
          'userId': userId,
          'companyId': companyId,
          'bidPitch': pitch,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mengajukan proposal tender'};
    }
  }

  static Future<Map<String, dynamic>> updateProfile({
    required String userId,
    required String username,
    required String email,
    String? newPassword,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/user/profile/update'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'username': username,
          'email': email,
          if (newPassword != null && newPassword.isNotEmpty) 'newPassword': newPassword,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memperbarui profil: $e'};
    }
  }

  // Verifikasi Alamat Email
  static Future<Map<String, dynamic>> sendEmailVerification({
    required String userId,
    required String email,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/user/email/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'email': email,
        }),
      ).timeout(const Duration(seconds: 6));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal memproses verifikasi email: $e'};
    }
  }

  // Profil Publik Eksekutif Pemain Lain (Leaderboard / Chat Global)
  static Future<Map<String, dynamic>> getPublicPlayerProfile(String userId) async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/user/public-profile/$userId'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      final errData = jsonDecode(response.body);
      return {'error': errData['error'] ?? 'Gagal memuat profil publik'};
    } catch (e) {
      return {'error': 'Gangguan koneksi ke server bursa: $e'};
    }
  }

  // Registrasi Device Token FCM untuk Push Notification PNAF & Bursa
  static Future<Map<String, dynamic>> registerFcmToken({required String token, String? userId}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/user/fcm-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fcmToken': token,
          if (userId != null) 'userId': userId,
        }),
      ).timeout(const Duration(seconds: 5));
      return jsonDecode(response.body);
    } catch (e) {
      return {'error': 'Gagal mendaftarkan FCM device token: $e'};
    }
  }
}


