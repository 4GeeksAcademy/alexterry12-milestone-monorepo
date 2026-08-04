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

async function readErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export async function analyzeIncidents(
  file: File,
): Promise<IncidentAnalysisSummary> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${getBaseUrl()}/api/incidents/analyze`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(
      await readErrorDetail(
        response,
        `Analyze failed (${response.status} ${response.statusText})`,
      ),
    );
  }

  return (await response.json()) as IncidentAnalysisSummary;
}

export async function downloadResultsExport(): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/incidents/results/export`);

  if (!response.ok) {
    throw new Error(
      await readErrorDetail(
        response,
        `Export failed (${response.status} ${response.statusText})`,
      ),
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
