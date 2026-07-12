import 'dart:async';

import 'package:flutter/material.dart';

import 'bookings_screen.dart';
import 'competitions_screen.dart';
import 'more_screen.dart';
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
  String? _moreSection;
  StreamSubscription<PortalNotificationSelection>? _notificationSubscription;

  @override
  void initState() {
    super.initState();

    final pendingSelection =
        PortalNotifications.instance.consumePendingSelection();
    if (pendingSelection != null) {
      _index = pendingSelection.tabIndex;
      _moreSection = pendingSelection.moreSection;
    }

    _notificationSubscription =
        PortalNotifications.instance.selections.listen((selection) {
      if (!mounted) return;
      setState(() {
        _index = selection.tabIndex;
        _moreSection = selection.moreSection;
      });
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
      SummerCampScreen(repository: widget.repository),
      RegistrationsScreen(repository: widget.repository),
      CompetitionsScreen(repository: widget.repository),
      MoreScreen(
        repository: widget.repository,
        initialSection: _moreSection,
        onSectionHandled: () {
          if (mounted) {
            setState(() {
              _moreSection = null;
            });
          }
        },
      ),
    ];

    return Scaffold(
      extendBody: true,
      body: PortalBackground(
        child: SafeArea(
          bottom: false,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) {
              final offsetAnimation = Tween<Offset>(
                begin: const Offset(0.04, 0),
                end: Offset.zero,
              ).animate(animation);
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: offsetAnimation,
                  child: child,
                ),
              );
            },
            child: KeyedSubtree(
              key: ValueKey<int>(_index),
              child: pages[_index],
            ),
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
                  icon: Icon(Icons.wb_sunny_outlined),
                  selectedIcon: Icon(Icons.wb_sunny_rounded),
                  label: 'Summer',
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
                  icon: Icon(Icons.more_horiz_rounded),
                  selectedIcon: Icon(Icons.more_rounded),
                  label: 'More',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
