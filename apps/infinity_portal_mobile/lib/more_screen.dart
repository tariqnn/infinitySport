import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'create_booking_screen.dart';
import 'create_registration_screen.dart';
import 'models.dart';
import 'portal_repository.dart';
import 'theme.dart';
import 'widgets.dart';

class MoreScreen extends StatefulWidget {
  const MoreScreen({
    super.key,
    required this.repository,
    required this.initialSection,
    required this.onSectionHandled,
  });

  final PortalRepository repository;
  final String? initialSection;
  final VoidCallback onSectionHandled;

  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  String _section = 'hub';

  @override
  void initState() {
    super.initState();
    _consumeInitialSection();
  }

  @override
  void didUpdateWidget(covariant MoreScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSection != widget.initialSection) {
      _consumeInitialSection();
    }
  }

  void _consumeInitialSection() {
    final incoming = widget.initialSection;
    if (incoming == null || incoming.isEmpty) return;
    _section = incoming;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onSectionHandled();
    });
  }

  void _open(String section) {
    setState(() {
      _section = section;
    });
  }

  @override
  Widget build(BuildContext context) {
    final child = switch (_section) {
      'summer' => SummerCampScreen(
          repository: widget.repository,
          onBack: () => _open('hub'),
        ),
      'guests' => _GuestAccountsScreen(
          repository: widget.repository,
          onBack: () => _open('hub'),
        ),
      'coaches' => _CoachesScreen(
          repository: widget.repository,
          onBack: () => _open('hub'),
        ),
      'createBooking' => _NestedScreen(
          title: 'Guest Booking',
          onBack: () => _open('hub'),
          child: CreateBookingScreen(repository: widget.repository),
        ),
      'createRegistration' => _NestedScreen(
          title: 'Enroll Player',
          onBack: () => _open('hub'),
          child: CreateRegistrationScreen(repository: widget.repository),
        ),
      _ => _MoreHub(onOpen: _open),
    };

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 240),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: KeyedSubtree(
        key: ValueKey<String>(_section),
        child: child,
      ),
    );
  }
}

class _MoreHub extends StatelessWidget {
  const _MoreHub({
    required this.onOpen,
  });

  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final bottomSpacing = MediaQuery.of(context).padding.bottom + 118;
    return ListView(
      padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
      children: [
        GlassCard(
          padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('More Portal',
                  style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 10),
              Text(
                'Summer camp registrations, guest point accounts, coaches, and quick creation tools live here.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppPalette.ink.withValues(alpha: 0.74),
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        _HubTile(
          icon: Icons.wb_sunny_rounded,
          title: 'Summer Camp',
          subtitle:
              'Basketball, Volleyball, and Warriors Assistant Coach camp registrations.',
          tint: AppPalette.amber,
          onTap: () => onOpen('summer'),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.person_pin_circle_rounded,
          title: 'Guest Accounts',
          subtitle:
              'Firebase guestAccess accounts, points, bookings, and linked players.',
          tint: AppPalette.success,
          onTap: () => onOpen('guests'),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.sports_rounded,
          title: 'Coaches',
          subtitle:
              'Landing coaches and active coach records available from the portal.',
          tint: AppPalette.sky,
          onTap: () => onOpen('coaches'),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.add_box_rounded,
          title: 'Create Guest Booking',
          subtitle: 'Use live court availability to create a portal booking.',
          tint: AppPalette.cobalt,
          onTap: () => onOpen('createBooking'),
        ),
        const SizedBox(height: 12),
        _HubTile(
          icon: Icons.app_registration_rounded,
          title: 'Create Registration',
          subtitle: 'Enroll a player into any active package catalog item.',
          tint: AppPalette.electric,
          onTap: () => onOpen('createRegistration'),
        ),
      ],
    );
  }
}

class _NestedScreen extends StatelessWidget {
  const _NestedScreen({
    required this.title,
    required this.onBack,
    required this.child,
  });

  final String title;
  final VoidCallback onBack;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            child: Align(
              alignment: Alignment.topLeft,
              child: IconButton.filledTonal(
                onPressed: onBack,
                tooltip: 'Back to More',
                icon: const Icon(Icons.arrow_back_rounded),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class SummerCampScreen extends StatefulWidget {
  const SummerCampScreen({
    super.key,
    required this.repository,
    this.onBack,
  });

  final PortalRepository repository;
  final VoidCallback? onBack;

  @override
  State<SummerCampScreen> createState() => _SummerCampScreenState();
}

class _SummerCampScreenState extends State<SummerCampScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  List<PackageRegistrationRow> _rows = const [];
  bool _loading = true;
  String? _error;
  String _campFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearch);
    unawaited(_load());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.removeListener(_handleSearch);
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearch() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 260), () {
      unawaited(_load());
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await widget.repository.fetchSummerCampRegistrations(
        search: _searchController.text,
      );
      if (!mounted) return;
      setState(() {
        _rows = rows;
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
    final rows = _filteredRows;
    final collected = rows.fold<double>(0, (sum, row) => sum + row.collected);
    final expected =
        rows.fold<double>(0, (sum, row) => sum + row.finalPriceJod);
    final paid = rows.where((row) => row.isPaid).length;

    return RefreshIndicator.adaptive(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
        children: [
          _SectionHeader(
            title: 'Summer Camp',
            subtitle:
                'Basketball, Volleyball, and Warriors Assistant Coach camp registrations.',
            icon: Icons.wb_sunny_rounded,
            tint: AppPalette.amber,
            onBack: widget.onBack,
          ),
          const SizedBox(height: 18),
          TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded),
              hintText: 'Search camper, phone, or camp',
              suffixIcon: _searchController.text.isEmpty
                  ? null
                  : IconButton(
                      onPressed: _searchController.clear,
                      icon: const Icon(Icons.close_rounded),
                    ),
            ),
          ),
          const SizedBox(height: 18),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final camp in const ['ALL', ...summerCampPackageNames])
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: ChoiceChip(
                      label: Text(_summerCampFilterLabel(camp)),
                      selected: _campFilter == camp,
                      onSelected: (_) {
                        setState(() {
                          _campFilter = camp;
                        });
                      },
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 178,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Campers',
                    value: '${rows.length}',
                    icon: Icons.groups_rounded,
                    tint: AppPalette.amber,
                    subtle: '$paid paid',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Collected',
                    value: _money(collected),
                    icon: Icons.wallet_rounded,
                    tint: AppPalette.success,
                    subtle: 'Summer camp payments',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Remaining',
                    value: _money((expected - collected).clamp(0, 999999)),
                    icon: Icons.pending_actions_rounded,
                    tint: AppPalette.electric,
                    subtle: 'Expected ${_money(expected)}',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (_loading && _rows.isEmpty)
            const _LoadingBlock(label: 'Loading summer camp...')
          else if (_error != null && _rows.isEmpty)
            EmptyStateView(
              title: 'Could not load summer camp',
              message: _error!,
              icon: Icons.cloud_off_rounded,
              actionLabel: 'Retry',
              onAction: () => unawaited(_load()),
            )
          else if (rows.isEmpty)
            const EmptyStateView(
              title: 'No summer camp registrations',
              message: 'Try another camp category or search term.',
              icon: Icons.wb_sunny_outlined,
            )
          else
            for (final row in rows) ...[
              _SummerCampCard(row: row),
              const SizedBox(height: 12),
            ],
        ],
      ),
    );
  }

  List<PackageRegistrationRow> get _filteredRows {
    if (_campFilter == 'ALL') return _rows;
    return _rows
        .where((row) =>
            row.packageName.trim().toLowerCase() ==
            _campFilter.trim().toLowerCase())
        .toList(growable: false);
  }
}

class _GuestAccountsScreen extends StatefulWidget {
  const _GuestAccountsScreen({
    required this.repository,
    required this.onBack,
  });

  final PortalRepository repository;
  final VoidCallback onBack;

  @override
  State<_GuestAccountsScreen> createState() => _GuestAccountsScreenState();
}

class _GuestAccountsScreenState extends State<_GuestAccountsScreen> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  List<GuestAccountRow> _rows = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearch);
    unawaited(_load());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.removeListener(_handleSearch);
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearch() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 260), () {
      unawaited(_load());
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await widget.repository.fetchGuestAccounts(
        search: _searchController.text,
      );
      if (!mounted) return;
      setState(() {
        _rows = rows;
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

  Future<void> _email(GuestAccountRow row) async {
    if (row.email.trim().isEmpty) return;
    try {
      await HapticFeedback.selectionClick();
      await launchUrl(Uri(scheme: 'mailto', path: row.email));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final bottomSpacing = MediaQuery.of(context).padding.bottom + 118;
    final totalPoints = _rows.fold<int>(0, (sum, row) => sum + row.totalPoints);
    final rewardPoints =
        _rows.fold<int>(0, (sum, row) => sum + row.rewardPoints);
    final linked = _rows.where((row) => row.linkedPlayersCount > 0).length;

    return RefreshIndicator.adaptive(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
        children: [
          _SectionHeader(
            title: 'Guest Accounts',
            subtitle:
                'Firebase guestAccess points, linked players, and booking rewards.',
            icon: Icons.person_pin_circle_rounded,
            tint: AppPalette.success,
            onBack: widget.onBack,
          ),
          const SizedBox(height: 18),
          TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded),
              hintText: 'Search guest name or email',
              suffixIcon: _searchController.text.isEmpty
                  ? null
                  : IconButton(
                      onPressed: _searchController.clear,
                      icon: const Icon(Icons.close_rounded),
                    ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: MetricCard(
                  label: 'Guests',
                  value: '${_rows.length}',
                  icon: Icons.group_rounded,
                  tint: AppPalette.success,
                  subtle: '$linked linked to players',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: MetricCard(
                  label: 'Points',
                  value: '$totalPoints',
                  icon: Icons.wallet_giftcard_rounded,
                  tint: AppPalette.amber,
                  subtle: '$rewardPoints booking rewards',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (_loading && _rows.isEmpty)
            const _LoadingBlock(label: 'Loading guest accounts...')
          else if (_error != null && _rows.isEmpty)
            EmptyStateView(
              title: 'Could not load guests',
              message: _error!,
              icon: Icons.cloud_off_rounded,
              actionLabel: 'Retry',
              onAction: () => unawaited(_load()),
            )
          else if (_rows.isEmpty)
            const EmptyStateView(
              title: 'No guest accounts',
              message: 'Guest accounts are read from Firebase guestAccess.',
              icon: Icons.person_pin_circle_outlined,
            )
          else
            for (final row in _rows) ...[
              _GuestCard(row: row, onEmail: () => unawaited(_email(row))),
              const SizedBox(height: 12),
            ],
        ],
      ),
    );
  }
}

class _CoachesScreen extends StatefulWidget {
  const _CoachesScreen({
    required this.repository,
    required this.onBack,
  });

  final PortalRepository repository;
  final VoidCallback onBack;

  @override
  State<_CoachesScreen> createState() => _CoachesScreenState();
}

class _CoachesScreenState extends State<_CoachesScreen> {
  List<CoachRow> _rows = const [];
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
      final rows = await widget.repository.fetchCoaches();
      if (!mounted) return;
      setState(() {
        _rows = rows;
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
    final visible = _rows.where((row) => row.isActive).length;
    final achievements =
        _rows.fold<int>(0, (sum, row) => sum + row.achievements.length);

    return RefreshIndicator.adaptive(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
        children: [
          _SectionHeader(
            title: 'Coaches',
            subtitle:
                'Coach profiles synced from landing content and portal staff records.',
            icon: Icons.sports_rounded,
            tint: AppPalette.sky,
            onBack: widget.onBack,
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: MetricCard(
                  label: 'Visible',
                  value: '$visible',
                  icon: Icons.visibility_rounded,
                  tint: AppPalette.sky,
                  subtle: '${_rows.length} total coaches',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: MetricCard(
                  label: 'Achievements',
                  value: '$achievements',
                  icon: Icons.workspace_premium_rounded,
                  tint: AppPalette.amber,
                  subtle: 'Landing profile highlights',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (_loading && _rows.isEmpty)
            const _LoadingBlock(label: 'Loading coaches...')
          else if (_error != null && _rows.isEmpty)
            EmptyStateView(
              title: 'Could not load coaches',
              message: _error!,
              icon: Icons.cloud_off_rounded,
              actionLabel: 'Retry',
              onAction: () => unawaited(_load()),
            )
          else if (_rows.isEmpty)
            const EmptyStateView(
              title: 'No coaches found',
              message: 'Coach records will appear after portal sync.',
              icon: Icons.sports_outlined,
            )
          else
            for (final row in _rows) ...[
              _CoachCard(row: row),
              const SizedBox(height: 12),
            ],
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.tint,
    required this.onBack,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color tint;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(14, 14, 18, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (onBack != null) ...[
            IconButton.filledTonal(
              onPressed: onBack,
              tooltip: 'Back to More',
              icon: const Icon(Icons.arrow_back_rounded),
            ),
            const SizedBox(height: 8),
          ],
          Icon(icon, color: tint, size: 34),
          const SizedBox(height: 14),
          Text(title, style: Theme.of(context).textTheme.displaySmall),
          const SizedBox(height: 10),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppPalette.ink.withValues(alpha: 0.74),
                ),
          ),
        ],
      ),
    );
  }
}

class _HubTile extends StatelessWidget {
  const _HubTile({
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
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: tint, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 5),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.ink.withValues(alpha: 0.68),
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
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

class _SummerCampCard extends StatelessWidget {
  const _SummerCampCard({required this.row});

  final PackageRegistrationRow row;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            row.customerName,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 6),
          Text(
            row.packageName,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppPalette.ink.withValues(alpha: 0.7),
                ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              StatusBadge(
                label: row.isPaid
                    ? 'Paid'
                    : row.collected > 0
                        ? 'Partial'
                        : 'Unpaid',
                color: row.isPaid
                    ? AppPalette.success
                    : row.collected > 0
                        ? AppPalette.warning
                        : AppPalette.electric,
              ),
              StatusBadge(label: row.customerPhone, color: AppPalette.cobalt),
              StatusBadge(
                label: _money(row.finalPriceJod),
                color: AppPalette.amber,
              ),
            ],
          ),
          const SizedBox(height: 12),
          DetailLine(label: 'Collected', value: _money(row.collected)),
          DetailLine(label: 'Registered', value: _date(row.createdAt)),
          if ((row.planLabel ?? '').trim().isNotEmpty)
            DetailLine(label: 'Plan', value: row.planLabel!),
        ],
      ),
    );
  }
}

class _GuestCard extends StatelessWidget {
  const _GuestCard({
    required this.row,
    required this.onEmail,
  });

  final GuestAccountRow row;
  final VoidCallback onEmail;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: row.email.isEmpty ? null : onEmail,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row.displayName,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          row.email.isEmpty ? 'No email set' : row.email,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: AppPalette.ink.withValues(alpha: 0.68),
                              ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: AppPalette.ink.withValues(alpha: 0.36),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusBadge(
                    label: '${row.totalPoints} points',
                    color: AppPalette.success,
                  ),
                  StatusBadge(
                    label: '${row.rewardPoints} rewards',
                    color: AppPalette.amber,
                  ),
                  StatusBadge(
                    label: row.linkedPlayersCount > 0
                        ? '${row.linkedPlayersCount} player(s)'
                        : 'Guest only',
                    color: AppPalette.cobalt,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DetailLine(
                label: 'Bookings',
                value: '${row.bookingsCount}',
              ),
              DetailLine(
                label: 'Last booking',
                value: row.lastBookingAt == null
                    ? 'Not recorded'
                    : _date(row.lastBookingAt!),
              ),
              DetailLine(
                label: 'Last court',
                value: row.lastCourt ?? 'Not recorded',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CoachCard extends StatelessWidget {
  const _CoachCard({required this.row});

  final CoachRow row;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(row.name,
                        style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(
                      row.sport,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppPalette.ink.withValues(alpha: 0.7),
                          ),
                    ),
                  ],
                ),
              ),
              StatusBadge(
                label: row.isActive ? 'Visible' : 'Hidden',
                color: row.isActive ? AppPalette.success : AppPalette.ink,
              ),
            ],
          ),
          if (row.description.trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              row.description,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
          if ((row.quote ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              row.quote!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                    color: AppPalette.electric,
                  ),
            ),
          ],
          if (row.achievements.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final achievement in row.achievements.take(3))
                  StatusBadge(label: achievement, color: AppPalette.amber),
              ],
            ),
          ],
          const SizedBox(height: 12),
          if ((row.email ?? '').trim().isNotEmpty)
            DetailLine(label: 'Email', value: row.email!),
          if ((row.phone ?? '').trim().isNotEmpty)
            DetailLine(label: 'Phone', value: row.phone!),
        ],
      ),
    );
  }
}

class _LoadingBlock extends StatelessWidget {
  const _LoadingBlock({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        children: [
          const CircularProgressIndicator.adaptive(),
          const SizedBox(height: 16),
          Text(label, style: Theme.of(context).textTheme.titleMedium),
        ],
      ),
    );
  }
}

String _money(double value) {
  return 'JOD ${value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 2)}';
}

String _summerCampFilterLabel(String value) {
  switch (value) {
    case 'ALL':
      return 'All camps';
    case 'Warriors Assistant Coach 1-Week Summer Camp':
      return 'Warriors Coach';
    case 'Basketball Summer Camp':
      return 'Basketball';
    case 'Volleyball Summer Camp':
      return 'Volleyball';
    default:
      return value;
  }
}

String _date(String value) {
  final date = DateTime.tryParse(value)?.toLocal();
  if (date == null) return value.isEmpty ? 'Not recorded' : value;
  return '${date.day}/${date.month}/${date.year}';
}
