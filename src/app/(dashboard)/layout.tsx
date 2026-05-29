import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayoutUI from "./layout-ui";

// Server Component — auth gate for all dashboard routes
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 진단: 서버액션 재렌더 컨텍스트에서 auth I/O 가 throw 하는지 확인하기 위해
  // getSession 을 try/catch 로 격리. 에러 발생 시 redirect 없이 통과시켜
  // 서버액션이 정상 동작하는지 본다.
  let session = null;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.getSession();
    session = result.data.session;
  } catch (err) {
    const g = globalThis as unknown as { __layoutAuthError?: unknown };
    g.__layoutAuthError = {
      message: err instanceof Error ? err.message : String(err),
      at: new Date().toISOString(),
    };
    // 통과 — redirect 하지 않음 (진단 목적)
    return <DashboardLayoutUI>{children}</DashboardLayoutUI>;
  }

  if (!session) {
    redirect("/login");
  }

  return <DashboardLayoutUI>{children}</DashboardLayoutUI>;
}
