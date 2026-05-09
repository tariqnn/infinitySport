import 'dart:async';

import 'package:flutter/material.dart';

import 'bookings_screen.dart';
import 'competitions_screen.dart';
import 'create_booking_screen.dart';
import 'create_registration_screen.dart';
import 'notifications.dart';
import 'portal_repository.dart';
import 'registrations_screen.dart';
import 'widgets.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.repository,
  });

  final PortalRepository repository;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  StreamSubscription<PortalNotificationSelection>? _notificationSubscription;

  @override
  void initState() {
    super.initState();

    final pendingSelection =
        PortalNotifications.instance.consumePendingSelection();
    if (pendingSelection != null) {
      _index = pendingSelection.tabIndex;
    }

    _notificationSubscription =
        PortalNotifications.instance.selections.listen((selection) {
      if (!mounted || selection.tabIndex == _index) return;
      setState(() => _index = selection.tabIndex);
    });
  }

  @override
  void dispose() {
    _notificationSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      BookingsScreen(repository: widget.repository),
      RegistrationsScreen(repository: widget.repository),
      CompetitionsScreen(repository: widget.repository),
      CreateBookingScreen(repository: widget.repository),
      CreateRegistrationScreen(repository: widget.repository),
    ];

    return Scaffold(
      extendBody: true,
      body: PortalBackground(
        child: SafeArea(
          bottom: false,
          child: IndexedStack(
            index: _index,
            children: pages,
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(32),
            boxShadow: const [
              BoxShadow(
                color: Color(0x18071B35),
                blurRadius: 24,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(32),
            child: NavigationBar(
              selectedIndex: _index,
              onDestinationSelected: (value) {
                setState(() => _index = value);
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.calendar_month_outlined),
                  selectedIcon: Icon(Icons.calendar_month),
                  label: 'Bookings',
                ),
                NavigationDestination(
                  icon: Icon(Icons.groups_2_outlined),
                  selectedIcon: Icon(Icons.groups_2),
                  label: 'Registrations',
                ),
                NavigationDestination(
                  icon: Icon(Icons.emoji_events_outlined),
                  selectedIcon: Icon(Icons.emoji_events),
                  label: 'Competitions',
                ),
                NavigationDestination(
                  icon: Icon(Icons.add_box_outlined),
                  selectedIcon: Icon(Icons.add_box),
                  label: 'New Booking',
                ),
                NavigationDestination(
                  icon: Icon(Icons.app_registration_outlined),
                  selectedIcon: Icon(Icons.app_registration),
                  label: 'Enroll',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
