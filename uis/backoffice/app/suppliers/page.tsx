"use client";

import { useCallback, useEffect, useState } from "react";
import {
  VALID_CATEGORIES,
  createSupplier,
  listSuppliers,
  updateSupplierRate,
  updateSupplierStatus,
  type Supplier,
  type SupplierCategory,
  type SupplierCountry,
  type SupplierCreatePayload,
  type SupplierCurrency,
  type SupplierStatus,
} from "@/lib/suppliersApi";

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

function StatusBadge({ status }: { status: SupplierStatus }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${
        active
          ? "bg-teal-100 text-teal-800"
          : "bg-amber-100 text-amber-900"
      }`}
    >
      {status}
    </span>
  );
}

const emptyForm: SupplierCreatePayload = {
  name: "",
  country: "USA",
  categories: ["carrier_last_mile"],
  rate_per_shipment: 1,
  currency: "USD",
  status: "active",
  service_zone: "",
  contact_email: "",
  notes: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierCreatePayload>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<number, boolean>>({});

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSuppliers({
        country: countryFilter || undefined,
        category: categoryFilter || undefined,
      });
      setSuppliers(data);
      const drafts: Record<number, string> = {};
      for (const s of data) {
        drafts[s.id] = String(s.rate_per_shipment);
      }
      setRateDrafts(drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [countryFilter, categoryFilter]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const onCountryChange = (country: SupplierCountry) => {
    setForm((prev) => ({
      ...prev,
      country,
      currency: (country === "USA" ? "USD" : "EUR") as SupplierCurrency,
    }));
  };

  const toggleCategory = (category: SupplierCategory) => {
    setForm((prev) => {
      const has = prev.categories.includes(category);
      const categories = has
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories };
    });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload: SupplierCreatePayload = {
        ...form,
        name: form.name.trim(),
        service_zone: form.service_zone?.trim() || undefined,
        contact_email: form.contact_email?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      await createSupplier(payload);
      setForm({
        ...emptyForm,
        country: form.country,
        currency: form.currency,
      });
      await loadSuppliers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSaveRate = async (supplier: Supplier) => {
    const raw = rateDrafts[supplier.id];
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Rate must be a number greater than zero.");
      return;
    }
    setRowBusy((prev) => ({ ...prev, [supplier.id]: true }));
    setError(null);
    try {
      const updated = await updateSupplierRate(supplier.id, value);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      setRateDrafts((prev) => ({
        ...prev,
        [updated.id]: String(updated.rate_per_shipment),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rate update failed.");
      setRateDrafts((prev) => ({
        ...prev,
        [supplier.id]: String(supplier.rate_per_shipment),
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [supplier.id]: false }));
    }
  };

  const onToggleStatus = async (supplier: Supplier) => {
    const next: SupplierStatus =
      supplier.status === "active" ? "suspended" : "active";
    setRowBusy((prev) => ({ ...prev, [supplier.id]: true }));
    setError(null);
    try {
      const updated = await updateSupplierStatus(supplier.id, next);
      setSuppliers((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setRowBusy((prev) => ({ ...prev, [supplier.id]: false }));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Carrier Operations
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Supplier directory
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Central registry for Carlos and Ana — filter by market and category,
          register suppliers, adjust rates, and suspend or reactivate contracts.
        </p>
      </div>

      <Section title="Filters">
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs text-muted">Country</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink"
            >
              <option value="">All</option>
              <option value="USA">USA</option>
              <option value="Spain">Spain</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs text-muted">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink"
            >
              <option value="">All</option>
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <Section title="Directory">
        {loading ? (
          <p className="font-mono text-sm text-muted">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Country</th>
                  <th className="px-2 py-2 font-medium">Categories</th>
                  <th className="px-2 py-2 font-medium">Rate</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const busy = rowBusy[supplier.id];
                  return (
                    <tr
                      key={supplier.id}
                      className="border-b border-line/70 align-top last:border-0"
                    >
                      <td className="px-2 py-3 font-medium text-ink">
                        {supplier.name}
                      </td>
                      <td className="px-2 py-3 font-mono text-muted">
                        {supplier.country}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {supplier.categories.map((cat) => (
                            <span
                              key={cat}
                              className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-ink"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={rateDrafts[supplier.id] ?? ""}
                            disabled={busy}
                            onChange={(e) =>
                              setRateDrafts((prev) => ({
                                ...prev,
                                [supplier.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void onSaveRate(supplier);
                              }
                            }}
                            className="w-24 rounded-md border border-line bg-canvas px-2 py-1 font-mono text-sm"
                          />
                          <span className="font-mono text-xs text-muted">
                            {supplier.currency}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onSaveRate(supplier)}
                            className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-60"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge status={supplier.status} />
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onToggleStatus(supplier)}
                          className="rounded-md bg-panel px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-ink disabled:opacity-60"
                        >
                          {supplier.status === "active"
                            ? "Suspend"
                            : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {suppliers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-2 py-6 text-center text-sm text-muted"
                    >
                      No suppliers match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Register supplier">
        <form onSubmit={(e) => void onCreate(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-mono text-xs text-muted">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-md border border-line bg-canvas px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-muted">Country</span>
              <select
                value={form.country}
                onChange={(e) =>
                  onCountryChange(e.target.value as SupplierCountry)
                }
                className="rounded-md border border-line bg-canvas px-3 py-2"
              >
                <option value="USA">USA</option>
                <option value="Spain">Spain</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-muted">Currency</span>
              <input
                value={form.currency}
                readOnly
                className="rounded-md border border-line bg-canvas/80 px-3 py-2 font-mono text-muted"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-muted">
                Rate per shipment
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.rate_per_shipment}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rate_per_shipment: Number(e.target.value),
                  })
                }
                className="rounded-md border border-line bg-canvas px-3 py-2 font-mono"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-muted">Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as SupplierStatus,
                  })
                }
                className="rounded-md border border-line bg-canvas px-3 py-2"
              >
                <option value="active">active</option>
                <option value="suspended">suspended</option>
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 font-mono text-xs text-muted">
              Categories (at least one)
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {VALID_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={form.categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span className="font-mono text-xs">{cat}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-muted">
                Service zone (optional)
              </span>
              <input
                value={form.service_zone ?? ""}
                onChange={(e) =>
                  setForm({ ...form, service_zone: e.target.value })
                }
                className="rounded-md border border-line bg-canvas px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-muted">
                Contact email (optional)
              </span>
              <input
                type="email"
                value={form.contact_email ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contact_email: e.target.value })
                }
                className="rounded-md border border-line bg-canvas px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-mono text-xs text-muted">
                Notes (optional)
              </span>
              <textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="rounded-md border border-line bg-canvas px-3 py-2"
              />
            </label>
          </div>

          {formError ? (
            <p
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || form.categories.length === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Register supplier"}
          </button>
        </form>
      </Section>
    </div>
  );
}
