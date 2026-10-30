class UserModel {
  final String id;
  final String username;
  final bool hasPt;
  final String ptName;
  final String sector;
  final double balanceIb; // Kas Pribadi
  final double companyBalanceIb; // Kas Perusahaan (PT)
  final int ptLevel;
  final int rdLevel;
  final bool isIpo;
  final double fundamentalScore;
  final int marketingLevel;
  final int hrLevel;
  final int capacityLevel;
  final int creditScore;
  final bool isBlueChip;
  final int bailoutCount;
  final int employeesCount;
  final int ceoLevel;
  final int cfoLevel;
  final int cmoLevel;
  final String ptSymbol;
  final String ptDescription;
  final String ptFoundedAt;
  final String ptFounderName;
  final String email;
  final bool emailVerified;
  final String? role; // 'PLAYER', 'VIP', 'ADMIN'
  final String? creditTier; // 'STANDARD', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'

  String get effectiveRole => role ?? 'PLAYER';
  String get effectiveCreditTier => creditTier ?? 'STANDARD';

  bool get isVip => (role ?? 'PLAYER').toUpperCase() == 'VIP';
  bool get isAdmin => (role ?? 'PLAYER').toUpperCase() == 'ADMIN';

  UserModel({
    required this.id,
    required this.username,
    this.hasPt = false,
    this.ptName = '',
    this.sector = '',
    required this.balanceIb,
    this.companyBalanceIb = 0.0,
    this.ptLevel = 1,
    this.rdLevel = 1,
    this.isIpo = false,
    this.fundamentalScore = 75.0,
    this.marketingLevel = 1,
    this.hrLevel = 1,
    this.capacityLevel = 1,
    this.creditScore = 750,
    this.isBlueChip = false,
    this.bailoutCount = 0,
    this.employeesCount = 0,
    this.ceoLevel = 0,
    this.cfoLevel = 0,
    this.cmoLevel = 0,
    this.ptSymbol = '',
    this.ptDescription = '',
    this.ptFoundedAt = '',
    this.ptFounderName = '',
    this.email = '',
    this.emailVerified = false,
    this.role = 'PLAYER',
    this.creditTier = 'STANDARD',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final rawPt = (json['pt_name'] ?? json['ptName'] ?? '').toString().trim();
    final cleanPt = rawPt.replaceFirst(RegExp(r'^(PT\.?\s*)+', caseSensitive: false), '').trim();
    return UserModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      emailVerified: json['email_verified'] == 1 || json['email_verified'] == true || json['emailVerified'] == true,
      hasPt: json['has_pt'] == 1 || json['has_pt'] == true || json['hasPt'] == true,
      ptName: cleanPt,
      sector: json['sector'] ?? '',
      balanceIb: (json['balance_ib'] ?? json['balanceIb'] ?? 10000000.0).toDouble(),
      companyBalanceIb: (json['company_balance_ib'] ?? json['companyBalanceIb'] ?? 0.0).toDouble(),
      ptLevel: json['pt_level'] ?? json['ptLevel'] ?? 1,
      rdLevel: json['rd_level'] ?? json['rdLevel'] ?? 1,
      isIpo: json['is_ipo'] == 1 || json['is_ipo'] == true || json['isIpo'] == true,
      fundamentalScore: (json['fundamental_score'] ?? json['fundamentalScore'] ?? 75.0).toDouble(),
      marketingLevel: json['marketing_level'] ?? json['marketingLevel'] ?? 1,
      hrLevel: json['hr_level'] ?? json['hrLevel'] ?? 1,
      capacityLevel: json['capacity_level'] ?? json['capacityLevel'] ?? 1,
      creditScore: json['credit_score'] ?? json['creditScore'] ?? 750,
      isBlueChip: (json['is_blue_chip'] == 1 || json['is_blue_chip'] == true || json['isBlueChip'] == true),
      bailoutCount: json['bailout_count'] ?? json['bailoutCount'] ?? 0,
      employeesCount: json['employees_count'] ?? json['employeesCount'] ?? 0,
      ceoLevel: json['ceo_level'] ?? json['ceoLevel'] ?? 0,
      cfoLevel: json['cfo_level'] ?? json['cfoLevel'] ?? 0,
      cmoLevel: json['cmo_level'] ?? json['cmoLevel'] ?? 0,
      ptSymbol: json['pt_symbol'] ?? json['ptSymbol'] ?? '',
      ptDescription: json['pt_description'] ?? json['ptDescription'] ?? '',
      ptFoundedAt: json['pt_founded_at'] ?? json['ptFoundedAt'] ?? '',
      ptFounderName: json['pt_founder_name'] ?? json['ptFounderName'] ?? '',
      role: json['role'] ?? 'PLAYER',
      creditTier: json['credit_tier'] ?? json['creditTier'] ?? 'STANDARD',
    );
  }

  UserModel copyWith({
    bool? hasPt,
    String? ptName,
    String? sector,
    double? balanceIb,
    double? companyBalanceIb,
    int? ptLevel,
    int? rdLevel,
    bool? isIpo,
    double? fundamentalScore,
    int? marketingLevel,
    int? hrLevel,
    int? capacityLevel,
    int? creditScore,
    bool? isBlueChip,
    int? bailoutCount,
    int? employeesCount,
    int? ceoLevel,
    int? cfoLevel,
    int? cmoLevel,
    String? ptSymbol,
    String? ptDescription,
    String? ptFoundedAt,
    String? ptFounderName,
    String? email,
    bool? emailVerified,
    String? role,
    String? creditTier,
  }) {
    return UserModel(
      id: id,
      username: username,
      hasPt: hasPt ?? this.hasPt,
      ptName: ptName ?? this.ptName,
      sector: sector ?? this.sector,
      balanceIb: balanceIb ?? this.balanceIb,
      companyBalanceIb: companyBalanceIb ?? this.companyBalanceIb,
      ptLevel: ptLevel ?? this.ptLevel,
      rdLevel: rdLevel ?? this.rdLevel,
      isIpo: isIpo ?? this.isIpo,
      fundamentalScore: fundamentalScore ?? this.fundamentalScore,
      marketingLevel: marketingLevel ?? this.marketingLevel,
      hrLevel: hrLevel ?? this.hrLevel,
      capacityLevel: capacityLevel ?? this.capacityLevel,
      creditScore: creditScore ?? this.creditScore,
      isBlueChip: isBlueChip ?? this.isBlueChip,
      bailoutCount: bailoutCount ?? this.bailoutCount,
      employeesCount: employeesCount ?? this.employeesCount,
      ceoLevel: ceoLevel ?? this.ceoLevel,
      cfoLevel: cfoLevel ?? this.cfoLevel,
      cmoLevel: cmoLevel ?? this.cmoLevel,
      ptSymbol: ptSymbol ?? this.ptSymbol,
      ptDescription: ptDescription ?? this.ptDescription,
      ptFoundedAt: ptFoundedAt ?? this.ptFoundedAt,
      ptFounderName: ptFounderName ?? this.ptFounderName,
      email: email ?? this.email,
      emailVerified: emailVerified ?? this.emailVerified,
      role: role ?? this.role,
      creditTier: creditTier ?? this.creditTier,
    );
  }
}
