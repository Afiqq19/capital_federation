import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'api_service.dart';
import 'notification_service.dart';

class SocketService {
  static socket_io.Socket? socket;
  static Function(dynamic)? onOrderMatched;

  static void init({
    required Function(List<dynamic>) onMarketTicker,
    required Function(dynamic) onNewsBroadcast,
    required Function(dynamic) onChatMessage,
    required Function(dynamic) onTradeExecuted,
    Function(dynamic)? onMarketOverview,
    Function(dynamic)? onSettingsUpdated,
    Function(dynamic)? onBalanceUpdated,
    Function(dynamic)? onRunningTrade,
    Function(dynamic)? onIpoUpdated,
    Function(dynamic)? onCompanyStatusChanged,
    Function(dynamic)? onUmaChanged,
    Function(dynamic)? onCompanyRevenue,
    Function(dynamic)? onBondsUpdated,
    Function(dynamic)? onSubsidiesUpdated,
    Function(dynamic)? onTendersUpdated,
    Function(dynamic)? onDebtReliefUpdated,
    Function(dynamic)? onConglomerateUpdated,
    Function(dynamic)? onCompanyDeleted,
    Function(dynamic)? onMarketRefreshRequested,
  }) {
    try {
      socket = socket_io.io(
        ApiService.baseUrl,
        socket_io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .disableAutoConnect()
            .build(),
      );

      socket!.connect();

      socket!.onConnect((_) {
        debugPrint('Connected to Capital Federation WebSocket Server');
        if (_currentUserId != null) {
          socket!.emit('join_user', _currentUserId);
        }
      });

      socket!.on('market:ticker', (data) {
        if (data is List) {
          onMarketTicker(data);
        }
      });

      socket!.on('market:overview', (data) {
        if (onMarketOverview != null) {
          onMarketOverview(data);
        }
      });

      socket!.on('market:running_trade', (data) {
        if (onRunningTrade != null) {
          onRunningTrade(data);
        }
      });

      socket!.on('market:news_broadcast', (data) {
        onNewsBroadcast(data);
      });

      socket!.on('market:breaking_news', (data) {
        onNewsBroadcast(data);
      });

      socket!.on('court:new_case', (data) {
        if (data != null) {
          final cNum = data['case_number'] ?? data['caseNumber'] ?? '';
          final title = data['title'] ?? 'Gugatan Baru';
          final pl = data['plaintiff_name'] ?? data['plaintiffName'] ?? 'Penggugat';
          final def = data['defendant_name'] ?? data['defendantName'] ?? 'Tergugat';
          NotificationService.showNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: '⚖️ GUGATAN PNAF TERDAFTAR: $cNum',
            body: '$pl telah resmi menggugat $def dalam perkara "$title".',
            channelId: 'pnaf_court_channel',
          );
        }
      });

      socket!.on('court:verdict', (data) {
        if (data != null) {
          final cNum = data['case_number'] ?? data['caseNumber'] ?? '';
          final notes = data['verdict_notes'] ?? data['verdictNotes'] ?? 'Amar putusan hakim telah diketuk palu.';
          NotificationService.showNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: '🔨 AMAR PUTUSAN HAKIM PNAF: $cNum',
            body: notes.toString(),
            channelId: 'pnaf_court_channel',
          );
        }
      });

      socket!.on('takeover:proposal_received', (data) {
        if (data != null) {
          final comp = data['companyName'] ?? data['companySymbol'] ?? 'Perseroan';
          final buyer = data['buyerUsername'] ?? 'Investor';
          final pct = data['percentage'] ?? 51;
          NotificationService.showNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: '🏢 TAWARAN AKUISISI MASUK!',
            body: '@$buyer mengajukan tawaran pengambilalihan $pct% saham $comp (Hak Veto Pendiri).',
            channelId: 'pnaf_court_channel',
          );
        }
      });

      socket!.on('chat:message', (data) {
        onChatMessage(data);
      });

      socket!.on('trade:executed', (data) {
        onTradeExecuted(data);
      });

      socket!.on('settings:updated', (data) {
        if (onSettingsUpdated != null) onSettingsUpdated(data);
      });

      socket!.on('central_bank:rate', (data) {
        if (onSettingsUpdated != null) onSettingsUpdated(data);
      });

      socket!.on('user:balance_updated', (data) {
        if (onBalanceUpdated != null) onBalanceUpdated(data);
      });

      socket!.on('company:revenue', (data) {
        if (onCompanyRevenue != null) onCompanyRevenue(data);
      });

      socket!.on('ipo:ordered', (data) {
        if (onIpoUpdated != null) onIpoUpdated(data);
      });

      socket!.on('ipo:listed', (data) {
        if (onIpoUpdated != null) onIpoUpdated(data);
      });

      socket!.on('company:status_changed', (data) {
        if (onCompanyStatusChanged != null) onCompanyStatusChanged(data);
      });

      socket!.on('market:company_status_changed', (data) {
        if (onCompanyStatusChanged != null) onCompanyStatusChanged(data);
      });

      socket!.on('company:seized_status', (data) {
        if (onMarketRefreshRequested != null) onMarketRefreshRequested(data);
        if (data != null && data['isSeized'] == true) {
          final reason = data['reason'] ?? 'Pelanggaran / Wanprestasi';
          NotificationService.showNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: '🚨 PERINGATAN: SAHAM & EMITEN DISITA!',
            body: 'Aset dan perseroan telah resmi disita negara/PNAF. Alasan: $reason',
            channelId: 'pnaf_court_channel',
          );
        }
      });

      socket!.on('company:deleted', (data) {
        if (onCompanyDeleted != null) onCompanyDeleted(data);
      });

      socket!.on('user:conglomerate_updated', (data) {
        if (onConglomerateUpdated != null) onConglomerateUpdated(data);
      });

      socket!.on('macro:event_triggered', (data) {
        if (onMarketRefreshRequested != null) onMarketRefreshRequested(data);
      });

      socket!.on('market:macro_shock', (data) {
        if (onMarketRefreshRequested != null) onMarketRefreshRequested(data);
      });

      socket!.on('market:session_rollover', (data) {
        if (onMarketRefreshRequested != null) onMarketRefreshRequested(data);
      });

      socket!.on('market:uma_changed', (data) {
        if (onUmaChanged != null) onUmaChanged(data);
      });

      socket!.on('company:uma_changed', (data) {
        if (onUmaChanged != null) onUmaChanged(data);
      });

      socket!.on('bonds:issued', (data) {
        if (onBondsUpdated != null) onBondsUpdated(data);
      });

      socket!.on('bonds:ordered', (data) {
        if (onBondsUpdated != null) onBondsUpdated(data);
      });

      socket!.on('bonds:coupon_paid', (data) {
        if (onBondsUpdated != null) onBondsUpdated(data);
      });

      socket!.on('subsidies:updated', (data) {
        if (onSubsidiesUpdated != null) onSubsidiesUpdated(data);
      });

      socket!.on('tender:announced', (data) {
        if (onTendersUpdated != null) onTendersUpdated(data);
      });

      socket!.on('tender:bid_submitted', (data) {
        if (onTendersUpdated != null) onTendersUpdated(data);
      });

      socket!.on('tender:bid_placed', (data) {
        if (onTendersUpdated != null) onTendersUpdated(data);
      });

      socket!.on('tender:updated', (data) {
        if (onTendersUpdated != null) onTendersUpdated(data);
      });

      socket!.on('tender:deleted', (data) {
        if (onTendersUpdated != null) onTendersUpdated(data);
      });

      socket!.on('tender:awarded', (data) {
        if (onTendersUpdated != null) onTendersUpdated(data);
      });

      socket!.on('debt_relief:executed', (data) {
        if (onDebtReliefUpdated != null) onDebtReliefUpdated(data);
      });

      socket!.on('order:matched', (data) {
        if (onOrderMatched != null) onOrderMatched!(data);
      });

      socket!.on('user:order_matched', (data) {
        if (onOrderMatched != null) onOrderMatched!(data);
      });

      socket!.onDisconnect((_) {
        debugPrint('Disconnected from WebSocket');
      });
    } catch (e) {
      debugPrint('Socket init error: $e');
    }
  }

  static String? _currentUserId;

  static void joinUser(String userId) {
    _currentUserId = userId;
    if (socket != null && socket!.connected) {
      socket!.emit('join_user', userId);
    }
  }

  static void disconnect() {
    socket?.disconnect();
  }
}
