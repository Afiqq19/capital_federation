import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class PublicPlayerProfileSheet extends StatefulWidget {
  final String userId;
  final Map<String, dynamic>? initialData;

  const PublicPlayerProfileSheet({
    super.key,
    required this.userId,
    this.initialData,
  });

  static Future<void> show(
    BuildContext context, {
    required String userId,
    Map<String, dynamic>? initialData,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PublicPlayerProfileSheet(
        userId: userId,
        initialData: initialData,
      ),
    );
  }

  @override
  State<PublicPlayerProfileSheet> createState() => _PublicPlayerProfileSheetState();
}

class _PublicPlayerProfileSheetState extends State<PublicPlayerProfileSheet> {
  bool _isLoading = true;
  Map<String, dynamic>? _profileData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    final res = await ApiService.getPublicPlayerProfile(widget.userId);
    if (!mounted) return;
    if (res['error'] != null) {
      setState(() {
        _isLoading = false;
        _errorMessage = res['error'].toString();
      });
    } else {
      setState(() {
        _isLoading = false;
        _profileData = res;
      });
    }
  }

  String _formatDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '15 Oktober 2026';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return DateFormat('d MMMM yyyy', 'id_ID').format(dt);
    } catch (_) {
      return '15 Oktober 2026';
    }
  }

  @override
  Widget build(BuildContext context) {
    final num rankNum = _profileData?['rank'] ?? widget.initialData?['rank'] ?? 99;
    final int rank = rankNum.toInt();
    final bool is9Naga = rank <= 9;
    final bool isTaipan = rank > 9 && rank <= 25;
    final bool isVip = _profileData?['isVip'] == true || widget.initialData?['isVip'] == true;
    final String username = _profileData?['username'] ?? widget.initialData?['username'] ?? 'Konglomerat';

    Color themeColor = const Color(0xFF38BDF8);
    LinearGradient? headerGradient;
    if (is9Naga) {
      themeColor = const Color(0xFFF59E0B);
      headerGradient = const LinearGradient(
        colors: [Color(0xFF2B1F06), Color(0xFF141109), Color(0xFF0F172A)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    } else if (isVip) {
      themeColor = const Color(0xFFA855F7);
      headerGradient = const LinearGradient(
        colors: [Color(0xFF23103A), Color(0xFF140A24), Color(0xFF0F172A)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      padding: EdgeInsets.fromLTRB(20, 14, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0F1E),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: themeColor, width: 2.0)),
        boxShadow: [
          BoxShadow(
            color: themeColor.withValues(alpha: 0.18),
            blurRadius: 24,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF334155),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header Profile Ringkas
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: headerGradient ??
                  const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: themeColor.withValues(alpha: 0.5)),
            ),
            child: Row(
              children: [
                // Avatar Prestise
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    gradient: is9Naga
                        ? const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFB45309)])
                        : (isVip
                            ? const LinearGradient(colors: [Color(0xFFA855F7), Color(0xFFEC4899)])
                            : const LinearGradient(colors: [Color(0xFF38BDF8), Color(0xFF0284C7)])),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: themeColor.withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      )
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    is9Naga ? '🐉' : (isVip ? '💎' : username[0].toUpperCase()),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 14),

                // Nama & Badge
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          Text(
                            username,
                            style: TextStyle(
                              color: is9Naga ? const Color(0xFFFDE68A) : Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          if (is9Naga)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFB45309)]),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '🐉 9 NAGA #$rank',
                                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                              ),
                            )
                          else if (isTaipan)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFF38BDF8)),
                              ),
                              child: Text(
                                '👑 TAIPAN #$rank',
                                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 9, fontWeight: FontWeight.w900),
                              ),
                            ),
                          if (isVip)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(colors: [Color(0xFFA855F7), Color(0xFFEC4899)]),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                '💎 VIP',
                                style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.verified_user_rounded, size: 13, color: Color(0xFF34D399)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'Anggota Terdaftar Sejak: ${_formatDate(_profileData?['joinedAt'])}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Body Scrollable
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
                  )
                : (_errorMessage != null)
                    ? Center(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFF87171), fontSize: 12),
                        ),
                      )
                    : ListView(
                        children: [
                          // 1. KOTAK TOTAL KEKAYAAN BERSIH (NET WORTH)
                          _buildNetWorthCard(_profileData!['wealth'], is9Naga, themeColor),

                          const SizedBox(height: 12),

                          // 2. KOTAK KEAMANAN & PRIVASI TERTUTUP (KUSTODIAN)
                          _buildPrivacyCard(_profileData!['privacy']),

                          const SizedBox(height: 12),

                          // 3. HOLDING PERSEROAN TERBATAS (PT INDUK & ANAK USAHA)
                          _buildHoldingCard(_profileData!['holding']),

                          const SizedBox(height: 12),

                          // 4. PORTOFOLIO SAHAM TERBUKA (PUBLIC SHARE REGISTRY)
                          _buildPortfolioSharesCard(_profileData!['portfolioShares']),

                          const SizedBox(height: 16),
                        ],
                      ),
          ),

          // Tombol Tutup Lembar Profil
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF94A3B8),
                side: const BorderSide(color: Color(0xFF334155)),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => Navigator.pop(context),
              child: const Text('TUTUP ARSIP PROFIL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
            ),
          ),
        ],
      ),
    );
  }

  // 1. KARTU NET WORTH
  Widget _buildNetWorthCard(dynamic wealth, bool is9Naga, Color themeColor) {
    final double netWorth = (wealth?['netWorth'] ?? 0).toDouble();
    final double personalCash = (wealth?['personalCash'] ?? 0).toDouble();
    final double companyCash = (wealth?['companyCash'] ?? 0).toDouble();
    final double stockValuation = (wealth?['stockValuation'] ?? 0).toDouble();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: themeColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.account_balance_rounded, size: 17, color: Color(0xFFF59E0B)),
                  SizedBox(width: 8),
                  Text(
                    'TOTAL KEKAYAAN BERSIH (NET WORTH)',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'AUDITED',
                  style: TextStyle(color: Color(0xFF34D399), fontSize: 9, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            CurrencyFormatter.formatFull(netWorth),
            style: TextStyle(
              color: is9Naga ? const Color(0xFFFDE68A) : const Color(0xFF34D399),
              fontSize: 22,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
            ),
          ),
          const Divider(color: Color(0xFF1E293B), height: 20),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Valuasi Portofolio:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                    const SizedBox(height: 2),
                    Text(
                      CurrencyFormatter.formatFull(stockValuation),
                      style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Kas PT & Pribadi:', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                    const SizedBox(height: 2),
                    Text(
                      CurrencyFormatter.formatFull(personalCash + companyCash),
                      style: const TextStyle(color: Color(0xFF34D399), fontSize: 11.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 2. KARTU PRIVASI
  Widget _buildPrivacyCard(dynamic privacy) {
    final String maskedEmail = privacy?['maskedEmail'] ?? 'Disamarkan demi privasi';
    final String maskedVault = privacy?['maskedVaultAccount'] ?? 'CFX-VAULT-****';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF070B14),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.shield_rounded, size: 16, color: Color(0xFF10B981)),
              SizedBox(width: 8),
              Text(
                'Proteksi Kerahasiaan Perbankan & Privasi',
                style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildPrivacyRow('Rekening Kas Brankas:', maskedVault, Icons.lock_outline_rounded),
          _buildPrivacyRow('Alamat Email Terdaftar:', maskedEmail, Icons.email_outlined),
          _buildPrivacyRow('Kata Sandi & Kredensial:', '100% Terenkripsi (Zero Access)', Icons.key_rounded),
        ],
      ),
    );
  }

  Widget _buildPrivacyRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 12, color: const Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10.5)),
            ],
          ),
          Text(
            value,
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }

  // 3. KARTU HOLDING PERSEROAN TERBATAS
  Widget _buildHoldingCard(dynamic holding) {
    final bool hasPt = holding?['hasPt'] == true;
    final String ptName = holding?['ptName'] ?? 'Belum Mendirikan PT';
    final String symbol = holding?['symbol'] ?? '-';
    final String sector = holding?['sector'] ?? 'Finansial';
    final bool isIpo = holding?['isIpo'] == true;
    final num fundScore = holding?['fundamentalScore'] ?? 75;
    final int rdLevel = holding?['rdLevel'] ?? 1;
    final int employees = holding?['employeesCount'] ?? 0;
    final List subsidiaries = holding?['subsidiaries'] as List? ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.business_rounded, size: 17, color: Color(0xFF38BDF8)),
                  SizedBox(width: 8),
                  Text(
                    'HOLDING PERSEROAN (PT INDUK)',
                    style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              if (hasPt)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: isIpo ? const Color(0xFF10B981).withValues(alpha: 0.2) : const Color(0xFF334155),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: isIpo ? const Color(0xFF10B981) : const Color(0xFF475569)),
                  ),
                  child: Text(
                    isIpo ? 'EMITEN TBK.' : 'PERSEROAN TERTUTUP',
                    style: TextStyle(
                      color: isIpo ? const Color(0xFF34D399) : const Color(0xFF94A3B8),
                      fontSize: 8.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            ptName,
            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 3),
          Text(
            'Kode Saham: $symbol • Sektor $sector • Skor Fundamental: $fundScore/100',
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildHoldingBadge('Riset R&D', 'Level $rdLevel', const Color(0xFF38BDF8)),
              const SizedBox(width: 8),
              _buildHoldingBadge('Tenaga Kerja', '$employees Staf', const Color(0xFFF59E0B)),
              const SizedBox(width: 8),
              _buildHoldingBadge('Anak Usaha', '${subsidiaries.length} Unit PT', const Color(0xFF10B981)),
            ],
          ),
          if (subsidiaries.isNotEmpty) ...[
            const Divider(color: Color(0xFF1E293B), height: 20),
            const Text(
              'Anak Perusahaan & Unit Hasil Akuisisi:',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            ...subsidiaries.take(3).map((s) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2.5),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('• ${s['name']} (${s['symbol']})', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11)),
                      Text('Sektor ${s['sector']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildHoldingBadge(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  // 4. KARTU PORTOFOLIO SAHAM TERBUKA
  Widget _buildPortfolioSharesCard(dynamic publicShares) {
    final List shares = publicShares as List? ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.pie_chart_rounded, size: 17, color: Color(0xFFF59E0B)),
                  SizedBox(width: 8),
                  Text(
                    'KOLEKSI PORTOFOLIO EFEK TERBUKA',
                    style: TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Text(
                '${shares.length} Emiten Dikoleksi',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (shares.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text(
                  'Konglomerat ini belum memiliki portofolio saham emiten lain.',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
              ),
            )
          else
            ...shares.map((s) {
              final double valuation = (s['valuation'] ?? 0).toDouble();
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF070B14),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        s['symbol'] ?? 'STK',
                        style: const TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.w900, fontSize: 11),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            s['companyName'] ?? '',
                            style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            '${(s['lotsOwned'] ?? 0).toLocaleString()} Lot • Porsi: ${s['ownershipPct']}%',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      CurrencyFormatter.formatCompact(valuation),
                      style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

extension NumberFormatExtension on num {
  String toLocaleString() {
    return NumberFormat('#,###', 'id_ID').format(this);
  }
}

