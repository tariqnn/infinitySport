'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getClientApiBase } from '../../../lib/clientApi';
import { fetchPackages } from '../../../lib/apiClient';

const PHONE_COUNTRIES: Array<{ value: string; label: string }> = [
  { value: '+962', label: 'Jordan (+962)' },
  { value: '+966', label: 'Saudi Arabia (+966)' },
  { value: '+971', label: 'UAE (+971)' },
  { value: '+965', label: 'Kuwait (+965)' },
  { value: '+974', label: 'Qatar (+974)' },
  { value: '+973', label: 'Bahrain (+973)' },
  { value: '+20', label: 'Egypt (+20)' },
  { value: '+964', label: 'Iraq (+964)' },
  { value: '+961', label: 'Lebanon (+961)' },
  { value: '+963', label: 'Syria (+963)' },
  { value: '+970', label: 'Palestine (+970)' },
  { value: '+90', label: 'Turkey (+90)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+1', label: 'USA/Canada (+1)' },
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
  const [packagesFromApi, setPackagesFromApi] = useState<Array<{ name: string }>>([]);

  const [name, setName] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+962');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [packageName, setPackageName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const phoneDigits = phoneLocal.replace(/[^\d]/g, '');
  const phone = `${phoneCountry}${phoneDigits}`;

  useEffect(() => {
    fetchPackages().then((list) => setPackagesFromApi(list.map((p) => ({ name: p.name })))).catch(() => setPackagesFromApi([]));
  }, []);

  const options = useMemo(() => {
    const list = packagesFromApi.map((p) => p.name);
    if (decodedPackage && !list.includes(decodedPackage)) list.unshift(decodedPackage);
    return list;
  }, [packagesFromApi, decodedPackage]);

  const defaultPackage = decodedPackage || options[0] || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('submitting');
    try {
      const base = getClientApiBase();
      const url = base ? `${base}/api/portal/package-registrations` : '/api/package-registrations';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: packageName || defaultPackage,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined,
          customerAge: age.trim() ? parseInt(age.trim(), 10) : undefined,
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
      setPhoneLocal('');
      setEmail('');
      setAge('');
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
          className="rounded-lg bg-[#003DA5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003DA5]/90"
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
          {options.length === 0 ? <option value="">No programs available</option> : null}
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
        <div className="flex gap-2">
          <select
            aria-label="Country code"
            value={phoneCountry}
            onChange={(e) => setPhoneCountry(e.target.value)}
            className="h-[42px] w-[170px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneLocal}
            onChange={(e) => setPhoneLocal(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
            placeholder="7 9000 2200"
            required
          />
        </div>
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

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Age (optional)</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-brand-green-primary focus:outline-none focus:ring-1 focus:ring-brand-green-primary"
          placeholder="e.g. 10"
          min="1"
          max="100"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-lg bg-[#003DA5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#003DA5]/90 disabled:opacity-70"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}

