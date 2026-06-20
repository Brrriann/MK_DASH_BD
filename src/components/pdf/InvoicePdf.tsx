import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Regular.otf", fontWeight: 400 },
    { src: "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf", fontWeight: 700 },
  ],
});

const BC = "#334155"; // 격자 테두리색

const S = StyleSheet.create({
  page: { fontFamily: "NotoSansKR", fontSize: 8, color: "#0f172a", padding: 26 },

  titleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 17, fontWeight: 700, letterSpacing: 6, color: "#1d4ed8" },
  titleSub: { fontSize: 8, color: "#475569", marginLeft: 8, marginBottom: 3 },
  serial: { position: "absolute", right: 26, top: 28, fontSize: 7, color: "#475569", textAlign: "right", lineHeight: 1.5 },

  outer: { borderTop: `1 solid ${BC}`, borderLeft: `1 solid ${BC}` },
  row: { flexDirection: "row" },
  cell: { borderRight: `1 solid ${BC}`, borderBottom: `1 solid ${BC}`, paddingVertical: 3, paddingHorizontal: 4, justifyContent: "center" },
  head: { backgroundColor: "#eef2f7", fontWeight: 700, textAlign: "center" },
  lbl: { backgroundColor: "#f8fafc", fontWeight: 700, textAlign: "center" },
  vlabel: { backgroundColor: "#eef2f7", borderRight: `1 solid ${BC}`, borderBottom: `1 solid ${BC}`, width: 15, alignItems: "center", justifyContent: "center" },
  vlabelTxt: { fontSize: 8, fontWeight: 700, textAlign: "center", lineHeight: 1.35, color: "#1d4ed8" },
  c: { textAlign: "center" },
  r: { textAlign: "right" },
  spacer: { height: 10 },
});

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
}

interface Party {
  name?: string;
  brn?: string;
  ceo?: string;
  address?: string;
  bizType?: string;
  bizItem?: string;
}

interface Props {
  invoiceNumber: string;
  title: string;
  issuedAt: string; // YYYY-MM-DD
  supplier: Party;
  recipient: Party;
  items: InvoiceItem[];
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  memo?: string;
}

const won = (n: number) => n.toLocaleString("ko-KR");
const dash = (s?: string) => (s && s.trim() ? s : "");

/** 공급자 / 공급받는자 한 블록 */
function PartyBlock({ vlabel, party }: { vlabel: string; party: Party }) {
  return (
    <View style={[S.row, { flex: 1 }]}>
      <View style={S.vlabel}>
        <Text style={S.vlabelTxt}>{vlabel.split("").join("\n")}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={S.row}>
          <View style={[S.cell, S.lbl, { width: 48 }]}><Text>등록번호</Text></View>
          <View style={[S.cell, { flex: 1 }]}><Text style={S.c}>{dash(party.brn)}</Text></View>
        </View>
        <View style={S.row}>
          <View style={[S.cell, S.lbl, { width: 48 }]}><Text>상호</Text></View>
          <View style={[S.cell, { flex: 1 }]}><Text>{dash(party.name)}</Text></View>
          <View style={[S.cell, S.lbl, { width: 34 }]}><Text>성명</Text></View>
          <View style={[S.cell, { width: 78 }]}><Text>{dash(party.ceo)}{party.ceo ? " (인)" : ""}</Text></View>
        </View>
        <View style={S.row}>
          <View style={[S.cell, S.lbl, { width: 48 }]}><Text>사업장</Text></View>
          <View style={[S.cell, { flex: 1 }]}><Text>{dash(party.address)}</Text></View>
        </View>
        <View style={S.row}>
          <View style={[S.cell, S.lbl, { width: 48 }]}><Text>업태</Text></View>
          <View style={[S.cell, { flex: 1 }]}><Text>{dash(party.bizType)}</Text></View>
          <View style={[S.cell, S.lbl, { width: 34 }]}><Text>종목</Text></View>
          <View style={[S.cell, { width: 78 }]}><Text>{dash(party.bizItem)}</Text></View>
        </View>
      </View>
    </View>
  );
}

export function InvoicePdf({
  invoiceNumber, title, issuedAt, supplier, recipient,
  items, supplyAmount, taxAmount, totalAmount, memo,
}: Props) {
  const [yy, mm, dd] = (issuedAt || "").split("-");

  // 품목 표는 최소 4행 유지
  const rows = [...items];
  const padCount = Math.max(0, 4 - rows.length);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.serial}>
          책번호      권      호{"\n"}일련번호  {invoiceNumber}
        </Text>

        <View style={S.titleRow}>
          <Text style={S.title}>세 금 계 산 서</Text>
          <Text style={S.titleSub}>(공급받는자 보관용)</Text>
        </View>

        {/* 공급자 / 공급받는자 */}
        <View style={S.outer}>
          <View style={S.row}>
            <PartyBlock vlabel="공급자" party={supplier} />
            <PartyBlock vlabel="공급받는자" party={recipient} />
          </View>
        </View>

        {/* 작성 / 공급가액 / 세액 / 비고 */}
        <View style={[S.outer, { marginTop: 4 }]}>
          <View style={S.row}>
            <View style={[S.cell, S.head, { width: 110 }]}><Text>작성</Text></View>
            <View style={[S.cell, S.head, { flex: 1 }]}><Text>공급가액</Text></View>
            <View style={[S.cell, S.head, { flex: 1 }]}><Text>세액</Text></View>
            <View style={[S.cell, S.head, { width: 120 }]}><Text>비고</Text></View>
          </View>
          <View style={S.row}>
            <View style={[S.cell, { width: 110 }]}><Text style={S.c}>{yy ? `${yy}.${mm}.${dd}` : ""}</Text></View>
            <View style={[S.cell, { flex: 1 }]}><Text style={S.r}>{won(supplyAmount)}</Text></View>
            <View style={[S.cell, { flex: 1 }]}><Text style={S.r}>{won(taxAmount)}</Text></View>
            <View style={[S.cell, { width: 120 }]}><Text style={S.c}>{dash(memo)}</Text></View>
          </View>
        </View>

        {/* 품목 표 */}
        <View style={[S.outer, { marginTop: 4 }]}>
          <View style={S.row}>
            <View style={[S.cell, S.head, { width: 22 }]}><Text>월</Text></View>
            <View style={[S.cell, S.head, { width: 22 }]}><Text>일</Text></View>
            <View style={[S.cell, S.head, { flex: 1 }]}><Text>품목</Text></View>
            <View style={[S.cell, S.head, { width: 42 }]}><Text>규격</Text></View>
            <View style={[S.cell, S.head, { width: 32 }]}><Text>수량</Text></View>
            <View style={[S.cell, S.head, { width: 58 }]}><Text>단가</Text></View>
            <View style={[S.cell, S.head, { width: 68 }]}><Text>공급가액</Text></View>
            <View style={[S.cell, S.head, { width: 56 }]}><Text>세액</Text></View>
            <View style={[S.cell, S.head, { width: 42 }]}><Text>비고</Text></View>
          </View>
          {rows.map((it, i) => (
            <View key={i} style={S.row}>
              <View style={[S.cell, { width: 22 }]}><Text style={S.c}>{mm}</Text></View>
              <View style={[S.cell, { width: 22 }]}><Text style={S.c}>{dd}</Text></View>
              <View style={[S.cell, { flex: 1 }]}><Text>{it.name}</Text></View>
              <View style={[S.cell, { width: 42 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 32 }]}><Text style={S.c}>{it.quantity}</Text></View>
              <View style={[S.cell, { width: 58 }]}><Text style={S.r}>{won(it.unit_price)}</Text></View>
              <View style={[S.cell, { width: 68 }]}><Text style={S.r}>{won(it.supply_amount)}</Text></View>
              <View style={[S.cell, { width: 56 }]}><Text style={S.r}>{won(Math.round(it.supply_amount * 0.1))}</Text></View>
              <View style={[S.cell, { width: 42 }]}><Text> </Text></View>
            </View>
          ))}
          {Array.from({ length: padCount }).map((_, i) => (
            <View key={`p${i}`} style={S.row}>
              <View style={[S.cell, { width: 22 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 22 }]}><Text> </Text></View>
              <View style={[S.cell, { flex: 1 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 42 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 32 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 58 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 68 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 56 }]}><Text> </Text></View>
              <View style={[S.cell, { width: 42 }]}><Text> </Text></View>
            </View>
          ))}
        </View>

        {/* 합계 / 결제 구분 */}
        <View style={[S.outer, { marginTop: 4 }]}>
          <View style={S.row}>
            <View style={[S.cell, S.head, { flex: 1.4 }]}><Text>합계금액</Text></View>
            <View style={[S.cell, S.head, { flex: 1 }]}><Text>현금</Text></View>
            <View style={[S.cell, S.head, { flex: 1 }]}><Text>수표</Text></View>
            <View style={[S.cell, S.head, { flex: 1 }]}><Text>어음</Text></View>
            <View style={[S.cell, S.head, { flex: 1 }]}><Text>외상미수금</Text></View>
            <View style={[S.cell, S.head, { flex: 1.3 }]}><Text>이 금액을</Text></View>
          </View>
          <View style={S.row}>
            <View style={[S.cell, { flex: 1.4 }]}><Text style={[S.r, { fontWeight: 700, color: "#1d4ed8" }]}>{won(totalAmount)}</Text></View>
            <View style={[S.cell, { flex: 1 }]}><Text> </Text></View>
            <View style={[S.cell, { flex: 1 }]}><Text> </Text></View>
            <View style={[S.cell, { flex: 1 }]}><Text> </Text></View>
            <View style={[S.cell, { flex: 1 }]}><Text> </Text></View>
            <View style={[S.cell, { flex: 1.3 }]}><Text style={S.c}>( 청구 ) 함</Text></View>
          </View>
        </View>

        <Text style={{ marginTop: 10, fontSize: 7, color: "#94a3b8", textAlign: "center" }}>
          {title ? `${title} · ` : ""}전자세금계산서 · {invoiceNumber}
        </Text>
      </Page>
    </Document>
  );
}
