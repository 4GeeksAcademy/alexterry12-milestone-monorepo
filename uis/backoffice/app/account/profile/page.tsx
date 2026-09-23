"use client";

import { FormEvent, useEffect, useState } from "react";
import { getMe, updateProfile } from "@/lib/authApi";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const me = await getMe();
        if (cancelled) return;
        setEmail(me.email);
        setName(me.profile?.name ?? "");
        setPhone(me.profile?.phone ?? "");
        setAddress(me.profile?.address ?? "");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const updated = await updateProfile({
        name,
        phone,
        address,
      });
      setName(updated.name ?? "");
      setPhone(updated.phone ?? "");
      setAddress(updated.address ?? "");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-md">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Account
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Profile
        </h1>
        <p className="mt-6 text-sm text-muted">Loading…</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">
        Account
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Profile
      </h1>

      <p className="mt-4 text-sm text-muted">
        Signed in as{" "}
        <span className="font-medium text-ink">{email}</span>
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          Profile saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Address
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}
