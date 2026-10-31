import '../utils/wib_time.dart';
class PricePoint {
  final double open;
  final double close;
  final double high;
  final double low;
  final double price;
  final int volume;
  final DateTime timestamp;

  PricePoint({
    required this.open,
    required this.close,
    required this.high,
    required this.low,
    required this.price,
    required this.volume,
    required this.timestamp,
  });

  factory PricePoint.fromJson(Map<String, dynamic> json) {
    final p = (json['price'] ?? json['close'] ?? 0.0).toDouble();
    final c = (json['close'] ?? p).toDouble();
    final o = (json['open'] ?? p).toDouble();
    final h = (json['high'] ?? (o > c ? o : c)).toDouble();
    final l = (json['low'] ?? (o < c ? o : c)).toDouble();
    return PricePoint(
      open: o,
      close: c,
      high: h,
      low: l,
      price: p > 0 ? p : c,
      volume: json['volume'] ?? 0,
      timestamp: parseServerTime(json['timestamp']),
    );
  }
}

class OrderbookLevel {
  final double price;
  final int lots;

  OrderbookLevel({required this.price, required this.lots});

  factory OrderbookLevel.fromJson(Map<String, dynamic> json) {
    return OrderbookLevel(
      price: (json['price'] ?? 0.0).toDouble(),
      lots: json['lots'] ?? 0,
    );
  }
}

class OrderbookModel {
  final List<OrderbookLevel> bids;
  final List<OrderbookLevel> offers;
  final int totalBidLots;
  final int totalOfferLots;
  final int buyPressurePct;
  final int sellPressurePct;

  OrderbookModel({
    required this.bids,
    required this.offers,
    required this.totalBidLots,
    required this.totalOfferLots,
    required this.buyPressurePct,
    required this.sellPressurePct,
  });

  factory OrderbookModel.fromJson(Map<String, dynamic> json) {
    final bList = (json['bids'] as List<dynamic>? ?? [])
        .map((e) => OrderbookLevel.fromJson(e as Map<String, dynamic>))
        .toList();
    final oList = (json['offers'] as List<dynamic>? ?? [])
        .map((e) => OrderbookLevel.fromJson(e as Map<String, dynamic>))
        .toList();

    return OrderbookModel(
      bids: bList,
      offers: oList,
      totalBidLots: json['totalBidLots'] ?? 0,
      totalOfferLots: json['totalOfferLots'] ?? 0,
      buyPressurePct: json['buyPressurePct'] ?? 50,
      sellPressurePct: json['sellPressurePct'] ?? 50,
    );
  }
}

class CompanyModel {
  final String id;
  final String symbol;
  final String name;
  final String sector;
  final String status;
  final double currentPrice;
  final double basePrice;
  final double priceChangePct;
  final int totalShares;
  final int circulatingShares;
  final double dividendRate;
  final double fundamentalScore;
  final bool isBot;
  final bool isIpo;
  final List<PricePoint> history;
  final OrderbookModel? orderbook;

  // Status Pengawasan Bursa & Otoritas
  final bool isUma;
  final String? umaDirection; // 'UP' | 'DOWN'
  final String? umaReason;
  final String? umaSource;
  final String? umaAt;
  final bool isSeized;
  final String? seizedBy;
  final String? seizedAt;
  final String? seizeReason;
  final bool isBumn;
  final String? suspendUntil;
  final String? suspendReason;
  final String? ownerId;
  final String? ownerUsername;
  final String? ownerPtName;
  final String listingStatus; // 'LISTED' | 'PRE_IPO' | 'UNLISTED'
  final String? listingDate;
  final String? ipoStatus;

  CompanyModel({
    required this.id,
    required this.symbol,
    required this.name,
    required this.sector,
    required this.status,
    required this.currentPrice,
    required this.basePrice,
    required this.priceChangePct,
    this.totalShares = 10000000,
    this.circulatingShares = 2000000,
    this.dividendRate = 0.05,
    this.fundamentalScore = 85.0,
    this.isBot = true,
    this.isIpo = true,
    this.history = const [],
    this.orderbook,
    this.isUma = false,
    this.umaDirection,
    this.umaReason,
    this.umaSource,
    this.umaAt,
    this.isSeized = false,
    this.seizedBy,
    this.seizedAt,
    this.seizeReason,
    this.isBumn = false,
    this.suspendUntil,
    this.suspendReason,
    this.ownerId,
    this.ownerUsername,
    this.ownerPtName,
    this.listingStatus = 'LISTED',
    this.listingDate,
    this.ipoStatus,
  });

  double get lotPrice => (isPreIpo ? basePrice : currentPrice) * 100; // 1 Lot = 100 Lembar

  bool get isSuspended => status == 'SUSPENDED' || (suspendUntil != null && suspendUntil!.isNotEmpty);

  bool get isPreIpo => listingStatus == 'PRE_IPO' || status == 'PRE_IPO';

  factory CompanyModel.fromJson(Map<String, dynamic> json) {
    final listStatus = json['listing_status']?.toString() ?? json['listingStatus']?.toString() ?? (json['is_ipo'] == 0 ? 'UNLISTED' : 'LISTED');
    final listDate = json['listing_date']?.toString() ?? json['listingDate']?.toString();
    final ipoStat = json['ipo_status']?.toString() ?? json['ipoStatus']?.toString();
    final bool preIpo = listStatus == 'PRE_IPO' || json['status'] == 'PRE_IPO' || json['is_pre_ipo'] == true;

    final base = (json['prev_close'] ?? json['prevClose'] ?? json['base_price'] ?? json['basePrice'] ?? json['current_price'] ?? 0.0).toDouble();
    final curr = preIpo ? base : (json['current_price'] ?? json['currentPrice'] ?? base).toDouble();
    double changePct = 0.0;
    if (preIpo) {
      changePct = 0.0;
    } else if (json['price_change_pct'] != null) {
      changePct = (json['price_change_pct']).toDouble();
    } else if (base > 0) {
      changePct = ((curr - base) / base) * 100;
    }

    final histRaw = json['history'] as List<dynamic>?;
    final List<PricePoint> hist = histRaw != null
        ? histRaw.map((e) => PricePoint.fromJson(e as Map<String, dynamic>)).toList()
        : [];

    final obRaw = json['orderbook'] as Map<String, dynamic>?;
    final OrderbookModel? ob = obRaw != null ? OrderbookModel.fromJson(obRaw) : null;

    final umaFlag = json['uma_flag'] == 1 || json['uma_flag'] == true || json['is_uma'] == true || json['isUma'] == true;
    final umaDir = json['uma_direction']?.toString() ?? json['umaDirection']?.toString() ?? (changePct >= 0 ? 'UP' : 'DOWN');
    final seizedFlag = json['is_seized'] == 1 || json['is_seized'] == true || json['isSeized'] == true || json['status'] == 'SEIZED';
    final bumnFlag = json['is_bumn'] == 1 || json['is_bumn'] == true || json['isBumn'] == true;

    return CompanyModel(
      id: json['id'] ?? '',
      symbol: json['symbol'] ?? '',
      name: json['name'] ?? '',
      sector: json['sector'] ?? 'Teknologi',
      status: json['status'] ?? 'HEALTHY',
      currentPrice: curr,
      basePrice: base,
      priceChangePct: double.parse(changePct.toStringAsFixed(2)),
      totalShares: json['total_shares'] ?? 10000000,
      circulatingShares: (json['circulating_shares'] ?? json['circulatingShares'] ?? ((json['total_shares'] ?? 10000000) * 0.2).round()).toInt(),
      dividendRate: (json['dividend_rate'] ?? 0.05).toDouble(),
      fundamentalScore: (json['fundamental_score'] ?? 85.0).toDouble(),
      isBot: json['is_bot'] == 1 || json['is_bot'] == true || json['isBot'] == true,
      isIpo: json['is_ipo'] == 1 || json['is_ipo'] == true || json['isIpo'] == true || json['is_ipo'] == null,
      history: hist,
      orderbook: ob,
      isUma: umaFlag,
      umaDirection: umaDir,
      umaReason: json['uma_reason']?.toString(),
      umaSource: json['uma_source']?.toString(),
      umaAt: json['uma_at']?.toString(),
      isSeized: seizedFlag,
      seizedBy: json['seized_by']?.toString(),
      seizedAt: json['seized_at']?.toString(),
      seizeReason: json['seize_reason']?.toString(),
      isBumn: bumnFlag,
      suspendUntil: json['suspend_until']?.toString(),
      suspendReason: json['suspend_reason']?.toString(),
      ownerId: json['owner_id']?.toString() ?? json['ownerId']?.toString(),
      ownerUsername: json['owner_username']?.toString() ?? json['ownerUsername']?.toString(),
      ownerPtName: json['owner_pt_name']?.toString() ?? json['ownerPtName']?.toString(),
      listingStatus: listStatus,
      listingDate: listDate,
      ipoStatus: ipoStat,
    );
  }

  CompanyModel copyWith({
    double? currentPrice,
    double? basePrice,
    double? priceChangePct,
    String? status,
    bool? isIpo,
    List<PricePoint>? history,
    OrderbookModel? orderbook,
    bool? isUma,
    String? umaDirection,
    String? umaReason,
    bool? isSeized,
    String? seizeReason,
    bool? isBumn,
  }) {
    return CompanyModel(
      id: id,
      symbol: symbol,
      name: name,
      sector: sector,
      status: status ?? this.status,
      currentPrice: currentPrice ?? this.currentPrice,
      basePrice: basePrice ?? this.basePrice,
      priceChangePct: priceChangePct ?? this.priceChangePct,
      totalShares: totalShares,
      dividendRate: dividendRate,
      fundamentalScore: fundamentalScore,
      isBot: isBot,
      isIpo: isIpo ?? this.isIpo,
      history: history ?? this.history,
      orderbook: orderbook ?? this.orderbook,
      isUma: isUma ?? this.isUma,
      umaDirection: umaDirection ?? this.umaDirection,
      umaReason: umaReason ?? this.umaReason,
      umaSource: umaSource,
      umaAt: umaAt,
      isSeized: isSeized ?? this.isSeized,
      seizedBy: seizedBy,
      seizedAt: seizedAt,
      seizeReason: seizeReason ?? this.seizeReason,
      isBumn: isBumn ?? this.isBumn,
      suspendUntil: suspendUntil,
      suspendReason: suspendReason,
    );
  }
}
