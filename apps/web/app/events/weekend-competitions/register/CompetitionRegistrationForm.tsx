'use client';

import { useMemo, useState } from 'react';

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

const COMPETITION_OPTIONS = [
  { id: '3X3_MEN', label: '3x3 Tournament - Men', kind: 'team' },
  { id: '3X3_WOMEN', label: '3x3 Tournament - Women', kind: 'team' },
  { id: 'KING', label: 'King - Men', kind: 'individual' },
  { id: 'QUEEN', label: 'Queen - Women', kind: 'individual' },
  { id: 'JACK_OF_THE_COURT', label: 'Jack of the Court', kind: 'individualGender' },
  { id: 'THREE_POINT_MEN', label: '3 Point Competition - Men', kind: 'individual' },
  { id: 'DUNK_CONTEST', label: 'Dunk Contest', kind: 'individual' },
] as const;

type CompetitionId = (typeof COMPETITION_OPTIONS)[number]['id'];

export function CompetitionRegistrationForm() {
  const [competitionType, setCompetitionType] = useState<CompetitionId>('3X3_MEN');
  const [teamName, setTeamName] = useState('');
  const [playerOne, setPlayerOne] = useState('');
  const [playerTwo, setPlayerTwo] = useState('');
  const [playerThree, setPlayerThree] = useState('');
  const [playerFour, setPlayerFour] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+962');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const phoneDigits = phoneLocal.replace(/[^\d]/g, '');
  const customerPhone = `${phoneCountry}${phoneDigits}`;

  const selected = useMemo(
    () => COMPETITION_OPTIONS.find((option) => option.id === competitionType) || COMPETITION_OPTIONS[0],
    [competitionType],
  );
  const isTeam = selected.kind === 'team';
  const needsGender = selected.kind === 'individualGender';

  function resetForm() {
    setTeamName('');
    setPlayerOne('');
    setPlayerTwo('');
    setPlayerThree('');
    setPlayerFour('');
    setParticipantName('');
    setPhoneLocal('');
    setAge('');
    setGender('MALE');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/competition-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionType,
          teamName,
          playerOne,
          playerTwo,
          playerThree,
          playerFour,
          participantName,
          customerPhone,
          age,
          gender: needsGender ? gender : undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Registration failed.');

      setMessage({ type: 'success', text: 'Registration sent. We will see it in the portal.' });
      resetForm();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Registration failed.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10';

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-brand-lightBlue/20 bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-6">
      <div>
        <label className="mb-2 block text-sm font-bold text-brand-black">Competition</label>
        <select
          value={competitionType}
          onChange={(event) => {
            setCompetitionType(event.target.value as CompetitionId);
            setMessage(null);
          }}
          className={inputClass}
        >
          {COMPETITION_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-bold text-brand-black">Phone number</label>
        <div className="flex gap-2">
          <select
            aria-label="Country code"
            value={phoneCountry}
            onChange={(event) => setPhoneCountry(event.target.value)}
            className="h-[46px] w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10"
          >
            {PHONE_COUNTRIES.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass} min-w-0 flex-1`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phoneLocal}
            onChange={(event) => setPhoneLocal(event.target.value)}
            placeholder="7 9000 2200"
            required
          />
        </div>
      </div>

      {isTeam ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-bold text-brand-black">Team name</label>
            <input className={inputClass} value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-brand-black">Player 1</label>
            <input className={inputClass} value={playerOne} onChange={(event) => setPlayerOne(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-brand-black">Player 2</label>
            <input className={inputClass} value={playerTwo} onChange={(event) => setPlayerTwo(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-brand-black">Player 3</label>
            <input className={inputClass} value={playerThree} onChange={(event) => setPlayerThree(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-brand-black">Player 4 optional</label>
            <input className={inputClass} value={playerFour} onChange={(event) => setPlayerFour(event.target.value)} />
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-bold text-brand-black">Player name</label>
            <input className={inputClass} value={participantName} onChange={(event) => setParticipantName(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-brand-black">Age</label>
            <input className={inputClass} type="number" min={1} max={99} value={age} onChange={(event) => setAge(event.target.value)} required />
          </div>
          {needsGender ? (
            <div>
              <label className="mb-2 block text-sm font-bold text-brand-black">Gender</label>
              <select className={inputClass} value={gender} onChange={(event) => setGender(event.target.value as 'MALE' | 'FEMALE')} required>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          ) : null}
        </div>
      )}

      {message ? (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-full bg-[#003DA5] px-6 py-3 text-sm font-bold text-white shadow-button transition-all duration-300 hover:scale-[1.01] hover:bg-[#003DA5]/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Sending...' : 'Register'}
      </button>
    </form>
  );
}
