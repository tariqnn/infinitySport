'use client';

import { useState } from 'react';

export function ContactFormWrapper() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
      message: String(formData.get('message') ?? '')
    };

    try {
      // TODO: Add actual API call here when backend is ready
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.info('Contact submission (mock)', payload);
      setSubmitStatus('success');
      setSubmitMessage('Thank you! We\'ll get back to you within one business day.');
      event.currentTarget.reset();
    } catch (error) {
      console.error('Contact submission error', error);
      setSubmitStatus('error');
      setSubmitMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-brand-black mb-2">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-brand-black mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@club.com"
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
          />
        </div>
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-brand-black mb-2">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+962"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-brand-black mb-2">
          How can we help? <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          placeholder="Tell us about your goals…"
          rows={5}
          required
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-400 focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20 transition resize-none"
        />
      </div>
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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-gradient-button px-8 py-3 text-sm font-bold text-white shadow-button transition hover:shadow-button-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
