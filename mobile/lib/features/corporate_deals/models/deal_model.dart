class PrivateDealModel {
  final String id;
  final String companyId;
  final String companyName;
  final String sellerUserId;
  final String sellerName;
  final String? sellerPtName;
  final String? buyerUserId;
  final String? buyerName;
  final String targetType; // 'P2P' or 'GLOBAL'
  final double percentageTotal;
  final double percentageRemaining;
  final double pricePerShare;
  final String status; // 'PENDING_APPROVAL', 'PARTIALLY_SOLD', 'COMPLETED', 'REJECTED', 'DISPUTED'
  final String? termsNotes;
  final String createdAt;

  PrivateDealModel({
    required this.id,
    required this.companyId,
    required this.companyName,
    required this.sellerUserId,
    required this.sellerName,
    this.sellerPtName,
    this.buyerUserId,
    this.buyerName,
    required this.targetType,
    required this.percentageTotal,
    required this.percentageRemaining,
    required this.pricePerShare,
    required this.status,
    this.termsNotes,
    required this.createdAt,
  });

  factory PrivateDealModel.fromJson(Map<String, dynamic> json) {
    return PrivateDealModel(
      id: json['id']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      companyName: json['company_name']?.toString() ?? 'PT Emiten',
      sellerUserId: json['seller_user_id']?.toString() ?? '',
      sellerName: json['seller_name']?.toString() ?? 'Penjual Saham',
      sellerPtName: json['seller_pt_name']?.toString(),
      buyerUserId: json['buyer_user_id']?.toString(),
      buyerName: json['buyer_name']?.toString(),
      targetType: json['target_type']?.toString() ?? json['deal_type']?.toString() ?? 'GLOBAL',
      percentageTotal: ((json['percentage_total'] ?? json['percentage_offered']) as num?)?.toDouble() ?? 0.0,
      percentageRemaining: (json['percentage_remaining'] as num?)?.toDouble() ?? 0.0,
      pricePerShare: (json['price_per_share'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? 'PENDING_APPROVAL',
      termsNotes: json['terms_notes']?.toString(),
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}

class DealDeedModel {
  final String id;
  final String deedNumber;
  final String dealId;
  final String companyId;
  final String companyName;
  final String sellerUserId;
  final String sellerName;
  final String buyerUserId;
  final String buyerName;
  final double percentageTransferred;
  final int sharesTransferred;
  final double pricePerShare;
  final double totalAmountIb;
  final double adminFeeIb;
  final String digitalMeteraiId;
  final String notaryName;
  final double clauseBreachPenaltyPct;
  final String status; // 'VALID_NOTARIZED', 'DISPUTED_PNAK', 'ANNULLED'
  final String signedAt;

  DealDeedModel({
    required this.id,
    required this.deedNumber,
    required this.dealId,
    required this.companyId,
    required this.companyName,
    required this.sellerUserId,
    required this.sellerName,
    required this.buyerUserId,
    required this.buyerName,
    required this.percentageTransferred,
    required this.sharesTransferred,
    required this.pricePerShare,
    required this.totalAmountIb,
    required this.adminFeeIb,
    required this.digitalMeteraiId,
    required this.notaryName,
    required this.clauseBreachPenaltyPct,
    required this.status,
    required this.signedAt,
  });

  factory DealDeedModel.fromJson(Map<String, dynamic> json) {
    return DealDeedModel(
      id: json['id']?.toString() ?? '',
      deedNumber: json['deed_number']?.toString() ?? 'AKTA-NOMOR-TIDAK-VALID',
      dealId: json['deal_id']?.toString() ?? '',
      companyId: json['company_id']?.toString() ?? '',
      companyName: json['company_name']?.toString() ?? 'PT Emiten',
      sellerUserId: json['seller_user_id']?.toString() ?? '',
      sellerName: json['seller_name']?.toString() ?? 'Pihak Penjual',
      buyerUserId: json['buyer_user_id']?.toString() ?? '',
      buyerName: json['buyer_name']?.toString() ?? 'Pihak Pembeli',
      percentageTransferred: (json['percentage_transferred'] as num?)?.toDouble() ?? 0.0,
      sharesTransferred: (json['shares_transferred'] as num?)?.toInt() ?? 0,
      pricePerShare: (json['price_per_share'] as num?)?.toDouble() ?? 0.0,
      totalAmountIb: ((json['total_amount_ib'] ?? json['total_price_ib']) as num?)?.toDouble() ?? 0.0,
      adminFeeIb: (json['admin_fee_ib'] as num?)?.toDouble() ?? 0.0,
      digitalMeteraiId: json['digital_meterai_id']?.toString() ?? json['meterai_status']?.toString() ?? 'MTR-KONOHA-LUNAS',
      notaryName: json['notary_name']?.toString() ?? 'Notaris Publik Konoha S.H., M.Kn.',
      clauseBreachPenaltyPct: (json['clause_breach_penalty_pct'] as num?)?.toDouble() ?? 15.0,
      status: json['status']?.toString() ?? 'VALID_NOTARIZED',
      signedAt: json['signed_at']?.toString() ?? json['created_at']?.toString() ?? '',
    );
  }
}
