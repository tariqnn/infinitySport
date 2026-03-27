import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'models.dart';
import 'portal_repository.dart';
import 'theme.dart';
import 'widgets.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({
    super.key,
    required this.repository,
  });

  final PortalRepository repository;

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  final TextEditingController _searchController = TextEditingController();
  BookingFilters _filters = BookingFilters.initial();
  BookingOverviewResponse? _overview;
  Timer? _searchDebounce;
  bool _loading = true;
  String? _error;
  int _segmentIndex = 0;

  @override
  void initState() {
    super.initState();
    _searchController.text = _filters.search;
    _searchController.addListener(_handleSearchChanged);
    unawaited(_loadOverview());
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadOverview() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final payload = await widget.repository.fetchBookingsOverview(_filters);
      if (!mounted) return;
      setState(() {
        _overview = payload;
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
      unawaited(_loadOverview());
    });
  }

  void _changeView(String view) {
    if (view == _filters.view) return;
    if (view == 'custom') {
      setState(() {
        _filters = _filters.copyWith(view: view);
      });
      unawaited(_loadOverview());
      return;
    }

    final span = presetSpanForView(view);
    setState(() {
      _filters = _filters.copyWith(
        view: view,
        startDate: span.startDate,
        endDate: span.endDate,
      );
    });
    unawaited(_loadOverview());
  }

  Future<void> _openFiltersSheet() async {
    final result = await showModalBottomSheet<BookingFilters>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => _BookingFiltersSheet(
        initial: _filters,
        courtOptions: _courtOptions,
        labelOptions: _labelOptions,
      ),
    );

    if (result == null) return;
    _searchController.text = result.search;
    setState(() {
      _filters = result;
    });
    await _loadOverview();
  }

  Future<void> _callCustomer(String? rawPhone) async {
    final phone = _normalizedPhoneNumber(rawPhone);
    if (phone == null) {
      _showMessage('This booking does not have a phone number.');
      return;
    }

    try {
      await HapticFeedback.selectionClick();
      final launched = await launchUrl(Uri(scheme: 'tel', path: phone));
      if (!launched) {
        throw Exception('Could not open the dialer.');
      }
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

  List<String> get _courtOptions {
    final values = <String>{};
    for (final court in _overview?.courts ?? const <BookingCourtRate>[]) {
      if (court.name.trim().isNotEmpty) values.add(court.name.trim());
    }
    for (final booking in _overview?.bookings ?? const <BookingOverviewRow>[]) {
      if ((booking.facilityArea ?? '').trim().isNotEmpty) {
        values.add(booking.facilityArea!.trim());
      }
    }
    final sorted = values.toList()..sort();
    return ['ALL', ...sorted];
  }

  List<String> get _labelOptions {
    final labels = (_overview?.labels ?? const <String>[])
        .where((item) => item.trim().isNotEmpty)
        .toList();
    labels.sort();
    return ['ALL', ...labels];
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final bottomSpacing = MediaQuery.of(context).padding.bottom + 118;

    return RefreshIndicator.adaptive(
      onRefresh: _loadOverview,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
        children: [
          GlassCard(
            padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Bookings', style: textTheme.displaySmall),
                const SizedBox(height: 10),
                Text(
                  'Portal-grade bookings overview with the same filters, payment visibility, and activity feed.',
                  style: textTheme.bodyLarge?.copyWith(
                    color: AppPalette.ink.withValues(alpha: 0.74),
                  ),
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _InfoPill(
                      icon: Icons.date_range_rounded,
                      label: _rangeLabel(_filters.startDate, _filters.endDate),
                    ),
                    _InfoPill(
                      icon: Icons.filter_alt_rounded,
                      label: _filters.activeFilterCount == 0
                          ? 'Default filters'
                          : '${_filters.activeFilterCount} filters applied',
                    ),
                    _InfoPill(
                      icon: Icons.event_available_rounded,
                      label:
                          '${_overview?.kpis.bookingsCount ?? 0} bookings in range',
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
              hintText: 'Search customer, email, phone, or booking ID',
            ),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final view in const ['day', 'week', 'month', 'custom'])
                  Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: ChoiceChip(
                      label: Text(_viewLabel(view)),
                      selected: _filters.view == view,
                      onSelected: (_) => _changeView(view),
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
                    label: 'Collected',
                    value: _formatCurrency(_overview?.kpis.totalCollected ?? 0),
                    icon: Icons.wallet_rounded,
                    tint: AppPalette.cobalt,
                    subtle: 'Net paid in current range',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Pending',
                    value: _formatCurrency(_overview?.kpis.totalPending ?? 0),
                    icon: Icons.pending_actions_rounded,
                    tint: AppPalette.warning,
                    subtle: 'Outstanding amount',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Hours Booked',
                    value: (_overview?.kpis.totalHoursBooked ?? 0)
                        .toStringAsFixed(1),
                    icon: Icons.schedule_rounded,
                    tint: AppPalette.electric,
                    subtle: 'Court hours reserved',
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 168,
                  child: MetricCard(
                    label: 'Utilization',
                    value:
                        '${(_overview?.kpis.utilizationPercent ?? 0).toStringAsFixed(0)}%',
                    icon: Icons.insights_rounded,
                    tint: AppPalette.success,
                    subtle:
                        '${(_overview?.kpis.availableHours ?? 0).toStringAsFixed(0)} hours available',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final segment in const ['Bookings', 'Payments', 'Activity'])
                ChoiceChip(
                  label: Text(segment),
                  selected: _segmentLabel(_segmentIndex) == segment,
                  onSelected: (_) {
                    setState(() {
                      _segmentIndex = _segmentValue(segment);
                    });
                  },
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loading && _overview == null)
            const _LoadingState(message: 'Loading filtered bookings...')
          else if (_error != null && _overview == null)
            EmptyStateView(
              title: 'Could not load bookings',
              message: _error!,
              icon: Icons.cloud_off_rounded,
              actionLabel: 'Retry',
              onAction: () => unawaited(_loadOverview()),
            )
          else if (_segmentIndex == 0)
            _buildBookingsList()
          else if (_segmentIndex == 1)
            _buildPaymentsList()
          else
            _buildActivityList(),
        ],
      ),
    );
  }

  Widget _buildBookingsList() {
    final rows = _overview?.bookings ?? const <BookingOverviewRow>[];
    if (rows.isEmpty) {
      return EmptyStateView(
        title: 'No bookings matched',
        message:
            'Change the date range or loosen a filter to see more bookings.',
        icon: Icons.event_busy_rounded,
        actionLabel: 'Reset search',
        onAction: () {
          _searchController.clear();
        },
      );
    }

    return Column(
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          _BookingCard(
            row: rows[index],
            onTap: () => _showBookingDetails(rows[index]),
            onCall: _hasPhoneNumber(rows[index].customerPhone)
                ? () => unawaited(_callCustomer(rows[index].customerPhone))
                : null,
          ),
          if (index != rows.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _buildPaymentsList() {
    final rows = _overview?.paymentReportRows ?? const <BookingPaymentRow>[];
    if (rows.isEmpty) {
      return const EmptyStateView(
        title: 'No payments in this range',
        message:
            'Switch back to bookings or expand the date window to inspect payment activity.',
        icon: Icons.receipt_long_rounded,
      );
    }

    return Column(
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          _PaymentCard(
            row: rows[index],
            onTap: () => _showPaymentDetails(rows[index]),
          ),
          if (index != rows.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _buildActivityList() {
    final rows = _overview?.calendarEvents ?? const <BookingCalendarEvent>[];
    if (rows.isEmpty) {
      return const EmptyStateView(
        title: 'No activity',
        message:
            'There are no booking events or recurring blocks in the selected range.',
        icon: Icons.calendar_view_day_rounded,
      );
    }

    return Column(
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          _ActivityCard(
            row: rows[index],
            onTap: () => _showActivityDetails(rows[index]),
          ),
          if (index != rows.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }

  Future<void> _showBookingDetails(BookingOverviewRow row) async {
    final feedback = await showModalBottomSheet<_BookingActionFeedback>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (context) => _BookingActionSheet(
        row: row,
        repository: widget.repository,
        onCall: _hasPhoneNumber(row.customerPhone)
            ? () => _callCustomer(row.customerPhone)
            : null,
      ),
    );

    if (!mounted || feedback == null) return;
    _showMessage(feedback.message);
    if (!feedback.isQueued) {
      await _loadOverview();
    }
  }

  Future<void> _showPaymentDetails(BookingPaymentRow row) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _formatCurrency(row.amount),
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                StatusBadge(
                    label: row.status, color: _paymentColor(row.status)),
                StatusBadge(label: row.method, color: AppPalette.cobalt),
              ],
            ),
            const SizedBox(height: 20),
            DetailLine(
                label: 'Customer',
                value: row.customerName ?? 'Unknown customer'),
            DetailLine(label: 'Court', value: row.court ?? 'Not assigned'),
            DetailLine(label: 'Created', value: _formatDateTime(row.createdAt)),
            DetailLine(label: 'Booking ID', value: row.bookingId),
            DetailLine(
                label: 'Transaction Ref',
                value: row.transactionRef ?? 'Not provided'),
            DetailLine(
                label: 'Created By', value: row.createdByAdminId ?? 'System'),
          ],
        ),
      ),
    );
  }

  Future<void> _showActivityDetails(BookingCalendarEvent row) async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(row.title, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                StatusBadge(
                    label: _eventTypeLabel(row.type), color: AppPalette.cobalt),
                StatusBadge(
                    label: row.status, color: _statusColor(row.status, null)),
                if (row.paymentStatus != null)
                  StatusBadge(
                      label: row.paymentStatus!,
                      color: _paymentColor(row.paymentStatus!)),
              ],
            ),
            const SizedBox(height: 20),
            DetailLine(label: 'Court', value: row.court ?? 'Unassigned'),
            DetailLine(label: 'Starts', value: _formatDateTime(row.startTime)),
            DetailLine(label: 'Ends', value: _formatDateTime(row.endTime)),
            if (row.bookingId != null)
              DetailLine(label: 'Booking ID', value: row.bookingId!),
            if (row.blockId != null)
              DetailLine(label: 'Block ID', value: row.blockId!),
          ],
        ),
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({
    required this.row,
    required this.onTap,
    required this.onCall,
  });

  final BookingOverviewRow row;
  final VoidCallback onTap;
  final VoidCallback? onCall;

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
                          row.displayName,
                          style: textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${_formatDate(row.startTime)} · ${_formatTime(row.startTime)} - ${_formatTime(row.endTime)}',
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
                      tooltip: 'Call customer',
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
                    label: _statusLabel(row.status, row.notes),
                    color: _statusColor(row.status, row.notes),
                  ),
                  StatusBadge(
                    label: row.financials.paymentStatus,
                    color: _paymentColor(row.financials.paymentStatus),
                  ),
                  if ((row.facilityArea ?? '').trim().isNotEmpty)
                    StatusBadge(
                        label: row.facilityArea!, color: AppPalette.electric),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _FactBlock(
                      label: 'Net paid',
                      value: _formatCurrency(row.financials.netPaid),
                    ),
                  ),
                  Expanded(
                    child: _FactBlock(
                      label: 'Remaining',
                      value: _formatCurrency(row.financials.remainingAmount),
                    ),
                  ),
                  Expanded(
                    child: _FactBlock(
                      label: 'Source',
                      value: row.source,
                    ),
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

class _PaymentCard extends StatelessWidget {
  const _PaymentCard({
    required this.row,
    required this.onTap,
  });

  final BookingPaymentRow row;
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
                children: [
                  Expanded(
                    child: Text(
                      row.customerName ?? 'Payment',
                      style: textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  Text(
                    _formatCurrency(row.amount),
                    style: textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppPalette.cobalt,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${_formatDate(row.createdAt)} · ${row.court ?? 'No court'}',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppPalette.ink.withValues(alpha: 0.72),
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusBadge(label: row.method, color: AppPalette.cobalt),
                  StatusBadge(
                      label: row.status, color: _paymentColor(row.status)),
                  if ((row.transactionRef ?? '').trim().isNotEmpty)
                    StatusBadge(
                        label: 'Ref ${row.transactionRef}',
                        color: AppPalette.electric),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({
    required this.row,
    required this.onTap,
  });

  final BookingCalendarEvent row;
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
                children: [
                  Expanded(
                    child: Text(
                      row.title,
                      style: textTheme.titleLarge
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  Icon(
                    row.type == 'BOOKING'
                        ? Icons.sports_tennis_rounded
                        : Icons.block_rounded,
                    color: AppPalette.cobalt,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${_formatDate(row.startTime)} · ${_formatTime(row.startTime)} - ${_formatTime(row.endTime)}',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppPalette.ink.withValues(alpha: 0.72),
                ),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusBadge(
                      label: _eventTypeLabel(row.type),
                      color: AppPalette.cobalt),
                  StatusBadge(
                      label: row.status, color: _statusColor(row.status, null)),
                  if ((row.court ?? '').trim().isNotEmpty)
                    StatusBadge(label: row.court!, color: AppPalette.electric),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BookingActionFeedback {
  const _BookingActionFeedback({
    required this.message,
    required this.isQueued,
  });

  final String message;
  final bool isQueued;
}

class _BookingActionSheet extends StatefulWidget {
  const _BookingActionSheet({
    required this.row,
    required this.repository,
    required this.onCall,
  });

  final BookingOverviewRow row;
  final PortalRepository repository;
  final Future<void> Function()? onCall;

  @override
  State<_BookingActionSheet> createState() => _BookingActionSheetState();
}

class _BookingActionSheetState extends State<_BookingActionSheet> {
  static const List<String> _paymentMethods = [
    'CASH',
    'CARD',
    'ONLINE',
    'TRANSFER',
  ];

  String _paymentMethod = _paymentMethods.first;
  bool _submitting = false;
  String? _error;

  String get _bookingStatus =>
      _statusLabel(widget.row.status, widget.row.notes);

  bool get _canConfirm => !const {
        'CONFIRMED',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW'
      }.contains(_bookingStatus);

  bool get _canCollectPayment =>
      !const {'CANCELLED', 'NO_SHOW'}.contains(_bookingStatus) &&
      widget.row.financials.remainingAmount > 0.009;

  bool get _shouldConfirmWithPayment => _canConfirm;

  String get _confirmButtonLabel {
    switch (_bookingStatus) {
      case 'CONFIRMED':
        return 'Already confirmed';
      case 'COMPLETED':
        return 'Already completed';
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'Cannot confirm';
      default:
        return 'Confirm booking';
    }
  }

  String get _paymentButtonLabel {
    if (!_canCollectPayment) {
      return widget.row.financials.paymentStatus == 'PAID'
          ? 'Already paid'
          : 'Payment unavailable';
    }

    final amount = _formatCurrency(widget.row.financials.remainingAmount);
    return _shouldConfirmWithPayment
        ? 'Collect $amount + confirm'
        : 'Collect $amount';
  }

  String get _paymentHelperText {
    if (!_canCollectPayment) {
      if (_bookingStatus == 'CANCELLED' || _bookingStatus == 'NO_SHOW') {
        return 'Cancelled bookings cannot be charged from the mobile app.';
      }
      return 'This booking is already fully paid.';
    }

    return _shouldConfirmWithPayment
        ? 'Records the remaining balance as $_paymentMethod and confirms the booking.'
        : 'Records the remaining balance as $_paymentMethod.';
  }

  Future<void> _handleConfirm() async {
    if (!_canConfirm || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final message = await widget.repository.confirmBooking(
        bookingId: widget.row.id,
      );
      if (!mounted) return;
      unawaited(HapticFeedback.mediumImpact());
      Navigator.of(context).pop(
        _BookingActionFeedback(
          message: message,
          isQueued: _isQueuedMessage(message),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _handleCollectPayment() async {
    if (!_canCollectPayment || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final message = await widget.repository.recordBookingPayment(
        bookingId: widget.row.id,
        amount: widget.row.financials.remainingAmount,
        method: _paymentMethod,
        confirmBooking: _shouldConfirmWithPayment,
      );
      if (!mounted) return;
      unawaited(HapticFeedback.heavyImpact());
      Navigator.of(context).pop(
        _BookingActionFeedback(
          message: message,
          isQueued: _isQueuedMessage(message),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom +
        MediaQuery.of(context).padding.bottom +
        20;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, bottomPadding),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.row.displayName, style: textTheme.headlineMedium),
            const SizedBox(height: 6),
            Text(
              '${_formatDate(widget.row.startTime)} · ${_formatTime(widget.row.startTime)} - ${_formatTime(widget.row.endTime)}',
              style: textTheme.bodyLarge?.copyWith(
                color: AppPalette.ink.withValues(alpha: 0.72),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                StatusBadge(
                  label: _bookingStatus,
                  color: _statusColor(widget.row.status, widget.row.notes),
                ),
                StatusBadge(
                  label: widget.row.financials.paymentStatus,
                  color: _paymentColor(widget.row.financials.paymentStatus),
                ),
                StatusBadge(
                  label: widget.row.source,
                  color: AppPalette.electric,
                ),
              ],
            ),
            const SizedBox(height: 16),
            GlassCard(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Quick actions', style: textTheme.titleLarge),
                  const SizedBox(height: 6),
                  Text(
                    'Handle the call, confirmation, and payment without leaving the booking.',
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppPalette.ink.withValues(alpha: 0.68),
                    ),
                  ),
                  if (_submitting) ...[
                    const SizedBox(height: 14),
                    const LinearProgressIndicator(minHeight: 3),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppPalette.danger.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: AppPalette.danger.withValues(alpha: 0.24),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.error_outline_rounded,
                            color: AppPalette.danger,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _error!,
                              style: textTheme.bodyMedium?.copyWith(
                                color: AppPalette.danger,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.tonalIcon(
                          onPressed: _submitting || widget.onCall == null
                              ? null
                              : () => unawaited(widget.onCall!()),
                          icon: const Icon(Icons.call_rounded),
                          label: Text(
                            widget.onCall == null
                                ? 'No phone'
                                : 'Call customer',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _submitting || !_canConfirm
                              ? null
                              : _handleConfirm,
                          icon: const Icon(Icons.verified_user_rounded),
                          label: Text(_confirmButtonLabel),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text('Payment method', style: textTheme.titleMedium),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final method in _paymentMethods)
                        ChoiceChip(
                          label: Text(method),
                          selected: _paymentMethod == method,
                          onSelected: _submitting || !_canCollectPayment
                              ? null
                              : (_) {
                                  setState(() {
                                    _paymentMethod = method;
                                  });
                                },
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _submitting || !_canCollectPayment
                        ? null
                        : _handleCollectPayment,
                    icon: const Icon(Icons.payments_rounded),
                    label: Text(_paymentButtonLabel),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _paymentHelperText,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppPalette.ink.withValues(alpha: 0.66),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            GlassCard(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Booking details', style: textTheme.titleMedium),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _FactBlock(
                          label: 'Total',
                          value: _formatCurrency(
                              widget.row.financials.totalAmount),
                        ),
                      ),
                      Expanded(
                        child: _FactBlock(
                          label: 'Paid',
                          value: _formatCurrency(widget.row.financials.netPaid),
                        ),
                      ),
                      Expanded(
                        child: _FactBlock(
                          label: 'Remaining',
                          value: _formatCurrency(
                            widget.row.financials.remainingAmount,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  DetailLine(
                    label: 'Court',
                    value: widget.row.facilityArea ?? 'Unassigned',
                  ),
                  DetailLine(label: 'Booking ID', value: widget.row.id),
                  DetailLine(
                    label: 'Start',
                    value: _formatDateTime(widget.row.startTime),
                  ),
                  DetailLine(
                    label: 'End',
                    value: _formatDateTime(widget.row.endTime),
                  ),
                  DetailLine(
                    label: 'Phone',
                    value: widget.row.customerPhone ?? 'Not provided',
                  ),
                  DetailLine(
                    label: 'Email',
                    value: widget.row.customerEmail ?? 'Not provided',
                  ),
                  DetailLine(
                    label: 'Latest method',
                    value: widget.row.financials.latestPaymentMethod ??
                        'Not recorded',
                  ),
                  if ((widget.row.notes ?? '').trim().isNotEmpty)
                    DetailLine(label: 'Notes', value: widget.row.notes!.trim()),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FactBlock extends StatelessWidget {
  const _FactBlock({
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

class _InfoPill extends StatelessWidget {
  const _InfoPill({
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

class _LoadingState extends StatelessWidget {
  const _LoadingState({
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

class _BookingFiltersSheet extends StatefulWidget {
  const _BookingFiltersSheet({
    required this.initial,
    required this.courtOptions,
    required this.labelOptions,
  });

  final BookingFilters initial;
  final List<String> courtOptions;
  final List<String> labelOptions;

  @override
  State<_BookingFiltersSheet> createState() => _BookingFiltersSheetState();
}

class _BookingFiltersSheetState extends State<_BookingFiltersSheet> {
  late BookingFilters _draft;

  @override
  void initState() {
    super.initState();
    _draft = widget.initial;
  }

  Future<void> _pickDate({
    required bool isStart,
  }) async {
    final currentValue = isStart ? _draft.startDate : _draft.endDate;
    final initial = DateTime.tryParse(currentValue) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2024),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked == null) return;
    setState(() {
      if (isStart) {
        _draft = _draft.copyWith(startDate: localDateInput(picked));
      } else {
        _draft = _draft.copyWith(endDate: localDateInput(picked));
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
            Text('Booking filters',
                style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(
              'Match the portal overview with view presets, payment filters, labels, and sources.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.ink.withValues(alpha: 0.72),
                  ),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              initialValue: _draft.view,
              decoration: const InputDecoration(labelText: 'View'),
              items: const [
                DropdownMenuItem(value: 'day', child: Text('Day')),
                DropdownMenuItem(value: 'week', child: Text('Week')),
                DropdownMenuItem(value: 'month', child: Text('Month')),
                DropdownMenuItem(value: 'custom', child: Text('Custom')),
              ],
              onChanged: (value) {
                if (value == null) return;
                if (value == 'custom') {
                  setState(() {
                    _draft = _draft.copyWith(view: value);
                  });
                  return;
                }
                final span = presetSpanForView(value);
                setState(() {
                  _draft = _draft.copyWith(
                    view: value,
                    startDate: span.startDate,
                    endDate: span.endDate,
                  );
                });
              },
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickDate(isStart: true),
                    icon: const Icon(Icons.date_range_rounded),
                    label: Text(_draft.startDate.isEmpty
                        ? 'Start date'
                        : _draft.startDate),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickDate(isStart: false),
                    icon: const Icon(Icons.date_range_rounded),
                    label: Text(
                        _draft.endDate.isEmpty ? 'End date' : _draft.endDate),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _draft.court.isEmpty ? 'ALL' : _draft.court,
              decoration: const InputDecoration(labelText: 'Court'),
              items: widget.courtOptions
                  .map((item) => DropdownMenuItem(
                      value: item,
                      child: Text(item == 'ALL' ? 'All courts' : item)))
                  .toList(growable: false),
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft = _draft.copyWith(court: value == 'ALL' ? '' : value);
                });
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _draft.label.isEmpty ? 'ALL' : _draft.label,
              decoration: const InputDecoration(labelText: 'Label'),
              items: widget.labelOptions
                  .map((item) => DropdownMenuItem(
                      value: item,
                      child: Text(item == 'ALL' ? 'All labels' : item)))
                  .toList(growable: false),
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft = _draft.copyWith(label: value == 'ALL' ? '' : value);
                });
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _draft.bookingStatus,
              decoration: const InputDecoration(labelText: 'Booking status'),
              items: const [
                DropdownMenuItem(value: 'ALL', child: Text('All statuses')),
                DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
                DropdownMenuItem(value: 'CONFIRMED', child: Text('Confirmed')),
                DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
                DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                DropdownMenuItem(value: 'NO_SHOW', child: Text('No show')),
              ],
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft = _draft.copyWith(bookingStatus: value);
                });
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _draft.paymentStatus,
              decoration: const InputDecoration(labelText: 'Payment status'),
              items: const [
                DropdownMenuItem(
                    value: 'ALL', child: Text('All payment states')),
                DropdownMenuItem(value: 'UNPAID', child: Text('Unpaid')),
                DropdownMenuItem(value: 'PAID', child: Text('Paid')),
                DropdownMenuItem(value: 'REFUNDED', child: Text('Refunded')),
              ],
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft = _draft.copyWith(paymentStatus: value);
                });
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _draft.paymentMethod,
              decoration: const InputDecoration(labelText: 'Payment method'),
              items: const [
                DropdownMenuItem(value: 'ALL', child: Text('All methods')),
                DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                DropdownMenuItem(value: 'CARD', child: Text('Card')),
                DropdownMenuItem(value: 'ONLINE', child: Text('Online')),
                DropdownMenuItem(value: 'TRANSFER', child: Text('Transfer')),
              ],
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft = _draft.copyWith(paymentMethod: value);
                });
              },
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _draft.source,
              decoration: const InputDecoration(labelText: 'Source'),
              items: const [
                DropdownMenuItem(value: 'ALL', child: Text('All sources')),
                DropdownMenuItem(value: 'ADMIN', child: Text('Admin')),
                DropdownMenuItem(value: 'APP', child: Text('App')),
                DropdownMenuItem(value: 'WEBSITE', child: Text('Website')),
              ],
              onChanged: (value) {
                if (value == null) return;
                setState(() {
                  _draft = _draft.copyWith(source: value);
                });
              },
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.of(context).pop(
                        BookingFilters.initial()
                            .copyWith(search: widget.initial.search),
                      );
                    },
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

String _rangeLabel(String startDate, String endDate) {
  if (startDate.isEmpty || endDate.isEmpty) return 'Date range';
  if (startDate == endDate) return startDate;
  return '$startDate to $endDate';
}

String _viewLabel(String value) {
  switch (value) {
    case 'day':
      return 'Day';
    case 'month':
      return 'Month';
    case 'custom':
      return 'Custom';
    default:
      return 'Week';
  }
}

String _segmentLabel(int value) {
  switch (value) {
    case 1:
      return 'Payments';
    case 2:
      return 'Activity';
    default:
      return 'Bookings';
  }
}

int _segmentValue(String label) {
  switch (label) {
    case 'Payments':
      return 1;
    case 'Activity':
      return 2;
    default:
      return 0;
  }
}

String _formatCurrency(double value) {
  return 'JOD ${value.toStringAsFixed(value.truncateToDouble() == value ? 0 : 2)}';
}

String _formatDate(String iso) {
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return iso;
  return '${date.day}/${date.month}/${date.year}';
}

String _formatTime(String iso) {
  final date = DateTime.tryParse(iso)?.toLocal();
  if (date == null) return iso;
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  final period = date.hour >= 12 ? 'PM' : 'AM';
  return '$hour:$minute $period';
}

String _formatDateTime(String iso) {
  return '${_formatDate(iso)} · ${_formatTime(iso)}';
}

String _statusLabel(String status, String? notes) {
  final normalized = status.toUpperCase();
  final noteValue = (notes ?? '').toUpperCase();
  if (normalized == 'CANCELLED' && noteValue.contains('[NO_SHOW]')) {
    return 'NO_SHOW';
  }
  return normalized;
}

Color _statusColor(String status, String? notes) {
  final normalized = _statusLabel(status, notes);
  switch (normalized) {
    case 'CONFIRMED':
      return AppPalette.success;
    case 'COMPLETED':
      return AppPalette.electric;
    case 'NO_SHOW':
    case 'CANCELLED':
      return AppPalette.danger;
    default:
      return AppPalette.warning;
  }
}

Color _paymentColor(String status) {
  switch (status.toUpperCase()) {
    case 'PAID':
      return AppPalette.success;
    case 'REFUNDED':
      return AppPalette.danger;
    case 'PARTIAL':
      return AppPalette.warning;
    default:
      return AppPalette.ink.withValues(alpha: 0.68);
  }
}

String _eventTypeLabel(String type) {
  switch (type) {
    case 'RECURRING_BLOCK':
      return 'Recurring block';
    case 'MAINTENANCE':
      return 'Maintenance';
    case 'EXCEPTION':
      return 'Exception';
    default:
      return 'Booking';
  }
}

bool _hasPhoneNumber(String? value) => _normalizedPhoneNumber(value) != null;

String? _normalizedPhoneNumber(String? value) {
  final cleaned = (value ?? '').replaceAll(RegExp(r'[^0-9+]'), '').trim();
  if (cleaned.isEmpty || cleaned == '+') return null;
  return cleaned;
}

bool _isQueuedMessage(String message) {
  return message.toLowerCase().contains('queued');
}
