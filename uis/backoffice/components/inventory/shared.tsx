"use client";

import Link from "next/link";
import {
  InventoryApiError,
  type SKU,
  type StockMovement,
  type Warehouse,
} from "@/lib/inventory";

export function warehouseLabel(warehouse: Warehouse): string {
  if (warehouse === "LA") return "Los Angeles (LA)";
  return "Zaragoza (ZGZ)";
}

export function skuOptionLabel(sku: SKU): string {
  return `${sku.name} · ${sku.sku} · ${warehouseLabel(sku.warehouse)}`;
}

export function readInventoryError(err: unknown, fallback: string): string {
  if (err instanceof InventoryApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function skuIdFromQuery(data: SKU[], raw: string | null): string {
  const id = raw ? Number(raw) : NaN;
  if (Number.isInteger(id) && data.some((sku) => sku.id === id)) {
    return String(id);
  }
  return "";
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <p>{message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-red-300 bg-surface px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Try again
          </button>
        ) : null}
        <Link href="/" className="text-sm font-medium text-red-800 underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatMovementDate(createdAt: string): string {
  const date = new Date(createdAt);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function movementReference(movement: StockMovement): string {
  if (movement.movement_type === "entry") {
    return movement.reference || "—";
  }
  if (movement.exit_type === "loss") return "—";
  return movement.tracking_number || "—";
}

export function MovementTypeBadge({
  movement,
}: {
  movement: StockMovement;
}) {
  if (movement.movement_type === "entry") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 font-mono text-xs font-medium text-teal-800">
        <span aria-hidden="true">↓</span>
        Inbound · Goods receipt
      </span>
    );
  }
  if (movement.exit_type === "loss") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 font-mono text-xs font-medium text-red-800">
        <span aria-hidden="true">↑</span>
        Outbound · Loss
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 font-mono text-xs font-medium text-sky-800">
      <span aria-hidden="true">↑</span>
      Outbound · Dispatch
    </span>
  );
}

export function StockLevelBadge({ stock }: { stock: number }) {
  // Stock-level thresholds (TrackFlow): 0 = Out of stock (red), 1-10 = Low (amber), >10 = Healthy (green).
  let label = "Healthy";
  let symbol = "✓";
  let classes = "bg-teal-100 text-teal-800";
  if (stock === 0) {
    label = "Out of stock";
    symbol = "×";
    classes = "bg-red-100 text-red-800";
  } else if (stock <= 10) {
    label = "Low";
    symbol = "!";
    classes = "bg-amber-100 text-amber-900";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${classes}`}
    >
      <span aria-hidden="true">{symbol}</span>
      {label}
    </span>
  );
}
