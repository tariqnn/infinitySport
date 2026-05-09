import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'models.dart';
import 'portal_repository.dart';
import 'theme.dart';
import 'widgets.dart';

const _competitionTypes = [
  'ALL',
  '3X3_MEN',
  '3X3_WOMEN',
  'KING_QUEEN',
  'KING',
  'QUEEN',
  'JACK_OF_THE_COURT',
  'THREE_POINT_MEN',
  'DUNK_CONTEST',
];

class CompetitionsScreen extends StatefulWidget {
  const CompetitionsScreen({
    super.key,
    required this.repository,
  });

  final PortalRepository repository;

  @override
  State<CompetitionsScreen> createState() => _CompetitionsScreenState();
}

class _CompetitionsScreenState extends State<CompetitionsScreen> {
  final TextEditingController _searchController = TextEditingController();
  CompetitionFilters _filters = CompetitionFilters.initial();
  List<CompetitionRegistrationRow> _rows = const [];
  Timer? _searchDebounce;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
    unawaited(_loadCompetitions());
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCompetitions() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final rows = await widget.repository.fetchCompetitions(_filters);
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

  void _handleSearchChanged() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 280), () {
      final text = _searchController.text.trim();
      if (text == _filters.search) return;
      setState(() {
        _filters = _filters.copyWith(search: text);
      });
      unawaited(_loadCompetitions());
    });
  }

  Future<void> _callCustomer(String? rawPhone) async {
    final phone = _normalizedPhoneNumber(rawPhone);
    if (phone == null) {
      _showMessage('This registration does not have a phone number.');
      return;
    }

    try {
      await HapticFeedback.selectionClick();
      final launched = await launchUrl(Uri(scheme: 'tel', path: phone));
      if (!launched) throw Exception('Could not open dialer.');
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not open the dialer for $phone.');
    }
  }

  void _showMessage(String message) {
    final messenger = ScaffoldMessenger.of(context);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final bottomSpacing = MediaQuery.of(context).padding.bottom + 118;
    final teamCount = _rows.where((row) => row.isTeamCompetition).length;
    final paidCount = _rows.where((row) => row.isPaid).length;
    final expectedTotal = _rows.fold<double>(
      0,
      (total, row) => total + _competitionRate(row),
    );
    final playerCount = _rows.fold<int>(
      0,
      (count, row) => count + (row.isTeamCompetition ? row.players.length : 1),
    );

    return RefreshIndicator.adaptive(
      onRefresh: _loadCompetitions,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
        children: [
          GlassCard(
            padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Competitions', style: textTheme.displaySmall),
                const SizedBox(height: 10),
                Text(
                  'Read-only weekend competition registrations mirrored from the portal for phone access.',
                  style: textTheme.bodyLarge?.copyWith(
                    color: AppPalette.ink.withValues(alpha: 0.74),
                  ),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _CompetitionPill(
                      icon: Icons.emoji_events_rounded,
                      label: _competitionLabel(_filters.competitionType),
                    ),
                    const _CompetitionPill(
                      icon: Icons.notifications_active_rounded,
                      label: 'Signup alerts on',
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
              hintText: 'Search player, team, phone, or competition',
            ),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final type in _competitionTypes)
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: ChoiceChip(
                      label: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 190),
                        child: Text(
                          _competitionLabel(type),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      selected: _filters.competitionType == type,
                      onSelected: (_) {
                        setState(() {
                          _filters = _filters.copyWith(competitionType: type);
                        });
                        unawaited(_loadCompetitions());
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
                    label: 'Registrations',
                    value: '${_rows.length}',
                    icon: Icons.how_to_reg_rounded,
                    tint: AppPalette.cobalt,
                    subtle: 'Rows in current view',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Players',
                    value: '$playerCount',
                    icon: Icons.groups_rounded,
                    tint: AppPalette.electric,
                    subtle: '$teamCount teams included',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Expected',
                    value: _money(expectedTotal),
                    icon: Icons.payments_rounded,
                    tint: AppPalette.success,
                    subtle: '$paidCount paid in portal',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 26),
                child: CircularProgressIndicator.adaptive(),
              ),
            )
          else if (_error != null)
            EmptyStateView(
              icon: Icons.cloud_off_rounded,
              title: 'Could not load competitions',
              message: _error!,
              actionLabel: 'Retry',
              onAction: () => unawaited(_loadCompetitions()),
            )
          else if (_rows.isEmpty)
            EmptyStateView(
              icon: Icons.emoji_events_outlined,
              title: 'No competition registrations',
              message: 'New competition signups will appear here after sync.',
              actionLabel: 'Refresh',
              onAction: () => unawaited(_loadCompetitions()),
            )
          else
            ..._rows.map(
              (row) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _CompetitionCard(
                  row: row,
                  onTap: () => unawaited(_showCompetitionDetails(row)),
                  onCall: _hasPhoneNumber(row.customerPhone)
                      ? () => unawaited(_callCustomer(row.customerPhone))
                      : null,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _showCompetitionDetails(CompetitionRegistrationRow row) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          MediaQuery.of(context).padding.bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(row.displayName,
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  StatusBadge(
                    label: _competitionLabel(row.competitionType),
                    color: AppPalette.cobalt,
                  ),
                  StatusBadge(
                    label: row.isPaid ? 'PAID' : row.status,
                    color: row.isPaid ? AppPalette.success : AppPalette.warning,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              if (row.customerPhone != null)
                FilledButton.tonalIcon(
                  onPressed: () => unawaited(_callCustomer(row.customerPhone)),
                  icon: const Icon(Icons.call_rounded),
                  label: Text(row.customerPhone!),
                ),
              const SizedBox(height: 12),
              DetailLine(
                  label: 'Competition',
                  value: _competitionLabel(row.competitionType)),
              DetailLine(
                  label: 'Registered', value: _formatDateTime(row.createdAt)),
              DetailLine(label: 'Source', value: row.source),
              DetailLine(label: 'Status', value: row.status),
              if (row.gender != null)
                DetailLine(label: 'Gender', value: row.gender!),
              if (row.age != null)
                DetailLine(label: 'Age', value: '${row.age}'),
              DetailLine(
                label: 'Prize rate',
                value: _money(_competitionRate(row)),
              ),
              if (row.amountPaid != null)
                DetailLine(
                    label: 'Amount paid', value: _money(row.amountPaid!)),
              if (row.paymentMethod != null)
                DetailLine(label: 'Payment method', value: row.paymentMethod!),
              if (row.players.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Players',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                for (final player in row.players)
                  DetailLine(label: 'Player', value: player),
              ],
              DetailLine(label: 'Registration ID', value: row.id),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompetitionCard extends StatelessWidget {
  const _CompetitionCard({
    required this.row,
    required this.onTap,
    required this.onCall,
  });

  final CompetitionRegistrationRow row;
  final VoidCallback onTap;
  final VoidCallback? onCall;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final subtitle = row.isTeamCompetition
        ? '${row.players.length} player${row.players.length == 1 ? '' : 's'}'
        : [
            if (row.age != null) 'Age ${row.age}',
            if (row.gender != null) row.gender!,
          ].join(' | ');

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
                          row.displayName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          subtitle.isEmpty
                              ? _formatDateTime(row.createdAt)
                              : '$subtitle | ${_formatDateTime(row.createdAt)}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppPalette.ink.withValues(alpha: 0.72),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (onCall != null) ...[
                    const SizedBox(width: 10),
                    IconButton.filledTonal(
                      onPressed: onCall,
                      tooltip: 'Call contact',
                      style: IconButton.styleFrom(
                        minimumSize: const Size(48, 48),
                        backgroundColor: AppPalette.shell,
                        foregroundColor: AppPalette.cobalt,
                      ),
                      icon: const Icon(Icons.call_rounded),
                    ),
                  ],
                  const SizedBox(width: 6),
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
                    label: _competitionLabel(row.competitionType),
                    color: AppPalette.cobalt,
                  ),
                  StatusBadge(
                    label: 'Rate ${_money(_competitionRate(row))}',
                    color: AppPalette.electric,
                  ),
                  StatusBadge(
                    label: row.isPaid ? 'PAID' : row.status,
                    color: row.isPaid ? AppPalette.success : AppPalette.warning,
                  ),
                  if (row.customerPhone != null)
                    StatusBadge(
                      label: row.customerPhone!,
                      color: AppPalette.forest,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompetitionPill extends StatelessWidget {
  const _CompetitionPill({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 260),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: AppPalette.shell,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppPalette.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppPalette.cobalt),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppPalette.ink,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

String _competitionLabel(String type) {
  switch (type.toUpperCase()) {
    case 'ALL':
      return 'All competitions';
    case '3X3_MEN':
      return '3x3 Men';
    case '3X3_WOMEN':
      return '3x3 Women';
    case 'KING_QUEEN':
      return 'King and Queen';
    case 'KING':
      return 'King';
    case 'QUEEN':
      return 'Queen';
    case 'JACK_OF_THE_COURT':
      return 'Jack of the Court';
    case 'THREE_POINT_MEN':
      return '3 Point Men';
    case 'DUNK_CONTEST':
      return 'Dunk Contest';
    default:
      return type.replaceAll('_', ' ');
  }
}

String _formatDateTime(String value) {
  final parsed = DateTime.tryParse(value)?.toLocal();
  if (parsed == null) return value.isEmpty ? 'Not recorded' : value;
  final month = parsed.month.toString().padLeft(2, '0');
  final day = parsed.day.toString().padLeft(2, '0');
  final hour = parsed.hour % 12 == 0 ? 12 : parsed.hour % 12;
  final minute = parsed.minute.toString().padLeft(2, '0');
  final suffix = parsed.hour >= 12 ? 'PM' : 'AM';
  return '${parsed.year}-$month-$day $hour:$minute $suffix';
}

String _money(double value) => '${value.toStringAsFixed(0)} JOD';

double _competitionRate(CompetitionRegistrationRow row) {
  return row.amountDue ?? (row.isTeamCompetition ? 50 : 25);
}

bool _hasPhoneNumber(String? value) => _normalizedPhoneNumber(value) != null;

String? _normalizedPhoneNumber(String? value) {
  final cleaned = (value ?? '').replaceAll(RegExp(r'[^0-9+]'), '').trim();
  if (cleaned.isEmpty || cleaned == '+') return null;
  return cleaned;
}
