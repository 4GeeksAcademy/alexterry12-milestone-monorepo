"use client";

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ErrorPanel,
  readInventoryError,
  skuIdFromQuery,
  skuOptionLabel,
  warehouseLabel,
} from "@/components/inventory/shared";
import { createStockEntry, listSkus, type SKU } from "@/lib/inventory";

const inputClass =
  "min-h-12 w-full rounded-md border border-line bg-canvas px-3 py-3 text-base text-ink outline-none focus:border-accent";
const labelClass = "flex flex-col gap-1 text-base font-medium text-ink";
const readonlyClass =
  "min-h-12 w-full rounded-md border border-line bg-canvas/80 px-3 py-3 text-base text-muted";

type FieldErrors = Partial<Record<"sku" | "quantity" | "reference", string>>;

function InboundForm() {
  const searchParams = useSearchParams();
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [skuId, setSkuId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSkus = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await listSkus();
      setSkus(data);
      const nextId = skuIdFromQuery(data, searchParams.get("sku_id"));
      if (nextId) setSkuId(nextId);
    } catch (err) {
      setListError(
        readInventoryError(err, "Could not load SKUs. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const rawSkuId = searchParams.get("sku_id");
    void listSkus()
      .then((data) => {
        if (cancelled) return;
        setSkus(data);
        setListError(null);
        const nextId = skuIdFromQuery(data, rawSkuId);
        if (nextId) setSkuId(nextId);
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
  }, [searchParams]);

  const selectedSku = skus.find((sku) => String(sku.id) === skuId) ?? null;

  function validateClient(): FieldErrors {
    const errors: FieldErrors = {};
    if (!selectedSku) errors.sku = "Choose a SKU.";
    if (!/^\d+$/.test(quantity.trim()) || Number(quantity) < 1) {
      errors.quantity = "Enter a whole number of at least 1.";
    }
    if (!reference.trim()) {
      errors.reference = "Client reference is required.";
    }
    return errors;
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    setBannerError(null);
    setSuccessMessage(null);

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    if (!selectedSku) return;

    const units = Number(quantity);
    const ref = reference.trim();
    setFieldErrors({});
    setSubmitting(true);
    try {
      await createStockEntry({
        sku_id: selectedSku.id,
        quantity: units,
        reference: ref,
        warehouse: selectedSku.warehouse,
      });
      setSkuId("");
      setQuantity("");
      setReference("");
      setSuccessMessage(
        `Goods receipt recorded: ${units} units of ${selectedSku.sku} into ${warehouseLabel(selectedSku.warehouse)}. Reference ${ref}.`,
      );
    } catch (err) {
      setBannerError(
        readInventoryError(
          err,
          "Could not record the goods receipt. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Inventory
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Goods receipt
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Record units received from a client brand at a TrackFlow warehouse.
        </p>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-muted">Loading…</p>
      ) : listError ? (
        <ErrorPanel message={listError} onRetry={() => void loadSkus()} />
      ) : (
        <>
          {bannerError && !submitting ? (
            <div
              className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-base text-red-700"
              role="alert"
            >
              <p>{bannerError}</p>
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-base text-green-800">
              <p>{successMessage}</p>
              <p className="mt-2">
                <Link
                  href="/inventory/products"
                  className="font-medium text-accent hover:underline"
                >
                  View SKUs
                </Link>
              </p>
            </div>
          ) : null}

          <section className="rounded-lg border border-line bg-surface p-5">
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="flex flex-col gap-5"
            >
              <label className={labelClass}>
                SKU
                <select
                  value={skuId}
                  onChange={(e) => setSkuId(e.target.value)}
                  className={inputClass}
                  disabled={submitting}
                >
                  <option value="">Select a SKU</option>
                  {skus.map((sku) => (
                    <option key={sku.id} value={sku.id}>
                      {skuOptionLabel(sku)}
                    </option>
                  ))}
                </select>
                {fieldErrors.sku ? (
                  <span className="text-sm text-red-600">{fieldErrors.sku}</span>
                ) : null}
              </label>

              <label className={labelClass}>
                Warehouse
                <input
                  readOnly
                  value={
                    selectedSku
                      ? warehouseLabel(selectedSku.warehouse)
                      : "Select a SKU"
                  }
                  className={readonlyClass}
                />
              </label>

              <label className={labelClass}>
                Units received
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputClass}
                  disabled={submitting}
                />
                {fieldErrors.quantity ? (
                  <span className="text-sm text-red-600">
                    {fieldErrors.quantity}
                  </span>
                ) : null}
              </label>

              <label className={labelClass}>
                Client reference (PO / dispatch ref.)
                <input
                  type="text"
                  placeholder="e.g. PO-2024-0150"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass}
                  disabled={submitting}
                />
                {fieldErrors.reference ? (
                  <span className="text-sm text-red-600">
                    {fieldErrors.reference}
                  </span>
                ) : null}
              </label>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-12 rounded-md bg-accent px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {submitting ? "Recording…" : "Record goods receipt"}
                </button>
                <Link
                  href="/inventory/products"
                  className="text-base font-medium text-accent hover:underline"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

export default function InboundOrderPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-2xl">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            Inventory
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Goods receipt
          </h1>
          <p className="mt-6 text-sm text-muted">Loading…</p>
        </section>
      }
    >
      <InboundForm />
    </Suspense>
  );
}
