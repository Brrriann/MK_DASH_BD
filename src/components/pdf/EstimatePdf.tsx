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
  page: { fontFamily: "NotoSansKR", fontSize: 9, color: "#1e293b", padding: "40 50", lineHeight: 1.5 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 24 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, paddingBottom: 4, borderBottom: "1 solid #e2e8f0" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#64748b" },
  value: { fontWeight: 700 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8fafc", padding: "6 8", borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: "row", padding: "6 8", borderBottom: "1 solid #f1f5f9" },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "center" },
  col3: { flex: 1.5, textAlign: "right" },
  col4: { flex: 1.5, textAlign: "right" },
  colLabel: { fontSize: 8, fontWeight: 700, color: "#64748b" },
  totalBox: { backgroundColor: "#f8fafc", borderRadius: 6, padding: "10 12", marginTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  totalLabel: { color: "#64748b" },
  totalFinal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 6, borderTop: "1 solid #e2e8f0" },
  totalFinalLabel: { fontWeight: 700, fontSize: 10 },
  totalFinalValue: { fontWeight: 700, fontSize: 11, color: "#2563eb" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#94a3b8" },
});

export interface EstimatePdfItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
}

interface Props {
  estimateNumber: string;
  title: string;
  issuedAt: string;
  validUntil?: string;
  clientName?: string;
  supplierName?: string;
  items: EstimatePdfItem[];
  includeVat: boolean;
  discountAmount: number;
  depositRatio?: number;
  memo?: string;
}

export function EstimatePdf({
  estimateNumber, title, issuedAt, validUntil, clientName, supplierName,
  items, includeVat, discountAmount, depositRatio, memo,
}: Props) {
  const supplySubtotal = items.reduce((s, i) => s + i.supply_amount, 0);
  const supplyAmount = Math.max(0, supplySubtotal - discountAmount);
  const vatAmount = includeVat ? Math.round(supplyAmount * 0.1) : 0;
  const totalAmount = supplyAmount + vatAmount;
  const depositAmount = depositRatio ? Math.round(totalAmount * depositRatio / 100) : null;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>견 적 서</Text>
        <Text style={S.subtitle}>{title}</Text>

        <View style={[S.section, { flexDirection: "row", gap: 40 }]}>
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>공급받는자</Text>
            <Text style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>{clientName ?? "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>발행 정보</Text>
            <View style={S.row}><Text style={S.label}>견적번호</Text><Text>{estimateNumber}</Text></View>
            <View style={S.row}><Text style={S.label}>발행일</Text><Text>{issuedAt}</Text></View>
            {validUntil && <View style={S.row}><Text style={S.label}>유효기한</Text><Text>{validUntil}</Text></View>}
            {supplierName && <View style={S.row}><Text style={S.label}>공급자</Text><Text>{supplierName}</Text></View>}
          </View>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>견적 내역</Text>
          <View style={S.tableHeader}>
            <Text style={[S.col1, S.colLabel]}>품목명</Text>
            <Text style={[S.col2, S.colLabel]}>수량</Text>
            <Text style={[S.col3, S.colLabel]}>단가</Text>
            <Text style={[S.col4, S.colLabel]}>공급가액</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={S.tableRow}>
              <Text style={S.col1}>{item.name}</Text>
              <Text style={S.col2}>{item.quantity}</Text>
              <Text style={S.col3}>{item.unit_price.toLocaleString()}</Text>
              <Text style={S.col4}>{item.supply_amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={S.totalBox}>
          <View style={S.totalRow}><Text style={S.totalLabel}>공급가액 소계</Text><Text>{supplySubtotal.toLocaleString()}원</Text></View>
          {discountAmount > 0 && (
            <View style={S.totalRow}><Text style={S.totalLabel}>할인금액</Text><Text>-{discountAmount.toLocaleString()}원</Text></View>
          )}
          <View style={S.totalRow}><Text style={S.totalLabel}>공급가액</Text><Text>{supplyAmount.toLocaleString()}원</Text></View>
          {includeVat && <View style={S.totalRow}><Text style={S.totalLabel}>부가세 (10%)</Text><Text>{vatAmount.toLocaleString()}원</Text></View>}
          <View style={S.totalFinal}>
            <Text style={S.totalFinalLabel}>합계금액</Text>
            <Text style={S.totalFinalValue}>{totalAmount.toLocaleString()}원</Text>
          </View>
          {depositAmount !== null && (
            <View style={[S.totalRow, { marginTop: 6 }]}>
              <Text style={S.totalLabel}>계약금 ({depositRatio}%)</Text>
              <Text style={{ fontWeight: 700 }}>{depositAmount.toLocaleString()}원</Text>
            </View>
          )}
        </View>

        {memo && (
          <View style={[S.section, { marginTop: 16 }]}>
            <Text style={S.sectionTitle}>비고</Text>
            <Text style={{ color: "#64748b" }}>{memo}</Text>
          </View>
        )}

        <View style={S.footer}>
          <Text>본 견적서는 발행일로부터 유효합니다.</Text>
          <Text>{issuedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
