"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCandidate, updateCandidate } from "@/lib/api";

type FieldErrors = {
  full_name?: string;
  email?: string;
  position?: string;
};

export default function EditCandidatePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoadError("Candidate not found");
      setLoading(false);
      return;
    }

    const candidateId = id;

    async function loadCandidate() {
      try {
        setLoadError(null);
        const candidate = await getCandidate(candidateId);
        setFullName(candidate.full_name);
        setEmail(candidate.email);
        setPhone(candidate.phone);
        setPosition(candidate.position);
        setLinkedinUrl(candidate.linkedin_url ?? "");
        setCvUrl(candidate.cv_url ?? "");
        setExperienceYears(String(candidate.experience_years));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Candidate not found";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    }

    loadCandidate();
  }, [id]);

  useEffect(() => {
    if (!submitSuccess || !id) {
      return;
    }

    const timer = setTimeout(() => {
      router.push(`/candidates/${id}`);
    }, 1500);

    return () => clearTimeout(timer);
  }, [submitSuccess, id, router]);

  function validateRequiredFields(): FieldErrors {
    const errors: FieldErrors = {};

    if (!fullName.trim()) {
      errors.full_name = "Name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    }

    if (!position.trim()) {
      errors.position = "Position is required";
    }

    return errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(false);

    const errors = validateRequiredFields();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await updateCandidate(id, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        position: position.trim(),
        linkedin_url: linkedinUrl.trim() || null,
        cv_url: cvUrl.trim() || null,
        experience_years: Number(experienceYears) || 0,
      });

      setSubmitSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update candidate, please try again";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-2xl">
        {id && (
          <Link
            href={`/candidates/${id}`}
            className="mb-6 inline-block text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
          >
            ← Back to candidate
          </Link>
        )}

        <header className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            TrackFlow People &amp; Talent
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Edit Candidate — TrackFlow Zaragoza
          </h1>
        </header>

        {loading && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-6 py-8 text-zinc-600">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
              aria-hidden="true"
            />
            <p>Loading candidate…</p>
          </div>
        )}

        {!loading && loadError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-800"
            role="alert"
          >
            <p className="font-medium">Unable to load candidate</p>
            <p className="mt-1 text-sm text-red-700">{loadError}</p>
          </div>
        )}

        {!loading && !loadError && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            {submitSuccess && (
              <div
                className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                role="status"
              >
                Candidate updated successfully. Redirecting to their profile…
              </div>
            )}

            {submitError && (
              <div
                className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {submitError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
                {fieldErrors.full_name && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Position <span className="text-red-600">*</span>
                </label>
                <input
                  id="position"
                  type="text"
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
                {fieldErrors.position && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.position}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="linkedin_url"
                  className="block text-sm font-medium text-zinc-700"
                >
                  LinkedIn
                </label>
                <input
                  id="linkedin_url"
                  type="url"
                  value={linkedinUrl}
                  onChange={(event) => setLinkedinUrl(event.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="cv_url"
                  className="block text-sm font-medium text-zinc-700"
                >
                  CV link
                </label>
                <input
                  id="cv_url"
                  type="url"
                  value={cvUrl}
                  onChange={(event) => setCvUrl(event.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
              </div>

              <div>
                <label
                  htmlFor="experience_years"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Years of experience
                </label>
                <input
                  id="experience_years"
                  type="number"
                  min="0"
                  step="0.5"
                  value={experienceYears}
                  onChange={(event) => setExperienceYears(event.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || submitSuccess}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
