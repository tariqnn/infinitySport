import 'package:flutter/material.dart';

import 'models.dart';
import 'portal_repository.dart';
import 'theme.dart';
import 'widgets.dart';

class CreateRegistrationScreen extends StatefulWidget {
  const CreateRegistrationScreen({
    super.key,
    required this.repository,
  });

  final PortalRepository repository;

  @override
  State<CreateRegistrationScreen> createState() =>
      _CreateRegistrationScreenState();
}

class _CreateRegistrationScreenState extends State<CreateRegistrationScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _ageController = TextEditingController();

  List<PackageOption> _packages = const [];
  PackageOption? _selectedPackage;
  DateTime? _startDate;
  bool _loadingPackages = true;
  bool _submitting = false;
  bool _success = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _loadPackages();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  Future<void> _loadPackages() async {
    setState(() {
      _loadingPackages = true;
    });
    try {
      final packages = await widget.repository.fetchPackages();
      if (!mounted) return;
      setState(() {
        _packages = packages;
        if (packages.isNotEmpty) {
          _selectedPackage = packages.first;
        }
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
          _loadingPackages = false;
        });
      }
    }
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      _startDate = picked;
    });
  }

  Future<void> _submit() async {
    if (_selectedPackage == null) {
      setState(() {
        _message = 'Select a package first.';
        _success = false;
      });
      return;
    }
    if (_nameController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty) {
      setState(() {
        _message = 'Name and phone are required.';
        _success = false;
      });
      return;
    }

    setState(() {
      _submitting = true;
      _message = null;
    });

    try {
      await widget.repository.createRegistration(
        package: _selectedPackage!,
        customerName: _nameController.text.trim(),
        customerPhone: _phoneController.text.trim(),
        customerEmail: _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
        customerAge: _ageController.text.trim().isEmpty
            ? null
            : int.tryParse(_ageController.text.trim()),
        periodStartsAt: _startDate,
      );
      if (!mounted) return;
      setState(() {
        _success = true;
        _message = 'Registration submitted successfully.';
      });
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

  @override
  Widget build(BuildContext context) {
    final bottomSpacing = MediaQuery.of(context).padding.bottom + 118;
    final selectedPrice = _selectedPackage == null
        ? null
        : registrationPriceSnapshot(_selectedPackage!);
    return ListView(
      padding: EdgeInsets.fromLTRB(20, 18, 20, bottomSpacing),
      children: [
        GlassCard(
          padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('New Registration',
                  style: Theme.of(context).textTheme.displaySmall),
              const SizedBox(height: 10),
              Text(
                'Create a package registration directly in the portal with the same package catalog and pricing snapshot used by staff.',
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
              Text('Package', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 14),
              if (_loadingPackages)
                const Center(child: CircularProgressIndicator.adaptive())
              else
                DropdownButtonFormField<PackageOption>(
                  initialValue: _selectedPackage,
                  decoration:
                      const InputDecoration(labelText: 'Select package'),
                  items: _packages
                      .map(
                        (item) => DropdownMenuItem(
                          value: item,
                          child: Text(item.name),
                        ),
                      )
                      .toList(growable: false),
                  onChanged: (value) {
                    setState(() {
                      _selectedPackage = value;
                    });
                  },
                ),
              if (_selectedPackage != null) ...[
                const SizedBox(height: 16),
                GlassCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_selectedPackage!.name,
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 6),
                      Text(
                        _selectedPackage!.description ??
                            'No package description available.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppPalette.ink.withValues(alpha: 0.72),
                            ),
                      ),
                      const SizedBox(height: 12),
                      DetailLine(
                        label: 'Sessions',
                        value: _selectedPackage!.sessionsCount > 0
                            ? '${_selectedPackage!.sessionsCount}'
                            : 'Not fixed',
                      ),
                      DetailLine(
                        label: 'Price snapshot',
                        value: selectedPrice == null
                            ? 'Manual pricing'
                            : 'JOD ${selectedPrice.toStringAsFixed(0)}',
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 18),
        GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Person', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 14),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Full name'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone number'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration:
                    const InputDecoration(labelText: 'Email (optional)'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _ageController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Age (optional)'),
              ),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: _pickStartDate,
                icon: const Icon(Icons.calendar_today_rounded),
                label: Text(
                  _startDate == null
                      ? 'Choose start date (optional)'
                      : localDateInput(_startDate!),
                ),
              ),
              if (_message != null) ...[
                const SizedBox(height: 14),
                _RegistrationMessage(message: _message!, success: _success),
              ],
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                child:
                    Text(_submitting ? 'Submitting...' : 'Submit registration'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RegistrationMessage extends StatelessWidget {
  const _RegistrationMessage({
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
