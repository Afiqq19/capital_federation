class CourtCaseModel {
  final String id;
  final String caseNumber;
  final String caseType; // 'BANKRUPTCY', 'DISPUTE', 'REGULATORY'
  final String title;
  final String plaintiffName;
  final String defendantName;
  final String? defendantUserId;
  final String? defendantCompanyId;
  final double claimAmountIb;
  final String courtHearingDate;
  final String status; // 'IN_TRIAL', 'VERDICT_PAILIT', 'VERDICT_PKPU', 'VERDICT_REJECTED'
  final String verdictNotes;
  final String createdAt;

  CourtCaseModel({
    required this.id,
    required this.caseNumber,
    required this.caseType,
    required this.title,
    required this.plaintiffName,
    required this.defendantName,
    this.defendantUserId,
    this.defendantCompanyId,
    required this.claimAmountIb,
    required this.courtHearingDate,
    required this.status,
    required this.verdictNotes,
    required this.createdAt,
  });

  factory CourtCaseModel.fromJson(Map<String, dynamic> json) {
    return CourtCaseModel(
      id: json['id']?.toString() ?? '',
      caseNumber: json['case_number']?.toString() ?? 'PNAF/000/2026',
      caseType: json['case_type']?.toString() ?? 'DISPUTE',
      title: json['title']?.toString() ?? 'Sengketa Bisnis',
      plaintiffName: json['plaintiff_name']?.toString() ?? 'Pihak Penggugat',
      defendantName: json['defendant_name']?.toString() ?? 'Pihak Tergugat',
      defendantUserId: json['defendant_user_id']?.toString(),
      defendantCompanyId: json['defendant_company_id']?.toString(),
      claimAmountIb: (json['claim_amount_ib'] as num?)?.toDouble() ?? 0.0,
      courtHearingDate: json['court_hearing_date']?.toString() ?? 'Jadwal Segera',
      status: json['status']?.toString() ?? 'IN_TRIAL',
      verdictNotes: json['verdict_notes']?.toString() ?? '',
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}
