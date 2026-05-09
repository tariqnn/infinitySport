import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:infinity_portal_mobile/app.dart';
import 'package:infinity_portal_mobile/models.dart';
import 'package:infinity_portal_mobile/portal_repository.dart';

void main() {
  testWidgets('shows primary navigation destinations',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      InfinityPortalApp(repository: _FakePortalRepository()),
    );

    await tester.pump();

    final navigationBar = find.byType(NavigationBar);

    expect(
      find.descendant(of: navigationBar, matching: find.text('Bookings')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: navigationBar, matching: find.text('Registrations')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: navigationBar, matching: find.text('Competitions')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: navigationBar, matching: find.text('New Booking')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: navigationBar, matching: find.text('Enroll')),
      findsOneWidget,
    );
  });
}

class _FakePortalRepository implements PortalRepository {
  @override
  Future<void> createBooking({
    required String courtName,
    required DateTime startTime,
    required DateTime endTime,
    required String customerName,
    required String customerPhone,
    String? customerEmail,
  }) async {}

  @override
  Future<void> createRegistration({
    required PackageOption package,
    required String customerName,
    required String customerPhone,
    String? customerEmail,
    int? customerAge,
    DateTime? periodStartsAt,
  }) async {}

  @override
  Future<String> confirmBooking({
    required String bookingId,
  }) async {
    return 'Booking confirmed.';
  }

  @override
  Future<Map<String, Map<String, List<String>>>> fetchBlockedSlots(
      {String? date}) async {
    return const {};
  }

  @override
  Future<Map<String, Map<String, List<String>>>> fetchBookedSlots({
    required String startDate,
    required String endDate,
  }) async {
    return const {};
  }

  @override
  Future<BookingOverviewResponse> fetchBookingsOverview(
      BookingFilters filters) async {
    return BookingOverviewResponse(
      rangeStart: filters.startDate,
      rangeEnd: filters.endDate,
      kpis: const BookingKpis(
        totalCollected: 0,
        totalPending: 0,
        totalRefunds: 0,
        totalRevenue: 0,
        bookingsCount: 0,
        totalHoursBooked: 0,
        utilizationPercent: 0,
        availableHours: 0,
      ),
      bookings: const [],
      calendarEvents: const [],
      paymentReportRows: const [],
      paymentByMethod: const {},
      courts: const [],
      labels: const [],
    );
  }

  @override
  Future<Map<String, Set<String>>> fetchCanceledSessionsByPackage({
    String? packageName,
    String? startDate,
    String? endDate,
  }) async {
    return const {};
  }

  @override
  Future<String> recordBookingPayment({
    required String bookingId,
    required double amount,
    required String method,
    bool confirmBooking = false,
  }) async {
    return confirmBooking
        ? 'Payment recorded and booking confirmed.'
        : 'Payment recorded.';
  }

  @override
  Future<List<PackageOption>> fetchPackages() async {
    return [
      const PackageOption(
        id: 'pkg-1',
        sportType: 'Basketball',
        name: 'Basketball - Little Kobes U12-U10',
        description: 'Foundation sessions',
        durationMonths: 1,
        sessionsCount: 12,
        trackingType: 'SESSIONS',
        pricingType: 'FIXED',
        currentPriceJod: 90,
        isActive: true,
        showOnWebsite: true,
        sortOrder: 0,
      ),
    ];
  }

  @override
  Future<List<PackageRegistrationRow>> fetchRegistrations(
      RegistrationFilters filters) async {
    return const [];
  }

  @override
  Future<List<CompetitionRegistrationRow>> fetchCompetitions(
      CompetitionFilters filters) async {
    return const [];
  }

  @override
  Future<RegistrationTotals> fetchRegistrationTotals(
      RegistrationFilters filters) async {
    return const RegistrationTotals(
      totalRegistered: 0,
      paidCount: 0,
      partialCount: 0,
      unpaidCount: 0,
      expectedTotal: 0,
      collectedTotal: 0,
      remainingTotal: 0,
      discountsTotal: 0,
      byMethod: {},
      byPackage: {},
    );
  }

  @override
  Future<String?> resolveCompanyId() async => 'company-1';
}
