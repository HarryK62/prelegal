"use client";

import { useState } from "react";
import type { CoverPageValues } from "@/content/mutual-nda";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you fill in the Mutual NDA cover page. Tell me a bit about the deal — who are the two parties, and why are you sharing confidential information?",
};

interface ChatPanelProps {
  fields: CoverPageValues;
  onFieldsChange: (fields: CoverPageValues) => void;
  onPendingChange?: (pending: boolean) => void;
}

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

export default function ChatPanel({ fields, onFieldsChange, onPendingChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    onPendingChange?.(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/mutual-nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, fields }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(body) ?? FALLBACK_ERROR_MESSAGE);
      }

      const data: { reply: string; fields: CoverPageValues } = await response.json();
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      onFieldsChange(data.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : FALLBACK_ERROR_MESSAGE);
    } finally {
      setSending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border border-zinc-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              message.role === "user" ? "ml-auto bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"
            }`}
          >
            {message.content}
          </div>
        ))}
        {sending && <div className="text-xs text-zinc-500">Thinking…</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>

      <form
        className="flex gap-2 border-t border-zinc-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <input
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer…"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
