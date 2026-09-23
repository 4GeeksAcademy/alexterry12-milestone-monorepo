"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  BRANCH_OPTIONS,
  CATEGORY_OPTIONS,
  IncidentApiError,
  ORIGIN_OPTIONS,
  STATUS_OPTIONS,
  createIncident,
  type IncidentBranch,
  type IncidentCategory,
  type IncidentCreatePayload,
  type IncidentOrigin,
  type IncidentStatus,
} from "@/lib/incidentManagerApi";

const inputClass =
  "min-h-12 w-full rounded-md border border-line bg-canvas px-3 py-3 text-base text-ink outline-none focus:border-accent";
const labelClass = "flex flex-col gap-1 text-base font-medium text-ink";

const emptyForm: IncidentCreatePayload = {
  title: "",
  description: "",
  category: "lost_parcel",
  origin: "branch",
  branch: "central",
  status: "open",
};

type FieldErrors = Partial<Record<keyof IncidentCreatePayload, string>>;

export default function NewIncidentPage() {
  const [form, setForm] = useState<IncidentCreatePayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validateClient(payload: IncidentCreatePayload): FieldErrors {
    const errors: FieldErrors = {};
    if (!payload.title.trim()) errors.title = "Title is required.";
    if (!payload.description.trim()) {
      errors.description = "Description is required.";
    }
    if (!payload.category) errors.category = "Category is required.";
    if (!payload.origin) errors.origin = "Origin is required.";
    if (!payload.branch) errors.branch = "Branch is required.";
    if (!payload.status) errors.status = "Status is required.";
    return errors;
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    setBannerError(null);
    setSuccess(false);

    const payload: IncidentCreatePayload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
    };
    const clientErrors = validateClient(payload);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await createIncident(payload);
      setForm(emptyForm);
      setSuccess(true);
    } catch (err) {
      if (err instanceof IncidentApiError && err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setBannerError(
          err instanceof Error
            ? err.message
            : "Could not register the incident. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const branchHighlighted = form.origin === "branch";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Operations
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Register incident
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Log an operational incident for Carlos, Ana, or Valentina&apos;s
          teams. Use the branch field to mark where it was reported.
        </p>
      </div>

      {bannerError && !submitting && (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-base text-red-700"
          role="alert"
        >
          <p>{bannerError}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void onSubmit()}
              className="min-h-12 rounded-md border border-red-300 bg-surface px-4 py-2 text-base font-medium text-red-700 hover:bg-red-100"
            >
              Try again
            </button>
            <Link
              href="/incident-manager"
              className="text-base font-medium text-red-700 underline"
            >
              Back to Incident Manager
            </Link>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-base text-green-800">
          Incident registered.{" "}
          <Link
            href="/incident-manager"
            className="font-medium text-accent hover:underline"
          >
            Back to Incident Manager
          </Link>
        </div>
      )}

      <section className="rounded-lg border border-line bg-surface p-5">
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex flex-col gap-5"
        >
          <label className={labelClass}>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className={inputClass}
              disabled={submitting}
            />
            {fieldErrors.title && (
              <span className="text-sm text-red-600">{fieldErrors.title}</span>
            )}
          </label>

          <label className={labelClass}>
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className={`${inputClass} min-h-28`}
              disabled={submitting}
            />
            {fieldErrors.description && (
              <span className="text-sm text-red-600">
                {fieldErrors.description}
              </span>
            )}
          </label>

          <label className={labelClass}>
            Category
            <select
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  category: e.target.value as IncidentCategory,
                }))
              }
              className={inputClass}
              disabled={submitting}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <span className="text-sm text-red-600">
                {fieldErrors.category}
              </span>
            )}
          </label>

          <label className={labelClass}>
            Origin
            <select
              value={form.origin}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  origin: e.target.value as IncidentOrigin,
                }))
              }
              className={inputClass}
              disabled={submitting}
            >
              {ORIGIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.origin && (
              <span className="text-sm text-red-600">{fieldErrors.origin}</span>
            )}
          </label>

          <label className={labelClass}>
            Branch
            <select
              value={form.branch}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  branch: e.target.value as IncidentBranch,
                }))
              }
              className={`${inputClass} ${
                branchHighlighted ? "border-accent ring-2 ring-accent/30" : ""
              }`}
              disabled={submitting}
            >
              {BRANCH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {branchHighlighted && (
              <span className="text-sm text-muted">
                You are reporting from a specific TrackFlow location.
              </span>
            )}
            {fieldErrors.branch && (
              <span className="text-sm text-red-600">{fieldErrors.branch}</span>
            )}
          </label>

          <label className={labelClass}>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as IncidentStatus,
                }))
              }
              className={inputClass}
              disabled={submitting}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.status && (
              <span className="text-sm text-red-600">{fieldErrors.status}</span>
            )}
          </label>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-12 rounded-md bg-accent px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {submitting ? "Registering…" : "Register incident"}
            </button>
            <Link
              href="/incident-manager"
              className="text-base font-medium text-accent hover:underline"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
