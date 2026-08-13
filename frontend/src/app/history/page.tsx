"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DocumentPreview from "@/components/DocumentPreview";
import Card from "@/components/Card";
import type { DocumentDefinition } from "@/content/documents";
import { fetchDocuments, fetchSavedDocuments, type SavedDocument } from "@/lib/api";

const DownloadPdfButton = dynamic(() => import("@/components/DownloadPdfButton"), { ssr: false });

// SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" in UTC with no offset marker -
// append "Z" so Date parses it as UTC instead of the browser's local time.
function formatDate(iso: string): string {
  const date = new Date(`${iso.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export default function HistoryPage() {
  const [documents, setDocuments] = useState<DocumentDefinition[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchDocuments(), fetchSavedDocuments()])
      .then(([docs, saved]) => {
        setDocuments(docs);
        setSavedDocuments(saved);
        if (saved.length > 0) setSelectedId(saved[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your documents."))
      .finally(() => setLoading(false));
  }, []);

  const selected = savedDocuments.find((doc) => doc.id === selectedId);
  const selectedDefinition = selected ? documents.find((doc) => doc.id === selected.documentType) : undefined;

  function documentName(documentType: string): string {
    return documents.find((doc) => doc.id === documentType)?.name ?? documentType;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Document history</h1>
        <p className="mt-1 text-sm text-zinc-600">Documents you&apos;ve previously drafted with the assistant.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : savedDocuments.length === 0 ? (
        <Card className="text-sm text-zinc-500">
          You haven&apos;t drafted any documents yet. Head back to the home page to start one.
        </Card>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
          <div className="flex flex-col gap-2">
            {savedDocuments.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedId(doc.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  doc.id === selectedId
                    ? "border-teal-600 bg-teal-50 text-teal-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <div className="font-medium">{documentName(doc.documentType)}</div>
                <div className="text-xs text-zinc-500">{formatDate(doc.updatedAt)}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {selectedDefinition && selected ? (
              <>
                <DownloadPdfButton document={selectedDefinition} fields={selected.fields} />
                <DocumentPreview document={selectedDefinition} fields={selected.fields} />
              </>
            ) : (
              <Card className="text-sm text-zinc-500">Select a document to view it.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
