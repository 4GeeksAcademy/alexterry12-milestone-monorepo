/**
 * Client for TrackFlow company API — inventory products and stock movements.
 */

import {
  authHeaders,
  readApiError,
  redirectIfUnauthorized,
} from "@/lib/authApi";

export type SKUCategory = "fashion" | "electronics" | "cosmetics";
export type Warehouse = "LA" | "ZGZ";
export type ExitType = "dispatch" | "loss";

export type SKU = {
  id: number;
  name: string;
  sku: string;
  client_name: string;
  category: SKUCategory;
  warehouse: Warehouse;
  current_stock: number;
};

export type SKUSummary = {
  id: number;
  name: string;
  sku: string;
  client_name: string;
  warehouse: Warehouse;
};

export type StockEntryCreate = {
  sku_id: number;
  quantity: number;
  reference: string;
  warehouse: Warehouse;
};

export type StockExitCreate = {
  sku_id: number;
  quantity: number;
  exit_type: ExitType;
  tracking_number: string | null;
  warehouse: Warehouse;
};

export type StockEntry = {
  id: number;
  sku_id: number;
  quantity: number;
  reference: string;
  warehouse: Warehouse;
  created_at: string;
  user_uuid: string;
  sku: SKUSummary;
};

export type StockExit = {
  id: number;
  sku_id: number;
  quantity: number;
  exit_type: ExitType;
  tracking_number: string | null;
  warehouse: Warehouse;
  created_at: string;
  user_uuid: string;
  sku: SKUSummary;
};

export type StockMovement = {
  movement_type: "entry" | "exit";
  id: number;
  sku_id: number;
  quantity: number;
  warehouse: Warehouse;
  created_at: string;
  user_uuid: string;
  reference?: string | null;
  exit_type?: ExitType | null;
  tracking_number?: string | null;
  sku: SKUSummary;
};

export class InventoryApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InventoryApiError";
    this.status = status;
  }
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_INVENTORY_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_INVENTORY_API_URL is not set in .env.local.",
    );
  }
  return baseUrl.replace(/\/$/, "");
}

async function inventoryFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new InventoryApiError(
      "Can't reach the inventory service. Check that the API is running.",
      0,
    );
  }
}

async function throwInventoryError(response: Response): Promise<never> {
  redirectIfUnauthorized(response);
  const fallback = `The inventory service returned an error (${response.status}). Please try again.`;
  const err = await readApiError(response, fallback);
  const message =
    typeof err === "string"
      ? err
      : err
          .map((item) => item.msg)
          .filter((msg) => msg.length > 0)
          .join(" ");
  throw new InventoryApiError(message || fallback, response.status);
}

export async function listSkus(): Promise<SKU[]> {
  const response = await inventoryFetch(`${getBaseUrl()}/inventory/products`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    await throwInventoryError(response);
  }
  return (await response.json()) as SKU[];
}

export async function getSku(id: number): Promise<SKU> {
  const response = await inventoryFetch(
    `${getBaseUrl()}/inventory/products/${id}`,
    { headers: authHeaders() },
  );
  if (!response.ok) {
    await throwInventoryError(response);
  }
  return (await response.json()) as SKU;
}

export async function createStockEntry(
  body: StockEntryCreate,
): Promise<StockEntry> {
  const response = await inventoryFetch(
    `${getBaseUrl()}/inventory/orders/inbound`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    await throwInventoryError(response);
  }
  return (await response.json()) as StockEntry;
}

export async function createStockExit(
  body: StockExitCreate,
): Promise<StockExit> {
  const response = await inventoryFetch(
    `${getBaseUrl()}/inventory/orders/outbound`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    await throwInventoryError(response);
  }
  return (await response.json()) as StockExit;
}

export async function listStockMovements(): Promise<StockMovement[]> {
  const response = await inventoryFetch(`${getBaseUrl()}/inventory/orders`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    await throwInventoryError(response);
  }
  return (await response.json()) as StockMovement[];
}
