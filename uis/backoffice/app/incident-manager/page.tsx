"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ALLOWED_TRANSITIONS,
  BRANCH_OPTIONS,
  CATEGORY_OPTIONS,
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  branchLabel,
  categoryLabel,
  getSummary,
  listIncidents,
  originLabel,
  statusLabel,
  updateIncidentStatus,
  type Incident,
  type IncidentStatus,
  type IncidentSummary,
} from "@/lib/incidentManagerApi";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SummaryGroup({
  title,
  entries,
}: {
  title: string;
  entries: { label: string; count: number }[];
}) {
  return (
    <div>
      <p className="font-mono text-xs tracking-widest text-muted uppercase">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {entries.map((entry) => (
          <li
            key={entry.label}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-ink">{entry.label}</span>
            <span className="font-mono text-muted">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IncidentManagerPage() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [filtersActive, setFiltersActive] = useState(false);

  const [rowBusy, setRowBusy] = useState<Record<number, boolean>>({});
  const [notify, setNotify] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await getSummary();
      setSummary(data);
    } catch (err) {
      setSummaryError(
        err instanceof Error
          ? err.message
          : "Could not load the summary. Please try again.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const active = Boolean(statusFilter || originFilter || branchFilter);
    setFiltersActive(active);
    try {
      const data = await listIncidents({
        status: statusFilter || undefined,
        origin: originFilter || undefined,
        branch: branchFilter || undefined,
      });
      setIncidents(data);
    } catch (err) {
      setListError(
        err instanceof Error
          ? err.message
          : "Could not load incidents. Please try again.",
      );
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, originFilter, branchFilter]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const onStatusChange = async (incident: Incident, next: IncidentStatus) => {
    if (next === incident.status) return;
    const previous = incident.status;
    setNotify(null);
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === incident.id ? { ...item, status: next } : item,
      ),
    );
    setRowBusy((prev) => ({ ...prev, [incident.id]: true }));
    try {
      const updated = await updateIncidentStatus(incident.id, next);
      setIncidents((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      void loadSummary();
    } catch (err) {
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incident.id ? { ...item, status: previous } : item,
        ),
      );
      setNotify(
        err instanceof Error
          ? err.message
          : "Could not update the status. Please try again.",
      );
    } finally {
      setRowBusy((prev) => ({ ...prev, [incident.id]: false }));
    }
  };

  const statusChoices = (current: IncidentStatus): IncidentStatus[] => {
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    return [current, ...allowed.filter((status) => status !== current)];
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            Operations
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Incident Manager
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Track operational incidents across TrackFlow branches — filter,
            review status, and register new reports from the floor.
          </p>
        </div>
        <Link
          href="/incident-manager/new"
          className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90"
        >
          Register incident
        </Link>
      </div>

      {notify && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {notify}
        </div>
      )}

      <Section title="Summary">
        {summaryLoading && (
          <p className="text-sm text-muted">Loading summary…</p>
        )}
        {summaryError && !summaryLoading && (
          <div className="space-y-3">
            <p className="text-sm text-red-700">{summaryError}</p>
            <button
              type="button"
              onClick={() => void loadSummary()}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas"
            >
              Retry
            </button>
          </div>
        )}
        {summary && !summaryLoading && !summaryError && (
          <div className="space-y-5">
            <p className="text-sm text-muted">
              Total incidents:{" "}
              <span className="font-mono font-medium text-ink">
                {summary.total}
              </span>
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryGroup
                title="By status"
                entries={STATUS_OPTIONS.map((opt) => ({
                  label: opt.label,
                  count: summary.by_status[opt.value] ?? 0,
                }))}
              />
              <SummaryGroup
                title="By category"
                entries={CATEGORY_OPTIONS.map((opt) => ({
                  label: opt.label,
                  count: summary.by_category[opt.value] ?? 0,
                }))}
              />
              <SummaryGroup
                title="By origin"
                entries={ORIGIN_OPTIONS.map((opt) => ({
                  label: opt.label,
                  count: summary.by_origin[opt.value] ?? 0,
                }))}
              />
              <SummaryGroup
                title="By branch"
                entries={BRANCH_OPTIONS.map((opt) => ({
                  label: opt.label,
                  count: summary.by_branch[opt.value] ?? 0,
                }))}
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="Filters">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs text-muted">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-12 rounded-md border border-line bg-canvas px-3 py-2 text-base text-ink"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs text-muted">Origin</span>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="min-h-12 rounded-md border border-line bg-canvas px-3 py-2 text-base text-ink"
            >
              <option value="">All</option>
              {ORIGIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs text-muted">Branch</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="min-h-12 rounded-md border border-line bg-canvas px-3 py-2 text-base text-ink"
            >
              <option value="">All</option>
              {BRANCH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="Incidents">
        {listLoading && <p className="text-sm text-muted">Loading incidents…</p>}
        {listError && !listLoading && (
          <div className="space-y-3">
            <p className="text-sm text-red-700">{listError}</p>
            <button
              type="button"
              onClick={() => void loadIncidents()}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas"
            >
              Retry
            </button>
          </div>
        )}
        {!listLoading && !listError && incidents.length === 0 && (
          <p className="text-sm text-muted">
            {filtersActive
              ? "No incidents match the current filters."
              : "No incidents have been registered yet."}
          </p>
        )}
        {!listLoading && !listError && incidents.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-2 py-3 font-mono text-xs font-medium uppercase">
                    Title
                  </th>
                  <th className="px-2 py-3 font-mono text-xs font-medium uppercase">
                    Category
                  </th>
                  <th className="px-2 py-3 font-mono text-xs font-medium uppercase">
                    Origin
                  </th>
                  <th className="px-2 py-3 font-mono text-xs font-medium uppercase">
                    Branch
                  </th>
                  <th className="px-2 py-3 font-mono text-xs font-medium uppercase">
                    Status
                  </th>
                  <th className="px-2 py-3 font-mono text-xs font-medium uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => {
                  const terminal =
                    incident.status === "resolved" ||
                    incident.status === "discarded";
                  const busy = Boolean(rowBusy[incident.id]);
                  return (
                    <tr
                      key={incident.id}
                      className="border-b border-line/60 align-top last:border-0"
                    >
                      <td className="px-2 py-3 font-medium text-ink">
                        {incident.title}
                      </td>
                      <td className="px-2 py-3 text-muted">
                        {categoryLabel(incident.category)}
                      </td>
                      <td className="px-2 py-3 text-muted">
                        {originLabel(incident.origin)}
                      </td>
                      <td className="px-2 py-3 text-muted">
                        {branchLabel(incident.branch)}
                      </td>
                      <td className="px-2 py-3">
                        <select
                          value={incident.status}
                          disabled={terminal || busy}
                          onChange={(e) =>
                            void onStatusChange(
                              incident,
                              e.target.value as IncidentStatus,
                            )
                          }
                          className="min-h-12 rounded-md border border-line bg-canvas px-2 py-2 text-sm text-ink disabled:opacity-60"
                          aria-label={`Status for ${incident.title}`}
                        >
                          {statusChoices(incident.status).map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-3 font-mono text-muted">
                        {formatDate(incident.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
