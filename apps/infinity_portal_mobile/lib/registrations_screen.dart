import 'dart:async';

import 'package:flutter/material.dart';

import 'models.dart';
import 'portal_repository.dart';
import 'theme.dart';
import 'widgets.dart';

class RegistrationsScreen extends StatefulWidget {
  const RegistrationsScreen({
    super.key,
    required this.repository,
  });

  final PortalRepository repository;

  @override
  State<RegistrationsScreen> createState() => _RegistrationsScreenState();
}

class _RegistrationsScreenState extends State<RegistrationsScreen> {
  final TextEditingController _searchController = TextEditingController();
  RegistrationFilters _filters = RegistrationFilters.initial();
  List<PackageRegistrationRow> _rows = const [];
  List<PackageOption> _packages = const [];
  RegistrationTotals? _totals;
  Map<String, Set<String>> _canceledSessions = const {};
  Timer? _searchDebounce;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
    unawaited(_loadPackages());
    unawaited(_loadRegistrations());
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPackages() async {
    try {
      final packages = await widget.repository.fetchPackages();
      if (!mounted) return;
      setState(() {
        _packages = packages;
      });
    } catch (_) {}
  }

  Future<void> _loadRegistrations() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        widget.repository.fetchRegistrations(_filters),
        widget.repository.fetchRegistrationTotals(_filters),
        widget.repository.fetchCanceledSessionsByPackage(
          packageName:
              _filters.packageName.isEmpty ? null : _filters.packageName,
          startDate: _filters.resolvedStartDate,
          endDate: _filters.resolvedEndDate,
        ),
      ]);

      if (!mounted) return;
      setState(() {
        _rows = results[0] as List<PackageRegistrationRow>;
        _totals = results[1] as RegistrationTotals;
        _canceledSessions = results[2] as Map<String, Set<String>>;
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

  void _handleSearchChanged() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 280), () {
      final text = _searchController.text.trim();
      if (text == _filters.search) return;
      setState(() {
        _filters = _filters.copyWith(search: text);
      });
      unawaited(_loadRegistrations());
    });
  }

  Future<void> _openFiltersSheet() async {
    final result = await showModalBottomSheet<RegistrationFilters>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => _RegistrationFiltersSheet(
        initial: _filters,
        packages: _packages.map((item) => item.name).toList(growable: false),
      ),
    );

    if (result == null) return;
    setState(() {
      _filters = result;
    });
    await _loadRegistrations();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final bottomSpacing = MediaQuery.of(context).padding.bottom + 118;

    return RefreshIndicator.adaptive(
      onRefresh: _loadRegistrations,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
        children: [
          GlassCard(
            padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Registrations', style: textTheme.displaySmall),
                const SizedBox(height: 10),
                Text(
                  'Live package registrations with the same package filters, payment totals, and session countdown logic used in the portal.',
                  style: textTheme.bodyLarge?.copyWith(
                    color: AppPalette.ink.withValues(alpha: 0.74),
                  ),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _RegistrationPill(
                      icon: Icons.sports_basketball_rounded,
                      label: _filters.packageName.isEmpty
                          ? 'All packages'
                          : _filters.packageName,
                    ),
                    _RegistrationPill(
                      icon: Icons.date_range_rounded,
                      label: _registrationRangeLabel(_filters),
                    ),
                    _RegistrationPill(
                      icon: Icons.filter_alt_rounded,
                      label: _filters.activeFilterCount == 0
                          ? 'Default filters'
                          : '${_filters.activeFilterCount} filters applied',
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchController.text.isEmpty
                  ? null
                  : IconButton(
                      onPressed: () {
                        _searchController.clear();
                      },
                      icon: const Icon(Icons.close_rounded),
                    ),
              hintText: 'Search by player name, phone, email, or player ID',
            ),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final preset in const [
                  'all',
                  '1week',
                  '1month',
                  '3months',
                  'custom'
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: ChoiceChip(
                      label: Text(_datePresetLabel(preset)),
                      selected: _filters.datePreset == preset,
                      onSelected: (_) {
                        setState(() {
                          _filters = _filters.copyWith(datePreset: preset);
                        });
                        unawaited(_loadRegistrations());
                      },
                    ),
                  ),
                FilledButton.tonalIcon(
                  onPressed: _openFiltersSheet,
                  icon: const Icon(Icons.tune_rounded),
                  label: Text(_filters.activeFilterCount == 0
                      ? 'Filters'
                      : 'Filters (${_filters.activeFilterCount})'),
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
                    label: 'Registered',
                    value: '${_totals?.totalRegistered ?? 0}',
                    icon: Icons.groups_rounded,
                    tint: AppPalette.cobalt,
                    subtle: 'Rows in current selection',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Collected',
                    value: _registrationMoney(_totals?.collectedTotal ?? 0),
                    icon: Icons.account_balance_wallet_rounded,
                    tint: AppPalette.success,
                    subtle: '${_totals?.paidCount ?? 0} fully paid',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Remaining',
                    value: _registrationMoney(_totals?.remainingTotal ?? 0),
                    icon: Icons.timelapse_rounded,
                    tint: AppPalette.warning,
                    subtle:
                        '${_totals?.partialCount ?? 0} partial / ${_totals?.unpaidCount ?? 0} unpaid',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Expected',
                    value: _registrationMoney(_totals?.expectedTotal ?? 0),
                    icon: Icons.pie_chart_rounded,
                    tint: AppPalette.electric,
                    subtle: 'Live package total',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_loading && _rows.isEmpty)
            const _RegistrationLoading(message: 'Loading registrations...')
          else if (_error != null && _rows.isEmpty)
            EmptyStateView(
              title: 'Could not load registrations',
              message: _error!,
              icon: Icons.cloud_off_rounded,
              actionLabel: 'Retry',
              onAction: () => unawaited(_loadRegistrations()),
            )
          else
            _buildRegistrationsList(),
        ],
      ),
    );
  }

  Widget _buildRegistrationsList() {
    if (_rows.isEmpty) {
      return EmptyStateView(
        title: 'No registrations matched',
        message:
            'Try a different package or wider date window to surface active registrations.',
        icon: Icons.app_registration_rounded,
        actionLabel: 'Clear search',
        onAction: () {
          _searchController.clear();
        },
      );
    }

    return Column(
      children: [
        for (var index = 0; index < _rows.length; index++) ...[
          _RegistrationCard(
            row: _rows[index],
            remainingSummary:
                _remainingSummary(_rows[index], _canceledSessions),
            onTap: () => _showRegistrationDetails(_rows[index]),
          ),
          if (index != _rows.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }

  Future<void> _showRegistrationDetails(PackageRegistrationRow row) async {
    final remaining = _remainingSummary(row, _canceledSessions);
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(row.customerName,
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  StatusBadge(
                      label: _paymentStatusLabel(row),
                      color: _paymentStatusColor(_paymentStatusLabel(row))),
                  StatusBadge(label: remaining.primary, color: remaining.color),
                  StatusBadge(
                      label: row.packageName, color: AppPalette.electric),
                ],
              ),
              const SizedBox(height: 20),
              DetailLine(label: 'Package', value: row.packageName),
              DetailLine(
                  label: 'Plan label', value: row.planLabel ?? row.packageName),
              DetailLine(label: 'Phone', value: row.customerPhone),
              DetailLine(
                  label: 'Email', value: row.customerEmail ?? 'Not provided'),
              DetailLine(
                  label: 'Player code', value: row.playerCode ?? 'Pending'),
              DetailLine(label: 'Cycle', value: '${row.currentCycle ?? 1}'),
              DetailLine(
                  label: 'Base price',
                  value: _registrationMoney(row.basePriceJod)),
              DetailLine(
                  label: 'Final price',
                  value: _registrationMoney(row.finalPriceJod)),
              DetailLine(
                  label: 'Collected', value: _registrationMoney(row.collected)),
              DetailLine(
                  label: 'Starts',
                  value:
                      _registrationDate(row.periodStartsAt ?? row.createdAt)),
              DetailLine(
                  label: 'Ends',
                  value: _registrationDate(row.periodEndsAt ?? '')),
              DetailLine(label: 'Remaining', value: remaining.primary),
              if (remaining.secondary.isNotEmpty)
                DetailLine(label: 'Detail', value: remaining.secondary),
              if (row.discountType != 'NONE')
                DetailLine(
                  label: 'Discount',
                  value:
                      '${row.discountType} ${row.discountValue?.toStringAsFixed(0) ?? ''} ${row.discountReason ?? ''}'
                          .trim(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RegistrationCard extends StatelessWidget {
  const _RegistrationCard({
    required this.row,
    required this.remainingSummary,
    required this.onTap,
  });

  final PackageRegistrationRow row;
  final _RemainingSummary remainingSummary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(30),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row.packageName,
                          style: textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          row.customerName,
                          style: textTheme.bodyLarge
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${row.customerPhone} · ${_registrationDate(row.periodStartsAt ?? row.createdAt)}',
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppPalette.ink.withValues(alpha: 0.7),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
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
                    label: _paymentStatusLabel(row),
                    color: _paymentStatusColor(_paymentStatusLabel(row)),
                  ),
                  StatusBadge(
                    label: remainingSummary.primary,
                    color: remainingSummary.color,
                  ),
                  if ((row.playerCode ?? '').trim().isNotEmpty)
                    StatusBadge(
                        label: 'ID ${row.playerCode}',
                        color: AppPalette.cobalt),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _RegistrationFact(
                      label: 'Final price',
                      value: _registrationMoney(row.finalPriceJod),
                    ),
                  ),
                  Expanded(
                    child: _RegistrationFact(
                      label: 'Collected',
                      value: _registrationMoney(row.collected),
                    ),
                  ),
                  Expanded(
                    child: _RegistrationFact(
                      label: 'Cycle',
                      value: '${row.currentCycle ?? 1}',
                    ),
                  ),
                ],
              ),
              if (remainingSummary.secondary.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  remainingSummary.secondary,
                  style: textTheme.bodySmall?.copyWith(
                    color: AppPalette.ink.withValues(alpha: 0.66),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _RegistrationFact extends StatelessWidget {
  const _RegistrationFact({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(
          value,
          style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _RegistrationPill extends StatelessWidget {
  const _RegistrationPill({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppPalette.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppPalette.cobalt),
          const SizedBox(width: 8),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppPalette.midnight,
                ),
          ),
        ],
      ),
    );
  }
}

class _RegistrationLoading extends StatelessWidget {
  const _RegistrationLoading({
    required this.message,
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        children: [
          const CircularProgressIndicator.adaptive(),
          const SizedBox(height: 18),
          Text(
            message,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ],
      ),
    );
  }
}

class _RegistrationFiltersSheet extends StatefulWidget {
  const _RegistrationFiltersSheet({
    required this.initial,
    required this.packages,
  });

  final RegistrationFilters initial;
  final List<String> packages;

  @override
  State<_RegistrationFiltersSheet> createState() =>
      _RegistrationFiltersSheetState();
}

class _RegistrationFiltersSheetState extends State<_RegistrationFiltersSheet> {
  late RegistrationFilters _draft;

  @override
  void initState() {
    super.initState();
    _draft = widget.initial;
  }

  Future<void> _pickDate({required bool isStart}) async {
    final current = isStart ? _draft.customStartDate : _draft.customEndDate;
    final initial = DateTime.tryParse(current) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2024),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _draft = _draft.copyWith(customStartDate: localDateInput(picked));
      } else {
        _draft = _draft.copyWith(customEndDate: localDateInput(picked));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Registration filters',
                style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(
              'Use the same package and date windows as the portal list.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.ink.withValues(alpha: 0.72),
                  ),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue:
                  _draft.packageName.isEmpty ? 'ALL' : _draft.packageName,
              decoration: const InputDecoration(labelText: 'Package'),
              items: [
                const DropdownMenuItem(
                    value: 'ALL', child: Text('All packages')),
                ...widget.packages.map(
                    (item) => DropdownMenuItem(value: item, child: Text(item))),
              ],
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft =
                      _draft.copyWith(packageName: value == 'ALL' ? '' : value);
                });
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _draft.datePreset,
              decoration: const InputDecoration(labelText: 'Date window'),
              items: const [
                DropdownMenuItem(value: 'all', child: Text('All time')),
                DropdownMenuItem(value: '1week', child: Text('Last 7 days')),
                DropdownMenuItem(value: '1month', child: Text('Last month')),
                DropdownMenuItem(
                    value: '3months', child: Text('Last 3 months')),
                DropdownMenuItem(
                    value: '6months', child: Text('Last 6 months')),
                DropdownMenuItem(value: '1year', child: Text('Last year')),
                DropdownMenuItem(value: 'custom', child: Text('Custom range')),
              ],
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft = _draft.copyWith(datePreset: value);
                });
              },
            ),
            if (_draft.datePreset == 'custom') ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(isStart: true),
                      icon: const Icon(Icons.date_range_rounded),
                      label: Text(
                        _draft.customStartDate.isEmpty
                            ? 'Start date'
                            : _draft.customStartDate,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(isStart: false),
                      icon: const Icon(Icons.date_range_rounded),
                      label: Text(
                        _draft.customEndDate.isEmpty
                            ? 'End date'
                            : _draft.customEndDate,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context)
                        .pop(RegistrationFilters.initial()),
                    child: const Text('Reset'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).pop(_draft),
                    child: const Text('Apply'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RemainingSummary {
  const _RemainingSummary({
    required this.primary,
    required this.secondary,
    required this.color,
  });

  final String primary;
  final String secondary;
  final Color color;
}

_RemainingSummary _remainingSummary(
  PackageRegistrationRow row,
  Map<String, Set<String>> canceledDatesByPackage,
) {
  if (row.isFrozen) {
    return const _RemainingSummary(
      primary: 'Frozen',
      secondary: 'Countdown paused',
      color: AppPalette.electric,
    );
  }

  final sessions = _sessionsRemaining(row, canceledDatesByPackage);
  if (sessions != null) {
    if (sessions.remaining <= 0) {
      return const _RemainingSummary(
        primary: 'No sessions',
        secondary: 'Cycle has no scheduled sessions left',
        color: AppPalette.danger,
      );
    }

    final end = _periodEnd(row);
    return _RemainingSummary(
      primary: '${sessions.remaining}/${sessions.total} sessions',
      secondary:
          end == null ? '' : 'Ends ${_registrationDate(end.toIso8601String())}',
      color: AppPalette.success,
    );
  }

  final days = _daysRemaining(row);
  if (days == null) {
    return const _RemainingSummary(
      primary: 'Not tracked',
      secondary: '',
      color: AppPalette.ink,
    );
  }

  if (days == 0) {
    return const _RemainingSummary(
      primary: 'Expired',
      secondary: 'Cycle ended',
      color: AppPalette.danger,
    );
  }

  final end = _periodEnd(row);
  return _RemainingSummary(
    primary: '$days day${days == 1 ? '' : 's'}',
    secondary:
        end == null ? '' : 'Ends ${_registrationDate(end.toIso8601String())}',
    color: AppPalette.success,
  );
}

class _SessionCounter {
  const _SessionCounter({
    required this.remaining,
    required this.total,
  });

  final int remaining;
  final int total;
}

_SessionCounter? _sessionsRemaining(
  PackageRegistrationRow row,
  Map<String, Set<String>> canceledDatesByPackage,
) {
  final schedule = _packageSchedule(row.packageName);
  if (schedule == null) return null;
  final start = _cycleStart(row);
  final end = _periodEnd(row);
  if (start == null || end == null) return null;

  final effectiveNow = row.isFrozen && row.frozenAt != null
      ? DateTime.tryParse(row.frozenAt!)?.toLocal() ?? DateTime.now()
      : DateTime.now();
  final total = schedule.$1;
  final scheduledCount =
      _countScheduledSessions(start, effectiveNow, schedule.$2);
  final canceled = canceledDatesByPackage[row.packageName] ?? const <String>{};

  var canceledInRange = 0;
  for (var cursor = DateTime(start.year, start.month, start.day);
      !cursor.isAfter(effectiveNow);
      cursor = cursor.add(const Duration(days: 1))) {
    if (canceled.contains(localDateInput(cursor))) {
      canceledInRange += 1;
    }
  }

  final used = (scheduledCount - canceledInRange).clamp(0, total);
  final remaining = (total - used + row.sessionsBonus).clamp(0, 999);
  return _SessionCounter(remaining: remaining, total: total);
}

(int, List<int>)? _packageSchedule(String packageName) {
  final name = packageName.trim();
  if (name.startsWith('Basketball - ')) {
    if (name.contains('Private') || name.contains('Small Groups')) return null;
    return (12, [6, 1, 3, 5]);
  }
  if (name == 'Gymnastics Package A') return (12, [0, 2, 4]);
  if (name == 'Gymnastics Package B') return (8, [0, 2]);
  if (name == 'Gymnastics Package C') return (18, [0, 2, 4]);
  if (name == 'Gymnastics Package D') return (12, [0, 2]);
  if (name == 'Volleyball') return (10, [6, 2, 0]);
  return null;
}

int _countScheduledSessions(
    DateTime start, DateTime end, List<int> daysOfWeek) {
  final daySet = daysOfWeek.toSet();
  var count = 0;
  for (var cursor = DateTime(start.year, start.month, start.day);
      !cursor.isAfter(end);
      cursor = cursor.add(const Duration(days: 1))) {
    if (daySet.contains(cursor.weekday % 7)) count += 1;
  }
  return count;
}

DateTime? _periodEnd(PackageRegistrationRow row) {
  if ((row.periodEndsAt ?? '').trim().isNotEmpty) {
    return DateTime.tryParse(row.periodEndsAt!)?.toLocal();
  }
  final created = DateTime.tryParse(row.createdAt)?.toLocal();
  return created?.add(const Duration(days: 30));
}

DateTime? _cycleStart(PackageRegistrationRow row) {
  if ((row.periodStartsAt ?? '').trim().isNotEmpty) {
    return DateTime.tryParse(row.periodStartsAt!)?.toLocal();
  }
  return DateTime.tryParse(row.createdAt)?.toLocal();
}

int? _daysRemaining(PackageRegistrationRow row) {
  final end = _periodEnd(row);
  if (end == null) return null;
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final target = DateTime(end.year, end.month, end.day);
  final diff = target.difference(today).inDays;
  return diff <= 0 ? 0 : diff;
}

String _paymentStatusLabel(PackageRegistrationRow row) {
  if (row.isPaid) return 'Paid';
  if (row.collected > 0) return 'Partial';
  return 'Unpaid';
}

Color _paymentStatusColor(String label) {
  switch (label) {
    case 'Paid':
      return AppPalette.success;
    case 'Partial':
      return AppPalette.warning;
    default:
      return AppPalette.danger;
  }
}

String _registrationMoney(double value) {
  return 'JOD ${value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 2)}';
}

String _registrationDate(String iso) {
  final parsed = DateTime.tryParse(iso)?.toLocal();
  if (parsed == null) return iso.isEmpty ? 'Not set' : iso;
  return '${parsed.day}/${parsed.month}/${parsed.year}';
}

String _datePresetLabel(String preset) {
  switch (preset) {
    case '1week':
      return '7D';
    case '1month':
      return '1M';
    case '3months':
      return '3M';
    case 'custom':
      return 'Custom';
    default:
      return 'All';
  }
}

String _registrationRangeLabel(RegistrationFilters filters) {
  if (filters.datePreset == 'custom') {
    final start =
        filters.customStartDate.isEmpty ? 'Start' : filters.customStartDate;
    final end = filters.customEndDate.isEmpty ? 'End' : filters.customEndDate;
    return '$start to $end';
  }
  switch (filters.datePreset) {
    case '1week':
      return 'Last 7 days';
    case '1month':
      return 'Last month';
    case '3months':
      return 'Last 3 months';
    case '6months':
      return 'Last 6 months';
    case '1year':
      return 'Last year';
    default:
      return 'All time';
  }
}
