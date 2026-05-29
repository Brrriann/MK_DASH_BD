"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PHONE_VERIFY_ENABLED,
  launchPhoneVerify,
} from "@/lib/verify/phone";

type ContractData = {
  id: string;
  title: string;
  terms: string | null;
  clientName: string | null;
};

type PageState = "loading" | "error" | "step1" | "step2" | "step3" | "done";

// 단계 레이블
const STEP_LABELS: Record<"step1" | "step2" | "step3", string> = {
  step1: "계약서 확인",
  step2: "본인 확인",
  step3: "서명",
};

const STEP_NUMBER: Record<"step1" | "step2" | "step3", number> = {
  step1: 1,
  step2: 2,
  step3: 3,
};

function StepIndicator({ current }: { current: "step1" | "step2" | "step3" }) {
  const steps = ["step1", "step2", "step3"] as const;
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => {
        const num = STEP_NUMBER[s];
        const isCurrent = s === current;
        const isDone = STEP_NUMBER[current] > num;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold transition-colors ${
                isCurrent
                  ? "bg-white text-blue-600"
                  : isDone
                  ? "bg-white/40 text-white"
                  : "bg-white/20 text-white/60"
              }`}
            >
              {isDone ? "✓" : num}
            </div>
            <span
              className={`text-xs font-medium transition-colors ${
                isCurrent ? "text-white" : isDone ? "text-white/70" : "text-white/40"
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {i < 2 && (
              <span className="text-white/30 text-xs mx-0.5">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SignContractPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [contract, setContract] = useState<ContractData | null>(null);

  // step2 — 본인 확인
  const [signerName, setSignerName] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [verifying, setVerifying] = useState(false);

  // step3 — 서명
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);

  // 캔버스 너비를 컨테이너에 맞춰 설정 (모바일 정확도 보장)
  useEffect(() => {
    const container = sigContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setCanvasWidth(Math.floor(width));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [state]);

  // 계약서 로드
  useEffect(() => {
    fetch(`/api/contracts/sign/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (json.error === "already_signed") {
            setErrorMsg("이미 서명이 완료된 계약서입니다.");
          } else if (json.error === "expired") {
            setErrorMsg("링크가 만료되었습니다. 담당자에게 재발송 요청해주세요.");
          } else {
            setErrorMsg("유효하지 않은 링크입니다. 담당자에게 문의해주세요.");
          }
          setState("error");
        } else {
          setContract(json);
          setState("step1");
        }
      })
      .catch(() => {
        setErrorMsg("네트워크 오류가 발생했습니다.");
        setState("error");
      });
  }, [token]);

  // step2 → step3: 본인 확인 처리
  async function handleVerify() {
    if (!signerName.trim() || !signerPhone.trim()) return;
    setVerifying(true);
    try {
      const result = await launchPhoneVerify(signerName.trim(), signerPhone.trim());
      if (result.success) {
        // 포트원 인증 성공 시 반환된 실명/번호로 덮어쓰기 (비활성화 시엔 그대로)
        setSignerName(result.name);
        setSignerPhone(result.phone);
        setState("step3");
      } else {
        alert(result.errorMsg);
      }
    } finally {
      setVerifying(false);
    }
  }

  // step3 → done: 서명 제출
  async function handleSubmit() {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;
    const signatureBase64 = sigCanvasRef.current.getCanvas().toDataURL("image/png");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerPhone: signerPhone.trim(),
          signatureBase64,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "서명 처리 중 오류가 발생했습니다.");
        setState("error");
        return;
      }
      setPdfUrl(json.pdfUrl ?? "");
      setState("done");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── 로딩 ── */
  if (state === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">계약서를 불러오는 중...</p>
      </div>
    );
  }

  /* ── 오류 ── */
  if (state === "error") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <p className="text-2xl mb-4">⚠️</p>
          <h1 className="text-slate-900 font-semibold mb-2">링크 오류</h1>
          <p className="text-slate-500 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  /* ── 완료 ── */
  if (state === "done") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="text-xl font-bold text-slate-900 mb-2">계약이 체결되었습니다!</h1>
          <p className="text-slate-500 text-sm mb-6">
            서명된 계약서가 이메일로 발송되었습니다.
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-full mb-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              📄 서명된 계약서 다운로드
            </a>
          )}
          <p className="text-slate-400 text-xs">이 창을 닫으셔도 됩니다.</p>
        </div>
      </div>
    );
  }

  const currentStep = state as "step1" | "step2" | "step3";

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 + 진행 표시 */}
        <div className="bg-blue-600 text-white rounded-xl px-5 py-3 mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-semibold text-sm">마그네이트코리아</span>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full tabular-nums">
              {STEP_NUMBER[currentStep]} / 3
            </span>
          </div>
          <StepIndicator current={currentStep} />
        </div>

        {/* ── STEP 1: 계약서 확인 ── */}
        {state === "step1" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-1">{contract?.title}</h2>
            <p className="text-slate-500 text-xs mb-4">
              아래 계약서 내용을 꼼꼼히 확인해 주세요.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed mb-6 border border-slate-200">
              {contract?.terms ?? "계약 내용이 없습니다."}
            </div>
            <Button onClick={() => setState("step2")} className="w-full">
              확인했습니다 →
            </Button>
          </div>
        )}

        {/* ── STEP 2: 본인 확인 ── */}
        {state === "step2" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <button
                onClick={() => setState("step1")}
                className="text-xs text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1"
              >
                ← 계약서 다시 보기
              </button>
              <h2 className="font-bold text-slate-900">본인 확인</h2>
              <p className="text-slate-500 text-xs mt-1">
                계약에 사용될 성함과 연락처를 입력해 주세요.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                성함 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="홍길동"
                className="max-w-xs"
                autoComplete="name"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                휴대폰 번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="max-w-xs"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            {/* 본인인증 안내 배너 */}
            {!PHONE_VERIFY_ENABLED ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <span className="text-blue-500 text-base mt-0.5">ℹ️</span>
                <p className="text-xs text-blue-700 leading-relaxed">
                  현재는 입력 정보만 수집됩니다.{" "}
                  <strong>추후 휴대폰 본인인증(포트원)</strong>이 추가되어
                  더욱 안전하게 계약이 체결될 예정입니다.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                <span className="text-green-500 text-base mt-0.5">🔒</span>
                <p className="text-xs text-green-700 leading-relaxed">
                  다음 단계에서 <strong>통신사 본인인증</strong> 팝업이 실행됩니다.
                  입력하신 정보와 인증 결과가 일치해야 진행됩니다.
                </p>
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={
                verifying || !signerName.trim() || !signerPhone.trim()
              }
              className="w-full"
            >
              {verifying
                ? "인증 중..."
                : PHONE_VERIFY_ENABLED
                ? "본인인증 진행 →"
                : "다음 → 서명"}
            </Button>
          </div>
        )}

        {/* ── STEP 3: 서명 ── */}
        {state === "step3" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <button
                onClick={() => setState("step2")}
                className="text-xs text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1"
              >
                ← 이전으로
              </button>
              <h2 className="font-bold text-slate-900">서명</h2>
              <p className="text-slate-500 text-xs mt-1">
                아래 서명란에 직접 서명해 주세요.
              </p>
            </div>

            {/* 서명자 정보 요약 */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3">
              <span className="text-slate-400 text-sm">👤</span>
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{signerName}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span>{signerPhone}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                서명 <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-slate-400 mb-2">마우스 또는 터치로 서명하세요</p>
              <div
                ref={sigContainerRef}
                className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                style={{ touchAction: "none" }}
              >
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="#1e293b"
                  canvasProps={{
                    width: canvasWidth,
                    height: Math.round(canvasWidth / 3),
                    style: { width: "100%", height: "auto", display: "block" },
                  }}
                />
              </div>
              <button
                onClick={() => sigCanvasRef.current?.clear()}
                className="text-xs text-slate-400 hover:text-slate-600 mt-1.5"
              >
                ↩ 다시 그리기
              </button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "처리 중..." : "서명 완료 →"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
