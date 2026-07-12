import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

abstract class PortalRepository {
  Future<String?> resolveCompanyId();

  Future<BookingOverviewResponse> fetchBookingsOverview(BookingFilters filters);

  Future<Map<String, Map<String, List<String>>>> fetchBlockedSlots(
      {String? date});

  Future<Map<String, Map<String, List<String>>>> fetchBookedSlots({
    required String startDate,
    required String endDate,
  });

  Future<void> createBooking({
    required String courtName,
    required DateTime startTime,
    required DateTime endTime,
    required String customerName,
    required String customerPhone,
    String? customerEmail,
  });

  Future<String> confirmBooking({
    required String bookingId,
  });

  Future<String> recordBookingPayment({
    required String bookingId,
    required double amount,
    required String method,
    bool confirmBooking = false,
  });

  Future<List<PackageOption>> fetchPackages();

  Future<List<PackageRegistrationRow>> fetchRegistrations(
      RegistrationFilters filters);

  Future<RegistrationTotals> fetchRegistrationTotals(
      RegistrationFilters filters);

  Future<Map<String, Set<String>>> fetchCanceledSessionsByPackage({
    String? packageName,
    String? startDate,
    String? endDate,
  });

  Future<List<CompetitionRegistrationRow>> fetchCompetitions(
      CompetitionFilters filters);

  Future<List<PackageRegistrationRow>> fetchSummerCampRegistrations({
    String search = '',
  });

  Future<List<GuestAccountRow>> fetchGuestAccounts({
    String search = '',
  });

  Future<List<CoachRow>> fetchCoaches();

  Future<void> createRegistration({
    required PackageOption package,
    required String customerName,
    required String customerPhone,
    String? customerEmail,
    int? customerAge,
    DateTime? periodStartsAt,
  });
}

class HttpPortalRepository implements PortalRepository {
  HttpPortalRepository({
    http.Client? client,
    String? baseUrl,
  })  : _client = client ?? http.Client(),
        _baseUrl = _normalizeBaseUrl(
          baseUrl ??
              const String.fromEnvironment(
                'API_BASE_URL',
                defaultValue: 'http://localhost:4000',
              ),
        );

  final http.Client _client;
  final String _baseUrl;
  String? _companyId;

  static String _normalizeBaseUrl(String input) {
    return input.endsWith('/') ? input.substring(0, input.length - 1) : input;
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, String>? queryParameters,
    Object? body,
  }) async {
    final uri = Uri.parse('$_baseUrl$path').replace(
      queryParameters: queryParameters == null || queryParameters.isEmpty
          ? null
          : queryParameters,
    );

    http.Response response;
    try {
      switch (method) {
        case 'POST':
          response = await _client
              .post(
                uri,
                headers: const {'Content-Type': 'application/json'},
                body: body == null ? null : jsonEncode(body),
              )
              .timeout(const Duration(seconds: 18));
          break;
        case 'PATCH':
          response = await _client
              .patch(
                uri,
                headers: const {'Content-Type': 'application/json'},
                body: body == null ? null : jsonEncode(body),
              )
              .timeout(const Duration(seconds: 18));
          break;
        case 'DELETE':
          response = await _client.delete(
            uri,
            headers: const {'Content-Type': 'application/json'},
          ).timeout(const Duration(seconds: 18));
          break;
        default:
          response = await _client.get(
            uri,
            headers: const {'Content-Type': 'application/json'},
          ).timeout(const Duration(seconds: 18));
      }
    } on TimeoutException {
      throw Exception('Request timed out. Check the API host and try again.');
    } catch (error) {
      throw Exception('Cannot connect to $uri. $error');
    }

    dynamic payload;
    if (response.body.isNotEmpty) {
      try {
        payload = jsonDecode(response.body);
      } catch (_) {
        payload = response.body;
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (payload is Map<String, dynamic>) {
        final message = readString(payload['message']);
        final error = readString(payload['error']);
        throw Exception(
          message.isNotEmpty
              ? message
              : error.isNotEmpty
                  ? error
                  : 'Request failed (${response.statusCode})',
        );
      }

      if (payload is String && payload.trim().isNotEmpty) {
        throw Exception(payload.trim());
      }

      throw Exception('Request failed (${response.statusCode})');
    }

    return payload;
  }

  @override
  Future<String?> resolveCompanyId() async {
    if (_companyId != null && _companyId!.isNotEmpty) {
      return _companyId;
    }

    final payload = await _request('GET', '/api/portal/companies');
    final companies = asJsonList(payload)
        .map((item) => asJsonMap(item))
        .where((item) => readString(item['id']).isNotEmpty)
        .toList(growable: false);

    if (companies.isNotEmpty) {
      _companyId = readString(companies.first['id']);
      return _companyId;
    }

    final created = await _request(
      'POST',
      '/api/portal/companies',
      body: {
        'name': 'Infinity Sporty',
        'contactName': 'Infinity Sporty',
        'contactEmail': 'infinitysportsacademyjo@gmail.com',
        'status': 'ACTIVE',
      },
    );

    _companyId = readString(asJsonMap(created)['id']);
    return _companyId;
  }

  @override
  Future<BookingOverviewResponse> fetchBookingsOverview(
      BookingFilters filters) async {
    final companyId = await resolveCompanyId();
    final payload = await _request(
      'GET',
      '/api/portal/bookings/overview',
      queryParameters: filters.toQueryParameters(companyId),
    );
    return BookingOverviewResponse.fromJson(asJsonMap(payload));
  }

  @override
  Future<Map<String, Map<String, List<String>>>> fetchBlockedSlots(
      {String? date}) async {
    final payload = await _request(
      'GET',
      '/api/booking/blocked-slots',
      queryParameters: date == null || date.isEmpty ? null : {'date': date},
    );
    final blocked = asJsonMap(asJsonMap(payload)['blocked']);
    return blocked.map(
      (day, courts) => MapEntry(
        day,
        asJsonMap(courts).map(
          (court, values) => MapEntry(
            court,
            asJsonList(values)
                .map((item) => readString(item))
                .where((item) => item.isNotEmpty)
                .toList(growable: false),
          ),
        ),
      ),
    );
  }

  @override
  Future<Map<String, Map<String, List<String>>>> fetchBookedSlots({
    required String startDate,
    required String endDate,
  }) async {
    final payload = await _request(
      'GET',
      '/api/booking/booked-slots',
      queryParameters: {
        'startDate': startDate,
        'endDate': endDate,
      },
    );
    final booked = asJsonMap(asJsonMap(payload)['booked']);
    return booked.map(
      (date, courts) => MapEntry(
        date,
        asJsonMap(courts).map(
          (court, values) => MapEntry(
            court,
            asJsonList(values)
                .map((item) => readString(item))
                .where((item) => item.isNotEmpty)
                .toList(growable: false),
          ),
        ),
      ),
    );
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
    final companyId = await resolveCompanyId();
    if (companyId == null || companyId.isEmpty) {
      throw Exception('Unable to resolve a company for booking.');
    }

    await _request(
      'POST',
      '/api/portal/bookings',
      body: {
        'company': {
          'connect': {'id': companyId}
        },
        'startTime': startTime.toUtc().toIso8601String(),
        'endTime': endTime.toUtc().toIso8601String(),
        'status': 'PENDING',
        'isPaid': false,
        'facilityArea': courtName,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'customerEmail': customerEmail,
        'notes': 'Booking from mobile app',
        'source': 'APP',
      },
    );
  }

  @override
  Future<String> confirmBooking({
    required String bookingId,
  }) async {
    await _request(
      'PATCH',
      '/api/portal/bookings/$bookingId',
      body: {
        'status': 'CONFIRMED',
      },
    );
    return 'Booking confirmed.';
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

    if (confirmBooking) {
      await _request(
        'PATCH',
        '/api/portal/bookings/$bookingId',
        body: {
          'status': 'CONFIRMED',
        },
      );
    }

    await _request(
      'POST',
      '/api/portal/bookings/$bookingId/payments',
      body: {
        'amount': normalizedAmount,
        'method': method,
        'status': 'PAID',
      },
    );

    return confirmBooking
        ? 'Payment recorded and booking confirmed.'
        : 'Payment recorded.';
  }

  @override
  Future<List<PackageOption>> fetchPackages() async {
    final payload = await _request('GET', '/api/portal/packages');
    return asJsonList(payload)
        .map((item) => PackageOption.fromJson(asJsonMap(item)))
        .toList(growable: false);
  }

  @override
  Future<List<PackageRegistrationRow>> fetchRegistrations(
      RegistrationFilters filters) async {
    final params = <String, String>{};
    if (filters.packageName.isNotEmpty) {
      params['packageName'] = filters.packageName;
    }
    if (filters.resolvedStartDate != null) {
      params['startDate'] = filters.resolvedStartDate!;
    }
    if (filters.resolvedEndDate != null) {
      params['endDate'] = filters.resolvedEndDate!;
    }
    if (filters.search.isNotEmpty) params['search'] = filters.search;

    final payload = await _request(
      'GET',
      '/api/portal/package-registrations',
      queryParameters: params,
    );

    return asJsonList(payload)
        .map((item) => PackageRegistrationRow.fromJson(asJsonMap(item)))
        .toList(growable: false);
  }

  @override
  Future<RegistrationTotals> fetchRegistrationTotals(
      RegistrationFilters filters) async {
    final params = <String, String>{};
    if (filters.packageName.isNotEmpty) {
      params['packageName'] = filters.packageName;
    }
    if (filters.resolvedStartDate != null) {
      params['startDate'] = filters.resolvedStartDate!;
    }
    if (filters.resolvedEndDate != null) {
      params['endDate'] = filters.resolvedEndDate!;
    }

    final payload = await _request(
      'GET',
      '/api/portal/package-registrations/totals',
      queryParameters: params,
    );

    return RegistrationTotals.fromJson(asJsonMap(payload));
  }

  @override
  Future<Map<String, Set<String>>> fetchCanceledSessionsByPackage({
    String? packageName,
    String? startDate,
    String? endDate,
  }) async {
    final payload = await _request(
      'GET',
      '/api/portal/package-session-canceled',
      queryParameters: {
        if (packageName != null && packageName.isNotEmpty)
          'packageName': packageName,
        if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
        if (endDate != null && endDate.isNotEmpty) 'endDate': endDate,
      },
    );

    final grouped = <String, Set<String>>{};
    for (final item in asJsonList(payload)) {
      final row = asJsonMap(item);
      final pkg = readString(row['packageName']);
      final rawDate = readString(row['sessionDate']);
      if (pkg.isEmpty || rawDate.isEmpty) continue;
      final parsed = DateTime.tryParse(rawDate);
      final key = parsed == null
          ? rawDate.substring(0, rawDate.length.clamp(0, 10))
          : localDateInput(parsed);
      grouped.putIfAbsent(pkg, () => <String>{}).add(key);
    }
    return grouped;
  }

  @override
  Future<List<CompetitionRegistrationRow>> fetchCompetitions(
      CompetitionFilters filters) async {
    final payload = await _request(
      'GET',
      '/api/portal/competition-registrations',
      queryParameters: filters.toQueryParameters(),
    );
    final rows = asJsonList(payload)
        .map((item) => CompetitionRegistrationRow.fromJson(asJsonMap(item)))
        .toList(growable: false);
    final search = filters.search.trim().toLowerCase();
    if (search.isEmpty) return rows;
    return rows.where((row) {
      final haystack = [
        row.id,
        row.competitionType,
        row.displayName,
        row.customerPhone ?? '',
        row.gender ?? '',
        ...row.players,
      ].join(' ').toLowerCase();
      return haystack.contains(search);
    }).toList(growable: false);
  }

  @override
  Future<List<PackageRegistrationRow>> fetchSummerCampRegistrations({
    String search = '',
  }) async {
    final rows = await fetchRegistrations(RegistrationFilters.initial());
    final term = search.trim().toLowerCase();
    return rows.where((row) {
      if (!isSummerCampPackageName(row.packageName)) return false;
      if (term.isEmpty) return true;
      final haystack = [
        row.id,
        row.packageName,
        row.customerName,
        row.customerPhone,
        row.customerEmail ?? '',
        row.playerCode ?? '',
        row.planLabel ?? '',
      ].join(' ').toLowerCase();
      return haystack.contains(term);
    }).toList(growable: false);
  }

  @override
  Future<List<GuestAccountRow>> fetchGuestAccounts({
    String search = '',
  }) async {
    final payload = await _request(
      'GET',
      '/api/portal/guest-accounts',
      queryParameters: search.trim().isEmpty ? null : {'search': search.trim()},
    );
    return asJsonList(payload)
        .map((item) => GuestAccountRow.fromJson(asJsonMap(item)))
        .where((item) => item.email.isNotEmpty || item.displayName.isNotEmpty)
        .toList(growable: false);
  }

  @override
  Future<List<CoachRow>> fetchCoaches() async {
    dynamic payload;
    try {
      payload = await _request('GET', '/api/portal/landing-coaches');
    } catch (_) {
      final companyId = await resolveCompanyId();
      payload = await _request(
        'GET',
        '/api/portal/coaches',
        queryParameters: companyId == null || companyId.isEmpty
            ? null
            : {'companyId': companyId},
      );
    }
    return asJsonList(payload)
        .map((item) => CoachRow.fromJson(asJsonMap(item)))
        .where((item) => item.name.trim().isNotEmpty)
        .toList(growable: false)
      ..sort((a, b) {
        final order = a.order.compareTo(b.order);
        return order != 0 ? order : a.name.compareTo(b.name);
      });
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
    final priceSnapshot = registrationPriceSnapshot(package);
    await _request(
      'POST',
      '/api/portal/package-registrations',
      body: {
        'packageName': package.name,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'customerEmail': customerEmail,
        'customerAge': customerAge,
        'sessionsLeft':
            package.sessionsCount > 0 ? package.sessionsCount : null,
        'planLabel': package.name,
        'basePriceJod': priceSnapshot,
        'periodStartsAt': periodStartsAt?.toUtc().toIso8601String(),
      },
    );
  }
}
