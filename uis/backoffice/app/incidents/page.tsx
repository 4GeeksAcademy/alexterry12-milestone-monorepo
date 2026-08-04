"use client";

import { useCallback, useRef, useState } from "react";
import {
  analyzeIncidents,
  downloadResultsExport,
  type IncidentAnalysisSummary,
} from "@/lib/incidentsApi";

const CATEGORY_ORDER = [
  "LOST_PARCEL",
  "DELAYED_DELIVERY",
  "WRONG_ADDRESS",
  "RETURN_REQUEST",
  "DAMAGE",
] as const;

const STATUS_ORDER = ["OPEN", "CLOSED", "DISCARDED"] as const;

const INVALID_RULE_LABELS: {
  key: keyof IncidentAnalysisSummary["invalid_breakdown"];
  label: string;
}[] = [
  { key: "invalid_tracking_number", label: "Invalid tracking number" },
  { key: "carrier_country_mismatch", label: "Carrier/country mismatch" },
  { key: "invalid_category", label: "Invalid or missing category" },
  { key: "invalid_email", label: "Invalid or missing email" },
  { key: "closed_no_score", label: "Closed incident, no score" },
  { key: "invalid_country", label: "Missing or invalid country" },
  { key: "empty_description", label: "Empty description" },
  { key: "score_out_of_range", label: "Satisfaction score out of range" },
];

const SCORE_LABELS: Record<string, string> = {
  "1": "Very dissatisfied",
  "2": "Dissatisfied",
  "3": "Neutral",
  "4": "Satisfied",
  "5": "Very satisfied",
};

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

function pct(part: number, whole: number): string {
  if (whole === 0) return "0.0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function BreakdownList({
  entries,
  total,
}: {
  entries: { label: string; count: number }[];
  total: number;
}) {
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.label}
          className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2 last:border-0"
        >
          <span className="font-mono text-sm text-ink">{entry.label}</span>
          <span className="shrink-0 text-sm text-muted">
            <span className="font-mono font-medium text-ink">{entry.count}</span>
            {" · "}
            {pct(entry.count, total)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function IncidentsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<IncidentAnalysisSummary | null>(null);

  const runAnalyze = useCallback(async (file: File) => {
    setError(null);
    setSummary(null);
    setSelectedName(file.name);
    setBusy(true);
    try {
      const result = await analyzeIncidents(file);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyze failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    void runAnalyze(file);
  };

  const onExport = async () => {
    setError(null);
    setExportBusy(true);
    try {
      await downloadResultsExport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExportBusy(false);
    }
  };

  const triggeredRules =
    summary == null
      ? []
      : INVALID_RULE_LABELS.filter(
          (rule) => summary.invalid_breakdown[rule.key] > 0,
        );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Customer Experience
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Incident report analysis
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Upload a monthly incidents CSV for Valentina&apos;s team. Metrics come
          from the company API — customer emails are never shown.
        </p>
      </div>

      <Section title="Upload CSV">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFileChosen(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-line bg-canvas/60 hover:border-accent/50"
          }`}
        >
          <p className="text-sm font-medium text-ink">
            Drag and drop a CSV here, or click to browse
          </p>
          <p className="mt-2 font-mono text-xs text-muted">
            Field name sent to API: file · accepts .csv only
          </p>
          {selectedName ? (
            <p className="mt-4 font-mono text-sm text-accent">{selectedName}</p>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
        </div>
        {busy ? (
          <p className="mt-4 font-mono text-sm text-muted">Analyzing…</p>
        ) : null}
        {error ? (
          <p
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </Section>

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Section title="Total records">
              <p className="font-mono text-3xl font-semibold text-accent">
                {summary.total_records}
              </p>
              <p className="mt-2 text-sm text-muted">Source: {summary.source}</p>
            </Section>
            <Section title="Valid records">
              <p className="font-mono text-3xl font-semibold text-ink">
                {summary.valid_records}
              </p>
            </Section>
            <Section title="Invalid / incomplete">
              <p className="font-mono text-3xl font-semibold text-ink">
                {summary.invalid_records}
              </p>
            </Section>
          </div>

          {summary.invalid_records > 0 ? (
            <Section title="Invalid records in this file">
              <p className="mb-4 text-sm text-muted">
                This file contains{" "}
                <span className="font-mono font-medium text-ink">
                  {summary.invalid_records}
                </span>{" "}
                invalid or incomplete record
                {summary.invalid_records === 1 ? "" : "s"}. Counts by rule:
              </p>
              <ul className="space-y-2">
                {triggeredRules.map((rule) => (
                  <li
                    key={rule.key}
                    className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2 last:border-0"
                  >
                    <span className="text-sm text-ink">{rule.label}</span>
                    <span className="font-mono text-sm font-medium text-ink">
                      {summary.invalid_breakdown[rule.key]}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : (
            <Section title="Invalid records">
              <p className="text-sm text-muted">
                No invalid records were found in this file.
              </p>
            </Section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Breakdown by category">
              <BreakdownList
                total={summary.valid_records}
                entries={CATEGORY_ORDER.map((label) => ({
                  label,
                  count: summary.by_category[label] ?? 0,
                }))}
              />
            </Section>
            <Section title="Breakdown by status">
              <BreakdownList
                total={summary.valid_records}
                entries={STATUS_ORDER.map((label) => ({
                  label,
                  count: summary.by_status[label] ?? 0,
                }))}
              />
            </Section>
          </div>

          <Section title="Satisfaction index (closed incidents)">
            <p className="font-mono text-sm text-muted">
              Scored: {summary.satisfaction.scored_incidents} of{" "}
              {summary.satisfaction.closed_total}
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-accent">
              {summary.satisfaction.average.toFixed(2)}
              <span className="text-lg text-muted"> / 5.00</span>
            </p>
            <ul className="mt-4 space-y-2">
              {["1", "2", "3", "4", "5"].map((score) => (
                <li
                  key={score}
                  className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2 last:border-0"
                >
                  <span className="text-sm text-ink">
                    Score {score}{" "}
                    <span className="text-muted">
                      ({SCORE_LABELS[score]})
                    </span>
                  </span>
                  <span className="font-mono text-sm font-medium text-ink">
                    {summary.satisfaction.score_counts[score] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void onExport()}
              disabled={exportBusy}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {exportBusy ? "Downloading…" : "Download results CSV"}
            </button>
            <p className="font-mono text-xs text-muted">
              GET /api/incidents/results/export
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
