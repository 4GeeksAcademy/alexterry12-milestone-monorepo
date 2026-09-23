"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/authApi";

const TOKEN_KEY = "trackflow_token";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showResetSuccess = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">
        Authentication
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Sign in
      </h1>

      {showResetSuccess && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          Password reset successfully. You can sign in with your new password.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <p className="text-sm text-muted">
          <Link
            href="/forgot-password"
            className="font-medium text-accent hover:underline"
          >
            Forgot your password?
          </Link>
        </p>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Register
        </Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">
            Authentication
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Sign in
          </h1>
          <p className="mt-6 text-sm text-muted">Loading…</p>
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
