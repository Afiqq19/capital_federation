import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../services/api_service.dart';
import '../features/corporate_deals/screens/corporate_deals_screen.dart';
import '../features/court_commercial/screens/court_commercial_screen.dart';

class UserInboxModal extends StatefulWidget {
  final String? initialCategory;
  final VoidCallback? onInboxUpdated;

  const UserInboxModal({
    super.key,
    this.initialCategory,
    this.onInboxUpdated,
  });

  static Future<void> show(BuildContext context, {String? initialCategory, VoidCallback? onInboxUpdated}) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => UserInboxModal(
        initialCategory: initialCategory,
        onInboxUpdated: onInboxUpdated,
      ),
    );
  }

  @override
  State<UserInboxModal> createState() => _UserInboxModalState();
}

class _UserInboxModalState extends State<UserInboxModal> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _messages = [];
  int _unreadCount = 0;
  String _selectedCategory = 'ALL'; // ALL, P2P_DEAL, COURT, SYSTEM

  @override
  void initState() {
    super.initState();
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      _selectedCategory = widget.initialCategory!;
    }
    _fetchInbox();
  }

  Future<void> _fetchInbox() async {
    setState(() => _isLoading = true);
    final user = context.read<GameProvider>().user;
    final data = await ApiService.getUserInbox(userId: user?.id, category: _selectedCategory);
    if (!mounted) return;
    setState(() {
      _isLoading = false;
      _messages = List<Map<String, dynamic>>.from(data['messages'] ?? []);
      _unreadCount = (data['unreadCount'] as num?)?.toInt() ?? 0;
    });
    widget.onInboxUpdated?.call();
  }

  Future<void> _markAllRead() async {
    final user = context.read<GameProvider>().user;
    final success = await ApiService.markInboxRead(userId: user?.id);
    if (success && mounted) {
      setState(() {
        for (var m in _messages) {
          m['is_read'] = 1;
        }
        _unreadCount = 0;
      });
      widget.onInboxUpdated?.call();
    }
  }

  Future<void> _markSingleRead(String messageId) async {
    await ApiService.markInboxRead(messageId: messageId);
    if (!mounted) return;
    setState(() {
      final msg = _messages.firstWhere((m) => m['id'].toString() == messageId, orElse: () => {});
      if (msg.isNotEmpty && (msg['is_read'] == 0 || msg['is_read'] == false)) {
        msg['is_read'] = 1;
        if (_unreadCount > 0) _unreadCount--;
      }
    });
    widget.onInboxUpdated?.call();
  }

  Future<void> _deleteMessage(String messageId) async {
    final success = await ApiService.deleteInboxMessage(messageId);
    if (success && mounted) {
      setState(() {
        _messages.removeWhere((m) => m['id'].toString() == messageId);
      });
      widget.onInboxUpdated?.call();
    }
  }

  List<Map<String, dynamic>> get _filteredMessages {
    if (_selectedCategory == 'ALL') return _messages;
    return _messages.where((m) => m['category']?.toString() == _selectedCategory).toList();
  }

  String _formatTimestamp(String? iso) {
    if (iso == null || iso.isEmpty) return '-';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      final isToday = dt.year == now.year && dt.month == now.month && dt.day == now.day;
      final hh = dt.hour.toString().padLeft(2, '0');
      final mm = dt.minute.toString().padLeft(2, '0');
      if (isToday) return 'Hari ini, $hh:$mm WIB';
      return '${dt.day}/${dt.month}/${dt.year} $hh:$mm WIB';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.45,
      maxChildSize: 0.92,
      expand: false,
      builder: (_, scrollCtrl) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFF334155),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                        ),
                        child: const Icon(Icons.inbox_rounded, color: Color(0xFFF59E0B), size: 18),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'KOTAK MASUK & NOTIFIKASI',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                          Text(
                            _unreadCount > 0
                                ? '$_unreadCount pesan belum dibaca'
                                : 'Semua pesan telah dibaca',
                            style: TextStyle(
                              color: _unreadCount > 0 ? const Color(0xFF38BDF8) : const Color(0xFF94A3B8),
                              fontSize: 11,
                              fontWeight: _unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (_unreadCount > 0)
                    TextButton.icon(
                      onPressed: _markAllRead,
                      icon: const Icon(Icons.done_all_rounded, size: 15, color: Color(0xFF38BDF8)),
                      label: const Text(
                        'Baca Semua',
                        style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('ALL', 'Semua (${_messages.length})'),
                    const SizedBox(width: 6),
                    _buildFilterChip('P2P_DEAL', 'Tawaran P2P'),
                    const SizedBox(width: 6),
                    _buildFilterChip('COURT', 'Sidang PNAF'),
                    const SizedBox(width: 6),
                    _buildFilterChip('SYSTEM', 'Sistem & Regulasi'),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Content List
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
                      )
                    : _filteredMessages.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.mark_email_read_rounded, size: 48, color: Color(0xFF475569)),
                                const SizedBox(height: 10),
                                const Text(
                                  'Kotak Masuk Kosong',
                                  style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _selectedCategory == 'ALL'
                                      ? 'Belum ada notifikasi atau tawaran masuk.'
                                      : 'Tidak ada pesan dalam kategori ini.',
                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            controller: scrollCtrl,
                            itemCount: _filteredMessages.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (ctx, idx) {
                              final msg = _filteredMessages[idx];
                              return _buildMessageCard(msg);
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedCategory == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF334155),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
            fontSize: 10.5,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildMessageCard(Map<String, dynamic> msg) {
    final msgId = msg['id'].toString();
    final isRead = msg['is_read'] == 1 || msg['is_read'] == true;
    final category = msg['category']?.toString() ?? 'SYSTEM';
    final sender = msg['sender_name']?.toString() ?? 'Otoritas Federasi';
    final title = msg['title']?.toString() ?? 'Pemberitahuan Resmi';
    final body = msg['message']?.toString() ?? '';
    final timeStr = _formatTimestamp(msg['created_at']?.toString());

    Color accentColor;
    IconData categoryIcon;

    if (category == 'P2P_DEAL') {
      accentColor = const Color(0xFFF59E0B);
      categoryIcon = Icons.handshake_rounded;
    } else if (category == 'COURT') {
      accentColor = const Color(0xFFE11D48);
      categoryIcon = Icons.gavel_rounded;
    } else {
      accentColor = const Color(0xFF38BDF8);
      categoryIcon = Icons.notifications_rounded;
    }

    return InkWell(
      onTap: () => _markSingleRead(msgId),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isRead ? const Color(0xFF1E293B) : const Color(0xFF1A2234),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isRead
                ? const Color(0xFF334155).withValues(alpha: 0.5)
                : accentColor.withValues(alpha: 0.5),
            width: isRead ? 1 : 1.5,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(categoryIcon, size: 14, color: accentColor),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Row(
                    children: [
                      Flexible(
                        child: Text(
                          sender,
                          style: TextStyle(
                            color: accentColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!isRead) ...[
                        const SizedBox(width: 6),
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: accentColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Text(
                  timeStr,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                ),
                const SizedBox(width: 4),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 14, color: Color(0xFF64748B)),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                  onPressed: () => _deleteMessage(msgId),
                  tooltip: 'Hapus Pesan',
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              title,
              style: TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              body,
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 11.5,
                height: 1.4,
              ),
            ),
            if (category == 'P2P_DEAL') ...[
              const SizedBox(height: 8),
              InkWell(
                onTap: () {
                  _markSingleRead(msgId);
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CorporateDealsScreen()),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.handshake_rounded, size: 12, color: Color(0xFFF59E0B)),
                      SizedBox(width: 4),
                      Text(
                        'Buka Pasar P2P & Brankas Akta',
                        style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios_rounded, size: 8, color: Color(0xFFF59E0B)),
                    ],
                  ),
                ),
              ),
            ] else if (category == 'COURT') ...[
              const SizedBox(height: 8),
              InkWell(
                onTap: () {
                  _markSingleRead(msgId);
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CourtCommercialScreen()),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE11D48).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFE11D48).withValues(alpha: 0.4)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.gavel_rounded, size: 12, color: Color(0xFFF43F5E)),
                      SizedBox(width: 4),
                      Text(
                        'Buka Ruang Sidang Arbitrase PNAF',
                        style: TextStyle(color: Color(0xFFF43F5E), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios_rounded, size: 8, color: Color(0xFFF43F5E)),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

