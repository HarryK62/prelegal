import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { resolveFieldValue, tokenizeClause, type DocumentDefinition, type FieldMap } from "@/content/documents";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, lineHeight: 1.5, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  sectionHeading: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 8 },
  fieldLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", marginTop: 8, textTransform: "uppercase", color: "#666" },
  fieldValue: { marginBottom: 2 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  bold: { fontFamily: "Helvetica-Bold" },
  merged: { textDecoration: "underline" },
});

function ClauseParagraph({
  number,
  title,
  body,
  fields,
  document,
}: {
  number: number;
  title: string;
  body: string;
  fields: FieldMap;
  document: DocumentDefinition;
}) {
  const tokens = tokenizeClause(body);
  return (
    <Text style={styles.paragraph}>
      <Text style={styles.bold}>
        {number}. {title}.{" "}
      </Text>
      {tokens.map((token, i) => {
        if (token.type === "text") return <Text key={i}>{token.value}</Text>;
        if (token.type === "bold")
          return (
            <Text key={i} style={styles.bold}>
              {token.value}
            </Text>
          );
        return (
          <Text key={i} style={styles.merged}>
            {resolveFieldValue(token.key, fields, document)}
          </Text>
        );
      })}
    </Text>
  );
}

export default function DocumentPdf({
  document,
  fields,
}: {
  document: DocumentDefinition;
  fields: FieldMap;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{document.name}</Text>

        <Text style={styles.sectionHeading}>Fields</Text>
        {document.fields.map((field) => (
          <View key={field.key}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue}>{fields[field.key] || `[${field.label} not yet specified]`}</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>Terms</Text>
        {document.clauses.map((clause) => (
          <ClauseParagraph
            key={clause.number}
            number={clause.number}
            title={clause.title}
            body={clause.body}
            fields={fields}
            document={document}
          />
        ))}
      </Page>
    </Document>
  );
}
