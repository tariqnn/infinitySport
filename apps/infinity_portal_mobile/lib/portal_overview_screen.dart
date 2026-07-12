import 'dart:async';

import 'package:flutter/material.dart';

import 'models.dart';
import 'portal_repository.dart';
import 'theme.dart';
import 'widgets.dart';

class PortalOverviewScreen extends StatefulWidget {
  const PortalOverviewScreen({
    super.key,
    required this.repository,
    required this.onOpenTab,
    required this.onOpenMoreSection,
  });

  final PortalRepository repository;
  final ValueChanged<int> onOpenTab;
  final ValueChanged<String> onOpenMoreSection;

  @override
  State<PortalOverviewScreen> createState() => _PortalOverviewScreenState();
}

class _PortalOverviewScreenState extends State<PortalOverviewScreen> {
  BookingOverviewResponse? _bookings;
  RegistrationTotals? _registrations;
  List<CompetitionRegistrationRow> _competitions = const [];
  List<PackageRegistrationRow> _summerCamp = const [];
  List<GuestAccountRow> _guests = const [];
  List<CoachRow> _coaches = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        widget.repository.fetchBookingsOverview(BookingFilters.initial()),
        widget.repository
            .fetchRegistrationTotals(RegistrationFilters.initial()),
        widget.repository.fetchCompetitions(CompetitionFilters.initial()),
        widget.repository.fetchSummerCampRegistrations(),
        widget.repository.fetchGuestAccounts(),
        widget.repository.fetchCoaches(),
      ]);
      if (!mounted) return;
      setState(() {
        _bookings = results[0] as BookingOverviewResponse;
        _registrations = results[1] as RegistrationTotals;
        _competitions = results[2] as List<CompetitionRegistrationRow>;
        _summerCamp = results[3] as List<PackageRegistrationRow>;
        _guests = results[4] as List<GuestAccountRow>;
        _coaches = results[5] as List<CoachRow>;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomSpacing = MediaQuery.of(context).padding.bottom + 118;
    final textTheme = Theme.of(context).textTheme;
    final pendingBookings = _bookings?.bookings
            .where((row) => row.status.toUpperCase() == 'PENDING')
            .length ??
        0;
    final unpaidRegistrations = (_registrations?.partialCount ?? 0) +
        (_registrations?.unpaidCount ?? 0);
    final unpaidCompetitions = _competitions.where((row) => !row.isPaid).length;

    return RefreshIndicator.adaptive(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.asset(
                    'assets/branding/launch_hero.png',
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppPalette.midnight.withValues(alpha: 0.64),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.24),
                          ),
                        ),
                        child: Text(
                          'Infinity Portal',
                          style: textTheme.bodySmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Text(
                        'Operations, camps, guests, and coaches in one pocket.',
                        style: textTheme.displaySmall?.copyWith(
                          color: Colors.white,
                          height: 1.12,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          _HeroPill(
                            icon: Icons.notifications_active_rounded,
                            label: 'Alerts ready',
                          ),
                          _HeroPill(
                            icon: Icons.sync_rounded,
                            label: 'Firebase live',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (_error != null)
            EmptyStateView(
              title: 'Overview could not refresh',
              message: _error!,
              icon: Icons.cloud_off_rounded,
              actionLabel: 'Retry',
              onAction: () => unawaited(_load()),
            )
          else ...[
            Row(
              children: [
                Expanded(
                  child: _AttentionCard(
                    label: 'Pending',
                    value: '$pendingBookings',
                    detail: 'bookings',
                    tint: AppPalette.warning,
                    icon: Icons.pending_actions_rounded,
                    onTap: () => widget.onOpenTab(1),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _AttentionCard(
                    label: 'Unpaid',
                    value: '$unpaidRegistrations',
                    detail: 'registrations',
                    tint: AppPalette.electric,
                    icon: Icons.payments_rounded,
                    onTap: () => widget.onOpenTab(2),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _AttentionCard(
                    label: 'Competition',
                    value: '$unpaidCompetitions',
                    detail: 'not paid',
                    tint: AppPalette.cobalt,
                    icon: Icons.emoji_events_rounded,
                    onTap: () => widget.onOpenTab(3),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _AttentionCard(
                    label: 'Guests',
                    value: '${_guests.length}',
                    detail: 'accounts',
                    tint: AppPalette.success,
                    icon: Icons.person_pin_circle_rounded,
                    onTap: () => widget.onOpenMoreSection('guests'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            _QuickActionGrid(
              onOpenTab: widget.onOpenTab,
              onOpenMoreSection: widget.onOpenMoreSection,
            ),
            const SizedBox(height: 18),
            Text('Portal Pulse', style: textTheme.titleLarge),
            const SizedBox(height: 12),
            _PulseRow(
              icon: Icons.sports_basketball_rounded,
              title: 'Summer camp',
              value: '${_summerCamp.length} registrations',
              tint: AppPalette.amber,
              onTap: () => widget.onOpenMoreSection('summer'),
            ),
            const SizedBox(height: 10),
            _PulseRow(
              icon: Icons.groups_rounded,
              title: 'Coaches',
              value: '${_coaches.where((row) => row.isActive).length} visible',
              tint: AppPalette.sky,
              onTap: () => widget.onOpenMoreSection('coaches'),
            ),
            const SizedBox(height: 10),
            _PulseRow(
              icon: Icons.wallet_rounded,
              title: 'Booking collection',
              value: _money(_bookings?.kpis.totalCollected ?? 0),
              tint: AppPalette.success,
              onTap: () => widget.onOpenTab(1),
            ),
          ],
          if (_loading) ...[
            const SizedBox(height: 18),
            const LinearProgressIndicator(),
          ],
        ],
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 17),
          const SizedBox(width: 8),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _AttentionCard extends StatelessWidget {
  const _AttentionCard({
    required this.label,
    required this.value,
    required this.detail,
    required this.tint,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final String value;
  final String detail;
  final Color tint;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: tint, size: 28),
              const SizedBox(height: 14),
              Text(value, style: textTheme.displaySmall),
              const SizedBox(height: 4),
              Text(
                '$label $detail',
                style: textTheme.bodySmall?.copyWith(
                  color: AppPalette.ink.withValues(alpha: 0.72),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionGrid extends StatelessWidget {
  const _QuickActionGrid({
    required this.onOpenTab,
    required this.onOpenMoreSection,
  });

  final ValueChanged<int> onOpenTab;
  final ValueChanged<String> onOpenMoreSection;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.45,
      children: [
        _ActionTile(
          icon: Icons.add_box_rounded,
          title: 'Guest booking',
          subtitle: 'Create court slot',
          tint: AppPalette.cobalt,
          onTap: () => onOpenMoreSection('createBooking'),
        ),
        _ActionTile(
          icon: Icons.app_registration_rounded,
          title: 'Enroll player',
          subtitle: 'Package signup',
          tint: AppPalette.electric,
          onTap: () => onOpenMoreSection('createRegistration'),
        ),
        _ActionTile(
          icon: Icons.emoji_events_rounded,
          title: 'Competitions',
          subtitle: 'Weekend signups',
          tint: AppPalette.amber,
          onTap: () => onOpenTab(3),
        ),
        _ActionTile(
          icon: Icons.more_horiz_rounded,
          title: 'More portal',
          subtitle: 'Camps, guests, coaches',
          tint: AppPalette.success,
          onTap: () => onOpenTab(4),
        ),
      ],
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.tint,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: tint, size: 26),
              const Spacer(),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PulseRow extends StatelessWidget {
  const _PulseRow({
    required this.icon,
    required this.title,
    required this.value,
    required this.tint,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String value;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: tint),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 3),
                    Text(value, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: AppPalette.ink.withValues(alpha: 0.4),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _money(double value) {
  return 'JOD ${value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 2)}';
}
