import 'package:flutter/material.dart';

import 'home_shell.dart';
import 'launch_experience_screen.dart';
import 'portal_repository.dart';
import 'theme.dart';

class InfinityPortalApp extends StatelessWidget {
  const InfinityPortalApp({
    super.key,
    this.repository,
    this.bootstrap,
  }) : assert(repository != null || bootstrap != null);

  final PortalRepository? repository;
  final Future<PortalRepository>? bootstrap;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Infinity Portal',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: repository != null
          ? HomeShell(repository: repository!)
          : _BootstrapGate(bootstrap: bootstrap!),
    );
  }
}

class _BootstrapGate extends StatelessWidget {
  const _BootstrapGate({
    required this.bootstrap,
  });

  final Future<PortalRepository> bootstrap;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<PortalRepository>(
      future: bootstrap,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Firebase setup failed.\n${snapshot.error}',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          );
        }

        final repository = snapshot.data;
        if (repository == null) {
          return const LaunchExperienceScreen();
        }
        return HomeShell(repository: repository);
      },
    );
  }
}
