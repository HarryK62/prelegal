import {
  type CoverPageValues,
  formatConfidentialityTerm,
  formatDate,
  formatMndaTerm,
  resolveFieldValue,
  standardTermsClauses,
  tokenizeClause,
} from "@/content/mutual-nda";

function ClauseText({ body, values }: { body: string; values: CoverPageValues }) {
  const tokens = tokenizeClause(body);
  return (
    <>
      {tokens.map((token, i) => {
        if (token.type === "text") return <span key={i}>{token.value}</span>;
        if (token.type === "bold") return <strong key={i}>{token.value}</strong>;
        return (
          <span key={i} className="underline decoration-dotted decoration-zinc-400">
            {resolveFieldValue(token.key, values)}
          </span>
        );
      })}
    </>
  );
}

export default function DocumentPreview({ values }: { values: CoverPageValues }) {
  return (
    <article className="prose prose-zinc max-w-none rounded-lg border border-zinc-200 bg-white p-8 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Mutual Non-Disclosure Agreement</h1>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Cover Page</h2>

        <div>
          <div className="text-xs font-medium uppercase text-zinc-500">Purpose</div>
          <p>{values.purpose || "[Purpose not yet specified]"}</p>
        </div>

        <div>
          <div className="text-xs font-medium uppercase text-zinc-500">Effective Date</div>
          <p>{formatDate(values.effectiveDate)}</p>
        </div>

        <div>
          <div className="text-xs font-medium uppercase text-zinc-500">MNDA Term</div>
          <p>{formatMndaTerm(values)}</p>
        </div>

        <div>
          <div className="text-xs font-medium uppercase text-zinc-500">Term of Confidentiality</div>
          <p>{formatConfidentialityTerm(values)}</p>
        </div>

        <div>
          <div className="text-xs font-medium uppercase text-zinc-500">Governing Law &amp; Jurisdiction</div>
          <p>
            Governing Law: {values.governingLaw || "[Fill in state]"}
            <br />
            Jurisdiction: {values.jurisdiction || "[Fill in city or county and state]"}
          </p>
        </div>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className="border border-zinc-200 p-2"></th>
              <th className="border border-zinc-200 p-2">Party 1</th>
              <th className="border border-zinc-200 p-2">Party 2</th>
            </tr>
          </thead>
          <tbody>
            {(["name", "title", "company", "noticeAddress"] as const).map((field) => (
              <tr key={field}>
                <th className="border border-zinc-200 p-2 font-medium capitalize">
                  {field === "noticeAddress" ? "Notice Address" : field}
                </th>
                <td className="border border-zinc-200 p-2">{values.partyOne[field] || "—"}</td>
                <td className="border border-zinc-200 p-2">{values.partyTwo[field] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Standard Terms</h2>
        {standardTermsClauses.map((clause) => (
          <p key={clause.number}>
            <strong>
              {clause.number}. {clause.title}.
            </strong>{" "}
            <ClauseText body={clause.body} values={values} />
          </p>
        ))}
      </section>
    </article>
  );
}
