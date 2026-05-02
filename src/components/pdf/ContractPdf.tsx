import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.otf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.otf", fontWeight: 700 },
  ],
});

const S = StyleSheet.create({
  page: { fontFamily: "NotoSansKR", fontSize: 9, color: "#1e293b", padding: "40 50", lineHeight: 1.6 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 24 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, paddingBottom: 4, borderBottom: "1 solid #e2e8f0" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#64748b", minWidth: 80 },
  paymentBox: { backgroundColor: "#f8fafc", borderRadius: 6, padding: "10 12", marginBottom: 16 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  terms: { fontSize: 8.5, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#94a3b8" },
  signBox: { flexDirection: "row", gap: 40, marginTop: 40 },
  signParty: { flex: 1, borderTop: "1 solid #334155", paddingTop: 8 },
  signLabel: { fontSize: 8, color: "#64748b", marginBottom: 4 },
});

interface Props {
  title: string;
  clientName?: string;
  supplierName?: string;
  signedAt?: string;
  expiresAt?: string;
  contractAmount?: number;
  depositAmount?: number;
  depositPaid?: boolean;
  finalAmount?: number;
  finalPaid?: boolean;
  terms?: string;
}

export function ContractPdf({
  title, clientName, supplierName, signedAt, expiresAt,
  contractAmount, depositAmount, depositPaid, finalAmount, finalPaid, terms,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>용 역 계 약 서</Text>
        <Text style={S.subtitle}>{title}</Text>

        <View style={[S.section, { flexDirection: "row", gap: 40 }]}>
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>계약 당사자</Text>
            <View style={S.row}><Text style={S.label}>발주처</Text><Text style={{ fontWeight: 700 }}>{clientName ?? "—"}</Text></View>
            <View style={S.row}><Text style={S.label}>수급사</Text><Text style={{ fontWeight: 700 }}>{supplierName ?? "—"}</Text></View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>계약 기간</Text>
            {signedAt && <View style={S.row}><Text style={S.label}>계약일</Text><Text>{signedAt}</Text></View>}
            {expiresAt && <View style={S.row}><Text style={S.label}>만료일</Text><Text>{expiresAt}</Text></View>}
          </View>
        </View>

        {(contractAmount || depositAmount || finalAmount) && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>계약 금액</Text>
            <View style={S.paymentBox}>
              {contractAmount != null && (
                <View style={S.paymentRow}><Text style={{ color: "#64748b" }}>계약금액</Text><Text style={{ fontWeight: 700, fontSize: 11, color: "#2563eb" }}>{contractAmount.toLocaleString()}원</Text></View>
              )}
              {depositAmount != null && (
                <View style={S.paymentRow}>
                  <Text style={{ color: "#64748b" }}>계약금</Text>
                  <Text>{depositAmount.toLocaleString()}원 {depositPaid ? "✓ 입금완료" : "미입금"}</Text>
                </View>
              )}
              {finalAmount != null && (
                <View style={S.paymentRow}>
                  <Text style={{ color: "#64748b" }}>잔금</Text>
                  <Text>{finalAmount.toLocaleString()}원 {finalPaid ? "✓ 입금완료" : "미입금"}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {terms && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>계약 조건</Text>
            <Text style={S.terms}>{terms}</Text>
          </View>
        )}

        <View style={S.signBox}>
          <View style={S.signParty}>
            <Text style={S.signLabel}>발주처 (갑)</Text>
            <Text>{clientName ?? "___________________"}</Text>
            <Text style={{ color: "#94a3b8", marginTop: 4 }}>서명: ___________________</Text>
          </View>
          <View style={S.signParty}>
            <Text style={S.signLabel}>수급사 (을)</Text>
            <Text>{supplierName ?? "___________________"}</Text>
            <Text style={{ color: "#94a3b8", marginTop: 4 }}>서명: ___________________</Text>
          </View>
        </View>

        <View style={S.footer}>
          <Text>본 계약서는 쌍방 합의하에 작성되었습니다.</Text>
          <Text>{signedAt ?? ""}</Text>
        </View>
      </Page>
    </Document>
  );
}
