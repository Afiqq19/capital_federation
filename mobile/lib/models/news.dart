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
      publishedAt: DateTime.tryParse(json['published_at'] ?? json['publishedAt'] ?? '') ?? DateTime.now(),
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
  final DateTime createdAt;

  ChatMessageModel({
    required this.id,
    required this.userId,
    required this.username,
    required this.ptName,
    required this.text,
    this.badge = 'REGULER',
    required this.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? json['userId'] ?? '',
      username: json['username'] ?? 'Taipan',
      ptName: json['pt_name'] ?? json['ptName'] ?? '',
      text: json['text'] ?? '',
      badge: json['badge'] ?? 'REGULER',
      createdAt: DateTime.tryParse(json['created_at'] ?? json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
