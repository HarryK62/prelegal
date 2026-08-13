"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import FieldsForm from "@/components/FieldsForm";
import DocumentPreview from "@/components/DocumentPreview";
import Card from "@/components/Card";
import type { DocumentDefinition, FieldMap } from "@/content/documents";
import { fetchDocuments } from "@/lib/api";

const DownloadPdfButton = dynamic(() => import("@/components/DownloadPdfButton"), {
  ssr: false,
  loading: () => (
    <button
      type="button"
      disabled
      className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-medium text-white opacity-60"
    >
      Preparing…
    </button>
  ),
});

export default function Home() {
  const [documents, setDocuments] = useState<DocumentDefinition[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [fields, setFields] = useState<FieldMap>({});
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [chatPending, setChatPending] = useState(false);
  const [conversationKey, setConversationKey] = useState(0);

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch((err) => setDocumentsError(err instanceof Error ? err.message : "Failed to load documents."));
  }, []);

  const activeDocument = documents.find((doc) => doc.id === documentType);

  function handleChatResult(nextDocumentType: string, nextFields: FieldMap, nextDocumentId: number | null) {
    setDocumentType(nextDocumentType);
    setFields(nextFields);
    setDocumentId(nextDocumentId);
  }

  function handleNewDocument() {
    setDocumentType("");
    setFields({});
    setDocumentId(null);
    setConversationKey((key) => key + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Draft a document</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Chat with the assistant about what you need and it will draft the right agreement for you.
          </p>
          {documentsError && <p className="mt-2 text-sm text-red-600">{documentsError}</p>}
        </div>
        <button
          type="button"
          onClick={handleNewDocument}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          New document
        </button>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ChatPanel
            key={conversationKey}
            documentType={documentType}
            fields={fields}
            documentId={documentId}
            onResult={handleChatResult}
            onPendingChange={setChatPending}
          />

          {activeDocument && (
            <>
              <Card as="details">
                <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                  Review &amp; edit fields
                </summary>
                <fieldset disabled={chatPending} className="mt-6 disabled:opacity-60">
                  <FieldsForm document={activeDocument} fields={fields} onChange={setFields} />
                </fieldset>
              </Card>

              <DownloadPdfButton document={activeDocument} fields={fields} />
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {activeDocument ? (
            <DocumentPreview document={activeDocument} fields={fields} />
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
              Once we&apos;ve figured out which document you need, a live preview will show up here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
