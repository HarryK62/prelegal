"use client";

import { useState, type FormEvent } from "react";
import Card from "@/components/Card";
import type { User } from "@/lib/auth-context";
import { signIn, signUp } from "@/lib/api";

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";
const labelClass = "block text-sm font-medium text-zinc-800";
const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
  sessionExpired?: boolean;
}

export default function AuthScreen({ onAuthenticated, sessionExpired }: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const user = mode === "signin" ? await signIn(username, password) : await signUp(username, password);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : FALLBACK_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Prelegal</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {mode === "signin"
            ? "Sign in to draft and manage your legal documents."
            : "Create an account to get started."}
        </p>
        {sessionExpired && (
          <p className="mt-2 text-sm text-amber-700">Your session expired. Please sign in again.</p>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className={labelClass}>Username</label>
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-4 text-sm font-medium text-teal-700 hover:underline"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
}
