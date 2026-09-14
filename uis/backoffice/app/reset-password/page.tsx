"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/authApi";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [matchError, setMatchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    token ? null : "This reset link is invalid or incomplete.",
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMatchError(null);
    setError(null);

    if (!token) {
      setError("This reset link is invalid or incomplete.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMatchError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset password failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-md">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Authentication
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Reset password
        </h1>

        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          This reset link is invalid or incomplete.
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href="/forgot-password"
            className="font-medium text-accent hover:underline"
          >
            Request a new reset link
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">
        Authentication
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Reset password
      </h1>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          New password
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Confirm new password
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          {matchError && (
            <p className="mt-1 text-xs text-red-600">{matchError}</p>
          )}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Reset password"}
        </button>
      </form>

      {error && (
        <p className="mt-6 text-center text-sm text-muted">
          <Link
            href="/forgot-password"
            className="font-medium text-accent hover:underline"
          >
            Request a new reset link
          </Link>
        </p>
      )}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            Authentication
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Reset password
          </h1>
          <p className="mt-6 text-sm text-muted">Loading…</p>
        </section>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
