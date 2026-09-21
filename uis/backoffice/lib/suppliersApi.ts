/**
 * Client for TrackFlow company API — supplier directory.
 */

export type SupplierStatus = "active" | "suspended";
export type SupplierCountry = "USA" | "Spain";
export type SupplierCurrency = "USD" | "EUR";

export const VALID_CATEGORIES = [
  "carrier_last_mile",
  "carrier_international",
  "warehouse_supplies",
  "packaging_materials",
  "reverse_logistics",
  "fleet_maintenance",
  "it_and_wms_software",
  "cleaning_and_facilities",
] as const;

export type SupplierCategory = (typeof VALID_CATEGORIES)[number];

export type Supplier = {
  id: number;
  name: string;
  country: SupplierCountry;
  categories: SupplierCategory[];
  rate_per_shipment: number;
  currency: SupplierCurrency;
  status: SupplierStatus;
  updated_at: string;
  service_zone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

export type SupplierCreatePayload = {
  name: string;
  country: SupplierCountry;
  categories: SupplierCategory[];
  rate_per_shipment: number;
  currency: SupplierCurrency;
  status: SupplierStatus;
  service_zone?: string;
  contact_email?: string;
  notes?: string;
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

/** fetch that never lets the browser's raw "Failed to fetch" text reach the UI. */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }
}

/**
 * Fixed, user-facing message for a failed response. Server text is never shown:
 * it can leak internals and is not written for the people using this screen.
 */
async function apiError(response: Response, fallback: string): Promise<Error> {
  // Drain the body so a non-JSON error surfaces in dev logs, not in the UI.
  try {
    await response.json();
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[suppliersApi] Error response was not JSON (status ${response.status}).`,
      );
    }
  }

  const { status } = response;
  if (status === 400 || status === 422) {
    return new Error(
      "Some of the details were not valid. Review the fields and try again.",
    );
  }
  if (status === 404) {
    return new Error("That supplier could not be found. Refresh and try again.");
  }
  if (status >= 500) {
    return new Error(
      "The server had a problem with this request. Please try again in a moment.",
    );
  }
  return new Error(fallback);
}

export async function listSuppliers(filters?: {
  country?: string;
  category?: string;
}): Promise<Supplier[]> {
  const params = new URLSearchParams();
  if (filters?.country) params.set("country", filters.country);
  if (filters?.category) params.set("category", filters.category);
  const qs = params.toString();
  const url = `${getBaseUrl()}/api/suppliers/${qs ? `?${qs}` : ""}`;
  const response = await apiFetch(url);
  if (!response.ok) {
    throw await apiError(
      response,
      "Could not load suppliers. Please try again.",
    );
  }
  return (await response.json()) as Supplier[];
}

export async function createSupplier(
  payload: SupplierCreatePayload,
): Promise<Supplier> {
  const response = await apiFetch(`${getBaseUrl()}/api/suppliers/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await apiError(
      response,
      "Could not register the supplier. Please try again.",
    );
  }
  return (await response.json()) as Supplier;
}

export async function updateSupplierRate(
  id: number,
  rate_per_shipment: number,
): Promise<Supplier> {
  const response = await apiFetch(`${getBaseUrl()}/api/suppliers/${id}/rate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rate_per_shipment }),
  });
  if (!response.ok) {
    throw await apiError(response, "Could not update the rate. Please try again.");
  }
  return (await response.json()) as Supplier;
}

export async function updateSupplierStatus(
  id: number,
  status: SupplierStatus,
): Promise<Supplier> {
  const response = await apiFetch(`${getBaseUrl()}/api/suppliers/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw await apiError(
      response,
      "Could not update the status. Please try again.",
    );
  }
  return (await response.json()) as Supplier;
}
