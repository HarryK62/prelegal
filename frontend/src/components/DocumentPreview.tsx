import { resolveFieldValue, tokenizeClause, type DocumentDefinition, type FieldMap } from "@/content/documents";
import Card from "@/components/Card";

function ClauseText({ body, fields, document }: { body: string; fields: FieldMap; document: DocumentDefinition }) {
  const tokens = tokenizeClause(body);
  return (
    <>
      {tokens.map((token, i) => {
        if (token.type === "text") return <span key={i}>{token.value}</span>;
        if (token.type === "bold") return <strong key={i}>{token.value}</strong>;
        return (
          <span key={i} className="underline decoration-dotted decoration-zinc-400">
            {resolveFieldValue(token.key, fields, document)}
          </span>
        );
      })}
    </>
  );
}

export default function DocumentPreview({
  document,
  fields,
}: {
  document: DocumentDefinition;
  fields: FieldMap;
}) {
  return (
    <Card as="article" className="prose prose-zinc max-w-none p-8 text-sm leading-relaxed text-zinc-900">
      <h1 className="text-xl font-semibold">{document.name}</h1>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Fields</h2>
        {document.fields.map((field) => (
          <div key={field.key}>
            <div className="text-xs font-medium uppercase text-zinc-600">{field.label}</div>
            <p>{fields[field.key] || `[${field.label} not yet specified]`}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Terms</h2>
        {document.clauses.map((clause) => (
          <p key={clause.number}>
            <strong>
              {clause.number}. {clause.title}.
            </strong>{" "}
            <ClauseText body={clause.body} fields={fields} document={document} />
          </p>
        ))}
      </section>
    </Card>
  );
}
