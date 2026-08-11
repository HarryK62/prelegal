export interface PartyDetails {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
}

export type MndaTermType = "expires" | "continues";
export type ConfidentialityTermType = "years" | "perpetuity";

export interface CoverPageValues {
  purpose: string;
  effectiveDate: string;
  mndaTermType: MndaTermType;
  mndaTermYears: number;
  confidentialityTermType: ConfidentialityTermType;
  confidentialityTermYears: number;
  governingLaw: string;
  jurisdiction: string;
  partyOne: PartyDetails;
  partyTwo: PartyDetails;
}

const emptyParty: PartyDetails = {
  name: "",
  title: "",
  company: "",
  noticeAddress: "",
};

export const defaultCoverPageValues: CoverPageValues = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: "",
  mndaTermType: "expires",
  mndaTermYears: 1,
  confidentialityTermType: "years",
  confidentialityTermYears: 1,
  governingLaw: "",
  jurisdiction: "",
  partyOne: { ...emptyParty },
  partyTwo: { ...emptyParty },
};

export function formatDate(isoDate: string): string {
  if (!isoDate) return "[Today's date]";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "[Today's date]";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatMndaTerm(values: CoverPageValues): string {
  if (values.mndaTermType === "continues") {
    return "the date this MNDA is terminated in accordance with its terms";
  }
  return `${values.mndaTermYears} year(s) from the Effective Date`;
}

export function formatConfidentialityTerm(values: CoverPageValues): string {
  if (values.confidentialityTermType === "perpetuity") {
    return "in perpetuity";
  }
  return `${values.confidentialityTermYears} year(s) from the Effective Date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable law`;
}

export const FIELD_KEYS = [
  "purpose",
  "effectiveDate",
  "mndaTerm",
  "confidentialityTerm",
  "governingLaw",
  "jurisdiction",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export function resolveFieldValue(key: FieldKey, values: CoverPageValues): string {
  switch (key) {
    case "purpose":
      return values.purpose || "[Purpose not yet specified]";
    case "effectiveDate":
      return formatDate(values.effectiveDate);
    case "mndaTerm":
      return formatMndaTerm(values);
    case "confidentialityTerm":
      return formatConfidentialityTerm(values);
    case "governingLaw":
      return values.governingLaw || "[Governing Law not yet specified]";
    case "jurisdiction":
      return values.jurisdiction || "[Jurisdiction not yet specified]";
  }
}

export type ClauseToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "field"; key: FieldKey };

const TOKEN_PATTERN = /\*\*(.+?)\*\*|\{\{(\w+)\}\}/g;

export function tokenizeClause(text: string): ClauseToken[] {
  const tokens: ClauseToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: "bold", value: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ type: "field", key: match[2] as FieldKey });
    }
    lastIndex = TOKEN_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

export interface Clause {
  number: number;
  title: string;
  body: string;
}

// Verbatim from ../../templates/Mutual-NDA.md, with <span class="coverpage_link"> markers
// replaced by {{fieldKey}} tokens so the same clause text can be interpolated for both the
// on-screen preview and the generated PDF.
export const standardTermsClauses: Clause[] = [
  {
    number: 1,
    title: "Introduction",
    body: 'This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page (defined below)) (“**MNDA**”) allows each party (“**Disclosing Party**”) to disclose or make available information in connection with the {{purpose}} which (1) the Disclosing Party identifies to the receiving party (“**Receiving Party**”) as “confidential”, “proprietary”, or the like or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure (“**Confidential Information**”). Each party’s Confidential Information also includes the existence and status of the parties’ discussions and information on the Cover Page. Confidential Information includes technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions and know-how. To use this MNDA, the parties must complete and sign a cover page incorporating these Standard Terms (“**Cover Page**”). Each party is identified on the Cover Page and capitalized terms have the meanings given herein or on the Cover Page.',
  },
  {
    number: 2,
    title: "Use and Protection of Confidential Information",
    body: "The Receiving Party shall: (a) use Confidential Information solely for the {{purpose}}; (b) not disclose Confidential Information to third parties without the Disclosing Party’s prior written approval, except that the Receiving Party may disclose Confidential Information to its employees, agents, advisors, contractors and other representatives having a reasonable need to know for the {{purpose}}, provided these representatives are bound by confidentiality obligations no less protective of the Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible for their compliance with this MNDA; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information but no less than a reasonable standard of care.",
  },
  {
    number: 3,
    title: "Exceptions",
    body: "The Receiving Party’s obligations in this MNDA do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.",
  },
  {
    number: 4,
    title: "Disclosures Required by Law",
    body: "The Receiving Party may disclose Confidential Information to the extent required by law, regulation or regulatory authority, subpoena or court order, provided (to the extent legally permitted) it provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably cooperates, at the Disclosing Party’s expense, with the Disclosing Party’s efforts to obtain confidential treatment for the Confidential Information.",
  },
  {
    number: 5,
    title: "Term and Termination",
    body: "This MNDA commences on the {{effectiveDate}} and expires at the end of the {{mndaTerm}}. Either party may terminate this MNDA for any or no reason upon written notice to the other party. The Receiving Party’s obligations relating to Confidential Information will survive for the {{confidentialityTerm}}, despite any expiration or termination of this MNDA.",
  },
  {
    number: 6,
    title: "Return or Destruction of Confidential Information",
    body: "Upon expiration or termination of this MNDA or upon the Disclosing Party’s earlier request, the Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing Party’s written request, destroy all Confidential Information in the Receiving Party’s possession or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party, confirm its compliance with these obligations in writing. As an exception to subsection (b), the Receiving Party may retain Confidential Information in accordance with its standard backup or record retention policies or as required by law, but the terms of this MNDA will continue to apply to the retained Confidential Information.",
  },
  {
    number: 7,
    title: "Proprietary Rights",
    body: "The Disclosing Party retains all of its intellectual property and other rights in its Confidential Information and its disclosure to the Receiving Party grants no license under such rights.",
  },
  {
    number: 8,
    title: "Disclaimer",
    body: "ALL CONFIDENTIAL INFORMATION IS PROVIDED “AS IS”, WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.",
  },
  {
    number: 9,
    title: "Governing Law and Jurisdiction",
    body: "This MNDA and all matters relating hereto are governed by, and construed in accordance with, the laws of the State of {{governingLaw}}, without regard to the conflict of laws provisions of such {{governingLaw}}. Any legal suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts located in {{jurisdiction}}. Each party irrevocably submits to the exclusive jurisdiction of such {{jurisdiction}} in any such suit, action, or proceeding.",
  },
  {
    number: 10,
    title: "Equitable Relief",
    body: "A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable relief, including an injunction, in addition to its other remedies.",
  },
  {
    number: 11,
    title: "General",
    body: "Neither party has an obligation under this MNDA to disclose Confidential Information to the other or proceed with any proposed transaction. Neither party may assign this MNDA without the prior written consent of the other party, except that either party may assign this MNDA in connection with a merger, reorganization, acquisition or other transfer of all or substantially all its assets or voting securities. Any assignment in violation of this Section is null and void. This MNDA will bind and inure to the benefit of each party’s permitted successors and assigns. Waivers must be signed by the waiving party’s authorized representative and cannot be implied from conduct. If any provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary so the rest of this MNDA remains in effect. This MNDA (including the Cover Page) constitutes the entire agreement of the parties with respect to its subject matter, and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or supplemented by an agreement in writing signed by both parties. Notices, requests and approvals under this MNDA must be sent in writing to the email or postal addresses on the Cover Page and are deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic copies, each of which is deemed an original and which together form the same agreement.",
  },
];
