"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Envelope,
  LockKey,
  CloudCheck,
  CheckCircle,
  XCircle,
  Buildings,
} from "@phosphor-icons/react";

// ────────────────────────────────────────────────────────────
// Supabase client (module-level singleton)
// ────────────────────────────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ────────────────────────────────────────────────────────────
// Reusable message components
// ────────────────────────────────────────────────────────────
function SuccessMsg({ message }: { message: string }) {
  return (
    <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mt-2">
      {message}
    </p>
  );
}

function ErrorMsg({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">
      {message}
    </p>
  );
}

// ────────────────────────────────────────────────────────────
// Card wrapper
// ────────────────────────────────────────────────────────────
function SettingsCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-600">{icon}</span>
        <h2 className="font-outfit font-semibold text-slate-800 text-base">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  // Current user
  const [user, setUser] = useState<User | null>(null);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  // Password change
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  // Connection status
  const [connStatus, setConnStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [connLoading, setConnLoading] = useState(false);
  const [connUserId, setConnUserId] = useState<string | null>(null);

  // Business profile
  const [bizProfile, setBizProfile] = useState({
    registration_number: "",
    organization_name: "",
    representative_name: "",
    business_address: "",
    business_type: "",
    business_item: "",
    manager_email: "",
  });
  const [bizLoading, setBizLoading] = useState(false);
  const [bizSuccess, setBizSuccess] = useState("");
  const [bizError, setBizError] = useState("");

  // Load user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      const meta = user?.user_metadata?.business_profile;
      if (meta) setBizProfile(meta);
    });
  }, [supabase]);

  // ── Email change handler ──────────────────────────────────
  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail.trim()) {
      setEmailError("새 이메일 주소를 입력해 주세요.");
      return;
    }

    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailLoading(false);

    if (error) {
      setEmailError(error.message);
    } else {
      setEmailSuccess("이메일 변경 확인 링크를 새 주소로 보냈습니다.");
      setNewEmail("");
    }
  }

  // ── Password change handler ───────────────────────────────
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPw.length < 8) {
      setPwError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess("비밀번호가 변경되었습니다.");
      setNewPw("");
      setConfirmPw("");
    }
  }

  // ── Connection check handler ──────────────────────────────
  async function handleConnCheck() {
    setConnLoading(true);
    setConnStatus("idle");
    setConnUserId(null);

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setConnStatus("fail");
      } else {
        setConnStatus("ok");
        setConnUserId(user.id);
      }
    } catch {
      setConnStatus("fail");
    } finally {
      setConnLoading(false);
    }
  }

  // ── Business profile save handler ────────────────────────
  async function handleBizProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setBizError("");
    setBizSuccess("");
    setBizLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { business_profile: bizProfile },
    });
    setBizLoading(false);
    if (error) {
      setBizError(error.message);
    } else {
      setBizSuccess("사업자 정보가 저장되었습니다.");
    }
  }

  // Derive the Supabase host for display
  const supabaseHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    } catch {
      return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "—";
    }
  })();

  // Truncate a UUID for display
  function truncateId(id: string) {
    return id.slice(0, 8) + "…" + id.slice(-4);
  }

  return (
    <div className="font-outfit">
      {/* Page header */}
      <h1 className="font-outfit text-2xl font-bold tracking-tight text-slate-950 mb-6">
        설정
      </h1>

      <div className="grid gap-5">
        {/* ── Section 1: 프로필 정보 ──────────────────────────── */}
        <SettingsCard
          title="프로필 정보"
          icon={<Envelope size={16} weight="regular" />}
        >
          {/* Current email (read-only) */}
          <div className="mb-4">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
              현재 이메일
            </Label>
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-outfit">
              {user?.email ?? "—"}
            </p>
          </div>

          <Separator className="my-4" />

          {/* Email change form */}
          <form onSubmit={handleEmailChange}>
            <Label
              htmlFor="new-email"
              className="text-sm font-medium text-slate-700 mb-1 block"
            >
              이메일 변경
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="new-email"
                type="email"
                placeholder="새 이메일 주소"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 min-h-10 font-outfit text-sm"
                disabled={emailLoading}
              />
              <Button
                type="submit"
                disabled={emailLoading}
                className="min-h-10 bg-blue-600 hover:bg-blue-700 text-white font-outfit text-sm px-4 shrink-0"
              >
                {emailLoading ? "처리 중…" : "변경"}
              </Button>
            </div>
            {emailError && <ErrorMsg message={emailError} />}
            {emailSuccess && <SuccessMsg message={emailSuccess} />}
          </form>
        </SettingsCard>

        {/* ── Section 2: 비밀번호 변경 ────────────────────────── */}
        <SettingsCard
          title="비밀번호 변경"
          icon={<LockKey size={16} weight="regular" />}
        >
          <form onSubmit={handlePasswordChange} className="grid gap-4">
            <div>
              <Label
                htmlFor="new-pw"
                className="text-sm font-medium text-slate-700 mb-1 block"
              >
                새 비밀번호
              </Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="8자 이상"
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full min-h-10 font-outfit text-sm"
                disabled={pwLoading}
              />
            </div>
            <div>
              <Label
                htmlFor="confirm-pw"
                className="text-sm font-medium text-slate-700 mb-1 block"
              >
                비밀번호 확인
              </Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full min-h-10 font-outfit text-sm"
                disabled={pwLoading}
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={pwLoading}
                className="min-h-10 bg-blue-600 hover:bg-blue-700 text-white font-outfit text-sm px-4"
              >
                {pwLoading ? "처리 중…" : "변경"}
              </Button>
              {pwError && <ErrorMsg message={pwError} />}
              {pwSuccess && <SuccessMsg message={pwSuccess} />}
            </div>
          </form>
        </SettingsCard>

        {/* ── Section 3: Supabase 연결 상태 ───────────────────── */}
        <SettingsCard
          title="Supabase 연결 상태"
          icon={<CloudCheck size={16} weight="regular" />}
        >
          {/* Supabase URL */}
          <div className="mb-4">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
              Supabase URL
            </Label>
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono break-all">
              {supabaseHost}
            </p>
          </div>

          {/* Check button + status badge */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleConnCheck}
              disabled={connLoading}
              variant="outline"
              className="min-h-10 font-outfit text-sm border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {connLoading ? "확인 중…" : "연결 확인"}
            </Button>

            {connStatus === "ok" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle size={16} weight="regular" />
                연결됨
              </span>
            )}
            {connStatus === "fail" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-500 font-medium">
                <XCircle size={16} weight="regular" />
                연결 실패
              </span>
            )}
          </div>

          {/* User ID */}
          {connUserId && (
            <div className="mt-4">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
                User ID
              </Label>
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono">
                {truncateId(connUserId)}
              </p>
            </div>
          )}
        </SettingsCard>

        {/* ── Section 4: 내 사업자 정보 ─────────────────────────── */}
        <SettingsCard
          title="내 사업자 정보"
          icon={<Buildings size={16} weight="regular" />}
        >
          <p className="text-xs text-slate-500 mb-4">
            세금계산서 발행 시 공급자 정보로 사용됩니다.
          </p>
          <form onSubmit={handleBizProfileSave} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="biz-reg" className="text-sm font-medium text-slate-700 mb-1 block">사업자등록번호</Label>
                <Input
                  id="biz-reg"
                  value={bizProfile.registration_number}
                  onChange={(e) => setBizProfile((p) => ({ ...p, registration_number: e.target.value }))}
                  placeholder="000-00-00000"
                  className="h-9 text-sm font-outfit"
                  disabled={bizLoading}
                />
              </div>
              <div>
                <Label htmlFor="biz-rep" className="text-sm font-medium text-slate-700 mb-1 block">대표자명</Label>
                <Input
                  id="biz-rep"
                  value={bizProfile.representative_name}
                  onChange={(e) => setBizProfile((p) => ({ ...p, representative_name: e.target.value }))}
                  placeholder="홍길동"
                  className="h-9 text-sm font-outfit"
                  disabled={bizLoading}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="biz-org" className="text-sm font-medium text-slate-700 mb-1 block">상호명</Label>
              <Input
                id="biz-org"
                value={bizProfile.organization_name}
                onChange={(e) => setBizProfile((p) => ({ ...p, organization_name: e.target.value }))}
                placeholder="(주)마그네이트코리아"
                className="h-9 text-sm font-outfit"
                disabled={bizLoading}
              />
            </div>
            <div>
              <Label htmlFor="biz-addr" className="text-sm font-medium text-slate-700 mb-1 block">사업장 소재지</Label>
              <Input
                id="biz-addr"
                value={bizProfile.business_address}
                onChange={(e) => setBizProfile((p) => ({ ...p, business_address: e.target.value }))}
                placeholder="서울특별시 강남구 ..."
                className="h-9 text-sm font-outfit"
                disabled={bizLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="biz-type" className="text-sm font-medium text-slate-700 mb-1 block">업태</Label>
                <Input
                  id="biz-type"
                  value={bizProfile.business_type}
                  onChange={(e) => setBizProfile((p) => ({ ...p, business_type: e.target.value }))}
                  placeholder="서비스"
                  className="h-9 text-sm font-outfit"
                  disabled={bizLoading}
                />
              </div>
              <div>
                <Label htmlFor="biz-item" className="text-sm font-medium text-slate-700 mb-1 block">종목</Label>
                <Input
                  id="biz-item"
                  value={bizProfile.business_item}
                  onChange={(e) => setBizProfile((p) => ({ ...p, business_item: e.target.value }))}
                  placeholder="소프트웨어 개발"
                  className="h-9 text-sm font-outfit"
                  disabled={bizLoading}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="biz-email" className="text-sm font-medium text-slate-700 mb-1 block">담당자 이메일</Label>
              <Input
                id="biz-email"
                type="email"
                value={bizProfile.manager_email}
                onChange={(e) => setBizProfile((p) => ({ ...p, manager_email: e.target.value }))}
                placeholder="me@example.com"
                className="h-9 text-sm font-outfit"
                disabled={bizLoading}
              />
            </div>
            <div>
              <Button
                type="submit"
                disabled={bizLoading}
                className="min-h-10 bg-blue-600 hover:bg-blue-700 text-white font-outfit text-sm px-4"
              >
                {bizLoading ? "저장 중…" : "저장"}
              </Button>
              {bizError && <ErrorMsg message={bizError} />}
              {bizSuccess && <SuccessMsg message={bizSuccess} />}
            </div>
          </form>
        </SettingsCard>
      </div>
    </div>
  );
}
