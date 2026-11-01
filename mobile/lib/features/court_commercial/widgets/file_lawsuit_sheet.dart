import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/api_service.dart';
import '../../../utils/formatters.dart';
import '../../../models/company.dart';

class FileLawsuitSheet extends StatefulWidget {
  final VoidCallback onCaseFiled;

  const FileLawsuitSheet({super.key, required this.onCaseFiled});

  static void show(BuildContext context, {required VoidCallback onCaseFiled}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => FileLawsuitSheet(onCaseFiled: onCaseFiled),
    );
  }

  @override
  State<FileLawsuitSheet> createState() => _FileLawsuitSheetState();
}

class _FileLawsuitSheetState extends State<FileLawsuitSheet> {
  String _caseType = 'DISPUTE'; // 'DISPUTE', 'DEFAMATION', 'RECONVENTION', 'BANKRUPTCY', 'REGULATORY'
  bool _takeoverIfInsolvent = true;
  String _selectedLawyerKey = 'NONE'; // 'NONE', 'PUJA', 'ZAHRA', 'SAGALA'
  bool _isConservatoirBeslag = false;
  final TextEditingController _defendantCtrl = TextEditingController();
  final TextEditingController _titleCtrl = TextEditingController();
  final TextEditingController _claimCtrl = TextEditingController(text: '500000000');
  final TextEditingController _notesCtrl = TextEditingController();
  bool _isSubmitting = false;

  String? _selectedDefCompanyId;
  String? _selectedDefUserId;
  String? _selectedDefSymbol;
  String? _selectedDefName;

  final int _courtFee = 250000;

  double get _lawyerFee {
    switch (_selectedLawyerKey) {
      case 'PUJA':
        return 25000000.0;
      case 'ZAHRA':
        return 75000000.0;
      case 'SAGALA':
        return 250000000.0;
      default:
        return 0.0;
    }
  }

  String? get _lawyerName {
    switch (_selectedLawyerKey) {
      case 'PUJA':
        return 'Puja Azzahra, S.H., LL.M.';
      case 'ZAHRA':
        return 'Zahra Bintang, S.H., M.H.';
      case 'SAGALA':
        return 'Khairul Sagala, S.H., C.L.A.';
      default:
        return null;
    }
  }

  @override
  void dispose() {
    _defendantCtrl.dispose();
    _titleCtrl.dispose();
    _claimCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _syncTitleAndNotes(String type) {
    final compLabel = _selectedDefSymbol ?? (_selectedDefName ?? 'Tergugat');
    if (type == 'DEFAMATION') {
      _titleCtrl.text = 'Gugatan Pencemaran Nama Baik & Kerugian Reputasi $compLabel';
      _notesCtrl.text = 'Tergugat sengaja menyebarkan fitnah finansial dan tuduhan palsu yang merusak reputasi pasar saham perseroan. Menuntut ganti rugi pemulihan nama baik. Apabila kas Tergugat tidak mencukupi atau tidak membayar, 100% kepemilikan perseroan Tergugat wajib disita/dialihkan menjadi HAK MILIK Penggugat.';
    } else if (type == 'DISPUTE') {
      _titleCtrl.text = 'Gugatan Wanprestasi Akta & Sengketa Kepemilikan Saham $compLabel';
      _notesCtrl.text = 'Tergugat melanggar klausul kesepakatan notaris dan sengketa kepemilikan saham perseroan. Menuntut pengembalian hak saham portofolio atau pengalihan perseroan.';
    } else if (type == 'RECONVENTION') {
      _titleCtrl.text = 'Gugatan Rekonvensi atas Perkara Fiktif & Tidak Terbukti $compLabel';
      _notesCtrl.text = 'Gugatan tuntutan balik atas perkara gugatan fitnah yang diajukan Tergugat yang telah dinyatakan TIDAK TERBUKTI dan ditolak oleh Pengadilan Niaga PNAF. Menuntut ganti rugi immaterial dan sita aset.';
    } else if (type == 'BANKRUPTCY') {
      _titleCtrl.text = 'Permohonan Kepailitan & Eksekusi Sita Debitur $compLabel';
      _notesCtrl.text = 'Permohonan penetapan kepailitan (PKPU) dan sita eksekusi atas kewajiban utang macet operasional perseroan.';
    } else {
      _titleCtrl.text = 'Laporan Pelanggaran Regulasi Bursa & Goreng Saham $compLabel';
      _notesCtrl.text = 'Laporan resmi kepada Otoritas Pengawas OPFF atas transaksi mencurigakan, manipulasi harga pasar, dan goreng saham.';
    }
  }

  void _selectCompany(CompanyModel comp) {
    setState(() {
      _selectedDefCompanyId = comp.id;
      _selectedDefUserId = comp.ownerId;
      _selectedDefSymbol = comp.symbol;
      _selectedDefName = comp.name;
      final ownerSuffix = ' - @${comp.displayOwnerName}';
      _defendantCtrl.text = '${comp.name} (${comp.symbol})$ownerSuffix';
      _syncTitleAndNotes(_caseType);
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedDefCompanyId = null;
      _selectedDefUserId = null;
      _selectedDefSymbol = null;
      _selectedDefName = null;
      _defendantCtrl.clear();
    });
  }

  void _openCompanySearchDialog() {
    final provider = context.read<GameProvider>();
    final allCompanies = provider.companies;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final searchCtrl = TextEditingController();
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final q = searchCtrl.text.trim().toLowerCase();
            final filtered = allCompanies.where((c) {
              if (q.isEmpty) return true;
              final owner = c.displayOwnerName.toLowerCase();
              return c.name.toLowerCase().contains(q) ||
                  c.symbol.toLowerCase().contains(q) ||
                  owner.contains(q) ||
                  (c.founderName?.toLowerCase().contains(q) ?? false) ||
                  (c.ownerUsername?.toLowerCase().contains(q) ?? false) ||
                  c.sector.toLowerCase().contains(q);
            }).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.75,
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                border: Border(top: BorderSide(color: Color(0xFFF5B942), width: 2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'PILIH PERUSAHAAN LAWAN (SITA)',
                        style: TextStyle(color: Color(0xFFF5B942), fontSize: 13, fontWeight: FontWeight.w900),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: searchCtrl,
                    autofocus: true,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    onChanged: (_) => setSheetState(() {}),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      hintText: 'Cari kode saham, nama PT, atau owner (@adit, dsb)...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFF5B942), size: 18),
                      suffixIcon: searchCtrl.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, color: Colors.white54, size: 16),
                              onPressed: () {
                                searchCtrl.clear();
                                setSheetState(() {});
                              },
                            )
                          : null,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF5B942))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Ditemukan ${filtered.length} Perusahaan Terdaftar',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: filtered.isEmpty
                        ? const Center(
                            child: Text(
                              'Tidak ada emiten yang cocok dengan pencarian.',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                            ),
                          )
                        : ListView.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) => const Divider(color: Color(0xFF1E293B), height: 1),
                            itemBuilder: (ctx, i) {
                              final comp = filtered[i];
                              return ListTile(
                                dense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                leading: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF5B942).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.4)),
                                  ),
                                  child: Text(
                                    comp.symbol,
                                    style: const TextStyle(color: Color(0xFFF5B942), fontWeight: FontWeight.w900, fontSize: 11, fontFamily: 'monospace'),
                                  ),
                                ),
                                title: Text(
                                  comp.name,
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                subtitle: Text(
                                  'Owner: @${comp.displayOwnerName} • ${comp.sector}',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                ),
                                trailing: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      CurrencyFormatter.formatFull(comp.currentPrice),
                                      style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                    ),
                                    if (comp.isSeized)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: Colors.red.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text('DISITA', style: TextStyle(color: Colors.red, fontSize: 8, fontWeight: FontWeight.bold)),
                                      ),
                                  ],
                                ),
                                onTap: () {
                                  _selectCompany(comp);
                                  Navigator.pop(ctx);
                                },
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _handleSubmit() async {
    final provider = context.read<GameProvider>();
    final user = provider.user;
    if (user == null) return;

    final defendant = _defendantCtrl.text.trim();
    final title = _titleCtrl.text.trim();
    final claimAmount = double.tryParse(_claimCtrl.text.trim()) ?? 0.0;
    final notes = _notesCtrl.text.trim();

    if (defendant.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama pihak tergugat / yang diadukan wajib diisi!'), backgroundColor: Colors.red),
      );
      return;
    }

    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pokok perkara / judul gugatan wajib diisi!'), backgroundColor: Colors.red),
      );
      return;
    }

    final double totalFee = _courtFee.toDouble() + _lawyerFee;
    if (user.balanceIb < totalFee) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saldo Kas Pribadi Anda (${CurrencyFormatter.formatFull(user.balanceIb)}) tidak mencukupi untuk biaya panitera PNAF dan jasa pengacara (${CurrencyFormatter.formatFull(totalFee)}).'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final plaintiffName = user.ptName.isNotEmpty ? '${user.username} (${user.ptName})' : user.username;

    final targetAsset = _takeoverIfInsolvent
        ? '100% Saham & Hak Milik Perseroan Tergugat Dialihkan Jadi Milik Penggugat jika Duit Kurang'
        : 'Saham Portofolio & Kas Perseroan Tergugat';

    final fullNotes = _takeoverIfInsolvent
        ? '${notes.isNotEmpty ? notes : 'Permohonan gugatan resmi diajukan ke PNAF.'} [KLAUSUL AKUISISI EKSEKUSI: Jika Tergugat kalah & kas kurang, perseroan disita dan dialihkan jadi hak milik Penggugat]'
        : (notes.isNotEmpty ? notes : 'Permohonan gugatan resmi diajukan melalui aplikasi terpadu PNAF Federasi.');

    final res = await ApiService.fileCourtCase(
      plaintiffName: plaintiffName,
      plaintiffUserId: user.id,
      defendantName: defendant,
      defendantUserId: _selectedDefUserId,
      defendantCompanyId: _selectedDefCompanyId,
      caseType: _caseType,
      title: title,
      claimAmountIb: claimAmount,
      notes: fullNotes,
      targetAssetDescription: targetAsset,
      lawyerName: _lawyerName,
      lawyerFeeIb: _lawyerFee,
      isConservatoirBeslag: _isConservatoirBeslag,
    );

    setState(() => _isSubmitting = false);

    if (!mounted) return;

    if (res['error'] != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('❌ Gagal: ${res['error']}'), backgroundColor: Colors.red),
      );
    } else {
      Navigator.pop(context);
      widget.onCaseFiled();
      await provider.fetchConglomerate();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('⚖️ ${res['message'] ?? 'Gugatan berhasil diregister ke PNAF!'}\nBerita gugatan langsung disiarkan ke bursa!'),
            backgroundColor: const Color(0xFF10B981),
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: Color(0xFFF5B942), width: 2)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),

            // Header Pendaftaran
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5B942).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF5B942)),
                  ),
                  child: const Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 22),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'FORMULIR PENGADUAN & GUGATAN PNAF',
                        style: TextStyle(color: Color(0xFFF5B942), fontSize: 13, fontWeight: FontWeight.w900),
                      ),
                      Text(
                        'Kepaniteraan Niaga & Arbitrase Korporasi Republik Federasi',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Pilihan Kategori Perkara
            const Text('Pilih Kategori Gugatan:', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                children: [
                  _buildTypeTile(
                    'DISPUTE',
                    '📜 Sengketa Akta Saham / Wanprestasi',
                    'Menggugat sengketa saham, pelanggaran akta notaris, atau wanprestasi. Saham dikembalikan / PT dialihkan!',
                    const Color(0xFFF59E0B),
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 8),
                  _buildTypeTile(
                    'DEFAMATION',
                    '🛡️ Pencemaran Nama Baik & Kerugian Reputasi',
                    'Fitnah pasar, hoax emiten, tuduhan palsu perusak reputasi. Tuntut denda & ambil alih PT jika kas kurang!',
                    const Color(0xFF38BDF8),
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 8),
                  _buildTypeTile(
                    'RECONVENTION',
                    '⚔️ Gugatan Balasan Rekonvensi (Perkara Fiktif)',
                    'Tuntutan ganti rugi atas perkara lawan yang terbukti fiktif / tidak terbukti. Sita aset pembuat fitnah!',
                    const Color(0xFFA855F7),
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 8),
                  _buildTypeTile(
                    'BANKRUPTCY',
                    '⚖️ Permohonan PKPU & Restrukturisasi BCF',
                    'Meminta moratorium penundaan cicilan kredit pinjaman Bank Sentral (BCF).',
                    const Color(0xFF10B981),
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 8),
                  _buildTypeTile(
                    'REGULATORY',
                    '🚨 Laporan Manipulasi Pasar & Goreng Saham',
                    'Melaporkan emiten spekulan mencurigakan ke Otoritas Pengawas OPFF.',
                    const Color(0xFFF43F5E),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Field Pihak Tergugat
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Pihak Tergugat / Terlapor (PT Lawan):', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                InkWell(
                  onTap: _openCompanySearchDialog,
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5B942).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.4)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.search_rounded, color: Color(0xFFF5B942), size: 12),
                        SizedBox(width: 4),
                        Text('Cari PT (360+ Emiten)', style: TextStyle(color: Color(0xFFF5B942), fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _defendantCtrl,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              onChanged: (_) {
                if (_selectedDefCompanyId != null) {
                  setState(() {
                    _selectedDefCompanyId = null;
                    _selectedDefUserId = null;
                    _selectedDefSymbol = null;
                    _selectedDefName = null;
                  });
                }
              },
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF070B14),
                hintText: 'Pilih lewat tombol Cari PT atau ketik nama PT / pemain...',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                suffixIcon: _selectedDefCompanyId != null
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                        onPressed: _clearSelection,
                      )
                    : IconButton(
                        icon: const Icon(Icons.search_rounded, color: Color(0xFFF5B942), size: 18),
                        onPressed: _openCompanySearchDialog,
                      ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF5B942))),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),

            // Quick suggestions chips for popular targets
            Consumer<GameProvider>(
              builder: (context, provider, _) {
                final comps = provider.companies.take(4).toList();
                if (comps.isEmpty) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: comps.map((c) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ActionChip(
                            label: Text(
                              '${c.symbol} • ${c.name}',
                              style: const TextStyle(fontSize: 9.5, color: Color(0xFFCBD5E1), fontWeight: FontWeight.w600),
                            ),
                            backgroundColor: const Color(0xFF070B14),
                            side: const BorderSide(color: Color(0xFF1E293B)),
                            visualDensity: VisualDensity.compact,
                            onPressed: () => _selectCompany(c),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                );
              },
            ),

            if (_selectedDefCompanyId != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF43F5E).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF43F5E).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shield_outlined, color: Color(0xFFF43F5E), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Target Sita Eksekusi: $_selectedDefName ($_selectedDefSymbol)',
                            style: const TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            '⚡ Jika Majelis Hakim PNAF memvonis bersalah: Ganti rugi otomatis memotong kas Tergugat & perseroan langsung DISITA masuk antrean Lelang BCF!',
                            style: TextStyle(color: Color(0xFFFDA4AF), fontSize: 9.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),

            // Field Pokok Perkara
            const Text('Pokok Perkara / Judul Tuntutan:', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _titleCtrl,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF070B14),
                hintText: 'Contoh: Gugatan Pembatalan Akta Jual Beli Saham Tanpa Izin',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF5B942))),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            const SizedBox(height: 14),

            // Field Nilai Tuntutan Ganti Rugi
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Nilai Tuntutan Kerugian (IB):', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                Text(
                  CurrencyFormatter.formatFull(double.tryParse(_claimCtrl.text) ?? 0.0),
                  style: const TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                ),
              ],
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _claimCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'monospace'),
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF070B14),
                prefixText: 'IB ',
                prefixStyle: const TextStyle(color: Color(0xFFF5B942), fontWeight: FontWeight.bold),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF5B942))),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [50000000.0, 100000000.0, 500000000.0, 1000000000.0, 5000000000.0].map((amt) {
                final label = CurrencyFormatter.formatCompact(amt);
                return ActionChip(
                  label: Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFFCBD5E1), fontWeight: FontWeight.w600)),
                  backgroundColor: const Color(0xFF070B14),
                  side: const BorderSide(color: Color(0xFF1E293B)),
                  visualDensity: VisualDensity.compact,
                  onPressed: () {
                    setState(() {
                      _claimCtrl.text = amt.toStringAsFixed(0);
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 14),

            // Field Alasan Hukum
            const Text('Ringkasan Fakta Hukum & Kerugian:', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _notesCtrl,
              maxLines: 3,
              style: const TextStyle(color: Colors.white, fontSize: 12),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF070B14),
                hintText: 'Jelaskan secara singkat bagaimana Tergugat merugikan Anda atau melanggar kesepakatan...',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFF5B942))),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            const SizedBox(height: 14),

            // Klausul Eksekusi Ambil Alih Hak Milik jika Duit Kurang
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _takeoverIfInsolvent ? const Color(0xFFF5B942).withValues(alpha: 0.12) : const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _takeoverIfInsolvent ? const Color(0xFFF5B942).withValues(alpha: 0.5) : const Color(0xFF1E293B)),
              ),
              child: Row(
                children: [
                  Icon(Icons.workspace_premium_rounded, color: _takeoverIfInsolvent ? const Color(0xFFF5B942) : Colors.grey, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '👑 Klausul Ambil Alih Hak Milik PT (Jika Kas Kurang)',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _takeoverIfInsolvent
                              ? 'Jika Tergugat kalah & uang kasnya kurang / tidak bayar denda, 100% kepemilikan PT Tergugat disita dan dialihkan jadi hak milik Anda!'
                              : 'Sita biasa / lelang terbuka ke Balai Lelang BCF jika Tergugat tidak mampu membayar.',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _takeoverIfInsolvent,
                    activeColor: const Color(0xFFF5B942),
                    onChanged: (val) => setState(() => _takeoverIfInsolvent = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Pilihan Kuasa Hukum & Advokat PNAF (Top Lawyers)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'PILIH KUASA HUKUM & ADVOKAT (PNAF)',
                        style: TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Sewa advokat top bursa untuk meningkatkan peluang kemenangan perkara dan menuntut pemulihan kerugian maksimal.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                  ),
                  const SizedBox(height: 10),
                  _buildLawyerTile(
                    'SAGALA',
                    'Khairul Sagala, S.H., C.L.A.',
                    'Sagala & Associates • Sultan Tier',
                    250000000.0,
                    '🔥 Win Rate +50%, Eksekusi Sita Seketika, Dalil Besi Baja Tak Terbantahkan',
                    const Color(0xFFE11D48),
                  ),
                  const SizedBox(height: 6),
                  _buildLawyerTile(
                    'ZAHRA',
                    'Zahra Bintang, S.H., M.H.',
                    'Bintang Law Office • Commercial Expert',
                    75000000.0,
                    '⚡ Win Rate +35%, Ahli Sita Jaminan & Imunitas Gugatan Rekonvensi',
                    const Color(0xFF8B5CF6),
                  ),
                  const SizedBox(height: 6),
                  _buildLawyerTile(
                    'PUJA',
                    'Puja Azzahra, S.H., LL.M.',
                    'Azzahra & Partners Law Firm',
                    25000000.0,
                    '🛡️ Win Rate +20%, Pengembalian Tuntutan Ganti Rugi Penuh',
                    const Color(0xFF38BDF8),
                  ),
                  const SizedBox(height: 6),
                  _buildLawyerTile(
                    'NONE',
                    'Maju Mandiri (Tanpa Pengacara)',
                    'Pembelaan Sendiri di Muka Persidangan',
                    0.0,
                    'Biaya honorarium IB 0 (hanya bayar registrasi panitera)',
                    const Color(0xFF64748B),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Permohonan Sita Jaminan (Conservatoir Beslag)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isConservatoirBeslag ? const Color(0xFF0284C7).withValues(alpha: 0.15) : const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _isConservatoirBeslag ? const Color(0xFF38BDF8) : const Color(0xFF1E293B)),
              ),
              child: Row(
                children: [
                  Icon(Icons.lock_person_rounded, color: _isConservatoirBeslag ? const Color(0xFF38BDF8) : Colors.grey, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '🔒 Permohonan Sita Jaminan (Conservatoir Beslag)',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _isConservatoirBeslag
                              ? 'Majelis Hakim akan membekukan kas Tergugat hingga sebesar nilai tuntutan selama persidangan berlangsung agar Tergugat tidak memindahkan dana!'
                              : 'Tidak mengajukan sita jaminan sebelum putusan diketuk.',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _isConservatoirBeslag,
                    activeColor: const Color(0xFF38BDF8),
                    onChanged: (val) => setState(() => _isConservatoirBeslag = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Info Biaya Panitera & Honorarium Pengacara
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Biaya Registrasi Panitera PNAF:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                          Text('Meterai Digital & Berita Acara', style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                        ],
                      ),
                      Text(CurrencyFormatter.formatFull(_courtFee.toDouble()), style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                    ],
                  ),
                  if (_lawyerFee > 0) ...[
                    const Divider(color: Color(0xFF1E293B), height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Honorarium Kuasa Hukum:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                            Text(_lawyerName ?? '', style: const TextStyle(color: Color(0xFFF5B942), fontSize: 9, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Text(CurrencyFormatter.formatFull(_lawyerFee), style: const TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      ],
                    ),
                  ],
                  const Divider(color: Color(0xFF334155), height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('TOTAL BIAYA DIAJUKAN:', style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                      Text(
                        CurrencyFormatter.formatFull(_courtFee.toDouble() + _lawyerFee),
                        style: const TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Tombol Kirim Gugatan
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                icon: _isSubmitting
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                    : const Icon(Icons.draw_rounded, size: 18),
                label: Text(
                  _isSubmitting ? 'MEREGISTER GUGATAN...' : '✍️ TANDATANGANI & DAFTARKAN KE PNAF',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF5B942),
                  foregroundColor: const Color(0xFF0A0F1D),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSubmitting ? null : _handleSubmit,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeTile(String key, String title, String subtitle, Color color) {
    final isSelected = _caseType == key;
    return InkWell(
      onTap: () {
        setState(() {
          _caseType = key;
          _syncTitleAndNotes(key);
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? color : Colors.transparent),
        ),
        child: Row(
          children: [
            Icon(isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: isSelected ? color : const Color(0xFF64748B), size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: isSelected ? Colors.white : const Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLawyerTile(String key, String name, String firm, double fee, String perk, Color color) {
    final isSelected = _selectedLawyerKey == key;
    return InkWell(
      onTap: () => setState(() => _selectedLawyerKey = key),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : const Color(0xFF0B1120),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? color : const Color(0xFF1E293B), width: isSelected ? 1.5 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Icon(isSelected ? Icons.check_circle_rounded : Icons.circle_outlined, color: isSelected ? color : const Color(0xFF64748B), size: 15),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Text(
                          name,
                          style: TextStyle(color: isSelected ? Colors.white : const Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  fee > 0 ? CurrencyFormatter.formatFull(fee) : 'GRATIS',
                  style: TextStyle(color: isSelected ? const Color(0xFFF5B942) : const Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.only(left: 22),
              child: Text(firm, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9)),
            ),
            const SizedBox(height: 3),
            Padding(
              padding: const EdgeInsets.only(left: 22),
              child: Text(perk, style: TextStyle(color: isSelected ? color : const Color(0xFF94A3B8), fontSize: 9)),
            ),
          ],
        ),
      ),
    );
  }
}
