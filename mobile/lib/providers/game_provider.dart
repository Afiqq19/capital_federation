import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/company.dart';
import '../models/portfolio.dart';
import '../models/news.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class GameProvider extends ChangeNotifier {
  UserModel? _user;
  List<CompanyModel> _companies = [];
  PortfolioSummaryModel? _portfolio;
  final List<NewsModel> _newsList = [];
  List<ChatMessageModel> _chatMessages = [];
  List<Map<String, dynamic>> _leaderboard = [];
  List<Map<String, dynamic>> _conglomerate = [];
  final Map<String, List<Map<String, dynamic>>> _shareholders = {};
  Map<String, dynamic>? _marketOverview;
  List<Map<String, dynamic>> _runningTrades = [];
  List<Map<String, dynamic>> _ipoOfferings = [];
  bool _isLoading = false;
  String _selectedSector = 'ALL';
  List<Map<String, dynamic>> _userLoans = [];
  Map<String, dynamic>? _activeLoan;
  double _centralBankInterestRate = 6.5;
  int _cashFlowIntervalMinutes = 25;
  double _corporateTaxRatePct = 10.0;
  List<Map<String, dynamic>> _activeBonds = [];
  List<Map<String, dynamic>> _myBondHoldings = [];
  List<Map<String, dynamic>> _activeSubsidies = [];
  List<Map<String, dynamic>> _governmentTenders = [];

  List<Map<String, dynamic>> get userLoans => _userLoans;
  Map<String, dynamic>? get activeLoan => _activeLoan;
  bool get hasActiveLoan => _activeLoan != null;
  int get cashFlowIntervalMinutes => _cashFlowIntervalMinutes;
  double get corporateTaxRatePct => _corporateTaxRatePct;
  List<Map<String, dynamic>> get activeBonds => _activeBonds;
  List<Map<String, dynamic>> get myBondHoldings => _myBondHoldings;
  List<Map<String, dynamic>> get activeSubsidies => _activeSubsidies;
  List<Map<String, dynamic>> get governmentTenders => _governmentTenders;

  UserModel? get user => _user;
  List<CompanyModel> get companies => _companies;
  PortfolioSummaryModel? get portfolio => _portfolio;
  List<NewsModel> get newsList => _newsList;
  List<ChatMessageModel> get chatMessages => _chatMessages;
  List<Map<String, dynamic>> get leaderboard => _leaderboard;
  List<Map<String, dynamic>> get conglomerate => _conglomerate;
  Map<String, List<Map<String, dynamic>>> get shareholders => _shareholders;
  List<Map<String, dynamic>> getShareholdersFor(String companyId) => _shareholders[companyId] ?? [];
  Map<String, dynamic>? get marketOverview => _marketOverview;
  List<Map<String, dynamic>> get runningTrades => _runningTrades;
  List<Map<String, dynamic>> get ipoOfferings => _ipoOfferings;
  bool get isLoading => _isLoading;
  String get selectedSector => _selectedSector;
  Map<String, dynamic>? get conglomerateData => _conglomerate.isNotEmpty ? {'primaryCompany': _conglomerate.first} : null;
  Future<void> fetchUserData() => refreshPortfolio();
  bool get hasUser => _user != null;
  double get centralBankInterestRate => _centralBankInterestRate;

  List<CompanyModel> get filteredCompanies {
    if (_selectedSector == 'ALL') return _companies;
    return _companies.where((c) => c.sector == _selectedSector).toList();
  }

  void setSector(String sector) {
    _selectedSector = sector;
    notifyListeners();
  }

  Future<void> initGame() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Auto discover host (ADB reverse, LAN Wi-Fi, or localhost)
      await ApiService.autoDiscoverHost();

      final prefs = await SharedPreferences.getInstance();
      final savedUsername = prefs.getString('saved_username');
      final savedPassword = prefs.getString('saved_password') ?? 'password123';

      // Auto login user if previously registered/logged in
      if (savedUsername != null) {
        final res = await ApiService.login(username: savedUsername, password: savedPassword);
        if (res['user'] != null) {
          _user = UserModel.fromJson(res['user']);
        }
      }

      await loadInitialData();
      _initSocket();
      if (_user != null) {
        SocketService.joinUser(_user!.id);
      }
    } catch (e) {
      debugPrint('Initialization warning: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _initSocket() {
    SocketService.init(
      onMarketTicker: (tickerList) {
        final Map<String, dynamic> tickerMap = {
          for (var item in tickerList) item['id']: item
        };

        _companies = _companies.map((c) {
          if (tickerMap.containsKey(c.id)) {
            final data = tickerMap[c.id];
            OrderbookModel? ob;
            if (data['orderbook'] != null && data['orderbook'] is Map) {
              try {
                ob = OrderbookModel.fromJson(Map<String, dynamic>.from(data['orderbook']));
              } catch (_) {}
            }
            return c.copyWith(
              currentPrice: (data['current_price'] ?? c.currentPrice).toDouble(),
              basePrice: (data['base_price'] ?? c.basePrice).toDouble(),
              priceChangePct: (data['price_change_pct'] ?? c.priceChangePct).toDouble(),
              status: data['status'] ?? c.status,
              orderbook: ob ?? c.orderbook,
            );
          }
          return c;
        }).toList();

        notifyListeners();
      },
      onNewsBroadcast: (data) {
        _newsList.insert(0, NewsModel.fromJson(data));
        notifyListeners();
      },
      onMarketOverview: (data) {
        if (data is Map<String, dynamic>) {
          _marketOverview = data;
          notifyListeners();
        } else if (data is Map) {
          _marketOverview = Map<String, dynamic>.from(data);
          notifyListeners();
        }
      },
      onChatMessage: (data) {
        _chatMessages.add(ChatMessageModel.fromJson(data));
        notifyListeners();
      },
      onTradeExecuted: (data) {
        if (_user != null) {
          refreshPortfolio();
        }
      },
      onRunningTrade: (data) {
        if (data is Map) {
          final trade = Map<String, dynamic>.from(data);
          _runningTrades.insert(0, trade);
          if (_runningTrades.length > 100) {
            _runningTrades.removeLast();
          }
          notifyListeners();
        }
      },
      onIpoUpdated: (data) {
        fetchIpoOfferings();
      },
      onSettingsUpdated: (data) {
        if (data is Map) {
          if (data['interestRate'] != null) {
            _centralBankInterestRate = (data['interestRate'] as num).toDouble();
            notifyListeners();
          } else if (data['interest_rate'] != null) {
            _centralBankInterestRate = double.tryParse(data['interest_rate'].toString()) ?? _centralBankInterestRate;
            notifyListeners();
          }
          if (data['cash_flow_interval_minutes'] != null) {
            _cashFlowIntervalMinutes = int.tryParse(data['cash_flow_interval_minutes'].toString()) ?? _cashFlowIntervalMinutes;
            notifyListeners();
          }
          if (data['corporate_tax_rate_pct'] != null) {
            _corporateTaxRatePct = double.tryParse(data['corporate_tax_rate_pct'].toString()) ?? _corporateTaxRatePct;
            notifyListeners();
          }
        }
      },
      onBalanceUpdated: (data) {
        if (data is Map && _user != null && data['userId'] == _user!.id) {
          refreshPortfolio();
        }
      },
      onCompanyRevenue: (data) {
        if (_user != null) {
          refreshPortfolio();
        }
      },
      onCompanyStatusChanged: (data) {
        if (data is Map) {
          final compId = data['companyId']?.toString();
          final newStatus = data['status']?.toString();
          if (compId != null && newStatus != null) {
            _companies = _companies.map((c) {
              if (c.id == compId) {
                return c.copyWith(status: newStatus);
              }
              return c;
            }).toList();
            notifyListeners();
          }
        }
      },
      onUmaChanged: (data) {
        if (data is Map) {
          final compId = data['companyId']?.toString();
          final isUma = data['uma'] == true || data['uma'] == 1;
          final direction = data['direction']?.toString();
          final reason = data['reason']?.toString();
          if (compId != null) {
            _companies = _companies.map((c) {
              if (c.id == compId) {
                return c.copyWith(
                  isUma: isUma,
                  umaDirection: direction,
                  umaReason: reason,
                );
              }
              return c;
            }).toList();
            notifyListeners();
          }
        }
      },
      onBondsUpdated: (data) {
        fetchBonds();
        if (_user != null) refreshPortfolio();
      },
      onSubsidiesUpdated: (data) {
        fetchSubsidies();
      },
      onTendersUpdated: (data) {
        fetchTenders();
      },
      onDebtReliefUpdated: (data) {
        if (_user != null) {
          refreshPortfolio();
          fetchUserLoans();
        }
      },
    );
  }

  Future<void> loadInitialData() async {
    final results = await Future.wait([
      ApiService.getCompanies(),
      ApiService.getMarketOverview(),
      ApiService.getChatMessages(),
      ApiService.getLeaderboard(),
      ApiService.getRunningTrades(),
      ApiService.getIpoOfferings(userId: _user?.id),
      ApiService.getNews(),
      ApiService.getSettings(),
    ]);

    _companies = results[0] as List<CompanyModel>;
    if (results[1] != null) {
      _marketOverview = results[1] as Map<String, dynamic>;
    }
    _chatMessages = results[2] as List<ChatMessageModel>;
    _leaderboard = results[3] as List<Map<String, dynamic>>;
    _runningTrades = results[4] as List<Map<String, dynamic>>;
    _ipoOfferings = results[5] as List<Map<String, dynamic>>;
    final fetchedNews = results[6] as List<NewsModel>;
    if (fetchedNews.isNotEmpty) {
      _newsList.clear();
      _newsList.addAll(fetchedNews);
    }
    final fetchedSettings = results[7] as Map<String, dynamic>?;
    if (fetchedSettings != null) {
      if (fetchedSettings['interest_rate'] != null) {
        _centralBankInterestRate = double.tryParse(fetchedSettings['interest_rate'].toString()) ?? _centralBankInterestRate;
      }
      if (fetchedSettings['cash_flow_interval_minutes'] != null) {
        _cashFlowIntervalMinutes = int.tryParse(fetchedSettings['cash_flow_interval_minutes'].toString()) ?? 25;
      }
      if (fetchedSettings['corporate_tax_rate_pct'] != null) {
        _corporateTaxRatePct = double.tryParse(fetchedSettings['corporate_tax_rate_pct'].toString()) ?? 10.0;
      }
    }

    await fetchBonds();
    await fetchSubsidies();
    await fetchTenders();

    if (_user != null) {
      await refreshPortfolio();
      await fetchConglomerate();
    }
    notifyListeners();
  }

  Future<void> fetchNews() async {
    try {
      final list = await ApiService.getNews();
      if (list.isNotEmpty) {
        _newsList.clear();
        _newsList.addAll(list);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> fetchConglomerate() async {
    if (_user == null) return;
    try {
      final list = await ApiService.getConglomerate(_user!.id);
      _conglomerate = list;
      // Fetch shareholders for each company in background
      for (final comp in list) {
        final cid = comp['companyDbId']?.toString() ?? comp['id']?.toString() ?? 'primary';
        try {
          final shList = await ApiService.getShareholders(companyId: cid, userId: _user!.id);
          _shareholders[cid] = shList;
        } catch (_) {}
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching conglomerate: $e');
    }
  }

  Future<void> refreshPortfolio() async {
    if (_user == null) return;
    final p = await ApiService.getPortfolio(_user!.id);
    if (p != null) {
      _portfolio = p;
      _centralBankInterestRate = p.centralBankInterestRate;
      _user = _user!.copyWith(
        balanceIb: p.cashBalance,
        companyBalanceIb: p.companyBalance,
        hasPt: p.hasPt,
        ptName: p.ptName.isNotEmpty ? p.ptName : _user!.ptName,
        sector: p.sector.isNotEmpty ? p.sector : _user!.sector,
        isIpo: p.isIpo,
        rdLevel: p.rdLevel,
        marketingLevel: p.marketingLevel,
        hrLevel: p.hrLevel,
        capacityLevel: p.capacityLevel,
        employeesCount: p.employeesCount,
        ceoLevel: p.ceoLevel,
        cfoLevel: p.cfoLevel,
        cmoLevel: p.cmoLevel,
        ptLevel: p.ptLevel,
        creditScore: p.creditScore,
        isBlueChip: p.isBlueChip,
      );
    }
    await fetchConglomerate();
    await fetchUserLoans();
    notifyListeners();
  }

  // Register New User
  Future<String?> registerUser({
    required String username,
    required String password,
    String? ptName,
    String? sector,
  }) async {
    try {
      final res = await ApiService.register(
        username: username,
        password: password,
        ptName: ptName,
        sector: sector,
      );

      if (res['user'] != null) {
        _user = UserModel.fromJson(res['user']);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('saved_username', username);
        await prefs.setString('saved_password', password);
        await loadInitialData();
        return null;
      } else {
        return res['error'] ?? 'Gagal mendaftar akun';
      }
    } catch (e) {
      return e.toString();
    }
  }

  // Login Existing User
  Future<String?> loginUser({required String username, required String password}) async {
    try {
      final res = await ApiService.login(username: username, password: password);
      if (res['user'] != null) {
        _user = UserModel.fromJson(res['user']);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('saved_username', username);
        await prefs.setString('saved_password', password);
        await loadInitialData();
        if (_user != null) {
          SocketService.joinUser(_user!.id);
        }
        return null;
      } else {
        return res['error'] ?? 'Username atau kata sandi salah';
      }
    } catch (e) {
      return e.toString();
    }
  }

  // Login as Demo / Guest Player
  Future<void> loginAsGuest() async {
    final res = await ApiService.login(username: 'sultan_budi', password: 'player123');
    if (res['user'] != null) {
      _user = UserModel.fromJson(res['user']);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('saved_username', 'sultan_budi');
      await prefs.setString('saved_password', 'player123');
      await loadInitialData();
      if (_user != null) {
        SocketService.joinUser(_user!.id);
      }
    }
  }

  // Logout / Switch Account
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('saved_username');
    await prefs.remove('saved_password');
    _user = null;
    _portfolio = null;
    notifyListeners();
  }

  // Mendirikan PT Pertama / Anak Perusahaan Baru
  Future<String?> foundCompany({
    required String ptName,
    required String symbol,
    required String sector,
    required String description,
    bool isSubsidiary = false,
    bool agreedToTerms = true,
  }) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.foundCompany(
        userId: _user!.id,
        ptName: ptName,
        symbol: symbol,
        sector: sector,
        description: description,
        isSubsidiary: isSubsidiary,
        agreedToTerms: agreedToTerms,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        await loadInitialData();
        return null;
      }
      return res['error'] ?? 'Gagal mendirikan PT';
    } catch (e) {
      return 'Gagal mendirikan PT: Gangguan koneksi ke server.';
    }
  }

  // Suntik Modal Kas Pribadi -> Kas Perusahaan
  Future<String?> fundCompany(double amount, {String? companyId}) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.fundCompany(userId: _user!.id, amount: amount, companyId: companyId);
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        await loadInitialData();
        return null;
      }
      return res['error'] ?? 'Gagal menyuntik modal';
    } catch (e) {
      return 'Gagal menyuntik modal: Gangguan koneksi ke server.';
    }
  }

  // Tarik Dividen / Prive Kas Perusahaan -> Kas Pribadi
  Future<String?> withdrawCompany(double amount, {String? companyId}) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.withdrawCompany(userId: _user!.id, amount: amount, companyId: companyId);
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        await loadInitialData();
        return null;
      }
      return res['error'] ?? 'Gagal menarik dividen';
    } catch (e) {
      return 'Gagal menarik dana: Gangguan koneksi ke server.';
    }
  }

  // Upgrade Bisnis & R&D
  Future<String?> upgradeBusiness(String type, {String? companyId}) async {
    if (_user == null) return 'User error';
    try {
      final res = await ApiService.upgradeCompany(userId: _user!.id, type: type, companyId: companyId);
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        return null;
      }
      return res['error'] ?? 'Gagal upgrade';
    } catch (e) {
      return 'Gagal upgrade: Gangguan koneksi ke server.';
    }
  }

  // Rekrut Tim & Direksi PT (Bisa untuk PT Utama maupun PT Hasil Akuisisi)
  Future<String?> hireStaff(String type, {String? companyId}) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.hireStaff(userId: _user!.id, type: type, companyId: companyId);
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        return null;
      }
      return res['error'] ?? 'Gagal merekrut';
    } catch (e) {
      return 'Gagal merekrut: Gangguan koneksi ke server.';
    }
  }

  // Ubah Nama PT / Rebranding Emiten (Biaya Legalitas, Notaris & Audit Tim Penyidikan IB 25.000.000)
  Future<String?> renameCompany({
    required String companyId,
    required String newName,
    String? newSymbol,
    String? description,
    String? sector,
  }) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.renameCompany(
        userId: _user!.id,
        companyId: companyId,
        newName: newName,
        newSymbol: newSymbol,
        description: description,
        sector: sector,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        await loadInitialData();
        return null;
      }
      return res['error'] ?? 'Gagal mengubah nama PT';
    } catch (e) {
      return 'Gagal mengubah nama PT: Gangguan koneksi ke server.';
    }
  }

  // Launching IPO dengan Formulir Prospektus Lengkap
  Future<String?> ipoCompany({
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
    if (_user == null) return 'User error';
    try {
      final res = await ApiService.ipoCompany(
        userId: _user!.id,
        companyId: companyId,
        symbol: symbol,
        description: description,
        sector: sector,
        ipoPrice: ipoPrice,
        floatingPct: floatingPct,
        totalShares: totalShares,
        initialStatus: initialStatus,
        bookbuildingDate: bookbuildingDate,
        offeringDate: offeringDate,
        allotmentDate: allotmentDate,
        listingDate: listingDate,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        await fetchIpoOfferings();
        await loadInitialData();
        return null;
      }
      return res['error'] ?? 'Gagal IPO';
    } catch (e) {
      return 'Gagal IPO: Gangguan koneksi ke server.';
    }
  }

  // Divestasi / Jual Sebagian Saham Perusahaan ke Institusi
  Future<String?> divestCompany({
    required String companyId,
    required double pctToSell,
  }) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.divestCompany(
        userId: _user!.id,
        companyId: companyId,
        pctToSell: pctToSell,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        await loadInitialData();
        return null;
      }
      return res['error'] ?? 'Gagal melakukan divestasi';
    } catch (e) {
      return 'Gagal melakukan divestasi: Gangguan koneksi ke server.';
    }
  }

  // Mengambil Cap Table Pemegang Saham dengan Cache
  Future<List<Map<String, dynamic>>> getShareholders(String companyId, {bool forceRefresh = false}) async {
    if (_user == null) return [];
    if (!forceRefresh && _shareholders.containsKey(companyId) && _shareholders[companyId]!.isNotEmpty) {
      return _shareholders[companyId]!;
    }
    try {
      final list = await ApiService.getShareholders(companyId: companyId, userId: _user!.id);
      _shareholders[companyId] = list;
      notifyListeners();
      return list;
    } catch (e) {
      return _shareholders[companyId] ?? [];
    }
  }

  Future<String?> buyStock({required String companyId, required int lots}) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.executeOrder(
        userId: _user!.id,
        companyId: companyId,
        type: 'BUY',
        lots: lots,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchRunningTrades();
        return null;
      }
      return res['error'] ?? 'Gagal membeli saham';
    } catch (e) {
      return 'Gagal membeli saham: Koneksi ke server terputus.';
    }
  }

  Future<String?> sellStock({required String companyId, required int lots}) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.executeOrder(
        userId: _user!.id,
        companyId: companyId,
        type: 'SELL',
        lots: lots,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchRunningTrades();
        return null;
      }
      return res['error'] ?? 'Gagal menjual saham';
    } catch (e) {
      return 'Gagal menjual saham: Koneksi ke server terputus.';
    }
  }

  Future<Map<String, dynamic>> takeoverCompany({
    required String companyId,
    required int percentage,
    String offerTier = 'RESCUE_30',
    String paymentSource = 'AUTO',
    String pitchNotes = '',
  }) async {
    if (_user == null) return {'error': 'Sesi user belum aktif'};
    try {
      final res = await ApiService.negotiateTakeover(
        userId: _user!.id,
        companyId: companyId,
        percentageOffer: percentage,
        offerTier: offerTier,
        paymentSource: paymentSource,
        pitchNotes: pitchNotes,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await loadInitialData();
        return res;
      }
      return {'error': res['error'] ?? 'Gagal akuisisi'};
    } catch (e) {
      return {'error': 'Gagal akuisisi: Gangguan koneksi ke server.'};
    }
  }

  Future<void> fetchUserLoans() async {
    if (_user == null) return;
    try {
      final res = await ApiService.fetchUserLoans(_user!.id);
      _userLoans = List<Map<String, dynamic>>.from(res['loans'] ?? []);
      _activeLoan = res['activeLoan'] != null ? Map<String, dynamic>.from(res['activeLoan']) : null;
      notifyListeners();
    } catch (e) {
      // silent
    }
  }

  Future<String?> applyBankLoan(double amount, {int tenorDays = 7, bool agreedToTerms = true}) async {
    if (_user == null) return 'User error';
    try {
      final res = await ApiService.applyLoan(
        userId: _user!.id,
        amount: amount,
        tenorDays: tenorDays,
        agreedToTerms: agreedToTerms,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchUserLoans();
        return null;
      }
      return res['error'] ?? 'Gagal meminjam';
    } catch (e) {
      return 'Gagal meminjam: Gangguan koneksi ke server.';
    }
  }

  Future<String?> repayBankLoan(String loanId, {String type = 'FULL', double? amount}) async {
    if (_user == null) return 'User error';
    try {
      final res = await ApiService.repayLoan(
        loanId: loanId,
        userId: _user!.id,
        type: type,
        amount: amount,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchUserLoans();
        return null;
      }
      return res['error'] ?? 'Gagal membayar hutang';
    } catch (e) {
      return 'Gagal membayar hutang: Gangguan koneksi ke server.';
    }
  }

  Future<String?> requestBailout() async {
    if (_user == null) return 'User error';
    try {
      final res = await ApiService.requestBailout(_user!.id);
      if (res['success'] == true) {
        await refreshPortfolio();
        return null;
      }
      return res['error'] ?? 'Gagal mengajukan bailout';
    } catch (e) {
      return 'Gagal mengajukan bailout: Gangguan koneksi ke server.';
    }
  }

  Future<void> sendChatMessage(String text) async {
    if (_user == null || text.trim().isEmpty) return;
    await ApiService.sendChatMessage(userId: _user!.id, text: text.trim());
  }

  Future<void> fetchRunningTrades() async {
    final list = await ApiService.getRunningTrades();
    _runningTrades = list;
    notifyListeners();
  }

  Future<void> fetchIpoOfferings() async {
    final list = await ApiService.getIpoOfferings(userId: _user?.id);
    _ipoOfferings = list;
    notifyListeners();
  }

  Future<String?> orderIpo({required String ipoId, required int lots}) async {
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.orderIpo(userId: _user!.id, ipoId: ipoId, lots: lots);
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchIpoOfferings();
        await fetchRunningTrades();
        return null;
      }
      return res['error'] ?? 'Gagal memesan E-IPO';
    } catch (e) {
      return 'Gagal memesan: Gangguan koneksi ke server.';
    }
  }

  Future<String?> listIpoNow({required String ipoId}) async {
    try {
      final res = await ApiService.listIpoNow(ipoId: ipoId);
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchIpoOfferings();
        final companies = await ApiService.getCompanies();
        _companies = companies;
        notifyListeners();
        return null;
      }
      return res['error'] ?? 'Gagal mencatatkan IPO';
    } catch (e) {
      return 'Gagal listing: Gangguan koneksi ke server.';
    }
  }

  Future<String?> registerCompanyIpo({
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
    if (_user == null) return 'Silakan login terlebih dahulu';
    try {
      final res = await ApiService.registerCompanyIpo(
        userId: _user!.id,
        symbol: symbol,
        description: description,
        sector: sector,
        ipoPrice: ipoPrice,
        floatingPct: floatingPct,
        totalShares: totalShares,
        initialStatus: initialStatus,
        bookbuildingDate: bookbuildingDate,
        offeringDate: offeringDate,
        allotmentDate: allotmentDate,
        listingDate: listingDate,
      );
      if (res['success'] == true) {
        await refreshPortfolio();
        await fetchConglomerate();
        await fetchIpoOfferings();
        final companies = await ApiService.getCompanies();
        _companies = companies;
        notifyListeners();
        return null;
      }
      return res['error'] ?? 'Gagal mendaftarkan IPO PT';
    } catch (e) {
      return 'Gagal pendaftaran: Gangguan koneksi ke server.';
    }
  }

  // Transisi Tahapan Siklus E-IPO (Bookbuilding -> Offering -> Allotment -> Listed ARA)
  Future<String?> advanceIpoStatus({required String ipoId, required String status}) async {
    try {
      final res = await ApiService.advanceIpoStatus(ipoId: ipoId, status: status);
      if (res['success'] == true) {
        await fetchIpoOfferings();
        final companies = await ApiService.getCompanies();
        _companies = companies;
        await refreshPortfolio();
        notifyListeners();
        return null;
      }
      return res['error'] ?? 'Gagal memperbarui tahapan IPO';
    } catch (e) {
      return 'Gagal memperbarui status: Gangguan koneksi ke server.';
    }
  }

  // Update Jadwal Tanggal 4 Tahap E-IPO
  Future<String?> updateIpoSchedule({
    required String ipoId,
    String? bookbuildingDate,
    String? offeringDate,
    String? allotmentDate,
    String? listingDate,
    String? status,
  }) async {
    try {
      final res = await ApiService.updateIpoSchedule(
        ipoId: ipoId,
        userId: _user?.id,
        bookbuildingDate: bookbuildingDate,
        offeringDate: offeringDate,
        allotmentDate: allotmentDate,
        listingDate: listingDate,
        status: status,
      );
      if (res['success'] == true) {
        await fetchIpoOfferings();
        notifyListeners();
        return null;
      }
      return res['error'] ?? 'Gagal memperbarui jadwal E-IPO';
    } catch (e) {
      return 'Gagal memperbarui jadwal: Gangguan koneksi ke server.';
    }
  }

  // Suspend company stock
  Future<Map<String, dynamic>> suspendCompany(String companyId, {String? reason}) async {
    final res = await ApiService.suspendCompany(companyId: companyId, reason: reason);
    if (res['success'] == true) {
      final companies = await ApiService.getCompanies();
      _companies = companies;
      notifyListeners();
    }
    return res;
  }

  // Unsuspend company stock (Bayar Denda Pemulihan IPMC IB 50.000.000)
  Future<Map<String, dynamic>> unsuspendCompany(String companyId) async {
    if (_user == null) return {'error': 'Silakan login terlebih dahulu'};
    final res = await ApiService.unsuspendCompany(companyId: companyId, userId: _user!.id);
    if (res['success'] == true) {
      await refreshPortfolio();
      final companies = await ApiService.getCompanies();
      _companies = companies;
      notifyListeners();
    }
    return res;
  }

  // Penjualan Darurat Saham Pendiri (Diskon 50%) untuk Buka Suspensi & Bayar Denda IPMC
  Future<Map<String, dynamic>> emergencySaleCompany(String companyId, {double pctToSell = 20.0}) async {
    if (_user == null) return {'error': 'Silakan login terlebih dahulu'};
    final res = await ApiService.emergencySaleCompany(companyId: companyId, userId: _user!.id, pctToSell: pctToSell);
    if (res['success'] == true) {
      await refreshPortfolio();
      await fetchConglomerate();
      final companies = await ApiService.getCompanies();
      _companies = companies;
      notifyListeners();
    }
    return res;
  }

  // Aksi Perang Korporasi (Corporate Warfare)
  Future<Map<String, dynamic>> launchCorporateWarfare(String targetCompanyId, String actionType) async {
    if (_user == null) return {'error': 'Silakan login terlebih dahulu'};
    final res = await ApiService.corporateWarfare(userId: _user!.id, targetCompanyId: targetCompanyId, actionType: actionType);
    if (res['success'] == true) {
      await refreshPortfolio();
      final companies = await ApiService.getCompanies();
      _companies = companies;
      notifyListeners();
    }
    return res;
  }

  // --- STRATEGIC PILLARS ACTIONS ---

  // Pilar 1: Ambil Obligasi Pemerintah Aktif & Portofolio Obligasi User
  Future<void> fetchBonds() async {
    try {
      final bonds = await ApiService.getActiveBonds();
      _activeBonds = List<Map<String, dynamic>>.from(bonds);
      if (_user != null) {
        final myBonds = await ApiService.getMyBonds(_user!.id);
        _myBondHoldings = List<Map<String, dynamic>>.from(myBonds);
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching bonds: $e');
    }
  }

  // Beli Surat Utang Negara (ORI/SBR) dengan Saldo Kas Pribadi
  Future<Map<String, dynamic>> orderSovereignBond({
    required String bondId,
    required double units,
  }) async {
    if (_user == null) return {'error': 'Silakan login terlebih dahulu'};
    final res = await ApiService.orderBond(userId: _user!.id, bondId: bondId, units: units.toInt());
    if (res['success'] == true) {
      await refreshPortfolio();
      await fetchBonds();
      notifyListeners();
    }
    return res;
  }

  // Pilar 2: Ambil Status Subsidi & Tax Holiday Sektoral
  Future<void> fetchSubsidies() async {
    try {
      final subs = await ApiService.getActiveSubsidies();
      _activeSubsidies = List<Map<String, dynamic>>.from(subs);
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching subsidies: $e');
    }
  }

  // Pilar 3: Ambil Katalog Tender Mega-Proyek Pemerintah
  Future<void> fetchTenders() async {
    try {
      final tenders = await ApiService.getGovernmentTenders(userId: _user?.id);
      _governmentTenders = List<Map<String, dynamic>>.from(tenders);
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching tenders: $e');
    }
  }

  // Mengajukan Proposal Bidding Proyek Pemerintah oleh PT Player
  Future<Map<String, dynamic>> submitTenderBid({
    required String tenderId,
    String? companyId,
    String? pitch,
  }) async {
    if (_user == null) return {'error': 'Silakan login terlebih dahulu'};
    final res = await ApiService.submitTenderBid(
      tenderId: tenderId,
      userId: _user!.id,
      companyId: companyId,
      pitch: pitch,
    );
    if (res['success'] == true) {
      await fetchTenders();
      await refreshPortfolio();
      notifyListeners();
    }
    return res;
  }

  // Update profil pemain (username, email, & password)
  Future<Map<String, dynamic>> updateUserProfile({
    required String username,
    required String email,
    String? newPassword,
  }) async {
    if (_user == null) return {'success': false, 'error': 'Silakan login terlebih dahulu'};
    final res = await ApiService.updateProfile(
      userId: _user!.id,
      username: username,
      email: email,
      newPassword: newPassword,
    );
    if (res['success'] == true && res['user'] != null) {
      _user = UserModel.fromJson(res['user']);
      notifyListeners();
    }
    return res;
  }

  // Verifikasi Email
  Future<Map<String, dynamic>> verifyUserEmail(String email) async {
    if (_user == null) return {'success': false, 'error': 'Silakan login terlebih dahulu'};
    final res = await ApiService.sendEmailVerification(userId: _user!.id, email: email);
    if (res['success'] == true) {
      _user = _user!.copyWith(email: email);
      notifyListeners();
    }
    return res;
  }
}

