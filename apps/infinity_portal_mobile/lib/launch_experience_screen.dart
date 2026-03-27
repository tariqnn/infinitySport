import 'package:flutter/material.dart';

import 'theme.dart';
import 'widgets.dart';

class LaunchExperienceScreen extends StatelessWidget {
  const LaunchExperienceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: PortalBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: AppPalette.cobalt,
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x22003DA5),
                          blurRadius: 24,
                          offset: Offset(0, 12),
                        ),
                      ],
                    ),
                    child: Text(
                      'Infinity Sports',
                      style: textTheme.bodySmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  GlassCard(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                    child: Column(
                      children: [
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 24,
                          ),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Color(0xFFF8FBFF),
                                Color(0xFFEDF3FF),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(color: AppPalette.border),
                          ),
                          child: Image.asset(
                            'assets/branding/infinity-logo.png',
                            height: 108,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(height: 26),
                        Text(
                          'Infinity Portal',
                          textAlign: TextAlign.center,
                          style: textTheme.displaySmall?.copyWith(
                            fontSize: 31,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Bookings, registrations, and follow-up in one calm control room.',
                          textAlign: TextAlign.center,
                          style: textTheme.bodyLarge?.copyWith(
                            color: AppPalette.ink.withValues(alpha: 0.72),
                          ),
                        ),
                        const SizedBox(height: 22),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(999),
                          child: const LinearProgressIndicator(
                            minHeight: 8,
                            backgroundColor: AppPalette.shell,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppPalette.cobalt,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          'Loading your live schedule...',
                          style: textTheme.bodySmall?.copyWith(
                            color: AppPalette.cobalt,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
