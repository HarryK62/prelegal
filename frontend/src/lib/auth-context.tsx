"use client";

import { createContext, useContext } from "react";

export interface User {
  id: number;
  username: string;
}

interface AuthContextValue {
  user: User;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthGate");
  return ctx;
}
