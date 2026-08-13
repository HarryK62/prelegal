"use client";

import { useEffect, useState, type ReactNode } from "react";
import AuthScreen from "@/components/AuthScreen";
import { AuthContext, type User } from "@/lib/auth-context";
import { getCurrentUser, registerUnauthorizedHandler, signOut as apiSignOut } from "@/lib/api";

type Status = "loading" | "signedOut" | "signedIn";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus("signedIn");
      })
      .catch(() => setStatus("signedOut"));
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser((current) => {
        if (current) setSessionExpired(true);
        return null;
      });
      setStatus("signedOut");
    });
    return () => registerUnauthorizedHandler(null);
  }, []);

  function handleAuthenticated(authenticatedUser: User) {
    setUser(authenticatedUser);
    setSessionExpired(false);
    setStatus("signedIn");
  }

  async function handleSignOut() {
    await apiSignOut();
    setUser(null);
    setStatus("signedOut");
  }

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (status === "signedOut" || !user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} sessionExpired={sessionExpired} />;
  }

  return <AuthContext.Provider value={{ user, signOut: handleSignOut }}>{children}</AuthContext.Provider>;
}
