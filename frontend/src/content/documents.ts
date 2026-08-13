export interface DocumentField {
  key: string;
  label: string;
}

export interface Clause {
  number: number;
  title: string;
  body: string;
}

export interface DocumentDefinition {
  id: string;
  name: string;
  description: string;
  requiresBaseAgreement: boolean;
  fields: DocumentField[];
  clauses: Clause[];
}

export type FieldMap = Record<string, string>;

export type ClauseToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "field"; key: string };

// A stateful scan rather than a two-alternative regex: some clauses (e.g. Limitation
// of Liability) wrap an entire sentence - including a {{field}} token - in **bold**.
// Matching "**...**" as one greedy alternative would swallow the token as literal text
// before the field alternative ever got a chance to match it. Tracking bold on/off as
// we scan lets a field token appear (and still resolve) in the middle of a bold run.
const SCAN_PATTERN = /\*\*|\{\{(\w+)\}\}/g;

export function tokenizeClause(text: string): ClauseToken[] {
  const tokens: ClauseToken[] = [];
  let lastIndex = 0;
  let bold = false;
  let match: RegExpExecArray | null;
  SCAN_PATTERN.lastIndex = 0;

  const flushText = (end: number) => {
    if (end > lastIndex) {
      const value = text.slice(lastIndex, end);
      tokens.push(bold ? { type: "bold", value } : { type: "text", value });
    }
  };

  while ((match = SCAN_PATTERN.exec(text))) {
    flushText(match.index);
    if (match[0] === "**") {
      bold = !bold;
    } else if (match[1] !== undefined) {
      tokens.push({ type: "field", key: match[1] });
    }
    lastIndex = SCAN_PATTERN.lastIndex;
  }
  flushText(text.length);
  return tokens;
}

export function fieldLabel(key: string, document: DocumentDefinition): string {
  return document.fields.find((f) => f.key === key)?.label ?? key;
}

export function resolveFieldValue(key: string, fields: FieldMap, document: DocumentDefinition): string {
  return fields[key] || `[${fieldLabel(key, document)} not yet specified]`;
}
