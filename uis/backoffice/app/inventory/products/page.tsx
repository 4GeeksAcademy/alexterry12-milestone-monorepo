"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ErrorPanel,
  StockLevelBadge,
  readInventoryError,
  warehouseLabel,
} from "@/components/inventory/shared";
import { listSkus, type SKU } from "@/lib/inventory";

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

export default function InventoryProductsPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadSkus = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      setSkus(await listSkus());
    } catch (err) {
      setListError(
        readInventoryError(err, "Could not load SKUs. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listSkus()
      .then((data) => {
        if (!cancelled) {
          setSkus(data);
          setListError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setListError(
            readInventoryError(err, "Could not load SKUs. Please try again."),
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
          SKUs
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Product catalogue for Los Angeles and Zaragoza — current stock is
          computed per SKU per warehouse and is never stored.
        </p>
      </div>

      <Section title="Catalogue">
        {loading ? (
          <p className="font-mono text-sm text-muted">Loading…</p>
        ) : listError ? (
          <ErrorPanel message={listError} onRetry={() => void loadSkus()} />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Stock levels:{" "}
              <span className="font-medium text-ink">× Out of stock</span> (0
              units), <span className="font-medium text-ink">! Low</span> (1–10
              units), <span className="font-medium text-ink">✓ Healthy</span>{" "}
              (more than 10 units).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                    <th className="px-2 py-2 font-medium">SKU code</th>
                    <th className="px-2 py-2 font-medium">Product</th>
                    <th className="px-2 py-2 font-medium">Client brand</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Warehouse</th>
                    <th className="px-2 py-2 font-medium">Current stock</th>
                    <th className="px-2 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {skus.map((sku) => (
                    <tr
                      key={sku.id}
                      className="border-b border-line/70 align-top last:border-0"
                    >
                      <td className="px-2 py-3 font-mono text-ink">{sku.sku}</td>
                      <td className="px-2 py-3 font-medium text-ink">
                        {sku.name}
                      </td>
                      <td className="px-2 py-3 text-ink">{sku.client_name}</td>
                      <td className="px-2 py-3 font-mono text-muted">
                        {sku.category}
                      </td>
                      <td className="px-2 py-3 text-ink">
                        {warehouseLabel(sku.warehouse)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-ink">
                            {sku.current_stock}
                          </span>
                          <StockLevelBadge stock={sku.current_stock} />
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/inventory/orders/inbound?sku_id=${sku.id}`}
                            className="text-sm font-medium text-accent underline hover:text-accent-hover"
                          >
                            Record goods receipt
                          </Link>
                          <Link
                            href={`/inventory/orders/outbound?sku_id=${sku.id}`}
                            className="text-sm font-medium text-accent underline hover:text-accent-hover"
                          >
                            Record dispatch / loss
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {skus.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-2 py-6 text-center text-sm text-muted"
                      >
                        No SKUs registered yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
