class PortfolioItemModel {
  final String id;
  final String companyId;
  final String symbol;
  final String name;
  final String sector;
  final String status;
  final int lotsOwned;
  final int totalShares;
  final double avgBuyPrice;
  final double currentPrice;
  final double currentValue;
  final double investedValue;
  final double profitLoss;
  final double profitLossPct;
  final double dividendRate;

  PortfolioItemModel({
    required this.id,
    required this.companyId,
    required this.symbol,
    required this.name,
    required this.sector,
    required this.status,
    required this.lotsOwned,
    required this.totalShares,
    required this.avgBuyPrice,
    required this.currentPrice,
    required this.currentValue,
    required this.investedValue,
    required this.profitLoss,
    required this.profitLossPct,
    required this.dividendRate,
  });

  factory PortfolioItemModel.fromJson(Map<String, dynamic> json) {
    return PortfolioItemModel(
      id: json['id'] ?? '',
      companyId: json['company_id'] ?? json['companyId'] ?? '',
      symbol: json['symbol'] ?? '',
      name: json['name'] ?? '',
      sector: json['sector'] ?? 'Teknologi',
      status: json['status'] ?? 'HEALTHY',
      lotsOwned: json['lots_owned'] ?? json['lotsOwned'] ?? 0,
      totalShares: json['totalShares'] ?? ((json['lots_owned'] ?? 0) * 100),
      avgBuyPrice: (json['avg_buy_price'] ?? json['avgBuyPrice'] ?? 0.0).toDouble(),
      currentPrice: (json['current_price'] ?? json['currentPrice'] ?? 0.0).toDouble(),
      currentValue: (json['currentValue'] ?? 0.0).toDouble(),
      investedValue: (json['investedValue'] ?? 0.0).toDouble(),
      profitLoss: (json['profitLoss'] ?? 0.0).toDouble(),
      profitLossPct: (json['profitLossPct'] ?? 0.0).toDouble(),
      dividendRate: (json['dividend_rate'] ?? json['dividendRate'] ?? 0.05).toDouble(),
    );
  }
}

class PortfolioSummaryModel {
  final double cashBalance;       // Kas Pribadi
  final double companyBalance;    // Kas Perusahaan
  final bool hasPt;
  final String ptName;
  final String sector;
  final bool isIpo;
  final int rdLevel;
  final int marketingLevel;
  final int hrLevel;
  final int capacityLevel;
  final int employeesCount;
  final int ceoLevel;
  final int cfoLevel;
  final int cmoLevel;
  final double estimatedGrossRevenue;
  final double estimatedSalaries;
  final double estimatedNetRevenue;
  final double totalStockValue;
  final double netWorth;
  final double overallPl;
  final double overallPlPct;
  final int creditScore;
  final int ptLevel;
  final bool isBlueChip;
  final double centralBankInterestRate;
  final List<PortfolioItemModel> holdings;

  PortfolioSummaryModel({
    required this.cashBalance,
    this.companyBalance = 0.0,
    this.hasPt = false,
    this.ptName = '',
    this.sector = '',
    this.isIpo = false,
    this.rdLevel = 1,
    this.marketingLevel = 1,
    this.hrLevel = 1,
    this.capacityLevel = 1,
    this.employeesCount = 0,
    this.ceoLevel = 0,
    this.cfoLevel = 0,
    this.cmoLevel = 0,
    this.estimatedGrossRevenue = 0.0,
    this.estimatedSalaries = 0.0,
    this.estimatedNetRevenue = 0.0,
    required this.totalStockValue,
    required this.netWorth,
    required this.overallPl,
    required this.overallPlPct,
    required this.creditScore,
    required this.ptLevel,
    required this.isBlueChip,
    this.centralBankInterestRate = 6.5,
    required this.holdings,
  });

  factory PortfolioSummaryModel.fromJson(Map<String, dynamic> json) {
    final list = (json['holdings'] as List<dynamic>? ?? [])
        .map((e) => PortfolioItemModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return PortfolioSummaryModel(
      cashBalance: (json['cashBalance'] ?? 0.0).toDouble(),
      companyBalance: (json['companyBalance'] ?? 0.0).toDouble(),
      hasPt: json['hasPt'] == true,
      ptName: json['ptName'] ?? '',
      sector: json['sector'] ?? '',
      isIpo: json['isIpo'] == true,
      rdLevel: json['rdLevel'] ?? 1,
      marketingLevel: json['marketingLevel'] ?? 1,
      hrLevel: json['hrLevel'] ?? 1,
      capacityLevel: json['capacityLevel'] ?? 1,
      employeesCount: json['employeesCount'] ?? 0,
      ceoLevel: json['ceoLevel'] ?? 0,
      cfoLevel: json['cfoLevel'] ?? 0,
      cmoLevel: json['cmoLevel'] ?? 0,
      estimatedGrossRevenue: (json['estimatedGrossRevenue'] ?? 0.0).toDouble(),
      estimatedSalaries: (json['estimatedSalaries'] ?? 0.0).toDouble(),
      estimatedNetRevenue: (json['estimatedNetRevenue'] ?? 0.0).toDouble(),
      totalStockValue: (json['totalStockValue'] ?? 0.0).toDouble(),
      netWorth: (json['netWorth'] ?? 0.0).toDouble(),
      overallPl: (json['overallPl'] ?? 0.0).toDouble(),
      overallPlPct: (json['overallPlPct'] ?? 0.0).toDouble(),
      creditScore: json['creditScore'] ?? 750,
      ptLevel: json['ptLevel'] ?? 1,
      isBlueChip: json['isBlueChip'] == true,
      centralBankInterestRate: (json['centralBankInterestRate'] ?? 6.5).toDouble(),
      holdings: list,
    );
  }
}
