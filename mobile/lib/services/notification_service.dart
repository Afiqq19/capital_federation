import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  debugPrint("Handling background FCM: ${message.messageId} - ${message.notification?.title}");
}

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  static bool _isInitialized = false;
  static String? _fcmToken;

  /// Status apakah aplikasi sedang dibuka/dimainkan oleh user di foreground.
  /// Jika bernilai true, notifikasi drop-down sistem Android di atas layar diredam agar tidak mengganggu gameplay.
  static bool isAppInForeground = true;

  static String? get fcmToken => _fcmToken;

  static Future<void> initialize() async {
    if (_isInitialized) return;
    try {
      await Firebase.initializeApp();

      // Background FCM handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Notification settings for Android
      const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const InitializationSettings initSettings = InitializationSettings(android: androidSettings);

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse resp) {
          debugPrint('Notification clicked: ${resp.payload}');
        },
      );

      // Create Android Notification Channels
      final androidPlugin = _localNotifications.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        await androidPlugin.createNotificationChannel(
          const AndroidNotificationChannel(
            'pnaf_court_channel',
            'Panggilan Sidang & Putusan PNAF',
            description: 'Surat panggilan sidang resmi, gugatan wanprestasi, dan amar putusan hakim',
            importance: Importance.max,
            playSound: true,
            enableVibration: true,
          ),
        );

        await androidPlugin.createNotificationChannel(
          const AndroidNotificationChannel(
            'bursa_market_channel',
            'Bursa Aset & Breaking News',
            description: 'Berita breaking news bursa, dividen, dan lelang BCF',
            importance: Importance.high,
            playSound: true,
          ),
        );
      }

      // Request FCM permission
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      debugPrint('FCM Authorization status: ${settings.authorizationStatus}');

      // Get FCM device token
      // ignore: deprecated_member_use
      _fcmToken = await messaging.getToken();
      debugPrint('FCM Device Token: $_fcmToken');

      // Listen for token refreshes
      // ignore: deprecated_member_use
      messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        _syncTokenWithServer(newToken);
      });

      // Foreground message listener: Redam notifikasi sistem Android jika user sedang aktif bermain di dalam game
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('Foreground FCM received: ${message.notification?.title}');
        if (isAppInForeground) {
          debugPrint('🔕 Notifikasi sistem status bar diredam karena user sedang aktif bermain di dalam game.');
          return;
        }

        final notif = message.notification;
        if (notif != null) {
          final title = notif.title ?? '';
          final upper = title.toUpperCase();
          final isTarget = upper.contains('PNAF') ||
              upper.contains('SIDANG') ||
              upper.contains('PANGGILAN') ||
              upper.contains('GUGATAN') ||
              upper.contains('VONIS') ||
              upper.contains('PUTUSAN') ||
              upper.contains('SITA') ||
              upper.contains('AKUISISI') ||
              upper.contains('PENGAMBILALIHAN') ||
              message.data['type'] == 'COURT' ||
              message.data['type'] == 'TAKEOVER';

          if (isTarget) {
            showNotification(
              id: message.hashCode,
              title: notif.title ?? 'Capital Federation',
              body: notif.body ?? '',
              channelId: 'pnaf_court_channel',
              payload: message.data['case_id'] ?? '',
            );
          }
        }
      });

      _isInitialized = true;
    } catch (e) {
      debugPrint('NotificationService initialize error: $e');
    }
  }

  static Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String channelId = 'pnaf_court_channel',
    String? payload,
    bool forceInForeground = false,
  }) async {
    // Jika user sedang aktif bermain game (in foreground), jangan munculkan notifikasi drop-down sistem Android di atas layar
    if (isAppInForeground && !forceInForeground) {
      debugPrint('🔕 Notifikasi sistem status bar diredam saat aplikasi sedang dimainkan: $title');
      return;
    }
    try {
      final isCourt = channelId == 'pnaf_court_channel';
      final androidDetails = AndroidNotificationDetails(
        channelId,
        isCourt ? 'Panggilan Sidang & Putusan PNAF' : 'Bursa Aset & Breaking News',
        channelDescription: isCourt ? 'Notifikasi resmi PNAF' : 'Informasi Bursa',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
        styleInformation: BigTextStyleInformation(body),
      );

      final details = NotificationDetails(android: androidDetails);
      await _localNotifications.show(id, title, body, details, payload: payload);
    } catch (e) {
      debugPrint('Gagal memunculkan notifikasi: $e');
    }
  }

  static Future<void> syncUserToken(String userId) async {
    if (_fcmToken != null && _fcmToken!.isNotEmpty) {
      await _syncTokenWithServer(_fcmToken!, userId: userId);
    }
  }

  static Future<void> _syncTokenWithServer(String token, {String? userId}) async {
    try {
      await ApiService.registerFcmToken(token: token, userId: userId);
    } catch (e) {
      debugPrint('Gagal sync FCM token ke server: $e');
    }
  }
}
