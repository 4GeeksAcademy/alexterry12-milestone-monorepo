"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCandidates } from "@/lib/api";
import { stageLabels, statusLabels } from "@/lib/labels";
import type { Candidate, Stage, Status } from "@/types/candidate";

function isStatus(value: string): value is Status {
  return value in statusLabels;
}

function isStage(value: string): value is Stage {
  return value in stageLabels;
}

export default function CandidateListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const statusParam = searchParams.get("status");
  const stageParam = searchParams.get("stage");
  const qParam = searchParams.get("q") ?? "";

  const statusFilter =
    statusParam && isStatus(statusParam) ? statusParam : null;
  const stageFilter = stageParam && isStage(stageParam) ? stageParam : null;

  function updateQueryParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const query = params.toString();
    router.push(query ? `?${query}` : "/", { scroll: false });
  }

  const filteredCandidates = useMemo(() => {
    const query = qParam.trim().toLowerCase();

    return candidates.filter((candidate) => {
      if (statusFilter && candidate.status !== statusFilter) {
        return false;
      }

      if (stageFilter && candidate.stage !== stageFilter) {
        return false;
      }

      if (query) {
        const nameMatch = candidate.full_name.toLowerCase().includes(query);
        const emailMatch = candidate.email.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, statusFilter, stageFilter, qParam]);

  const hasActiveFilters = Boolean(statusFilter || stageFilter || qParam.trim());

  useEffect(() => {
    async function loadCandidates() {
      try {
        setError(null);
        const data = await getCandidates();
        setCandidates(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong while loading candidates.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, []);

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-zinc-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                TrackFlow People &amp; Talent
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">
                Candidate Pipeline
              </h1>
              <p className="mt-2 text-zinc-600">
                Zaragoza Executive Assistant search — internal hiring tracker
              </p>
            </div>
            <Link
              href="/candidates/new"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              + Register candidate
            </Link>
          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-6 py-8 text-zinc-600">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
              aria-hidden="true"
            />
            <p>Loading candidates…</p>
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-800"
            role="alert"
          >
            <p className="font-medium">Unable to load candidates</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-700">Status</span>
                <select
                  value={statusFilter ?? ""}
                  onChange={(event) =>
                    updateQueryParams({ status: event.target.value || null })
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                >
                  <option value="">All statuses</option>
                  {(Object.entries(statusLabels) as [Status, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-700">Stage</span>
                <select
                  value={stageFilter ?? ""}
                  onChange={(event) =>
                    updateQueryParams({ stage: event.target.value || null })
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                >
                  <option value="">All stages</option>
                  {(Object.entries(stageLabels) as [Stage, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-700">Search</span>
                <input
                  type="search"
                  value={qParam}
                  onChange={(event) =>
                    updateQueryParams({ q: event.target.value || null })
                  }
                  placeholder="Name or email"
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
                />
              </label>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              {filteredCandidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-zinc-700"
                        >
                          Full name
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-zinc-700"
                        >
                          Position
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-zinc-700"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-zinc-700"
                        >
                          Stage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredCandidates.map((candidate) => (
                        <tr
                          key={candidate.id}
                          className="transition-colors hover:bg-zinc-50"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/candidates/${candidate.id}`}
                              className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {candidate.full_name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-zinc-700">
                            {candidate.position}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">
                            {statusLabels[candidate.status]}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">
                            {stageLabels[candidate.stage]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-6 py-8 text-center text-zinc-500">
                  {hasActiveFilters
                    ? "No candidates match your filters"
                    : "No candidates found for this search."}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
