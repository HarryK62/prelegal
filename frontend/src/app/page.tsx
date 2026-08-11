"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import CoverPageForm from "@/components/CoverPageForm";
import DocumentPreview from "@/components/DocumentPreview";
import { defaultCoverPageValues } from "@/content/mutual-nda";

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

function noopSubscribe() {
  return () => {};
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getServerIsoDate() {
  return "";
}

export default function Home() {
  const [values, setValues] = useState(defaultCoverPageValues);

  // The server has no notion of "today" for a statically prerendered page, so
  // getServerSnapshot returns "" and the real date is only read on the client
  // (via useSyncExternalStore, React's mechanism for values that legitimately
  // differ between server and client) to avoid a hydration mismatch.
  const today = useSyncExternalStore(noopSubscribe, getTodayIsoDate, getServerIsoDate);
  const displayValues = values.effectiveDate ? values : { ...values, effectiveDate: today };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Mutual NDA Creator</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Fill in the details below to generate a Common Paper Mutual Non-Disclosure Agreement.
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6">
          <CoverPageForm values={displayValues} onChange={setValues} />
          <DownloadPdfButton values={displayValues} />
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <DocumentPreview values={displayValues} />
        </div>
      </div>
    </div>
  );
}
