'use client';

import { useState, useEffect } from 'react';
import { isValidPhoneNumber } from '../../lib/phoneValidation';
import { useLanguage } from '../_components/LanguageProvider';
import { tr } from '../../lib/translations';

type CourtType = 'Basketball AC' | 'Basketball 3x3' | 'Padel' | 'Volleyball';

// Generate time slots from 7:00 AM to 11:00 PM, every hour (+ 12:00 AM shown at the end)
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 7; hour <= 23; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  // Put 12:00 AM at the end (shown as evening continuation in the UI)
  slots.push('00:00');
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const dayKey = (dateStr: string) => {
  // dateStr is YYYY-MM-DD; treat as local date
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
};

const formatSlotLabel = (hhmm: string, lang: 'en' | 'ar') => {
  const [h] = hhmm.split(':').map((n) => Number(n));
  const hour = h ?? 0;
  const isPm = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${isPm ? tr(lang, 'booking_pm') : tr(lang, 'booking_am')}`;
};

// Fallback when API fails: these slots are blocked. Admin can override via Booking Availability.
// Includes basketball academy: Little Kobes (Sat/Mon/Wed 17:00, Fri 10:00), Ballers & Hoopers (18:00, Fri 11:00), Warriors (19:00, Fri 12:00).
const FALLBACK_BLOCKED: Record<string, Partial<Record<CourtType, string[]>>> = {
  MONDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'], Volleyball: ['19:00'] },
  WEDNESDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'] },
  FRIDAY: { 'Basketball AC': ['10:00', '11:00', '12:00', '22:00', '23:00', '00:00'] },
  SATURDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'], Volleyball: ['15:00', '16:00'] },
  SUNDAY: { Volleyball: ['15:00', '16:00'] },
};

const isBlockedSlot = (
  opts: { date: string; time: string; courtId: string; courts: Array<{ id: string; type: CourtType }> },
  blocked: Record<string, Partial<Record<CourtType, string[]>>>
) => {
  const court = opts.courts.find((c) => c.id === opts.courtId);
  if (!court) return false;
  const day = dayKey(opts.date);
  const times = blocked[day]?.[court.type] ?? [];
  return times.includes(opts.time);
};

// Booked slots: existing (non‑cancelled) bookings; keyed by YYYY‑MM‑DD
const isBookedSlot = (
  opts: { date: string; time: string; courtId: string; courts: Array<{ id: string; type: CourtType }> },
  booked: Record<string, Partial<Record<CourtType, string[]>>>
) => {
  const court = opts.courts.find((c) => c.id === opts.courtId);
  if (!court) return false;
  const times = booked[opts.date]?.[court.type] ?? [];
  return times.includes(opts.time);
};

export function BookingForm() {
  const { language } = useLanguage();
  const [blocked, setBlocked] = useState<Record<string, Partial<Record<CourtType, string[]>>>>(FALLBACK_BLOCKED);
  const [booked, setBooked] = useState<Record<string, Partial<Record<CourtType, string[]>>>>({});
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    fetch('/api/booking/blocked-slots')
      .then((r) => r.json())
      .then((d) => {
        if (d?.blocked && typeof d.blocked === 'object') setBlocked(d.blocked);
      })
      .catch(() => {});
  }, []);

  const fetchBooked = () => {
    const today = new Date().toISOString().split('T')[0];
    const max = new Date();
    max.setDate(max.getDate() + 30);
    const end = max.toISOString().split('T')[0];
    fetch(`/api/booking/booked-slots?startDate=${today}&endDate=${end}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.booked && typeof d.booked === 'object') setBooked(d.booked);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBooked();
  }, []);

  const COURTS: Array<{ id: string; name: string; type: CourtType }> = [
    { id: 'basketball-ac', name: tr(language, 'booking_court_basketball'), type: 'Basketball AC' },
    { id: 'basketball-3x3', name: tr(language, 'booking_court_basketball_3x3'), type: 'Basketball 3x3' },
    { id: 'padel', name: tr(language, 'booking_court_padel'), type: 'Padel' },
    { id: 'volleyball', name: tr(language, 'booking_court_volleyball'), type: 'Volleyball' },
  ];

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  // Get date 30 days from now
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Filter out past time slots for today
  const getAvailableTimeSlots = () => {
    if (selectedDate !== today) {
      return TIME_SLOTS;
    }
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return TIME_SLOTS.filter(slot => {
      // Allow selecting the next slot if we're already past it
      return toMinutes(slot) > currentMinutes;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    if (!selectedCourt || !selectedDate || !selectedTime || !name || !phone) {
      setSubmitStatus('error');
      setSubmitMessage('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    // Validate phone number
    const phoneValidation = isValidPhoneNumber(phone);
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.error || 'Invalid phone number');
      setSubmitStatus('error');
      setSubmitMessage(phoneValidation.error || 'Please enter a valid phone number.');
      setIsSubmitting(false);
      return;
    }
    setPhoneError('');

    if (isBlockedSlot({ date: selectedDate, time: selectedTime, courtId: selectedCourt, courts: COURTS }, blocked)) {
      setSubmitStatus('error');
      setSubmitMessage(tr(language, 'booking_slot_full'));
      setIsSubmitting(false);
      return;
    }
    if (isBookedSlot({ date: selectedDate, time: selectedTime, courtId: selectedCourt, courts: COURTS }, booked)) {
      setSubmitStatus('error');
      setSubmitMessage(tr(language, 'booking_slot_full'));
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: selectedCourt,
          courtName: COURTS.find(c => c.id === selectedCourt)?.name || selectedCourt,
          date: selectedDate,
          time: selectedTime,
          name,
          email: email || undefined,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit booking');
      }

      setSubmitStatus('success');
      setSubmitMessage(
        email
          ? tr(language, 'booking_success_email')
          : tr(language, 'booking_success_no_email')
      );
      fetchBooked();
      // Reset form
      setSelectedCourt('');
      setSelectedDate('');
      setSelectedTime('');
      setName('');
      setEmail('');
      setPhone('');
    } catch (error) {
      console.error('Booking submission error', error);
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : tr(language, 'booking_error_generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-lightBlue/20 bg-white p-8 shadow-card">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Court Selection */}
        <div>
          <label htmlFor="court" className="block text-sm font-semibold text-brand-black mb-3">
            {tr(language, 'booking_select_court')} <span className="text-red-500">*</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {COURTS.map((court) => (
              <button
                key={court.id}
                type="button"
                onClick={() => setSelectedCourt(court.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedCourt === court.id
                    ? 'border-brand-blue-primary bg-brand-blue-primary/5 shadow-md'
                    : 'border-gray-200 hover:border-brand-blue-primary/50 hover:bg-gray-50'
                }`}
              >
                <div className="font-bold text-brand-black">{court.name}</div>
                <div className="mt-1 text-sm text-gray-600">{court.type}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-brand-black mb-2">
            {tr(language, 'booking_select_date')} <span className="text-red-500">*</span>
          </label>
          <input
            id="date"
            type="date"
            min={today}
            max={maxDateStr}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedTime(''); // Reset time when date changes
            }}
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
          />
        </div>

        {/* Time Slot Selection */}
        {selectedDate && (
          <div>
            <label htmlFor="time" className="block text-sm font-semibold text-brand-black mb-2">
              {tr(language, 'booking_select_time')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
              {getAvailableTimeSlots().map((time) => {
                const blockedSlot = selectedCourt
                  ? isBlockedSlot({ date: selectedDate, time, courtId: selectedCourt, courts: COURTS }, blocked)
                  : false;
                const bookedSlot = selectedCourt
                  ? isBookedSlot({ date: selectedDate, time, courtId: selectedCourt, courts: COURTS }, booked)
                  : false;
                const full = blockedSlot || bookedSlot;

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      if (full) return;
                      setSelectedTime(time);
                    }}
                    disabled={full || !selectedCourt}
                    title={!selectedCourt ? tr(language, 'booking_select_court_first') : full ? tr(language, 'booking_always_full_tooltip') : ''}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                      !selectedCourt
                        ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                        : full
                          ? 'border-red-300 bg-red-50 text-red-700 cursor-not-allowed'
                          : selectedTime === time
                            ? 'border-brand-blue-primary bg-brand-blue-primary text-white'
                            : 'border-gray-200 text-brand-black hover:border-brand-blue-primary/50 hover:bg-brand-blue-primary/5'
                    }`}
                  >
                    {formatSlotLabel(time, language)}
                  </button>
                );
              })}
            </div>
            {getAvailableTimeSlots().length === 0 && (
              <p className="mt-2 text-sm text-gray-500">{tr(language, 'booking_no_slots_today')}</p>
            )}
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-brand-black mb-2">
            {tr(language, 'booking_full_name')} <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr(language, 'booking_placeholder_name')}
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
          />
        </div>

        {/* Email Input (Optional but recommended for confirmation) */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-brand-black mb-2">
            {tr(language, 'booking_email')} <span className="text-gray-400">{tr(language, 'booking_optional')}</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={tr(language, 'booking_placeholder_email')}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
          />
        </div>

        {/* Phone Input */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-brand-black mb-2">
            {tr(language, 'booking_phone')} <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              const value = e.target.value;
              setPhone(value);
              // Clear error when user starts typing
              if (phoneError) {
                setPhoneError('');
              }
              // Validate on blur or when user stops typing
              if (value.trim()) {
                const validation = isValidPhoneNumber(value);
                if (!validation.valid) {
                  setPhoneError(validation.error || tr(language, 'booking_invalid_phone'));
                } else {
                  setPhoneError('');
                }
              }
            }}
            onBlur={(e) => {
              const value = e.target.value;
              if (value.trim()) {
                const validation = isValidPhoneNumber(value);
                if (!validation.valid) {
                  setPhoneError(validation.error || tr(language, 'booking_invalid_phone'));
                } else {
                  setPhoneError('');
                }
              }
            }}
            placeholder={tr(language, 'booking_placeholder_phone')}
            required
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
              phoneError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 focus:border-brand-blue-primary focus:ring-brand-blue-primary/20'
            }`}
          />
          {phoneError && (
            <p className="mt-1.5 text-sm text-red-600">{phoneError}</p>
          )}
        </div>

        {/* Status Message */}
        {submitStatus !== 'idle' && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              submitStatus === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {submitMessage}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !selectedCourt ||
              !selectedDate ||
              !selectedTime ||
              !name ||
              !phone ||
              !!phoneError ||
              isBlockedSlot({ date: selectedDate, time: selectedTime, courtId: selectedCourt, courts: COURTS }, blocked) ||
              isBookedSlot({ date: selectedDate, time: selectedTime, courtId: selectedCourt, courts: COURTS }, booked)
            }
            className="rounded-full bg-[#003DA5] px-8 py-3 text-sm font-bold text-white shadow-button transition hover:shadow-button-hover hover:bg-[#003DA5]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? tr(language, 'booking_submitting') : tr(language, 'booking_submit')}
          </button>
        </div>
      </form>
    </div>
  );
}





