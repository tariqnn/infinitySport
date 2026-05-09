import 'dart:async';
import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'firebase_bootstrap.dart';

const String kPortalNotificationTopic = 'infinity_portal_all';
const String kPortalNotificationChannelId = 'infinity_portal_high_priority';
const String kPortalNotificationChannelName = 'Infinity Portal Alerts';
const String kPortalNotificationChannelDescription =
    'Booking, registration, and competition alerts for the Infinity Portal mobile app.';

const AndroidNotificationChannel _portalNotificationChannel =
    AndroidNotificationChannel(
  kPortalNotificationChannelId,
  kPortalNotificationChannelName,
  description: kPortalNotificationChannelDescription,
  importance: Importance.max,
  playSound: true,
);

@pragma('vm:entry-point')
Future<void> portalFirebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  try {
    await ensureFirebaseInitialized();
  } catch (error) {
    debugPrint('Background notification bootstrap skipped: $error');
  }
}

enum PortalNotificationDestination {
  bookings,
  registrations,
  competitions,
}

class PortalNotificationSelection {
  const PortalNotificationSelection({
    required this.destination,
    required this.entityId,
  });

  final PortalNotificationDestination destination;
  final String? entityId;

  int get tabIndex {
    switch (destination) {
      case PortalNotificationDestination.bookings:
        return 0;
      case PortalNotificationDestination.registrations:
        return 1;
      case PortalNotificationDestination.competitions:
        return 2;
    }
  }

  String get payload => jsonEncode({
        'destination': destination.name,
        'entityId': entityId,
      });

  String get fallbackTitle {
    switch (destination) {
      case PortalNotificationDestination.bookings:
        return 'New booking';
      case PortalNotificationDestination.registrations:
        return 'New registration';
      case PortalNotificationDestination.competitions:
        return 'New competition registration';
    }
  }

  String get fallbackBody {
    switch (destination) {
      case PortalNotificationDestination.bookings:
        return 'A new booking was added to Infinity Portal.';
      case PortalNotificationDestination.registrations:
        return 'A new player registration was added to Infinity Portal.';
      case PortalNotificationDestination.competitions:
        return 'A new competition registration was added to Infinity Portal.';
    }
  }

  static PortalNotificationSelection? fromData(Map<String, dynamic> data) {
    final type = _normalizeValue(data['type']);
    if (type == 'BOOKING_CREATED' ||
        _normalizeValue(data['bookingId']).isNotEmpty) {
      return PortalNotificationSelection(
        destination: PortalNotificationDestination.bookings,
        entityId: _nullableValue(data['bookingId']),
      );
    }
    if (type == 'REGISTRATION_CREATED' ||
        _normalizeValue(data['registrationId']).isNotEmpty) {
      return PortalNotificationSelection(
        destination: PortalNotificationDestination.registrations,
        entityId: _nullableValue(data['registrationId']),
      );
    }
    if (type == 'COMPETITION_REGISTRATION_CREATED' ||
        _normalizeValue(data['competitionRegistrationId']).isNotEmpty) {
      return PortalNotificationSelection(
        destination: PortalNotificationDestination.competitions,
        entityId: _nullableValue(data['competitionRegistrationId']),
      );
    }
    return null;
  }

  static PortalNotificationSelection? fromPayload(String? payload) {
    final raw = (payload ?? '').trim();
    if (raw.isEmpty) return null;

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      final destination = _normalizeValue(decoded['destination']);
      switch (destination) {
        case 'BOOKINGS':
          return PortalNotificationSelection(
            destination: PortalNotificationDestination.bookings,
            entityId: _nullableValue(decoded['entityId']),
          );
        case 'REGISTRATIONS':
          return PortalNotificationSelection(
            destination: PortalNotificationDestination.registrations,
            entityId: _nullableValue(decoded['entityId']),
          );
        case 'COMPETITIONS':
          return PortalNotificationSelection(
            destination: PortalNotificationDestination.competitions,
            entityId: _nullableValue(decoded['entityId']),
          );
      }
    } catch (_) {}

    return null;
  }

  static String _normalizeValue(Object? value) =>
      value?.toString().trim().toUpperCase() ?? '';

  static String? _nullableValue(Object? value) {
    final normalized = value?.toString().trim() ?? '';
    return normalized.isEmpty ? null : normalized;
  }
}

class PortalNotifications {
  PortalNotifications._();

  static final PortalNotifications instance = PortalNotifications._();

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final StreamController<PortalNotificationSelection> _selectionController =
      StreamController<PortalNotificationSelection>.broadcast();

  Future<void>? _initialization;
  PortalNotificationSelection? _pendingSelection;

  Stream<PortalNotificationSelection> get selections =>
      _selectionController.stream;

  Future<void> initialize() {
    return _initialization ??= _initialize();
  }

  PortalNotificationSelection? consumePendingSelection() {
    final selection = _pendingSelection;
    _pendingSelection = null;
    return selection;
  }

  Future<void> _initialize() async {
    FirebaseMessaging.onBackgroundMessage(
      portalFirebaseMessagingBackgroundHandler,
    );

    await _initializeLocalNotifications();

    final messaging = FirebaseMessaging.instance;
    await messaging.setAutoInitEnabled(true);
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    await messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );
    await messaging.subscribeToTopic(kPortalNotificationTopic).timeout(
          const Duration(seconds: 8),
        );

    FirebaseMessaging.onMessage.listen((message) {
      unawaited(_showForegroundNotification(message));
    });
    FirebaseMessaging.onMessageOpenedApp.listen(_handleRemoteMessageOpened);

    final localLaunch =
        await _localNotifications.getNotificationAppLaunchDetails();
    if (localLaunch?.didNotificationLaunchApp ?? false) {
      final payload = localLaunch?.notificationResponse?.payload;
      _storeSelection(PortalNotificationSelection.fromPayload(payload));
    }

    final remoteLaunch = await messaging.getInitialMessage();
    if (remoteLaunch != null) {
      _storeSelection(PortalNotificationSelection.fromData(remoteLaunch.data));
    }
  }

  Future<void> _initializeLocalNotifications() async {
    const initializationSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (response) {
        _storeSelection(
          PortalNotificationSelection.fromPayload(response.payload),
        );
      },
    );

    final androidPlugin =
        _localNotifications.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(_portalNotificationChannel);
    await androidPlugin?.requestNotificationsPermission();
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final selection = PortalNotificationSelection.fromData(message.data);
    final title = message.notification?.title ??
        selection?.fallbackTitle ??
        'Infinity Portal';
    final body = message.notification?.body ??
        selection?.fallbackBody ??
        'A new event needs your attention.';

    await _localNotifications.show(
      DateTime.now().microsecondsSinceEpoch.remainder(1 << 31),
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          kPortalNotificationChannelId,
          kPortalNotificationChannelName,
          channelDescription: kPortalNotificationChannelDescription,
          importance: Importance.max,
          priority: Priority.high,
          playSound: true,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: selection?.payload,
    );
  }

  void _handleRemoteMessageOpened(RemoteMessage message) {
    _storeSelection(PortalNotificationSelection.fromData(message.data));
  }

  void _storeSelection(PortalNotificationSelection? selection) {
    if (selection == null) return;
    _pendingSelection = selection;
    if (!_selectionController.isClosed) {
      _selectionController.add(selection);
    }
  }
}
