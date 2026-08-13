"use client";

import { useState } from "react";
import type { FieldMap } from "@/content/documents";
import { postChat, type ChatMessage } from "@/lib/api";

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hi! Tell me what kind of legal agreement you need and I'll help you put it together.",
};

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

interface ChatPanelProps {
  documentType: string;
  fields: FieldMap;
  documentId: number | null;
  onResult: (documentType: string, fields: FieldMap, documentId: number | null) => void;
  onPendingChange?: (pending: boolean) => void;
}

export default function ChatPanel({ documentType, fields, documentId, onResult, onPendingChange }: ChatPanelProps) {
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
      const result = await postChat(nextMessages, documentType, fields, documentId);
      setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
      onResult(result.documentType, result.fields, result.documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : FALLBACK_ERROR_MESSAGE);
    } finally {
      setSending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              message.role === "user" ? "ml-auto bg-teal-700 text-white" : "bg-zinc-100 text-zinc-900"
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
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer…"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
