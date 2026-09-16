/**
 * Client for TrackFlow company API — centralized incident manager.
 * Separate from the CSV analyzer client in incidentsApi.ts.
 */

export type IncidentStatus = "open" | "in_progress" | "resolved" | "discarded";
export type IncidentOrigin = "customer" | "branch" | "internal";
export type IncidentBranch =
  | "central"
  | "la_warehouse"
  | "la_office"
  | "zaragoza_warehouse"
  | "zaragoza_office";
export type IncidentCategory =
  | "lost_parcel"
  | "delivery_failure"
  | "inventory_discrepancy"
  | "carrier_issue"
  | "returns_issue"
  | "warehouse_incident"
  | "system_failure"
  | "client_complaint"
  | "other";

export type Incident = {
  id: number;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  origin: IncidentOrigin;
  branch: IncidentBranch;
  created_at: string;
  updated_at: string;
};

export type IncidentCreatePayload = {
  title: string;
  description: string;
  category: IncidentCategory;
  origin: IncidentOrigin;
  branch: IncidentBranch;
  status: IncidentStatus;
};

export type IncidentSummary = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

export type IncidentListFilters = {
  status?: string;
  origin?: string;
  branch?: string;
  category?: string;
};

export const BRANCH_OPTIONS: { value: IncidentBranch; label: string }[] = [
  { value: "central", label: "Central" },
  { value: "la_warehouse", label: "Los Angeles — Warehouse" },
  { value: "la_office", label: "Los Angeles — Office" },
  { value: "zaragoza_warehouse", label: "Zaragoza — Warehouse" },
  { value: "zaragoza_office", label: "Zaragoza — Office" },
];

export const CATEGORY_OPTIONS: { value: IncidentCategory; label: string }[] = [
  { value: "lost_parcel", label: "Lost parcel" },
  { value: "delivery_failure", label: "Delivery failure" },
  { value: "inventory_discrepancy", label: "Inventory discrepancy" },
  { value: "carrier_issue", label: "Carrier issue" },
  { value: "returns_issue", label: "Returns issue" },
  { value: "warehouse_incident", label: "Warehouse incident" },
  { value: "system_failure", label: "System failure" },
  { value: "client_complaint", label: "Client complaint" },
  { value: "other", label: "Other" },
];

export const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "discarded", label: "Discarded" },
];

export const ORIGIN_OPTIONS: { value: IncidentOrigin; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "branch", label: "Branch" },
  { value: "internal", label: "Internal" },
];

export const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

export class IncidentApiError extends Error {
  field: string | null;

  constructor(message: string, field?: string | null) {
    super(message);
    this.name = "IncidentApiError";
    this.field = field ?? null;
  }
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not defined. Set it in .env.local (see .env.example).",
    );
  }
  return baseUrl.replace(/\/$/, "");
}

async function readIncidentApiError(
  response: Response,
  fallback: string,
): Promise<IncidentApiError> {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("detail" in body)) {
      return new IncidentApiError(fallback);
    }
    const detail = (body as { detail: unknown }).detail;
    if (
      detail &&
      typeof detail === "object" &&
      "message" in detail &&
      typeof (detail as { message: unknown }).message === "string"
    ) {
      const field =
        "field" in detail &&
        typeof (detail as { field: unknown }).field === "string"
          ? (detail as { field: string }).field
          : null;
      const message = (detail as { message: string }).message.trim();
      return new IncidentApiError(
        message || "Something went wrong. Please try again.",
        field,
      );
    }
    if (typeof detail === "string" && detail.trim()) {
      // Prefer a short friendly line over raw server prose when possible.
      return new IncidentApiError("Something went wrong. Please try again.");
    }
  } catch {
    // ignore parse errors
  }
  return new IncidentApiError(fallback);
}

const NETWORK_ERROR_MESSAGE =
  "Could not reach the incident system. Check your connection and try again.";

/** fetch that never surfaces the browser's raw "Failed to fetch" text. */
async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new IncidentApiError(NETWORK_ERROR_MESSAGE);
  }
}

export function branchLabel(value: string): string {
  return BRANCH_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function originLabel(value: string): string {
  return ORIGIN_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export async function listIncidents(
  filters?: IncidentListFilters,
): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.origin) params.set("origin", filters.origin);
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.category) params.set("category", filters.category);
  const qs = params.toString();
  const url = `${getBaseUrl()}/api/incidents${qs ? `?${qs}` : ""}`;
  const response = await apiFetch(url);
  if (!response.ok) {
    throw await readIncidentApiError(
      response,
      "Could not load incidents. Please try again.",
    );
  }
  return (await response.json()) as Incident[];
}

export async function getSummary(): Promise<IncidentSummary> {
  const response = await apiFetch(`${getBaseUrl()}/api/incidents/summary`);
  if (!response.ok) {
    throw await readIncidentApiError(
      response,
      "Could not load the summary. Please try again.",
    );
  }
  return (await response.json()) as IncidentSummary;
}

export async function createIncident(
  payload: IncidentCreatePayload,
): Promise<Incident> {
  const response = await apiFetch(`${getBaseUrl()}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await readIncidentApiError(
      response,
      "Could not register the incident. Please check the form and try again.",
    );
  }
  return (await response.json()) as Incident;
}

export async function updateIncidentStatus(
  id: number,
  status: IncidentStatus,
): Promise<Incident> {
  const response = await apiFetch(`${getBaseUrl()}/api/incidents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw await readIncidentApiError(
      response,
      "Could not update the status. Please try again.",
    );
  }
  return (await response.json()) as Incident;
}
