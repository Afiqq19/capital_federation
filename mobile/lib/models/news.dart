import '../utils/wib_time.dart';
class NewsModel {
  final String id;
  final String title;
  final String content;
  final String affectedSector;
  final String sentiment;
  final DateTime publishedAt;

  NewsModel({
    required this.id,
    required this.title,
    required this.content,
    required this.affectedSector,
    required this.sentiment,
    required this.publishedAt,
  });

  factory NewsModel.fromJson(Map<String, dynamic> json) {
    return NewsModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      affectedSector: json['affected_sector'] ?? json['affectedSector'] ?? 'ALL',
      sentiment: json['sentiment'] ?? 'NEUTRAL',
      publishedAt: parseServerTime(json['published_at'] ?? json['publishedAt']),
    );
  }
}

class ChatMessageModel {
  final String id;
  final String userId;
  final String username;
  final String ptName;
  final String text;
  final String badge;
  final int? rank;
  final bool isVip;
  final DateTime createdAt;

  bool get is12Naga => badge.toUpperCase().contains('12 NAGA') || badge.toUpperCase().contains('9 NAGA') || (rank != null && rank! >= 1 && rank! <= 12);
  bool get is9Naga => is12Naga;
  bool get isTaipan => badge.toUpperCase().contains('TAIPAN') || (rank != null && rank! > 12 && rank! <= 35);
  bool get isBankSentral => badge.toUpperCase().contains('BANK SENTRAL') || badge.toUpperCase().contains('OTORITAS');
  bool get hasVipBadge => isVip || badge.toUpperCase().contains('VIP');

  ChatMessageModel({
    required this.id,
    required this.userId,
    required this.username,
    required this.ptName,
    required this.text,
    this.badge = 'REGULER',
    this.rank,
    this.isVip = false,
    required this.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    final rawPt = (json['pt_name'] ?? json['ptName'] ?? '').toString().trim();
    final cleanPt = rawPt.replaceFirst(RegExp(r'^(PT\.?\s*)+', caseSensitive: false), '').trim();
    final formattedPt = cleanPt.isNotEmpty && cleanPt != 'Investor Ritel' && cleanPt != 'Otoritas Moneter & Bursa'
        ? 'PT. $cleanPt'
        : cleanPt;
    final badgeStr = (json['badge'] ?? 'REGULER').toString();
    return ChatMessageModel(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? json['userId'] ?? '',
      username: json['username'] ?? 'Taipan',
      ptName: formattedPt,
      text: json['text'] ?? '',
      badge: badgeStr,
      rank: json['rank'] is int ? json['rank'] as int : int.tryParse('${json['rank'] ?? ''}'),
      isVip: json['isVip'] == true || json['is_vip'] == true || badgeStr.toUpperCase().contains('VIP'),
      createdAt: parseServerTime(json['created_at'] ?? json['createdAt']),
    );
  }
}
