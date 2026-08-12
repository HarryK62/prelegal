"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "prelegal:entered";

function noopSubscribe() {
  return () => {};
}

function getEnteredSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

export default function EntryGate({ children }: { children: ReactNode }) {
  // The server has no notion of localStorage, so getServerSnapshot returns
  // false and the persisted value is only read on the client (via
  // useSyncExternalStore) to avoid a hydration mismatch.
  const previouslyEntered = useSyncExternalStore(noopSubscribe, getEnteredSnapshot, getServerSnapshot);
  const [justEntered, setJustEntered] = useState(false);

  function handleContinue() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setJustEntered(true);
  }

  if (!previouslyEntered && !justEntered) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">Prelegal</h1>
          <p className="mt-2 text-sm text-zinc-600">
            No account needed yet — continue as a demo user to try the platform.
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Continue as Demo User
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
