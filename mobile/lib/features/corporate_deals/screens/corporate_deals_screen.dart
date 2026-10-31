import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/socket_service.dart';
import '../models/deal_model.dart';
import '../services/deals_service.dart';
import '../widgets/deal_card.dart';
import '../widgets/deed_card.dart';
import '../widgets/p2p_negotiation_sheet.dart';
import '../../court_commercial/screens/court_live_room_screen.dart';
import '../../../widgets/user_inbox_modal.dart';

class CorporateDealsScreen extends StatefulWidget {
  final int initialIndex;
  const CorporateDealsScreen({super.key, this.initialIndex = 0});

  @override
  State<CorporateDealsScreen> createState() => _CorporateDealsScreenState();
}

class _CorporateDealsScreenState extends State<CorporateDealsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<PrivateDealModel> _globalDeals = [];
  List<PrivateDealModel> _inboxDeals = [];
  List<DealDeedModel> _userDeeds = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this, initialIndex: widget.initialIndex);
    _loadAllData();
    SocketService.socket?.on('court:verdict', _onCourtSocketEvent);
    SocketService.socket?.on('court:case_updated', _onCourtSocketEvent);
  }

  void _onCourtSocketEvent(dynamic _) {
    if (mounted) {
      _loadAllData(silent: true);
    }
  }

  @override
  void dispose() {
    SocketService.socket?.off('court:verdict', _onCourtSocketEvent);
    SocketService.socket?.off('court:case_updated', _onCourtSocketEvent);
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData({bool silent = false}) async {
    final user = context.read<GameProvider>().user;
    if (user == null) return;

    final hasData = _globalDeals.isNotEmpty || _inboxDeals.isNotEmpty || _userDeeds.isNotEmpty;
    if (!silent && !hasData) {
      setState(() => _isLoading = true);
    }
    try {
      final results = await Future.wait([
        DealsService.getGlobalDeals(),
        DealsService.getInboxDeals(user.id),
        DealsService.getUserDeeds(user.id),
      ]);

      if (mounted) {
        setState(() {
          _globalDeals = results[0] as List<PrivateDealModel>;
          _inboxDeals = results[1] as List<PrivateDealModel>;
          _userDeeds = results[2] as List<DealDeedModel>;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openCourtRoom(String caseId) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => CourtLiveRoomScreen(caseId: caseId)),
    );
    if (mounted) {
      _loadAllData(silent: true);
    }
  }

  Future<void> _openSellDialog() async {
    final prov = context.read<GameProvider>();
    if (prov.conglomerate.isEmpty) {
      await prov.fetchConglomerate();
    }
    final companies = prov.conglomerate;
    if (companies.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Anda belum memiliki kepemilikan PT Emiten untuk menjual saham'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    if (companies.length == 1) {
      if (mounted) P2PNegotiationSheet.show(context, companies.first);
      return;
    }

    // Modal pilih perusahaan jika memiliki lebih dari 1 emiten
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.business_center_rounded, color: Color(0xFFF5B942), size: 18),
                SizedBox(width: 8),
                Text(
                  'PILIH PERUSAHAAN UNTUK DIJUAL',
                  style: TextStyle(color: Color(0xFFF5B942), fontSize: 13, fontWeight: FontWeight.w900),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...companies.map((c) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.business_rounded, color: Color(0xFF38BDF8), size: 20),
                ),
                title: Text(c['name'] ?? 'PT Konglomerat', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text(
                  'Kepemilikan: ${(c['ownershipPct'] ?? 100).toStringAsFixed(1)}% | Sektor: ${c['sector'] ?? '-'}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                ),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF64748B), size: 14),
                onTap: () {
                  Navigator.pop(ctx);
                  P2PNegotiationSheet.show(context, c);
                },
              ),
            )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<GameProvider>().user;
    final currentUserId = user?.id ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.handshake_rounded, color: Color(0xFFF5B942), size: 14),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(
                    'PASAR NEGOSIASI (P2P)',
                    style: const TextStyle(color: Color(0xFFF5B942), fontSize: 9.5, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const Text(
              'Bursa Efek Federasi (IPMC)',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF38BDF8)),
            onPressed: _loadAllData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelPadding: const EdgeInsets.symmetric(horizontal: 6),
          indicatorColor: const Color(0xFFF5B942),
          labelColor: const Color(0xFFF5B942),
          unselectedLabelColor: const Color(0xFF94A3B8),
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.public_rounded, size: 13),
                  const SizedBox(width: 3),
                  const Flexible(
                    child: Text('Katalog', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                  ),
                  if (_globalDeals.isNotEmpty) ...[
                    const SizedBox(width: 3),
                    _buildBadge(_globalDeals.length.toString(), const Color(0xFF38BDF8)),
                  ],
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.mark_email_unread_rounded, size: 13),
                  const SizedBox(width: 3),
                  const Flexible(
                    child: Text('Inbox P2P', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                  ),
                  if (_inboxDeals.isNotEmpty) ...[
                    const SizedBox(width: 3),
                    _buildBadge(_inboxDeals.length.toString(), const Color(0xFFEF4444)),
                  ],
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.inventory_2_rounded, size: 13),
                  const SizedBox(width: 3),
                  const Flexible(
                    child: Text('Brankas Akta', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                  ),
                  if (_userDeeds.isNotEmpty) ...[
                    const SizedBox(width: 3),
                    _buildBadge(_userDeeds.length.toString(), const Color(0xFF10B981)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFF59E0B),
        foregroundColor: const Color(0xFF451A03),
        icon: const Icon(Icons.add_business_rounded, size: 18),
        label: const Text('JUAL SAHAM P2P', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
        onPressed: _openSellDialog,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF5B942)))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildGlobalTab(currentUserId),
                _buildInboxTab(currentUserId),
                _buildDeedsTab(currentUserId),
              ],
            ),
    );
  }

  Widget _buildGlobalTab(String currentUserId) {
    if (_globalDeals.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadAllData,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: const [
            SizedBox(height: 60),
            Center(
              child: Column(
                children: [
                  Icon(Icons.storefront_rounded, color: Color(0xFF475569), size: 48),
                  SizedBox(height: 12),
                  Text('Belum Ada Penawaran Saham Terbuka', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text('Gunakan tombol "+ JUAL SAHAM P2P" untuk melelang sebagian saham ke seluruh konglomerat.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: _globalDeals.length,
        itemBuilder: (ctx, idx) {
          final deal = _globalDeals[idx];
          return DealCard(
            deal: deal,
            currentUserId: currentUserId,
            isInbox: false,
            onRefresh: _loadAllData,
          );
        },
      ),
    );
  }

  Widget _buildInboxTab(String currentUserId) {
    if (_inboxDeals.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadAllData,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 50),
            Center(
              child: Column(
                children: [
                  const Icon(Icons.inbox_rounded, color: Color(0xFF475569), size: 48),
                  const SizedBox(height: 12),
                  const Text('Tidak Ada Tawaran P2P Aktif', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Jika konglomerat lain menawarkan saham langsung kepada Anda, tawaran tersebut akan muncul di sini untuk ditandatangani.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: () => UserInboxModal.show(context, initialCategory: 'P2P_DEAL'),
                    icon: const Icon(Icons.history_edu_rounded, size: 16),
                    label: const Text('Buka Riwayat Penolakan & Pesan P2P', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFF38BDF8),
                      side: const BorderSide(color: Color(0xFF38BDF8), width: 0.8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            color: const Color(0xFF0F172A),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tawaran Masuk Perlu Tindakan:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
                InkWell(
                  onTap: () => UserInboxModal.show(context, initialCategory: 'P2P_DEAL'),
                  child: const Row(
                    children: [
                      Icon(Icons.history_rounded, size: 13, color: Color(0xFF38BDF8)),
                      SizedBox(width: 4),
                      Text('Riwayat Pesan P2P', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: _inboxDeals.length,
              itemBuilder: (ctx, idx) {
                final deal = _inboxDeals[idx];
                return DealCard(
                  deal: deal,
                  currentUserId: currentUserId,
                  isInbox: true,
                  onRefresh: _loadAllData,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeedsTab(String currentUserId) {
    if (_userDeeds.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadAllData,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: const [
            SizedBox(height: 60),
            Center(
              child: Column(
                children: [
                  Icon(Icons.lock_rounded, color: Color(0xFF475569), size: 48),
                  SizedBox(height: 12),
                  Text('Brankas Akta Masih Kosong', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text('Seluruh akta jual beli saham notariil yang telah ditandatangani dan dibubuhi meterai digital akan tersimpan aman di brankas ini.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: _userDeeds.length,
        itemBuilder: (ctx, idx) {
          final deed = _userDeeds[idx];
          return DeedCard(
            deed: deed,
            currentUserId: currentUserId,
            onRefresh: _loadAllData,
            onOpenCourtRoom: (caseId) => _openCourtRoom(caseId),
          );
        },
      ),
    );
  }

  Widget _buildBadge(String count, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
      child: Text(
        count,
        style: const TextStyle(color: Colors.black, fontSize: 8.5, fontWeight: FontWeight.w900),
      ),
    );
  }
}
