import type { DocumentDefinition, FieldMap } from "@/content/documents";

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

export async function fetchDocuments(): Promise<DocumentDefinition[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) await parseErrorResponse(response);
  return response.json();
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  documentType: string;
  fields: FieldMap;
}

export async function postChat(
  messages: ChatMessage[],
  documentType: string,
  fields: FieldMap,
): Promise<ChatResult> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      documentType,
      fields: Object.entries(fields).map(([key, value]) => ({ key, value })),
    }),
  });

  if (!response.ok) await parseErrorResponse(response);

  const data: { reply: string; documentType: string; fields: { key: string; value: string }[] } =
    await response.json();

  const fieldMap: FieldMap = {};
  for (const field of data.fields) {
    fieldMap[field.key] = field.value;
  }

  return { reply: data.reply, documentType: data.documentType, fields: fieldMap };
}
