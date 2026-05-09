'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, Badge, Button, Select, Modal, Input } from '../_components/ui';
import { competitionRegistrationsApi, type CompetitionRegistrationRow } from '../../lib/portalApi';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

const COMPETITION_LABELS: Record<string, string> = {
  '3X3': '3x3 Tournament (Legacy)',
  '3X3_MEN': '3x3 Tournament - Men',
  '3X3_WOMEN': '3x3 Tournament - Women',
  KING_QUEEN: 'King / Queen',
  KING: 'King - Men',
  QUEEN: 'Queen - Women',
  JACK_OF_THE_COURT: 'Jack of the Court',
  THREE_POINT_MEN: '3 Point Competition - Men',
  DUNK_CONTEST: 'Dunk Contest',
};

const COMPETITION_TYPES = [
  '3X3_MEN',
  '3X3_WOMEN',
  'KING',
  'QUEEN',
  'JACK_OF_THE_COURT',
  'THREE_POINT_MEN',
  'DUNK_CONTEST',
].map((value) => ({ value, label: COMPETITION_LABELS[value] }));

type GroupGame = {
  gameNumber: number;
  teamA: CompetitionRegistrationRow;
  teamB: CompetitionRegistrationRow;
};

type GroupSchedule = {
  division: string;
  groupName: string;
  teams: CompetitionRegistrationRow[];
  games: GroupGame[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function formatMoney(value: number) {
  return `${Math.round(value)} JOD`;
}

function competitionLabel(value: string) {
  return COMPETITION_LABELS[value] || value;
}

function is3x3(row: CompetitionRegistrationRow) {
  return row.competitionType === '3X3' || row.competitionType === '3X3_MEN' || row.competitionType === '3X3_WOMEN';
}

function isActive3x3(row: CompetitionRegistrationRow) {
  return row.competitionType === '3X3_MEN' || row.competitionType === '3X3_WOMEN';
}

function isTeamCompetition(type: string) {
  return type === '3X3' || type === '3X3_MEN' || type === '3X3_WOMEN';
}

function competitorNames(row: CompetitionRegistrationRow) {
  if (is3x3(row)) {
    return [row.playerOne, row.playerTwo, row.playerThree, row.playerFour].filter(Boolean).join(', ');
  }
  return row.participantName || '-';
}

function teamLabel(row: CompetitionRegistrationRow) {
  return row.teamName || row.participantName || 'Unnamed';
}

function competitionSearchText(row: CompetitionRegistrationRow) {
  return [
    row.competitionType,
    competitionLabel(row.competitionType),
    row.teamName,
    row.participantName,
    row.gender,
    row.playerOne,
    row.playerTwo,
    row.playerThree,
    row.playerFour,
    row.status,
  ].filter(Boolean).join(' ').toLowerCase();
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function htmlCell(value: unknown) {
  return (value == null ? '' : String(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openPdfTable(title: string, headers: string[], rows: unknown[][]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF.');
    return;
  }

  const tableRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join('')}</tr>`)
    .join('');
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${htmlCell(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { font-size: 22px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 700; }
          tr:nth-child(even) td { background: #fafafa; }
          @media print { body { margin: 12mm; } }
        </style>
      </head>
      <body>
        <h1>${htmlCell(title)}</h1>
        <table>
          <thead><tr>${headers.map((header) => `<th>${htmlCell(header)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows || `<tr><td colspan="${headers.length}">No registrations</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}

function registrationHeaders() {
  return [
    'Competition',
    'Name / Team',
    'Age',
    'Gender',
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
    'Amount due',
    'Paid',
    'Amount paid',
    'Payment method',
    'Paid at',
    'Status',
    'Registered at',
    'Source',
  ];
}

function registrationRows(rows: CompetitionRegistrationRow[], filter: string) {
  const filteredRows = filter === 'ALL' ? rows : rows.filter((row) => row.competitionType === filter);
  return filteredRows.map((row) => [
    competitionLabel(row.competitionType),
    row.teamName || row.participantName || '',
    row.age ?? '',
    row.gender || '',
    row.playerOne || '',
    row.playerTwo || '',
    row.playerThree || '',
    row.playerFour || '',
    row.amountDue ?? '',
    row.isPaid ? 'Paid' : 'Unpaid',
    row.amountPaid ?? '',
    row.paymentMethod || '',
    row.paidAt || '',
    row.status,
    row.createdAt,
    row.source,
  ]);
}

function exportRegistrationsCsv(rows: CompetitionRegistrationRow[], filter: string) {
  const title = filter === 'ALL' ? 'all-competitions' : filter.toLowerCase().replace(/_/g, '-');
  downloadCsv(`${title}-registrations.csv`, [registrationHeaders(), ...registrationRows(rows, filter)]);
}

function exportRegistrationsPdf(rows: CompetitionRegistrationRow[], filter: string) {
  const title = filter === 'ALL' ? 'All competition registrations' : `${competitionLabel(filter)} registrations`;
  openPdfTable(title, registrationHeaders(), registrationRows(rows, filter));
}

function exportGroupsCsv(groups: GroupSchedule[]) {
  downloadCsv('3x3-shuffled-groups.csv', [
    ['Division', 'Group', 'Game', 'Team A', 'Team B', 'Team A players', 'Team B players'],
    ...groups.flatMap((group) =>
      group.games.length > 0
        ? group.games.map((game) => [
            competitionLabel(group.division),
            group.groupName,
            game.gameNumber,
            teamLabel(game.teamA),
            teamLabel(game.teamB),
            competitorNames(game.teamA),
            competitorNames(game.teamB),
          ])
        : [[competitionLabel(group.division), group.groupName, '', teamLabel(group.teams[0]), 'No games', competitorNames(group.teams[0]), '']],
    ),
  ]);
}

function groupScheduleRows(groups: GroupSchedule[]) {
  return groups.flatMap((group) =>
    group.games.length > 0
      ? group.games.map((game) => [
          competitionLabel(group.division),
          group.groupName,
          group.teams.map(teamLabel).join(' / '),
          game.gameNumber,
          teamLabel(game.teamA),
          teamLabel(game.teamB),
          competitorNames(game.teamA),
          competitorNames(game.teamB),
        ])
      : [[competitionLabel(group.division), group.groupName, group.teams.map(teamLabel).join(' / '), '', teamLabel(group.teams[0]), 'No games', competitorNames(group.teams[0]), '']],
  );
}

function exportGroupsPdf(groups: GroupSchedule[]) {
  openPdfTable(
    '3x3 shuffled groups',
    ['Division', 'Group', 'Group teams', 'Game', 'Team A', 'Team B', 'Team A players', 'Team B players'],
    groupScheduleRows(groups),
  );
}

function shuffleArray<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function build3x3Groups(rows: CompetitionRegistrationRow[], filter: string, groupSize: number): GroupSchedule[] {
  const teams = rows.filter((row) => isActive3x3(row) && (filter === 'ALL' || row.competitionType === filter));
  const byDivision = new Map<string, CompetitionRegistrationRow[]>();
  for (const team of teams) {
    const key = team.competitionType;
    byDivision.set(key, [...(byDivision.get(key) || []), team]);
  }

  const groups: GroupSchedule[] = [];
  const safeGroupSize = Math.max(2, Math.round(groupSize) || 4);
  for (const [division, divisionTeams] of byDivision.entries()) {
    const shuffled = shuffleArray(divisionTeams);
    const groupCount = Math.max(1, Math.ceil(shuffled.length / safeGroupSize));
    const divisionGroups = Array.from({ length: groupCount }, () => [] as CompetitionRegistrationRow[]);
    shuffled.forEach((team, index) => {
      divisionGroups[index % groupCount].push(team);
    });

    for (let groupIndex = 0; groupIndex < divisionGroups.length; groupIndex += 1) {
      const groupTeams = divisionGroups[groupIndex];
      const games: GroupGame[] = [];
      for (let teamAIndex = 0; teamAIndex < groupTeams.length; teamAIndex += 1) {
        for (let teamBIndex = teamAIndex + 1; teamBIndex < groupTeams.length; teamBIndex += 1) {
          games.push({
            gameNumber: games.length + 1,
            teamA: groupTeams[teamAIndex],
            teamB: groupTeams[teamBIndex],
          });
        }
      }
      groups.push({
        division,
        groupName: `Group ${String.fromCharCode(65 + groupIndex)}`,
        teams: groupTeams,
        games,
      });
    }
  }
  return groups;
}

function EditCompetitionModal({
  row,
  onClose,
  onSaved,
}: {
  row: CompetitionRegistrationRow | null;
  onClose: () => void;
  onSaved: (row: CompetitionRegistrationRow) => void;
}) {
  const [competitionType, setCompetitionType] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [teamName, setTeamName] = useState('');
  const [playerOne, setPlayerOne] = useState('');
  const [playerTwo, setPlayerTwo] = useState('');
  const [playerThree, setPlayerThree] = useState('');
  const [playerFour, setPlayerFour] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [amountDue, setAmountDue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [status, setStatus] = useState('NEW');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setCompetitionType(row.competitionType);
    setParticipantName(row.participantName || '');
    setAge(row.age != null ? String(row.age) : '');
    setGender(row.gender || '');
    setTeamName(row.teamName || '');
    setPlayerOne(row.playerOne || '');
    setPlayerTwo(row.playerTwo || '');
    setPlayerThree(row.playerThree || '');
    setPlayerFour(row.playerFour || '');
    setIsPaid(Boolean(row.isPaid));
    setAmountDue(row.amountDue != null ? String(row.amountDue) : '');
    setAmountPaid(row.amountPaid != null ? String(row.amountPaid) : '');
    setPaymentMethod(row.paymentMethod || 'CASH');
    setStatus(row.status || 'NEW');
    setError(null);
  }, [row]);

  if (!row) return null;
  const currentRow = row;

  const isTeam = isTeamCompetition(competitionType);
  const competitionOptions = COMPETITION_TYPES.some((option) => option.value === currentRow.competitionType)
    ? COMPETITION_TYPES
    : [{ value: currentRow.competitionType, label: competitionLabel(currentRow.competitionType) }, ...COMPETITION_TYPES];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (isTeam) {
      if (!teamName.trim() || !playerOne.trim() || !playerTwo.trim() || !playerThree.trim()) {
        setError('Team name and first 3 players are required.');
        return;
      }
    } else if (!participantName.trim()) {
      setError('Player name is required.');
      return;
    }

    setSaving(true);
    try {
      const updated = await competitionRegistrationsApi.update(currentRow.id, {
        competitionType,
        participantName: participantName.trim() || null,
        age: age.trim() ? Math.max(1, Math.round(Number(age) || 0)) : null,
        gender: gender.trim() || null,
        teamName: teamName.trim() || null,
        playerOne: playerOne.trim() || null,
        playerTwo: playerTwo.trim() || null,
        playerThree: playerThree.trim() || null,
        playerFour: playerFour.trim() || null,
        isPaid,
        amountDue: amountDue.trim() ? Math.max(0, Math.round(Number(amountDue) || 0)) : null,
        amountPaid: amountPaid.trim() ? Math.max(0, Math.round(Number(amountPaid) || 0)) : null,
        paymentMethod: (amountPaid.trim() || isPaid) ? paymentMethod : null,
        status: status.trim() || 'NEW',
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save competition registration.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Edit competition registration" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <Select label="Competition" value={competitionType} onChange={(event) => setCompetitionType(event.target.value)}>
          {competitionOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>

        {isTeam ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
            <Input label="Gender" value={gender} onChange={(event) => setGender(event.target.value.toUpperCase())} placeholder="MALE or FEMALE" />
            <Input label="Player 1" value={playerOne} onChange={(event) => setPlayerOne(event.target.value)} required />
            <Input label="Player 2" value={playerTwo} onChange={(event) => setPlayerTwo(event.target.value)} required />
            <Input label="Player 3" value={playerThree} onChange={(event) => setPlayerThree(event.target.value)} required />
            <Input label="Player 4 optional" value={playerFour} onChange={(event) => setPlayerFour(event.target.value)} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Player name" value={participantName} onChange={(event) => setParticipantName(event.target.value)} required />
            <Input label="Age" type="number" min={1} max={99} value={age} onChange={(event) => setAge(event.target.value)} />
            <Input label="Gender" value={gender} onChange={(event) => setGender(event.target.value.toUpperCase())} placeholder="MALE or FEMALE" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-4">
          <Select label="Paid" value={isPaid ? 'yes' : 'no'} onChange={(event) => setIsPaid(event.target.value === 'yes')}>
            <option value="no">Unpaid</option>
            <option value="yes">Paid</option>
          </Select>
          <Input label="Amount due" type="number" min={0} value={amountDue} onChange={(event) => setAmountDue(event.target.value)} />
          <Input label="Amount paid" type="number" min={0} value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
          <Select label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="TRANSFER">Transfer</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>

        <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="NEW">New</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="WAITLIST">Waitlist</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CompetitionsPage() {
  const [rows, setRows] = useState<CompetitionRegistrationRow[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<CompetitionRegistrationRow | null>(null);
  const [groupSize, setGroupSize] = useState(4);
  const [groupSchedules, setGroupSchedules] = useState<GroupSchedule[]>([]);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await competitionRegistrationsApi.list(filter);
      setRows(data);
      setGroupSchedules([]);
    } catch (err) {
      console.error('Failed to load competition registrations', err);
      setError(err instanceof Error ? err.message : 'Failed to load competition registrations.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => competitionSearchText(row).includes(term));
  }, [rows, search]);

  const totals = useMemo(() => {
    const byCompetition = new Map<string, number>();
    for (const row of filteredRows) {
      byCompetition.set(row.competitionType, (byCompetition.get(row.competitionType) || 0) + 1);
    }
    return Array.from(byCompetition.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRows]);

  const paymentSummary = useMemo(() => {
    const collected = filteredRows.reduce((sum, row) => sum + (Number(row.amountPaid) || 0), 0);
    const amountDue = filteredRows.reduce((sum, row) => sum + (Number(row.amountDue) || 0), 0);
    const remaining = filteredRows.reduce((sum, row) => {
      if (row.amountDue == null) return sum;
      return sum + Math.max(0, (Number(row.amountDue) || 0) - (Number(row.amountPaid) || 0));
    }, 0);
    const paidCount = filteredRows.filter((row) => row.isPaid).length;
    const unpaidCount = filteredRows.filter((row) => !row.isPaid).length;
    const unpaidWithUnknownFee = filteredRows.filter((row) => !row.isPaid && row.amountDue == null).length;
    return { collected, amountDue, remaining, paidCount, unpaidCount, unpaidWithUnknownFee };
  }, [filteredRows]);

  const threeXThreeCount = useMemo(
    () => rows.filter((row) => isActive3x3(row) && (filter === 'ALL' || row.competitionType === filter)).length,
    [filter, rows],
  );

  function replaceRow(updated: CompetitionRegistrationRow) {
    setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  }

  async function togglePaid(row: CompetitionRegistrationRow, nextPaid: boolean) {
    setSavingPaymentId(row.id);
    try {
      const amountText = nextPaid ? window.prompt('Amount paid (JOD)', row.amountPaid != null ? String(row.amountPaid) : '') : null;
      if (nextPaid && amountText === null) return;
      const amountPaid = nextPaid && amountText?.trim() ? Math.max(0, Math.round(Number(amountText) || 0)) : null;
      const updated = await competitionRegistrationsApi.update(row.id, {
        isPaid: nextPaid,
        amountDue: nextPaid && row.amountDue == null ? amountPaid : undefined,
        amountPaid,
        paymentMethod: nextPaid ? row.paymentMethod || 'CASH' : null,
      });
      replaceRow(updated);
      setGroupSchedules((prev) => (prev.length > 0 ? build3x3Groups(rows.map((item) => (item.id === updated.id ? updated : item)), filter, groupSize) : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update payment status.');
    } finally {
      setSavingPaymentId(null);
    }
  }

  async function rowsForExport(exportFilter: string) {
    if (exportFilter === filter) return rows;
    return competitionRegistrationsApi.list(exportFilter);
  }

  async function handleRegistrationExport(format: 'csv' | 'pdf') {
    try {
      const exportRows = await rowsForExport(filter);
      if (format === 'csv') {
        exportRegistrationsCsv(exportRows, filter);
      } else {
        exportRegistrationsPdf(exportRows, filter);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export registrations.');
    }
  }

  function shuffleGroups() {
    setGroupSchedules(build3x3Groups(rows, filter, groupSize));
  }

  async function deleteRegistration(row: CompetitionRegistrationRow) {
    const label = teamLabel(row);
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeletingId(row.id);
    try {
      await competitionRegistrationsApi.delete(row.id);
      const nextRows = rows.filter((item) => item.id !== row.id);
      setRows(nextRows);
      setGroupSchedules((prev) => (prev.length > 0 ? build3x3Groups(nextRows, filter, groupSize) : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete registration.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ui-textMuted">Events</p>
          <h1 className="mt-1 text-3xl font-bold text-ui-textPrimary">Competitions</h1>
          <p className="mt-2 text-sm text-ui-textMuted">
            Website registrations for 3x3, King / Queen, Jack of the Court, 3 Point, and Dunk Contest.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-36">
            <Select label="Group size" value={String(groupSize)} onChange={(event) => setGroupSize(Number(event.target.value))}>
              <option value="2">2 teams</option>
              <option value="3">3 teams</option>
              <option value="4">4 teams</option>
              <option value="5">5 teams</option>
              <option value="6">6 teams</option>
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={shuffleGroups} disabled={threeXThreeCount < 2}>
            Shuffle 3x3 groups
          </Button>
          <Button type="button" variant="secondary" onClick={load} isLoading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">Total</p>
            <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{filteredRows.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">Collected</p>
            <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{formatMoney(paymentSummary.collected)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">Expected</p>
            <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{formatMoney(paymentSummary.amountDue)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">Need to collect</p>
            <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{formatMoney(paymentSummary.remaining)}</p>
            {paymentSummary.unpaidWithUnknownFee > 0 ? (
              <p className="mt-1 text-xs text-ui-textMuted">{paymentSummary.unpaidWithUnknownFee} unpaid without amount due</p>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">Paid</p>
            <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{paymentSummary.paidCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">Unpaid</p>
            <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{paymentSummary.unpaidCount}</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {totals.slice(0, 4).map(([type, count]) => (
          <Card key={type}>
            <CardBody>
              <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">{competitionLabel(type)}</p>
              <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{count}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {groupSchedules.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-ui-textPrimary">3x3 shuffled groups</h2>
                <p className="mt-1 text-sm text-ui-textMuted">Teams are randomized into groups, then every team plays the other teams in its group.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => exportGroupsCsv(groupSchedules)}>Export CSV</Button>
                <Button type="button" variant="secondary" onClick={() => exportGroupsPdf(groupSchedules)}>Export PDF</Button>
                <Button type="button" variant="secondary" onClick={() => setGroupSchedules([])}>Clear</Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-2">
              {groupSchedules.map((group) => (
                <div key={`${group.division}-${group.groupName}`} className="rounded-lg border border-ui-border bg-ui-softBg/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ui-textMuted">
                    {competitionLabel(group.division)} - {group.groupName}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ui-textPrimary">{group.teams.map(teamLabel).join(' / ')}</p>
                  <div className="mt-3 space-y-2">
                    {group.games.length > 0 ? group.games.map((game) => (
                      <div key={game.gameNumber} className="rounded-md bg-white px-3 py-2 text-sm text-ui-textPrimary">
                        Game {game.gameNumber}: {teamLabel(game.teamA)} vs {teamLabel(game.teamB)}
                      </div>
                    )) : (
                      <div className="rounded-md bg-white px-3 py-2 text-sm text-ui-textMuted">No games in this group.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-semibold text-ui-textPrimary">Registrations</h2>
              <p className="mt-1 text-sm text-ui-textMuted">
                Edit teams, players, payment status, and registration status.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
              <div className="grid w-full gap-2 sm:w-[34rem] sm:grid-cols-2">
                <Input
                  label="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Team or player"
                />
                <Select label="Competition" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="ALL">All competitions</option>
                  {COMPETITION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => handleRegistrationExport('csv')} disabled={rows.length === 0}>
                  Export CSV
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => handleRegistrationExport('pdf')} disabled={rows.length === 0}>
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ui-border text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Competition</th>
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Name / Team</th>
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Age</th>
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Gender</th>
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Players</th>
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Payment</th>
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Registered</th>
                    <th className="px-4 py-3 font-semibold text-ui-textPrimary">Status</th>
                    <th className="sticky right-0 z-30 w-[72px] min-w-[72px] border-l border-ui-border bg-slate-50 px-2 py-3 text-center font-semibold text-ui-textPrimary shadow-[-6px_0_10px_rgba(15,23,42,0.06)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-ui-textMuted" colSpan={9}>Loading competitions...</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-ui-textMuted" colSpan={9}>
                        {rows.length === 0 ? 'No registrations yet.' : 'No registrations match your search.'}
                      </td>
                    </tr>
                  ) : filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-ui-softBg/70">
                      <td className="px-4 py-3 font-medium text-ui-textPrimary">{competitionLabel(row.competitionType)}</td>
                      <td className="px-4 py-3 text-ui-textPrimary">{row.teamName || row.participantName || '-'}</td>
                      <td className="px-4 py-3 text-ui-textMuted">{row.age ?? '-'}</td>
                      <td className="px-4 py-3 text-ui-textMuted">{row.gender || '-'}</td>
                      <td className="min-w-[260px] px-4 py-3 text-ui-textMuted">{competitorNames(row)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge variant={row.isPaid ? 'success' : 'danger'}>{row.isPaid ? 'Paid' : 'Unpaid'}</Badge>
                          <span className="text-xs text-ui-textMuted">
                            Paid: {row.amountPaid ?? 0} JOD{row.amountDue != null ? ` / Due: ${row.amountDue} JOD` : ''}
                          </span>
                          {row.paymentMethod ? <span className="text-xs text-ui-textMuted">{row.paymentMethod}</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ui-textMuted">{formatDateTime(row.createdAt)}</td>
                      <td className="px-4 py-3"><Badge variant="info">{row.status}</Badge></td>
                      <td className="sticky right-0 z-20 w-[72px] min-w-[72px] border-l border-ui-border bg-white px-2 py-3 text-center shadow-[-6px_0_10px_rgba(15,23,42,0.04)]">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ui-textMuted outline-none transition hover:bg-ui-softBg hover:text-ui-textPrimary focus-visible:ring-2 focus-visible:ring-brand-blue-primary/40"
                              aria-label={`Actions for ${teamLabel(row)}`}
                            >
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              align="end"
                              side="bottom"
                              sideOffset={8}
                              avoidCollisions
                              collisionPadding={12}
                              className="z-[60] min-w-[13rem] rounded-lg border border-ui-border bg-white py-1 text-left shadow-lg focus:outline-none"
                            >
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                onSelect={() => setEditingRow(row)}
                              >
                                Edit
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg disabled:opacity-50"
                                onSelect={() => togglePaid(row, !row.isPaid)}
                                disabled={savingPaymentId === row.id}
                              >
                                {savingPaymentId === row.id ? 'Saving...' : row.isPaid ? 'Mark unpaid' : 'Mark paid'}
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-red-600 outline-none hover:bg-red-50 data-[highlighted]:bg-red-50 disabled:opacity-50"
                                onSelect={() => deleteRegistration(row)}
                                disabled={deletingId === row.id}
                              >
                                {deletingId === row.id ? 'Deleting...' : 'Delete'}
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <EditCompetitionModal
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onSaved={replaceRow}
      />
    </div>
  );
}
