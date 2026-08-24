'use client';

import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const PHONE_COUNTRIES = [
  { value: '+962', label: 'Jordan +962' },
  { value: '+966', label: 'Saudi Arabia +966' },
  { value: '+971', label: 'UAE +971' },
  { value: '+965', label: 'Kuwait +965' },
  { value: '+974', label: 'Qatar +974' },
  { value: '+973', label: 'Bahrain +973' },
  { value: '+20', label: 'Egypt +20' },
  { value: '+964', label: 'Iraq +964' },
  { value: '+961', label: 'Lebanon +961' },
  { value: '+970', label: 'Palestine +970' },
] as const;

type EventRegistrationFormProps = {
  eventId: string;
  eventTitle: string;
  tournamentOptions: string[];
  jerseySizes: string[];
};

type PlayerDraft = {
  name: string;
  age: string;
  jerseySize: string;
};

const fieldClass =
  'mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-100';

function newPlayer(defaultJerseySize: string): PlayerDraft {
  return { name: '', age: '', jerseySize: defaultJerseySize };
}

function initialPlayers(defaultJerseySize: string): PlayerDraft[] {
  return Array.from({ length: 3 }, () => newPlayer(defaultJerseySize));
}

export function EventRegistrationForm({
  eventId,
  eventTitle,
  tournamentOptions,
  jerseySizes,
}: EventRegistrationFormProps) {
  const defaultJerseySize = jerseySizes[0] || '';
  const [competitionType, setCompetitionType] = useState(tournamentOptions[0] || '');
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<PlayerDraft[]>(() => initialPlayers(defaultJerseySize));
  const [phoneCountry, setPhoneCountry] = useState('+962');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const customerPhone = useMemo(
    () => `${phoneCountry}${phoneLocal.replace(/[^\d]/g, '')}`,
    [phoneCountry, phoneLocal],
  );

  function updatePlayer(index: number, key: keyof PlayerDraft, value: string) {
    setPlayers((current) => current.map((player, playerIndex) => (
      playerIndex === index ? { ...player, [key]: value } : player
    )));
  }

  function addFourthPlayer() {
    setPlayers((current) => (
      current.length < 4 ? [...current, newPlayer(defaultJerseySize)] : current
    ));
  }

  function removeFourthPlayer() {
    setPlayers((current) => current.slice(0, 3));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/competition-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, competitionType, teamName, players, customerPhone }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!response.ok) throw new Error(payload.error || 'Registration could not be completed.');

      setTeamName('');
      setPlayers(initialPlayers(defaultJerseySize));
      setPhoneLocal('');
      setMessage({
        type: 'success',
        text: `${teamName} is registered for ${eventTitle}. We will contact you with the next steps.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Registration could not be completed.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 overflow-hidden rounded-2xl border border-brand-lightBlue/25 bg-white shadow-[0_12px_36px_rgba(20,26,255,0.08)]">
      <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#003DA5]">Team registration</p>
        <h2 className="mt-2 text-2xl font-black text-brand-black sm:text-3xl">Register your 3x3 team</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">Three players are required. A fourth player is optional.</p>
      </div>

      <div className="min-w-0 space-y-7 p-6 sm:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block min-w-0 text-sm font-bold text-slate-800">
            Team name <span className="text-red-600" aria-hidden="true">*</span>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className={fieldClass}
              autoComplete="organization"
              placeholder="Enter the team name"
              required
            />
          </label>

          <label className="block min-w-0 text-sm font-bold text-slate-800">
            Tournament division <span className="text-red-600" aria-hidden="true">*</span>
            <select
              value={competitionType}
              onChange={(event) => setCompetitionType(event.target.value)}
              className={fieldClass}
              required
            >
              {tournamentOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <legend className="text-lg font-black text-slate-950">Players</legend>
              <p className="mt-1 text-sm text-slate-500">Enter a name, age, and jersey size for each player.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#003DA5]">{players.length} players</span>
          </div>

          {players.map((player, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950">Player {index + 1}</h3>
                {index === 3 ? (
                  <button
                    type="button"
                    onClick={removeFourthPlayer}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-200"
                  >
                    <X className="h-4 w-4" aria-hidden="true" /> Remove
                  </button>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Required</span>
                )}
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_130px_190px]">
                <label className="block text-sm font-bold text-slate-800">
                  Full name <span className="text-red-600" aria-hidden="true">*</span>
                  <input
                    value={player.name}
                    onChange={(event) => updatePlayer(index, 'name', event.target.value)}
                    className={fieldClass}
                    autoComplete="off"
                    placeholder="First and last name"
                    required
                  />
                </label>
                <label className="block text-sm font-bold text-slate-800">
                  Age <span className="text-red-600" aria-hidden="true">*</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={99}
                    value={player.age}
                    onChange={(event) => updatePlayer(index, 'age', event.target.value)}
                    className={fieldClass}
                    placeholder="Age"
                    required
                  />
                </label>
                <label className="block text-sm font-bold text-slate-800">
                  Jersey size <span className="text-red-600" aria-hidden="true">*</span>
                  <select
                    value={player.jerseySize}
                    onChange={(event) => updatePlayer(index, 'jerseySize', event.target.value)}
                    className={fieldClass}
                    required
                  >
                    {jerseySizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}

          {players.length < 4 ? (
            <button
              type="button"
              onClick={addFourthPlayer}
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#003DA5]/40 bg-blue-50/50 px-4 text-sm font-black text-[#003DA5] transition hover:border-[#003DA5] hover:bg-blue-50 focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add fourth player
            </button>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold text-slate-800">
            Team contact number <span className="text-red-600" aria-hidden="true">*</span>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
            <select
              aria-label="Phone country code"
              value={phoneCountry}
              onChange={(event) => setPhoneCountry(event.target.value)}
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-[#003DA5] focus:ring-4 focus:ring-blue-100"
              required
            >
              {PHONE_COUNTRIES.map((country) => (
                <option key={country.value} value={country.value}>{country.label}</option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phoneLocal}
              onChange={(event) => setPhoneLocal(event.target.value)}
              className="min-h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-100"
              placeholder="7 9000 2200"
              aria-label="Team contact number"
              required
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Tournament updates will be sent to this number.</p>
        </fieldset>

        {message ? (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || tournamentOptions.length === 0 || jerseySizes.length === 0}
          className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-[#003DA5] px-6 py-3.5 text-base font-black text-white shadow-button transition duration-200 hover:bg-[#002d7a] focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? 'Registering…' : 'Register team'}
        </button>
        <p className="text-center text-xs leading-5 text-slate-500">
          By registering, you agree that Infinity Sports may contact your team about this event.
        </p>
      </div>
    </form>
  );
}
