/**
 * Client for TrackFlow company API — incident analysis.
 * Never reads or stores customer_email (API returns aggregates only).
 */

export type IncidentAnalysisSummary = {
  source: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: {
    invalid_tracking_number: number;
    carrier_country_mismatch: number;
    invalid_category: number;
    invalid_email: number;
    closed_no_score: number;
    invalid_country: number;
    empty_description: number;
    score_out_of_range: number;
  };
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  by_country: Record<string, number>;
  satisfaction: {
    scored_incidents: number;
    closed_total: number;
    average: number;
    score_counts: Record<string, number>;
  };
};

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined. Set it in .env.local (see .env.example).",
    );
  }
  return baseUrl.replace(/\/$/, "");
}

const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

/**
 * The analyzer's own validation messages, which are written for end users and
 * are safe to show verbatim. Anything else is replaced by a fixed message.
 */
const ALLOWED_ANALYZE_DETAIL_PREFIXES = [
  "Missing required columns",
  "Not a CSV file",
  "Empty file",
] as const;

/** fetch that never lets the browser's raw "Failed to fetch" text reach the UI. */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }
}

function messageForStatus(status: number): string {
  if (status === 400 || status === 422) {
    return "That file could not be processed. Check it is a valid incidents CSV and try again.";
  }
  if (status === 404) {
    return "That resource is no longer available. Please try again.";
  }
  if (status >= 500) {
    return "The server had a problem handling this file. Please try again in a moment.";
  }
  return "Something went wrong. Please try again.";
}

/** Returns the response's string `detail`, or null when there is none. */
async function readDetailString(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail.trim();
    }
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[incidentsApi] Error response was not JSON (status ${response.status}).`,
      );
    }
  }
  return null;
}

export async function analyzeIncidents(
  file: File,
): Promise<IncidentAnalysisSummary> {
  const form = new FormData();
  form.append("file", file);

  const response = await apiFetch(`${getBaseUrl()}/api/incidents/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const detail =
      response.status === 400 ? await readDetailString(response) : null;
    const allowed =
      detail !== null &&
      detail.length > 0 &&
      !detail.includes("Malformed CSV") &&
      ALLOWED_ANALYZE_DETAIL_PREFIXES.some((prefix) =>
        detail.startsWith(prefix),
      );
    throw new Error(allowed ? detail : messageForStatus(response.status));
  }

  return (await response.json()) as IncidentAnalysisSummary;
}

export async function downloadResultsExport(): Promise<void> {
  const response = await apiFetch(
    `${getBaseUrl()}/api/incidents/results/export`,
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "No results are available to download yet. Analyze a CSV first."
        : messageForStatus(response.status),
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "results.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
