typedef JsonMap = Map<String, dynamic>;

JsonMap asJsonMap(dynamic value) {
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return <String, dynamic>{};
}

List<dynamic> asJsonList(dynamic value) {
  if (value is List) return value;
  return const [];
}

String readString(dynamic value, {String fallback = ''}) {
  if (value == null) return fallback;
  final text = value.toString().trim();
  return text.isEmpty ? fallback : text;
}

String? readNullableString(dynamic value) {
  final text = readString(value);
  return text.isEmpty ? null : text;
}

double readDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int readInt(dynamic value) {
  if (value is num) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

bool readBool(dynamic value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  final text = value?.toString().trim().toLowerCase();
  return text == 'true' || text == '1';
}

String localDateInput(DateTime date) {
  final local = date.toLocal();
  final year = local.year.toString().padLeft(4, '0');
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');
  return '$year-$month-$day';
}

class DateSpan {
  const DateSpan({
    required this.startDate,
    required this.endDate,
  });

  final String startDate;
  final String endDate;
}

DateSpan presetSpanForView(String view) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);

  if (view == 'day') {
    final date = localDateInput(today);
    return DateSpan(startDate: date, endDate: date);
  }

  if (view == 'month') {
    final first = DateTime(today.year, today.month);
    final last = DateTime(today.year, today.month + 1, 0);
    return DateSpan(
      startDate: localDateInput(first),
      endDate: localDateInput(last),
    );
  }

  final diffToMonday = (today.weekday + 6) % 7;
  final monday = today.subtract(Duration(days: diffToMonday));
  final sunday = monday.add(const Duration(days: 6));
  return DateSpan(
    startDate: localDateInput(monday),
    endDate: localDateInput(sunday),
  );
}

DateSpan presetSpanForRegistration(String preset) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);

  if (preset == 'all') {
    return const DateSpan(startDate: '', endDate: '');
  }

  int days = 0;
  switch (preset) {
    case '1week':
      days = 7;
      break;
    case '1month':
      days = 30;
      break;
    case '3months':
      days = 90;
      break;
    case '6months':
      days = 180;
      break;
    case '1year':
      days = 365;
      break;
    default:
      return const DateSpan(startDate: '', endDate: '');
  }

  final start = today.subtract(Duration(days: days));
  return DateSpan(
    startDate: localDateInput(start),
    endDate: localDateInput(today),
  );
}

class BookingFilters {
  const BookingFilters({
    required this.view,
    required this.startDate,
    required this.endDate,
    required this.court,
    required this.label,
    required this.bookingStatus,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.source,
    required this.search,
  });

  factory BookingFilters.initial() {
    final span = presetSpanForView('week');
    return BookingFilters(
      view: 'week',
      startDate: span.startDate,
      endDate: span.endDate,
      court: '',
      label: '',
      bookingStatus: 'ALL',
      paymentStatus: 'ALL',
      paymentMethod: 'ALL',
      source: 'ALL',
      search: '',
    );
  }

  final String view;
  final String startDate;
  final String endDate;
  final String court;
  final String label;
  final String bookingStatus;
  final String paymentStatus;
  final String paymentMethod;
  final String source;
  final String search;

  BookingFilters copyWith({
    String? view,
    String? startDate,
    String? endDate,
    String? court,
    String? label,
    String? bookingStatus,
    String? paymentStatus,
    String? paymentMethod,
    String? source,
    String? search,
  }) {
    return BookingFilters(
      view: view ?? this.view,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      court: court ?? this.court,
      label: label ?? this.label,
      bookingStatus: bookingStatus ?? this.bookingStatus,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      source: source ?? this.source,
      search: search ?? this.search,
    );
  }

  Map<String, String> toQueryParameters(String? companyId) {
    final params = <String, String>{};
    if (companyId != null && companyId.isNotEmpty) {
      params['companyId'] = companyId;
    }
    params['view'] = view;
    if (startDate.isNotEmpty) {
      params['startDate'] = startDate;
    }
    if (endDate.isNotEmpty) {
      params['endDate'] = endDate;
    }
    if (court.isNotEmpty) {
      params['court'] = court;
    }
    if (label.isNotEmpty) {
      params['label'] = label;
    }
    if (bookingStatus.isNotEmpty) {
      params['bookingStatus'] = bookingStatus;
    }
    if (paymentStatus.isNotEmpty) {
      params['paymentStatus'] = paymentStatus;
    }
    if (paymentMethod.isNotEmpty) {
      params['paymentMethod'] = paymentMethod;
    }
    if (source.isNotEmpty) {
      params['source'] = source;
    }
    if (search.isNotEmpty) {
      params['search'] = search;
    }
    return params;
  }

  int get activeFilterCount {
    var count = 0;
    if (view != 'week') count += 1;
    if (court.isNotEmpty) count += 1;
    if (label.isNotEmpty) count += 1;
    if (bookingStatus != 'ALL') count += 1;
    if (paymentStatus != 'ALL') count += 1;
    if (paymentMethod != 'ALL') count += 1;
    if (source != 'ALL') count += 1;
    if (search.isNotEmpty) count += 1;
    return count;
  }
}

class RegistrationFilters {
  const RegistrationFilters({
    required this.packageName,
    required this.datePreset,
    required this.customStartDate,
    required this.customEndDate,
    required this.search,
  });

  factory RegistrationFilters.initial() {
    return const RegistrationFilters(
      packageName: '',
      datePreset: 'all',
      customStartDate: '',
      customEndDate: '',
      search: '',
    );
  }

  final String packageName;
  final String datePreset;
  final String customStartDate;
  final String customEndDate;
  final String search;

  RegistrationFilters copyWith({
    String? packageName,
    String? datePreset,
    String? customStartDate,
    String? customEndDate,
    String? search,
  }) {
    return RegistrationFilters(
      packageName: packageName ?? this.packageName,
      datePreset: datePreset ?? this.datePreset,
      customStartDate: customStartDate ?? this.customStartDate,
      customEndDate: customEndDate ?? this.customEndDate,
      search: search ?? this.search,
    );
  }

  String? get resolvedStartDate {
    if (datePreset == 'custom') {
      return customStartDate.isEmpty ? null : customStartDate;
    }
    final span = presetSpanForRegistration(datePreset);
    return span.startDate.isEmpty ? null : span.startDate;
  }

  String? get resolvedEndDate {
    if (datePreset == 'custom') {
      return customEndDate.isEmpty ? null : customEndDate;
    }
    final span = presetSpanForRegistration(datePreset);
    return span.endDate.isEmpty ? null : span.endDate;
  }

  int get activeFilterCount {
    var count = 0;
    if (packageName.isNotEmpty) count += 1;
    if (datePreset != 'all') count += 1;
    if (search.isNotEmpty) count += 1;
    return count;
  }
}

class CompetitionFilters {
  const CompetitionFilters({
    required this.competitionType,
    required this.search,
  });

  factory CompetitionFilters.initial() {
    return const CompetitionFilters(
      competitionType: 'ALL',
      search: '',
    );
  }

  final String competitionType;
  final String search;

  CompetitionFilters copyWith({
    String? competitionType,
    String? search,
  }) {
    return CompetitionFilters(
      competitionType: competitionType ?? this.competitionType,
      search: search ?? this.search,
    );
  }

  Map<String, String> toQueryParameters() {
    final params = <String, String>{};
    if (competitionType.isNotEmpty && competitionType != 'ALL') {
      params['competitionType'] = competitionType;
    }
    if (search.isNotEmpty) params['search'] = search;
    return params;
  }

  int get activeFilterCount {
    var count = 0;
    if (competitionType != 'ALL') count += 1;
    if (search.isNotEmpty) count += 1;
    return count;
  }
}

class BookingKpis {
  const BookingKpis({
    required this.totalCollected,
    required this.totalPending,
    required this.totalRefunds,
    required this.totalRevenue,
    required this.bookingsCount,
    required this.totalHoursBooked,
    required this.utilizationPercent,
    required this.availableHours,
  });

  factory BookingKpis.fromJson(JsonMap json) {
    return BookingKpis(
      totalCollected: readDouble(json['totalCollected']),
      totalPending: readDouble(json['totalPending']),
      totalRefunds: readDouble(json['totalRefunds']),
      totalRevenue: readDouble(json['totalRevenue']),
      bookingsCount: readInt(json['bookingsCount']),
      totalHoursBooked: readDouble(json['totalHoursBooked']),
      utilizationPercent: readDouble(json['utilizationPercent']),
      availableHours: readDouble(json['availableHours']),
    );
  }

  final double totalCollected;
  final double totalPending;
  final double totalRefunds;
  final double totalRevenue;
  final int bookingsCount;
  final double totalHoursBooked;
  final double utilizationPercent;
  final double availableHours;
}

class BookingFinancials {
  const BookingFinancials({
    required this.totalHours,
    required this.totalAmount,
    required this.paidAmount,
    required this.refundAmount,
    required this.netPaid,
    required this.remainingAmount,
    required this.paymentStatus,
    required this.latestPaymentMethod,
  });

  factory BookingFinancials.fromJson(JsonMap json) {
    return BookingFinancials(
      totalHours: readDouble(json['totalHours']),
      totalAmount: readDouble(json['totalAmount']),
      paidAmount: readDouble(json['paidAmount']),
      refundAmount: readDouble(json['refundAmount']),
      netPaid: readDouble(json['netPaid']),
      remainingAmount: readDouble(json['remainingAmount']),
      paymentStatus: readString(json['paymentStatus'], fallback: 'UNPAID'),
      latestPaymentMethod: readNullableString(json['latestPaymentMethod']),
    );
  }

  final double totalHours;
  final double totalAmount;
  final double paidAmount;
  final double refundAmount;
  final double netPaid;
  final double remainingAmount;
  final String paymentStatus;
  final String? latestPaymentMethod;
}

class BookingOverviewRow {
  const BookingOverviewRow({
    required this.id,
    required this.companyId,
    required this.startTime,
    required this.endTime,
    required this.facilityArea,
    required this.status,
    required this.customerName,
    required this.customerPhone,
    required this.customerEmail,
    required this.notes,
    required this.source,
    required this.memberFirstName,
    required this.memberLastName,
    required this.financials,
  });

  factory BookingOverviewRow.fromJson(JsonMap json) {
    final member = asJsonMap(json['member']);
    return BookingOverviewRow(
      id: readString(json['id']),
      companyId: readString(json['companyId']),
      startTime: readString(json['startTime']),
      endTime: readString(json['endTime']),
      facilityArea: readNullableString(json['facilityArea']),
      status: readString(json['status'], fallback: 'PENDING'),
      customerName: readNullableString(json['customerName']),
      customerPhone: readNullableString(json['customerPhone']),
      customerEmail: readNullableString(json['customerEmail']),
      notes: readNullableString(json['notes']),
      source: readString(json['source'], fallback: 'ADMIN'),
      memberFirstName: readNullableString(member['firstName']),
      memberLastName: readNullableString(member['lastName']),
      financials: BookingFinancials.fromJson(asJsonMap(json['financials'])),
    );
  }

  final String id;
  final String companyId;
  final String startTime;
  final String endTime;
  final String? facilityArea;
  final String status;
  final String? customerName;
  final String? customerPhone;
  final String? customerEmail;
  final String? notes;
  final String source;
  final String? memberFirstName;
  final String? memberLastName;
  final BookingFinancials financials;

  String get displayName {
    if (customerName != null && customerName!.trim().isNotEmpty) {
      return customerName!;
    }
    final memberName =
        '${memberFirstName ?? ''} ${memberLastName ?? ''}'.trim();
    return memberName.isEmpty ? 'Unknown customer' : memberName;
  }
}

class BookingPaymentRow {
  const BookingPaymentRow({
    required this.id,
    required this.bookingId,
    required this.amount,
    required this.method,
    required this.status,
    required this.transactionRef,
    required this.createdByAdminId,
    required this.createdAt,
    required this.court,
    required this.customerName,
  });

  factory BookingPaymentRow.fromJson(JsonMap json) {
    return BookingPaymentRow(
      id: readString(json['id']),
      bookingId: readString(json['bookingId']),
      amount: readDouble(json['amount']),
      method: readString(json['method'], fallback: 'CASH'),
      status: readString(json['status'], fallback: 'PAID'),
      transactionRef: readNullableString(json['transactionRef']),
      createdByAdminId: readNullableString(json['createdByAdminId']),
      createdAt: readString(json['createdAt']),
      court: readNullableString(json['court']),
      customerName: readNullableString(json['customerName']),
    );
  }

  final String id;
  final String bookingId;
  final double amount;
  final String method;
  final String status;
  final String? transactionRef;
  final String? createdByAdminId;
  final String createdAt;
  final String? court;
  final String? customerName;
}

class BookingCalendarEvent {
  const BookingCalendarEvent({
    required this.id,
    required this.type,
    required this.bookingId,
    required this.blockId,
    required this.title,
    required this.court,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.paymentStatus,
  });

  factory BookingCalendarEvent.fromJson(JsonMap json) {
    return BookingCalendarEvent(
      id: readString(json['id']),
      type: readString(json['type'], fallback: 'BOOKING'),
      bookingId: readNullableString(json['bookingId']),
      blockId: readNullableString(json['blockId']),
      title: readString(json['title'], fallback: 'Event'),
      court: readNullableString(json['court']),
      startTime: readString(json['startTime']),
      endTime: readString(json['endTime']),
      status: readString(json['status'], fallback: 'ACTIVE'),
      paymentStatus: readNullableString(json['paymentStatus']),
    );
  }

  final String id;
  final String type;
  final String? bookingId;
  final String? blockId;
  final String title;
  final String? court;
  final String startTime;
  final String endTime;
  final String status;
  final String? paymentStatus;
}

class BookingCourtRate {
  const BookingCourtRate({
    required this.name,
    required this.hourlyRate,
    required this.rewardPointsPerHour,
  });

  factory BookingCourtRate.fromJson(JsonMap json) {
    return BookingCourtRate(
      name: readString(json['name']),
      hourlyRate: readDouble(json['hourlyRate']),
      rewardPointsPerHour: readDouble(json['rewardPointsPerHour']),
    );
  }

  final String name;
  final double hourlyRate;
  final double rewardPointsPerHour;
}

class BookingPaymentMethodTotals {
  const BookingPaymentMethodTotals({
    required this.paid,
    required this.refunded,
    required this.net,
  });

  factory BookingPaymentMethodTotals.fromJson(JsonMap json) {
    return BookingPaymentMethodTotals(
      paid: readDouble(json['paid']),
      refunded: readDouble(json['refunded']),
      net: readDouble(json['net']),
    );
  }

  final double paid;
  final double refunded;
  final double net;
}

class BookingOverviewResponse {
  const BookingOverviewResponse({
    required this.rangeStart,
    required this.rangeEnd,
    required this.kpis,
    required this.bookings,
    required this.calendarEvents,
    required this.paymentReportRows,
    required this.paymentByMethod,
    required this.courts,
    required this.labels,
  });

  factory BookingOverviewResponse.fromJson(JsonMap json) {
    final paymentReport = asJsonMap(json['paymentReport']);
    final methodMap = asJsonMap(paymentReport['byMethod']);
    return BookingOverviewResponse(
      rangeStart: readString(asJsonMap(json['range'])['start']),
      rangeEnd: readString(asJsonMap(json['range'])['end']),
      kpis: BookingKpis.fromJson(asJsonMap(json['kpis'])),
      bookings: asJsonList(json['bookings'])
          .map((item) => BookingOverviewRow.fromJson(asJsonMap(item)))
          .toList(growable: false),
      calendarEvents: asJsonList(json['calendarEvents'])
          .map((item) => BookingCalendarEvent.fromJson(asJsonMap(item)))
          .toList(growable: false),
      paymentReportRows: asJsonList(paymentReport['rows'])
          .map((item) => BookingPaymentRow.fromJson(asJsonMap(item)))
          .toList(growable: false),
      paymentByMethod: methodMap.map(
        (key, value) => MapEntry(
            key, BookingPaymentMethodTotals.fromJson(asJsonMap(value))),
      ),
      courts: asJsonList(json['courts'])
          .map((item) => BookingCourtRate.fromJson(asJsonMap(item)))
          .toList(growable: false),
      labels: asJsonList(json['labels'])
          .map((item) => readString(item))
          .where((item) => item.isNotEmpty)
          .toList(growable: false),
    );
  }

  final String rangeStart;
  final String rangeEnd;
  final BookingKpis kpis;
  final List<BookingOverviewRow> bookings;
  final List<BookingCalendarEvent> calendarEvents;
  final List<BookingPaymentRow> paymentReportRows;
  final Map<String, BookingPaymentMethodTotals> paymentByMethod;
  final List<BookingCourtRate> courts;
  final List<String> labels;
}

class PackageOption {
  const PackageOption({
    required this.id,
    required this.sportType,
    required this.name,
    required this.description,
    required this.durationMonths,
    required this.sessionsCount,
    required this.trackingType,
    required this.pricingType,
    required this.currentPriceJod,
    required this.isActive,
    required this.showOnWebsite,
    required this.sortOrder,
  });

  factory PackageOption.fromJson(JsonMap json) {
    return PackageOption(
      id: readString(json['id']),
      sportType: readString(json['sportType']),
      name: readString(json['name']),
      description: readNullableString(json['description']),
      durationMonths:
          json['durationMonths'] == null ? 1 : readInt(json['durationMonths']),
      sessionsCount: readInt(json['sessionsCount']),
      trackingType: readString(json['trackingType']),
      pricingType: readString(json['pricingType']),
      currentPriceJod: json['currentPriceJod'] == null
          ? null
          : readDouble(json['currentPriceJod']),
      isActive: readBool(json['isActive']),
      showOnWebsite: json['showOnWebsite'] == null
          ? true
          : readBool(json['showOnWebsite']),
      sortOrder: readInt(json['sortOrder']),
    );
  }

  final String id;
  final String sportType;
  final String name;
  final String? description;
  final int durationMonths;
  final int sessionsCount;
  final String trackingType;
  final String pricingType;
  final double? currentPriceJod;
  final bool isActive;
  final bool showOnWebsite;
  final int sortOrder;
}

class RegistrationPackageTotals {
  const RegistrationPackageTotals({
    required this.registered,
    required this.expected,
    required this.collected,
    required this.remaining,
  });

  factory RegistrationPackageTotals.fromJson(JsonMap json) {
    return RegistrationPackageTotals(
      registered: readInt(json['registered']),
      expected: readDouble(json['expected']),
      collected: readDouble(json['collected']),
      remaining: readDouble(json['remaining']),
    );
  }

  final int registered;
  final double expected;
  final double collected;
  final double remaining;
}

class RegistrationTotals {
  const RegistrationTotals({
    required this.totalRegistered,
    required this.paidCount,
    required this.partialCount,
    required this.unpaidCount,
    required this.expectedTotal,
    required this.collectedTotal,
    required this.remainingTotal,
    required this.discountsTotal,
    required this.byMethod,
    required this.byPackage,
  });

  factory RegistrationTotals.fromJson(JsonMap json) {
    return RegistrationTotals(
      totalRegistered: readInt(json['totalRegistered']),
      paidCount: readInt(json['paidCount']),
      partialCount: readInt(json['partialCount']),
      unpaidCount: readInt(json['unpaidCount']),
      expectedTotal: readDouble(json['expectedTotal']),
      collectedTotal: readDouble(json['collectedTotal']),
      remainingTotal: readDouble(json['remainingTotal']),
      discountsTotal: readDouble(json['discountsTotal']),
      byMethod: asJsonMap(json['byMethod'])
          .map((key, value) => MapEntry(key, readDouble(value))),
      byPackage: asJsonMap(json['byPackage']).map(
        (key, value) =>
            MapEntry(key, RegistrationPackageTotals.fromJson(asJsonMap(value))),
      ),
    );
  }

  final int totalRegistered;
  final int paidCount;
  final int partialCount;
  final int unpaidCount;
  final double expectedTotal;
  final double collectedTotal;
  final double remainingTotal;
  final double discountsTotal;
  final Map<String, double> byMethod;
  final Map<String, RegistrationPackageTotals> byPackage;
}

class PackageRegistrationRow {
  const PackageRegistrationRow({
    required this.id,
    required this.packageName,
    required this.customerName,
    required this.customerPhone,
    required this.customerEmail,
    required this.customerAge,
    required this.playerCode,
    required this.currentCycle,
    required this.sessionsLeft,
    required this.sessionsUsedOverride,
    required this.nextPaymentDate,
    required this.planLabel,
    required this.isPaid,
    required this.basePriceJod,
    required this.discountType,
    required this.discountValue,
    required this.discountReason,
    required this.finalPriceJod,
    required this.durationMonths,
    required this.periodStartsAt,
    required this.periodEndsAt,
    required this.isFrozen,
    required this.frozenAt,
    required this.sessionsBonus,
    required this.collected,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PackageRegistrationRow.fromJson(JsonMap json) {
    return PackageRegistrationRow(
      id: readString(json['id']),
      packageName: readString(json['packageName']),
      customerName: readString(json['customerName']),
      customerPhone: readString(json['customerPhone']),
      customerEmail: readNullableString(json['customerEmail']),
      customerAge:
          json['customerAge'] == null ? null : readInt(json['customerAge']),
      playerCode: readNullableString(json['playerCode']),
      currentCycle:
          json['currentCycle'] == null ? null : readInt(json['currentCycle']),
      sessionsLeft:
          json['sessionsLeft'] == null ? null : readInt(json['sessionsLeft']),
      sessionsUsedOverride: json['sessionsUsedOverride'] == null
          ? null
          : readInt(json['sessionsUsedOverride']),
      nextPaymentDate: readNullableString(json['nextPaymentDate']),
      planLabel: readNullableString(json['planLabel']),
      isPaid: readBool(json['isPaid']),
      basePriceJod: readDouble(json['basePriceJod']),
      discountType: readString(json['discountType'], fallback: 'NONE'),
      discountValue: json['discountValue'] == null
          ? null
          : readDouble(json['discountValue']),
      discountReason: readNullableString(json['discountReason']),
      finalPriceJod: readDouble(json['finalPriceJod']),
      durationMonths:
          json['durationMonths'] == null ? 1 : readInt(json['durationMonths']),
      periodStartsAt: readNullableString(json['periodStartsAt']),
      periodEndsAt: readNullableString(json['periodEndsAt']),
      isFrozen: readBool(json['isFrozen']),
      frozenAt: readNullableString(json['frozenAt']),
      sessionsBonus: readInt(json['sessionsBonus']),
      collected: json['collected'] == null ? 0 : readDouble(json['collected']),
      createdAt: readString(json['createdAt']),
      updatedAt: readString(json['updatedAt']),
    );
  }

  final String id;
  final String packageName;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final int? customerAge;
  final String? playerCode;
  final int? currentCycle;
  final int? sessionsLeft;
  final int? sessionsUsedOverride;
  final String? nextPaymentDate;
  final String? planLabel;
  final bool isPaid;
  final double basePriceJod;
  final String discountType;
  final double? discountValue;
  final String? discountReason;
  final double finalPriceJod;
  final int durationMonths;
  final String? periodStartsAt;
  final String? periodEndsAt;
  final bool isFrozen;
  final String? frozenAt;
  final int sessionsBonus;
  final double collected;
  final String createdAt;
  final String updatedAt;
}

class CompetitionRegistrationRow {
  const CompetitionRegistrationRow({
    required this.id,
    required this.competitionType,
    required this.participantName,
    required this.age,
    required this.gender,
    required this.customerPhone,
    required this.teamName,
    required this.playerOne,
    required this.playerTwo,
    required this.playerThree,
    required this.playerFour,
    required this.isPaid,
    required this.amountDue,
    required this.amountPaid,
    required this.paymentMethod,
    required this.paidAt,
    required this.source,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CompetitionRegistrationRow.fromJson(JsonMap json) {
    return CompetitionRegistrationRow(
      id: readString(json['id']),
      competitionType: readString(json['competitionType'], fallback: 'UNKNOWN')
          .toUpperCase(),
      participantName: readNullableString(json['participantName']),
      age: json['age'] == null ? null : readInt(json['age']),
      gender: readNullableString(json['gender']),
      customerPhone: readNullableString(json['customerPhone']),
      teamName: readNullableString(json['teamName']),
      playerOne: readNullableString(json['playerOne']),
      playerTwo: readNullableString(json['playerTwo']),
      playerThree: readNullableString(json['playerThree']),
      playerFour: readNullableString(json['playerFour']),
      isPaid: readBool(json['isPaid']),
      amountDue:
          json['amountDue'] == null ? null : readDouble(json['amountDue']),
      amountPaid:
          json['amountPaid'] == null ? null : readDouble(json['amountPaid']),
      paymentMethod: readNullableString(json['paymentMethod']),
      paidAt: readNullableString(json['paidAt']),
      source: readString(json['source'], fallback: 'WEBSITE'),
      status: readString(json['status'], fallback: 'NEW'),
      createdAt: readString(json['createdAt']),
      updatedAt: readString(json['updatedAt']),
    );
  }

  final String id;
  final String competitionType;
  final String? participantName;
  final int? age;
  final String? gender;
  final String? customerPhone;
  final String? teamName;
  final String? playerOne;
  final String? playerTwo;
  final String? playerThree;
  final String? playerFour;
  final bool isPaid;
  final double? amountDue;
  final double? amountPaid;
  final String? paymentMethod;
  final String? paidAt;
  final String source;
  final String status;
  final String createdAt;
  final String updatedAt;

  bool get isTeamCompetition =>
      competitionType == '3X3' ||
      competitionType == '3X3_MEN' ||
      competitionType == '3X3_WOMEN';

  String get displayName {
    if (teamName != null && teamName!.trim().isNotEmpty) return teamName!;
    if (participantName != null && participantName!.trim().isNotEmpty) {
      return participantName!;
    }
    return 'Unknown player';
  }

  List<String> get players => [
        playerOne,
        playerTwo,
        playerThree,
        playerFour,
      ]
          .whereType<String>()
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList(growable: false);
}
