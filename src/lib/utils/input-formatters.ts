/** 전화번호 하이픈 자동 포맷 (입력값 → 010-1234-5678) */
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

/** 사업자등록번호 하이픈 자동 포맷 (입력값 → 000-00-00000) */
export function formatBRN(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 금액 천단위 콤마 포맷 (입력값 → "1,234,567") */
export function formatAmount(value: string): string {
  const d = value.replace(/\D/g, "");
  return d ? Number(d).toLocaleString("ko-KR") : "";
}

/** 포맷된 금액 문자열에서 숫자 파싱 */
export function parseAmount(value: string): number | null {
  const d = value.replace(/\D/g, "");
  return d ? Number(d) : null;
}
