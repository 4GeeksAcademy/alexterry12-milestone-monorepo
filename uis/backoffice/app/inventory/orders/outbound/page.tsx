"use client";

import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ErrorPanel,
  StockLevelBadge,
  readInventoryError,
  skuIdFromQuery,
  skuOptionLabel,
  warehouseLabel,
} from "@/components/inventory/shared";
import {
  InventoryApiError,
  createStockExit,
  getSku,
  listSkus,
  type ExitType,
  type SKU,
} from "@/lib/inventory";

const inputClass =
  "min-h-12 w-full rounded-md border border-line bg-canvas px-3 py-3 text-base text-ink outline-none focus:border-accent";
const labelClass = "flex flex-col gap-1 text-base font-medium text-ink";
const readonlyClass =
  "min-h-12 w-full rounded-md border border-line bg-canvas/80 px-3 py-3 text-base text-muted";

type FieldErrors = Partial<Record<"sku" | "quantity" | "tracking", string>>;

function OutboundForm() {
  const searchParams = useSearchParams();
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [skuId, setSkuId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [exitType, setExitType] = useState<ExitType>("dispatch");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [freshSku, setFreshSku] = useState<SKU | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockTick, setStockTick] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [quantityApiError, setQuantityApiError] = useState<string | null>(null);
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
      if (nextId) {
        setSkuId(nextId);
        setStockLoading(true);
      }
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
        if (nextId) {
          setSkuId(nextId);
          setStockLoading(true);
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
  }, [searchParams]);

  useEffect(() => {
    if (!skuId) return;

    const requestedId = Number(skuId);
    let cancelled = false;
    void getSku(requestedId)
      .then((sku) => {
        if (!cancelled) setFreshSku(sku);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFreshSku(null);
          setStockError(
            readInventoryError(err, "Could not load available stock."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skuId, stockTick]);

  const selectedSku = skus.find((sku) => String(sku.id) === skuId) ?? null;
  const available = freshSku?.current_stock;
  const stockWarehouse = freshSku?.warehouse ?? selectedSku?.warehouse;

  function validateClient(): FieldErrors {
    const errors: FieldErrors = {};
    if (!selectedSku) errors.sku = "Choose a SKU.";
    if (!/^\d+$/.test(quantity.trim()) || Number(quantity) < 1) {
      errors.quantity = "Enter a whole number of at least 1.";
    }
    if (exitType === "dispatch" && !trackingNumber.trim()) {
      errors.tracking = "Carrier tracking number is required.";
    }
    return errors;
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    setBannerError(null);
    setQuantityApiError(null);
    setSuccessMessage(null);

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    if (!selectedSku) return;

    const units = Number(quantity);
    const tracking = exitType === "dispatch" ? trackingNumber.trim() : null;
    setFieldErrors({});
    setSubmitting(true);
    try {
      await createStockExit({
        sku_id: selectedSku.id,
        quantity: units,
        exit_type: exitType,
        tracking_number: tracking,
        warehouse: selectedSku.warehouse,
      });
      setQuantity("");
      setTrackingNumber("");
      if (exitType === "dispatch") {
        setSuccessMessage(
          `Dispatch recorded: ${units} units of ${selectedSku.sku} from ${warehouseLabel(selectedSku.warehouse)}. Tracking ${tracking}.`,
        );
      } else {
        setSuccessMessage(
          `Loss recorded: ${units} units of ${selectedSku.sku} from ${warehouseLabel(selectedSku.warehouse)}.`,
        );
      }
      setStockError(null);
      setStockLoading(true);
      setStockTick((tick) => tick + 1);
    } catch (err) {
      if (err instanceof InventoryApiError && err.status === 400) {
        setQuantityApiError(err.message);
      } else {
        setBannerError(
          readInventoryError(
            err,
            "Could not record the dispatch / loss. Please try again.",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const unitsValue = Number(quantity);
  const showOverStockWarning =
    selectedSku &&
    available !== undefined &&
    /^\d+$/.test(quantity.trim()) &&
    unitsValue >= 1 &&
    unitsValue > available;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Inventory
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Dispatch / loss
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Record units leaving a TrackFlow warehouse: a customer dispatch or a
          confirmed loss.
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
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSkuId(nextId);
                    setFreshSku(null);
                    setStockError(null);
                    setStockLoading(Boolean(nextId));
                  }}
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

              <div className="flex flex-col gap-1 text-base font-medium text-ink">
                Available stock
                {!skuId ? (
                  <p className={readonlyClass}>Select a SKU</p>
                ) : stockLoading ? (
                  <p className="font-mono text-sm text-muted">
                    Checking stock…
                  </p>
                ) : stockError ? (
                  <div
                    className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {stockError}
                  </div>
                ) : freshSku && stockWarehouse ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={readonlyClass}>
                      Available in {warehouseLabel(stockWarehouse)}:{" "}
                      {freshSku.current_stock} units
                    </p>
                    <StockLevelBadge stock={freshSku.current_stock} />
                  </div>
                ) : null}
              </div>

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

              <fieldset className="flex flex-col gap-2">
                <legend className={labelClass}>Exit type</legend>
                <label className="flex items-center gap-2 text-base text-ink">
                  <input
                    type="radio"
                    name="exit_type"
                    value="dispatch"
                    checked={exitType === "dispatch"}
                    onChange={() => setExitType("dispatch")}
                    disabled={submitting}
                  />
                  Dispatch (customer shipment)
                </label>
                <label className="flex items-center gap-2 text-base text-ink">
                  <input
                    type="radio"
                    name="exit_type"
                    value="loss"
                    checked={exitType === "loss"}
                    onChange={() => setExitType("loss")}
                    disabled={submitting}
                  />
                  Loss (damage or discrepancy)
                </label>
              </fieldset>

              {exitType === "dispatch" ? (
                <label className={labelClass}>
                  Carrier tracking number
                  <input
                    type="text"
                    placeholder="e.g. 1Z999AA10123456784"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className={inputClass}
                    disabled={submitting}
                  />
                  {fieldErrors.tracking ? (
                    <span className="text-sm text-red-600">
                      {fieldErrors.tracking}
                    </span>
                  ) : null}
                </label>
              ) : null}

              <label className={labelClass}>
                Units dispatched / written off
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
                {showOverStockWarning && available !== undefined && stockWarehouse ? (
                  <span className="text-sm text-amber-800">
                    Only {available} units available in{" "}
                    {warehouseLabel(stockWarehouse)}. The API will reject this.
                  </span>
                ) : null}
                {quantityApiError ? (
                  <span className="text-sm text-red-600" role="alert">
                    {quantityApiError}
                  </span>
                ) : null}
              </label>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-12 rounded-md bg-accent px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {submitting ? "Recording…" : "Record dispatch / loss"}
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

export default function OutboundOrderPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-2xl">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            Inventory
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Dispatch / loss
          </h1>
          <p className="mt-6 text-sm text-muted">Loading…</p>
        </section>
      }
    >
      <OutboundForm />
    </Suspense>
  );
}
