"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (res.ok) {
      router.push("/app");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-ink p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <svg viewBox="0 0 100 100" className="mx-auto h-14 w-14" aria-hidden>
            <path fill="#b0322c" d="M44 6h12l40 88H70L52 54 40 78l8 2-16 14H4z" />
          </svg>
          <h1 className="mt-3 text-xl font-extrabold tracking-wide text-white">
            ALPS ACADEMY
          </h1>
          <p className="text-sm text-white/60">Management Platform</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-xl">
          <label className="block text-sm font-semibold" htmlFor="id">
            Email or phone
          </label>
          <input
            id="id"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="pw">
            Password
          </label>
          <input
            id="pw"
            type="password"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && (
            <p className="mt-3 rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark" role="alert">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-5 w-full rounded-full bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-white/40">
          Accounts are created by the academy. No self-registration.
        </p>
      </div>
    </main>
  );
}
