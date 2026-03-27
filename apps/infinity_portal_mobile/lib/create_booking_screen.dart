import 'package:flutter/material.dart';

import 'models.dart';
import 'portal_repository.dart';
import 'theme.dart';
import 'widgets.dart';

class CreateBookingScreen extends StatefulWidget {
  const CreateBookingScreen({
    super.key,
    required this.repository,
  });

  final PortalRepository repository;

  @override
  State<CreateBookingScreen> createState() => _CreateBookingScreenState();
}

class _CreateBookingScreenState extends State<CreateBookingScreen> {
  static const _courts = [
    _CourtOption(
        id: 'basketball-ac',
        label: 'Basketball AC',
        courtType: 'Basketball AC'),
    _CourtOption(
        id: 'basketball-3x3',
        label: 'Basketball 3x3',
        courtType: 'Basketball 3x3'),
    _CourtOption(id: 'padel', label: 'Padel', courtType: 'Padel'),
    _CourtOption(
        id: 'volleyball', label: 'Volleyball', courtType: 'Volleyball'),
  ];

  static const _countryCodes = [
    ('+962', 'Jordan (+962)'),
    ('+966', 'Saudi Arabia (+966)'),
    ('+971', 'UAE (+971)'),
    ('+965', 'Kuwait (+965)'),
    ('+974', 'Qatar (+974)'),
    ('+973', 'Bahrain (+973)'),
    ('+20', 'Egypt (+20)'),
    ('+964', 'Iraq (+964)'),
    ('+961', 'Lebanon (+961)'),
    ('+1', 'USA/Canada (+1)'),
  ];

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneLocalController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();

  String _selectedCourtId = '';
  String _selectedDate = '';
  String _selectedTime = '';
  double _durationHours = 1;
  String _phoneCountry = '+962';
  Map<String, Map<String, List<String>>> _blocked = const {};
  Map<String, Map<String, List<String>>> _booked = const {};
  bool _availabilityLoading = false;
  bool _submitting = false;
  String? _message;
  bool _success = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneLocalController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  String get _today => localDateInput(DateTime.now());

  String get _fullPhone =>
      '$_phoneCountry${_phoneLocalController.text.replaceAll(RegExp(r'\D'), '')}';

  _CourtOption? get _selectedCourt {
    for (final court in _courts) {
      if (court.id == _selectedCourtId) return court;
    }
    return null;
  }

  Future<void> _loadAvailability() async {
    if (_selectedDate.isEmpty) return;
    setState(() {
      _availabilityLoading = true;
    });
    try {
      final blocked =
          await widget.repository.fetchBlockedSlots(date: _selectedDate);
      final booked = await widget.repository.fetchBookedSlots(
        startDate: _selectedDate,
        endDate: _selectedDate,
      );
      if (!mounted) return;
      setState(() {
        _blocked = blocked;
        _booked = booked;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _message = error.toString().replaceFirst('Exception: ', '');
        _success = false;
      });
    } finally {
      if (mounted) {
        setState(() {
          _availabilityLoading = false;
        });
      }
    }
  }

  List<String> get _timeSlots {
    final slots = <String>[];
    for (var hour = 7; hour <= 23; hour += 1) {
      slots.add('${hour.toString().padLeft(2, '0')}:00');
    }
    slots.add('00:00');
    return slots;
  }

  List<String> get _visibleTimeSlots {
    if (_selectedDate.isEmpty) return const [];
    final selected = DateTime.tryParse(_selectedDate)?.toLocal();
    if (selected == null) return const [];

    final weekday = selected.weekday;
    final weekdaySlots =
        weekday >= DateTime.monday && weekday <= DateTime.thursday;
    var slots = _timeSlots.where((slot) {
      final minutes = _toMinutes(slot);
      return !weekdaySlots || minutes >= 900 || slot == '00:00';
    }).toList(growable: false);

    if (_selectedDate == _today) {
      final now = DateTime.now();
      final currentMinutes = now.hour * 60 + now.minute;
      slots = slots
          .where((slot) => _toMinutes(slot) > currentMinutes)
          .toList(growable: false);
    }

    return slots.where((slot) {
      final range = _slotRange(slot, _durationHours);
      return range.every(slots.contains);
    }).toList(growable: false);
  }

  Future<void> _pickDate() async {
    final initial = DateTime.tryParse(_selectedDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (picked == null) return;
    setState(() {
      _selectedDate = localDateInput(picked);
      _selectedTime = '';
      _message = null;
    });
    await _loadAvailability();
  }

  Future<void> _submit() async {
    final validation = _validatePhone(_fullPhone);
    if (_selectedCourtId.isEmpty ||
        _selectedDate.isEmpty ||
        _selectedTime.isEmpty ||
        _nameController.text.trim().isEmpty) {
      setState(() {
        _message = 'Complete the court, date, time, and customer name first.';
        _success = false;
      });
      return;
    }
    if (validation != null) {
      setState(() {
        _message = validation;
        _success = false;
      });
      return;
    }
    if (_isSelectedRangeUnavailable) {
      setState(() {
        _message = 'That slot is no longer available. Pick another time.';
        _success = false;
      });
      return;
    }

    final selectedDate = DateTime.parse(_selectedDate);
    final parts = _selectedTime.split(':');
    final start = DateTime(
      selectedDate.year,
      selectedDate.month,
      selectedDate.day,
      int.parse(parts[0]),
      int.parse(parts[1]),
    );
    final end = start.add(Duration(minutes: (_durationHours * 60).round()));

    setState(() {
      _submitting = true;
      _message = null;
    });

    try {
      final court = _courts.firstWhere((item) => item.id == _selectedCourtId);
      await widget.repository.createBooking(
        courtName: court.courtType,
        startTime: start,
        endTime: end,
        customerName: _nameController.text.trim(),
        customerPhone: _fullPhone,
        customerEmail: _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _success = true;
        _message = 'Booking submitted successfully.';
        _selectedTime = '';
      });
      await _loadAvailability();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _success = false;
        _message = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  bool get _isSelectedRangeUnavailable {
    if (_selectedCourtId.isEmpty ||
        _selectedDate.isEmpty ||
        _selectedTime.isEmpty) {
      return false;
    }
    final court = _courts.firstWhere((item) => item.id == _selectedCourtId);
    return _slotRange(_selectedTime, _durationHours).any(
      (slot) =>
          _isBlocked(court.courtType, _selectedDate, slot) ||
          _isBooked(court.courtType, _selectedDate, slot),
    );
  }

  bool _isBlocked(String courtType, String date, String slot) {
    final dayKey = _weekdayLabel(DateTime.parse(date));
    return (_blocked[dayKey]?[courtType] ?? const <String>[]).contains(slot);
  }

  bool _isBooked(String courtType, String date, String slot) {
    return (_booked[date]?[courtType] ?? const <String>[]).contains(slot);
  }

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
              Text('New Booking',
                  style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 10),
              Text(
                'Use the same court availability rules as the website, then create the booking directly in the portal with the mobile source tag.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppPalette.ink.withValues(alpha: 0.74),
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Court', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final court in _courts)
                    ChoiceChip(
                      label: Text(court.label),
                      selected: _selectedCourtId == court.id,
                      onSelected: (_) {
                        setState(() {
                          _selectedCourtId = court.id;
                          _selectedTime = '';
                        });
                      },
                    ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickDate,
                      icon: const Icon(Icons.calendar_today_rounded),
                      label: Text(
                          _selectedDate.isEmpty ? 'Pick date' : _selectedDate),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<double>(
                      initialValue: _durationHours,
                      decoration: const InputDecoration(labelText: 'Duration'),
                      items: const [
                        DropdownMenuItem(value: 1, child: Text('1 hour')),
                        DropdownMenuItem(value: 1.5, child: Text('1.5 hours')),
                        DropdownMenuItem(value: 2, child: Text('2 hours')),
                      ],
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() {
                          _durationHours = value;
                          _selectedTime = '';
                        });
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                _selectedDate.isEmpty
                    ? 'Choose a date to see available times.'
                    : _availabilityLoading
                        ? 'Loading live availability...'
                        : 'Available times',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              if (_selectedDate.isNotEmpty)
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final slot in _visibleTimeSlots)
                      Builder(
                        builder: (context) {
                          final court = _selectedCourt;
                          final unavailable = court == null
                              ? true
                              : _slotRange(slot, _durationHours).any(
                                  (entry) =>
                                      _isBlocked(court.courtType, _selectedDate,
                                          entry) ||
                                      _isBooked(court.courtType, _selectedDate,
                                          entry),
                                );
                          return ChoiceChip(
                            label: Text(_slotLabel(slot)),
                            selected: _selectedTime == slot,
                            onSelected: unavailable
                                ? null
                                : (_) {
                                    setState(() {
                                      _selectedTime = slot;
                                    });
                                  },
                          );
                        },
                      ),
                  ],
                ),
              if (_selectedDate.isNotEmpty && _visibleTimeSlots.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    'No slots are available for this date and duration.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Customer', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 14),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full name'),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: DropdownButtonFormField<String>(
                      initialValue: _phoneCountry,
                      decoration: const InputDecoration(labelText: 'Code'),
                      items: _countryCodes
                          .map((item) => DropdownMenuItem(
                              value: item.$1, child: Text(item.$1)))
                          .toList(growable: false),
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() {
                          _phoneCountry = value;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 7,
                    child: TextField(
                      controller: _phoneLocalController,
                      keyboardType: TextInputType.phone,
                      decoration:
                          const InputDecoration(labelText: 'Phone number'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration:
                    const InputDecoration(labelText: 'Email (optional)'),
              ),
              const SizedBox(height: 18),
              GlassCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Booking snapshot',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 10),
                    DetailLine(
                        label: 'Court',
                        value: _selectedCourtId.isEmpty
                            ? 'Select a court'
                            : _courts
                                .firstWhere(
                                    (item) => item.id == _selectedCourtId)
                                .label),
                    DetailLine(
                        label: 'Date',
                        value: _selectedDate.isEmpty
                            ? 'Pick a date'
                            : _selectedDate),
                    DetailLine(
                        label: 'Time',
                        value: _selectedTime.isEmpty
                            ? 'Pick a slot'
                            : _slotLabel(_selectedTime)),
                    DetailLine(
                        label: 'Duration',
                        value:
                            '${_durationHours.toStringAsFixed(_durationHours == _durationHours.roundToDouble() ? 0 : 1)} hours'),
                  ],
                ),
              ),
              if (_message != null) ...[
                const SizedBox(height: 14),
                _InlineMessage(message: _message!, success: _success),
              ],
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? 'Submitting...' : 'Submit booking'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CourtOption {
  const _CourtOption({
    required this.id,
    required this.label,
    required this.courtType,
  });

  final String id;
  final String label;
  final String courtType;
}

class _InlineMessage extends StatelessWidget {
  const _InlineMessage({
    required this.message,
    required this.success,
  });

  final String message;
  final bool success;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: (success ? AppPalette.success : AppPalette.danger)
            .withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: success ? AppPalette.success : AppPalette.danger,
            ),
      ),
    );
  }
}

String? _validatePhone(String phone) {
  final normalized = phone.replaceAll(RegExp(r'[\s\-\(\)]'), '');
  if (!normalized.startsWith('+')) {
    return 'Phone number must start with +.';
  }
  final digitsOnly = normalized.replaceAll(RegExp(r'\D'), '');
  if (digitsOnly.length < 8) return 'Phone number is too short.';
  if (digitsOnly.length > 15) return 'Phone number is too long.';
  if (normalized.startsWith('+962')) {
    final jordanDigits = digitsOnly.substring(3);
    if (!jordanDigits.startsWith('7') || jordanDigits.length != 9) {
      return 'Jordan mobile numbers must look like +962 7XXXXXXXX.';
    }
  }
  return null;
}

int _toMinutes(String value) {
  final parts = value.split(':');
  return int.parse(parts[0]) * 60 + int.parse(parts[1]);
}

List<String> _slotRange(String startTime, double durationHours) {
  final slots = <String>[];
  final startMinutes = _toMinutes(startTime);
  final slotCount = durationHours.ceil();
  for (var index = 0; index < slotCount; index += 1) {
    var minutes = startMinutes + (index * 60);
    if (minutes >= 24 * 60) minutes -= 24 * 60;
    final hour = (minutes ~/ 60).toString().padLeft(2, '0');
    final minute = (minutes % 60).toString().padLeft(2, '0');
    slots.add('$hour:$minute');
  }
  return slots;
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

String _slotLabel(String slot) {
  final parts = slot.split(':');
  final hour = int.parse(parts[0]);
  final displayHour = hour % 12 == 0 ? 12 : hour % 12;
  final suffix = hour >= 12 ? 'PM' : 'AM';
  return '$displayHour:${parts[1]} $suffix';
}
