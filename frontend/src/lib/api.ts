import type { DocumentDefinition, FieldMap } from "@/content/documents";
import type { User } from "@/lib/auth-context";

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const { detail } = body as { detail: unknown };

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object" && "msg" in item ? String((item as { msg: unknown }).msg) : null,
      )
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join(" ");
  }

  return null;
}

async function parseErrorResponse(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new Error(extractErrorMessage(body) ?? FALLBACK_ERROR_MESSAGE);
}

// The session cookie can go stale at any time (e.g. a server restart wipes the
// sessions table), not just before the initial AuthGate check. Any apiFetch call can
// hit a 401 well after the user is already looking at the app, so AuthGate registers
// itself here to drop back to the sign-in screen no matter which component made the
// call - otherwise the caller just shows a dead-end "not signed in" error forever.
let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function fieldListToMap(fields: { key: string; value: string }[]): FieldMap {
  const fieldMap: FieldMap = {};
  for (const field of fields) {
    fieldMap[field.key] = field.value;
  }
  return fieldMap;
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { credentials: "same-origin", ...init });

  // A 401 from signin is just "wrong password" during an attempt to authenticate,
  // not an expired session - don't treat it as a global sign-out trigger.
  if (response.status === 401 && path !== "/api/auth/signin") {
    onUnauthorized?.();
  }

  if (!response.ok) await parseErrorResponse(response);
  return response;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiFetch("/api/auth/me");
  return response.json();
}

export async function signUp(username: string, password: string): Promise<User> {
  const response = await apiFetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function signIn(username: string, password: string): Promise<User> {
  const response = await apiFetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function signOut(): Promise<void> {
  await apiFetch("/api/auth/signout", { method: "POST" });
}

export async function fetchDocuments(): Promise<DocumentDefinition[]> {
  const response = await apiFetch("/api/documents");
  return response.json();
}

export interface SavedDocument {
  id: number;
  documentType: string;
  fields: FieldMap;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSavedDocuments(): Promise<SavedDocument[]> {
  const response = await apiFetch("/api/saved-documents");
  const data: { id: number; documentType: string; fields: { key: string; value: string }[]; createdAt: string; updatedAt: string }[] =
    await response.json();
  return data.map((doc) => ({ ...doc, fields: fieldListToMap(doc.fields) }));
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  documentType: string;
  fields: FieldMap;
  documentId: number | null;
}

export async function postChat(
  messages: ChatMessage[],
  documentType: string,
  fields: FieldMap,
  documentId: number | null,
): Promise<ChatResult> {
  const response = await apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      documentType,
      fields: Object.entries(fields).map(([key, value]) => ({ key, value })),
      documentId,
    }),
  });

  const data: {
    reply: string;
    documentType: string;
    fields: { key: string; value: string }[];
    documentId: number | null;
  } = await response.json();

  return {
    reply: data.reply,
    documentType: data.documentType,
    fields: fieldListToMap(data.fields),
    documentId: data.documentId,
  };
}
