import 'dart:async';
import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';

import 'models.dart';
import 'portal_repository.dart';

class FirebasePortalRepository implements PortalRepository {
  FirebasePortalRepository({
    FirebaseFirestore? firestore,
  }) : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  @override
  Future<String?> resolveCompanyId() async => null;

  @override
  Future<BookingOverviewResponse> fetchBookingsOverview(
    BookingFilters filters,
  ) async {
    final start = _parseLocalDate(filters.startDate) ??
        DateTime.now().subtract(const Duration(days: 7));
    final end = _parseLocalDate(filters.endDate) ?? DateTime.now();
    final rangeStart = DateTime(start.year, start.month, start.day);
    final rangeEnd = DateTime(end.year, end.month, end.day, 23, 59, 59, 999);

    final snapshots = await Future.wait<dynamic>([
      _firestore.collection('portalBookingConfig').doc('current').get(),
      _firestore.collection('portalBookingAvailability').doc('current').get(),
      _firestore
          .collection('portalBookings')
          .where(
            'startTime',
            isGreaterThanOrEqualTo: Timestamp.fromDate(
                rangeStart.subtract(const Duration(days: 1))),
          )
          .where(
            'startTime',
            isLessThanOrEqualTo:
                Timestamp.fromDate(rangeEnd.add(const Duration(days: 1))),
          )
          .get(),
      _firestore
          .collection('portalBookingInbox')
          .where(
            'startTime',
            isGreaterThanOrEqualTo: Timestamp.fromDate(
                rangeStart.subtract(const Duration(days: 1))),
          )
          .where(
            'startTime',
            isLessThanOrEqualTo:
                Timestamp.fromDate(rangeEnd.add(const Duration(days: 1))),
          )
          .get(),
    ]);

    final configData =
        (snapshots[0] as DocumentSnapshot<Map<String, dynamic>>).data() ??
            const <String, dynamic>{};
    final availabilityData =
        (snapshots[1] as DocumentSnapshot<Map<String, dynamic>>).data() ??
            const <String, dynamic>{};
    final bookingDocs =
        (snapshots[2] as QuerySnapshot<Map<String, dynamic>>).docs;
    final bookingInboxDocs =
        (snapshots[3] as QuerySnapshot<Map<String, dynamic>>).docs;

    final configCourts = _readBookingCourts(configData);
    final courtRates = {
      for (final court in configCourts) court.name: court.hourlyRate,
    };
    final blockedSlots = _readBlockedSlots(availabilityData);

    final rowsById = <String, _BookingRowEnvelope>{};

    for (final doc in bookingDocs) {
      final row = _bookingRowFromFirestore(doc.id, doc.data(), courtRates);
      if (row == null) continue;
      if (row.deleted ||
          row.start.isAfter(rangeEnd) ||
          row.end.isBefore(rangeStart)) {
        continue;
      }
      rowsById[row.row.id] = row;
    }

    for (final doc in bookingInboxDocs) {
      final data = doc.data();
      if (!_isVisibleBookingInboxEntry(data)) continue;
      final row = _bookingRowFromFirestore(doc.id, data, courtRates);
      if (row == null) continue;
      if (row.deleted ||
          row.start.isAfter(rangeEnd) ||
          row.end.isBefore(rangeStart)) {
        continue;
      }
      rowsById.putIfAbsent(row.row.id, () => row);
    }

    var rows = rowsById.values.toList(growable: false);

    if (filters.court.isNotEmpty && filters.court != 'ALL') {
      rows = rows
          .where((row) => (row.row.facilityArea ?? '').trim() == filters.court)
          .toList(growable: false);
    }

    if (filters.bookingStatus.isNotEmpty && filters.bookingStatus != 'ALL') {
      if (filters.bookingStatus == 'NO_SHOW') {
        rows = rows
            .where(
              (row) => _statusLabel(row.row.status, row.row.notes) == 'NO_SHOW',
            )
            .toList(growable: false);
      } else {
        rows = rows
            .where(
              (row) => row.row.status.toUpperCase() == filters.bookingStatus,
            )
            .toList(growable: false);
      }
    }

    if (filters.paymentStatus.isNotEmpty && filters.paymentStatus != 'ALL') {
      rows = rows
          .where(
            (row) =>
                row.row.financials.paymentStatus.toUpperCase() ==
                filters.paymentStatus,
          )
          .toList(growable: false);
    }

    if (filters.paymentMethod.isNotEmpty && filters.paymentMethod != 'ALL') {
      rows = rows
          .where(
            (row) =>
                (row.row.financials.latestPaymentMethod ?? '').toUpperCase() ==
                filters.paymentMethod,
          )
          .toList(growable: false);
    }

    if (filters.source.isNotEmpty && filters.source != 'ALL') {
      rows = rows
          .where((row) => row.row.source.toUpperCase() == filters.source)
          .toList(growable: false);
    }

    final search = filters.search.trim().toLowerCase();
    if (search.isNotEmpty) {
      rows = rows.where((row) {
        final haystack = [
          row.row.id,
          row.row.displayName,
          row.row.customerPhone ?? '',
          row.row.customerEmail ?? '',
          row.row.facilityArea ?? '',
        ].join(' ').toLowerCase();
        return haystack.contains(search);
      }).toList(growable: false);
    }

    rows = rows.toList()..sort((a, b) => a.start.compareTo(b.start));

    final knownCourts = <String>{
      for (final court in configCourts)
        if (court.name.trim().isNotEmpty) court.name.trim(),
      for (final row in rows)
        if ((row.row.facilityArea ?? '').trim().isNotEmpty)
          row.row.facilityArea!.trim(),
      for (final block in blockedSlots)
        if (block.courtType.trim().isNotEmpty) block.courtType.trim(),
    }.toList()
      ..sort();

    final selectedCourts = filters.court.isNotEmpty && filters.court != 'ALL'
        ? [filters.court]
        : knownCourts;
    final totalDays = rangeEnd
            .difference(
                DateTime(rangeStart.year, rangeStart.month, rangeStart.day))
            .inDays +
        1;
    final availableHours = selectedCourts.length * totalDays * 17.0;
    final totalHoursBooked = rows
        .where((row) => row.row.status.toUpperCase() != 'CANCELLED')
        .fold<double>(
          0,
          (runningTotal, row) => runningTotal + row.row.financials.totalHours,
        );
    final totalRefunds = rows.fold<double>(
      0,
      (runningTotal, row) => runningTotal + row.row.financials.refundAmount,
    );
    final totalCollected = rows.fold<double>(
      0,
      (runningTotal, row) => runningTotal + row.row.financials.netPaid,
    );
    final totalPending = rows.fold<double>(
      0,
      (runningTotal, row) => runningTotal + row.row.financials.remainingAmount,
    );
    final totalRevenue = rows.fold<double>(
      0,
      (runningTotal, row) => runningTotal + row.row.financials.paidAmount,
    );
    final utilizationPercent =
        availableHours <= 0 ? 0 : (totalHoursBooked / availableHours) * 100;

    final paymentRows = rows
        .where(
          (row) =>
              row.row.financials.netPaid > 0 ||
              row.row.financials.refundAmount > 0,
        )
        .map(
          (row) => BookingPaymentRow(
            id: '${row.row.id}-payment',
            bookingId: row.row.id,
            amount: row.row.financials.netPaid > 0
                ? row.row.financials.netPaid
                : row.row.financials.refundAmount,
            method: row.row.financials.latestPaymentMethod ?? 'OTHER',
            status: row.row.financials.paymentStatus == 'REFUNDED'
                ? 'REFUNDED'
                : 'PAID',
            transactionRef: null,
            createdByAdminId: null,
            createdAt: row.updatedAt,
            court: row.row.facilityArea,
            customerName: row.row.displayName,
          ),
        )
        .toList(growable: false)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final paymentByMethod = <String, BookingPaymentMethodTotals>{};
    for (final payment in paymentRows) {
      final key = payment.method.trim().isEmpty ? 'OTHER' : payment.method;
      final current = paymentByMethod[key];
      final paid = (current?.paid ?? 0) +
          (payment.status == 'REFUNDED' ? 0 : payment.amount);
      final refunded = (current?.refunded ?? 0) +
          (payment.status == 'REFUNDED' ? payment.amount : 0);
      paymentByMethod[key] = BookingPaymentMethodTotals(
        paid: paid,
        refunded: refunded,
        net: paid - refunded,
      );
    }

    final calendarEvents = <BookingCalendarEvent>[
      for (final row in rows)
        BookingCalendarEvent(
          id: 'booking-${row.row.id}',
          type: 'BOOKING',
          bookingId: row.row.id,
          blockId: null,
          title: row.row.displayName,
          court: row.row.facilityArea,
          startTime: row.row.startTime,
          endTime: row.row.endTime,
          status: row.row.status,
          paymentStatus: row.row.financials.paymentStatus,
        ),
      ..._buildRecurringBlockEvents(
        blockedSlots: blockedSlots,
        start: rangeStart,
        end: rangeEnd,
        courtFilter: filters.court,
        labelFilter: filters.label,
      ),
    ]..sort((a, b) => a.startTime.compareTo(b.startTime));

    final labels = blockedSlots
        .map((item) => item.label?.trim() ?? '')
        .where((item) => item.isNotEmpty)
        .toSet()
        .toList()
      ..sort();

    return BookingOverviewResponse(
      rangeStart: rangeStart.toUtc().toIso8601String(),
      rangeEnd: rangeEnd.toUtc().toIso8601String(),
      kpis: BookingKpis(
        totalCollected: totalCollected,
        totalPending: totalPending,
        totalRefunds: totalRefunds,
        totalRevenue: totalRevenue,
        bookingsCount: rows.length,
        totalHoursBooked: totalHoursBooked,
        utilizationPercent: utilizationPercent.clamp(0, 100).toDouble(),
        availableHours: availableHours,
      ),
      bookings: rows.map((item) => item.row).toList(growable: false),
      calendarEvents: calendarEvents,
      paymentReportRows: paymentRows,
      paymentByMethod: paymentByMethod,
      courts: [
        for (final name in knownCourts)
          BookingCourtRate(
            name: name,
            hourlyRate: courtRates[name] ?? 0,
            rewardPointsPerHour: 0,
          ),
      ],
      labels: labels,
    );
  }

  @override
  Future<Map<String, Map<String, List<String>>>> fetchBlockedSlots({
    String? date,
  }) async {
    final snapshot = await _firestore
        .collection('portalBookingAvailability')
        .doc('current')
        .get();
    final data = snapshot.data() ?? const <String, dynamic>{};
    final blockedSlots = _readBlockedSlots(data);

    if (date == null || date.trim().isEmpty) {
      final grouped = <String, Map<String, List<String>>>{};
      for (final slot in blockedSlots.where((item) => item.isBlocked)) {
        grouped.putIfAbsent(slot.dayOfWeek, () => <String, List<String>>{});
        grouped[slot.dayOfWeek]!
            .putIfAbsent(slot.courtType, () => <String>[])
            .add(slot.time);
      }
      return grouped;
    }

    final selectedDate = _parseLocalDate(date);
    if (selectedDate == null) return const {};
    final dayKey = _weekdayLabel(selectedDate);
    final grouped = <String, Map<String, List<String>>>{dayKey: {}};

    for (final slot in blockedSlots) {
      if (!slot.isBlocked) continue;
      if (slot.dayOfWeek != dayKey) continue;
      if (!_isBlockedSlotActiveOnDate(slot, selectedDate)) continue;
      grouped[dayKey]!
          .putIfAbsent(slot.courtType, () => <String>[])
          .add(slot.time);
    }

    return grouped;
  }

  @override
  Future<Map<String, Map<String, List<String>>>> fetchBookedSlots({
    required String startDate,
    required String endDate,
  }) async {
    final start = _parseLocalDate(startDate);
    final end = _parseLocalDate(endDate);
    if (start == null || end == null) return const {};

    final snapshots = await Future.wait<dynamic>([
      _firestore
          .collection('portalBookings')
          .where(
            'startTime',
            isGreaterThanOrEqualTo: Timestamp.fromDate(
                DateTime(start.year, start.month, start.day)),
          )
          .where(
            'startTime',
            isLessThanOrEqualTo: Timestamp.fromDate(
              DateTime(end.year, end.month, end.day, 23, 59, 59, 999),
            ),
          )
          .get(),
      _firestore
          .collection('portalBookingInbox')
          .where(
            'startTime',
            isGreaterThanOrEqualTo: Timestamp.fromDate(
                DateTime(start.year, start.month, start.day)),
          )
          .where(
            'startTime',
            isLessThanOrEqualTo: Timestamp.fromDate(
              DateTime(end.year, end.month, end.day, 23, 59, 59, 999),
            ),
          )
          .get(),
    ]);

    final grouped = <String, Map<String, List<String>>>{};
    final seenBookingIds = <String>{};
    final bookingDocs =
        (snapshots[0] as QuerySnapshot<Map<String, dynamic>>).docs;
    final bookingInboxDocs =
        (snapshots[1] as QuerySnapshot<Map<String, dynamic>>).docs;

    void addBookedSlots(_BookingRowEnvelope row) {
      if (row.deleted) return;
      if (row.row.status.toUpperCase() == 'CANCELLED') return;
      if (!seenBookingIds.add(row.row.id)) return;
      final court = (row.row.facilityArea ?? '').trim();
      if (court.isEmpty) return;
      final dateKey = localDateInput(row.start);
      grouped.putIfAbsent(dateKey, () => <String, List<String>>{});
      final slots = grouped[dateKey]!.putIfAbsent(court, () => <String>[]);
      for (final slot in _expandHourSlots(row.start, row.end)) {
        if (!slots.contains(slot)) {
          slots.add(slot);
        }
      }
    }

    for (final doc in bookingDocs) {
      final row = _bookingRowFromFirestore(doc.id, doc.data(), const {});
      if (row == null) continue;
      addBookedSlots(row);
    }

    for (final doc in bookingInboxDocs) {
      final data = doc.data();
      if (!_isVisibleBookingInboxEntry(data)) continue;
      final row = _bookingRowFromFirestore(doc.id, data, const {});
      if (row == null) continue;
      addBookedSlots(row);
    }

    return grouped;
  }

  @override
  Future<void> createBooking({
    required String courtName,
    required DateTime startTime,
    required DateTime endTime,
    required String customerName,
    required String customerPhone,
    String? customerEmail,
  }) async {
    final inboxRef = _firestore.collection('portalBookingInbox').doc();
    final now = DateTime.now().toUtc();
    final timestamp = Timestamp.fromDate(now);
    final payload = <String, Object>{
      'id': inboxRef.id,
      'bookingId': inboxRef.id,
      'courtId': courtName,
      'facilityArea': courtName,
      'courtName': courtName,
      'status': 'PENDING',
      'source': 'APP',
      'isPaid': false,
      'customerName': customerName.trim(),
      'customerPhone': customerPhone.trim(),
      'customerEmail': (customerEmail ?? '').trim(),
      'notes': 'Mobile app booking',
      'startTime': Timestamp.fromDate(startTime.toUtc()),
      'startTimeIso': startTime.toUtc().toIso8601String(),
      'endTime': Timestamp.fromDate(endTime.toUtc()),
      'endTimeIso': endTime.toUtc().toIso8601String(),
      'dbImported': false,
      'createdAt': timestamp,
      'createdAtIso': now.toIso8601String(),
      'updatedAt': timestamp,
      'updatedAtIso': now.toIso8601String(),
    };
    await inboxRef.set(payload);
  }

  @override
  Future<String> confirmBooking({
    required String bookingId,
  }) async {
    final actionRef = await _queueBookingAction(
      bookingId: bookingId,
      actionType: 'CONFIRM_BOOKING',
      confirmBooking: true,
    );
    return _awaitBookingActionResult(
      actionRef: actionRef,
      queuedMessage: 'Booking confirmation queued. It will sync shortly.',
      successMessage: 'Booking confirmed.',
    );
  }

  @override
  Future<String> recordBookingPayment({
    required String bookingId,
    required double amount,
    required String method,
    bool confirmBooking = false,
  }) async {
    final normalizedAmount = amount.round();
    if (normalizedAmount <= 0) {
      throw Exception('Payment amount must be greater than 0.');
    }

    final actionRef = await _queueBookingAction(
      bookingId: bookingId,
      actionType: 'COLLECT_PAYMENT',
      confirmBooking: confirmBooking,
      paymentAmount: normalizedAmount,
      paymentMethod: method.trim().isEmpty ? 'CASH' : method.trim(),
    );
    return _awaitBookingActionResult(
      actionRef: actionRef,
      queuedMessage: 'Payment confirmation queued. It will sync shortly.',
      successMessage: confirmBooking
          ? 'Payment recorded and booking confirmed.'
          : 'Payment recorded.',
    );
  }

  @override
  Future<List<PackageOption>> fetchPackages() async {
    final snapshot = await _firestore
        .collection('portalRegistrationConfig')
        .doc('current')
        .get();
    final data = snapshot.data() ?? const <String, dynamic>{};
    final rows = (data['packages'] as List<dynamic>? ?? const [])
        .whereType<Map<dynamic, dynamic>>()
        .map((item) => Map<String, dynamic>.from(item))
        .map(PackageOption.fromJson)
        .where((item) => item.isActive)
        .toList(growable: false)
      ..sort((a, b) {
        final order = a.sortOrder.compareTo(b.sortOrder);
        return order != 0 ? order : a.name.compareTo(b.name);
      });
    return rows;
  }

  @override
  Future<List<PackageRegistrationRow>> fetchRegistrations(
    RegistrationFilters filters,
  ) async {
    final rows = await _loadRegistrationRows();
    return _filterRegistrationRows(rows, filters);
  }

  @override
  Future<RegistrationTotals> fetchRegistrationTotals(
    RegistrationFilters filters,
  ) async {
    final rows =
        _filterRegistrationRows(await _loadRegistrationRows(), filters);
    var paidCount = 0;
    var partialCount = 0;
    var unpaidCount = 0;
    var expectedTotal = 0.0;
    var collectedTotal = 0.0;
    var discountsTotal = 0.0;
    final byPackage = <String, RegistrationPackageTotals>{};

    for (final row in rows) {
      expectedTotal += row.finalPriceJod;
      collectedTotal += row.collected;
      discountsTotal += math.max(0, row.basePriceJod - row.finalPriceJod);
      if (row.isPaid && row.finalPriceJod > 0) {
        paidCount += 1;
      } else if (row.collected > 0) {
        partialCount += 1;
      } else {
        unpaidCount += 1;
      }

      final current = byPackage[row.packageName] ??
          const RegistrationPackageTotals(
            registered: 0,
            expected: 0,
            collected: 0,
            remaining: 0,
          );
      byPackage[row.packageName] = RegistrationPackageTotals(
        registered: current.registered + 1,
        expected: current.expected + row.finalPriceJod,
        collected: current.collected + row.collected,
        remaining:
            current.remaining + math.max(0, row.finalPriceJod - row.collected),
      );
    }

    return RegistrationTotals(
      totalRegistered: rows.length,
      paidCount: paidCount,
      partialCount: partialCount,
      unpaidCount: unpaidCount,
      expectedTotal: expectedTotal,
      collectedTotal: collectedTotal,
      remainingTotal: math.max(0, expectedTotal - collectedTotal),
      discountsTotal: discountsTotal,
      byMethod: const {},
      byPackage: byPackage,
    );
  }

  @override
  Future<Map<String, Set<String>>> fetchCanceledSessionsByPackage({
    String? packageName,
    String? startDate,
    String? endDate,
  }) async {
    final snapshot = await _firestore
        .collection('portalRegistrationConfig')
        .doc('current')
        .get();
    final data = snapshot.data() ?? const <String, dynamic>{};
    final rows = (data['canceledSessions'] as List<dynamic>? ?? const [])
        .whereType<Map<dynamic, dynamic>>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);

    final start = startDate == null || startDate.isEmpty
        ? null
        : _parseLocalDate(startDate);
    final end =
        endDate == null || endDate.isEmpty ? null : _parseLocalDate(endDate);

    final grouped = <String, Set<String>>{};
    for (final row in rows) {
      final pkg = readString(row['packageName']);
      if (pkg.isEmpty) continue;
      if (packageName != null && packageName.isNotEmpty && pkg != packageName) {
        continue;
      }
      final rawDate = _readIsoValue(row['sessionDate']) ??
          readString(row['sessionDateIso']);
      final parsed = DateTime.tryParse(rawDate)?.toLocal();
      if (parsed == null) continue;
      final localKey = localDateInput(parsed);
      if (start != null &&
          parsed.isBefore(DateTime(start.year, start.month, start.day))) {
        continue;
      }
      if (end != null &&
          parsed.isAfter(DateTime(end.year, end.month, end.day, 23, 59, 59))) {
        continue;
      }
      grouped.putIfAbsent(pkg, () => <String>{}).add(localKey);
    }
    return grouped;
  }

  @override
  Future<List<CompetitionRegistrationRow>> fetchCompetitions(
    CompetitionFilters filters,
  ) async {
    final snapshot =
        await _firestore.collection('portalCompetitionRegistrations').get();
    final rows = <CompetitionRegistrationRow>[];
    for (final doc in snapshot.docs) {
      final data = doc.data();
      if (readBool(data['deleted'])) continue;
      final row = _competitionRowFromFirestore(doc.id, data);
      if (row == null) continue;
      rows.add(row);
    }
    return _filterCompetitionRows(rows, filters);
  }

  @override
  Future<void> createRegistration({
    required PackageOption package,
    required String customerName,
    required String customerPhone,
    String? customerEmail,
    int? customerAge,
    DateTime? periodStartsAt,
  }) async {
    final inboxRef = _firestore.collection('portalRegistrationInbox').doc();
    final now = DateTime.now().toUtc();
    final timestamp = Timestamp.fromDate(now);
    final payload = <String, Object>{
      'id': inboxRef.id,
      'registrationId': inboxRef.id,
      'packageName': package.name,
      'customerName': customerName.trim(),
      'customerPhone': customerPhone.trim(),
      'discountType': 'NONE',
      'source': 'APP',
      'status': 'PENDING',
      'dbImported': false,
      'planLabel': package.name,
      'createdAt': timestamp,
      'createdAtIso': now.toIso8601String(),
      'updatedAt': timestamp,
      'updatedAtIso': now.toIso8601String(),
    };
    final normalizedEmail = (customerEmail ?? '').trim();
    if (normalizedEmail.isNotEmpty) {
      payload['customerEmail'] = normalizedEmail;
    }
    if (customerAge != null) {
      payload['customerAge'] = customerAge;
    }
    if (package.sessionsCount > 0) {
      payload['sessionsLeft'] = package.sessionsCount;
    }
    payload['durationMonths'] = package.durationMonths;
    final currentPriceJod = package.currentPriceJod;
    if (currentPriceJod != null) {
      payload['basePriceJod'] = currentPriceJod;
      payload['finalPriceJod'] = currentPriceJod;
    }
    if (periodStartsAt != null) {
      payload['periodStartsAt'] = Timestamp.fromDate(periodStartsAt.toUtc());
      payload['periodStartsAtIso'] = periodStartsAt.toUtc().toIso8601String();
      final periodEndsAt = DateTime(
        periodStartsAt.toUtc().year,
        periodStartsAt.toUtc().month +
            (package.durationMonths <= 0 ? 1 : package.durationMonths),
        periodStartsAt.toUtc().day,
        periodStartsAt.toUtc().hour,
        periodStartsAt.toUtc().minute,
        periodStartsAt.toUtc().second,
        periodStartsAt.toUtc().millisecond,
        periodStartsAt.toUtc().microsecond,
      );
      payload['periodEndsAt'] = Timestamp.fromDate(periodEndsAt);
      payload['periodEndsAtIso'] = periodEndsAt.toIso8601String();
      payload['nextPaymentDate'] = Timestamp.fromDate(periodEndsAt);
      payload['nextPaymentDateIso'] = periodEndsAt.toIso8601String();
    }
    await inboxRef.set(payload);
  }

  Future<DocumentReference<Map<String, dynamic>>> _queueBookingAction({
    required String bookingId,
    required String actionType,
    required bool confirmBooking,
    int? paymentAmount,
    String? paymentMethod,
  }) async {
    final actionRef = _firestore.collection('portalBookingActionInbox').doc();
    final now = DateTime.now().toUtc();
    final timestamp = Timestamp.fromDate(now);
    await actionRef.set({
      'id': actionRef.id,
      'bookingId': bookingId,
      'actionType': actionType,
      'confirmBooking': confirmBooking,
      'paymentAmount': paymentAmount,
      'paymentMethod': paymentMethod,
      'source': 'APP',
      'status': 'PENDING',
      'dbImported': false,
      'createdAt': timestamp,
      'createdAtIso': now.toIso8601String(),
      'updatedAt': timestamp,
      'updatedAtIso': now.toIso8601String(),
    });
    return actionRef;
  }

  Future<String> _awaitBookingActionResult({
    required DocumentReference<Map<String, dynamic>> actionRef,
    required String queuedMessage,
    required String successMessage,
  }) async {
    try {
      final snapshot = await actionRef.snapshots().firstWhere((snapshot) {
        final data = snapshot.data();
        final status = readString(
          data?['status'],
          fallback: 'PENDING',
        ).toUpperCase();
        return const {'SYNCED', 'ERROR', 'CONFLICT', 'CANCELLED'}
            .contains(status);
      }).timeout(const Duration(seconds: 12));

      final data = snapshot.data() ?? const <String, dynamic>{};
      final status =
          readString(data['status'], fallback: 'PENDING').toUpperCase();
      if (status == 'SYNCED') {
        final syncNote = readNullableString(data['syncNote']);
        if (syncNote != null && syncNote.trim().isNotEmpty) {
          return syncNote.trim();
        }
        return successMessage;
      }

      final syncError = readNullableString(data['syncError']);
      if (syncError != null && syncError.trim().isNotEmpty) {
        throw Exception(syncError.trim());
      }
      throw Exception('Booking update could not be completed.');
    } on TimeoutException {
      return queuedMessage;
    }
  }

  Future<List<PackageRegistrationRow>> _loadRegistrationRows() async {
    final snapshots = await Future.wait<dynamic>([
      _firestore
          .collection('portalRegistrations')
          .orderBy('updatedAt', descending: true)
          .get(),
      _firestore
          .collection('portalRegistrationInbox')
          .orderBy('createdAt', descending: true)
          .get(),
    ]);

    final rowsByKey = <String, PackageRegistrationRow>{};
    final registrationDocs =
        (snapshots[0] as QuerySnapshot<Map<String, dynamic>>).docs;
    final registrationInboxDocs =
        (snapshots[1] as QuerySnapshot<Map<String, dynamic>>).docs;

    for (final doc in registrationDocs) {
      final data = doc.data();
      if (_isDeletedRegistrationEntry(data)) continue;
      final row = _registrationRowFromFirestore(doc.id, doc.data());
      if (row == null) continue;
      rowsByKey['portal:${row.id}'] = row;
    }

    for (final doc in registrationInboxDocs) {
      final data = doc.data();
      if (!_isVisibleRegistrationInboxEntry(data)) continue;
      final row = _registrationRowFromFirestore(doc.id, data);
      if (row == null) continue;
      rowsByKey['inbox:${row.id}'] = row;
    }

    return rowsByKey.values.toList(growable: false);
  }

  List<PackageRegistrationRow> _filterRegistrationRows(
    List<PackageRegistrationRow> rows,
    RegistrationFilters filters,
  ) {
    final start = filters.resolvedStartDate == null
        ? null
        : _parseLocalDate(filters.resolvedStartDate!);
    final end = filters.resolvedEndDate == null
        ? null
        : _parseLocalDate(filters.resolvedEndDate!);

    final filtered = rows.where((row) {
      if (filters.packageName.isNotEmpty &&
          row.packageName != filters.packageName) {
        return false;
      }

      final reference =
          DateTime.tryParse(row.periodStartsAt ?? row.createdAt)?.toLocal();
      if (start != null &&
          (reference == null ||
              reference
                  .isBefore(DateTime(start.year, start.month, start.day)))) {
        return false;
      }
      if (end != null &&
          (reference == null ||
              reference.isAfter(
                  DateTime(end.year, end.month, end.day, 23, 59, 59)))) {
        return false;
      }

      final search = filters.search.trim().toLowerCase();
      if (search.isNotEmpty) {
        final haystack = [
          row.id,
          row.packageName,
          row.customerName,
          row.customerPhone,
          row.customerEmail ?? '',
          row.playerCode ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.contains(search)) return false;
      }

      return true;
    }).toList(growable: false);

    filtered.sort((a, b) {
      final aDate = DateTime.tryParse(a.periodStartsAt ?? a.createdAt) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bDate = DateTime.tryParse(b.periodStartsAt ?? b.createdAt) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bDate.compareTo(aDate);
    });
    return filtered;
  }

  List<CompetitionRegistrationRow> _filterCompetitionRows(
    List<CompetitionRegistrationRow> rows,
    CompetitionFilters filters,
  ) {
    final filtered = rows.where((row) {
      if (filters.competitionType.isNotEmpty &&
          filters.competitionType != 'ALL' &&
          row.competitionType != filters.competitionType) {
        return false;
      }

      final search = filters.search.trim().toLowerCase();
      if (search.isNotEmpty) {
        final haystack = [
          row.id,
          row.competitionType,
          row.displayName,
          row.customerPhone ?? '',
          row.gender ?? '',
          row.status,
          ...row.players,
        ].join(' ').toLowerCase();
        if (!haystack.contains(search)) return false;
      }

      return true;
    }).toList(growable: false);

    filtered.sort((a, b) {
      final aDate = DateTime.tryParse(a.createdAt) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      final bDate = DateTime.tryParse(b.createdAt) ??
          DateTime.fromMillisecondsSinceEpoch(0);
      return bDate.compareTo(aDate);
    });
    return filtered;
  }

  List<BookingCourtRate> _readBookingCourts(Map<String, dynamic> configData) {
    return (configData['courts'] as List<dynamic>? ?? const [])
        .whereType<Map<dynamic, dynamic>>()
        .map((item) =>
            BookingCourtRate.fromJson(Map<String, dynamic>.from(item)))
        .toList(growable: false);
  }

  List<_BlockedSlotRecord> _readBlockedSlots(Map<String, dynamic> data) {
    return (data['blockedSlots'] as List<dynamic>? ?? const [])
        .whereType<Map<dynamic, dynamic>>()
        .map((item) => Map<String, dynamic>.from(item))
        .map(
          (item) => _BlockedSlotRecord(
            id: readString(item['id']),
            dayOfWeek: readString(item['dayOfWeek']).toUpperCase(),
            courtType: readString(item['courtType']),
            time: readString(item['time']),
            isBlocked:
                item['isBlocked'] == null ? true : readBool(item['isBlocked']),
            label: readNullableString(item['label']),
            startDate: readNullableString(item['startDate']),
            endDate: readNullableString(item['endDate']),
          ),
        )
        .where((item) => item.dayOfWeek.isNotEmpty && item.courtType.isNotEmpty)
        .toList(growable: false);
  }

  _BookingRowEnvelope? _bookingRowFromFirestore(
    String docId,
    Map<String, dynamic> data,
    Map<String, double> courtRates,
  ) {
    final startIso =
        _readIsoValue(data['startTime']) ?? readString(data['startTimeIso']);
    final endIso =
        _readIsoValue(data['endTime']) ?? readString(data['endTimeIso']);
    final start = DateTime.tryParse(startIso)?.toLocal();
    final end = DateTime.tryParse(endIso)?.toLocal();
    if (start == null || end == null) return null;

    final facilityArea = readNullableString(data['facilityArea']) ??
        readNullableString(data['courtName']);
    final financialsRaw = Map<String, dynamic>.from(
      (data['financials'] as Map<dynamic, dynamic>? ?? const {}),
    );
    final totalHours = financialsRaw['totalHours'] == null
        ? end.difference(start).inMinutes / 60
        : readDouble(financialsRaw['totalHours']);
    final rate = facilityArea == null ? 0 : (courtRates[facilityArea] ?? 0);
    final totalAmount = financialsRaw['totalAmount'] == null
        ? totalHours * rate
        : readDouble(financialsRaw['totalAmount']);
    final paidAmount = readDouble(financialsRaw['paidAmount']);
    final refundAmount = readDouble(financialsRaw['refundAmount']);
    final netPaid = financialsRaw['netPaid'] == null
        ? math.max<double>(0, paidAmount - refundAmount)
        : readDouble(financialsRaw['netPaid']);
    final remainingAmount = financialsRaw['remainingAmount'] == null
        ? math.max<double>(0, totalAmount - netPaid)
        : readDouble(financialsRaw['remainingAmount']);
    final paymentStatus = readString(
      financialsRaw['paymentStatus'],
      fallback: netPaid <= 0
          ? 'UNPAID'
          : netPaid >= totalAmount
              ? 'PAID'
              : 'PARTIAL',
    );

    final row = BookingOverviewRow(
      id: readString(data['id'], fallback: docId),
      companyId: readString(data['companyId']),
      startTime: start.toUtc().toIso8601String(),
      endTime: end.toUtc().toIso8601String(),
      facilityArea: facilityArea,
      status: readString(data['status'], fallback: 'PENDING'),
      customerName: readNullableString(data['customerName']),
      customerPhone: readNullableString(data['customerPhone']),
      customerEmail: readNullableString(data['customerEmail']),
      notes: readNullableString(data['notes']),
      source: readString(data['source'], fallback: 'APP'),
      memberFirstName: null,
      memberLastName: null,
      financials: BookingFinancials(
        totalHours: totalHours,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        refundAmount: refundAmount,
        netPaid: netPaid,
        remainingAmount: remainingAmount,
        paymentStatus: paymentStatus,
        latestPaymentMethod:
            readNullableString(financialsRaw['latestPaymentMethod']),
      ),
    );

    return _BookingRowEnvelope(
      row: row,
      start: start,
      end: end,
      updatedAt: _readIsoValue(data['updatedAt']) ??
          _readIsoValue(data['createdAt']) ??
          start.toUtc().toIso8601String(),
      deleted: readBool(data['deleted']),
    );
  }

  PackageRegistrationRow? _registrationRowFromFirestore(
    String docId,
    Map<String, dynamic> data,
  ) {
    final createdAt =
        _readIsoValue(data['createdAt']) ?? readString(data['createdAtIso']);
    if (createdAt.isEmpty) return null;

    return PackageRegistrationRow(
      id: readString(data['id'], fallback: docId),
      packageName: readString(data['packageName']),
      customerName: readString(data['customerName']),
      customerPhone: readString(data['customerPhone']),
      customerEmail: readNullableString(data['customerEmail']),
      customerAge:
          data['customerAge'] == null ? null : readInt(data['customerAge']),
      playerCode: readNullableString(data['playerCode']),
      currentCycle:
          data['currentCycle'] == null ? null : readInt(data['currentCycle']),
      sessionsLeft:
          data['sessionsLeft'] == null ? null : readInt(data['sessionsLeft']),
      sessionsUsedOverride: data['sessionsUsedOverride'] == null
          ? null
          : readInt(data['sessionsUsedOverride']),
      nextPaymentDate: _readNullableIso(data['nextPaymentDate']) ??
          readNullableString(data['nextPaymentDateIso']),
      planLabel: readNullableString(data['planLabel']),
      isPaid: readBool(data['isPaid']),
      basePriceJod: readDouble(data['basePriceJod']),
      discountType: readString(data['discountType'], fallback: 'NONE'),
      discountValue: data['discountValue'] == null
          ? null
          : readDouble(data['discountValue']),
      discountReason: readNullableString(data['discountReason']),
      finalPriceJod: readDouble(data['finalPriceJod']),
      durationMonths:
          data['durationMonths'] == null ? 1 : readInt(data['durationMonths']),
      periodStartsAt: _readNullableIso(data['periodStartsAt']) ??
          readNullableString(data['periodStartsAtIso']),
      periodEndsAt: _readNullableIso(data['periodEndsAt']) ??
          readNullableString(data['periodEndsAtIso']),
      isFrozen: readBool(data['isFrozen']),
      frozenAt: _readNullableIso(data['frozenAt']) ??
          readNullableString(data['frozenAtIso']),
      sessionsBonus: readInt(data['sessionsBonus']),
      collected: readDouble(data['collected']),
      createdAt: createdAt,
      updatedAt: _readIsoValue(data['updatedAt']) ??
          readString(data['updatedAtIso'], fallback: createdAt),
    );
  }

  CompetitionRegistrationRow? _competitionRowFromFirestore(
    String docId,
    Map<String, dynamic> data,
  ) {
    final createdAt =
        _readIsoValue(data['createdAt']) ?? readString(data['createdAtIso']);
    if (createdAt.isEmpty) return null;

    return CompetitionRegistrationRow(
      id: readString(data['id'], fallback: docId),
      competitionType: readString(data['competitionType'], fallback: 'UNKNOWN')
          .toUpperCase(),
      participantName: readNullableString(data['participantName']),
      age: data['age'] == null ? null : readInt(data['age']),
      gender: readNullableString(data['gender']),
      customerPhone: readNullableString(data['customerPhone']),
      teamName: readNullableString(data['teamName']),
      playerOne: readNullableString(data['playerOne']),
      playerTwo: readNullableString(data['playerTwo']),
      playerThree: readNullableString(data['playerThree']),
      playerFour: readNullableString(data['playerFour']),
      isPaid: readBool(data['isPaid']),
      amountDue:
          data['amountDue'] == null ? null : readDouble(data['amountDue']),
      amountPaid:
          data['amountPaid'] == null ? null : readDouble(data['amountPaid']),
      paymentMethod: readNullableString(data['paymentMethod']),
      paidAt: _readNullableIso(data['paidAt']) ??
          readNullableString(data['paidAtIso']),
      source: readString(data['source'], fallback: 'WEBSITE'),
      status: readString(data['status'], fallback: 'NEW'),
      createdAt: createdAt,
      updatedAt: _readIsoValue(data['updatedAt']) ??
          readString(data['updatedAtIso'], fallback: createdAt),
    );
  }

  List<BookingCalendarEvent> _buildRecurringBlockEvents({
    required List<_BlockedSlotRecord> blockedSlots,
    required DateTime start,
    required DateTime end,
    required String courtFilter,
    required String labelFilter,
  }) {
    final dayMap = <String, int>{
      'SUNDAY': DateTime.sunday,
      'MONDAY': DateTime.monday,
      'TUESDAY': DateTime.tuesday,
      'WEDNESDAY': DateTime.wednesday,
      'THURSDAY': DateTime.thursday,
      'FRIDAY': DateTime.friday,
      'SATURDAY': DateTime.saturday,
    };

    final events = <BookingCalendarEvent>[];
    for (final slot in blockedSlots) {
      if (courtFilter.isNotEmpty &&
          courtFilter != 'ALL' &&
          slot.courtType != courtFilter) {
        continue;
      }
      if (labelFilter.isNotEmpty &&
          labelFilter != 'ALL' &&
          (slot.label ?? '').trim() != labelFilter) {
        continue;
      }

      final weekday = dayMap[slot.dayOfWeek];
      if (weekday == null) continue;

      for (var cursor = DateTime(start.year, start.month, start.day);
          !cursor.isAfter(end);
          cursor = cursor.add(const Duration(days: 1))) {
        if (cursor.weekday != weekday) continue;
        if (!_isBlockedSlotActiveOnDate(slot, cursor)) continue;

        final parts = slot.time.split(':');
        final hour = int.tryParse(parts.first) ?? 0;
        final minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
        final eventStart =
            DateTime(cursor.year, cursor.month, cursor.day, hour, minute);
        final eventEnd = eventStart.add(const Duration(hours: 1));

        events.add(
          BookingCalendarEvent(
            id: 'block-${slot.id}-${eventStart.toUtc().toIso8601String()}',
            type: 'RECURRING_BLOCK',
            bookingId: null,
            blockId: slot.id,
            title: slot.label ?? 'Recurring block',
            court: slot.courtType,
            startTime: eventStart.toUtc().toIso8601String(),
            endTime: eventEnd.toUtc().toIso8601String(),
            status: slot.isBlocked ? 'BLOCKED' : 'FREE',
            paymentStatus: null,
          ),
        );
      }
    }
    return events;
  }
}

bool _isVisibleBookingInboxEntry(Map<String, dynamic> data) {
  if (readBool(data['dbImported'])) return false;
  final status = readString(data['status'], fallback: 'PENDING').toUpperCase();
  return !const {'SYNCED', 'CANCELLED', 'CONFLICT', 'ERROR'}.contains(status);
}

bool _isVisibleRegistrationInboxEntry(Map<String, dynamic> data) {
  if (readBool(data['dbImported'])) return false;
  final status = readString(data['status'], fallback: 'PENDING').toUpperCase();
  return !const {'SYNCED', 'CANCELLED', 'CONFLICT', 'ERROR'}.contains(status);
}

bool _isDeletedRegistrationEntry(Map<String, dynamic> data) {
  final status = readString(data['status']).toUpperCase();
  return readBool(data['deleted']) || status == 'DELETED';
}

class _BlockedSlotRecord {
  const _BlockedSlotRecord({
    required this.id,
    required this.dayOfWeek,
    required this.courtType,
    required this.time,
    required this.isBlocked,
    required this.label,
    required this.startDate,
    required this.endDate,
  });

  final String id;
  final String dayOfWeek;
  final String courtType;
  final String time;
  final bool isBlocked;
  final String? label;
  final String? startDate;
  final String? endDate;
}

class _BookingRowEnvelope {
  const _BookingRowEnvelope({
    required this.row,
    required this.start,
    required this.end,
    required this.updatedAt,
    required this.deleted,
  });

  final BookingOverviewRow row;
  final DateTime start;
  final DateTime end;
  final String updatedAt;
  final bool deleted;
}

DateTime? _parseLocalDate(String? value) {
  final text = (value ?? '').trim();
  if (text.isEmpty) return null;
  return DateTime.tryParse(text)?.toLocal();
}

String _weekdayLabel(DateTime date) {
  const names = {
    DateTime.monday: 'MONDAY',
    DateTime.tuesday: 'TUESDAY',
    DateTime.wednesday: 'WEDNESDAY',
    DateTime.thursday: 'THURSDAY',
    DateTime.friday: 'FRIDAY',
    DateTime.saturday: 'SATURDAY',
    DateTime.sunday: 'SUNDAY',
  };
  return names[date.weekday] ?? 'MONDAY';
}

bool _isBlockedSlotActiveOnDate(_BlockedSlotRecord slot, DateTime date) {
  final current = DateTime(date.year, date.month, date.day);
  final start = _parseLocalDate(slot.startDate);
  final end = _parseLocalDate(slot.endDate);
  if (start != null &&
      current.isBefore(DateTime(start.year, start.month, start.day))) {
    return false;
  }
  if (end != null &&
      current.isAfter(DateTime(end.year, end.month, end.day, 23, 59, 59))) {
    return false;
  }
  return true;
}

List<String> _expandHourSlots(DateTime start, DateTime end) {
  final slots = <String>[];
  for (var cursor = start;
      cursor.isBefore(end);
      cursor = cursor.add(const Duration(hours: 1))) {
    slots.add(
      '${cursor.hour.toString().padLeft(2, '0')}:${cursor.minute.toString().padLeft(2, '0')}',
    );
  }
  return slots;
}

String? _readIsoValue(dynamic value) {
  if (value == null) return null;
  if (value is Timestamp) {
    return value.toDate().toUtc().toIso8601String();
  }
  if (value is DateTime) {
    return value.toUtc().toIso8601String();
  }
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

String? _readNullableIso(dynamic value) {
  final iso = _readIsoValue(value);
  return iso == null || iso.isEmpty ? null : iso;
}

String _statusLabel(String status, String? notes) {
  final normalized = status.toUpperCase();
  final noteValue = (notes ?? '').toUpperCase();
  if (normalized == 'CANCELLED' && noteValue.contains('[NO_SHOW]')) {
    return 'NO_SHOW';
  }
  return normalized;
}
