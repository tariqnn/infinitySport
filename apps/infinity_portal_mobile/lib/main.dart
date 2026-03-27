import 'package:flutter/material.dart';

import 'app.dart';
import 'firebase_bootstrap.dart';
import 'firebase_portal_repository.dart';
import 'notifications.dart';
import 'portal_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    InfinityPortalApp(
      bootstrap: _bootstrapRepository(),
    ),
  );
}

Future<PortalRepository> _bootstrapRepository() async {
  final startedAt = DateTime.now();

  try {
    await ensureFirebaseInitialized();
    await PortalNotifications.instance.initialize();
  } catch (error) {
    debugPrint('Firebase bootstrap skipped: $error');
  }

  const minimumSplash = Duration(milliseconds: 900);
  final elapsed = DateTime.now().difference(startedAt);
  if (elapsed < minimumSplash) {
    await Future<void>.delayed(minimumSplash - elapsed);
  }

  return FirebasePortalRepository();
}
