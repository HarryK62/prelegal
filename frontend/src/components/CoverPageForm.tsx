"use client";

import type { CoverPageValues, PartyDetails } from "@/content/mutual-nda";

interface CoverPageFormProps {
  values: CoverPageValues;
  onChange: (values: CoverPageValues) => void;
}

const labelClass = "block text-sm font-medium text-zinc-700";
const hintClass = "text-xs text-zinc-500";
const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";
const fieldsetClass = "space-y-4 border-t border-zinc-200 pt-6 first:border-t-0 first:pt-0";

function PartyFields({
  label,
  party,
  onChange,
}: {
  label: string;
  party: PartyDetails;
  onChange: (party: PartyDetails) => void;
}) {
  const update = (field: keyof PartyDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...party, [field]: e.target.value });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Print Name</label>
          <input className={inputClass} value={party.name} onChange={update("name")} />
        </div>
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={party.title} onChange={update("title")} />
        </div>
        <div>
          <label className={labelClass}>Company</label>
          <input className={inputClass} value={party.company} onChange={update("company")} />
        </div>
        <div>
          <label className={labelClass}>Notice Address</label>
          <input
            className={inputClass}
            value={party.noticeAddress}
            onChange={update("noticeAddress")}
            placeholder="Email or postal address"
          />
        </div>
      </div>
    </div>
  );
}

export default function CoverPageForm({ values, onChange }: CoverPageFormProps) {
  const set = <K extends keyof CoverPageValues>(field: K, value: CoverPageValues[K]) =>
    onChange({ ...values, [field]: value });

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <div className={fieldsetClass}>
        <label className={labelClass}>
          Purpose <span className={hintClass}>How Confidential Information may be used</span>
        </label>
        <textarea
          className={inputClass}
          rows={2}
          value={values.purpose}
          onChange={(e) => set("purpose", e.target.value)}
        />
      </div>

      <div className={fieldsetClass}>
        <label className={labelClass}>Effective Date</label>
        <input
          type="date"
          className={inputClass}
          value={values.effectiveDate}
          onChange={(e) => set("effectiveDate", e.target.value)}
        />
      </div>

      <div className={fieldsetClass}>
        <span className={labelClass}>
          MNDA Term <span className={hintClass}>The length of this MNDA</span>
        </span>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="mndaTermType"
              checked={values.mndaTermType === "expires"}
              onChange={() => set("mndaTermType", "expires")}
            />
            Expires
            <input
              type="number"
              min={1}
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm"
              value={values.mndaTermYears}
              onChange={(e) => set("mndaTermYears", Number(e.target.value))}
              disabled={values.mndaTermType !== "expires"}
            />
            year(s) from Effective Date
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="mndaTermType"
              checked={values.mndaTermType === "continues"}
              onChange={() => set("mndaTermType", "continues")}
            />
            Continues until terminated in accordance with the terms of the MNDA
          </label>
        </div>
      </div>

      <div className={fieldsetClass}>
        <span className={labelClass}>
          Term of Confidentiality{" "}
          <span className={hintClass}>How long Confidential Information is protected</span>
        </span>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="confidentialityTermType"
              checked={values.confidentialityTermType === "years"}
              onChange={() => set("confidentialityTermType", "years")}
            />
            <input
              type="number"
              min={1}
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm"
              value={values.confidentialityTermYears}
              onChange={(e) => set("confidentialityTermYears", Number(e.target.value))}
              disabled={values.confidentialityTermType !== "years"}
            />
            year(s) from Effective Date (trade secrets protected until no longer a trade secret)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="confidentialityTermType"
              checked={values.confidentialityTermType === "perpetuity"}
              onChange={() => set("confidentialityTermType", "perpetuity")}
            />
            In perpetuity
          </label>
        </div>
      </div>

      <div className={fieldsetClass}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Governing Law</label>
            <input
              className={inputClass}
              value={values.governingLaw}
              onChange={(e) => set("governingLaw", e.target.value)}
              placeholder="e.g. Delaware"
            />
          </div>
          <div>
            <label className={labelClass}>Jurisdiction</label>
            <input
              className={inputClass}
              value={values.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
              placeholder="e.g. New Castle, DE"
            />
          </div>
        </div>
      </div>

      <div className={fieldsetClass}>
        <PartyFields
          label="Party 1"
          party={values.partyOne}
          onChange={(partyOne) => set("partyOne", partyOne)}
        />
      </div>

      <div className={fieldsetClass}>
        <PartyFields
          label="Party 2"
          party={values.partyTwo}
          onChange={(partyTwo) => set("partyTwo", partyTwo)}
        />
      </div>
    </form>
  );
}
