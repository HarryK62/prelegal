"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentDefinition, FieldMap } from "@/content/documents";
import DocumentPdf from "@/components/DocumentPdf";

function buildFilename(document: DocumentDefinition): string {
  const slug = document.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug}.pdf`;
}

export default function DownloadPdfButton({
  document,
  fields,
}: {
  document: DocumentDefinition;
  fields: FieldMap;
}) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(<DocumentPdf document={document} fields={fields} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = buildFilename(document);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {generating ? "Generating PDF…" : "Download PDF"}
    </button>
  );
}
