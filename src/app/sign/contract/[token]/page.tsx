"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContractData = {
  id: string;
  title: string;
  terms: string | null;
  clientName: string | null;
};

type PageState = "loading" | "error" | "step1" | "step2" | "done";

export default function SignContractPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [contract, setContract] = useState<ContractData | null>(null);
  const [signerName, setSignerName] = useState("");
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

  async function handleSubmit() {
    if (!signerName.trim()) return;
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;

    const signatureBase64 = sigCanvasRef.current.getCanvas().toDataURL("image/png");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), signatureBase64 }),
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

  if (state === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">계약서를 불러오는 중...</p>
      </div>
    );
  }

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

  if (state === "done") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="text-xl font-bold text-slate-900 mb-2">계약이 체결되었습니다!</h1>
          <p className="text-slate-500 text-sm mb-6">서명된 계약서가 이메일로 발송되었습니다.</p>
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

  const isStep1 = state === "step1";
  const isStep2 = state === "step2";

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-blue-600 text-white rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <span className="font-semibold text-sm">마그네이트코리아</span>
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{isStep1 ? "1 / 2" : "2 / 2"}</span>
        </div>

        {isStep1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-1">{contract?.title}</h2>
            <p className="text-slate-500 text-xs mb-4">아래 계약서 내용을 확인해 주세요.</p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed mb-6 border border-slate-200">
              {contract?.terms ?? "계약 내용이 없습니다."}
            </div>
            <Button onClick={() => setState("step2")} className="w-full">
              다음 → 서명
            </Button>
          </div>
        )}

        {isStep2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div>
              <button
                onClick={() => setState("step1")}
                className="text-xs text-slate-400 hover:text-slate-600 mb-4"
              >
                ← 계약서 다시 보기
              </button>
              <h2 className="font-bold text-slate-900">서명해 주세요</h2>
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
              />
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
              disabled={submitting || !signerName.trim()}
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
