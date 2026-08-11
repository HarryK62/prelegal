"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { CoverPageValues } from "@/content/mutual-nda";
import MutualNdaPdfDocument from "@/components/MutualNdaPdfDocument";

function buildFilename(values: CoverPageValues): string {
  const parties = [values.partyOne.company, values.partyTwo.company]
    .map((name) => name.trim())
    .filter(Boolean)
    .join("-and-")
    .replace(/[^a-zA-Z0-9-]+/g, "");
  return `Mutual-NDA${parties ? `-${parties}` : ""}.pdf`;
}

export default function DownloadPdfButton({ values }: { values: CoverPageValues }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(<MutualNdaPdfDocument values={values} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildFilename(values);
      document.body.appendChild(link);
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
