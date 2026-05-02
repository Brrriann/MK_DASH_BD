"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] bg-sidebar-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-outfit text-2xl font-bold tracking-widest text-white mb-1">
            MAGNATE KOREA
          </p>
          <p className="text-slate-400 text-sm">업무 대시보드</p>
        </div>

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
            <Label htmlFor="password" className="text-slate-300 text-sm">비밀번호</Label>
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

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
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
      </div>
    </div>
  );
}
