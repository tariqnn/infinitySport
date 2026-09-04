"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowPathIcon,
  DocumentArrowDownIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardBody, Input, Modal, Select } from "../_components/ui";
import {
  competitionRegistrationsApi,
  type CompetitionRegistrationRow,
} from "../../lib/portalApi";
import { downloadStyledWorkbook } from "../../lib/excelExport";
import { openPdfTable } from "../../lib/pdfExport";

type TeamPlayer = {
  name: string;
  age: number | string;
  jerseySize: string;
};

function teamPlayers(row: CompetitionRegistrationRow): TeamPlayer[] {
  if (Array.isArray(row.players) && row.players.length > 0) return row.players;
  return [row.playerOne, row.playerTwo, row.playerThree, row.playerFour]
    .filter((name): name is string => Boolean(name))
    .map((name, index) => ({
      name,
      age: index === 0 && row.age ? row.age : "—",
      jerseySize: index === 0 && row.jerseySize ? row.jerseySize : "—",
    }));
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function statusClass(status: string) {
  if (status === "CONFIRMED") return "bg-emerald-100 text-emerald-800";
  if (status === "CANCELLED") return "bg-rose-100 text-rose-800";
  if (status === "WAITLISTED") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
}

function exportEventTeamsExcel(rows: CompetitionRegistrationRow[]) {
  const teamRows = rows.map((row) => [
    row.eventTitle || "Untitled event",
    row.teamName || "Unnamed team",
    row.competitionType,
    teamPlayers(row)
      .map((player) => `${player.name} (Age ${player.age})`)
      .join(", "),
    teamPlayers(row).length,
    row.customerPhone || "",
    row.status,
    formatDate(row.createdAt),
  ]);

  const playerRows = rows.flatMap((row) =>
    teamPlayers(row).map((player) => [
      row.eventTitle || "Untitled event",
      row.teamName || "Unnamed team",
      row.competitionType,
      player.name,
      player.age,
      player.jerseySize,
      row.customerPhone || "",
      row.status,
    ]),
  );

  return downloadStyledWorkbook("3x3-teams-and-players.xlsx", [
    {
      name: "Teams",
      headers: [
        "Event",
        "Team",
        "Division",
        "Players",
        "Player count",
        "Contact",
        "Status",
        "Registered",
      ],
      rows: teamRows,
    },
    {
      name: "Players",
      headers: [
        "Event",
        "Team",
        "Division",
        "Player",
        "Age",
        "Jersey size",
        "Contact",
        "Status",
      ],
      rows: playerRows,
    },
  ]);
}

function exportEventTeamsPdf(rows: CompetitionRegistrationRow[]) {
  const tableRows = rows.map((row) => [
    row.eventTitle || "Untitled event",
    row.teamName || "Unnamed team",
    row.competitionType,
    teamPlayers(row)
      .map((player) => `${player.name} (Age ${player.age})`)
      .join(", "),
    row.customerPhone || "",
    row.status,
    formatDate(row.createdAt),
  ]);

  openPdfTable(
    "3x3 teams and players",
    ["Event", "Team", "Division", "Players", "Contact", "Status", "Registered"],
    tableRows,
  );
}

type EditablePlayer = { name: string; age: string; jerseySize: string };

function EditTeamModal({
  row,
  onClose,
  onSaved,
}: {
  row: CompetitionRegistrationRow | null;
  onClose: () => void;
  onSaved: (row: CompetitionRegistrationRow) => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [division, setDivision] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [status, setStatus] = useState("NEW");
  const [players, setPlayers] = useState<EditablePlayer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setTeamName(row.teamName || "");
    setDivision(row.competitionType || "");
    setCustomerPhone(row.customerPhone || "");
    setStatus(row.status || "NEW");
    setPlayers(
      teamPlayers(row).map((player) => ({
        name: player.name,
        age: player.age === "—" || player.age == null ? "" : String(player.age),
        jerseySize: player.jerseySize === "—" ? "" : player.jerseySize,
      })),
    );
    setError(null);
  }, [row]);

  if (!row) return null;
  const currentRow = row;

  function updatePlayer(index: number, patch: Partial<EditablePlayer>) {
    setPlayers((prev) => prev.map((player, i) => (i === index ? { ...player, ...patch } : player)));
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, { name: "", age: "", jerseySize: "" }]);
  }

  function removePlayer(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }
    if (!division.trim()) {
      setError("Division is required.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("Phone number is required.");
      return;
    }
    const cleanedPlayers = players
      .map((player) => ({
        name: player.name.trim(),
        age: player.age.trim() ? Math.max(1, Math.round(Number(player.age) || 0)) : null,
        jerseySize: player.jerseySize.trim(),
      }))
      .filter((player) => player.name);
    if (cleanedPlayers.length === 0) {
      setError("At least one player is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await competitionRegistrationsApi.update(currentRow.id, {
        teamName: teamName.trim(),
        competitionType: division.trim(),
        customerPhone: customerPhone.trim(),
        status,
        players: cleanedPlayers,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!row} onClose={onClose} title="Edit team" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Team name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            required
          />
          <Input
            label="Division"
            value={division}
            onChange={(event) => setDivision(event.target.value)}
            placeholder="e.g. Boys U17"
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            required
          />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="NEW">New</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="WAITLISTED">Waitlisted</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ui-textPrimary">Players</p>
            <Button type="button" size="sm" variant="secondary" onClick={addPlayer}>
              Add player
            </Button>
          </div>
          <div className="mt-2 space-y-3">
            {players.map((player, index) => (
              <div
                key={index}
                className="grid items-end gap-2 rounded-lg border border-ui-border p-3 sm:grid-cols-[1fr_100px_100px_auto]"
              >
                <Input
                  label="Name"
                  value={player.name}
                  onChange={(event) => updatePlayer(index, { name: event.target.value })}
                />
                <Input
                  label="Age"
                  type="number"
                  min={1}
                  max={99}
                  value={player.age}
                  onChange={(event) => updatePlayer(index, { age: event.target.value })}
                />
                <Input
                  label="Jersey"
                  value={player.jerseySize}
                  onChange={(event) => updatePlayer(index, { jerseySize: event.target.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => removePlayer(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            {players.length === 0 ? (
              <p className="text-sm text-ui-textMuted">No players yet.</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function EventTeamsPage() {
  const [rows, setRows] = useState<CompetitionRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [editingRow, setEditingRow] = useState<CompetitionRegistrationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await competitionRegistrationsApi.list("ALL", { eventOnly: true }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load 3x3 team registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const eventOptions = useMemo(() => Array.from(new Set(
    rows.map((row) => row.eventTitle || "Untitled event"),
  )).sort(), [rows]);

  const divisionOptions = useMemo(() => Array.from(new Set(
    rows.map((row) => row.competitionType),
  )).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesEvent = eventFilter === "ALL" || (row.eventTitle || "Untitled event") === eventFilter;
      const matchesDivision = divisionFilter === "ALL" || row.competitionType === divisionFilter;
      const searchText = [
        row.eventTitle,
        row.teamName,
        row.competitionType,
        row.customerPhone,
        row.status,
        ...teamPlayers(row).map((player) => player.name),
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesEvent && matchesDivision && (!query || searchText.includes(query));
    });
  }, [divisionFilter, eventFilter, rows, search]);

  const playerCount = rows.reduce((total, row) => total + teamPlayers(row).length, 0);
  const confirmedCount = rows.filter((row) => row.status === "CONFIRMED").length;

  async function handleExportExcel() {
    setExporting(true);
    try {
      await exportEventTeamsExcel(filteredRows);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export teams.");
    } finally {
      setExporting(false);
    }
  }

  function handleExportPdf() {
    setExportingPdf(true);
    try {
      exportEventTeamsPdf(filteredRows);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export teams.");
    } finally {
      setExportingPdf(false);
    }
  }

  function replaceRow(updated: CompetitionRegistrationRow) {
    setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  }

  async function deleteTeam(row: CompetitionRegistrationRow) {
    const label = row.teamName || "this team";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeletingId(row.id);
    try {
      await competitionRegistrationsApi.delete(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete team.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-10">
      <div className="flex flex-col gap-4 border-b border-ui-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primaryBlue">Events</p>
          <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-ui-textPrimary">3x3 Teams</h1>
          <p className="mt-1 text-sm text-ui-textMuted">Team registrations from event pages. Academy registrations remain in their own section.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void handleExportExcel()}
            isLoading={exporting}
            loadingLabel="Exporting"
            leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
            disabled={filteredRows.length === 0}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportPdf}
            isLoading={exportingPdf}
            loadingLabel="Exporting"
            leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
            disabled={filteredRows.length === 0}
          >
            Export PDF
          </Button>
          <Button
            variant="secondary"
            onClick={() => void loadRows()}
            isLoading={loading}
            loadingLabel="Refreshing"
            leadingIcon={<ArrowPathIcon className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody className="p-5"><TrophyIcon className="h-6 w-6 text-brand-primaryBlue" /><p className="mt-3 text-xs font-bold uppercase tracking-wider text-ui-textMuted">Teams</p><p className="mt-1 text-3xl font-extrabold text-ui-textPrimary">{rows.length}</p></CardBody></Card>
        <Card><CardBody className="p-5"><UserGroupIcon className="h-6 w-6 text-brand-primaryBlue" /><p className="mt-3 text-xs font-bold uppercase tracking-wider text-ui-textMuted">Players</p><p className="mt-1 text-3xl font-extrabold text-ui-textPrimary">{playerCount}</p></CardBody></Card>
        <Card><CardBody className="p-5"><UserGroupIcon className="h-6 w-6 text-emerald-600" /><p className="mt-3 text-xs font-bold uppercase tracking-wider text-ui-textMuted">Confirmed</p><p className="mt-1 text-3xl font-extrabold text-ui-textPrimary">{confirmedCount}</p></CardBody></Card>
      </div>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_240px]">
            <label className="block text-sm font-bold text-ui-textPrimary">
              Search teams
              <div className="relative mt-1.5">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ui-textMuted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Team, player, phone, or division"
                  className="min-h-12 w-full rounded-xl border-2 border-ui-border bg-white pl-11 pr-4 text-base outline-none focus:border-brand-primaryBlue/40"
                />
              </div>
            </label>
            <label className="block text-sm font-bold text-ui-textPrimary">
              Event
              <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-ui-border bg-white px-4 text-base outline-none focus:border-brand-primaryBlue/40">
                <option value="ALL">All 3x3 events</option>
                {eventOptions.map((eventTitle) => <option key={eventTitle} value={eventTitle}>{eventTitle}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-ui-textPrimary">
              Division
              <select value={divisionFilter} onChange={(event) => setDivisionFilter(event.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-ui-border bg-white px-4 text-base outline-none focus:border-brand-primaryBlue/40">
                <option value="ALL">All divisions</option>
                {divisionOptions.map((division) => <option key={division} value={division}>{division}</option>)}
              </select>
            </label>
          </div>

          {error ? <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p> : null}

          <div className="mt-6 hidden overflow-x-auto rounded-xl border-2 border-ui-border lg:block">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-ui-softBg text-xs uppercase tracking-wider text-ui-textMuted">
                <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">Division</th><th className="px-4 py-3">Players</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Registered</th><th className="sticky right-0 z-30 w-[72px] min-w-[72px] border-l border-ui-border bg-ui-softBg px-2 py-3 text-center shadow-[-6px_0_10px_rgba(15,23,42,0.06)]">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4 font-semibold text-ui-textPrimary">{row.eventTitle || "Untitled event"}</td>
                    <td className="px-4 py-4 font-extrabold text-ui-textPrimary">{row.teamName || "Unnamed team"}</td>
                    <td className="px-4 py-4 text-ui-textPrimary">{row.competitionType}</td>
                    <td className="px-4 py-4"><ul className="space-y-1.5">{teamPlayers(row).map((player, index) => <li key={`${player.name}-${index}`}><span className="font-semibold text-ui-textPrimary">{player.name}</span><span className="ml-2 text-xs text-ui-textMuted">Age {player.age} · {player.jerseySize}</span></li>)}</ul></td>
                    <td className="px-4 py-4"><a href={`tel:${row.customerPhone || ""}`} className="font-semibold text-brand-primaryBlue hover:underline">{row.customerPhone || "—"}</a></td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>{row.status}</span></td>
                    <td className="px-4 py-4 text-xs text-ui-textMuted">{formatDate(row.createdAt)}</td>
                    <td className="sticky right-0 z-20 w-[72px] min-w-[72px] border-l border-ui-border bg-white px-2 py-4 text-center shadow-[-6px_0_10px_rgba(15,23,42,0.04)]">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ui-textMuted outline-none transition hover:bg-ui-softBg hover:text-ui-textPrimary focus-visible:ring-2 focus-visible:ring-brand-primaryBlue/40"
                            aria-label={`Actions for ${row.teamName || "team"}`}
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
                            className="z-[60] min-w-[12rem] rounded-lg border border-ui-border bg-white py-1 text-left shadow-lg focus:outline-none"
                          >
                            <DropdownMenu.Item
                              className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                              onSelect={() => setEditingRow(row)}
                            >
                              Edit team
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="cursor-pointer px-4 py-2 text-sm text-red-600 outline-none hover:bg-red-50 data-[highlighted]:bg-red-50 disabled:opacity-50"
                              onSelect={() => void deleteTeam(row)}
                              disabled={deletingId === row.id}
                            >
                              {deletingId === row.id ? "Deleting..." : "Delete"}
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

          <div className="mt-6 grid gap-4 lg:hidden">
            {filteredRows.map((row) => (
              <article key={row.id} className="rounded-xl border-2 border-ui-border bg-white p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-primaryBlue">{row.eventTitle || "Untitled event"}</p><h2 className="mt-1 text-lg font-extrabold text-ui-textPrimary">{row.teamName || "Unnamed team"}</h2><p className="mt-1 text-sm text-ui-textMuted">{row.competitionType}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>{row.status}</span></div>
                <ul className="mt-4 divide-y divide-ui-border rounded-xl bg-ui-softBg px-3">{teamPlayers(row).map((player, index) => <li key={`${player.name}-${index}`} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="font-semibold text-ui-textPrimary">{player.name}</span><span className="text-xs text-ui-textMuted">Age {player.age} · {player.jerseySize}</span></li>)}</ul>
                <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-ui-textMuted"><a href={`tel:${row.customerPhone || ""}`} className="font-bold text-brand-primaryBlue">{row.customerPhone || "No contact"}</a><span>{formatDate(row.createdAt)}</span></div>
                <div className="mt-4 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setEditingRow(row)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void deleteTeam(row)}
                    isLoading={deletingId === row.id}
                    loadingLabel="Deleting"
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {!loading && filteredRows.length === 0 ? <div className="py-14 text-center"><TrophyIcon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-semibold text-ui-textMuted">No 3x3 teams match this view.</p></div> : null}
        </CardBody>
      </Card>

      <EditTeamModal row={editingRow} onClose={() => setEditingRow(null)} onSaved={replaceRow} />
    </div>
  );
}
