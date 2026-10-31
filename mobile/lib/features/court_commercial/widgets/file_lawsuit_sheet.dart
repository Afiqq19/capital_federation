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
  String _caseType = 'DISPUTE'; // 'DISPUTE', 'BANKRUPTCY', 'REGULATORY'
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

  @override
  void dispose() {
    _defendantCtrl.dispose();
    _titleCtrl.dispose();
    _claimCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _selectCompany(CompanyModel comp) {
    setState(() {
      _selectedDefCompanyId = comp.id;
      _selectedDefUserId = comp.ownerId;
      _selectedDefSymbol = comp.symbol;
      _selectedDefName = comp.name;
      final ownerSuffix = (comp.ownerUsername != null && comp.ownerUsername!.isNotEmpty) ? ' - @${comp.ownerUsername}' : '';
      _defendantCtrl.text = '${comp.name} (${comp.symbol})$ownerSuffix';

      if (_titleCtrl.text.isEmpty ||
          _titleCtrl.text.startsWith('Gugatan') ||
          _titleCtrl.text.startsWith('Permohonan') ||
          _titleCtrl.text.startsWith('Laporan')) {
        if (_caseType == 'BANKRUPTCY') {
          _titleCtrl.text = 'Permohonan Kepailitan & Eksekusi Sita Jaminan ${comp.name}';
        } else if (_caseType == 'DISPUTE') {
          _titleCtrl.text = 'Gugatan Wanprestasi Akta & Sengketa Saham ${comp.symbol}';
        } else {
          _titleCtrl.text = 'Laporan Pelanggaran Regulasi Bursa & Goreng Saham ${comp.symbol}';
        }
      }
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
        String searchQuery = '';
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filtered = allCompanies.where((c) {
              if (searchQuery.isEmpty) return true;
              final q = searchQuery.toLowerCase();
              return c.name.toLowerCase().contains(q) ||
                  c.symbol.toLowerCase().contains(q) ||
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
                    autofocus: true,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    onChanged: (val) => setSheetState(() => searchQuery = val.trim()),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFF070B14),
                      hintText: 'Cari kode saham (misal: BALN, ARPD) atau nama PT...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFF5B942), size: 18),
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
                                  'Owner: @${comp.ownerUsername ?? 'Bot/Publik'} • ${comp.sector}',
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

    if (user.balanceIb < _courtFee) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saldo Kas Pribadi Anda (${CurrencyFormatter.formatFull(user.balanceIb)}) tidak mencukupi untuk biaya panitera PNAF (IB 250.000).'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final plaintiffName = user.ptName.isNotEmpty ? '${user.username} (${user.ptName})' : user.username;

    final res = await ApiService.fileCourtCase(
      plaintiffName: plaintiffName,
      plaintiffUserId: user.id,
      defendantName: defendant,
      defendantUserId: _selectedDefUserId,
      defendantCompanyId: _selectedDefCompanyId,
      caseType: _caseType,
      title: title,
      claimAmountIb: claimAmount,
      notes: notes.isNotEmpty ? notes : 'Permohonan gugatan resmi diajukan melalui aplikasi terpadu PNAF Federasi.',
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
                    'Menggugat pelanggaran klausul perjanjian jual-beli saham atau sengketa dividen.',
                    const Color(0xFFF59E0B),
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

            // Info Biaya Panitera
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Biaya Registrasi Panitera PNAF:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      Text('Meterai Digital & Berita Acara', style: TextStyle(color: Color(0xFF64748B), fontSize: 9)),
                    ],
                  ),
                  Text(CurrencyFormatter.formatFull(_courtFee.toDouble()), style: const TextStyle(color: Color(0xFFF5B942), fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
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
      onTap: () => setState(() => _caseType = key),
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
}
