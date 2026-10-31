import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/api_service.dart';
import '../../../services/socket_service.dart';
import '../../../utils/formatters.dart';
import '../../../utils/wib_time.dart';

class CourtLiveRoomScreen extends StatefulWidget {
  final String caseId;

  const CourtLiveRoomScreen({super.key, required this.caseId});

  @override
  State<CourtLiveRoomScreen> createState() => _CourtLiveRoomScreenState();
}

class _CourtLiveRoomScreenState extends State<CourtLiveRoomScreen> {
  Map<String, dynamic>? _caseData;
  List<dynamic> _messages = [];
  bool _isLoading = true;
  bool _autoJudgeEnabled = true;
  bool _isSubmittingVerdict = false;

  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  Timer? _pollingTimer;
  Timer? _countdownTimer;
  int _secondsLeftToExit = 60;
  bool _openedAsArchive = false;
  bool _liveCountdownActive = false;
  bool _didInitialCheck = false;

  String get _msgEvent => 'court:new_message:${widget.caseId}';
  String get _presenceEvent => 'court:presence_updated:${widget.caseId}';
  String get _verdictEvent => 'court:verdict_reached:${widget.caseId}';

  @override
  void initState() {
    super.initState();
    _fetchRoomData(initial: true);
    _fetchAutoJudgeMode();

    SocketService.socket?.on(_msgEvent, _onNewSocketMessage);
    SocketService.socket?.on(_presenceEvent, _onSocketRefresh);
    SocketService.socket?.on(_verdictEvent, _onSocketVerdict);
    SocketService.socket?.on('court:auto_judge_updated', _onAutoJudgeUpdated);

    // Fallback polling setiap 4 detik selama perkara masih IN_TRIAL
    _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      final status = (_caseData?['status'] ?? 'IN_TRIAL').toString();
      if (status == 'IN_TRIAL') {
        _fetchRoomData();
      }
    });
  }

  @override
  void dispose() {
    SocketService.socket?.off(_msgEvent, _onNewSocketMessage);
    SocketService.socket?.off(_presenceEvent, _onSocketRefresh);
    SocketService.socket?.off(_verdictEvent, _onSocketVerdict);
    SocketService.socket?.off('court:auto_judge_updated', _onAutoJudgeUpdated);
    _pollingTimer?.cancel();
    _countdownTimer?.cancel();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onNewSocketMessage(dynamic msg) {
    if (!mounted || msg == null) return;
    final mapMsg = Map<String, dynamic>.from(msg as Map);
    final exists = _messages.any((m) => m['id'] != null && m['id'] == mapMsg['id']);
    if (!exists) {
      setState(() {
        _messages = [..._messages, mapMsg];
      });
      _scrollToBottom();
    }
  }

  void _onSocketRefresh(dynamic _) {
    if (mounted) _fetchRoomData();
  }

  void _onSocketVerdict(dynamic _) {
    if (!mounted) return;
    _fetchRoomData();
    final prov = context.read<GameProvider>();
    prov.fetchUserData();
    prov.refreshPortfolio();
  }

  void _onAutoJudgeUpdated(dynamic data) {
    if (!mounted) return;
    if (data is Map && data['enabled'] is bool) {
      setState(() => _autoJudgeEnabled = data['enabled'] as bool);
    }
  }

  Future<void> _fetchAutoJudgeMode() async {
    final res = await ApiService.getCourtAutoJudgeStatus();
    if (mounted && res != null) {
      setState(() => _autoJudgeEnabled = res['enabled'] == true);
    }
  }

  bool _isCaseDecided(Map<String, dynamic> data) {
    final st = (data['status'] ?? 'IN_TRIAL').toString().toUpperCase();
    return st != 'IN_TRIAL';
  }

  Future<void> _fetchRoomData({bool initial = false}) async {
    try {
      final data = await ApiService.getCourtRoomDetail(widget.caseId);
      if (data != null && mounted) {
        final List<dynamic> incomingMsgs =
            (data['messages'] is List) ? List<dynamic>.from(data['messages']) : _messages;
        final prevCount = _messages.length;
        final decidedNow = _isCaseDecided(data);

        setState(() {
          _caseData = data;
          _messages = incomingMsgs;
          _isLoading = false;

          if (!_didInitialCheck) {
            _didInitialCheck = true;
            _openedAsArchive = decidedNow;
          } else if (decidedNow && !_openedAsArchive && !_liveCountdownActive) {
            _startLiveExitCountdown();
          }
        });

        if (initial || incomingMsgs.length > prevCount) {
          _scrollToBottom();
        }
      } else if (mounted) {
        setState(() => _isLoading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _startLiveExitCountdown() {
    if (_liveCountdownActive) return;
    _liveCountdownActive = true;
    _secondsLeftToExit = 60;
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeftToExit <= 1) {
        timer.cancel();
        if (mounted) {
          Navigator.pop(context);
        }
      } else if (mounted) {
        setState(() => _secondsLeftToExit--);
      }
    });
  }

  void _cancelLiveCountdown() {
    _countdownTimer?.cancel();
    setState(() {
      _liveCountdownActive = false;
      _openedAsArchive = true;
    });
  }

  Future<void> _checkInPresence(String userId, {String? role}) async {
    try {
      final res = await http.post(
        Uri.parse('${ApiService.baseUrl}/api/court/room/check-in'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'caseId': widget.caseId,
          'userId': userId,
          if (role != null) 'role': role,
        }),
      );
      if (res.statusCode == 200) {
        await _fetchRoomData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🟢 Presensi Berhasil! Panitera mencatat kehadiran Anda di Ruang Sidang.'),
              backgroundColor: Color(0xFF059669),
            ),
          );
        }
      }
    } catch (_) {}
  }

  Future<void> _sendMessage({
    required String userId,
    required String userName,
    required String role,
  }) async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _msgCtrl.clear();

    try {
      await http.post(
        Uri.parse('${ApiService.baseUrl}/api/court/room/${widget.caseId}/messages'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'caseId': widget.caseId,
          'senderUserId': userId,
          'senderName': userName,
          'senderRole': role,
          'role': role,
          'message': text,
        }),
      );
      await _fetchRoomData();
    } catch (_) {}
  }

  Future<void> _submitVerdict({
    String? verdictStatus,
    bool adminOverride = false,
    String? userId,
  }) async {
    if (_isSubmittingVerdict) return;
    setState(() => _isSubmittingVerdict = true);
    final messenger = ScaffoldMessenger.of(context);
    final prov = context.read<GameProvider>();

    final res = await ApiService.issueCourtVerdict(
      caseId: widget.caseId,
      verdictStatus: verdictStatus,
      userId: userId,
      adminJudgeOverride: adminOverride,
    );

    if (!mounted) return;
    setState(() => _isSubmittingVerdict = false);

    if (res['error'] != null) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('⚠️ ${res['error']}'),
          backgroundColor: const Color(0xFFB45309),
        ),
      );
      return;
    }

    await prov.fetchUserData();
    await prov.refreshPortfolio();
    await _fetchRoomData();
    messenger.showSnackBar(
      SnackBar(
        content: Text('🔨 ${res['message'] ?? 'Palu Putusan Resmi Diketuk!'}'),
        backgroundColor: const Color(0xFF059669),
      ),
    );
  }

  String _formatWibClock(dynamic raw) {
    final dt = tryParseServerTime(raw);
    if (dt == null) return '';
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$hh:$mm WIB';
  }

  @override
  Widget build(BuildContext context) {
    final gameProvider = context.watch<GameProvider>();
    final user = gameProvider.user;
    final currentUserId = user?.id ?? '';
    final currentUsername = user?.username ?? 'Konglomerat';
    final unameLower = currentUsername.toLowerCase();
    final bool isAdminAuthority =
        (user?.isAdmin ?? false) || unameLower == 'admin' || unameLower == 'msyafiq19';

    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFF060A13),
        appBar: AppBar(
          title: const Text('Ruang Sidang PNAF', style: TextStyle(color: Colors.white, fontSize: 15)),
          backgroundColor: const Color(0xFF0B1120),
        ),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFFF5B942))),
      );
    }

    final plaintiff = (_caseData?['plaintiff'] is Map)
        ? Map<String, dynamic>.from(_caseData!['plaintiff'])
        : <String, dynamic>{};
    final defendant = (_caseData?['defendant'] is Map)
        ? Map<String, dynamic>.from(_caseData!['defendant'])
        : <String, dynamic>{};

    final String plaintiffName =
        (plaintiff['name'] ?? _caseData?['plaintiff_name'] ?? 'Penggugat').toString();
    final String defendantName =
        (defendant['name'] ?? _caseData?['defendant_name'] ?? 'Tergugat').toString();

    final bool isPlaintiffPresent = plaintiff['present'] == true ||
        plaintiff['present'] == 1 ||
        _caseData?['plaintiff_present'] == 1;
    final bool isDefendantPresent = defendant['present'] == true ||
        defendant['present'] == 1 ||
        _caseData?['defendant_present'] == 1;

    final bool isUserPlaintiff = (plaintiff['id'] != null && plaintiff['id'] == currentUserId) ||
        (unameLower.isNotEmpty && plaintiffName.toLowerCase().contains(unameLower));
    final bool isUserDefendant = (defendant['id'] != null && defendant['id'] == currentUserId) ||
        (unameLower.isNotEmpty && defendantName.toLowerCase().contains(unameLower));
    final bool isUserPresent =
        (isUserPlaintiff && isPlaintiffPresent) || (isUserDefendant && isDefendantPresent);

    final String caseNumber =
        (_caseData?['caseNumber'] ?? _caseData?['case_number'] ?? widget.caseId).toString();
    final String caseTitle = (_caseData?['title'] ?? 'Perkara Niaga PNAF').toString();
    final String hearingTime =
        (_caseData?['hearingTime'] ?? _caseData?['hearing_time'] ?? '10:00 WIB').toString();
    final String roomName = (_caseData?['courtRoomName'] ??
            _caseData?['court_room_name'] ??
            'Ruang Sidang Utama Kartika PNAF')
        .toString();
    final double claimAmount =
        ((_caseData?['claimAmountIb'] ?? _caseData?['claim_amount_ib']) as num?)?.toDouble() ?? 0.0;

    String status = (_caseData?['status'] ?? 'IN_TRIAL').toString().toUpperCase();
    if (status == 'APPROVED') status = 'VERDICT_APPROVED';
    if (status == 'DISMISSED') status = 'VERDICT_REJECTED';

    final bool isDecided = status != 'IN_TRIAL';
    final double verdictAwarded =
        ((_caseData?['verdictAwardedAmount'] ?? _caseData?['verdict_awarded_amount']) as num?)
                ?.toDouble() ??
            0.0;
    final String verdictNotes =
        (_caseData?['verdictNotes'] ?? _caseData?['verdict_notes'] ?? '').toString();
    final String decidedBy =
        (_caseData?['decidedBy'] ?? _caseData?['decided_by'] ?? '').toString();

    return Scaffold(
      backgroundColor: const Color(0xFF060A13),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B1120),
        elevation: 0,
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.balance_rounded, color: Color(0xFFF5B942), size: 14),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(
                    caseNumber,
                    style: const TextStyle(
                      color: Color(0xFFF5B942),
                      fontSize: 10.5,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            Text(
              caseTitle,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF152036),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.schedule_rounded, size: 12, color: Color(0xFF38BDF8)),
                const SizedBox(width: 4),
                Text(
                  hearingTime,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Strip Lokasi Ruang Sidang & Nilai Sengketa
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '🏛️ $roomName',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Klaim: ${CurrencyFormatter.formatFull(claimAmount)}',
                  style: const TextStyle(
                    color: Color(0xFFF5B942),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),

          // Banner Stempel Putusan Inkrah (jika sudah diputus)
          if (isDecided)
            _buildVerdictBanner(
              status: status,
              verdictAwarded: verdictAwarded,
              verdictNotes: verdictNotes,
              decidedBy: decidedBy,
            ),

          // Panel Kehadiran Penggugat & Tergugat
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFF0B1120),
              border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _buildPresenceCard(
                    role: 'PENGGUGAT',
                    name: plaintiffName,
                    isPresent: isPlaintiffPresent,
                    isMe: isUserPlaintiff,
                  ),
                ),
                Container(
                  width: 1,
                  height: 38,
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  color: const Color(0xFF1E293B),
                ),
                Expanded(
                  child: _buildPresenceCard(
                    role: 'TERGUGAT',
                    name: defendantName,
                    isPresent: isDefendantPresent,
                    isMe: isUserDefendant,
                  ),
                ),
              ],
            ),
          ),

          // Tombol Check-In Resmi bagi Pihak Berperkara
          if (!isDecided && !isUserPresent && (isUserPlaintiff || isUserDefendant))
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: const Color(0xFF11192C),
              child: SizedBox(
                height: 38,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.how_to_reg_rounded, size: 17),
                  label: Text(
                    '🟢 KONFIRMASI HADIR SEBAGAI ${isUserPlaintiff ? 'PENGGUGAT' : 'TERGUGAT'}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                  ),
                  onPressed: () => _checkInPresence(
                    currentUserId,
                    role: isUserPlaintiff ? 'PLAINTIFF' : 'DEFENDANT',
                  ),
                ),
              ),
            ),

          // Transkrip Persidangan & Pemeriksaan Bukti
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.gavel_rounded,
                              size: 40, color: const Color(0xFFF5B942).withValues(alpha: 0.45)),
                          const SizedBox(height: 10),
                          Text(
                            isDecided
                                ? 'Perkara ini telah diputus sebelum pencatatan transkrip live.'
                                : 'Panitera sedang menyiapkan berkas persidangan.\nSampaikan dalil & alat bukti Anda di bawah.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11.5,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.all(14),
                    itemCount: _messages.length,
                    itemBuilder: (ctx, idx) =>
                        _buildMessageItem(Map<String, dynamic>.from(_messages[idx]), currentUserId),
                  ),
          ),

          // Panel Bawah: Kontrol Hakim / Status Bot Hakim & Input Argumen
          if (!isDecided) ...[
            if (isAdminAuthority)
              _buildAdminGavelToolbar(currentUserId)
            else
              _buildPlayerJudicialStatusStrip(currentUserId),

            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFF0B1120),
                border: Border(top: BorderSide(color: Color(0xFF1E293B))),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _msgCtrl,
                        style: const TextStyle(color: Colors.white, fontSize: 12.5),
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(
                          userId: currentUserId,
                          userName: isAdminAuthority
                              ? 'Hakim Agung $currentUsername'
                              : currentUsername,
                          role: isAdminAuthority && !isUserPlaintiff && !isUserDefendant
                              ? 'HAKIM'
                              : isUserDefendant
                                  ? 'TERGUGAT'
                                  : 'PENGGUGAT',
                        ),
                        decoration: InputDecoration(
                          hintText: isAdminAuthority && !isUserPlaintiff && !isUserDefendant
                              ? 'Tulis instruksi Majelis Hakim di ruang sidang...'
                              : 'Sampaikan argumen, bukti akta, atau pembelaan...',
                          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11.5),
                          filled: true,
                          fillColor: const Color(0xFF152036),
                          contentPadding:
                              const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5B942),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: IconButton(
                        constraints: const BoxConstraints(minWidth: 38, minHeight: 38),
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.send_rounded, color: Color(0xFF0A0F1D), size: 18),
                        onPressed: () => _sendMessage(
                          userId: currentUserId,
                          userName: isAdminAuthority && !isUserPlaintiff && !isUserDefendant
                              ? 'Hakim Agung $currentUsername'
                              : currentUsername,
                          role: isAdminAuthority && !isUserPlaintiff && !isUserDefendant
                              ? 'HAKIM'
                              : isUserDefendant
                                  ? 'TERGUGAT'
                                  : 'PENGGUGAT',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVerdictBanner({
    required String status,
    required double verdictAwarded,
    required String verdictNotes,
    required String decidedBy,
  }) {
    Color accent = const Color(0xFF10B981);
    List<Color> bgGradient = const [Color(0xFF064E3B), Color(0xFF022C22)];
    String headline = '✅ PUTUSAN INKRAH: GUGATAN DIKABULKAN (APPROVED)';

    if (status == 'VERDICT_PKPU') {
      accent = const Color(0xFF06B6D4);
      bgGradient = const [Color(0xFF164E63), Color(0xFF083344)];
      headline = '🤝 PUTUSAN INKRAH: MEDIASI / PKPU DISETUJUI';
    } else if (status == 'VERDICT_PAILIT') {
      accent = const Color(0xFFEF4444);
      bgGradient = const [Color(0xFF7F1D1D), Color(0xFF450A0A)];
      headline = '🔨 PUTUSAN INKRAH: VONIS PAILIT & SITA EKSEKUSI';
    } else if (status == 'VERDICT_REJECTED') {
      accent = const Color(0xFF94A3B8);
      bgGradient = const [Color(0xFF1E293B), Color(0xFF0F172A)];
      headline = '❌ PUTUSAN INKRAH: GUGATAN DITOLAK / GUGUR';
    }

    final bool isBot = decidedBy.toUpperCase().contains('BOT');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: bgGradient),
        border: Border(bottom: BorderSide(color: accent, width: 1.8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.verified_rounded, color: accent, size: 18),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  headline,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  isBot ? '⚖️ Majelis Hakim' : '👨‍⚖️ Hakim Agung',
                  style: const TextStyle(
                    color: Color(0xFFE2E8F0),
                    fontSize: 8.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (verdictAwarded > 0) ...[
            const SizedBox(height: 5),
            Text(
              '💰 Eksekusi Kompensasi Dicairkan: ${CurrencyFormatter.formatFull(verdictAwarded)}',
              style: const TextStyle(
                color: Color(0xFF6EE7B7),
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
          if (verdictNotes.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              verdictNotes,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFFE2E8F0),
                fontSize: 10,
                height: 1.35,
              ),
            ),
          ],
          if (_liveCountdownActive) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '⏱️ Menutup ruang sidang dalam $_secondsLeftToExit dtk',
                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10),
                ),
                InkWell(
                  onTap: _cancelLiveCountdown,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: const Text(
                      'Tetap Baca Arsip',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAdminGavelToolbar(String currentUserId) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
      decoration: const BoxDecoration(
        color: Color(0xFF11192C),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '🔨 MEJA PALU HAKIM AGUNG PNAF:',
                style: TextStyle(
                  color: Color(0xFFF5B942),
                  fontSize: 9.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
              InkWell(
                onTap: _isSubmittingVerdict
                    ? null
                    : () async {
                        await ApiService.processCourtAutoJudgeNow(caseId: widget.caseId);
                        _fetchRoomData();
                      },
                child: const Text(
                  '🤖 Bot Putuskan ➔',
                  style: TextStyle(
                    color: Color(0xFF34D399),
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildQuickGavelChip(
                label: '✅ Approved',
                color: const Color(0xFF10B981),
                status: 'VERDICT_APPROVED',
                userId: currentUserId,
              ),
              const SizedBox(width: 6),
              _buildQuickGavelChip(
                label: '🤝 PKPU',
                color: const Color(0xFF06B6D4),
                status: 'VERDICT_PKPU',
                userId: currentUserId,
              ),
              const SizedBox(width: 6),
              _buildQuickGavelChip(
                label: '🔨 Pailit',
                color: const Color(0xFFEF4444),
                status: 'VERDICT_PAILIT',
                userId: currentUserId,
              ),
              const SizedBox(width: 6),
              _buildQuickGavelChip(
                label: '❌ Tolak',
                color: const Color(0xFF94A3B8),
                status: 'VERDICT_REJECTED',
                userId: currentUserId,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickGavelChip({
    required String label,
    required Color color,
    required String status,
    required String userId,
  }) {
    return Expanded(
      child: SizedBox(
        height: 30,
        child: OutlinedButton(
          style: OutlinedButton.styleFrom(
            foregroundColor: color,
            backgroundColor: color.withValues(alpha: 0.12),
            side: BorderSide(color: color),
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
          ),
          onPressed: _isSubmittingVerdict
              ? null
              : () => _submitVerdict(
                    verdictStatus: status,
                    adminOverride: true,
                    userId: userId,
                  ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900),
          ),
        ),
      ),
    );
  }

  Widget _buildPlayerJudicialStatusStrip(String currentUserId) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: const BoxDecoration(
        color: Color(0xFF11192C),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Row(
        children: [
          Icon(
            _autoJudgeEnabled ? Icons.smart_toy_rounded : Icons.gavel_rounded,
            color: _autoJudgeEnabled ? const Color(0xFF34D399) : const Color(0xFFF5B942),
            size: 15,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _autoJudgeEnabled
                  ? 'Majelis Hakim Bot PNAF aktif memeriksa bukti & memutus perkara otomatis.'
                  : 'Mode Manual aktif: Menunggu pemeriksaan & ketukan palu Hakim Agung PNAF.',
              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10),
            ),
          ),
          if (_autoJudgeEnabled) ...[
            const SizedBox(width: 6),
            SizedBox(
              height: 28,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF5B942),
                  foregroundColor: const Color(0xFF0A0F1D),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
                ),
                onPressed: _isSubmittingVerdict
                    ? null
                    : () => _submitVerdict(userId: currentUserId),
                child: const Text(
                  '⚖️ Mohon Putusan',
                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMessageItem(Map<String, dynamic> m, String currentUserId) {
    final String rawRole = (m['sender_role'] ?? m['role'] ?? 'PENGGUGAT').toString().toUpperCase();
    final String senderName = (m['sender_name'] ?? m['senderName'] ?? 'Peserta Sidang').toString();
    final String text = (m['message'] ?? '').toString();
    final String timeStr = _formatWibClock(m['created_at'] ?? m['createdAt']);

    final bool isHakim = rawRole.contains('HAKIM') || rawRole == 'JUDGE';
    final bool isPanitera =
        rawRole.contains('PANITERA') || rawRole == 'SYSTEM' || rawRole == 'CLERK';

    if (isHakim) {
      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF231B0E), Color(0xFF15121E)],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF5B942).withValues(alpha: 0.55)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 14),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          senderName,
                          style: const TextStyle(
                            color: Color(0xFFF5B942),
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                if (timeStr.isNotEmpty)
                  Text(
                    timeStr,
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 8.5),
                  ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              text,
              style: const TextStyle(color: Colors.white, fontSize: 11.5, height: 1.38),
            ),
          ],
        ),
      );
    }

    if (isPanitera) {
      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1D2E),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    '📋 $senderName',
                    style: const TextStyle(
                      color: Color(0xFF38BDF8),
                      fontSize: 9.5,
                      fontWeight: FontWeight.w900,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (timeStr.isNotEmpty)
                  Text(
                    timeStr,
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 8.5),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              text,
              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, height: 1.32),
            ),
          ],
        ),
      );
    }

    final bool isMyMessage = currentUserId.isNotEmpty &&
        (m['sender_user_id'] == currentUserId || m['senderUserId'] == currentUserId);
    final bool isDefendantMsg = rawRole.contains('TERGUGAT');
    final Color roleColor = isDefendantMsg ? const Color(0xFFF87171) : const Color(0xFF38BDF8);

    return Align(
      alignment: isMyMessage ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 9),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isMyMessage ? const Color(0xFF0C4A6E) : const Color(0xFF152036),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isMyMessage
                ? const Color(0xFF38BDF8).withValues(alpha: 0.4)
                : const Color(0xFF1E293B),
          ),
        ),
        child: Column(
          crossAxisAlignment: isMyMessage ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    senderName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 5),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: roleColor.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    isDefendantMsg ? 'TERGUGAT' : 'PENGGUGAT',
                    style: TextStyle(
                      color: roleColor,
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              text,
              style: const TextStyle(color: Color(0xFFF1F5F9), fontSize: 11.5, height: 1.32),
            ),
            if (timeStr.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                timeStr,
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 8.5),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPresenceCard({
    required String role,
    required String name,
    required bool isPresent,
    required bool isMe,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              role,
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 8.5,
                fontWeight: FontWeight.w900,
              ),
            ),
            if (isMe) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: const Color(0xFF38BDF8),
                  borderRadius: BorderRadius.circular(3),
                ),
                child: const Text(
                  'ANDA',
                  style: TextStyle(
                    color: Color(0xFF0A0F1D),
                    fontSize: 7.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 2),
        Text(
          name,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 11.5,
            fontWeight: FontWeight.bold,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: isPresent
                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                : const Color(0xFFF59E0B).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: isPresent ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
              width: 0.8,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isPresent ? Icons.check_circle_rounded : Icons.schedule_rounded,
                size: 10,
                color: isPresent ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
              ),
              const SizedBox(width: 4),
              Text(
                isPresent ? 'HADIR' : 'MENUNGGU',
                style: TextStyle(
                  color: isPresent ? const Color(0xFF34D399) : const Color(0xFFFBBF24),
                  fontSize: 8.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
