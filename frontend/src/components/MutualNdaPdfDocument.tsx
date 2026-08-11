import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  type CoverPageValues,
  formatConfidentialityTerm,
  formatDate,
  formatMndaTerm,
  resolveFieldValue,
  standardTermsClauses,
  tokenizeClause,
} from "@/content/mutual-nda";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, lineHeight: 1.5, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  sectionHeading: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 8 },
  fieldLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", marginTop: 8, textTransform: "uppercase", color: "#666" },
  fieldValue: { marginBottom: 2 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  bold: { fontFamily: "Helvetica-Bold" },
  merged: { textDecoration: "underline" },
  table: { marginTop: 8, borderWidth: 1, borderColor: "#ccc" },
  tableRow: { flexDirection: "row" },
  tableHeaderCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 4,
    fontFamily: "Helvetica-Bold",
  },
  tableLabelCell: { flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 4, fontFamily: "Helvetica-Bold" },
  tableCell: { flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 4 },
});

function ClauseParagraph({
  number,
  title,
  body,
  values,
}: {
  number: number;
  title: string;
  body: string;
  values: CoverPageValues;
}) {
  const tokens = tokenizeClause(body);
  return (
    <Text style={styles.paragraph}>
      <Text style={styles.bold}>
        {number}. {title}.{" "}
      </Text>
      {tokens.map((token, i) => {
        if (token.type === "text") return <Text key={i}>{token.value}</Text>;
        if (token.type === "bold") return <Text key={i} style={styles.bold}>{token.value}</Text>;
        return (
          <Text key={i} style={styles.merged}>
            {resolveFieldValue(token.key, values)}
          </Text>
        );
      })}
    </Text>
  );
}

const PARTY_ROWS: { field: "name" | "title" | "company" | "noticeAddress"; label: string }[] = [
  { field: "name", label: "Print Name" },
  { field: "title", label: "Title" },
  { field: "company", label: "Company" },
  { field: "noticeAddress", label: "Notice Address" },
];

export default function MutualNdaPdfDocument({ values }: { values: CoverPageValues }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>

        <Text style={styles.sectionHeading}>Cover Page</Text>

        <Text style={styles.fieldLabel}>Purpose</Text>
        <Text style={styles.fieldValue}>{values.purpose || "[Purpose not yet specified]"}</Text>

        <Text style={styles.fieldLabel}>Effective Date</Text>
        <Text style={styles.fieldValue}>{formatDate(values.effectiveDate)}</Text>

        <Text style={styles.fieldLabel}>MNDA Term</Text>
        <Text style={styles.fieldValue}>{formatMndaTerm(values)}</Text>

        <Text style={styles.fieldLabel}>Term of Confidentiality</Text>
        <Text style={styles.fieldValue}>{formatConfidentialityTerm(values)}</Text>

        <Text style={styles.fieldLabel}>Governing Law &amp; Jurisdiction</Text>
        <Text style={styles.fieldValue}>Governing Law: {values.governingLaw || "[Fill in state]"}</Text>
        <Text style={styles.fieldValue}>
          Jurisdiction: {values.jurisdiction || "[Fill in city or county and state]"}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableHeaderCell}> </Text>
            <Text style={styles.tableHeaderCell}>Party 1</Text>
            <Text style={styles.tableHeaderCell}>Party 2</Text>
          </View>
          {PARTY_ROWS.map(({ field, label }) => (
            <View style={styles.tableRow} key={field}>
              <Text style={styles.tableLabelCell}>{label}</Text>
              <Text style={styles.tableCell}>{values.partyOne[field] || "-"}</Text>
              <Text style={styles.tableCell}>{values.partyTwo[field] || "-"}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Standard Terms</Text>
        {standardTermsClauses.map((clause) => (
          <ClauseParagraph
            key={clause.number}
            number={clause.number}
            title={clause.title}
            body={clause.body}
            values={values}
          />
        ))}
      </Page>
    </Document>
  );
}
