"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, register, RegistrationError } from "@/lib/authApi";

const TOKEN_KEY = "trackflow_token";

type FieldErrors = Record<string, string>;

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await register({
        email,
        password,
        name: name || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });

      const res = await login(email, password);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      router.push("/");
    } catch (err) {
      if (err instanceof RegistrationError) {
        if (err.fieldErrors) {
          const mapped: FieldErrors = {};
          for (const item of err.fieldErrors) {
            const field = String(item.loc[item.loc.length - 1]);
            if (!mapped[field]) {
              mapped[field] = item.msg;
            }
          }
          setFieldErrors(mapped);
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function fieldError(field: string) {
    const msg = fieldErrors[field];
    if (!msg) return null;
    return <p className="mt-1 text-xs text-red-600">{msg}</p>;
  }

  return (
    <section className="mx-auto max-w-md">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">
        Authentication
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Create account
      </h1>

      {generalError && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Email <span className="text-red-500">*</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          {fieldError("email")}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Password <span className="text-red-500">*</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          {fieldError("password")}
        </label>

        <div className="mt-2 h-px w-full bg-line" />
        <p className="text-xs text-muted">Optional profile information</p>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          {fieldError("name")}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          {fieldError("phone")}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Address
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          {fieldError("address")}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
