import 'package:firebase_core/firebase_core.dart';

Future<FirebaseApp> ensureFirebaseInitialized() async {
  if (Firebase.apps.isNotEmpty) {
    return Firebase.app();
  }

  return Firebase.initializeApp(options: kInfinityFirebaseOptions);
}

const FirebaseOptions kInfinityFirebaseOptions = FirebaseOptions(
  apiKey: 'AIzaSyBHrQ5zb8lCJTVXWVFUjwGJgdUoR4LqvVY',
  appId: '1:43103034790:android:25fbe0a69ecc742b71c367',
  messagingSenderId: '43103034790',
  projectId: 'infintysports-62c45',
  storageBucket: 'infintysports-62c45.firebasestorage.app',
);
