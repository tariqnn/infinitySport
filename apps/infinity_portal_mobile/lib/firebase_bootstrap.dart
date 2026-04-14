import 'dart:developer' as developer;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

Future<FirebaseApp> ensureFirebaseInitialized() async {
  if (Firebase.apps.isNotEmpty) {
    return Firebase.app();
  }

  final app = await Firebase.initializeApp(options: kInfinityFirebaseOptions);
  await _ensureAnonymousAuth();
  return app;
}

Future<void> _ensureAnonymousAuth() async {
  final auth = FirebaseAuth.instance;
  if (auth.currentUser != null) return;

  try {
    await auth.signInAnonymously();
  } on FirebaseAuthException catch (error) {
    developer.log(
      'Anonymous auth failed (${error.code}). Enable Anonymous sign-in in Firebase Console.',
      name: 'firebase_bootstrap',
    );
    rethrow;
  }
}

const FirebaseOptions kInfinityFirebaseOptions = FirebaseOptions(
  apiKey: 'AIzaSyBHrQ5zb8lCJTVXWVFUjwGJgdUoR4LqvVY',
  appId: '1:43103034790:android:25fbe0a69ecc742b71c367',
  messagingSenderId: '43103034790',
  projectId: 'infintysports-62c45',
  storageBucket: 'infintysports-62c45.firebasestorage.app',
);
