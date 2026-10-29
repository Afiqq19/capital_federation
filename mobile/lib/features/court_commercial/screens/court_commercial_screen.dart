import 'package:flutter/material.dart';
import '../models/court_case_model.dart';
import '../widgets/file_lawsuit_sheet.dart';
import 'court_live_room_screen.dart';
import '../../../services/api_service.dart';
import '../../../utils/formatters.dart';

class CourtCommercialScreen extends StatefulWidget {
  const CourtCommercialScreen({super.key});

  @override
  State<CourtCommercialScreen> createState() => _CourtCommercialScreenState();
}

class _CourtCommercialScreenState extends State<CourtCommercialScreen> {
  List<CourtCaseModel> _cases = [];
  bool _isLoading = true;
  String _selectedFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchCases();
  }

  Future<void> _fetchCases() async {
    setState(() => _isLoading = true);
    try {
      final raw = await ApiService.getCourtCases();
      if (mounted) {
        setState(() {
          _cases = raw.map((c) => CourtCaseModel.fromJson(c)).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<CourtCaseModel> get _filteredCases {
    if (_selectedFilter == 'ALL') return _cases;
    if (_selectedFilter == 'BANKRUPTCY') {
      return _cases.where((c) => c.caseType == 'BANKRUPTCY').toList();
    }
    if (_selectedFilter == 'DISPUTE') {
      return _cases.where((c) => c.caseType == 'DISPUTE').toList();
    }
    if (_selectedFilter == 'REGULATORY') {
      return _cases.where((c) => c.caseType == 'REGULATORY').toList();
    }
    return _cases;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => FileLawsuitSheet.show(context, onCaseFiled: _fetchCases),
        backgroundColor: const Color(0xFFF5B942),
        foregroundColor: const Color(0xFF0A0F1D),
        icon: const Icon(Icons.add_circle_outline_rounded, size: 20),
        label: const Text(
          'AJUKAN PENGADUAN / GUGATAN',
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900),
        ),
      ),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.note_add_rounded, color: Color(0xFFF5B942)),
            tooltip: 'Daftarkan Gugatan PNAF',
            onPressed: () => FileLawsuitSheet.show(context, onCaseFiled: _fetchCases),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF94A3B8)),
            onPressed: _fetchCases,
          ),
        ],
        title: const Row(
          children: [
            Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PENGADILAN NIAGA FEDERASI',
                    style: TextStyle(color: Color(0xFFF5B942), fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 0.6),
                  ),
                  Text(
                    'Mahkamah Arbitrase & Kepailitan Korporasi PNAF',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchCases,
        color: const Color(0xFFF5B942),
        backgroundColor: const Color(0xFF0F172A),
        child: Column(
          children: [
            // Banner Mahkamah
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.4)),
              ),
              child: const Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: Color(0xFF2D1F08),
                    child: Icon(Icons.balance_rounded, color: Color(0xFFF5B942), size: 22),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'SIDANG PERKARA NIAGA REPUBLIK FEDERASI',
                          style: TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.w900),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Penyelesaian perkara gagal bayar (PKPU), sita eksekusi jaminan BCF, dan sengketa akta kepemilikan saham.',
                          style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 10, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _buildFilterChip('ALL', 'Semua Perkara'),
                  const SizedBox(width: 8),
                  _buildFilterChip('BANKRUPTCY', '⚖️ Pailit & PKPU'),
                  const SizedBox(width: 8),
                  _buildFilterChip('DISPUTE', '📜 Sengketa Saham'),
                  const SizedBox(width: 8),
                  _buildFilterChip('REGULATORY', '🚨 Pelanggaran Bursa'),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // List Perkara
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFFF5B942)))
                  : _filteredCases.isEmpty
                      ? const Center(
                          child: Text('Tidak ada perkara aktif di Pengadilan Niaga', style: TextStyle(color: Color(0xFF64748B))),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: _filteredCases.length,
                          itemBuilder: (ctx, idx) => _buildCaseCard(_filteredCases[idx]),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: const Color(0xFFF5B942),
      backgroundColor: const Color(0xFF0F172A),
      labelStyle: TextStyle(
        color: isSelected ? const Color(0xFF451A03) : const Color(0xFF94A3B8),
        fontSize: 10.5,
        fontWeight: FontWeight.bold,
      ),
      onSelected: (val) {
        if (val) setState(() => _selectedFilter = key);
      },
    );
  }

  Widget _buildCaseCard(CourtCaseModel item) {
    Color statusColor = const Color(0xFF38BDF8);
    String statusText = 'DALAM SIDANG';
    if (item.status == 'VERDICT_PAILIT') {
      statusColor = const Color(0xFFEF4444);
      statusText = 'VONIS PAILIT / SITA';
    } else if (item.status == 'VERDICT_PKPU') {
      statusColor = const Color(0xFF10B981);
      statusText = 'RESTRUKTURISASI / MEDIASI';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: statusColor.withValues(alpha: 0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => _showVerdictModal(item),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item.caseNumber,
                      style: const TextStyle(color: Color(0xFFF5B942), fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: statusColor, width: 0.8),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(color: statusColor, fontSize: 8.5, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  item.title,
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Penggugat:', style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                          Text(item.plaintiffName, style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_rounded, color: Color(0xFF475569), size: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Tergugat:', style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                          Text(item.defendantName, style: const TextStyle(color: Color(0xFFF87171), fontSize: 10.5, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
                if (item.claimAmountIb > 0) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF070B14),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Nilai Gugatan / Kredit Macet:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5)),
                        Text(
                          CurrencyFormatter.formatFull(item.claimAmountIb),
                          style: const TextStyle(color: Color(0xFFF5B942), fontSize: 10.5, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Jadwal: ${item.courtHearingDate}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5)),
                    const Text('Detail Berita Acara ➔', style: TextStyle(color: Color(0xFFF5B942), fontSize: 9.5, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  height: 36,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.meeting_room_rounded, size: 14),
                    label: const Text(
                      '⚖️ MASUK KE RUANG SIDANG ARBITRASE (LIVE)',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: const Color(0xFF451A03),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => CourtLiveRoomScreen(caseId: item.id)),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showVerdictModal(CourtCaseModel item) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0A0F1D),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFF5B942), width: 1.5),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: const BoxDecoration(
                  color: Color(0xFF1E293B),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 20),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'BERITA ACARA & VONIS MAHKAMAH PNAF',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Nomor Register: ${item.caseNumber}', style: const TextStyle(color: Color(0xFFF5B942), fontSize: 10, fontFamily: 'monospace')),
                    const SizedBox(height: 8),
                    Text(item.title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    const Text('STATUS PERKARA & KETUKAN PALU:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      item.verdictNotes.isNotEmpty ? item.verdictNotes : 'Perkara sedang dalam proses pemeriksaan bukti dan klarifikasi para pihak di hadapan Majelis Hakim.',
                      style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.4),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2D1F08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF5B942)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified_user_rounded, color: Color(0xFFF5B942), size: 14),
                            SizedBox(width: 6),
                            Text(
                              'SEKRETARIAT PANITERA PENGADILAN NIAGA FEDERASI',
                              style: TextStyle(color: Color(0xFFF5B942), fontSize: 8.5, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
