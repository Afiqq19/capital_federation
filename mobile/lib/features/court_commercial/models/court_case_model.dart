class CourtCaseModel {
  final String id;
  final String caseNumber;
  final String caseType; // 'BANKRUPTCY', 'DISPUTE', 'REGULATORY'
  final String title;
  final String plaintiffName;
  final String? plaintiffUserId;
  final String defendantName;
  final String? defendantUserId;
  final String? defendantCompanyId;
  final double claimAmountIb;
  final String courtHearingDate;
  final String hearingTime;
  final String courtRoomName;
  final String? targetAssetDescription;
  final String status; // 'IN_TRIAL', 'VERDICT_APPROVED', 'VERDICT_PKPU', 'VERDICT_PAILIT', 'VERDICT_REJECTED'
  final String? verdictType;
  final double verdictAwardedAmount;
  final String verdictNotes;
  final String roomStatus;
  final bool plaintiffPresent;
  final bool defendantPresent;
  final bool summonsSent;
  final String? decidedBy; // 'BOT_JUDGE', 'ADMIN_MANUAL'
  final String? closedAt;
  final String? deedId;
  final String? deedNumber;
  final String createdAt;

  CourtCaseModel({
    required this.id,
    required this.caseNumber,
    required this.caseType,
    required this.title,
    required this.plaintiffName,
    this.plaintiffUserId,
    required this.defendantName,
    this.defendantUserId,
    this.defendantCompanyId,
    required this.claimAmountIb,
    required this.courtHearingDate,
    this.hearingTime = '10:00 WIB',
    this.courtRoomName = 'Ruang Sidang Utama Kartika PNAF',
    this.targetAssetDescription,
    required this.status,
    this.verdictType,
    this.verdictAwardedAmount = 0.0,
    required this.verdictNotes,
    this.roomStatus = 'WAITING_PRESENCE',
    this.plaintiffPresent = false,
    this.defendantPresent = false,
    this.summonsSent = false,
    this.decidedBy,
    this.closedAt,
    this.deedId,
    this.deedNumber,
    required this.createdAt,
  });

  bool get isInTrial => status == 'IN_TRIAL';
  bool get isDecided => status != 'IN_TRIAL';
  bool get isApproved => status == 'VERDICT_APPROVED';
  bool get isPkpu => status == 'VERDICT_PKPU';
  bool get isPailit => status == 'VERDICT_PAILIT';
  bool get isRejected => status == 'VERDICT_REJECTED' || status == 'DISMISSED';
  bool get isBotDecided => (decidedBy ?? '').toUpperCase().contains('BOT');

  static String _normalizeStatus(String raw) {
    final upper = raw.trim().toUpperCase();
    if (upper == 'APPROVED') return 'VERDICT_APPROVED';
    if (upper == 'DISMISSED') return 'VERDICT_REJECTED';
    return upper.isEmpty ? 'IN_TRIAL' : upper;
  }

  factory CourtCaseModel.fromJson(Map<String, dynamic> json) {
    final rawStatus = (json['status'] ?? 'IN_TRIAL').toString();
    return CourtCaseModel(
      id: json['id']?.toString() ?? '',
      caseNumber: (json['case_number'] ?? json['caseNumber'])?.toString() ?? 'PNAF/000/2026',
      caseType: (json['case_type'] ?? json['caseType'])?.toString() ?? 'DISPUTE',
      title: json['title']?.toString() ?? 'Sengketa Bisnis',
      plaintiffName: (json['plaintiff_name'] ?? json['plaintiffName'])?.toString() ?? 'Pihak Penggugat',
      plaintiffUserId: (json['plaintiff_user_id'] ?? json['plaintiffUserId'])?.toString(),
      defendantName: (json['defendant_name'] ?? json['defendantName'])?.toString() ?? 'Pihak Tergugat',
      defendantUserId: (json['defendant_user_id'] ?? json['defendantUserId'])?.toString(),
      defendantCompanyId: (json['defendant_company_id'] ?? json['defendantCompanyId'])?.toString(),
      claimAmountIb: ((json['claim_amount_ib'] ?? json['claimAmountIb']) as num?)?.toDouble() ?? 0.0,
      courtHearingDate: (json['court_hearing_date'] ?? json['courtHearingDate'])?.toString() ?? 'Jadwal Segera',
      hearingTime: (json['hearing_time'] ?? json['hearingTime'])?.toString() ?? '10:00 WIB',
      courtRoomName: (json['court_room_name'] ?? json['courtRoomName'])?.toString() ?? 'Ruang Sidang Utama Kartika PNAF',
      targetAssetDescription: (json['target_asset_description'] ?? json['targetAssetDescription'])?.toString(),
      status: _normalizeStatus(rawStatus),
      verdictType: (json['verdict_type'] ?? json['verdictType'])?.toString(),
      verdictAwardedAmount:
          ((json['verdict_awarded_amount'] ?? json['verdictAwardedAmount']) as num?)?.toDouble() ?? 0.0,
      verdictNotes: (json['verdict_notes'] ?? json['verdictNotes'])?.toString() ?? '',
      roomStatus: (json['room_status'] ?? json['roomStatus'])?.toString() ?? 'WAITING_PRESENCE',
      plaintiffPresent: json['plaintiff_present'] == 1 ||
          json['plaintiff_present'] == true ||
          json['plaintiffPresent'] == true,
      defendantPresent: json['defendant_present'] == 1 ||
          json['defendant_present'] == true ||
          json['defendantPresent'] == true,
      summonsSent:
          json['summons_sent'] == 1 || json['summons_sent'] == true || json['summonsSent'] == true,
      decidedBy: (json['decided_by'] ?? json['decidedBy'])?.toString(),
      closedAt: (json['closed_at'] ?? json['closedAt'])?.toString(),
      deedId: (json['deed_id'] ?? json['deedId'])?.toString(),
      deedNumber: (json['deed_number'] ?? json['deedNumber'])?.toString(),
      createdAt: (json['created_at'] ?? json['createdAt'])?.toString() ?? '',
    );
  }
}
