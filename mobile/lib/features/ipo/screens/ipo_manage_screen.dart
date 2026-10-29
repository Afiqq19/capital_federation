import 'package:flutter/material.dart';
import '../../../services/api_service.dart';
import '../../../utils/formatters.dart';

class IpoManageScreen extends StatefulWidget {
  final Map<String, dynamic> ipoOffering;
  final String userId;

  const IpoManageScreen({
    super.key,
    required this.ipoOffering,
    required this.userId,
  });

  @override
  State<IpoManageScreen> createState() => _IpoManageScreenState();
}

class _IpoManageScreenState extends State<IpoManageScreen> {
  List<Map<String, dynamic>> _bids = [];
  bool _isLoading = true;
  final Set<String> _acceptedBids = {};
  final Set<String> _rejectedBids = {};

  @override
  void initState() {
    super.initState();
    _fetchBids();
  }

  Future<void> _fetchBids() async {
    setState(() => _isLoading = true);
    try {
      final ipoId = widget.ipoOffering['id']?.toString() ?? '';
      final res = await ApiService.getIpoBids(ipoId);
      if (mounted) {
        setState(() {
          _bids = res;
          for (final b in res) {
            if (b['status'] == 'ACCEPTED') _acceptedBids.add(b['id'].toString());
            if (b['status'] == 'REJECTED') _rejectedBids.add(b['id'].toString());
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  double get _totalApprovedPct {
    double total = 0.0;
    for (final b in _bids) {
      if (_acceptedBids.contains(b['id'].toString())) {
        total += (b['requested_percentage'] as num?)?.toDouble() ?? 0.0;
      }
    }
    return total;
  }

  double get _totalFundInjected {
    double total = 0.0;
    for (final b in _bids) {
      if (_acceptedBids.contains(b['id'].toString())) {
        total += (b['total_investment_ib'] as num?)?.toDouble() ?? 0.0;
      }
    }
    return total;
  }

  Future<void> _submitAllotmentDecision() async {
    final ipoId = widget.ipoOffering['id']?.toString() ?? '';
    final res = await ApiService.submitIpoAllotment(
      ipoId: ipoId,
      issuerUserId: widget.userId,
      acceptedBidIds: _acceptedBids.toList(),
      rejectedBidIds: _rejectedBids.toList(),
    );

    if (mounted) {
      if (res['error'] != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Gagal: ${res['error']}'), backgroundColor: Colors.red),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Penjatahan Mitra Berhasil Disahkan!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        _fetchBids();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final compName = widget.ipoOffering['company_name'] ?? 'PT Emiten Baru';
    final symbol = widget.ipoOffering['symbol'] ?? 'TBK';
    final price = (widget.ipoOffering['offering_price'] as num?)?.toDouble() ?? 1000.0;
    final publicPct = (widget.ipoOffering['public_pct'] as num?)?.toDouble() ?? 10.0;
    final maxStrategicPct = (widget.ipoOffering['strategic_pct'] as num?)?.toDouble() ?? 40.0;
    final founderPct = 100.0 - publicPct - _totalApprovedPct;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('PENJATAHAN MITRA IPO • $symbol', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900)),
            Text(compName, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchBids,
        color: const Color(0xFFF5B942),
        backgroundColor: const Color(0xFF0F172A),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF1E293B), Color(0xFF0F172A)]),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.how_to_reg_rounded, color: Color(0xFFF5B942), size: 18),
                        SizedBox(width: 8),
                        Text('HAK PREROGATIF SELEKSI PENDIRI', style: TextStyle(color: Color(0xFFF5B942), fontSize: 10, fontWeight: FontWeight.w900)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Pilih perusahaan yang layak menjadi mitra strategis pre-IPO. Dana investasi mitra langsung masuk ke Kas PT Emiten untuk modal kerja.',
                      style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.4),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildStat('Harga Saham', CurrencyFormatter.formatCompact(price), const Color(0xFF38BDF8)),
                        _buildStat('Jatah Publik', '${publicPct.toStringAsFixed(0)}%', const Color(0xFFF59E0B)),
                        _buildStat('Porsi Pendiri', '${founderPct.toStringAsFixed(0)}%', const Color(0xFF10B981)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Total Injeksi Modal Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF064E3B), Color(0xFF0F172A)]),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF10B981)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('TOTAL DANA SEGAR MASUK KAS PT:', style: TextStyle(color: Color(0xFF34D399), fontSize: 9.5, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text(
                          CurrencyFormatter.formatFull(_totalFundInjected),
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF070B14),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${_totalApprovedPct.toStringAsFixed(0)}% / $maxStrategicPct%',
                        style: const TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Daftar Proposal Bidding Masuk
              const Row(
                children: [
                  Icon(Icons.business_center_rounded, color: Color(0xFF38BDF8), size: 16),
                  SizedBox(width: 8),
                  Text('DAFTAR PROPOSAL MASUK DARI PT LAIN', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 10),

              if (_isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: Color(0xFFF5B942))))
              else if (_bids.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: const Center(
                    child: Text(
                      'Belum ada penawaran mitra dari PT lain.\nPerusahaan lain dapat mengajukan penawaran saat periode bookbuilding.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.4),
                    ),
                  ),
                )
              else
                ..._bids.map((b) => _buildBidCard(b, maxStrategicPct)),

              const SizedBox(height: 24),
              // Tombol Konfirmasi Penjatahan
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.check_circle_rounded, size: 18),
                  label: const Text('SAHKAN KEPUTUSAN PENJATAHAN MITRA', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _bids.isNotEmpty ? _submitAllotmentDecision : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStat(String title, String val, Color valColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
        Text(val, style: TextStyle(color: valColor, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
      ],
    );
  }

  Widget _buildBidCard(Map<String, dynamic> b, double maxStrategicPct) {
    final bidId = b['id'].toString();
    final ptName = b['bidder_company_name'] ?? b['bidder_pt_name'] ?? 'PT Penawar';
    final username = b['bidder_username'] ?? 'Pemain';
    final requestedPct = (b['requested_percentage'] as num?)?.toDouble() ?? 0.0;
    final totalAmount = (b['total_investment_ib'] as num?)?.toDouble() ?? 0.0;
    final fundScore = (b['fundamental_score'] as num?)?.toDouble() ?? 70.0;
    final isHealthy = fundScore >= 60;
    final pitch = b['strategic_pitch'] ?? '-';

    final isAccepted = _acceptedBids.contains(bidId);
    final isRejected = _rejectedBids.contains(bidId);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isAccepted
              ? const Color(0xFF10B981)
              : (isRejected ? const Color(0xFFEF4444) : const Color(0xFF1E293B)),
          width: isAccepted || isRejected ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  ptName,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (isHealthy ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Skor PT: ${fundScore.toStringAsFixed(0)} (${isHealthy ? 'SEHAT' : 'BERISIKO'})',
                  style: TextStyle(
                    color: isHealthy ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('Pemilik: $username • Ingin Masuk: ${requestedPct.toStringAsFixed(0)}% Saham', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
          const SizedBox(height: 6),
          Text('Memo Kemitraan: "$pitch"', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, fontStyle: FontStyle.italic)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Nilai Setoran: ${CurrencyFormatter.formatFull(totalAmount)}',
                style: const TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
              ),
              Row(
                children: [
                  IconButton(
                    icon: Icon(
                      Icons.cancel_rounded,
                      color: isRejected ? const Color(0xFFEF4444) : const Color(0xFF64748B),
                    ),
                    tooltip: 'Tolak',
                    onPressed: () {
                      setState(() {
                        _rejectedBids.add(bidId);
                        _acceptedBids.remove(bidId);
                      });
                    },
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.check_circle_rounded,
                      color: isAccepted ? const Color(0xFF10B981) : const Color(0xFF64748B),
                    ),
                    tooltip: 'Terima Sebagai Mitra',
                    onPressed: () {
                      if (_totalApprovedPct + requestedPct > maxStrategicPct && !isAccepted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Melebihi kuota kemitraan ($maxStrategicPct%)'), backgroundColor: Colors.orange),
                        );
                        return;
                      }
                      setState(() {
                        _acceptedBids.add(bidId);
                        _rejectedBids.remove(bidId);
                      });
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
