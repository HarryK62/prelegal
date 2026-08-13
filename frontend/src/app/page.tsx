"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ChatPanel from "@/components/ChatPanel";
import FieldsForm from "@/components/FieldsForm";
import DocumentPreview from "@/components/DocumentPreview";
import type { DocumentDefinition, FieldMap } from "@/content/documents";
import { fetchDocuments } from "@/lib/api";

const DownloadPdfButton = dynamic(() => import("@/components/DownloadPdfButton"), {
  ssr: false,
  loading: () => (
    <button
      type="button"
      disabled
      className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white opacity-60"
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
  const [chatPending, setChatPending] = useState(false);

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch((err) => setDocumentsError(err instanceof Error ? err.message : "Failed to load documents."));
  }, []);

  const activeDocument = documents.find((doc) => doc.id === documentType);

  function handleChatResult(nextDocumentType: string, nextFields: FieldMap) {
    setDocumentType(nextDocumentType);
    setFields(nextFields);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Prelegal Document Creator</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Chat with the assistant about what you need and it will draft the right agreement for you.
        </p>
        {documentsError && <p className="mt-2 text-sm text-red-600">{documentsError}</p>}
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ChatPanel
            documentType={documentType}
            fields={fields}
            onResult={handleChatResult}
            onPendingChange={setChatPending}
          />

          {activeDocument && (
            <>
              <details className="rounded-lg border border-zinc-200 bg-white p-6">
                <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                  Review &amp; edit fields
                </summary>
                <fieldset disabled={chatPending} className="mt-6 disabled:opacity-60">
                  <FieldsForm document={activeDocument} fields={fields} onChange={setFields} />
                </fieldset>
              </details>

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
