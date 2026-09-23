"use client";

import { FormEvent, useState } from "react";
import { changePassword } from "@/lib/authApi";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Change password failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-md">
      <p className="font-mono text-xs tracking-widest text-accent uppercase">
        Account
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Change password
      </h1>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          Password changed successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Current password
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

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
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Change password"}
        </button>
      </form>
    </section>
  );
}
