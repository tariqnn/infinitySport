'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const PACKAGE_OPTIONS = [
  'Basketball - Little Kobes U10',
  'Basketball - Ballers & Hoopers U12–U14',
  'Basketball - Warriors',
  'Basketball - Private 1v1 Sessions',
  'Basketball - Small Groups',
  'Gymnastics Package A',
  'Gymnastics Package B',
  'Gymnastics Package C',
  'Gymnastics Package D',
  'Volleyball',
];

function safeDecode(s: string | null): string {
  if (!s) return '';
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function PackageRegisterForm() {
  const searchParams = useSearchParams();
  const decodedPackage = safeDecode(searchParams.get('package'));

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [packageName, setPackageName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const options = useMemo(() => {
    const list = [...PACKAGE_OPTIONS];
    if (decodedPackage && !list.includes(decodedPackage)) list.unshift(decodedPackage);
    return list;
  }, [decodedPackage]);

  const defaultPackage = decodedPackage || PACKAGE_OPTIONS[0] || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('submitting');
    try {
      const res = await fetch('/api/package-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: packageName || defaultPackage,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Submission failed. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('success');
      setName('');
      setPhone('');
      setEmail('');
    } catch {
      setError('Unable to submit. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-card border border-brand-lightBlue/20 bg-white p-8 shadow-card max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Registration submitted</h2>
        <p className="text-gray-600 mb-6">
          Thank you. We will contact you shortly to confirm your registration.
        </p>
        <button
          type="button"
          onClick={() => { setStatus('idle'); setError(''); }}
          className="rounded-lg bg-brand-green-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-dark"
        >
          Register another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-brand-lightBlue/20 bg-white p-8 shadow-card max-w-md mx-auto space-y-5"
    >
      <h2 className="text-xl font-bold text-brand-black">Register for a package</h2>
      <p className="text-sm text-gray-600">Fill in your details. We will contact you to confirm.</p>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Package *</label>
        <select
          value={packageName || defaultPackage}
          onChange={(e) => setPackageName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
          required
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
          placeholder="Your full name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
          placeholder="+962 7 9000 2200"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
          placeholder="your@email.com"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-lg bg-brand-green-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-green-dark disabled:opacity-70"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
