"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          Prelegal
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/history" className="text-zinc-600 hover:text-zinc-900">
            History
          </Link>
          <span className="text-zinc-600">{user.username}</span>
          <button type="button" onClick={signOut} className="font-medium text-teal-700 hover:underline">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
