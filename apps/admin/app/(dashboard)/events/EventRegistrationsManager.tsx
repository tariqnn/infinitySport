'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pencil, Plus, RefreshCw, Save, Trash2, Users, X } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

type TeamPlayer = {
  name: string;
  age: number | string;
  jerseySize: string;
};

type EventRegistration = {
  id: string;
  eventId?: string | null;
  eventTitle?: string | null;
  competitionType: string;
  teamName?: string | null;
  customerPhone?: string | null;
  players?: unknown;
  participantName?: string | null;
  age?: number | null;
  jerseySize?: string | null;
  playerOne?: string | null;
  playerTwo?: string | null;
  playerThree?: string | null;
  playerFour?: string | null;
  status: string;
  createdAt: string;
};

type EditForm = {
  teamName: string;
  customerPhone: string;
  competitionType: string;
  status: string;
  players: TeamPlayer[];
};

const inputClass =
  'mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/15';

function blankPlayer(jerseySize: string): TeamPlayer {
  return { name: '', age: '', jerseySize };
}

function rosterFor(row: EventRegistration, defaultJerseySize: string): TeamPlayer[] {
  if (Array.isArray(row.players)) {
    const players = row.players
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const player = entry as Record<string, unknown>;
        const name = String(player.name ?? '').trim();
        const age = Number(player.age);
        const jerseySize = String(player.jerseySize ?? '').trim();
        if (!name || !Number.isFinite(age) || !jerseySize) return null;
        return { name, age, jerseySize };
      })
      .filter((player): player is { name: string; age: number; jerseySize: string } => Boolean(player));
    if (players.length >= 3) return players.slice(0, 4);
  }

  const legacyNames = [row.playerOne, row.playerTwo, row.playerThree, row.playerFour].filter(
    (name): name is string => Boolean(name),
  );
  if (legacyNames.length === 0 && row.participantName) legacyNames.push(row.participantName);
  const players = legacyNames.map((name, index) => ({
    name,
    age: index === 0 && row.age ? row.age : '',
    jerseySize: index === 0 && row.jerseySize ? row.jerseySize : defaultJerseySize,
  }));
  while (players.length < 3) players.push(blankPlayer(defaultJerseySize));
  return players.slice(0, 4);
}

function rowToForm(row: EventRegistration, defaultJerseySize: string): EditForm {
  return {
    teamName: row.teamName || '',
    customerPhone: row.customerPhone || '',
    competitionType: row.competitionType || '',
    status: row.status || 'NEW',
    players: rosterFor(row, defaultJerseySize),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function EventRegistrationsManager({
  eventId,
  eventTitle,
  tournamentOptions,
  jerseySizes,
}: {
  eventId: string;
  eventTitle: string;
  tournamentOptions: string[];
  jerseySizes: string[];
}) {
  const defaultJerseySize = jerseySizes[0] || '';
  const [rows, setRows] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EventRegistration | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await apiClient.getEventRegistrations(eventId)) as EventRegistration[];
      setRows(result);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not load team registrations.',
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    setEditing(null);
    setEditForm(null);
    setNotice(null);
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const playerNames = rosterFor(row, defaultJerseySize).map((player) => player.name);
      return [row.teamName, row.customerPhone, row.competitionType, ...playerNames]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [defaultJerseySize, rows, search]);

  const confirmed = rows.filter((row) => row.status === 'CONFIRMED').length;
  const playerCount = rows.reduce((total, row) => total + rosterFor(row, defaultJerseySize).filter((player) => player.name).length, 0);

  function startEditing(row: EventRegistration) {
    setEditing(row);
    setEditForm(rowToForm(row, defaultJerseySize));
    setNotice(null);
  }

  function updatePlayer(index: number, key: keyof TeamPlayer, value: string) {
    setEditForm((current) => current ? {
      ...current,
      players: current.players.map((player, playerIndex) => (
        playerIndex === index ? { ...player, [key]: value } : player
      )),
    } : current);
  }

  async function saveRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editForm) return;
    setPending(true);
    setNotice(null);
    try {
      const updated = (await apiClient.updateEventRegistration(editing.id, {
        ...editForm,
        players: editForm.players.map((player) => ({ ...player, age: Number(player.age) })),
      })) as EventRegistration;
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setEditing(null);
      setEditForm(null);
      setNotice({ type: 'success', text: 'Team registration updated.' });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not update this team.',
      });
    } finally {
      setPending(false);
    }
  }

  async function deleteRegistration(row: EventRegistration) {
    if (!window.confirm(`Delete ${row.teamName || 'this team'} from ${eventTitle}?`)) return;
    setPending(true);
    setNotice(null);
    try {
      await apiClient.deleteEventRegistration(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      if (editing?.id === row.id) {
        setEditing(null);
        setEditForm(null);
      }
      setNotice({ type: 'success', text: 'Team registration deleted.' });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not delete this team.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#60D394]">3x3 entries</p>
            <h3 className="mt-1 font-display text-2xl font-bold">Team registrations</h3>
            <p className="mt-1 text-sm text-slate-300">Manage teams, complete rosters, divisions, and registration status for {eventTitle}.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRows()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-3 sm:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Users className="h-5 w-5 text-[#003DA5]" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Total teams</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Users className="h-5 w-5 text-[#003DA5]" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Total players</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{playerCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Confirmed teams</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{confirmed}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {notice ? (
          <p role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {notice.text}
          </p>
        ) : null}

        <label className="block max-w-lg text-sm font-bold text-slate-700">
          Search teams
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Team, player, phone, or division"
            className={inputClass}
          />
        </label>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Team</th>
                <th className="px-4 py-3 font-bold">Division</th>
                <th className="px-4 py-3 font-bold">Roster</th>
                <th className="px-4 py-3 font-bold">Contact</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Registered</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const roster = rosterFor(row, defaultJerseySize).filter((player) => player.name);
                return (
                  <tr key={row.id} className="align-top transition hover:bg-blue-50/40">
                    <td className="px-4 py-4 font-bold text-slate-950">{row.teamName || 'Unnamed team'}</td>
                    <td className="px-4 py-4 text-slate-700">{row.competitionType}</td>
                    <td className="px-4 py-4">
                      <ul className="space-y-1.5">
                        {roster.map((player, index) => (
                          <li key={`${player.name}-${index}`} className="text-xs text-slate-700">
                            <span className="font-bold text-slate-950">{player.name}</span>
                            <span className="ml-2 text-slate-500">Age {player.age} · {player.jerseySize}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-4">
                      {row.customerPhone ? (
                        <a href={`tel:${row.customerPhone}`} className="font-semibold text-[#003DA5] hover:underline">{row.customerPhone}</a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{row.status}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEditing(row)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 font-bold text-slate-700 hover:bg-slate-50">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button type="button" onClick={() => void deleteRegistration(row)} disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${row.teamName || 'team'}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredRows.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">{rows.length === 0 ? 'No teams have registered for this event yet.' : 'No teams match your search.'}</td></tr>
              ) : null}
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center font-semibold text-slate-500">Loading team registrations…</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {editing && editForm ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <form onSubmit={saveRegistration} className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#003DA5]">Edit team</p>
                <h4 className="mt-1 text-xl font-black text-slate-950">Team registration</h4>
              </div>
              <button type="button" onClick={() => { setEditing(null); setEditForm(null); }} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Close edit registration">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-slate-700">Team name *<input value={editForm.teamName} onChange={(event) => setEditForm({ ...editForm, teamName: event.target.value })} className={inputClass} required /></label>
                <label className="text-sm font-bold text-slate-700">Contact number *<input type="tel" value={editForm.customerPhone} onChange={(event) => setEditForm({ ...editForm, customerPhone: event.target.value })} className={inputClass} required /></label>
                <label className="text-sm font-bold text-slate-700">
                  Tournament division *
                  <select value={editForm.competitionType} onChange={(event) => setEditForm({ ...editForm, competitionType: event.target.value })} className={inputClass} required>
                    {!tournamentOptions.includes(editForm.competitionType) ? <option value={editForm.competitionType}>{editForm.competitionType}</option> : null}
                    {tournamentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold text-slate-700">
                  Registration status
                  <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })} className={inputClass}>
                    <option value="NEW">New</option><option value="CONFIRMED">Confirmed</option><option value="WAITLISTED">Waitlisted</option><option value="CANCELLED">Cancelled</option>
                  </select>
                </label>
              </div>

              <fieldset className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <legend className="font-black text-slate-950">Team roster</legend>
                  <span className="text-xs font-bold text-slate-500">3 required · 4 maximum</span>
                </div>
                {editForm.players.map((player, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-black text-slate-950">Player {index + 1}</p>
                      {index === 3 ? <button type="button" onClick={() => setEditForm({ ...editForm, players: editForm.players.slice(0, 3) })} className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-red-600"><X className="h-4 w-4" /> Remove</button> : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_180px]">
                      <label className="text-sm font-bold text-slate-700">Full name *<input value={player.name} onChange={(event) => updatePlayer(index, 'name', event.target.value)} className={inputClass} required /></label>
                      <label className="text-sm font-bold text-slate-700">Age *<input type="number" min={5} max={99} value={player.age} onChange={(event) => updatePlayer(index, 'age', event.target.value)} className={inputClass} required /></label>
                      <label className="text-sm font-bold text-slate-700">
                        Jersey size *
                        <select value={player.jerseySize} onChange={(event) => updatePlayer(index, 'jerseySize', event.target.value)} className={inputClass} required>
                          {!jerseySizes.includes(player.jerseySize) && player.jerseySize ? <option value={player.jerseySize}>{player.jerseySize}</option> : null}
                          {jerseySizes.map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
                {editForm.players.length < 4 ? (
                  <button type="button" onClick={() => setEditForm({ ...editForm, players: [...editForm.players, blankPlayer(defaultJerseySize)] })} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#003DA5]/40 bg-blue-50 px-4 text-sm font-bold text-[#003DA5] hover:border-[#003DA5]">
                    <Plus className="h-4 w-4" /> Add fourth player
                  </button>
                ) : null}
              </fieldset>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={() => { setEditing(null); setEditForm(null); }} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#003DA5] px-5 text-sm font-bold text-white hover:bg-[#002d7a] disabled:opacity-50">
                <Save className="h-4 w-4" /> {pending ? 'Saving…' : 'Save team'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
