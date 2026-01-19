'use client';

import { useState } from 'react';

const COURTS = [
  { id: 'basketball-1', name: 'Basketball Court 1', type: 'Basketball' },
  { id: 'basketball-2', name: 'Basketball Court 2', type: 'Basketball' },
  { id: 'padel-1', name: 'Padel Court 1', type: 'Padel' },
  { id: 'padel-2', name: 'Padel Court 2', type: 'Padel' },
  { id: 'turf-1', name: 'Turf Field 1', type: 'Turf' },
  { id: 'turf-2', name: 'Turf Field 2', type: 'Turf' },
];

// Generate time slots from 7:00 AM to 10:00 PM, every hour
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 7; hour <= 22; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    slots.push(time);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function BookingForm() {
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

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
    const currentHour = now.getHours();
    return TIME_SLOTS.filter(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      return slotHour > currentHour;
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
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit booking');
      }

      setSubmitStatus('success');
      setSubmitMessage('Booking submitted successfully! Check your email for confirmation.');
      
      // Reset form
      setSelectedCourt('');
      setSelectedDate('');
      setSelectedTime('');
      setName('');
      setPhone('');
    } catch (error) {
      console.error('Booking submission error', error);
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
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
            Select Court <span className="text-red-500">*</span>
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
            Select Date <span className="text-red-500">*</span>
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
              Select Time Slot <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
              {getAvailableTimeSlots().map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                    selectedTime === time
                      ? 'border-brand-blue-primary bg-brand-blue-primary text-white'
                      : 'border-gray-200 text-brand-black hover:border-brand-blue-primary/50 hover:bg-brand-blue-primary/5'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            {getAvailableTimeSlots().length === 0 && (
              <p className="mt-2 text-sm text-gray-500">No available time slots for today. Please select another date.</p>
            )}
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-brand-black mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
          />
        </div>

        {/* Phone Input */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-brand-black mb-2">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+962 7 9000 2200"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
          />
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
            disabled={isSubmitting || !selectedCourt || !selectedDate || !selectedTime || !name || !phone}
            className="rounded-full bg-gradient-button px-8 py-3 text-sm font-bold text-white shadow-button transition hover:shadow-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Book Court'}
          </button>
        </div>
      </form>
    </div>
  );
}





