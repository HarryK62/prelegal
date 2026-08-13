"use client";

import type { DocumentDefinition, FieldMap } from "@/content/documents";

interface FieldsFormProps {
  document: DocumentDefinition;
  fields: FieldMap;
  onChange: (fields: FieldMap) => void;
}

const labelClass = "block text-sm font-medium italic text-zinc-800";
const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

export default function FieldsForm({ document, fields, onChange }: FieldsFormProps) {
  const setField = (key: string, value: string) => onChange({ ...fields, [key]: value });

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      {document.fields.map((field) => (
        <div key={field.key}>
          <label className={labelClass}>{field.label}</label>
          <input
            className={inputClass}
            value={fields[field.key] ?? ""}
            onChange={(e) => setField(field.key, e.target.value)}
          />
        </div>
      ))}
    </form>
  );
}
