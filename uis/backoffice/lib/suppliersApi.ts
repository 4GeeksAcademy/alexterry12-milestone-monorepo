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

export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("detail" in body)) {
      return fallback;
    }
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            const loc =
              "loc" in item && Array.isArray((item as { loc: unknown }).loc)
                ? (item as { loc: unknown[] }).loc.join(".")
                : "";
            const msg = String((item as { msg: unknown }).msg);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(item);
        })
        .join("; ");
    }
  } catch {
    // ignore
  }
  return fallback;
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
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      await readApiError(response, `List failed (${response.status})`),
    );
  }
  return (await response.json()) as Supplier[];
}

export async function createSupplier(
  payload: SupplierCreatePayload,
): Promise<Supplier> {
  const response = await fetch(`${getBaseUrl()}/api/suppliers/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      await readApiError(response, `Create failed (${response.status})`),
    );
  }
  return (await response.json()) as Supplier;
}

export async function updateSupplierRate(
  id: number,
  rate_per_shipment: number,
): Promise<Supplier> {
  const response = await fetch(`${getBaseUrl()}/api/suppliers/${id}/rate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rate_per_shipment }),
  });
  if (!response.ok) {
    throw new Error(
      await readApiError(response, `Rate update failed (${response.status})`),
    );
  }
  return (await response.json()) as Supplier;
}

export async function updateSupplierStatus(
  id: number,
  status: SupplierStatus,
): Promise<Supplier> {
  const response = await fetch(`${getBaseUrl()}/api/suppliers/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error(
      await readApiError(response, `Status update failed (${response.status})`),
    );
  }
  return (await response.json()) as Supplier;
}
