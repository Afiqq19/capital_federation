import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../../providers/game_provider.dart';
import '../../../services/api_service.dart';
import '../../../utils/formatters.dart';

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
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  Timer? _pollingTimer;
  Timer? _countdownTimer;
  int _secondsLeftToExit = 60;
  bool _hasVerdict = false;

  @override
  void initState() {
    super.initState();
    _fetchRoomData();
    // Poll updates every 2 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      _pollUpdates();
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _countdownTimer?.cancel();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchRoomData() async {
    try {
      final res = await http
          .get(Uri.parse('${ApiService.baseUrl}/api/court/room/${widget.caseId}'))
          .timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final msgRes = await http
            .get(Uri.parse('${ApiService.baseUrl}/api/court/room/${widget.caseId}/messages'))
            .timeout(const Duration(seconds: 4));
        List msgs = [];
        if (msgRes.statusCode == 200) {
          msgs = jsonDecode(msgRes.body);
        }

        if (mounted) {
          setState(() {
            _caseData = data;
            _messages = msgs;
            _isLoading = false;
            if (data['status'] == 'CLOSED' || data['verdictType'] != null) {
              _startExitCountdown();
            }
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pollUpdates() async {
    try {
      final res = await http
          .get(Uri.parse('${ApiService.baseUrl}/api/court/room/${widget.caseId}'))
          .timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final msgRes = await http
            .get(Uri.parse('${ApiService.baseUrl}/api/court/room/${widget.caseId}/messages'))
            .timeout(const Duration(seconds: 3));
        List msgs = [];
        if (msgRes.statusCode == 200) {
          msgs = jsonDecode(msgRes.body);
        }

        if (mounted) {
          setState(() {
            _caseData = data;
            _messages = msgs;
            if ((data['status'] == 'CLOSED' || data['verdictType'] != null) && !_hasVerdict) {
              _startExitCountdown();
            }
          });
        }
      }
    } catch (_) {}
  }

  void _startExitCountdown() {
    if (_hasVerdict) return;
    _hasVerdict = true;
    _secondsLeftToExit = 60;
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeftToExit <= 1) {
        timer.cancel();
        if (mounted) {
          Navigator.pop(context);
        }
      } else {
        if (mounted) {
          setState(() => _secondsLeftToExit--);
        }
      }
    });
  }

  Future<void> _checkInPresence(String userId) async {
    try {
      final res = await http.post(
        Uri.parse('${ApiService.baseUrl}/api/court/room/check-in'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'caseId': widget.caseId, 'userId': userId}),
      );
      if (res.statusCode == 200) {
        _fetchRoomData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🟢 Konfirmasi Kehadiran Berhasil! Anda tercatat HADIR di Ruang Sidang.'),
              backgroundColor: Color(0xFF10B981),
            ),
          );
        }
      }
    } catch (_) {}
  }

  Future<void> _sendMessage(String userId, String userName) async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _msgCtrl.clear();

    final isPlaintiff = _caseData?['plaintiff']?['id'] == userId;
    final role = isPlaintiff ? 'Penggugat' : 'Tergugat';

    try {
      await http.post(
        Uri.parse('${ApiService.baseUrl}/api/court/room/${widget.caseId}/messages'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'caseId': widget.caseId,
          'senderUserId': userId,
          'senderName': userName,
          'role': role,
          'message': text,
        }),
      );
      _pollUpdates();
    } catch (_) {}
  }

  Future<void> _requestVerdict() async {
    try {
      final messenger = ScaffoldMessenger.of(context);
      final res = await http.post(
        Uri.parse('${ApiService.baseUrl}/api/court/room/verdict'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'caseId': widget.caseId}),
      );
      final data = jsonDecode(res.body);
      if (!mounted) return;
      final prov = context.read<GameProvider>();
      await prov.fetchUserData();
      await prov.refreshPortfolio();
      _fetchRoomData();
      messenger.showSnackBar(
        SnackBar(
          content: Text('⚖️ ${data['message'] ?? 'Palu Vonis Diketuk!'}'),
          backgroundColor: const Color(0xFFF59E0B),
          duration: const Duration(seconds: 5),
        ),
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final gameProvider = context.watch<GameProvider>();
    final user = gameProvider.user;
    final currentUserId = user?.id ?? '';

    if (_isLoading) {
      return Scaffold(
        backgroundColor: const Color(0xFF0A0F1D),
        appBar: AppBar(
          title: const Text('Ruang Sidang PNAK', style: TextStyle(color: Colors.white, fontSize: 16)),
          backgroundColor: const Color(0xFF0F172A),
        ),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFFF5B942))),
      );
    }

    final plaintiff = _caseData?['plaintiff'] ?? {};
    final defendant = _caseData?['defendant'] ?? {};
    final bool isPlaintiffPresent = plaintiff['present'] == true || plaintiff['present'] == 1;
    final bool isDefendantPresent = defendant['present'] == true || defendant['present'] == 1;

    final bool isUserPlaintiff = plaintiff['id'] == currentUserId;
    final bool isUserDefendant = defendant['id'] == currentUserId;
    final bool isUserPresent = (isUserPlaintiff && isPlaintiffPresent) || (isUserDefendant && isDefendantPresent);

    final String hearingTime = _caseData?['hearingTime'] ?? '10:00 WIB';
    final double claimAmount = (_caseData?['claimAmountIb'] as num?)?.toDouble() ?? 0.0;
    final String status = _caseData?['status'] ?? 'IN_TRIAL';
    final String? verdictType = _caseData?['verdictType'];
    final double verdictAwarded = (_caseData?['verdictAwardedAmount'] as num?)?.toDouble() ?? 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 16),
                SizedBox(width: 6),
                Text('PENGADILAN NIAGA KONOHA (PNAK)', style: TextStyle(color: Color(0xFFF5B942), fontSize: 11, fontWeight: FontWeight.w900)),
              ],
            ),
            Text(
              'Perkara #${widget.caseId.substring(0, widget.caseId.length.clamp(0, 8))} • Klaim: ${CurrencyFormatter.formatFull(claimAmount)}',
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time_filled_rounded, size: 12, color: Color(0xFF38BDF8)),
                const SizedBox(width: 4),
                Text(hearingTime, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Banner Vonis Putusan (jika sudah diketuk)
          if (_hasVerdict || verdictType != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF78350F), Color(0xFF451A03)],
                ),
                border: const Border(bottom: BorderSide(color: Color(0xFFF59E0B), width: 2)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'PALU VONIS TELAH DIKETUK (${verdictType ?? 'VERSTEK'})',
                        style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 12.5, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (verdictAwarded > 0) ...[
                    Text(
                      'PENGGUGAT MENANG MUTLAK — PENALTI CAIR: ${CurrencyFormatter.formatFull(verdictAwarded)}',
                      style: const TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '⏱️ Ruang sidang otomatis ditutup dalam $_secondsLeftToExit detik',
                      style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10.5, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Panel Kehadiran Pihak
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Row(
              children: [
                // Penggugat
                Expanded(
                  child: _buildPresenceBadge(
                    role: 'PENGGUGAT',
                    name: plaintiff['name'] ?? 'Penggugat',
                    isPresent: isPlaintiffPresent,
                    isMe: isUserPlaintiff,
                  ),
                ),
                const SizedBox(width: 12),
                Container(width: 1, height: 40, color: const Color(0xFF334155)),
                const SizedBox(width: 12),
                // Tergugat
                Expanded(
                  child: _buildPresenceBadge(
                    role: 'TERGUGAT',
                    name: defendant['name'] ?? 'Tergugat',
                    isPresent: isDefendantPresent,
                    isMe: isUserDefendant,
                  ),
                ),
              ],
            ),
          ),

          // Tombol Check-in Kehadiran (jika user bersangkutan belum check-in)
          if (!isUserPresent && (isUserPlaintiff || isUserDefendant) && !_hasVerdict) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: const Color(0xFF1E293B),
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check_circle_rounded, size: 18),
                label: const Text(
                  '🟢 SAYA HADIR DI PERSIDANGAN (CHECK-IN RESMI)',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => _checkInPresence(currentUserId),
              ),
            ),
          ],

          // Rule Verstek info banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF172554),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded, color: Color(0xFF60A5FA), size: 15),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    !isDefendantPresent
                        ? '⚖️ Tergugat belum hadir. Majelis Hakim dapat menjatuhkan Putusan Verstek memenangkan Penggugat seketika.'
                        : '⚖️ Kedua belah pihak hadir. Majelis Hakim mendengarkan keterangan sebelum memutus.',
                    style: const TextStyle(color: Color(0xFFBFDBFE), fontSize: 10, height: 1.2),
                  ),
                ),
              ],
            ),
          ),

          // Chat / Argument Feed
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Text(
                      'Belum ada keterangan persidangan.\nSilakan berikan argumen Anda di bawah.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.all(14),
                    itemCount: _messages.length,
                    itemBuilder: (ctx, idx) {
                      final m = _messages[idx];
                      final role = m['role'] ?? 'Pihak';
                      final senderName = m['sender_name'] ?? 'Anonim';
                      final text = m['message'] ?? '';
                      final isHakim = role == 'Hakim' || role == 'MAJELIS_HAKIM';
                      final isSystem = role == 'SYSTEM';

                      if (isHakim || isSystem) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E1E2E),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.gavel_rounded, color: Color(0xFFF5B942), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('MAJELIS HAKIM PNAK', style: TextStyle(color: Color(0xFFF5B942), fontSize: 10, fontWeight: FontWeight.w900)),
                                    const SizedBox(height: 2),
                                    Text(text, style: const TextStyle(color: Colors.white, fontSize: 11.5, height: 1.3)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }

                      final bool isMyMessage = m['sender_user_id'] == currentUserId;
                      return Align(
                        alignment: isMyMessage ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isMyMessage ? const Color(0xFF0369A1) : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            crossAxisAlignment: isMyMessage ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$senderName ($role)',
                                style: TextStyle(
                                  color: isMyMessage ? const Color(0xFFBAE6FD) : const Color(0xFF94A3B8),
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(text, style: const TextStyle(color: Colors.white, fontSize: 12)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Tombol Ketuk Palu (Verstek/Putusan) jika sidang masih aktif
          if (!_hasVerdict && status == 'IN_TRIAL') ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              color: const Color(0xFF0F172A),
              child: SizedBox(
                width: double.infinity,
                height: 38,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.gavel_rounded, size: 16),
                  label: Text(
                    !isDefendantPresent ? '⚖️ KETUK PALU PUTUSAN VERSTEK (TERGUGAT MANGKIR)' : '⚖️ PUTUSKAN PERKARA SEKARANG',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: const Color(0xFF451A03),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _requestVerdict,
                ),
              ),
            ),
          ],

          // Input Bar Keterangan
          if (!_hasVerdict) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              color: const Color(0xFF0F172A),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _msgCtrl,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Sampaikan keterangan/bantahan...',
                          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                          filled: true,
                          fillColor: const Color(0xFF1E293B),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.send_rounded, color: Color(0xFF38BDF8)),
                      onPressed: () => _sendMessage(currentUserId, user?.username ?? 'Konglomerat'),
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

  Widget _buildPresenceBadge({
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
            Text(role, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontWeight: FontWeight.w900)),
            if (isMe) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(color: const Color(0xFF38BDF8), borderRadius: BorderRadius.circular(3)),
                child: const Text('ANDA', style: TextStyle(color: Colors.black, fontSize: 7.5, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
        const SizedBox(height: 2),
        Text(name, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: isPresent ? const Color(0xFF064E3B) : const Color(0xFF450A0A),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: isPresent ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(isPresent ? Icons.check_circle_rounded : Icons.cancel_rounded, size: 10, color: isPresent ? const Color(0xFF34D399) : const Color(0xFFF87171)),
              const SizedBox(width: 4),
              Text(
                isPresent ? 'HADIR' : 'BELUM MASUK',
                style: TextStyle(
                  color: isPresent ? const Color(0xFF34D399) : const Color(0xFFF87171),
                  fontSize: 8.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
