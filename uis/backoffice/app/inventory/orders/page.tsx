"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ErrorPanel,
  MovementTypeBadge,
  formatMovementDate,
  movementReference,
  readInventoryError,
  warehouseLabel,
} from "@/components/inventory/shared";
import { listStockMovements, type StockMovement } from "@/lib/inventory";

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

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      setMovements(await listStockMovements());
    } catch (err) {
      setListError(
        readInventoryError(
          err,
          "Could not load stock movements. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listStockMovements()
      .then((data) => {
        if (!cancelled) {
          setMovements(data);
          setListError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setListError(
            readInventoryError(
              err,
              "Could not load stock movements. Please try again.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Inventory
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Stock movements
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Every goods receipt and dispatch / loss across Los Angeles and
          Zaragoza, newest first. Read-only.
        </p>
      </div>

      <Section title="History">
        {loading ? (
          <p className="font-mono text-sm text-muted">Loading…</p>
        ) : listError ? (
          <ErrorPanel message={listError} onRetry={() => void loadMovements()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 font-medium">Warehouse</th>
                  <th className="px-2 py-2 font-medium">Quantity</th>
                  <th className="px-2 py-2 font-medium">Reference / tracking</th>
                  <th className="px-2 py-2 font-medium">Created by</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr
                    key={`${movement.movement_type}-${movement.id}`}
                    className="border-b border-line/70 align-top last:border-0"
                  >
                    <td className="px-2 py-3 text-ink">
                      {formatMovementDate(movement.created_at)}
                    </td>
                    <td className="px-2 py-3">
                      <MovementTypeBadge movement={movement} />
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-medium text-ink">{movement.sku.name}</p>
                      <p className="font-mono text-xs text-muted">
                        {movement.sku.sku}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-ink">
                      {warehouseLabel(movement.warehouse)}
                    </td>
                    <td className="px-2 py-3 font-mono text-ink">
                      {movement.movement_type === "entry"
                        ? `+${movement.quantity}`
                        : `−${movement.quantity}`}
                    </td>
                    <td className="px-2 py-3 font-mono text-ink">
                      {movementReference(movement)}
                    </td>
                    <td className="px-2 py-3 font-mono text-xs text-muted">
                      {movement.user_uuid}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-6 text-center text-sm text-muted"
                    >
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
