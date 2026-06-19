"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ type: "error", text: "이메일 또는 비밀번호가 올바르지 않습니다." });
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: "전송에 실패했습니다. 잠시 후 다시 시도해주세요." });
    } else {
      setMessage({ type: "success", text: "재설정 링크를 이메일로 전송했습니다." });
    }
  }

  return (
    <div className="min-h-[100dvh] bg-sidebar-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-outfit text-2xl font-bold tracking-widest text-white mb-1">
            MAGNATE KOREA
          </p>
          <p className="text-slate-400 text-sm">
            {mode === "login" ? "업무 대시보드" : "비밀번호 재설정"}
          </p>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-sm">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brian@magnatekorea.com"
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-sm">비밀번호</Label>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setMessage(null); }}
                  className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
                >
                  비밀번호 찾기
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            {message && (
              <p className={`text-sm rounded-lg px-3 py-2 ${message.type === "error" ? "text-red-400 bg-red-950/40 border border-red-900" : "text-green-400 bg-green-950/40 border border-green-900"}`}>
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-outfit font-medium active:scale-[0.98] transition-transform"
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-slate-300 text-sm">이메일</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brian@magnatekorea.com"
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            {message && (
              <p className={`text-sm rounded-lg px-3 py-2 ${message.type === "error" ? "text-red-400 bg-red-950/40 border border-red-900" : "text-green-400 bg-green-950/40 border border-green-900"}`}>
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-outfit font-medium active:scale-[0.98] transition-transform"
            >
              {loading ? "전송 중..." : "재설정 링크 보내기"}
            </Button>

            <button
              type="button"
              onClick={() => { setMode("login"); setMessage(null); }}
              className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← 로그인으로 돌아가기
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
